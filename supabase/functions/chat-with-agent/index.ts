// supabase/functions/chat_with_agent/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import OpenAI from "npm:openai";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
// Fallback: Summarize raw data if summary is missing
async function summarizeFallback(parsed, apiData) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
You are a helpful assistant.
The API did not provide a summary. Summarize the following parsed query and raw API data
into a short, clear, human-readable sentence. Mention counts, company names, date ranges,
and completion status if available. If there are no results, say "No records found."
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
  return completion.choices[0].message?.content?.trim() || "";
}
serve(async (req)=>{
  const LOG_PREFIX = "[chat_with_agent]";
  console.log(`${LOG_PREFIX} ⇢ Incoming request`);
  if (req.method === "OPTIONS") {
    console.log(`${LOG_PREFIX} ⇢ CORS preflight`);
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const payload = await req.json();
    console.log(`${LOG_PREFIX} ⇢ Full payload:`, payload);
    const { userId, message, contactId, selectedContact, coachId } = payload || {};
    if (!userId) {
      return jsonResponse({
        success: false,
        response: "Missing userId"
      }, 400);
    }
    if (!message || typeof message !== "string") {
      return jsonResponse({
        success: false,
        response: "Please provide a valid message"
      }, 400);
    }
    // Process message based on provided contact
    let processedMessage = message;
    if (selectedContact) {
      processedMessage = `Show me details for contact ID ${selectedContact.id} (${selectedContact.name} from ${selectedContact.company})`;
    } else if (contactId) {
      processedMessage = `${message} for contact ID ${contactId}`;
    }
    console.log(`${LOG_PREFIX} ⇢ Processed message:`, processedMessage);
    console.log(`${LOG_PREFIX} ⇢ Invoking callproof-api...`);
    // Note: Session and message management is handled by the frontend session manager
    // This function only processes requests and returns responses
    const { data, error } = await supabase.functions.invoke("callproof-api", {
      body: {
        userId,
        prompt: processedMessage,
        coachId
      },
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey
      }
    });
    if (error) {
      let errorMessage = "Unable to process your request. Please try again.";
      if (error.message?.includes("disabled")) {
        errorMessage = "CallProof integration is not enabled for your account.";
      } else if (error.message?.includes("credentials")) {
        errorMessage = "CallProof API credentials are not configured.";
      } else if (error.message?.includes("404")) {
        errorMessage = "Profile not found. Please ensure you're logged in correctly.";
      }
      return jsonResponse({
        success: false,
        response: errorMessage
      }, 200);
    }
    if (!data) {
      return jsonResponse({
        success: false,
        response: "No data received from CallProof API"
      });
    }
    // Use provided summary or fallback to generated one
    let responseText = data.summary || "";
    if (!responseText) {
      console.log(`${LOG_PREFIX} ⇢ No summary from callproof-api, generating fallback...`);
      responseText = await summarizeFallback(data.parsed, data.data);
    }
    // Add multiple contact candidates if available
    const hasMultipleCandidates = data.candidates && data.candidates.length > 1;
    if (hasMultipleCandidates) {
      responseText += "\n\nI found multiple contacts. Please select one:";
      data.candidates.forEach((c)=>{
        responseText += `\n${c.number}. ${c.name} - ${c.company}`;
        if (c.email) responseText += ` (${c.email})`;
      });
    }
    return jsonResponse({
      success: true,
      response: responseText,
      candidates: data.candidates || null,
      intent: data.intent,
      endpoint: data.endpoint,
      hasRawData: !!data.data,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error(`${LOG_PREFIX} ⇢ Exception:`, e);
    return jsonResponse({
      success: false,
      response: "An unexpected error occurred while processing your request."
    }, 500);
  }
});
