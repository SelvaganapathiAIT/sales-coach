import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", {
      status: 400
    });
  }
  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    // Get user ID from authorization header or query parameter
    const authHeader = headers.get('authorization');
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get('token');
    const coachId = url.searchParams.get("coachId");
    const voiceId = url.searchParams.get("voiceId") || "hzLyDn3IrvrdH83BdqUu"; // default voice
    console.log("[EdgeFn] Query param coachId:", coachId);
    if (!coachId) {
      console.error("[EdgeFn] Missing coachId");
      return new Response(JSON.stringify({
        error: "Missing coachId"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    let agentId;
    // 1. If coachId starts with "agent_", skip DB and use it directly
    if (coachId.startsWith("agent_")) {
      agentId = coachId;
      console.log("[EdgeFn] Using coachId directly as agentId:", agentId);
    } else {
      // 2. Fetch agent_id from the coaches table
      const { data: coachData, error } = await supabase.from("coaches").select("agent_id").eq("id", coachId).single();
      console.log("[EdgeFn] Supabase query result:", {
        data: coachData,
        error
      });
      if (error || !coachData?.agent_id) {
        console.error("[EdgeFn] Coach not found or missing agent_id");
        return new Response(JSON.stringify({
          error: "Coach not found or missing agent_id"
        }), {
          status: 404,
          headers: corsHeaders
        });
      }
      agentId = coachData.agent_id;
    }
    console.log("[EdgeFn] Final agentId:", agentId);
    let userId = null;
    // Try to get user ID from auth header first, then from query parameter
    const token = authHeader?.replace('Bearer ', '') || tokenFromQuery;
    if (token) {
      try {
        // Decode JWT to get user ID (simple base64 decode of payload)
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
        console.log('Authenticated user ID:', userId);
      } catch (error) {
        console.warn('Could not decode auth token:', error);
      }
    } else {
      console.log('No authentication token provided');
    }
    console.log('Starting WebSocket proxy to ElevenLabs...');
    // Initialize Supabase client for conversation tracking
    // Conversation tracking variables
    let conversationBuffer = '';
    let lastSaveTime = Date.now();
    const SAVE_INTERVAL = 30000; // Save every 30 seconds
    const { socket, response } = Deno.upgradeWebSocket(req);
    // Get signed URL for the agent
    //const agentId = 'agent_4301k1p4h341eahrqp6v8tr8qqfs';
    const signedUrlResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!signedUrlResponse.ok) {
      const error = await signedUrlResponse.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${signedUrlResponse.status} - ${error}`);
    }
    const { signed_url } = await signedUrlResponse.json();
    console.log('Got signed URL, connecting to ElevenLabs...');
    // Connect to ElevenLabs WebSocket
    const elevenLabsSocket = new WebSocket(signed_url);
    // Handle ElevenLabs connection
    elevenLabsSocket.onopen = ()=>{
      console.log('Connected to ElevenLabs');
      socket.send(JSON.stringify({
        type: 'connected'
      }));
      // Send initial message to start conversation
      setTimeout(()=>{
        const startMessage = {
          type: "conversation_initiation_client_data"
        };
        if (elevenLabsSocket.readyState === WebSocket.OPEN) {
          elevenLabsSocket.send(JSON.stringify(startMessage));
        }
      }, 1000);
    };
    elevenLabsSocket.onmessage = async (event)=>{
      console.log('Message from ElevenLabs:', event.data);
      try {
        const message = JSON.parse(event.data);
        // Add comprehensive logging to see all message types
        console.log('ElevenLabs message type:', message.type);
        if (message.type !== 'ping') {
          console.log('Full ElevenLabs message:', JSON.stringify(message, null, 2));
        }
        // Track conversation content for memory based on actual ElevenLabs message types
        if (userId) {
          try {
            // Track conversation interruptions (when user speaks)
            if (message.type === 'interruption') {
              console.log('User interrupted - likely speaking');
              conversationBuffer += `\n[User speaking detected]`;
            }
            // Track any audio or text content from agent
            if (message.type === 'audio' && message.audio) {
              console.log('Agent audio response received');
              // For now, just note that agent responded
              conversationBuffer += `\n[Agent audio response]`;
            }
            // Track any conversation events that might contain text
            if (message.type === 'conversation_event' || message.type === 'conversation_update') {
              console.log('Conversation event:', message);
              if (message.text || message.content) {
                conversationBuffer += `\nAgent: ${message.text || message.content}`;
              }
            }
            // For debugging: log all non-ping message types to understand what ElevenLabs sends
            if (message.type !== 'ping') {
              console.log('ElevenLabs message type:', message.type, 'Keys:', Object.keys(message));
            }
            // Save conversation periodically if we have content
            if (conversationBuffer.trim() && Date.now() - lastSaveTime > SAVE_INTERVAL) {
              console.log('Saving conversation buffer to database...');
              supabase.from('conversation_history').upsert({
                user_id: userId,
                agent_id: agentId,
                conversation_summary: conversationBuffer,
                user_name: 'User',
                user_company: 'Unknown',
                user_goals: 'Sales coaching',
                user_challenges: 'Sales improvement',
                last_topics: [
                  conversationBuffer.split('\n').slice(-3).join(' ').substring(0, 100)
                ],
                key_insights: [
                  conversationBuffer.split('\n').slice(-2).join(' ').substring(0, 200)
                ],
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,agent_id'
              }).then(({ error })=>{
                if (error) {
                  console.error('Error saving conversation:', error);
                } else {
                  console.log('Conversation saved successfully');
                  lastSaveTime = Date.now();
                }
              });
            }
          } catch (trackingError) {
            console.error('Error tracking conversation:', trackingError);
          }
        }
        // Handle function calls from the agent
        if (message.type === 'agent_tool_invocation_request') {
          console.log('Tool invocation request:', message);
          if (message.agent_tool_invocation_request_event?.tool_call?.name === 'update_user_profile') {
            try {
              const args = JSON.parse(message.agent_tool_invocation_request_event.tool_call.arguments);
              console.log('Updating user profile with:', args);
              if (!userId) {
                throw new Error('User must be authenticated to save profile information');
              }
              const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-user-profile`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  userId: userId,
                  ...args
                })
              });
              const result = await response.json();
              console.log('Profile update result:', result);
              // Send tool result back to ElevenLabs
              const toolResponse = {
                type: 'agent_tool_result',
                agent_tool_result_event: {
                  tool_call_id: message.agent_tool_invocation_request_event.tool_call.tool_call_id,
                  result: result.success ? `Profile updated successfully for ${args.userName}` : `Failed to update profile: ${result.error}`
                }
              };
              if (elevenLabsSocket.readyState === WebSocket.OPEN) {
                elevenLabsSocket.send(JSON.stringify(toolResponse));
              }
            } catch (error) {
              console.error('Error handling tool call:', error);
              // Send error response back to ElevenLabs
              const errorResponse = {
                type: 'agent_tool_result',
                agent_tool_result_event: {
                  tool_call_id: message.agent_tool_invocation_request_event.tool_call.tool_call_id,
                  result: `Error updating profile: ${error.message}`
                }
              };
              if (elevenLabsSocket.readyState === WebSocket.OPEN) {
                elevenLabsSocket.send(JSON.stringify(errorResponse));
              }
            }
          } else if (message.agent_tool_invocation_request_event?.tool_call?.name === 'store_conversation_summary') {
            try {
              const args = JSON.parse(message.agent_tool_invocation_request_event.tool_call.arguments);
              console.log('Storing conversation summary with:', args);
              if (!userId) {
                throw new Error('User must be authenticated to save conversation summary');
              }
              const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/store-conversation-summary`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  userId: userId,
                  agentId: agentId,
                  ...args
                })
              });
              const result = await response.json();
              console.log('Conversation summary store result:', result);
              // Send tool result back to ElevenLabs
              const toolResponse = {
                type: 'agent_tool_result',
                agent_tool_result_event: {
                  tool_call_id: message.agent_tool_invocation_request_event.tool_call.tool_call_id,
                  result: result.success ? 'Conversation summary saved successfully' : `Failed to save conversation summary: ${result.error}`
                }
              };
              if (elevenLabsSocket.readyState === WebSocket.OPEN) {
                elevenLabsSocket.send(JSON.stringify(toolResponse));
              }
            } catch (error) {
              console.error('Error handling conversation summary tool call:', error);
              // Send error response back to ElevenLabs
              const errorResponse = {
                type: 'agent_tool_result',
                agent_tool_result_event: {
                  tool_call_id: message.agent_tool_invocation_request_event.tool_call.tool_call_id,
                  result: `Error saving conversation summary: ${error.message}`
                }
              };
              if (elevenLabsSocket.readyState === WebSocket.OPEN) {
                elevenLabsSocket.send(JSON.stringify(errorResponse));
              }
            }
          }
          // Don't forward tool invocation requests to the client
          return;
        }
      } catch (parseError) {
        console.log('Non-JSON message from ElevenLabs');
      }
      // Forward all other messages from ElevenLabs to client only if client socket is open
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      } else {
        console.warn('Client socket not open, message dropped');
      }
    };
    elevenLabsSocket.onerror = (error)=>{
      console.error('ElevenLabs WebSocket error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'ElevenLabs connection error'
      }));
    };
    elevenLabsSocket.onclose = (event)=>{
      console.log('ElevenLabs WebSocket closed:', event.code, event.reason);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'disconnected',
          code: event.code,
          reason: event.reason
        }));
        socket.close();
      }
    };
    // Handle client messages
    socket.onopen = ()=>{
      console.log('Client WebSocket connected');
    };
    socket.onmessage = (event)=>{
      console.log('Message from client:', typeof event.data, event.data instanceof ArrayBuffer ? 'ArrayBuffer' : 'other');
      // Check if it's binary audio data (ArrayBuffer) or JSON message
      if (event.data instanceof ArrayBuffer) {
        // Convert ArrayBuffer to base64 for ElevenLabs
        const uint8Array = new Uint8Array(event.data);
        const binaryString = String.fromCharCode(...uint8Array);
        const base64Audio = btoa(binaryString);
        // Send as user_audio_chunk format expected by ElevenLabs
        const audioMessage = {
          user_audio_chunk: base64Audio
        };
        if (elevenLabsSocket.readyState === WebSocket.OPEN) {
          elevenLabsSocket.send(JSON.stringify(audioMessage));
        }
      } else {
        // Try to parse as JSON for other message types
        try {
          const clientMessage = JSON.parse(event.data);
          if (elevenLabsSocket.readyState === WebSocket.OPEN) {
            elevenLabsSocket.send(event.data);
          }
        } catch (error) {
          console.error('Error parsing client message:', error);
          // If not JSON, forward as is
          if (elevenLabsSocket.readyState === WebSocket.OPEN) {
            elevenLabsSocket.send(event.data);
          }
        }
      }
    };
    socket.onerror = (error)=>{
      console.error('Client WebSocket error:', error);
    };
    socket.onclose = ()=>{
      console.log('Client WebSocket closed');
      if (elevenLabsSocket.readyState === WebSocket.OPEN) {
        elevenLabsSocket.close();
      }
    };
    return response;
  } catch (error) {
    console.error('Error in elevenlabs-websocket function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      message: 'Failed to create WebSocket connection'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
