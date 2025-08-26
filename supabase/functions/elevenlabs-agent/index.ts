import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
function getValidLLMModel(assistantModel) {
  const modelMapping = {
    'gpt-4.1-2025-04-14': 'gpt-4.1-2025-04-14',
    'gpt-4o': 'gpt-4o',
    'gpt-5': 'gpt-5',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
    'claude-3-5-sonnet': 'claude-3-5-sonnet',
    'claude-sonnet-4@20250514': 'claude-sonnet-4@20250514',
    'gemini-2.0-flash-001': 'gemini-2.0-flash-001'
  };
  const mapped = modelMapping[assistantModel] || 'gemini-2.0-flash-001';
  console.log(`Mapping LLM model: ${assistantModel} → ${mapped}`);
  return mapped;
}
function getTemperatureValue(assistantData) {
  if (assistantData?.temperature !== undefined && assistantData?.temperature !== null) {
    const temp = parseFloat(assistantData.temperature);
    console.log(`Using custom temperature: ${temp}`);
    return Math.max(0, Math.min(1, temp));
  }
  if (assistantData?.temperature_preset) {
    const presetMap = {
      'deterministic': 0.1,
      'creative': 0.7,
      'more_creative': 0.9
    };
    const temp = presetMap[assistantData.temperature_preset] || 0.7;
    console.log(`Using temperature preset '${assistantData.temperature_preset}': ${temp}`);
    return temp;
  }
  console.log('Using default temperature: 0.7');
  return 0.7;
}
async function createElevenLabsAgent(coachData, assistantData) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  console.log("Creating new ElevenLabs agent for coach:", coachData.name);
  const promptText = assistantData?.system_prompt || `You are ${coachData.name}, an experienced sales coach. ${coachData.description ? "Background: " + coachData.description : ""}`;
  const agentConfig = {
    name: `${coachData.name} - Sales Coach`,
    tags: [
      "Sales Coach AI"
    ],
    conversation_config: {
      agent: {
        first_message: assistantData?.first_message || `Hello! I'm ${coachData.name}, your sales coach.`,
        prompt: {
          prompt: promptText,
          llm: getValidLLMModel(assistantData?.llm_model),
          temperature: getTemperatureValue(assistantData)
        }
      },
      tts: {
        voice_id: assistantData?.voice_id || "cjVigY5qzO86Huf0OWal",
        model_id: "eleven_flash_v2",
        agent_output_audio_format: "pcm_16000"
      },
      asr: {
        quality: "high",
        provider: "elevenlabs"
      },
      turn: {
        mode: "turn"
      }
    },
    platform_settings: {
      widget: {
        avatar: {
          type: "url",
          custom_url: coachData.avatar_url || "https://callproof.com/wp-content/uploads/2021/04/CallProof-wp-logo.png"
        }
      }
    }
  };
  console.log("Final Agent Config:", JSON.stringify(agentConfig, null, 2));
  const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(agentConfig)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs API error:", response.status, errorText);
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  console.log("ElevenLabs agent created successfully:", data);
  return data.agent_id;
}
async function createAgentSession(agentId) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }
  console.log('Creating conversation session for agent:', agentId);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs session API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('Agent session URL created successfully for agent:', agentId);
    return data;
  } catch (error) {
    console.error('Error creating agent session:', error);
    throw error;
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    let agentId;
    let action = 'create_session';
    let requestBody = {};
    if (req.method === 'GET') {
      const url = new URL(req.url);
      agentId = url.searchParams.get('agent_id');
      action = url.searchParams.get('action') || 'create_session';
    } else if (req.method === 'POST') {
      requestBody = await req.json().catch(()=>({}));
      agentId = requestBody.agent_id;
      action = requestBody.action || 'create_session';
    }
    console.log('ElevenLabs agent function called with action:', action);
    console.log('Request body received:', requestBody);
    if (action === 'create_agent') {
      const { coach_data, assistant_data } = requestBody;
      if (!coach_data || !coach_data.name) {
        return new Response(JSON.stringify({
          error: 'Missing coach_data or coach_data.name parameter',
          message: 'Please provide complete coach_data for agent creation'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      console.log('Creating agent for coach:', coach_data.name);
      console.log('Coach data received:', coach_data);
      console.log('Assistant data received:', assistant_data);
      const newAgentId = await createElevenLabsAgent(coach_data, assistant_data);
      return new Response(JSON.stringify({
        agent_id: newAgentId,
        message: 'ElevenLabs agent created successfully',
        action: 'create_agent',
        coach_name: coach_data.name
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else if (action === 'create_session') {
      if (!agentId) {
        return new Response(JSON.stringify({
          error: 'Missing agent_id parameter',
          message: 'Please provide agent_id for session creation'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      const sessionData = await createAgentSession(agentId);
      return new Response(JSON.stringify({
        ...sessionData,
        agent_id: agentId,
        message: 'ElevenLabs agent session created successfully',
        action: 'create_session'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action parameter',
        message: 'Supported actions: create_agent, create_session'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error in elevenlabs-agent function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      message: 'Failed to process ElevenLabs agent request',
      stack: error.stack
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
