import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CoachEmailRequest {
  to: string;
  subject: string;
  message: string;
  coachName: string;
  coachEmail: string;
  coachPhone?: string;
  coachImageUrl?: string;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SEND COACH EMAIL FUNCTION CALLED ===');
    const { to, subject, message, coachName, coachEmail, coachPhone, coachImageUrl, userId }: CoachEmailRequest = await req.json();

    console.log('Request data:', { to, subject: subject?.substring(0, 50), coachName, coachEmail });
    console.log("Coach image URL received:", coachImageUrl);

    if (!to || !subject || !message || !coachName || !coachEmail) {
      console.error('Missing required fields:', { to: !!to, subject: !!subject, message: !!message, coachName: !!coachName, coachEmail: !!coachEmail });
      throw new Error('Missing required fields');
    }

    // Check if RESEND_API_KEY exists
    const resendKey = Deno.env.get("RESEND_API_KEY");
    console.log('RESEND_API_KEY exists:', !!resendKey);

    // For now, let's use external URL approach to avoid email size issues
    // Base64 encoding makes emails too large and causes Gmail clipping

    // Generate professional HTML signature
    const generateSignature = (name: string, phone?: string, imageUrl?: string) => {
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <table style="width: 100%; font-family: Arial, sans-serif;">
            <tr>
              <td style="vertical-align: top; padding-right: 20px; width: 100px;">
                ${imageUrl && imageUrl.startsWith('http') ? `<img src="${imageUrl}" alt="${firstName} ${lastName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; display: block; border: 2px solid #e2e8f0; max-width: 80px;" />` : `<div style="width: 80px; height: 80px; border-radius: 50%; background-color: #667eea; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${firstName.charAt(0)}${lastName.charAt(0)}</div>`}
              </td>
              <td style="vertical-align: top;">
                <div style="font-weight: bold; font-size: 16px; color: #334155; margin-bottom: 4px;">
                  ${firstName} ${lastName}
                </div>
                <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                  AI Sales Coach
                </div>
                ${phone ? `
                <div style="color: #64748b; font-size: 14px; margin-bottom: 6px;">
                  📞 ${phone}
                </div>
                ` : ''}
                <div style="color: #64748b; font-size: 14px; margin-bottom: 6px;">
                  📧 ${coachEmail}
                </div>
                <div style="margin-top: 12px;">
                  <strong style="color: #667eea;">SalesCoaches.ai</strong>
                </div>
                <div style="margin-top: 8px;">
                  <a href="https://df678479-6117-41c6-822f-9aab26a810e5.lovableproject.com/coach-call?coach=${encodeURIComponent(coachName)}&email=${encodeURIComponent(coachEmail)}&phone=${encodeURIComponent(phone || '')}&image=${encodeURIComponent(imageUrl || '')}" 
                     style="display: inline-block; background-color: #667eea; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600;">
                    📞 Talk to Coach
                  </a>
                </div>
                <div style="color: #94a3b8; font-size: 12px; margin-top: 8px; font-style: italic;">
                  Powered by AI • Optimized for Results • Available 24/7
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;
    };

    const signature = generateSignature(coachName, coachPhone, coachImageUrl);

    // Create email with text message and HTML signature
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="color: #333; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">
${message}
        </div>
        ${signature}
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: `${coachName} <${coachEmail}>`,
      to: [to],
      subject: subject,
      html: emailHtml,
      reply_to: coachEmail,
    });

    console.log("Coach email sent successfully:", emailResponse);

    // Store email in conversation history if userId provided
    if (userId) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        await supabase.from('email_conversations').insert({
          user_id: userId,
          coach_name: coachName,
          coach_email: coachEmail,
          recipient_email: to,
          subject: subject,
          message: message,
          email_id: emailResponse.data?.id,
          sent_at: new Date().toISOString()
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: 'Email sent successfully' 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-coach-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);