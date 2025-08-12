import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      throw new Error('Supabase environment variables not configured');
    }

    const { 
      userId,
      agentId,
      conversationSummary,
      keyInsights,
      userName,
      userCompany,
      userGoals,
      userChallenges,
      lastTopics
    } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use upsert to handle both create and update cases
    const { error } = await supabase
      .from('conversation_history')
      .upsert({
        user_id: userId,
        agent_id: agentId,
        conversation_summary: conversationSummary,
        key_insights: keyInsights,
        user_name: userName,
        user_company: userCompany,
        user_goals: userGoals,
        user_challenges: userChallenges,
        last_topics: lastTopics,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error upserting conversation summary:', error);
      throw error;
    }

    console.log('Conversation history saved for user:', userId);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Conversation summary stored successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error storing conversation summary:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});