import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Starting WebSocket proxy to OpenAI Realtime API...');

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Connect to OpenAI Realtime API
    const openAISocket = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    let sessionCreated = false;

    // Handle OpenAI connection
    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
      socket.send(JSON.stringify({ type: 'connected' }));
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('OpenAI message type:', data.type);

      // Handle session creation
      if (data.type === 'session.created' && !sessionCreated) {
        sessionCreated = true;
        console.log('Session created, sending configuration...');
        
        // Configure the session
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `You are Bobby, a high-energy AI Sales Coach with the voice and presence of a Tony Robbins-style coach. 

START IMMEDIATELY when connected by saying: "Hey there! I'm Bobby, your Sales Coach, and I'm pumped to help you crush your goals! What's your name, and what should I call you when we're working together?"

Your goal is to build trust and help this salesperson unlock their potential. You are:
- Friendly, curious, direct, and motivating
- Emotionally intelligent and present
- Focused on discovering their goals, patterns, and beliefs
- Supportive but challenging when needed

Remember everything shared and help them step into their power as a top performer.`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            temperature: 0.8,
            max_response_output_tokens: "inf"
          }
        };

        openAISocket.send(JSON.stringify(sessionUpdate));

        // Start the conversation immediately
        setTimeout(() => {
          console.log('Starting initial conversation...');
          openAISocket.send(JSON.stringify({
            type: 'response.create'
          }));
        }, 500);
      }

      // Forward all messages to client
      socket.send(event.data);
    };

    openAISocket.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'OpenAI connection error' 
      }));
    };

    openAISocket.onclose = (event) => {
      console.log('OpenAI WebSocket closed:', event.code, event.reason);
      socket.send(JSON.stringify({ 
        type: 'disconnected',
        code: event.code,
        reason: event.reason
      }));
      socket.close();
    };

    // Handle client messages
    socket.onopen = () => {
      console.log('Client WebSocket connected');
    };

    socket.onmessage = (event) => {
      console.log('Message from client:', event.data);
      
      try {
        const clientMessage = JSON.parse(event.data);
        
        if (clientMessage.type === 'audio' && clientMessage.audio) {
          // Convert audio data and send to OpenAI
          const audioEvent = {
            type: 'input_audio_buffer.append',
            audio: clientMessage.audio
          };
          
          if (openAISocket.readyState === WebSocket.OPEN) {
            openAISocket.send(JSON.stringify(audioEvent));
          }
        } else {
          // Forward other messages
          if (openAISocket.readyState === WebSocket.OPEN) {
            openAISocket.send(event.data);
          }
        }
      } catch (error) {
        console.error('Error parsing client message:', error);
        if (openAISocket.readyState === WebSocket.OPEN) {
          openAISocket.send(event.data);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('Client WebSocket closed');
      if (openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.close();
      }
    };

    return response;

  } catch (error) {
    console.error('Error in openai-realtime function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Failed to create WebSocket connection'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});