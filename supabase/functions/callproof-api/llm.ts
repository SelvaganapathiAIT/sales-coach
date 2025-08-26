import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
const LOG_PREFIX = "[callproof-api|LLM]";
// ---------- UTILITIES ----------
function fmtYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function fmtDDMMYYYY(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
// ---------- SUPABASE USERNAME ----------
export async function getUserName(userId) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, key);
  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("user_id", userId).maybeSingle();
  let username = "";
  if (profile?.first_name || profile?.last_name) {
    username = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  }
  return username;
}
// ---------- TIMEFRAME ANALYZER ----------
export async function analyzeTimeframeWithLLM(followUpText, openai) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: {
      type: "json_object"
    },
    messages: [
      {
        role: "system",
        content: `
You are a timeframe analyzer. Parse any timeframe expression and convert it to days.

CRITICAL Examples (pay attention to exact patterns):
- "30-day call and SMS report" → 30 days, includeCalls: true, includeMessages: true
- "Would you like to see a 30-day call and SMS report?" → 30 days, includeCalls: true, includeMessages: true
- "Would you like to see call history for this contact?" → 30 days, includeCalls: true, includeMessages: false
- "call history" → 30 days, includeCalls: true, includeMessages: false
- "30-day report" → 30 days
- "last week" → 7 days
- "past month" → 30 days
- "last 3 months" → 90 days
- "quarter" → 90 days
- "6 months" → 180 days
- "year" → 365 days
- "yesterday" → 1 day
- "last 2 weeks" → 14 days
- "past 45 days" → 45 days
- "last fiscal quarter" → 90 days
- "recent 72 hours" → 3 days
- "past fortnight" → 14 days
- "last semester" → 180 days
- "this week" → 7 days
- "current month" → 30 days
- "recent times" → 7 days
- "lately" → 7 days
- "recently" → 7 days
- "past few days" → 5 days
- "last couple weeks" → 14 days
- "few months back" → 90 days
- "half a year" → 180 days
- "annual" → 365 days

Also detect data type preferences:
- "call" → includeCalls: true
- "sms", "message", "text" → includeMessages: true
- "activity", "logs" → both true

Return JSON: {
  "days": number,
  "originalPhrase": string,
  "includeCalls": boolean,
  "includeMessages": boolean
}
        `
      },
      {
        role: "user",
        content: `Analyze this follow-up question for timeframe and data types: "${followUpText}"`
      }
    ]
  });
  const raw = completion.choices[0].message?.content || '{"days": 0}';
  try {
    const result = JSON.parse(raw);
    return {
      days: result.days || 0,
      originalPhrase: result.originalPhrase || followUpText,
      includeCalls: result.includeCalls || false,
      includeMessages: result.includeMessages || false
    };
  } catch (err) {
    console.error('[LLM ⇢ Timeframe Parse Error]:', err);
    return {
      days: 0,
      originalPhrase: followUpText,
      includeCalls: false,
      includeMessages: false
    };
  }
}
// ---------- FOLLOW-UP TYPE ANALYZER ----------
export async function analyzeFollowUpType(lastFollowUp, openai) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: {
      type: "json_object"
    },
    messages: [
      {
        role: "system",
        content: `
You are a follow-up type analyzer. Analyze the follow-up question and determine the correct classification type.

CLASSIFICATION RULES:
1. "activity" type for:
   - Call reports (e.g., "call report", "30-day call report")
   - SMS/Message reports (e.g., "SMS report", "message history")
   - Call and SMS combined (e.g., "call and SMS report", "30-day call and sms report")
   - Communication activity over time ranges
   - Raw call logs, message logs

2. "stats" type for:
   - Activity logs (e.g., "activity logs", "this contact's activity logs")
   - Summary reports (e.g., "summary report", "contact summary")
   - Statistics and analytics (e.g., "stats", "performance stats")
   - General reports without specific data type (e.g., "60-day report", "contact report")

3. "crm" type for:
   - Contact searches (e.g., "find contact", "search for")
   - Tasks, appointments, notes, opportunities

CRITICAL EXAMPLES:
- "Would you like to see a 30-day call and SMS report?" → type: "activity"
- "Would you like to see call history for this contact?" → type: "activity" 
- "Would you like to see this contact's activity logs?" → type: "stats"
- "Do you want a call report?" → type: "activity"
- "Want an SMS report?" → type: "activity"
- "Would you like to see their contact stats?" → type: "stats"
- "Do you want a summary report?" → type: "stats"

Return JSON: {
  "type": "activity|stats|crm",
  "action": "contact_search" (only for crm type),
  "reasoning": "brief explanation of classification"
}
        `
      },
      {
        role: "user",
        content: `Analyze this follow-up question and classify its type: "${lastFollowUp}"`
      }
    ]
  });
  const raw = completion.choices[0].message?.content || '{"type": "activity"}';
  try {
    const result = JSON.parse(raw);
    return {
      type: result.type || "activity",
      action: result.action || null,
      reasoning: result.reasoning || ""
    };
  } catch (err) {
    console.error('[LLM ⇢ Follow-up Type Parse Error]:', err);
    return {
      type: "activity",
      action: null,
      reasoning: "Error in parsing"
    };
  }
}
// ---------- PURE LLM CLASSIFIER ----------
export async function classifyWithLLM(prompt, context = {}, conversationHistory = [], openai) {
  const today = fmtYYYYMMDD(new Date());
  const last7Days = fmtYYYYMMDD(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const last30Days = fmtYYYYMMDD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const contextNote = context?.lastContactId ? `If the user refers to "this contact","this account","this lead","this company", use contact_id from context: ${context.lastContactId}` : `If the user says "this contact","this account","this lead","this company" without context, treat it as a general contact reference.`;
  const conversationContext = conversationHistory.length > 0 ? `
Recent conversation context:
${conversationHistory.slice(-3).map((msg, i)=>`${i + 1}. ${msg.type}: ${msg.content}`).join("\n")}
  ` : "No previous conversation context.";
  const followUpContext = context?.lastFollowUp ? `
CRITICAL FOLLOW-UP CONTEXT:
- Last follow-up question: "${context.lastFollowUp}"
- User response: "${prompt}"

If user response is affirmative (yes/ok/yep/sure/do it), this is a follow-up response to the last question.
  ` : "";
  let systemPrompt = `
You are a CRM request classifier. Convert user requests into structured JSON for a CRM API.

IMPORTANT DATES: Today's date is ${today}. Default date ranges:
- Call logs/activity: from_date = ${last7Days}, to_date = ${today}
- Tasks: start_date = ${fmtDDMMYYYY(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))}, end_date = ${fmtDDMMYYYY(new Date())}
- Longer history: from_date = ${last30Days}
- NEVER use years before 2024 unless explicitly mentioned

DATE FORMATS:
- Tasks: DD-MM-YYYY
- Appointments: YYYY-MM-DD  
- Activities: YYYY-MM-DD

CLASSIFICATION TYPES:
1. "crm" - contact search, appointments, tasks, opportunities, notes, eventform
2. "activity" - call logs, message history, SMS, communication activity over time ranges
3. "general" - email writing, sales assistance, sales coaching, strategy advice, best practices
4. "stats" - contact-based stats reports, summary reports, contact activity analytics

CONTEXT AWARENESS:
${contextNote}

CONVERSATION HISTORY:
${conversationContext}

${followUpContext}

CLASSIFICATION RULES:

FOR FOLLOW-UP RESPONSES:
If user says "yes"/"ok"/"yep"/"sure"/"do it" AND there's a lastFollowUp context:
1. This is a follow-up response, analyze the lastFollowUp question
2. Classify based on lastFollowUp content:
   - "call report", "SMS report", "call and SMS report" → type: "activity"
   - "activity logs", "contact stats", "summary report" → type: "stats"
   - "contact search", "find contact" → type: "crm", action: "contact_search"
3. Parse timeframe from lastFollowUp and apply it
4. Set contact: "this contact" to use existing context

FOR DIRECT REQUESTS:
- Tasks (task details, history, list) → type: "crm", action: "tasks", task_status: 0
- Contact search → type: "crm", action: "contact_search", select_search_fields: "1,2,3"
- Call logs, SMS history → type: "activity", include_calls/include_messages: true
- Activity analytics, summaries, stats → type: "stats"

CRITICAL GENERAL CLASSIFICATION RULES:
- Sales strategy, follow-up strategies, coaching advice → type: "general"
- "Help me create", "How to", "What's the best way to" → type: "general" 
- Sales techniques, best practices, tips → type: "general"
- Questions about sales process, methodology → type: "general"
- Email writing, communication strategies → type: "general"
- Any question that doesn't request specific CRM data → type: "general"

EXAMPLES:
- "Help me create an effective follow-up strategy" → type: "general"
- "How to handle objections" → type: "general" 
- "What's the best way to close deals" → type: "general"
- "Show me tasks for this contact" → type: "crm", action: "tasks"
- "Find contact John Smith" → type: "crm", action: "contact_search"

RESPONSE FORMAT for CRM:
{
  "type": "crm",
  "action": "appointments|opportunities|eventform|notes|tasks|contact_search",
  "search": "search string",
  "start_date": "DD-MM-YYYY" (tasks),
  "end_date": "DD-MM-YYYY" (tasks), 
  "start": "YYYY-MM-DD" (appointments),
  "end": "YYYY-MM-DD" (appointments),
  "task_status": 0|1,
  "select_search_fields": "1,2,3",
  "contact": "contact name or this contact"
}

RESPONSE FORMAT for ACTIVITY:
{
  "type": "activity",
  "contact": "contact name or this contact",
  "from_date": "YYYY-MM-DD",
  "to_date": "YYYY-MM-DD", 
  "include_calls": true,
  "include_messages": true,
  "include_appointments": true,
  "call_type": 0|1|2|3,
  "limit": 50
}

RESPONSE FORMAT for STATS:
{
  "type": "stats",
  "contact": "contact name or this contact",
  "from_date": "YYYY-MM-DD",
  "to_date": "YYYY-MM-DD",
  "limit": 5
}

RESPONSE FORMAT for GENERAL:
{
  "type": "general"
}

IMPORTANT: Always return valid JSON. Use LLM reasoning to parse natural language timeframes and data preferences.
`;
  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    ...conversationHistory.slice(-3).map((msg)=>({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content
      })),
    {
      role: "user",
      content: prompt
    }
  ];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: {
      type: "json_object"
    },
    messages
  });
  const raw = completion.choices[0].message?.content || "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
    console.log(`[LLM ⇢ Raw Classification]:`, parsed);
  } catch (err) {
    console.error(LOG_PREFIX, "Invalid JSON from model:", raw);
    parsed = {
      type: "general"
    };
  }
  // Handle "this contact" context resolution
  if (parsed?.search === "this contact" && context?.lastContactId) {
    parsed.contact_id = context.lastContactId;
    delete parsed.search;
  }
  if (parsed?.contact === "this contact" && context?.lastContactId) {
    parsed.contact_id = context.lastContactId;
    delete parsed.contact;
  }
  // ENHANCED FOLLOW-UP HANDLING with LLM
  const isSimpleAffirmative = /^(yes|ok|yep|sure|do it|yeah|yup)$/i.test(prompt.trim());
  if (isSimpleAffirmative && context?.nextFollowUp) {
    console.log(`[LLM ⇢ Follow-up Detected]:`, `"${prompt}" responding to "${context.nextFollowUp}"`);
    try {
      // Use LLM to analyze the follow-up type
      const followUpAnalysis = await analyzeFollowUpType(context.nextFollowUp, openai);
      console.log(`[LLM ⇢ Follow-up Analysis]:`, followUpAnalysis);
      // Override the type based on LLM analysis
      parsed.type = followUpAnalysis.type;
      if (followUpAnalysis.action) {
        parsed.action = followUpAnalysis.action;
      }
      parsed.contact = "this contact";
      console.log(`[LLM ⇢ Follow-up Override]:`, `Set to ${followUpAnalysis.type} type - ${followUpAnalysis.reasoning}`);
      // Use LLM to analyze timeframe from follow-up
      const timeframeAnalysis = await analyzeTimeframeWithLLM(context.nextFollowUp, openai);
      if (timeframeAnalysis.days > 0) {
        const today = fmtYYYYMMDD(new Date());
        const dynamicFromDate = fmtYYYYMMDD(new Date(Date.now() - timeframeAnalysis.days * 24 * 60 * 60 * 1000));
        parsed.from_date = dynamicFromDate;
        parsed.to_date = today;
        console.log(`[LLM ⇢ Dynamic Timeframe]:`, `${timeframeAnalysis.days} days detected, range: ${dynamicFromDate} to ${today}`);
        // Apply data type preferences from LLM analysis
        if (timeframeAnalysis.includeCalls) parsed.include_calls = true;
        if (timeframeAnalysis.includeMessages) parsed.include_messages = true;
      }
    } catch (error) {
      console.warn(`[LLM ⇢ Follow-up Analysis Error]:`, error);
      // Fallback to activity type if analysis fails
      parsed.type = "activity";
      parsed.contact = "this contact";
    }
  }
  // Override classification for general sales coaching questions
  const generalKeywords = [
    'help me create',
    'how to',
    'strategy',
    'best practice',
    'technique',
    'advice',
    'coaching'
  ];
  const isGeneralQuestion = generalKeywords.some((keyword)=>prompt.toLowerCase().includes(keyword));
  if (isGeneralQuestion && parsed.type !== 'general') {
    console.log(`[LLM ⇢ Override to General]:`, `Question contains general keywords: ${generalKeywords.filter((k)=>prompt.toLowerCase().includes(k)).join(', ')}`);
    parsed.type = 'general';
    // Clear any CRM-specific fields
    delete parsed.action;
    delete parsed.contact;
    delete parsed.contact_id;
    delete parsed.search;
  }
  console.log(`[LLM ⇢ Final Parsed]:`, parsed);
  return parsed;
}
// ---------- MAIN CLASSIFIER FUNCTION ----------
export async function classifyPrompt(prompt, context = {}, openai, conversationHistory = []) {
  return classifyWithLLM(prompt, context, conversationHistory, openai);
}
// ---------- SUMMARIZER ---------- 
export async function summarizeParsed(parsed, apiData, mode = "crm", openai, sys_prompt, extra = {}) {
  let username = await getUserName(parsed.userId);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
You are a CRM data summarizer. 
You **must only use fields present in apiData**. Do not fabricate values.

Mode: ${mode}
Action: ${parsed.action || "N/A"}
Agent Instruction: ${sys_prompt || ""}

Always start the summary with:
**Hi ${username || "there"}, here's your summary of the ${mode}:**

Activity (call log) Rules:
- Derive the date range strictly from apiData, not assumptions.
- If pagination info exists, show: **Page X of Y (showing Z calls of N total)**
- Summarize total counts: incoming, outgoing, missed.
- For each call, show:
  * Type
  * Date
  * Time
  * Phone number
  * Recording → [Recording] if recording_url exists, else No recording available
- Be concise, structured with bullet points.
- After listing API Data Summary, give **Overall Summary** (4-5 sentences).
- Then show: Total counts for this page.
- End with contact info if available.
- If no data, respond: "No results found for the specified criteria."

FOLLOW-UP RULE:
- Always end with exactly one safe GET-only follow-up question.
- The follow-up should be context-aware and must NOT repeat the previous follow-up.

PAGINATION PRIORITY (HIGHEST):
- If apiData.pagination exists AND hasNextPage=true, ALWAYS ask: "You have X total pages. Would you like to see page Y?" (where X is totalPages, Y is next page number)
- If apiData.pagination exists AND hasNextPage=false, mention "This is the last page of X total pages" and suggest different data types

FOLLOW-UP SUGGESTIONS:
- Use dynamic timeframes (7 days, 30 days, 60 days, 90 days) to vary suggestions.
- Previous follow-up (if any): ${extra?.lastFollowUp || "None"}
- If mode = "crm" → suggest broader stats or activity with varying timeframes (e.g., "Would you like to see this contact's activity logs?" or "Do you want to see their contact stats for the last 30 days?")
- If mode = "stats" → suggest different angles with varying timeframes (e.g., "Would you like to see call history for this contact?" or "Do you want a 60-day summary report?")
- If mode = "activity" → 
  * If single page with few results: suggest longer timeframes (e.g., "Would you like to see a 30-day call and SMS report?", "Do you want 90 days of call logs?")
  * If multiple pages: prioritize pagination over timeframe changes
- If mode = "general" → suggest a sales or business related exploration (e.g., "Would you like sales strategy tips ?" or "Do you want to see business performance trends?")
- Never suggest scheduling, creating, posting, or updating anything.
        `
      },
      {
        role: "user",
        content: JSON.stringify({
          parsed,
          apiData
        })
      }
    ]
  });
  const response = completion.choices[0].message?.content?.trim() || "";
  // Extract and save follow-up question
  const followupMatch = response.match(/Would you like.*\?$/i);
  if (followupMatch) {
    extra.nextFollowUp = followupMatch[0];
  }
  return response;
}
// ---------- APPOINTMENT FLOW ----------
export async function handleAppointmentFlow(parsed, context, openai) {
  let username = await getUserName(parsed.userId);
  if (parsed.intent === "create_appointment") {
    return `**Hi ${username || "there"}, appointment creation is not enabled in this system (read-only mode).**`;
  }
  return null;
}
// ---------- CONVERSATION SUMMARY ----------
export async function generateConversationSummary(prompt, response, contactInfo = null, openai) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Create a brief conversation summary (max 200 chars) focusing on the key business context and any contact/company mentioned.`
      },
      {
        role: "user",
        content: `User asked: "${prompt}"\nBot responded: "${response}"\nContact info: ${JSON.stringify(contactInfo)}`
      }
    ]
  });
  return completion.choices[0].message?.content?.trim() || "";
}
