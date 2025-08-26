const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL not configured');
}
const functionUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1');
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
export async function createElevenLabsAgent(coach, assistantData) {
  // Construct the function URL properly
  console.log('Calling elevenlabs-agent function to create agent for coach:', coach.name);
  console.log('Function URL:', functionUrl);
  console.log('Passing coach data:', coach);
  console.log('Passing assistant data:', assistantData);
  // Call the elevenlabs-agent function with complete records
  const response = await fetch(`${functionUrl}/elevenlabs-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      coach_data: coach,
      assistant_data: assistantData,
      action: 'create_agent'
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs agent function error:', response.status, errorText);
    throw new Error(`ElevenLabs agent function error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.agent_id;
}
export async function createElevenLabsTool(coachId, coachConfig, userId) {
  const payload = {
    tool_config: {
      type: "webhook",
      name: `${userId}_chat_with_Agent`,
      description: "Handles CallProof real-time and CRM data user queries.",
      response_timeout_secs: 30,
      disable_interruptions: true,
      force_pre_tool_speech: false,
      api_schema: {
        url: `${functionUrl}/chat-with-agent`,
        method: "POST",
        request_body_schema: {
          type: "object",
          description: "Payload for Supabase chat-with-agent webhook",
          properties: {
            userId: {
              type: "string",
              constant_value: userId
            },
            message: {
              type: "string",
              description: "The user’s natural language question related to CallProof or other CRM real-time data"
            },
            coachConfig: {
              type: "string",
              constant_value: JSON.stringify(coachConfig)
            },
            coachId: {
              type: "string",
              constant_value: coachId
            },
            conversationId: {
              type: "string",
              description: "Conversation identifier for tracking sessions"
            },
            previousResponse: {
              type: "string",
              description: "Previous bot response for continuity"
            }
          },
          required: [
            "userId",
            "message",
            "coachConfig",
            "coachId"
          ]
        },
        request_headers: {
          "Content-Type": "application/json"
        }
      },
      dynamic_variables: {},
      assignments: []
    }
  };
  const response = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs tool creation error:", response.status, errorText);
    throw new Error(`ElevenLabs tool creation error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}
export async function updateElevenLabsAgent(agentId, toolId, previousPrompt, CALLPROOF_TOOL) {
  console.debug(agentId);
  console.debug(toolId);
  console.debug(CALLPROOF_TOOL);
  const updatedPrompt = `${previousPrompt}

---
IMPORTANT:
If the user asks anything related to CallProof real-time data and other CRM realtime data, use the '${CALLPROOF_TOOL}' custom tool.

Example:
CallProof: "Help me find John doe's call details in CallProof."
HubSpot: "Show all activities and calls related to John doe in HubSpot."
Zoho CRM: "Retrieve John doe's recent calls and notes in Zoho CRM."
Salesforce: "Get all logged calls and meeting details for John doe in Salesforce.",
→ Check with '${CALLPROOF_TOOL}'`;
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: updatedPrompt,
            tool_ids: toolId ? [
              toolId
            ] : []
          }
        }
      }
    })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}
