import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Test email function called');
    
    const resendKey = Deno.env.get("RESEND_API_KEY");
    console.log('RESEND_API_KEY exists:', !!resendKey);
    
    if (!resendKey) {
      throw new Error('RESEND_API_KEY not found');
    }

    const emailResponse = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: ["robert@goabsolutewireless.com"],
      subject: "Test Email",
      html: "<h1>Test Email</h1><p>This is a test email from your coach system.</p>",
    });

    console.log('Email response:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Test email sent successfully",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in test-email function:", error);
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