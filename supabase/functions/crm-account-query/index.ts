import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMConnection {
  id: string;
  name: string;
  apiKey: string;
  instanceUrl?: string;
}

interface AccountQuery {
  crmConnection: CRMConnection;
  searchTerm: string;
  query: string;
  searchType: 'account' | 'contact';
}

const queryHubSpotContact = async (apiKey: string, contactName: string) => {
  try {
    // Search for contacts by name
    const searchResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            {
              propertyName: 'firstname',
              operator: 'CONTAINS_TOKEN',
              value: contactName.split(' ')[0]
            },
            {
              propertyName: 'lastname',
              operator: 'CONTAINS_TOKEN',
              value: contactName.split(' ').slice(1).join(' ') || contactName
            }
          ]
        }],
        properties: [
          'firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle',
          'lifecyclestage', 'hubspot_owner_id', 'createdate', 'lastmodifieddate',
          'hs_lead_status', 'city', 'state', 'country'
        ],
        limit: 10
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`HubSpot API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const contact = searchData.results[0];
      
      // Get recent deals associated with this contact
      const dealsResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'associatedcontactid',
              operator: 'EQ',
              value: contact.id
            }]
          }],
          properties: [
            'dealname', 'amount', 'dealstage', 'pipeline', 'closedate',
            'createdate', 'hubspot_owner_id', 'dealtype'
          ],
          limit: 10
        }),
      });

      let deals = [];
      if (dealsResponse.ok) {
        const dealsData = await dealsResponse.json();
        deals = dealsData.results || [];
      }

      return {
        contact: contact.properties,
        deals: deals.map(deal => deal.properties),
        source: 'HubSpot',
        type: 'contact'
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error querying HubSpot contact:', error);
    throw error;
  }
};

const queryHubSpotAccount = async (apiKey: string, accountName: string) => {
  try {
    // Search for companies by name
    const searchResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: accountName
          }]
        }],
        properties: [
          'name', 'domain', 'industry', 'numberofemployees', 'annualrevenue',
          'city', 'state', 'country', 'phone', 'website', 'description',
          'lifecyclestage', 'hubspot_owner_id', 'createdate', 'hs_lastmodifieddate'
        ],
        limit: 10
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`HubSpot API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const company = searchData.results[0];
      
      // Get recent deals for this company
      const dealsResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'associatedcompanyid',
              operator: 'EQ',
              value: company.id
            }]
          }],
          properties: [
            'dealname', 'amount', 'dealstage', 'pipeline', 'closedate',
            'createdate', 'hubspot_owner_id', 'dealtype'
          ],
          limit: 10
        }),
      });

      let deals = [];
      if (dealsResponse.ok) {
        const dealsData = await dealsResponse.json();
        deals = dealsData.results || [];
      }

      return {
        company: company.properties,
        deals: deals.map(deal => deal.properties),
        source: 'HubSpot',
        type: 'account'
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error querying HubSpot:', error);
    throw error;
  }
};

