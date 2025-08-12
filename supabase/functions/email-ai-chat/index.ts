import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  to: { email: string; name?: string }[];
  from: { email: string; name?: string };
  subject: string;
  text?: string;
  html?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Email AI chat webhook called');
    
    // Parse the incoming email webhook data from Resend
    const emailData: EmailData = await req.json();
    console.log('Received email data:', emailData);
    
    const fromEmail = emailData.from.email;
    const fromName = emailData.from.name || fromEmail;
    const subject = emailData.subject;
    const message = emailData.text || emailData.html || '';
    
    // Track/assign a user id for email-only users
    let userId: string | null = null;
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if user exists in profiles table
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, company_name, role, email')
      .eq('email', fromEmail)
      .maybeSingle();
    
    console.log('User profile:', profile, 'Error:', profileError);
    
    // Ensure we have a stable userId for this email-only user
    if (!profile) {
      const newUserId = crypto.randomUUID();
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          email: fromEmail,
          company_name: 'Email User',
          role: 'Customer',
          user_id: newUserId,
        })
        .select()
        .single();
      if (createError) {
        console.error('Error creating profile:', createError);
      } else {
        profile = newProfile;
        userId = newUserId;
      }
    } else {
      if (!profile.user_id) {
        const newUserId = crypto.randomUUID();
        const { data: updated, error: updateErr } = await supabase
          .from('profiles')
          .update({ user_id: newUserId })
          .eq('id', profile.id)
          .select()
          .single();
        if (!updateErr && updated) {
          profile = updated;
          userId = newUserId;
        }
      } else {
        userId = profile.user_id;
      }
    }
    
    // Get or create conversation history
    let { data: conversation, error: convError } = await supabase
      .from('conversation_history')
      .select('*')
      .eq('user_id', userId as string)
      .eq('agent_id', 'email-coach')
      .maybeSingle();
    
    if (!conversation) {
      const { data: newConv, error: createConvError } = await supabase
        .from('conversation_history')
        .insert({
          user_id: userId as string,
          agent_id: 'email-coach',
          user_name: fromName,
          user_company: profile?.company_name || 'Unknown',
          conversation_summary: `Email conversation with ${fromName}`,
          user_goals: 'Seeking sales coaching support via email',
          user_challenges: 'Needs coaching guidance'
        })
        .select()
        .single();
      
      if (!createConvError) {
        conversation = newConv;
      }
    }
    
    // Prepare context for AI
    const userContext = {
      name: fromName,
      email: fromEmail,
      company: profile?.company_name || 'Unknown',
      role: profile?.role || 'Customer',
      previousConversation: conversation?.conversation_summary || 'First time interaction',
      goals: conversation?.user_goals || 'Seeking sales coaching',
      challenges: conversation?.user_challenges || 'General support needed'
    };
    
    // Generate AI response using the existing chat-with-agent function
    const aiPrompt = `
You are Bobby Hartline, an expert sales coach. You're responding to an email from ${userContext.name} at ${userContext.company}.

Previous conversation context: ${userContext.previousConversation}
User's goals: ${userContext.goals}
User's challenges: ${userContext.challenges}

Their email subject: ${subject}
Their message: ${message}

Respond as Bobby would - knowledgeable, supportive, and action-oriented. Keep it professional but warm. Provide specific, actionable sales coaching advice. Sign off as Bobby Hartline, AI Sales Coach.
`;

    console.log('Calling chat-with-agent for AI response...');
    
    // Call the existing chat-with-agent function
    const aiResponse = await supabase.functions.invoke('chat-with-agent', {
      body: {
        message: aiPrompt,
        agentId: 'email-coach',
        userId: userId as string,
        userInfo: userContext
      }
    });
    
    console.log('AI response:', aiResponse);
    
    let responseText = "Thank you for your email. I'm Bobby Hartline, your AI sales coach. I've received your message and will get back to you soon with personalized coaching advice.";
    
    if (aiResponse.data && aiResponse.data.response) {
      responseText = aiResponse.data.response;
    }
    
    // Send email response
    const emailResponse = await resend.emails.send({
      from: "Bobby Hartline <bobby.hartline@salescoaches.ai>",
      to: [fromEmail],
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Hi ${fromName}!</h2>
          
          <div style="line-height: 1.6; margin-bottom: 20px;">
            ${responseText.replace(/\n/g, '<br>')}
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <strong>Bobby Hartline</strong><br>
            <em>AI Sales Coach</em><br>
            📧 bobby.hartline@salescoaches.ai<br>
            🌐 <a href="https://salescoaches.ai" style="color: #2563eb;">salescoaches.ai</a><br>
            <br>
            <a href="https://salescoaches.ai/voice-coaching" style="display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold; margin: 10px 0;">💬 Try Voice Coaching</a>
            <br>
            <div style="font-size: 12px; color: #6b7280; margin-top: 15px;">
              <strong>About Your Coach:</strong> I'm an AI sales coach trained on decades of proven sales methodologies. I'm here to help you close more deals and build stronger customer relationships. Feel free to email me anytime for coaching support!
            </div>
          </div>
        </div>
      `,
    });

    console.log('Email sent:', emailResponse);
    
    // Update conversation history
    if (conversation) {
      const updatedSummary = `${conversation.conversation_summary}\n\nEmail exchange - User: ${message.substring(0, 100)}... AI: ${responseText.substring(0, 100)}...`;
      
      await supabase
        .from('conversation_history')
        .update({
          conversation_summary: updatedSummary,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
    }
    
    // Log the email conversation
    await supabase
      .from('email_conversations')
      .insert({
        user_id: userId as string,
        coach_name: 'Bobby Hartline',
        coach_email: 'bobby.hartline@salescoaches.ai',
        recipient_email: fromEmail,
        subject: `Re: ${subject}`,
        message: responseText,
        email_id: emailResponse.data?.id ?? null,
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Email processed and response sent",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in email AI chat:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);