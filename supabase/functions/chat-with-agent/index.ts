// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

type Classification = 'callproof' | 'zoho' | 'general' | 'other_crm' | 'unknown';

type ConversationState = {
  classification?: Classification;
  collectedParams?: Record<string, string>;
  pending?: {
    type: 'choose_contact' | 'ask_param';
    key?: string;
  } | null;
  options?: Array<{ id: string | number; label: string }>; // for choose_contact
  lastService?: 'callproof' | 'zoho' | 'openai';
  lastAction?: string;
};

const STATE_START = '---STATE_JSON_START---';
const STATE_END = '---STATE_JSON_END---';

function extractStateFromSummary(summary: string | null | undefined): ConversationState {
  try {
    if (!summary) return {};
    const start = summary.indexOf(STATE_START);
    const end = summary.indexOf(STATE_END);
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = summary.substring(start + STATE_START.length, end).trim();
      const parsed = JSON.parse(jsonStr);
      return parsed || {};
    }
    return {};
  } catch {
    return {};
  }
}

function upsertStateInSummary(summary: string | null | undefined, state: ConversationState): string {
  const base = summary || '';
  const block = `\n${STATE_START}\n${JSON.stringify(state)}\n${STATE_END}\n`;
  const hasStart = base.includes(STATE_START);
  const hasEnd = base.includes(STATE_END);
  if (hasStart && hasEnd) {
    const start = base.indexOf(STATE_START);
    const end = base.indexOf(STATE_END) + STATE_END.length;
    return base.slice(0, start) + block + base.slice(end);
  }
  return base + block;
}

async function callOpenAI(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, temperature = 0.4, max_tokens = 600) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages,
      temperature,
      max_tokens,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${res.statusText} ${t}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim?.() || '';
}

async function classifyPrompt(message: string): Promise<Classification> {
  try {
    const sys = 'Classify the user message into one of: callproof, zoho, general, other_crm. Return only the single label in lowercase.';
    const out = await callOpenAI([
      { role: 'system', content: sys },
      { role: 'user', content: message }
    ], 0, 20);
    const label = (out || '').toLowerCase().trim();
    if (['callproof', 'zoho', 'general', 'other_crm'].includes(label)) return label as Classification;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

function extractLikelyName(text: string): string | null {
  const lower = text.toLowerCase();
  const tokens = text.split(/\s+/);
  let start = -1;
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].toLowerCase();
    if (w === 'for' || w === 'about' || w === 'regarding') { start = i + 1; break; }
  }
  if (start >= 0) {
    const cand = tokens.slice(start, start + 3).join(' ').trim();
    if (cand) return cand;
  }
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/;
  const m = text.match(namePattern);
  return m ? m[0] : null;
}

function intentForCallProof(message: string): { endpoint: 'calls'|'contacts'|'contacts.find'|'appointments'|'emails'|'reps.stats'; term?: string; } {
  const lower = message.toLowerCase();
  if (lower.includes('appointment')) return { endpoint: 'appointments' };
  if (lower.includes('email')) return { endpoint: 'emails' };
  if (lower.includes('stat')) return { endpoint: 'reps.stats' };
  if (lower.includes('all contacts') || lower.includes('list contacts')) return { endpoint: 'contacts' };
  if (lower.includes('contact')) return { endpoint: 'contacts.find', term: extractLikelyName(message) || undefined };
  if (lower.includes('call')) return { endpoint: 'calls', term: extractLikelyName(message) || undefined };
  return { endpoint: 'contacts.find', term: extractLikelyName(message) || undefined };
}

async function callCallProof(userId: string, payload: any) {
  const { data, error } = await supabase.functions.invoke('callproof-api', { body: { userId, ...payload } });
  if (error) throw new Error(error.message || 'CallProof function error');
  if (data?.error) throw new Error(data.error);
  return data;
}

