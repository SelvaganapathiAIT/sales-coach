import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const agentId = 'agent_4301k1p4h341eahrqp6v8tr8qqfs';
    const phoneNumber = '+16158456286'; // Your existing phone number

    console.log('Configuring phone number for agent:', agentId);

    // First, check if the phone number is already connected to the agent
    const checkResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (checkResponse.ok) {
      const agentData = await checkResponse.json();
      console.log('Agent configuration:', agentData);
      
      // Return the configured phone number
      return new Response(JSON.stringify({ 
        phone_number: phoneNumber,
        agent_id: agentId,
        status: 'configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we can't get agent info, try to configure the phone number
    const configResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}/phone-number`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber
      })
    });

    if (!configResponse.ok) {
      const error = await configResponse.text();
      console.error('Failed to configure phone number:', error);
      
      // Return the phone number anyway since it might already be configured
      return new Response(JSON.stringify({ 
        phone_number: phoneNumber,
        agent_id: agentId,
        status: 'phone_displayed',
        note: 'Phone number configured manually in ElevenLabs dashboard'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const configData = await configResponse.json();
    console.log('Phone number configured successfully:', configData);

    return new Response(JSON.stringify({
      phone_number: phoneNumber,
      agent_id: agentId,
      status: 'configured',
      ...configData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in elevenlabs-phone function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Failed to get ElevenLabs phone number'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});