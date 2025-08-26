// /supabase/functions/callproof-api/utils.ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
export function mask(val) {
  if (!val) return "";
  const s = String(val);
  if (s.length <= 6) return "***";
  return `${s.slice(0, 4)}…${s.slice(-2)}`;
}
export function extractContactId(record) {
  if (!record || typeof record !== "object") return null;
  const v = record.id ?? record.contact_id ?? record.contactId ?? record.ContactId ?? null;
  return v != null ? String(v) : null;
}
export function normalizeCompletedForAppointments(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const n = Number(value);
  if (!Number.isNaN(n)) return n === 1;
  const s = String(value).toLowerCase();
  if ([
    "true",
    "yes",
    "completed"
  ].includes(s)) return true;
  if ([
    "false",
    "no",
    "notcompleted",
    "not_completed"
  ].includes(s)) return false;
  return undefined;
}
export function buildAuthHeaders(apiKey, apiSecret) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "API-KEY": apiKey,
    "API-SECRET": apiSecret
  };
}
export function safeDate(value) {
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch  {
    return null;
  }
}
export function fmtYYYYMMDD(d) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function ymdToDMY(yyyyDash) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyDash)) return yyyyDash;
  const [y, m, d] = yyyyDash.split("-");
  return `${d}-${m}-${y}`;
}
