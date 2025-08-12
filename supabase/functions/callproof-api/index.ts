// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CallProofEndpoint =
  | "contacts"
  | "contacts.find"
  | "calls"
  | "appointments"
  | "emails"
  | "reps.stats";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type CallProofRequest = {
  userId: string;
  // Back-compat alias support
  endpoint?: CallProofEndpoint;
  // Generic fields for arbitrary endpoints
  endpointPath?: string; // e.g. 'contact_note/new/' (relative to https://app.callproof.com/api/)
  method?: HttpMethod; // default GET
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: Record<string, unknown>;
  required?: string[]; // explicit required fields across params+body
  requireOneOf?: string[]; // at least one of these must be present
  limit?: number; // optional trim for array results
};

const endpointToPath: Record<CallProofEndpoint, string> = {
  contacts: "contacts",
  "contacts.find": "contacts/find/",
  calls: "calls",
  appointments: "appointments",
  emails: "emails",
  "reps.stats": "reps/stats",
};

const allowedParamsByEndpoint: Record<CallProofEndpoint, Set<string>> = {
  contacts: new Set<string>([]),
  "contacts.find": new Set<string>(["query"]),
  calls: new Set<string>(["rep_email", "contact_id", "limit"]),
  appointments: new Set<string>([]),
  emails: new Set<string>([]),
  "reps.stats": new Set<string>([]),
};

type ValidatorRule = {
  pattern: RegExp; // matches endpointPath
  requiresAll?: string[];
  requiresOneOf?: string[];
  methods?: HttpMethod[]; // optional restriction
};

// Best-effort validation rules for common endpoints
const validatorRules: ValidatorRule[] = [
  { pattern: /^calls\/?$/, requiresOneOf: ["rep_email", "contact_id"], methods: ["GET"] },
  { pattern: /^contact\/update\/?$/, requiresAll: ["contact_id"], methods: ["POST", "PUT", "PATCH"] },
  { pattern: /^call\/create\/?$/, requiresAll: ["contact_id"], methods: ["POST"] },
  { pattern: /^contact_note\/new\/?$/, requiresAll: ["contact_id", "note"], methods: ["POST"] },
];

function findRule(path: string, method: HttpMethod): ValidatorRule | undefined {
  return validatorRules.find((r) => r.pattern.test(path) && (!r.methods || r.methods.includes(method)));
}

function validateRequired(
  path: string,
  method: HttpMethod,
  combined: Record<string, unknown>,
  explicitAll?: string[],
  explicitOneOf?: string[],
) {
  const rule = findRule(path, method);
  const requiresAll = explicitAll && explicitAll.length ? explicitAll : rule?.requiresAll || [];
  const requiresOneOf = explicitOneOf && explicitOneOf.length ? explicitOneOf : rule?.requiresOneOf || [];

  const missingAll: string[] = [];
  for (const key of requiresAll) {
    const val = combined[key];
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      missingAll.push(key);
    }
  }
  if (missingAll.length) {
    return { ok: false, message: `${missingAll.join(", ")} ${missingAll.length > 1 ? "are" : "is"} required` };
  }

  if (requiresOneOf.length) {
    const found = requiresOneOf.some((k) => {
      const val = combined[k];
      return !(val === undefined || val === null || (typeof val === "string" && val.trim() === ""));
    });
    if (!found) {
      return { ok: false, message: `${requiresOneOf.join(" or ")} is required` };
    }
  }

  return { ok: true };
}

function buildUrl(base: string, queryParams: Record<string, string>) {
  const url = new URL(base);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

async function fetchJsonStrict(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SalesCoach/1.0",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("CallProof API non-OK", res.status, res.statusText, text);
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return await res.json();
}

function normalizeListLike(json: any): any[] | null {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      userId,
      endpoint,
      endpointPath,
      method = "GET",
      params = {},
      body,
      required: explicitRequired,
      requireOneOf: explicitOneOf,
      limit,
    } = (await req.json()) as CallProofRequest;

    if (!userId || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve path from alias or provided endpointPath
    let resolvedPath: string | undefined = endpointPath;
    if (!resolvedPath && endpoint) {
      if (!(endpoint in endpointToPath)) {
        return new Response(
          JSON.stringify({ error: `Unsupported endpoint: ${endpoint}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      resolvedPath = endpointToPath[endpoint];
    }
    if (!resolvedPath) {
      return new Response(
        JSON.stringify({ error: "Missing endpointPath (or valid endpoint alias)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "callproof_enabled, callproof_api_key, callproof_api_secret, email, first_name, last_name"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.callproof_enabled || !profile.callproof_api_key || !profile.callproof_api_secret) {
      return new Response(
        JSON.stringify({
          error: "CallProof not connected",
          message: "Please connect CallProof in settings to use this API.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = String(profile.callproof_api_key);
    const apiSecret = String(profile.callproof_api_secret);

    const baseUrl = `https://app.callproof.com/api/${resolvedPath}`;

    // For known aliases, restrict params; otherwise pass through
    let filteredParams: Record<string, string> = {};
    if (endpoint) {
      const allowedParams = allowedParamsByEndpoint[endpoint];
      for (const [k, v] of Object.entries(params)) {
        if (!allowedParams.has(k)) continue;
        if (v === undefined || v === null) continue;
        filteredParams[k] = String(v);
      }
    } else {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        filteredParams[k] = String(v);
      }
    }

    // Validate requirements (explicit or rule-based)
    const combinedForValidation: Record<string, unknown> = {
      ...filteredParams,
      ...(body || {}),
    };
    const validation = validateRequired(
      resolvedPath.replace(/^\//, "").replace(/^api\//, ""),
      method,
      combinedForValidation,
      explicitRequired,
      explicitOneOf,
    );
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build URL with legacy credentials
    const url = buildUrl(baseUrl, {
      key: apiKey,
      secret: apiSecret,
      ...filteredParams,
    });

    const upstream = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SalesCoach/1.0",
      },
      body: method === "GET" ? undefined : body ? JSON.stringify(body) : undefined,
    });

    const contentType = upstream.headers.get("content-type") || "";
    const raw = contentType.includes("application/json") ? await upstream.json() : await upstream.text();
    if (!upstream.ok) {
      const errorText = typeof raw === "string" ? raw : JSON.stringify(raw);
      console.warn("CallProof API non-OK", upstream.status, upstream.statusText, errorText);
      return new Response(
        JSON.stringify({ error: `${upstream.status} ${upstream.statusText}`, details: raw }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const list = typeof raw === "object" && raw !== null ? normalizeListLike(raw) : null;
    const trimmed =
      Array.isArray(list) && Number.isFinite(limit as any) && (limit as any) > 0
        ? list.slice(0, Math.min(Number(limit), list.length))
        : list ?? undefined;

    return new Response(
      JSON.stringify({
        path: resolvedPath,
        method,
        params: filteredParams,
        body: method === "GET" ? undefined : body || undefined,
        list: trimmed,
        total: Array.isArray(list) ? list.length : undefined,
        returned: Array.isArray(trimmed) ? trimmed.length : undefined,
        raw,
        source: "CallProof",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("callproof-api error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
