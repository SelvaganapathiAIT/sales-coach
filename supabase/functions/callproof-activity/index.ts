import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityRequest {
  userId: string;
  limit?: number; // default 10
  days?: number; // default 7
}

const safeDate = (value: any) => {
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, limit = 10, days = 7 } = (await req.json()) as ActivityRequest;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get CallProof credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('callproof_enabled, callproof_api_key, callproof_api_secret, email, first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.callproof_enabled || !profile.callproof_api_key || !profile.callproof_api_secret) {
      return new Response(JSON.stringify({
        error: 'CallProof not connected',
        message: 'Please connect CallProof in settings to view activity.'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = profile.callproof_api_key as string;
    const apiSecret = profile.callproof_api_secret as string;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const withQS = (url: string, params: Record<string, string>) => {
      const u = new URL(url);
      Object.entries(params).forEach(([k, v]) => u.searchParams.append(k, v));
      return u.toString();
    };

    const fetchJSON = async (url: string) => {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SalesCoach/1.0'
        }
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn('CallProof API non-OK', res.status, res.statusText, text);
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return await res.json();
    };

    // Fetch recent calls
    let calls: any[] = [];
    try {
      const callsUrl = withQS('https://app.callproof.com/api/calls', {
        key: apiKey,
        secret: apiSecret,
      });
      const callsData = await fetchJSON(callsUrl);
      const list = Array.isArray(callsData?.data) ? callsData.data : (Array.isArray(callsData?.results) ? callsData.results : []);
      // Sort by date desc when available, then limit
      calls = list
        .map((c: any) => ({ ...c, _dt: safeDate(c.created_at || c.timestamp || c.date || c.time) }))
        .sort((a: any, b: any) => (b._dt?.getTime?.() || 0) - (a._dt?.getTime?.() || 0))
        .filter((c: any) => {
          if (!c._dt) return true; // keep if unknown date
          return c._dt >= sinceDate;
        })
        .slice(0, limit)
        .map(({ _dt, ...rest }: any) => rest);
    } catch (e) {
      console.error('Error fetching calls:', e);
      calls = [];
    }

    // Try to fetch appointments (best-effort; endpoint may vary)
    let appointments: any[] = [];
    try {
      const apptUrl = withQS('https://app.callproof.com/api/appointments', { key: apiKey, secret: apiSecret });
      const apptData = await fetchJSON(apptUrl);
      const list = Array.isArray(apptData?.data) ? apptData.data : (Array.isArray(apptData?.results) ? apptData.results : []);
      appointments = list
        .map((c: any) => ({ ...c, _dt: safeDate(c.created_at || c.start_time || c.date) }))
        .sort((a: any, b: any) => (b._dt?.getTime?.() || 0) - (a._dt?.getTime?.() || 0))
        .filter((c: any) => !c._dt || c._dt >= sinceDate)
        .slice(0, limit)
        .map(({ _dt, ...rest }: any) => rest);
    } catch (e) {
      console.warn('Appointments endpoint not available:', e?.message || e);
      // Derive from calls if possible
      appointments = calls.filter((c: any) => {
        const t = (c.type || c.purpose || '').toString().toLowerCase();
        return t.includes('appointment') || t.includes('meeting');
      }).slice(0, Math.min(5, limit));
    }

    // Try to fetch emails (best-effort)
    let emails: any[] = [];
    try {
      const emailsUrl = withQS('https://app.callproof.com/api/emails', { key: apiKey, secret: apiSecret });
      const emailsData = await fetchJSON(emailsUrl);
      const list = Array.isArray(emailsData?.data) ? emailsData.data : (Array.isArray(emailsData?.results) ? emailsData.results : []);
      emails = list
        .map((e: any) => ({ ...e, _dt: safeDate(e.created_at || e.sent_at || e.date) }))
        .sort((a: any, b: any) => (b._dt?.getTime?.() || 0) - (a._dt?.getTime?.() || 0))
        .filter((e: any) => !e._dt || e._dt >= sinceDate)
        .slice(0, limit)
        .map(({ _dt, ...rest }: any) => rest);
    } catch (e) {
      console.warn('Emails endpoint not available:', e?.message || e);
      emails = [];
    }

    const summarize = () => {
      const fmt = (items: any[], label: string) => {
        if (!items.length) return `• No recent ${label}.`;
        const lines = items.map((it: any) => {
          const who = it.contact_name || it.person || it.name || `${it.first_name || ''} ${it.last_name || ''}`.trim();
          const company = it.company || it.company_name || '';
          const when = it.created_at || it.timestamp || it.date || it.time || '';
          const outcome = it.outcome || it.result || it.subject || it.purpose || '';
          return `• ${who || 'Unknown'}${company ? ' @ ' + company : ''}${when ? ' — ' + when : ''}${outcome ? ' — ' + outcome : ''}`;
        });
        return lines.slice(0, Math.min(10, items.length)).join('\n');
      };

      return [
        `Here are your latest CallProof activities (past ${days} days):`,
        '',
        'Calls:',
        fmt(calls, 'calls'),
        '',
        'Appointments:',
        fmt(appointments, 'appointments'),
        '',
        'Emails:',
        fmt(emails, 'emails')
      ].join('\n');
    };

    const payload = {
      summary: summarize(),
      calls,
      appointments,
      emails,
      days,
      limit,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('callproof-activity error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
