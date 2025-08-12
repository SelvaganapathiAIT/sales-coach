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

    const body = await req.json().catch(() => ({}));
    const { coach_id, email, first_name, last_name } = body as { coach_id?: string; email?: string; first_name?: string; last_name?: string };

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identify requester
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const requesterId = userData.user.id;

    // If coach_id provided, verify requester is owner or admin
    if (coach_id) {
      const { data: coach, error: coachErr } = await supabaseAdmin
        .from('coaches')
        .select('id, owner_user_id')
        .eq('id', coach_id)
        .maybeSingle();
      if (coachErr || !coach) {
        return new Response(JSON.stringify({ error: 'Coach not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (coach.owner_user_id !== requesterId) {
        // Check admin role fallback
        const { data: isAdmin, error: roleErr } = await supabaseUser.rpc('has_role', { _user_id: requesterId, _role: 'admin' });
        if (roleErr || !isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    } else {
      // If no coach specified, require global admin
      const { data: isAdmin, error: roleErr } = await supabaseUser.rpc('has_role', { _user_id: requesterId, _role: 'admin' });
      if (roleErr || !isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: coach_id required unless admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Try inviting the user (sends email)
    let newUserId: string | null = null;
    const redirectUrl = `${new URL(req.url).origin}/`;

    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { first_name, last_name }, redirectTo: redirectUrl } as any).catch(() => null);
    if (inviteRes && (inviteRes as any).user) {
      newUserId = (inviteRes as any).user.id;
    } else {
      // Fallback: create user without invite
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({ email, user_metadata: { first_name, last_name } });
      if (createErr || !created?.user) {
        return new Response(JSON.stringify({ error: createErr?.message || 'Failed to create user' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      newUserId = created.user.id;
    }

    // Upsert profile
    const { error: pErr } = await supabaseAdmin
      .from('profiles')
      .upsert({ user_id: newUserId, email, first_name: first_name ?? null, last_name: last_name ?? null, is_active: true });
    if (pErr) {
      console.error('Profile upsert error', pErr);
    }

    // Assign to coach if provided
    if (coach_id && newUserId) {
      const { error: linkErr } = await supabaseAdmin.from('coach_users').insert({ coach_id, user_id: newUserId });
      if (linkErr && !linkErr.message.includes('duplicate key')) {
        console.error('coach_users insert error', linkErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('coach-invite-user error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

Deno.serve(handler);
