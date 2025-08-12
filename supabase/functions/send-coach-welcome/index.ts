import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  coachName: string;
  coachEmail: string;
  coachPhone?: string;
  coachImageUrl?: string;
  coachDescription: string;
  targetUsers: string[]; // Array of user emails to send welcome emails to
  isActivation?: boolean; // Whether this is a new activation or general welcome
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      coachName, 
      coachEmail, 
      coachPhone, 
      coachImageUrl, 
      coachDescription,
      targetUsers,
      isActivation = true 
    }: WelcomeEmailRequest = await req.json();

    if (!coachName || !coachEmail || !targetUsers?.length) {
      throw new Error('Missing required fields: coachName, coachEmail, or targetUsers');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];

    // Send welcome email to each target user
    for (const userEmail of targetUsers) {
      try {
        const emailContent = generateWelcomeEmail(
          coachName, 
          coachEmail, 
          coachPhone, 
          coachImageUrl, 
          coachDescription,
          userEmail,
          isActivation
        );

        const emailResponse = await resend.emails.send({
          from: `${coachName} <${coachEmail}>`,
          to: [userEmail],
          subject: isActivation 
            ? `🎯 Welcome to Your AI Sales Coach - ${coachName}` 
            : `👋 Meet Your Sales Coach - ${coachName}`,
          html: emailContent,
          reply_to: coachEmail,
        });

        // Log the welcome email in our email conversations table
        await supabase.from('email_conversations').insert({
          user_id: null, // System generated email
          coach_name: coachName,
          coach_email: coachEmail,
          recipient_email: userEmail,
          subject: isActivation 
            ? `Welcome to Your AI Sales Coach - ${coachName}` 
            : `Meet Your Sales Coach - ${coachName}`,
          message: 'Automated welcome email sent upon coach activation',
          email_id: emailResponse.data?.id,
          sent_at: new Date().toISOString()
        });

        results.push({
          userEmail,
          success: true,
          emailId: emailResponse.data?.id
        });

        console.log(`Welcome email sent to ${userEmail} for coach ${coachName}`);
      } catch (error) {
        console.error(`Failed to send welcome email to ${userEmail}:`, error);
        results.push({
          userEmail,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({ 
      success: true,
      message: `Welcome emails sent: ${successCount} successful, ${failCount} failed`,
      results,
      totalSent: successCount
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-coach-welcome function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateWelcomeEmail(
  coachName: string, 
  coachEmail: string, 
  coachPhone: string | undefined, 
  coachImageUrl: string | undefined, 
  coachDescription: string,
  userEmail: string,
  isActivation: boolean
): string {
  const userName = userEmail.split('@')[0]; // Extract name from email
  const actionText = isActivation ? "has been activated" : "is now available";
  const introText = isActivation 
    ? "Your AI sales coach is now active and ready to help you crush your sales goals!" 
    : "I'm excited to introduce you to your new AI sales coach!";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #667eea; font-size: 28px; margin-bottom: 10px;">🎯 Welcome to AI Sales Coaching!</h1>
        <p style="color: #64748b; font-size: 16px;">${introText}</p>
      </div>

      <!-- Coach Introduction -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; color: white;">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          ${coachImageUrl && coachImageUrl.startsWith('http') 
            ? `<img src="${coachImageUrl}" alt="${coachName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-right: 20px; border: 3px solid rgba(255,255,255,0.3);" />`
            : `<div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-right: 20px; font-size: 24px; font-weight: bold;">${coachName.charAt(0)}</div>`
          }
          <div>
            <h2 style="margin: 0; font-size: 24px; color: white;">Meet ${coachName}</h2>
            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9);">Your AI Sales Coach ${actionText}</p>
          </div>
        </div>
        <p style="color: rgba(255,255,255,0.95); line-height: 1.6; margin: 0;">
          ${coachDescription}
        </p>
      </div>

      <!-- What to Expect -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #334155; font-size: 20px; margin-bottom: 15px;">🚀 What to Expect</h3>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px;">
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li style="margin-bottom: 8px;"><strong>24/7 Availability:</strong> Get coaching support anytime you need it</li>
            <li style="margin-bottom: 8px;"><strong>Personalized Guidance:</strong> Tailored advice based on your sales activities</li>
            <li style="margin-bottom: 8px;"><strong>Accountability:</strong> Regular check-ins on your progress and goals</li>
            <li style="margin-bottom: 8px;"><strong>Skill Development:</strong> Improve objection handling, closing, and prospecting</li>
            <li style="margin-bottom: 0;"><strong>Performance Tracking:</strong> Data-driven insights from your CRM and call activities</li>
          </ul>
        </div>
      </div>

      <!-- Getting Started -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #334155; font-size: 20px; margin-bottom: 15px;">🎯 Getting Started</h3>
        <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 20px;">
          <ol style="margin: 0; padding-left: 20px; color: #0c4a6e;">
            <li style="margin-bottom: 10px;"><strong>Connect Your CRM:</strong> Link your sales data for personalized coaching</li>
            <li style="margin-bottom: 10px;"><strong>Set Your Goals:</strong> Define what success looks like for you</li>
            <li style="margin-bottom: 10px;"><strong>Start Coaching:</strong> Begin your first session with ${coachName}</li>
            <li style="margin-bottom: 0;"><strong>Track Progress:</strong> Monitor your improvement over time</li>
          </ol>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="https://df678479-6117-41c6-822f-9aab26a810e5.lovableproject.com/coach-call?coach=${encodeURIComponent(coachName)}&email=${encodeURIComponent(coachEmail)}&phone=${encodeURIComponent(coachPhone || '')}&image=${encodeURIComponent(coachImageUrl || '')}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
          🎤 Start Your First Coaching Session
        </a>
      </div>

      <!-- Contact Info -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h4 style="color: #334155; margin: 0 0 15px 0;">📧 Stay Connected</h4>
        <p style="color: #64748b; margin: 0 0 10px 0;">
          You can reach ${coachName} anytime by replying to this email or using the contact information below:
        </p>
        <div style="color: #64748b;">
          <p style="margin: 5px 0;">📧 Email: ${coachEmail}</p>
          ${coachPhone ? `<p style="margin: 5px 0;">📞 Phone: ${coachPhone}</p>` : ''}
          <p style="margin: 5px 0;">🌐 Platform: SalesCoaches.ai</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">
          Ready to take your sales performance to the next level? Let's get started!
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
          Powered by SalesCoaches.ai • Your AI-Powered Sales Success Platform
        </p>
      </div>
    </div>
  `;
}

serve(handler);