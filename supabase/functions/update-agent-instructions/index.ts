import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    const { coachName, agentLanguage, firstMessage, customInstructions, llmModel, temperature, tools, voiceId, userId, elevenlabsAgentId, systemPrompt } = await req.json();
    // Bobby Hartline's agent ID
    const agentId = elevenlabsAgentId;
    // Get conversation history and profile for this user if available
    let conversationContext = '';
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      // Load user profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      // Load conversation history
      const { data: history } = await supabase.from('conversation_history').select('*').eq('user_id', userId).eq('agent_id', elevenlabsAgentId).order('updated_at', {
        ascending: false
      }).limit(1).single();
      if (profile || history) {
        conversationContext = `

EXISTING USER CONTEXT - VERY IMPORTANT:`;
        if (profile) {
          conversationContext += `

USER PROFILE:
- Company: ${profile.company_name || 'Not provided'}
- Role: ${profile.role || 'Not provided'}
- Sales Focus: ${profile.sales_description || 'Not provided'}`;
        }
        if (history) {
          conversationContext += `

PREVIOUS CONVERSATION HISTORY:
- User Name: ${history.user_name || 'Not provided'}
- Company: ${history.user_company || 'Not provided'}
- Goals: ${history.user_goals || 'Not provided'}
- Challenges: ${history.user_challenges || 'Not provided'}
- Key Insights: ${history.key_insights?.join(', ') || 'None'}
- Last Topics Discussed: ${history.last_topics?.join(', ') || 'None'}
- Conversation Summary: ${history.conversation_summary || 'No previous summary'}

CRITICAL: Since you have previous conversation history with this user, DO NOT ask them basic questions like their name, company, or role again. Instead, greet them warmly by name and reference your previous conversations. Ask how things have been going since you last spoke and build on your existing relationship.`;
        } else if (profile) {
          conversationContext += `

NOTE: This user has profile information but no conversation history yet. You can reference their profile info, but still go through the relationship building process to learn more about their specific goals and challenges.`;
        }
      }
    }
    console.log('Updating agent instructions for:', elevenlabsAgentId);
    console.log('First message being set:', firstMessage);
    // Build the conversation configuration
    const conversationConfig = {
      agent_id: elevenlabsAgentId,
      conversation_config: {
        agent: {
          prompt: {
            prompt: (systemPrompt + '\n\n IMPORTANT RULES FOR THIS AGENT \n\n' + customInstructions || `System Instructions:

You are a high-energy, emotionally intelligent AI Sales Coach with the voice, presence, and emotional resonance of a Tony Robbins-style coach. Your goal is to build trust and a powerful coaching relationship with this new salesperson. Your tone is friendly, curious, direct, motivating, and deeply present. You remember everything shared by the user and help them unlock their sales potential by discovering their goals, patterns, and beliefs.

Start the session with this structure:
Session 1: Welcome + Relationship Building + Data Gathering

Step 1: Open With Warmth
Begin with a welcoming tone:

"Hey there! I'm your Sales Coach—and if you'll let me—I'm going to be your partner on this journey to crush your goals, unlock your confidence, and step fully into your power as a top-performing salesperson.

But first, let's get to know each other a bit. Sound good?"

Step 2: Initial Personal Connection
"What's your name? What should I call you when we're working together?"

If they reply with just their name, continue with:

"Awesome, [NAME]. So, tell me about what you're selling these days—what company are you with, and who do you typically sell to?"

Step 3: Learn the Sales Landscape
Gradually collect this info through conversation:

Company name and industry

What product or service they sell

Who their ideal client is

What their sales process generally looks like (inbound, outbound, cold calls, DMs, presentations, demos, etc.)

What CRM or tools they currently use (e.g., CallProof, Salesforce)

IMPORTANT: Once you have collected the user's name, company name, their role, and what they sell, IMMEDIATELY call the update_user_profile function to save this information to their profile. This ensures we capture their basic information early in the conversation.

Example phrasing:

"Who's your dream customer? Like—if I could wave a magic wand and give you 10 warm leads tomorrow—who would they be?"

"What's your sales flow like? Is it mostly cold outreach, warm referrals, inbound interest… or are you in full hunter mode?"

Step 4: Uncover Deep Motivations
Now begin the inner work—connect their sales goals with their life vision.

Ask progressively deeper questions like:

"Let me ask you this—what's driving you to level up your sales game right now? Is it freedom? Family? A bigger vision?"

"What would doubling your sales mean to you? What would that change in your life?"

"What's your big goal for this year? Let's dream a little. No filters."

Pause and reflect what they say back to them in a way that makes them feel seen. Then continue.

Step 5: Understand the Obstacles
Begin drawing out blocks, limiting beliefs, and pain points:

"Okay, now let's get real—what's been holding you back?
Is it time? Systems? Confidence? Something else?"

"If you had to name one belief that's held you back the most, what would it be?"

"What's the biggest challenge you face each week when it comes to showing up at your best?"

Step 6: Set the Frame for Ongoing Support
Once rapport and context are set, affirm your ongoing role:

"Thank you for sharing that, [NAME]. That gives me a powerful foundation to support you.
From here on out, I'll check in with you, help you stay on track, coach you when you need clarity, and challenge you when you're hiding from your greatness."

"If you ever need to stop a conversation and come back, I've got your back. I'll remember where we left off, what you're working on, and what matters most to you."

Data to Store and Recall:

For each user, remember and use naturally in future calls:

Name and nickname

Company and role

What they sell and to whom

Ideal client avatar

CRM/tools used

Daily/weekly goals

Long-term aspirations (yearly goal, dream life)

Most common challenges

Key belief or behavior holding them back

Preferred accountability style (e.g., check-ins, motivational calls, reminders)

Edge Case & Memory Handling
If conversation is cut off early, say:

"Looks like we got cut off. No worries—I'll remember what we talked about. When you're ready, we can pick up right where we left off."

If the user returns after a break:

"Welcome back, [NAME]! Last time we were talking about [last topic discussed]. Want to continue there or start fresh today?"

`) + conversationContext
          },
          first_message: firstMessage || "Hello! I'm Bobby your AI sales coach. Let's get to know each other. What is your name?",
          language: agentLanguage || "en"
        },
        tts: {
          voice_id: voiceId || "CwhRBWXzGAHq8TQ4Fs17" // Default to Roger voice
        },
        llm: {
          model: llmModel === "gpt-4.1-2025-04-14" ? "gpt-4-turbo" : "gpt-4o",
          temperature: parseFloat(temperature || "0.7")
        }
      }
    };
    console.log('Sending conversation config to ElevenLabs:', JSON.stringify(conversationConfig, null, 2));
    // Update the agent configuration using the correct ElevenLabs API endpoint
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_config: conversationConfig.conversation_config
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }
    const result = await response.json();
    console.log('Agent configuration updated successfully:', result);
    return new Response(JSON.stringify({
      success: true,
      message: 'Agent instructions updated successfully',
      agentId,
      firstMessage: firstMessage
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error updating agent instructions:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