async function rephraseFromJson(title: string, jsonLike: any, followUpHint?: string): Promise<string> {
  try {
    const sys = 'You rewrite API JSON into concise, human-readable sales assistant responses. No code, no JSON. 1-4 short lines max.';
    const user = `${title}\n\nJSON:\n${JSON.stringify(jsonLike).slice(0, 6000)}\n\nReturn only text. ${followUpHint ? `End with one helpful follow-up question: ${followUpHint}` : ''}`;
    const out = await callOpenAI([
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ], 0.3, 220);
    return out || 'Done.';
  } catch (e) {
    if (Array.isArray(jsonLike?.list)) {
      const lines = jsonLike.list.slice(0, 5).map((it: any) => {
        const name = it.contact_name || it.person || `${(it.first_name||'')} ${(it.last_name||'')}`.trim();
        const company = it.company || it.company_name || '';
        const desc = it.outcome || it.result || it.subject || it.purpose || it.phone || '';
        return `${name || 'Unknown'}${company ? ' @ ' + company : ''}${desc ? ' — ' + desc : ''}`;
      });
      return `${title}\n${lines.join('\n')}`;
    }
    return title;
  }
}

async function handleCallProofFlow(message: string, userId: string, state: ConversationState): Promise<{ text: string; state: ConversationState }>{
  const prev = state || {};

  if (prev.pending?.type === 'choose_contact' && Array.isArray(prev.options) && prev.options.length > 0) {
    const n = parseInt(message.trim(), 10);
    if (!isNaN(n) && n >= 1 && n <= prev.options.length) {
      const choice = prev.options[n - 1];
      const cp = await callCallProof(userId, { endpoint: 'calls', params: { contact_id: String(choice.id), limit: 50 } });
      const text = await rephraseFromJson(`Found ${cp?.list?.length || 0} calls for ${choice.label}.`, cp, 'Do you want to schedule a follow-up or see recent emails?');
      return { text, state: { ...prev, pending: null, options: [], lastService: 'callproof', lastAction: 'calls_by_contact' } };
    }
    return { text: 'Please reply with the number of the correct contact (e.g., 1 or 2).', state: prev };
  }

  const intent = intentForCallProof(message);

  if (intent.endpoint === 'calls') {
    const email = extractEmail(message);
    if (email) {
      const cp = await callCallProof(userId, { endpoint: 'calls', params: { rep_email: email, limit: 50 } });
      const text = await rephraseFromJson(`Recent calls for ${email}`, cp, 'Want me to summarize key outcomes?');
      return { text, state: { ...prev, lastService: 'callproof', lastAction: 'calls_by_rep', collectedParams: { ...(prev.collectedParams||{}), rep_email: email } } };
    }
    const name = intent.term || extractLikelyName(message);
    if (!name) {
      return { text: 'Do you want calls by rep (give an email) or by contact (give a name)?', state: { ...prev, pending: { type: 'ask_param', key: 'calls_target' } } };
    }
    const search = await callCallProof(userId, { endpoint: 'contacts.find', params: { query: name } });
    const list = Array.isArray(search?.list) ? search.list : [];
    if (list.length === 0) {
      return { text: `I couldn’t find a contact named "${name}" in CallProof. Try a different spelling or give me the company name.`, state: prev };
    }
    if (list.length > 1) {
      const options = list.slice(0, 5).map((c: any) => ({ id: c.id, label: `${(c.first_name||'')} ${(c.last_name||'')}`.trim() + (c.company ? ` @ ${c.company}` : '') }));
      const lines = options.map((o, i) => `${i+1}) ${o.label}`);
      return { text: `I found multiple matches. Which one?\n${lines.join('\n')}\nReply with a number.`, state: { ...prev, pending: { type: 'choose_contact' }, options, collectedParams: { ...(prev.collectedParams||{}), query: name } } };
    }
    const contact = list[0];
    const cp = await callCallProof(userId, { endpoint: 'calls', params: { contact_id: String(contact.id), limit: 50 } });
    const label = `${(contact.first_name||'')} ${(contact.last_name||'')}`.trim() + (contact.company ? ` @ ${contact.company}` : '');
    const text = await rephraseFromJson(`Recent calls for ${label}`, cp, 'Should I set a reminder or draft an email?');
    return { text, state: { ...prev, lastService: 'callproof', lastAction: 'calls_by_contact', collectedParams: { ...(prev.collectedParams||{}), contact_id: String(contact.id) } } };
  }

  if (intent.endpoint === 'contacts') {
    const cp = await callCallProof(userId, { endpoint: 'contacts' });
    const text = await rephraseFromJson(`Here are your recent contacts (${cp?.list?.length || 0} shown).`, cp, 'Want to search for someone specific?');
    return { text, state: { ...prev, lastService: 'callproof', lastAction: 'list_contacts' } };
  }

  if (intent.endpoint === 'contacts.find') {
    const term = intent.term || extractLikelyName(message);
    if (!term) {
      return { text: 'Who should I look up? Give me a name or company.', state: prev };
    }
    const cp = await callCallProof(userId, { endpoint: 'contacts.find', params: { query: term } });
    const list = Array.isArray(cp?.list) ? cp.list : [];
    if (list.length === 0) return { text: `No contacts found for "${term}". Try another name or include the company.`, state: prev };
    if (list.length === 1) {
      const c = list[0];
      const label = `${(c.first_name||'')} ${(c.last_name||'')}`.trim() + (c.company ? ` @ ${c.company}` : '');
      const text = `Found ${label}. Want to pull recent calls or schedule an appointment?`;
      return { text, state: { ...prev, lastService: 'callproof', lastAction: 'search_contact', collectedParams: { ...(prev.collectedParams||{}), query: term, contact_id: String(c.id) } } };
    }
    const options = list.slice(0, 5).map((c: any) => ({ id: c.id, label: `${(c.first_name||'')} ${(c.last_name||'')}`.trim() + (c.company ? ` @ ${c.company}` : '') }));
    const lines = options.map((o, i) => `${i+1}) ${o.label}`);
    return { text: `I found multiple contacts. Which one?\n${lines.join('\n')}\nReply with a number.`, state: { ...prev, pending: { type: 'choose_contact' }, options, collectedParams: { ...(prev.collectedParams||{}), query: term } } };
  }

  if (intent.endpoint === 'appointments') {
    const cp = await callCallProof(userId, { endpoint: 'appointments' });
    const text = await rephraseFromJson('Recent appointments', cp, 'Want to set a new appointment?');
    return { text, state: { ...prev, lastService: 'callproof', lastAction: 'appointments' } };
  }

  if (intent.endpoint === 'emails') {
    const cp = await callCallProof(userId, { endpoint: 'emails' });
    const text = await rephraseFromJson('Recent emails', cp, 'Want me to draft a follow-up?');
    return { text, state: { ...prev, lastService: 'callproof', lastAction: 'emails' } };
  }

  const cp = await callCallProof(userId, { endpoint: 'reps.stats' });
  const text = await rephraseFromJson('Your recent rep stats', cp, 'Should we set a target for next week?');
  return { text, state: { ...prev, lastService: 'callproof', lastAction: 'rep_stats' } };
}
// AI Coach response generation based on coach settings
async function generateCoachResponse(message: string, coachConfig: any, userId?: string, conversationHistory?: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  const coachName = coachConfig.coachName || 'Bobby Hartline';
  
  console.log('Processing message:', message);
  console.log('User ID:', userId);
  console.log('Conversation history passed in:', conversationHistory || 'None');
  
  // Extract name from conversation history if available
  let storedName = '';
  if (conversationHistory) {
    const nameMatch = conversationHistory.match(/(?:User:\s*(?:i'm\s+|my name is\s+|i am\s+)?([A-Za-z]+))|(?:USER_NAME:\s*([A-Za-z]+))/i);
    if (nameMatch) {
      storedName = nameMatch[1] || nameMatch[2];
      console.log('Extracted stored name:', storedName);
    }
  }
  
  // Check if user is asking about their name
  if (lowerMessage.includes('my name') || lowerMessage.includes('remember my name') || 
      lowerMessage.includes('what is my name') || lowerMessage.includes('do you remember my name')) {
    
    if (storedName) {
      return `Yes, your name is ${storedName}! Great to see you again. What sales challenge would you like to work on today?`;
    } else {
      return `I don't think you've told me your name yet. What's your name?`;
    }
  }
  
  // Check if user is telling us their name
  if (lowerMessage.startsWith("i'm ") || lowerMessage.startsWith("my name is ") || 
      lowerMessage.startsWith("i am ") || message.match(/^[A-Za-z]+$/)) {
    
    let userName = '';
    if (lowerMessage.startsWith("i'm ")) {
      userName = message.substring(4).trim();
    } else if (lowerMessage.startsWith("my name is ")) {
      userName = message.substring(11).trim();
    } else if (lowerMessage.startsWith("i am ")) {
      userName = message.substring(5).trim();
    } else if (message.match(/^[A-Za-z]+$/)) {
      userName = message.trim();
    }
    
    console.log('User provided name:', userName);
    return `Nice to meet you, ${userName}! I'm ${coachName}, your AI sales coach. I'm here to help you crush your sales goals. What are you selling these days, and what's your biggest challenge right now?`;
  }
  
  // Generate contextual greeting
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('working')) {
    return generateGreeting(coachName, coachConfig.coachingStyle || 'supportive');
  }
  
  // Topic-specific responses with coaching style adaptation
  if (lowerMessage.includes('cold call') || lowerMessage.includes('calling')) {
    return generateTopicResponse('cold_calling', coachConfig.coachingStyle || 'supportive', coachConfig.roastingLevel || 'medium');
  }
  
  if (lowerMessage.includes('objection') || lowerMessage.includes('no')) {
    return generateTopicResponse('objections', coachConfig.coachingStyle || 'supportive', coachConfig.roastingLevel || 'medium');
  }
  
  if (lowerMessage.includes('prospect') || lowerMessage.includes('lead')) {
    return generateTopicResponse('prospecting', coachConfig.coachingStyle || 'supportive', coachConfig.roastingLevel || 'medium');
  }
  
  if (lowerMessage.includes('close') || lowerMessage.includes('closing')) {
    return generateTopicResponse('closing', coachConfig.coachingStyle || 'supportive', coachConfig.roastingLevel || 'medium');
  }
  
  if (lowerMessage.includes('email') || lowerMessage.includes('follow up')) {
    return generateTopicResponse('follow_up', coachConfig.coachingStyle || 'supportive', coachConfig.roastingLevel || 'medium');
  }
  
  // Use the default response generator which includes CRM lookup logic
  return await generateDefaultResponse(coachName, coachConfig.coachingStyle || 'supportive', coachConfig.roastingLevel || 'medium', message, userId);
}

function generateGreeting(coachName: string, coachingStyle: string): string {
  const baseGreeting = `Hey there! ${coachName} here, your sales coach.`;
  
  switch (coachingStyle) {
    case 'motivational':
      return `${baseGreeting} I'm fired up to help you CRUSH your sales goals! What's the biggest opportunity you're working on right now? Let's turn it into a WIN!`;
    case 'direct':
      return `${baseGreeting} Let's cut to the chase - what's your biggest sales challenge right now? Are you struggling with prospecting, handling objections, or closing deals?`;
    case 'analytical':
      return `${baseGreeting} I'm here to help you optimize your sales performance. What specific metrics or processes would you like to improve? Let's dive into the data.`;
    default:
      return `${baseGreeting} I've trained thousands of salespeople to hit their numbers. What's your biggest sales challenge right now? Are you struggling with prospecting, handling objections, or closing deals?`;
  }
}

function generateTopicResponse(topic: string, coachingStyle: string, roastingLevel: string): string {
  const responses = {
    cold_calling: {
      supportive: "Cold calling can be challenging, but you've got this! The key is to lead with value, not your pitch. Try starting with 'I know I'm calling out of the blue, but I have an idea that could help you...' What industry are you targeting?",
      direct: "Cold calling success comes down to preparation and persistence. Lead with value, not features. 'I know I'm calling out of the blue, but I have an idea that could help you...' What's your current connect rate?",
      motivational: "Cold calling is where CHAMPIONS are made! Every 'no' gets you closer to that BIG YES! Lead with massive value: 'I know I'm calling out of the blue, but I have an idea that could help you...' What industry are you CRUSHING right now?",
      analytical: "Let's optimize your cold calling approach. Your opening should focus on value proposition. Data shows that starting with 'I know I'm calling out of the blue, but I have an idea that could help you...' increases connect rates by 23%. What's your current conversion metrics?"
    },
    objections: {
      supportive: "Objections are actually good news - they mean your prospect is engaged! The best approach is to acknowledge, clarify, and redirect. For example: 'I understand your concern about price. Help me understand - is it the budget itself or the value you're questioning?'",
      direct: "Stop fearing objections - they're buying signals. Acknowledge, clarify, redirect. 'I understand your concern about price. Help me understand - is it the budget itself or the value you're questioning?' What objections are you hearing most?",
      motivational: "OBJECTIONS ARE BUYING SIGNALS! Your prospect is ENGAGED and ready to move forward! Master the acknowledge-clarify-redirect technique: 'I understand your concern about price. Help me understand - is it the budget itself or the value you're questioning?' You've GOT THIS!",
      analytical: "Objection handling follows a systematic process: acknowledge, clarify, redirect. For price objections, use: 'I understand your concern about price. Help me understand - is it the budget itself or the value you're questioning?' This addresses both budget and value perception concerns."
    },
    prospecting: {
      supportive: "Prospecting is all about finding the right people to help. You need consistent daily activity - aim for 50 calls or 100 emails per day. But more importantly, are you targeting the RIGHT prospects? Tell me about your ideal customer profile.",
      direct: "Prospecting is a numbers game with smart targeting. 50 calls or 100 emails daily minimum. But are you targeting the RIGHT prospects? What's your ideal customer profile?",
      motivational: "PROSPECTING IS WHERE FORTUNES ARE MADE! Get after it with MASSIVE activity - 50 calls or 100 emails daily! But make them COUNT by targeting the RIGHT prospects! Tell me about your IDEAL customer profile!",
      analytical: "Effective prospecting requires both volume and precision. Target metrics: 50 calls or 100 emails per day with a clearly defined ICP. What data points define your ideal customer profile?"
    },
    closing: {
      supportive: "Great question about closing! Remember, closing starts at the beginning of your conversation. You close with questions that create urgency and commitment. Try: 'Based on what you've told me, it sounds like this could solve your problem. What would need to happen for you to move forward?'",
      direct: "Closing starts at the beginning, not the end. Use commitment questions: 'Based on what you've told me, it sounds like this could solve your problem. What would need to happen for you to move forward?' What's your current closing rate?",
      motivational: "CLOSING is where DEALS GET DONE! Start closing from minute ONE! Use powerful commitment questions: 'Based on what you've told me, it sounds like this could solve your problem. What would need to happen for you to move forward?' GO GET THAT SIGNATURE!",
      analytical: "Closing effectiveness correlates with early qualification. Use assumptive closing questions: 'Based on what you've told me, it sounds like this could solve your problem. What would need to happen for you to move forward?' This identifies decision criteria and timeline."
    },
    follow_up: {
      supportive: "Follow-up is where relationships are built! Each email should add value - never send 'just checking in' messages. Try: 'Saw this article about [their industry] and thought of our conversation...' How many touchpoints are you planning?",
      direct: "Follow-ups must add value every time. No 'checking in' emails. Each touch should have a reason: insight, article, question. 'Saw this article about [their industry] and thought of our conversation...' How many touchpoints in your sequence?",
      motivational: "FOLLOW-UP IS WHERE CHAMPIONS SEPARATE FROM THE PACK! Add MASSIVE value with every touch! 'Saw this article about [their industry] and thought of our conversation...' Keep CRUSHING those touchpoints!",
      analytical: "Effective follow-up sequences average 7-12 touchpoints with value-add content. Template: 'Saw this article about [their industry] and thought of our conversation...' What's your current follow-up conversion rate?"
    }
  };
  
  const styleResponse = responses[topic as keyof typeof responses]?.[coachingStyle as keyof any] || 
                      responses[topic as keyof typeof responses]?.supportive || 
                      "That's a great question! Let me help you with that.";
  
  return styleResponse;
}

async function generateDefaultResponse(coachName: string, coachingStyle: string, roastingLevel: string, message: string, userId?: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Handle CRM lookup requests first
  if (lowerMessage.includes('look up') || lowerMessage.includes('find') || 
      lowerMessage.includes('search for') || lowerMessage.includes('callproof') ||
      lowerMessage.includes('aloha pools') || lowerMessage.includes('brad cook')) {
    
    if (!userId) {
      return `I'd love to help you look up that information! However, I need to be connected to your CRM system to access contact details. Once you connect your CRM, I can pull up information about your contacts, accounts, and deals. For now, tell me - what specific information are you looking for about this contact?`;
    }

    try {
      console.log('Starting CRM lookup for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('CRM lookup timeout')), 10000)
      );

      // Check if user has CRM connections in crm_connections table
      const crmConnectionsPromise = supabase
        .from('crm_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Also check for CallProof credentials in profiles table
      const profilePromise = supabase
        .from('profiles')
        .select('callproof_enabled, callproof_api_key, callproof_api_secret')
        .eq('user_id', userId)
        .single();

      const [crmResult, profileResult] = await Promise.race([
        Promise.all([crmConnectionsPromise, profilePromise]),
        timeoutPromise
      ]) as [any, any];

      const { data: crmConnections, error: crmError } = crmResult;
      const { data: profile, error: profileError } = profileResult;

      console.log('CRM connections result:', { crmConnections, crmError });
      console.log('Profile result:', { profile, profileError });

      const hasCallProofInProfile = profile && profile.callproof_enabled && profile.callproof_api_key && profile.callproof_api_secret;
      const hasCrmConnections = crmConnections && crmConnections.length > 0;

      console.log('CallProof status in profile:', hasCallProofInProfile);
      console.log('CRM connections found:', hasCrmConnections);

      if (!hasCallProofInProfile && !hasCrmConnections) {
        return `I'd love to help you look up that information! However, I need to be connected to your CRM system first. Please connect your CRM in the settings to enable contact lookups. For now, tell me - what specific information are you looking for about this contact?`;
      }

      // Extract search term from message
      let searchTerm = '';
      if (lowerMessage.includes('aloha pools')) {
        searchTerm = 'Aloha Pools USA';
      } else if (lowerMessage.includes('brad cook')) {
        searchTerm = 'Brad Cook';
      } else {
        // More sophisticated name extraction
        const words = message.split(' ');
        let startIndex = -1;
        
        // Find trigger words and get the name after them
        for (let i = 0; i < words.length; i++) {
          const word = words[i].toLowerCase();
          if (word.includes('look') || word.includes('find') || word.includes('search')) {
            // Look for "up" after look/find
            if (i + 1 < words.length && words[i + 1].toLowerCase() === 'up') {
              startIndex = i + 2;
            } else if (i + 1 < words.length && words[i + 1].toLowerCase() === 'for') {
              startIndex = i + 2;
            } else {
              startIndex = i + 1;
            }
            break;
          }
        }
        
        // Extract name(s) - typically 1-3 words
        if (startIndex >= 0 && startIndex < words.length) {
          // Filter out common words that aren't names
          const nameWords = [];
          for (let i = startIndex; i < Math.min(startIndex + 3, words.length); i++) {
            const word = words[i].toLowerCase();
            if (!['in', 'on', 'at', 'the', 'and', 'or', 'from', 'callproof', 'crm', 'system'].includes(word)) {
              nameWords.push(words[i]);
            } else {
              break; // Stop at prepositions or system names
            }
          }
          searchTerm = nameWords.join(' ').trim();
        }
        
        // Fallback: if no trigger words found, look for name patterns
        if (!searchTerm) {
          // Look for potential names (capitalized words that aren't at the start)
          const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
          const matches = message.match(namePattern);
          if (matches && matches.length > 0) {
            // Take the first match that looks like a name
            searchTerm = matches[0];
          }
        }
      }

      console.log('Extracted search term:', searchTerm);

      if (!searchTerm) {
        return `I can help you look up contact information! What's the name of the contact or company you'd like me to search for?`;
      }

      // Add timeout to CRM query as well
      const crmQueryPromise = supabase.functions.invoke('crm-account-query', {
        body: {
          searchTerm: searchTerm,
          query: `Tell me about ${searchTerm}`,
          userId: userId
        }
      });

      const crmQueryTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('CRM query timeout')), 15000)
      );

      const { data: crmData, error: queryError } = await Promise.race([
        crmQueryPromise,
        crmQueryTimeout
      ]) as any;

      if (queryError) {
        console.error('Error querying CRM:', queryError);
        return `I tried to look up "${searchTerm}" but encountered an issue accessing your CRM data. Please check your CRM connection or try again. What specific information were you looking for?`;
      }

      if (crmData && crmData.insights) {
        return `Great! I found information about ${searchTerm}:\n\n${crmData.insights}\n\nWhat would you like to know more about or how can I help you with this account?`;
      } else if (crmData && crmData.message) {
        return crmData.message;
      } else {
        return `I searched your CRM for "${searchTerm}" but didn't find any matches. Double-check the spelling or try searching for a different variation of the name. What specific information were you looking for?`;
      }

    } catch (error) {
      console.error('Error in CRM lookup:', error);
      return `I encountered an error while searching for that information. Please try again or tell me what specific details you're looking for about this contact.`;
    }
  }
  
  // For now, use ElevenLabs WebSocket through the existing system
  // We'll integrate this with the conversation memory from Supabase
  console.log('Using conversation context for response generation...');
  
  // Contextual responses based on conversation memory
  if (message.includes('Previous conversation context:')) {
    const parts = message.split('\n\nCurrent message: ');
    if (parts.length === 2) {
      const context = parts[0].replace('Previous conversation context: ', '');
      const currentMessage = parts[1];
      
      console.log('Found conversation context:', context.substring(0, 100) + '...');
      
      // Check if user is asking about their name and we have context about it
      if (currentMessage.toLowerCase().includes('what is my name') || 
          currentMessage.toLowerCase().includes('my name')) {
        
        // Look for name in context
        const nameMatch = context.match(/User:\s*([A-Za-z]+)(?:\s|$)/i);
        if (nameMatch && nameMatch[1] && nameMatch[1].toLowerCase() !== 'user') {
          const userName = nameMatch[1];
          return `Your name is ${userName}! Great to see you again. What sales challenge would you like to work on today?`;
        }
      }
      
      // If user is sharing their name for the first time
      if (currentMessage.match(/^[A-Za-z]+$/i) && !context.includes(currentMessage)) {
        return `Nice to meet you, ${currentMessage}! I'm ${coachName}, your AI sales coach. I'm here to help you crush your sales goals. What are you selling these days, and what's your biggest challenge right now?`;
      }
    }
  }
  
  // Handle first-time name sharing
  if (message.match(/^[A-Za-z]+$/i)) {
    return `Nice to meet you, ${message}! I'm ${coachName}, your AI sales coach. I'm here to help you crush your sales goals. What are you selling these days, and what's your biggest challenge right now?`;
  }
  
  // Default contextual response
  return `I'm here to help you succeed in sales! What specific challenge or goal would you like to work on today?`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, coachConfig, userId } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Generating coach response for:', message);
    console.log('User ID:', userId);
    console.log('Has user ID for conversation history:', !!userId);
    
    // Use coach configuration from settings or defaults
    const defaultCoachConfig = {
      coachName: 'Bobby Hartline',
      coachingStyle: 'supportive',
      roastingLevel: 'medium',
      customInstructions: '',
      firstMessage: 'Hello! I\'m Bobby your AI sales coach. Let\'s get to know each other. What is your name?',
      industry: 'saas',
      methodology: 'challenger'
    };
    
    // Merge configs, prioritizing the provided coachConfig
    const activeCoachConfig = { ...defaultCoachConfig, ...coachConfig };
    console.log('Using coach config:', activeCoachConfig);

    // Get or update conversation history for context
    let conversationContext = '';
    let state: ConversationState = {};
    if (userId) {
      try {
        console.log('Looking up conversation history for user:', userId);
        const { data: existingConversation, error: historyError } = await supabase
          .from('conversation_history')
          .select('*')
          .eq('user_id', userId)
          .eq('agent_id', 'agent_4301k1p4h341eahrqp6v8tr8qqfs')
          .maybeSingle();

        if (historyError) {
          console.error('Error fetching conversation history:', historyError);
        } else if (existingConversation) {
          conversationContext = existingConversation.conversation_summary || '';
          state = extractStateFromSummary(conversationContext);
          console.log('Found existing conversation context:', conversationContext.substring(0, 200) + '...');
        } else {
          console.log('No existing conversation found for user');
        }
      } catch (error) {
        console.error('Unexpected error fetching conversation history:', error);
      }
    }

    // 1) Classify
    const classification: Classification = state.classification || await classifyPrompt(message);
    state.classification = classification;

    // 2) Route + execute
    let agentResponse = '';
    if (classification === 'callproof') {
      try {
        const result = await handleCallProofFlow(message, userId, state);
        agentResponse = result.text;
        state = result.state;
      } catch (e: any) {
        agentResponse = `I tried to reach CallProof but got an error: ${e?.message || 'unknown issue'}. Please check your CallProof connection and try again.`;
      }
    } else if (classification === 'zoho') {
      agentResponse = 'Zoho CRM integration is not implemented yet. Would you like me to use CallProof or answer generally?';
    } else if (classification === 'general') {
      agentResponse = await generateCoachResponse(message, activeCoachConfig, userId, conversationContext);
    } else if (classification === 'other_crm') {
      agentResponse = 'That CRM isn’t implemented yet. I can help with CallProof or general sales coaching. Which would you like?';
    } else {
      agentResponse = 'Do you want me to look up something in CallProof, help with your calendar/sales strategy, or another CRM?';
    }
    console.log('Coach responds:', agentResponse);

    // Save conversation history
    if (userId) {
      try {
        let conversationSummary;
        const previousContext = conversationContext ? conversationContext.split('\n').slice(-200).join('\n') : '';
        conversationSummary = `${previousContext}\n\nUser: ${message}\nCoach: ${agentResponse}`.trim();
        conversationSummary = upsertStateInSummary(conversationSummary, state);

        console.log('Saving conversation summary (length:', conversationSummary.length, ')');
        console.log('Current conversation context being saved:', conversationSummary);

        // Use upsert with proper conflict resolution
        const { error: upsertError } = await supabase
          .from('conversation_history')
          .upsert({
            user_id: userId,
            agent_id: 'agent_4301k1p4h341eahrqp6v8tr8qqfs',
            conversation_summary: conversationSummary,
            user_name: 'User', // Will be updated by profile
            user_company: 'Unknown', // Will be updated by profile
            user_goals: 'Sales coaching',
            user_challenges: 'Sales improvement',
            last_topics: [message.substring(0, 100)],
            key_insights: [agentResponse.substring(0, 200)],
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,agent_id'
          });

        if (upsertError) {
          console.error('Error upserting conversation history:', upsertError);
        } else {
          console.log('Conversation history saved successfully for user:', userId);
        }
      } catch (error) {
        console.error('Error saving conversation history:', error);
        // Don't fail the whole request if history saving fails
      }
    }

    return new Response(JSON.stringify({ 
      response: agentResponse,
      conversationId: conversationId || `conv_${Date.now()}`,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat with agent:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      response: "I'm having trouble connecting right now. Please try again or call me at (615) 845-6286."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});