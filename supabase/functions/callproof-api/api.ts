// /supabase/functions/callproof-api/api.ts
const API_BASE = Deno.env.get("API_BASE_URL");
const LOG_PREFIX = "[callproof-api]";
export async function accountListSearch(headers, payload) {
  console.log(`${LOG_PREFIX} ⇢ Account-list payload:`, payload);
  const res = await fetch(`${API_BASE}/ai/salescoach/account-list`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  console.log(`${LOG_PREFIX} ⇢ Account-list status:`, res.status);
  const data = await res.json().catch(()=>({}));
  console.log(`${LOG_PREFIX} ⇢ Account-list response:`, data);
  return data;
}
export function buildAccountListBody(parsed, forceNameSearch = false, defaultLimit = 25) {
  const body = {};
  // Build search term based on parsed data
  body.search = parsed?.search ?? parsed?.name ?? parsed?.contact ?? parsed?.company ?? (!forceNameSearch ? parsed?.city ?? parsed?.state ?? parsed?.country ?? parsed?.county ?? parsed?.zip ?? parsed?.street ?? "" : "");
  // Set default search fields for contact search (CompanyName, FirstName, LastName)
  body.select_search_fields = parsed?.select_search_fields || "1,2,3";
  body.limit = parsed?.limit ?? defaultLimit;
  // Add optional parameters from instruction document
  const optionalKeys = [
    "contact_id",
    "latitude",
    "longitude",
    "parent_company",
    "annual_sales",
    "employee_count",
    "county",
    "label",
    "contact_type",
    "sort_contacts",
    "custom_field_params",
    "only_my_assigned_contact",
    "last_contacted",
    "begin_date",
    "end_date",
    "city",
    "state",
    "country",
    "zip",
    "street",
    "region"
  ];
  for (const key of optionalKeys){
    if (parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== "") {
      body[key] = parsed[key];
    }
  }
  return body;
}
// Handle contact resolution with context
export async function resolveContactId(parsed, apiHeaders, lastContext = {}, prompt = "") {
  console.log(`${LOG_PREFIX} ⇢ Resolving contact ID`);
  console.log(`${LOG_PREFIX} ⇢ Parsed:`, parsed);
  console.log(`${LOG_PREFIX} ⇢ Last context:`, lastContext);
  // Normalize search string
  let search = parsed?.search?.trim() || parsed?.contact?.trim() || parsed?.name?.trim() || parsed?.company?.trim();
  // Fall back to context company name if nothing provided
  if (!search) {
    search = lastContext.company_name || "";
  }
  // Expanded regex: matches "this/that/my/current contact|account|lead|company"
  const refersThisContact = /\b(this|that|my|current)[\s-]+(contact|account|lead|company)\b/i.test(prompt);
  if (refersThisContact && lastContext.contactId) {
    console.log(`${LOG_PREFIX} ⇢ Using context contact_id=${lastContext.contactId}`);
    return lastContext.contactId;
  } else {
    console.log(`${LOG_PREFIX} ⇢ Search:`, search);
    console.log(`${LOG_PREFIX} ⇢ refersThisContact:`, refersThisContact);
    console.log(`${LOG_PREFIX} ⇢ prompt:`, prompt);
  }
  // Otherwise, no "this contact" phrase → must resolve via API
  if (!search) {
    console.log(`${LOG_PREFIX} ⇢ No search term provided`);
    return null;
  }
  // Call CRM API resolver
  const result = await resolveContactAndPhoneId(apiHeaders, search, lastContext);
  return result.contactId;
}
// Handle contact resolution with phone ID for messages
export async function resolveContactAndPhoneId(headers, search, lastContext = {}) {
  console.log(`${LOG_PREFIX} ⇢ Resolving contact & phone ID for search:`, search);
  // If search is "this contact" and we have context, use it directly
  if (/\b(this|that)\s+(contact|account|lead|company)\b/i.test(search) && lastContext.contactId) {
    console.log(`${LOG_PREFIX} ⇢ Using context contact_id=${lastContext.contactId}`);
    return {
      contactId: lastContext.contactId,
      phoneId: lastContext.phoneId || null,
      companyName: lastContext.company_name || null,
      raw: {
        used_context: true
      }
    };
  }
  // Search for contact using account-list API
  let data = await accountListSearch(headers, {
    search,
    select_search_fields: "1,2,3",
    limit: 1
  });
  // Handle 400 retry pattern as per instruction document
  if (data?.clientStatusCode === 400 && Array.isArray(data?.search_field) && data.search_field.length > 0) {
    const firstContactId = data.search_field[0]?.contact_id;
    if (firstContactId) {
      console.log(`${LOG_PREFIX} ⇢ Retrying account-list with contact_id=${firstContactId}`);
      const retryData = await accountListSearch(headers, {
        contact_id: firstContactId
      });
      data = retryData;
    }
  }
  // Extract contact information from response
  const first = Array.isArray(data) ? data[0] : Array.isArray(data?.data) ? data.data[0] : data?.data ?? data ?? {};
  const contactId = first?.contact_id ?? first?.id ?? null;
  const phoneId = first?.phone_id ?? first?.contact_phone_id ?? null;
  const companyName = first?.company_name ?? first?.CompanyName ?? null;
  console.log(`${LOG_PREFIX} ⇢ Resolved contactId=${contactId}, phoneId=${phoneId}, company=${companyName}`);
  return {
    contactId,
    phoneId,
    companyName,
    raw: data
  };
}
