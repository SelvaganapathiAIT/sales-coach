// /supabase/functions/callproof-api/context.ts
// Context helpers for conversation management
export function packTopics(ctx) {
  const arr = [];
  if (ctx.contactId) arr.push(`contact_id:${ctx.contactId}`);
  if (ctx.phoneId) arr.push(`phone_id:${ctx.phoneId}`);
  if (ctx.company_name) arr.push(`company_name:${ctx.company_name}`);
  if (ctx.lastFollowUp) arr.push(`lastFollowUp:${ctx.lastFollowUp}`);
  if (ctx.nextFollowUp) arr.push(`nextFollowUp:${ctx.nextFollowUp}`);
  return arr.length ? arr : null;
}
export function unpackTopics(arr) {
  const out = {};
  if (!Array.isArray(arr)) return out;
  for (const s of arr){
    if (typeof s !== "string") continue;
    if (s.startsWith("contact_id:")) out.contactId = s.replace("contact_id:", "");
    if (s.startsWith("phone_id:")) out.phoneId = s.replace("phone_id:", "");
    if (s.startsWith("company_name:")) out.company_name = s.replace("company_name:", "");
    if (s.startsWith("nextFollowUp:")) out.nextFollowUp = s.replace("nextFollowUp:", "");
    if (s.startsWith("lastFollowUp:")) out.lastFollowUp = s.replace("lastFollowUp:", "");
  }
  return out;
}
// Pre-classification logic from instruction document
export function preClassify(prompt) {
  const p = prompt.toLowerCase();
  // Contact/Lead/Account searches
  if (p.includes("lead") || p.includes("account") || p.includes("contact") || p.includes("contact list") || p.includes("company")) {
    return "contact_search";
  }
  // Tasks and follow-ups
  if (p.includes("task") || p.includes("followup") || p.includes("follow-up")) {
    return "tasks";
  }
  // Opportunities
  if (p.includes("opportunit")) return "opportunities";
  // Appointments and meetings
  if (p.includes("appointment") || p.includes("meeting")) return "appointments";
  // Event forms
  if (p.includes("event form") || p.includes("eventform")) return "eventform";
  // Notes
  if (p.includes("note")) return "notes";
  // Activity patterns for calls and messages
  if (p.includes("call") && (p.includes("log") || p.includes("history") || p.includes("detail") || p.includes("activity"))) return "activity";
  if (p.includes("message") && (p.includes("history") || p.includes("conversation"))) return "activity";
  if (p.includes("sms") || p.includes("text")) return "activity";
  if (p.includes("activity") && (p.includes("recent") || p.includes("call") || p.includes("message"))) return "activity";
  return null;
}