const querySalesforceContact = async (apiKey: string, instanceUrl: string, contactName: string) => {
  try {
    const searchQuery = `SELECT Id, FirstName, LastName, Email, Phone, Account.Name, Title, LeadSource FROM Contact WHERE Name LIKE '%${contactName}%' LIMIT 10`;
    
    const response = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      const contact = data.records[0];
      
      // Get opportunities associated with this contact
      const oppQuery = `SELECT Id, Name, Amount, StageName, CloseDate, CreatedDate FROM Opportunity WHERE ContactId = '${contact.Id}' LIMIT 10`;
      const oppResponse = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(oppQuery)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      let opportunities = [];
      if (oppResponse.ok) {
        const oppData = await oppResponse.json();
        opportunities = oppData.records || [];
      }

      return {
        contact: contact,
        deals: opportunities,
        source: 'Salesforce',
        type: 'contact'
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error querying Salesforce contact:', error);
    throw error;
  }
};

const querySalesforceAccount = async (apiKey: string, instanceUrl: string, accountName: string) => {
  try {
    // This is a simplified example - in production you'd need proper OAuth
    const searchQuery = `SELECT Id, Name, Industry, NumberOfEmployees, AnnualRevenue, Phone, Website, Description, Type FROM Account WHERE Name LIKE '%${accountName}%' LIMIT 10`;
    
    const response = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      const account = data.records[0];
      
      // Get opportunities for this account
      const oppQuery = `SELECT Id, Name, Amount, StageName, CloseDate, CreatedDate FROM Opportunity WHERE AccountId = '${account.Id}' LIMIT 10`;
      const oppResponse = await fetch(`${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(oppQuery)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      let opportunities = [];
      if (oppResponse.ok) {
        const oppData = await oppResponse.json();
        opportunities = oppData.records || [];
      }

      return {
        company: account,
        deals: opportunities,
        source: 'Salesforce',
        type: 'account'
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error querying Salesforce:', error);
    throw error;
  }
};

const queryPipedriveContact = async (apiKey: string, contactName: string) => {
  try {
    // Search for persons by name
    const searchResponse = await fetch(`https://api.pipedrive.com/v1/persons/search?term=${encodeURIComponent(contactName)}&api_token=${apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Pipedrive API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.data && searchData.data.items && searchData.data.items.length > 0) {
      const person = searchData.data.items[0].item;
      
      // Get deals for this person
      const dealsResponse = await fetch(`https://api.pipedrive.com/v1/persons/${person.id}/deals?api_token=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let deals = [];
      if (dealsResponse.ok) {
        const dealsData = await dealsResponse.json();
        deals = dealsData.data || [];
      }

      return {
        contact: person,
        deals: deals,
        source: 'Pipedrive',
        type: 'contact'
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error querying Pipedrive contact:', error);
    throw error;
  }
};

const queryPipedriveAccount = async (apiKey: string, accountName: string) => {
  try {
    // Search for organizations by name
    const searchResponse = await fetch(`https://api.pipedrive.com/v1/organizations/search?term=${encodeURIComponent(accountName)}&api_token=${apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Pipedrive API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.data && searchData.data.items && searchData.data.items.length > 0) {
      const organization = searchData.data.items[0].item;
      
      // Get deals for this organization
      const dealsResponse = await fetch(`https://api.pipedrive.com/v1/organizations/${organization.id}/deals?api_token=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let deals = [];
      if (dealsResponse.ok) {
        const dealsData = await dealsResponse.json();
        deals = dealsData.data || [];
      }

      return {
        company: organization,
        deals: deals,
        source: 'Pipedrive',
        type: 'account'
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error querying Pipedrive:', error);
    throw error;
  }
};

const queryCallProofContact = async (apiKey: string, apiSecret: string, contactName: string) => {
  try {
    console.log('=== CALLPROOF CONTACT QUERY START ===');
    console.log('Contact name:', contactName);
    console.log('API Key length:', apiKey.length);
    console.log('API Secret length:', apiSecret.length);
    
    // First, get ALL contacts to see what's available
    console.log('=== GETTING ALL CONTACTS FIRST ===');
    const allContactsUrl = new URL('https://app.callproof.com/api/contacts/find/');
    allContactsUrl.searchParams.append('key', apiKey);
    allContactsUrl.searchParams.append('secret', apiSecret);
    // No query parameter = get all contacts
    
    const allContactsResponse = await fetch(allContactsUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SalesCoach/1.0'
      },
    });

    console.log('All Contacts API Response Status:', allContactsResponse.status, allContactsResponse.statusText);

    if (allContactsResponse.ok) {
      const allContactsData = await allContactsResponse.json();
      console.log('All contacts response:', {
        resultsLength: allContactsData.results?.length || 0,
        hasMore: !!allContactsData.more,
        offset: allContactsData.offset
      });
      
      // Log first few contacts to see what data structure we have
      if (allContactsData.results && allContactsData.results.length > 0) {
        console.log('Sample contacts (first 3):');
        allContactsData.results.slice(0, 3).forEach((contact: any, index: number) => {
          console.log(`Contact ${index + 1}:`, {
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            company: contact.company,
            phone: contact.phone
          });
        });
      }
    }
    
    // Use the correct CallProof API endpoint with find and query parameter
    const url = new URL('https://app.callproof.com/api/contacts/find/');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('secret', apiSecret);
    url.searchParams.append('query', contactName);
    
    console.log('Searching CallProof contacts with query parameter...');
    console.log('Search term:', contactName);
    console.log('CallProof API URL:', url.toString().replace(/key=[^&]*/, 'key=***').replace(/secret=[^&]*/, 'secret=***'));
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SalesCoach/1.0'
      },
    });

    console.log('CallProof API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CallProof API error response:', errorText);
      throw new Error(`CallProof API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contactsData = await response.json();
    console.log('CallProof contacts response:', {
      hasResults: !!contactsData.results,
      resultsType: Array.isArray(contactsData.results) ? 'array' : typeof contactsData.results,
      resultsLength: contactsData.results?.length || 0,
      code: contactsData.code,
      errors: contactsData.errors
    });
    
    if (!contactsData || !contactsData.results) {
      console.error('Invalid CallProof response structure:', contactsData);
      throw new Error('No contacts data received from CallProof');
    }

    // Return the first result since CallProof already did the search
    const contact = contactsData.results[0];
    console.log('✅ Found contact:', contact.company || `${contact.first_name} ${contact.last_name}`);
    // Get calls for this contact if found
    const callsUrl = new URL('https://app.callproof.com/api/calls');
    callsUrl.searchParams.append('key', apiKey);
    callsUrl.searchParams.append('secret', apiSecret);
    callsUrl.searchParams.append('contact_id', contact.id.toString());
    
    let calls = [];
    try {
      console.log('Fetching calls for contact ID:', contact.id);
      const callsResponse = await fetch(callsUrl.toString());
      console.log('Calls API response status:', callsResponse.status);
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        calls = callsData.data || [];
        console.log(`Found ${calls.length} calls for this contact`);
      } else {
        console.warn('Failed to fetch calls:', callsResponse.status, callsResponse.statusText);
      }
    } catch (error) {
      console.error('Error fetching calls for contact:', error);
    }

    console.log('=== CALLPROOF CONTACT QUERY SUCCESS ===');
    return {
      contact: contact,
      calls: calls,
      source: 'CallProof',
      type: 'contact'
    };
  } catch (error) {
    console.error('=== CALLPROOF CONTACT QUERY ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

const queryCallProofAccount = async (apiKey: string, apiSecret: string, accountName: string) => {
  try {
    console.log('Querying CallProof for account:', accountName);
    
    // Get contacts from CallProof API to find companies
    const url = new URL('https://app.callproof.com/api/contacts');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('secret', apiSecret);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CallProof API error: ${response.status} ${response.statusText}`);
    }

    const contactsData = await response.json();
    console.log('CallProof contacts response for account search:', contactsData);
    
    if (!contactsData || !contactsData.data) {
      throw new Error('No contacts data received from CallProof');
    }

    // Find contacts from the specified company
    const contacts = contactsData.data;
    const companyContacts = contacts.filter((contact: any) => {
      return contact.company_name && 
             contact.company_name.toLowerCase().includes(accountName.toLowerCase());
    });

    if (companyContacts.length === 0) {
      return null;
    }

    // Get calls for all contacts in this company
    const allCalls = [];
    for (const contact of companyContacts.slice(0, 5)) { // Limit to first 5 contacts
      try {
        const callsUrl = new URL('https://app.callproof.com/api/calls');
        callsUrl.searchParams.append('key', apiKey);
        callsUrl.searchParams.append('secret', apiSecret);
        callsUrl.searchParams.append('contact_id', contact.id.toString());
        
        const callsResponse = await fetch(callsUrl.toString());
        if (callsResponse.ok) {
          const callsData = await callsResponse.json();
          if (callsData.data) {
            allCalls.push(...callsData.data.map((call: any) => ({
              ...call,
              contact_info: {
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                email: contact.email,
                phone: contact.phone
              }
            })));
          }
        }
      } catch (error) {
        console.error(`Error fetching calls for contact ${contact.id}:`, error);
      }
    }

    return {
      company: {
        name: companyContacts[0].company_name,
        contacts: companyContacts,
        totalContacts: companyContacts.length,
        source: 'CallProof'
      },
      calls: allCalls,
      source: 'CallProof',
      type: 'account'
    };
  } catch (error) {
    console.error('Error querying CallProof:', error);
    throw error;
  }
};

const generateInsights = async (data: any, query: string, searchType: string) => {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are a sales coach AI assistant. Analyze the provided CRM ${searchType} data and answer the user's question with specific insights and actionable recommendations.

${searchType.charAt(0).toUpperCase() + searchType.slice(1)} Data:
${JSON.stringify(data, null, 2)}

Provide insights about:
${searchType === 'contact' ? `
- Contact engagement and communication history from CallProof data
- Call frequency, duration, and outcomes
- Relationship strength and next steps
- Contact's role in decision-making process
- Recommended outreach strategy based on call patterns
- Call performance analytics and trends
` : `
- Account engagement across all contacts
- Call volume and patterns for the company
- Deal pipeline analysis from call data
- Recommended next steps based on call insights
- Areas of opportunity or concern from communication patterns
- Company-wide call performance metrics
`}
- Specific data points that support your recommendations
- CallProof-specific insights like call recordings, sentiment, and talk time

Be specific and reference actual data from the ${searchType} when possible, especially call analytics, contact information, and communication patterns.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, query, userId } = await req.json();

    if (!searchTerm || !query || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: searchTerm, query, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's CRM connection details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle special case for getting all contacts
    if (searchTerm === 'ALL_CONTACTS') {
      console.log('Fetching all contacts from CallProof...');
      
      if (profile.callproof_enabled && profile.callproof_api_key && profile.callproof_api_secret) {
        try {
          const apiUrl = `https://app.callproof.com/api/contacts/?key=${profile.callproof_api_key}&secret=${profile.callproof_api_secret}`;
          console.log('CallProof API URL for all contacts');
          
          const response = await fetch(apiUrl);
          const allContactsData = await response.json();
          
          console.log('All contacts response:', { 
            resultsLength: allContactsData.results?.length || 0, 
            hasMore: allContactsData.more,
            offset: allContactsData.offset 
          });

          if (allContactsData.results && allContactsData.results.length > 0) {
            // Show first 10 contacts for debugging
            const contactSample = allContactsData.results.slice(0, 10).map((contact, index) => {
              console.log(`Contact ${index + 1}: {
  id: ${contact.id},
  first_name: "${contact.first_name}",
  last_name: "${contact.last_name}",
  email: "${contact.email}",
  company: "${contact.company}",
  phone: ${contact.phone}
}`);
              return `${contact.first_name} ${contact.last_name} (${contact.email}) - ${contact.company}`;
            });

            return new Response(
              JSON.stringify({ 
                response: `Found ${allContactsData.results.length} contacts in CallProof. Here are the first 10:\n\n${contactSample.join('\n')}\n\nYou can now search for any of these contacts by name.`,
                data: allContactsData.results.slice(0, 10),
                searchType: 'all_contacts'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            return new Response(
              JSON.stringify({ 
                response: 'No contacts found in your CallProof account.',
                data: null,
                searchType: 'all_contacts'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.error('Error fetching all contacts:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch contacts: ' + error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'CallProof credentials not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine if searching for contact or account
    const isContactQuery = query.toLowerCase().includes('contact') || 
                          query.toLowerCase().includes('person') ||
                          searchTerm.split(' ').length <= 3; // Assume short names are contacts
    
    const searchType = isContactQuery ? 'contact' : 'account';
    console.log(`Searching for ${searchType}:`, searchTerm);

    // Check if user has CRM connection stored
    let data = null;

    console.log('=== CRM CONNECTION CHECK ===');
    console.log('Profile data:', {
      callproof_enabled: profile.callproof_enabled,
      hasApiKey: !!profile.callproof_api_key,
      hasApiSecret: !!profile.callproof_api_secret,
      apiKeyLength: profile.callproof_api_key?.length || 0,
      apiSecretLength: profile.callproof_api_secret?.length || 0
    });

    // Check CallProof connection
    if (profile.callproof_enabled && profile.callproof_api_key && profile.callproof_api_secret) {
      console.log(`✅ CallProof credentials found - Querying for ${searchType}:`, searchTerm);
      console.log('CallProof API Key length:', profile.callproof_api_key.length);
      
      try {
        if (searchType === 'contact') {
          console.log('🔍 Calling queryCallProofContact...');
          data = await queryCallProofContact(
            profile.callproof_api_key,
            profile.callproof_api_secret,
            searchTerm
          );
          console.log('✅ queryCallProofContact completed, data:', !!data);
        } else {
          console.log('🔍 Calling queryCallProofAccount...');
          data = await queryCallProofAccount(
            profile.callproof_api_key,
            profile.callproof_api_secret,
            searchTerm
          );
          console.log('✅ queryCallProofAccount completed, data:', !!data);
        }
      } catch (callproofError) {
        console.error('❌ CallProof API error:', callproofError);
        return new Response(
          JSON.stringify({ 
            response: `I encountered an error connecting to your CallProof system: ${callproofError.message}. Please check your API credentials in settings and try again.`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('❌ CallProof not configured or missing credentials:', {
        enabled: profile.callproof_enabled,
        hasApiKey: !!profile.callproof_api_key,
        hasApiSecret: !!profile.callproof_api_secret
      });
      
      // Return specific message about needing CRM connection
      return new Response(
        JSON.stringify({ 
          response: `I'd love to help you look up that information! However, I need to be connected to your CRM system to access contact details. Once you connect your CRM, I can pull up information about your contacts, accounts, and deals. For now, tell me - what specific information are you looking for about this contact?`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no data found, return helpful message with suggestions
    if (!data) {
      return new Response(
        JSON.stringify({ 
          response: `I couldn't find a ${searchType} named "${searchTerm}" in your CallProof system. 

Here are some tips to help find the contact:
• Try using just the first name: "Brad"
• Try the last name only: "Cook" 
• Check the exact spelling in your CallProof account
• Make sure the contact exists in your CallProof system

Would you like me to help you with something else, or try a different contact name?`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI insights based on the data
    console.log(`Generating insights for ${searchType} data...`);
    const insights = await generateInsights(data, query, searchType);

    return new Response(
      JSON.stringify({ 
        response: insights,
        data: data,
        searchType: searchType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in CRM account query function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});