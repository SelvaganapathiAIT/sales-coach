import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const ZOHO_BASE_URL = "https://www.zohoapis.com/crm/v2";
const LOG_PREFIX = "[Zoho Edge]";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, endpoint, method = "GET", params = {}, body } = await req.json();

    if (!userId || !endpoint) {
      return jsonResponse({ error: "Missing required parameters: userId and endpoint" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('zoho_enabled, zoho_access_token, zoho_org_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error(LOG_PREFIX, 'Profile fetch error:', profileError);
      return jsonResponse({ error: 'Error fetching profile' }, 500);
    }

    if (!profile || !profile.zoho_enabled || !profile.zoho_access_token) {
      return jsonResponse({
        error: 'Zoho not connected',
        message: 'Please connect Zoho in settings to use this feature.'
      }, 400);
    }

    const result = await callZohoAPI(endpoint, profile.zoho_access_token, method, params, body, profile.zoho_org_id);
    return jsonResponse(result, 200);
  } catch (error) {
    console.error(LOG_PREFIX, 'Fatal error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

async function callZohoAPI(
  endpoint: string,
  accessToken: string,
  method = 'GET',
  params = {},
  body?: any,
  orgId?: string
) {
  // Map simplified endpoints to Zoho API routes
  const route = mapEndpointToZohoRoute(endpoint);
  const url = new URL(`${ZOHO_BASE_URL}/${route}`);

  if (method === 'GET') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Zoho-oauthtoken ${accessToken}`
  };
  if (orgId) headers['X-com-zoho-subscriptions-organizationid'] = String(orgId);

  const requestInit: RequestInit = { method, headers };
  if (method !== 'GET') {
    requestInit.body = JSON.stringify(body || {});
  }

  const response = await fetch(url.toString(), requestInit);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Zoho API error: ${response.status} ${response.statusText} ${text}`);
  }

  return {
    success: true,
    data: JSON.parse(text),
    endpoint,
    method,
    timestamp: new Date().toISOString()
  };
}

function mapEndpointToZohoRoute(endpoint: string): string {
  switch (endpoint) {
    case 'contacts':
      return 'Contacts';
    case 'contacts/search':
      return 'Contacts/search';
    case 'deals':
      return 'Deals';
    case 'tasks':
      return 'Tasks';
    case 'accounts':
    case 'companies':
      return 'Accounts';
    default:
      return endpoint; // Allow raw pass-through for advanced usage
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}


