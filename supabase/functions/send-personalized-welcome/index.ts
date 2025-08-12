import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PersonalizedWelcomeRequest {
  coachName: string;
  coachEmail: string;
  coachPhone?: string;
  coachImageUrl?: string;
  targetEmail: string;
  userName: string;
  userCompany: string;
  userContext?: string;
  callproofData?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request for personalized welcome email');
    const { 
      coachName, 
      coachEmail, 
      coachPhone, 
      coachImageUrl, 
      targetEmail,
      userName,
      userCompany,
      userContext,
      callproofData
    }: PersonalizedWelcomeRequest = await req.json();

    console.log('Request data:', { coachName, targetEmail, userName, userCompany });

    if (!coachName || !coachEmail || !targetEmail || !userName) {
      console.error('Missing required fields:', { coachName, coachEmail, targetEmail, userName });
      throw new Error('Missing required fields: coachName, coachEmail, targetEmail, or userName');
    }

    // Check if RESEND_API_KEY is available
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error('RESEND_API_KEY not found in environment');
      throw new Error('RESEND_API_KEY not configured');
    }
    console.log('RESEND_API_KEY found');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate personalized email content
    const emailContent = generatePersonalizedWelcomeEmail(
      coachName, 
      coachEmail, 
      coachPhone, 
      coachImageUrl, 
      userName,
      userCompany,
      userContext,
      callproofData
    );

    console.log('Attempting to send email with Resend...');
    
    try {
      const emailResponse = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: [targetEmail],
        subject: `🎯 Ready to dominate, ${userName}? Your personal sales coach is here!`,
        html: emailContent,
        reply_to: coachEmail,
      });

      console.log('Resend response:', emailResponse);

      if (emailResponse.error) {
        console.error('Resend error:', emailResponse.error);
        throw new Error(`Email sending failed: ${JSON.stringify(emailResponse.error)}`);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Log the personalized welcome email
    await supabase.from('email_conversations').insert({
      user_id: null,
      coach_name: coachName,
      coach_email: coachEmail,
      recipient_email: targetEmail,
      subject: `Ready to dominate, ${userName}? Your personal sales coach is here!`,
      message: `Personalized welcome email sent to ${userName} at ${userCompany}`,
      email_id: emailResponse.data?.id,
      sent_at: new Date().toISOString()
    });

    console.log(`Personalized welcome email sent to ${targetEmail} for ${userName} at ${userCompany}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Personalized welcome email sent to ${userName}`,
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-personalized-welcome function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generatePersonalizedWelcomeEmail(
  coachName: string, 
  coachEmail: string, 
  coachPhone: string | undefined, 
  coachImageUrl: string | undefined, 
  userName: string,
  userCompany: string,
  userContext?: string,
  callproofData?: any
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #667eea;">🎯 Hey ${userName}!</h1>
      <p>Your personal sales coach is locked and loaded!</p>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 30px 0; color: white;">
        <h2 style="margin: 0 0 15px 0;">${coachName}</h2>
        <p>Your AI Sales Coach</p>
        
        <p>${userName}, I've been looking at your activity and I'm impressed with what I see at ${userCompany}. 
        You're in the wireless business - a competitive space where every conversation counts and relationships are everything.</p>
        
        <p>I'm here to help you crush your numbers and turn every prospect into a customer. Let's get to work!</p>
      </div>

      <h3>🎯 Our Coaching Focus</h3>
      <ul>
        <li><strong>Wireless Industry Mastery:</strong> Perfecting your pitch for business wireless solutions</li>
        <li><strong>CallProof Optimization:</strong> Analyzing your call patterns and improving results</li>
        <li><strong>B2B Relationship Building:</strong> Turning prospects into customers</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://df678479-6117-41c6-822f-9aab26a810e5.lovableproject.com/coach-call" 
           style="background: #667eea; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block;">
          🎤 Let's Start Coaching!
        </a>
      </div>

      <p>📧 Email: ${coachEmail}</p>
      ${coachPhone ? `<p>📞 Phone: ${coachPhone}</p>` : ''}
      
      <p style="text-align: center; color: #94a3b8; font-size: 14px; margin-top: 40px;">
        Time to show the wireless industry what ${userCompany} is made of!
      </p>
    </div>
  `;
}

function generateRobertInsights(userName: string, userCompany: string, callproofData?: any): string {
  return `
    <ul style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.6;">
      <li style="margin-bottom: 8px;">
        <strong>Company:</strong> ${userCompany} - You're in the competitive wireless business where relationships and trust drive sales
      </li>
      <li style="margin-bottom: 8px;">
        <strong>Target Market:</strong> I see you're prospecting diverse businesses (like pool companies) - smart approach to expand beyond traditional markets
      </li>
      <li style="margin-bottom: 8px;">
        <strong>CallProof Activity:</strong> Your system is connected and ready for optimization - we'll dive deep into your call patterns and results
      </li>
      <li style="margin-bottom: 8px;">
        <strong>Opportunity:</strong> The wireless market is hot right now. Businesses need reliable connectivity more than ever - you're in the right place at the right time
      </li>
      <li style="margin-bottom: 0;">
        <strong>Coaching Focus:</strong> I'm going to help you perfect your pitch, overcome price objections, and turn every conversation into a closed deal
      </li>
    </ul>
  `;
}

serve(handler);