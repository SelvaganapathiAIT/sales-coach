import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALLPROOF_API_KEY = Deno.env.get('CALLPROOF_API_KEY');
const CALLPROOF_API_SECRET = Deno.env.get('CALLPROOF_API_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId } = await req.json();
    
    if (!CALLPROOF_API_KEY || !CALLPROOF_API_SECRET) {
      throw new Error('CallProof API credentials not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (action) {
      case 'sync_contacts':
        return await syncContacts(supabase, userId);
      case 'get_calls':
        return await getCalls(supabase, userId);
      case 'sync_profile':
        return await syncProfile(supabase, userId);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in callproof-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function callCallProofAPI(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://app.callproof.com/api/${endpoint}`);
  
  // Add API credentials to params
  params.key = CALLPROOF_API_KEY!;
  params.secret = CALLPROOF_API_SECRET!;
  
  // Add params to URL
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log('Calling CallProof API:', url.toString());
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CallProof API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function syncContacts(supabase: any, userId: string) {
  try {
    // Get contacts from CallProof
    const contacts = await callCallProofAPI('contacts');
    
    console.log('CallProof contacts response:', contacts);
    
    if (!contacts || !contacts.data) {
      throw new Error('No contacts data received from CallProof');
    }

    // Store contacts info in user profile
    const contactsCount = contacts.data.length;
    const recentContacts = contacts.data.slice(0, 10); // Get first 10 contacts
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        callproof_contacts_count: contactsCount,
        callproof_recent_contacts: recentContacts,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactsCount,
        message: `Synced ${contactsCount} contacts from CallProof`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing contacts:', error);
    throw error;
  }
}

async function getCalls(supabase: any, userId: string) {
  try {
    // Get calls from CallProof
    const calls = await callCallProofAPI('calls');
    
    console.log('CallProof calls response:', calls);
    
    if (!calls || !calls.data) {
      throw new Error('No calls data received from CallProof');
    }

    // Store calls info in user profile
    const callsCount = calls.data.length;
    const recentCalls = calls.data.slice(0, 20); // Get first 20 calls
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        callproof_calls_count: callsCount,
        callproof_recent_calls: recentCalls,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callsCount,
        recentCalls: recentCalls.slice(0, 5), // Return just first 5 for display
        message: `Retrieved ${callsCount} calls from CallProof`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting calls:', error);
    throw error;
  }
}

async function syncProfile(supabase: any, userId: string) {
  try {
    // Get user stats from CallProof
    const stats = await callCallProofAPI('reps/stats');
    
    console.log('CallProof stats response:', stats);
    
    // Update user profile with CallProof data
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        callproof_stats: stats,
        callproof_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        message: 'CallProof profile synced successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing profile:', error);
    throw error;
  }
}