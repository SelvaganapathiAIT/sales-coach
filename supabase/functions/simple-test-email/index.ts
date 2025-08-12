import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to fetch CallProof weekly summary
const fetchCallProofWeeklySummary = async (userEmail: string) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's CallProof credentials
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('callproof_api_key, callproof_api_secret, callproof_enabled')
      .eq('email', userEmail)
      .single();

    if (error || !profile?.callproof_enabled || !profile?.callproof_api_key) {
      console.log('CallProof not configured for user:', userEmail, 'Error:', error, 'Profile:', profile);
      return null;
    }

    console.log('Found CallProof credentials for user:', userEmail);
    console.log('API Key:', profile.callproof_api_key?.substring(0, 8) + '...');

    // Calculate date range for last week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    console.log('Fetching CallProof calls from', formatDate(startDate), 'to', formatDate(endDate));

    // Fetch calls from CallProof API
    const callsResponse = await fetch(`https://api.callproof.com/v1/calls`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${profile.callproof_api_key}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('CallProof calls API response status:', callsResponse.status);
    
    if (!callsResponse.ok) {
      const errorText = await callsResponse.text();
      console.error('CallProof API error:', callsResponse.status, errorText);
      return null;
    }

    const callsData = await callsResponse.json();
    console.log('CallProof calls data received:', callsData?.calls?.length || 0, 'total calls');
    
    // Filter calls for last week
    const weekCalls = callsData.calls?.filter((call: any) => {
      const callDate = new Date(call.created_at);
      return callDate >= startDate && callDate <= endDate;
    }) || [];

    // Calculate stats
    const totalCalls = weekCalls.length;
    const connectedCalls = weekCalls.filter((call: any) => call.status === 'connected' || call.duration > 0);
    const connectRate = totalCalls > 0 ? Math.round((connectedCalls.length / totalCalls) * 100) : 0;
    const totalDuration = weekCalls.reduce((sum: number, call: any) => sum + (call.duration || 0), 0);
    const avgCallLength = connectedCalls.length > 0 ? Math.round(totalDuration / connectedCalls.length / 60) : 0;

    // Fetch opportunities/deals
    const dealsResponse = await fetch(`https://api.callproof.com/v1/deals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${profile.callproof_api_key}`,
        'Content-Type': 'application/json',
      },
    });

    let opportunities = [];
    if (dealsResponse.ok) {
      const dealsData = await dealsResponse.json();
      opportunities = dealsData.deals?.filter((deal: any) => 
        deal.status !== 'closed_lost' && deal.status !== 'closed_won'
      ).slice(0, 4) || [];
    }

    return {
      weeklyStats: {
        totalCalls,
        totalDuration: `${Math.floor(totalDuration / 3600)} hours ${Math.floor((totalDuration % 3600) / 60)} minutes`,
        connectRate: `${connectRate}%`,
        averageCallLength: `${avgCallLength} minutes`
      },
      opportunities: opportunities.map((deal: any) => ({
        name: deal.name || 'Untitled Opportunity',
        value: deal.value ? `$${Number(deal.value).toLocaleString()}` : 'Value TBD',
        stage: deal.stage || deal.status || 'In Progress',
        lastActivity: deal.last_activity || 'Recent activity'
      }))
    };
  } catch (error) {
    console.error('Error fetching CallProof data:', error);
    return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Simple test email function called');
    
    // Temporarily skip CallProof data to test basic email delivery
    console.log('Skipping CallProof data fetch for testing');
    const callProofData = null;
    
    const emailResponse = await resend.emails.send({
      from: "bobby.hartline@salescoaches.ai",
      to: ["robert@callproof.com"],
      subject: "Welcome to Your Personal Sales Coaching Journey!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Hello Robert!</h2>
          
          <p>I'm Bobby Hartline, your personal AI sales coach, and I'm thrilled to be working with you and your team at Go Absolute Wireless.</p>
          
          <p>I understand you're in the wireless solutions business, helping customers stay connected with the technology they need. That's an industry where building trust and understanding customer pain points is absolutely crucial for success.</p>
          
          ${callProofData ? `
          <h3 style="color: #2563eb;">Your Last Week in Review</h3>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${callProofData.weeklyStats.totalCalls}</div>
                <div style="font-size: 12px; color: #6b7280;">Total Calls</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${callProofData.weeklyStats.connectRate}</div>
                <div style="font-size: 12px; color: #6b7280;">Connect Rate</div>
              </div>
            </div>
            <div style="font-size: 14px; color: #4b5563;">
              <strong>Total Talk Time:</strong> ${callProofData.weeklyStats.totalDuration} | 
              <strong>Avg Call Length:</strong> ${callProofData.weeklyStats.averageCallLength}
            </div>
          </div>
          
          <h3 style="color: #2563eb;">Active Opportunities You're Working</h3>
          <div style="margin: 15px 0;">
            ${callProofData.opportunities.map(opp => `
              <div style="border-left: 3px solid #10b981; padding: 12px; margin: 8px 0; background-color: #f0fdf4;">
                <div style="font-weight: bold; color: #065f46;">${opp.name} - ${opp.value}</div>
                <div style="font-size: 13px; color: #059669; margin-top: 4px;">
                  <strong>Stage:</strong> ${opp.stage} | <strong>Last Activity:</strong> ${opp.lastActivity}
                </div>
              </div>
            `).join('')}
          </div>
          ` : `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">Ready to Connect Your CallProof Account?</h3>
            <p style="color: #92400e; margin-bottom: 0;">Once you connect your CallProof account, I'll be able to show you personalized insights about your recent calls, conversion rates, and active opportunities right here in our communications.</p>
          </div>
          `}
          
          <h3 style="color: #2563eb;">CallProof Integration Insights</h3>
          <p>I've been integrated with your CallProof system, which means I can analyze your actual sales conversations and provide you with:</p>
          <ul>
            <li>Real-time feedback on your call performance</li>
            <li>Insights into customer objections and how to overcome them</li>
            <li>Analysis of your closing techniques and conversion rates</li>
            <li>Personalized coaching based on your actual conversations</li>
          </ul>
          
          <h3 style="color: #2563eb;">Coaching Focus Areas for the Wireless Industry</h3>
          <p>Based on your industry, I'll be focusing on:</p>
          <ul>
            <li>🎯 Technical product knowledge and benefit selling</li>
            <li>📱 Overcoming price objections in competitive markets</li>
            <li>🤝 Building long-term customer relationships and retention</li>
            <li>🚀 Cross-selling and upselling wireless services</li>
            <li>📞 Consultative selling for complex wireless solutions</li>
          </ul>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2563eb; margin-top: 0;">Ready to Start Coaching?</h3>
            <p style="margin-bottom: 15px;">Click the button below to begin your first coaching session:</p>
            <a href="https://salescoaches.ai/start-coaching" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Coaching Now</a>
          </div>
          
          <p>I'm here to help you close more deals and grow your wireless business. Let's get started!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <strong>Bobby Hartline</strong><br>
            <em>AI Sales Coach</em><br>
            📧 bobby.hartline@salescoaches.ai<br>
            🌐 <a href="https://salescoaches.ai" style="color: #2563eb;">salescoaches.ai</a><br>
            <br>
            <a href="https://salescoaches.ai/talk-to-coach" style="display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold; margin: 10px 0;">💬 Talk to Your Coach</a>
            <br>
            <div style="font-size: 12px; color: #6b7280; margin-top: 15px;">
              <strong>About Your Coach:</strong> I'm an AI sales coach trained on decades of proven sales methodologies and real-world experience. I specialize in helping wireless industry professionals like yourself close more deals and build stronger customer relationships through CallProof integration and personalized coaching.
            </div>
          </div>
        </div>
      `,
    });

    console.log('Resend response:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Simple test email sent",
      data: emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error:", error);
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