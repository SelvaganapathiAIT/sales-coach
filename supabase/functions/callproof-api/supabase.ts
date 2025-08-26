// /supabase/functions/callproof-api/supabase.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
const LOG_PREFIX = "[callproof-api|supabase]";
export async function getProfileAndClient(userId) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, key);
  const { data: profile, error } = await supabase.from("profiles").select("callproof_enabled, callproof_api_key, callproof_api_secret, first_name, last_name, company_name").eq("user_id", userId).maybeSingle();
  return {
    supabase,
    profile,
    error
  };
}
export async function fetchLastConversation(supabase, userId) {
  const { data, error } = await supabase.from("conversation_history").select("id, last_topics").eq("user_id", userId).order("created_at", {
    ascending: false
  }).limit(1).maybeSingle();
  if (error) {
    console.warn(`${LOG_PREFIX} ⇢ last conversation fetch error:`, error);
    return null;
  }
  return data;
}
export async function insertConversation(supabase, payload) {
  const { error } = await supabase.from("conversation_history").insert({
    user_id: payload.user_id,
    agent_id: payload.agent_id || 'callproof-api',
    conversation_summary: payload.conversation_summary,
    key_insights: payload.key_insights,
    user_name: payload.user_name ?? null,
    user_company: payload.user_company ?? null,
    user_goals: payload.user_goals ?? null,
    user_challenges: payload.user_challenges ?? null,
    last_topics: payload.last_topics ?? null
  });
  if (error) {
    console.warn(`${LOG_PREFIX} ⇢ conversation insert error:`, error);
  } else {
    console.log(`${LOG_PREFIX} ⇢ conversation saved`);
  }
}
export async function fetchCoachDetails(supabase, coachId) {
  const { data, error } = await supabase.from("coaches").select(`
      id,
      name,
      email,
      description,
      avatar_url,
      is_draft,
      created_at,
      updated_at,
      coach_assistants:coach_assistants!coach_assistants_coach_id_fkey (
        system_prompt,
        first_message,
        llm_model,
        temperature,
        agent_language,
        performance_standard,
        intensity_level,
        coaching_style,
        roasting_level,
        permissions,
        is_public,
        phone,
        linkedin_url,
        allowed_emails,
        enable_crm,
        enable_calendar,
        enable_email,
        enable_transfer_agent,
        enable_transfer_number,
        enable_voicemail_detection,
        enable_tracking,
        enable_detect_language,
        enable_end_call,
        enable_skip_turn,
        enable_keypad_tone
      )
    `).eq("id", coachId.trim()).maybeSingle();
  if (error) {
    console.warn(`${LOG_PREFIX} ⇢ fetch Coach Details fetch error:`, error);
    return null;
  }
  return data;
}
export async function fetchSystemPrompt(supabase, coachId) {
  const { data, error } = await supabase.from("coach_assistants").select("system_prompt").eq("coach_id", coachId).maybeSingle();
  if (error) {
    console.warn("[fetchSystemPrompt] Error:", error);
    return null;
  }
  return data?.system_prompt ?? null;
} // DEPRECATED: Session and message creation moved to frontend session manager
 // These functions are no longer used in the backend to prevent duplicate session creation
 /*
export async function createConversationSession(supabase, userId, coachPersonality = 'default') {
  try {
    // First, check if there's an active session
    const { data: existingSession } = await supabase.from("conversation_sessions").select("id").eq("user_id", userId).is("ended_at", null).order("started_at", {
      ascending: false
    }).limit(1).single();
    if (existingSession?.id) {
      return existingSession;
    }
    // Create new session if none exists
    const { data, error } = await supabase.from("conversation_sessions").insert({
      user_id: userId,
      coach_personality: coachPersonality,
      session_title: 'New Coaching Session',
      started_at: new Date().toISOString()
    }).select().single();
    if (error) {
      console.warn(`${LOG_PREFIX} ⇢ session creation error:`, error);
      return null;
    }
    return data;
  } catch (error) {
    console.warn(`${LOG_PREFIX} ⇢ session creation/fetch error:`, error);
    return null;
  }
}
export async function insertConversationMessage(supabase, sessionId, role, content, messageType = 'text', metadata = {}) {
  if (!sessionId) {
    console.warn(`${LOG_PREFIX} ⇢ Cannot insert message: missing sessionId`);
    return false;
  }
  try {
    const { error } = await supabase.from("conversation_messages").insert({
      session_id: sessionId,
      role: role,
      content: content,
      message_type: messageType,
      metadata: metadata,
      timestamp: new Date().toISOString()
    });
    if (error) {
      console.warn(`${LOG_PREFIX} ⇢ message insert error:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`${LOG_PREFIX} ⇢ message insert error:`, error);
    return false;
  }
}
*/ 
