// Admin-only function: returns all auth users merged with profiles and roles
// Includes is_active flag from profiles and is_admin from user_roles

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const accessToken = authHeader.replace('Bearer ', '');
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify requester and role
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const requesterId = userData.user.id;
    const { data: isAdmin, error: roleErr } = await supabaseUser.rpc('has_role', { _user_id: requesterId, _role: 'admin' });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pagination (optional)
    const { limit = 1000, page = 1 } = await req.json().catch(() => ({}));

    const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: Math.min(limit, 1000), page });
    if (listErr) throw listErr;

    const users = usersList?.users || [];
    const ids = users.map(u => u.id);

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabaseAdmin.from('profiles').select('user_id, first_name, last_name, email, role, is_active').in('user_id', ids),
      supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', ids),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;

    const profileByUser = new Map((profiles || []).map(p => [p.user_id, p]));
    const adminSet = new Set((roles || []).filter(r => r.role === 'admin').map(r => r.user_id));

    const merged = users.map(u => {
      const p = profileByUser.get(u.id);
      return {
        user_id: u.id,
        email: u.email,
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        profile_role: p?.role ?? null,
        is_active: p?.is_active ?? true,
        is_admin: adminSet.has(u.id),
        created_at: u.created_at,
      };
    }).sort((a, b) => (a.created_at && b.created_at ? (a.created_at < b.created_at ? 1 : -1) : 0));

    return new Response(JSON.stringify(merged), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-list-users error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

Deno.serve(handler);
