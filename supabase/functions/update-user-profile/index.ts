import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const { 
      userId,
      userName,
      firstName,
      lastName,
      email,
      companyName, 
      role,
      salesDescription,
      profilePhotoUrl
    } = await req.json();

    console.log('Updating profile for user:', userId, {
      userName,
      email,
      companyName,
      role,
      salesDescription
    });

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Map role to allowed values
    const roleMapping = {
      'sales manager': 'sales_management',
      'sales representative': 'salesperson',
      'sales rep': 'salesperson',
      'account executive': 'salesperson',
      'business development': 'salesperson',
      'sales director': 'sales_management',
      'vp sales': 'sales_management',
      'chief executive officer': 'ceo',
      'ceo': 'ceo',
      'founder': 'ceo',
      'recruiter': 'recruiter',
      'hr': 'recruiter'
    };

    const normalizedRole = role ? roleMapping[role.toLowerCase()] || 'salesperson' : 'salesperson';

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update or insert user profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        company_name: companyName,
        role: normalizedRole,
        sales_description: salesDescription,
        profile_photo_url: profilePhotoUrl || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    console.log('Profile updated successfully:', data);

    // Also update conversation history with this information
    const { error: historyError } = await supabase
      .from('conversation_history')
      .upsert({
        user_id: userId,
        agent_id: 'agent_4301k1p4h341eahrqp6v8tr8qqfs',
        user_name: userName,
        user_company: companyName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,agent_id'
      });

    if (historyError) {
      console.warn('Could not update conversation history:', historyError);
      // Don't fail the whole request for this
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Profile updated successfully for ${userName || 'user'}`,
      data: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});