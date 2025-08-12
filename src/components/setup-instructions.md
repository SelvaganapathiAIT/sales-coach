# Setup Instructions for AI Agent

The AI agent on the onboarding screen requires an OpenAI API key to function. Here's how to set it up:

## Required Secret Configuration

You need to add your OpenAI API key as a Supabase secret:

1. Go to your Supabase dashboard
2. Navigate to Project Settings > Edge Functions
3. Add a new secret with:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)

## How the AI Agent Works

The onboarding screen uses:
- **RealtimeChat class** in `src/utils/RealtimeAudio.ts` 
- **realtime-chat edge function** in `supabase/functions/realtime-chat/index.ts`
- **OpenAI Realtime API** for voice and text conversations

The flow is:
1. Client connects to our WebSocket edge function
2. Edge function connects to OpenAI's Realtime API using your API key
3. Messages flow bidirectionally between client ↔ edge function ↔ OpenAI

## Troubleshooting

If the AI agent isn't working:
1. Check that `OPENAI_API_KEY` secret is configured
2. Verify your OpenAI API key has access to the Realtime API
3. Check browser console for WebSocket connection errors
4. Test the edge function endpoint directly