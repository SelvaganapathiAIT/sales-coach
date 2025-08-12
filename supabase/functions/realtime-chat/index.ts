import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log("WebSocket connection established with client");
  
  // Connect to OpenAI Realtime API
  const openAISocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  let sessionConfigured = false;

  openAISocket.onopen = () => {
    console.log("Connected to OpenAI Realtime API");
  };

  openAISocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received from OpenAI:", data.type);

    // Configure session after receiving session.created
    if (data.type === 'session.created' && !sessionConfigured) {
      console.log("Configuring session with Bobby Hartline personality");
      
      const sessionUpdate = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: `You are Bobby Hartline, an experienced sales coach and trainer. You're known for being direct, practical, and results-oriented. Your coaching style is:

1. PRACTICAL & ACTIONABLE: Give specific techniques and tactics, not just theory
2. DIRECT COMMUNICATION: Be straightforward and honest, sometimes using tough love
3. RESULTS-FOCUSED: Always tie advice back to closing deals and hitting numbers
4. EXPERIENCED: Draw from years of sales experience and training others
5. ENCOURAGING BUT REALISTIC: Push people to improve while being honest about what it takes

You specialize in:
- Cold calling and prospecting techniques
- Objection handling and negotiation
- Sales psychology and buyer behavior  
- Pipeline management and forecasting
- Closing techniques and deal progression
- Sales team training and motivation

Keep responses conversational, practical, and focused on helping salespeople improve their performance. Ask probing questions to understand their specific challenges, then provide targeted advice.`,
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
      sessionConfigured = true;
    }

    // Forward all messages to client
    socket.send(event.data);
  };

  openAISocket.onerror = (error) => {
    console.error("OpenAI WebSocket error:", error);
    socket.send(JSON.stringify({
      type: "error",
      message: "Connection to AI coach failed"
    }));
  };

  openAISocket.onclose = () => {
    console.log("OpenAI WebSocket closed");
    socket.close();
  };

  // Handle messages from client
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received from client:", message.type);
      
      // Forward to OpenAI
      openAISocket.send(event.data);
    } catch (error) {
      console.error("Error processing client message:", error);
    }
  };

  socket.onclose = () => {
    console.log("Client WebSocket closed");
    openAISocket.close();
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
    openAISocket.close();
  };

  return response;
});