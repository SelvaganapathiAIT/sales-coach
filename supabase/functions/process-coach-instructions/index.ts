import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const CALLPROOF_API_KEY = Deno.env.get('CALLPROOF_API_KEY');
const CALLPROOF_API_SECRET = Deno.env.get('CALLPROOF_API_SECRET');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstructionRequest {
  coachEmail: string;
  fromEmail: string;
  subject: string;
  instructions: string;
  targetUserEmail?: string;
  taskType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachEmail, fromEmail, subject, instructions, targetUserEmail, taskType }: InstructionRequest = await req.json();
    const normalizedTargetEmail = targetUserEmail?.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store the instruction
    const { data: instruction, error: insertError } = await supabase
      .from('coach_instructions')
      .insert({
        coach_email: coachEmail,
        from_email: fromEmail,
        subject: subject,
        instructions: instructions,
        target_user_email: targetUserEmail,
        task_type: taskType || 'general',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Process the instruction based on type
    let response = '';
    if (taskType === 'accountability' && normalizedTargetEmail) {
      response = await generateAccountabilityReport(supabase, instruction.id, normalizedTargetEmail);
    } else {
      response = await processGeneralInstruction(instructions, targetUserEmail);
    }

    // Decide recipient: accountability -> target user; otherwise reply to sender
    const toEmail = (taskType === 'accountability' && normalizedTargetEmail) ? normalizedTargetEmail : fromEmail;

    // Build a natural subject based on the request
    let outgoingSubject = subject;
    let addReplyPrefix = true;
    if (taskType === 'accountability' && normalizedTargetEmail) {
      outgoingSubject = (subject && subject.trim().length > 0)
        ? subject.trim()
        : `Accountability Check-in for ${normalizedTargetEmail}`;
      addReplyPrefix = false; // curated subject, no automatic "Re:" prefix
    }

    // Send response email
    const emailId = await sendCoachResponse(coachEmail, toEmail, outgoingSubject, response, addReplyPrefix);

    // Log email conversation (ensure stable user id)
    try {
      const userId = await getOrCreateUserIdByEmail(supabase, toEmail);
      // Try to get coach name from app settings; fallback to mailbox local part
      let coachName = coachEmail.split('@')[0];
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'default_home_coach')
        .maybeSingle();
      if (setting?.value?.name) coachName = setting.value.name;

      await supabase.from('email_conversations').insert({
        user_id: userId,
        coach_name: coachName,
        coach_email: coachEmail,
        recipient_email: toEmail,
        subject,
        message: response,
        email_id: emailId ?? null,
        sent_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.error('Failed to log email conversation:', logErr);
    }

    // Update instruction status
    await supabase
      .from('coach_instructions')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        response_sent_at: new Date().toISOString()
      })
      .eq('id', instruction.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Instruction processed and response sent',
      instructionId: instruction.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error processing coach instruction:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function generateAccountabilityReport(supabase: any, instructionId: string, targetUserEmail: string) {
  try {
    // Get user profile
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', targetUserEmail)
      .order('created_at', { ascending: true })
      .limit(1);
    const profile = profiles?.[0];

    if (!profile) {
      return `I couldn't find a user profile for ${targetUserEmail}. Please ensure they are registered in the system.`;
    }

    let callproofData = null;
    
    // Get CallProof data if available
    if (profile.callproof_enabled && CALLPROOF_API_KEY && CALLPROOF_API_SECRET) {
      try {
        callproofData = await getCallProofActivity(targetUserEmail);
      } catch (error) {
        console.error('Error fetching CallProof data:', error);
      }
    }

    // Generate report
    const reportData = {
      user_email: targetUserEmail,
      profile: profile,
      callproof_data: callproofData,
      report_generated_at: new Date().toISOString()
    };

    const goalsAnalysis = analyzeGoalsProgress(profile, callproofData);
    const recommendations = generateRecommendations(profile, callproofData);

    // Store accountability report
    await supabase
      .from('accountability_reports')
      .insert({
        instruction_id: instructionId,
        target_user_email: targetUserEmail,
        report_data: reportData,
        goals_analysis: goalsAnalysis,
        recommendations: recommendations
      });

    return formatAccountabilityResponse(targetUserEmail, profile, callproofData, goalsAnalysis, recommendations);
  } catch (error) {
    console.error('Error generating accountability report:', error);
    return `I encountered an error while generating the accountability report for ${targetUserEmail}. Please try again later.`;
  }
}

async function getCallProofActivity(userEmail: string) {
  if (!CALLPROOF_API_KEY || !CALLPROOF_API_SECRET) {
    throw new Error('CallProof API credentials not configured');
  }

  const url = new URL('https://app.callproof.com/api/calls');
  url.searchParams.append('key', CALLPROOF_API_KEY);
  url.searchParams.append('secret', CALLPROOF_API_SECRET);
  url.searchParams.append('rep_email', userEmail);
  url.searchParams.append('limit', '50');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`CallProof API error: ${response.status}`);
  }

  return await response.json();
}

function analyzeGoalsProgress(profile: any, callproofData: any): string {
  const analysis = [];
  
  if (callproofData && callproofData.data) {
    const recentCalls = callproofData.data.filter((call: any) => {
      const callDate = new Date(call.created_at || call.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return callDate >= weekAgo;
    });

    analysis.push(`📊 **Activity Summary (Last 7 Days):**`);
    analysis.push(`• Total Calls: ${recentCalls.length}`);
    
    const avgCallsPerDay = (recentCalls.length / 7).toFixed(1);
    analysis.push(`• Average Calls/Day: ${avgCallsPerDay}`);

    if (recentCalls.length < 10) {
      analysis.push(`⚠️ **Below Expected Activity:** Only ${recentCalls.length} calls this week. Target should be 15-20 calls.`);
    } else if (recentCalls.length >= 20) {
      analysis.push(`✅ **Excellent Activity:** ${recentCalls.length} calls this week exceeds targets!`);
    } else {
      analysis.push(`✅ **Good Activity:** ${recentCalls.length} calls this week is on track.`);
    }

    // Analyze call outcomes
    const successfulCalls = recentCalls.filter((call: any) => 
      call.outcome && (call.outcome.toLowerCase().includes('success') || call.outcome.toLowerCase().includes('interested'))
    );
    
    if (successfulCalls.length > 0) {
      analysis.push(`🎯 **Success Rate:** ${successfulCalls.length}/${recentCalls.length} calls had positive outcomes`);
    }
  } else {
    analysis.push(`📊 **CallProof Integration:** Not connected or no recent activity data available.`);
    analysis.push(`⚠️ **Recommendation:** Connect CallProof integration to track detailed activity metrics.`);
  }

  return analysis.join('\n');
}

function generateRecommendations(profile: any, callproofData: any): string {
  const recommendations = [];
  
  recommendations.push(`🎯 **Recommendations for ${profile.email}:**`);
  
  if (callproofData && callproofData.data) {
    const recentCalls = callproofData.data.filter((call: any) => {
      const callDate = new Date(call.created_at || call.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return callDate >= weekAgo;
    });

    if (recentCalls.length < 15) {
      recommendations.push(`1. **Increase Call Volume:** Aim for 3-4 calls daily to reach weekly target of 20 calls`);
      recommendations.push(`2. **Morning Block:** Schedule 2-hour morning block for prospecting calls`);
    }
    
    if (recentCalls.length > 0) {
      const avgCallDuration = recentCalls.reduce((sum: number, call: any) => sum + (call.duration || 0), 0) / recentCalls.length;
      if (avgCallDuration < 300) { // Less than 5 minutes
        recommendations.push(`3. **Call Quality:** Average call duration is low. Focus on better discovery questions`);
      }
    }
  } else {
    recommendations.push(`1. **Setup CallProof:** Connect CallProof integration to track calls and progress`);
    recommendations.push(`2. **Daily Goals:** Set target of 4 calls per day minimum`);
    recommendations.push(`3. **Activity Tracking:** Log all sales activities for accountability`);
  }

  recommendations.push(`4. **Follow-up:** Schedule weekly 1:1 coaching session to review progress`);
  recommendations.push(`5. **Resources:** Review objection handling techniques and closing strategies`);

  return recommendations.join('\n');
}

function formatAccountabilityResponse(targetEmail: string, profile: any, callproofData: any, analysis: string, recommendations: string): string {
  return `
**Accountability Report for ${targetEmail}**

${analysis}

${recommendations}

**Next Steps:**
• Schedule follow-up call to discuss findings
• Set specific weekly targets and check-in schedule  
• Review CRM data for pipeline health
• Focus coaching on identified improvement areas

This report was generated automatically. For detailed coaching, schedule a one-on-one session.

Best regards,
Your AI Sales Coach
`.trim();
}

async function processGeneralInstruction(instructions: string, targetUserEmail?: string): string {
  // Simple instruction processing for general tasks
  const response = `Thank you for the instruction. I understand you want me to:

${instructions}

${targetUserEmail ? `I will focus my coaching efforts on ${targetUserEmail}.` : 'I will apply this to my general coaching approach.'}

I'll implement this guidance in our coaching sessions and follow up with progress updates.

Best regards,
Your AI Sales Coach`;

  return response;
}

async function getOrCreateUserIdByEmail(supabase: any, email: string): Promise<string> {
  // Ensure we have a stable user_id for the given email
  const normalized = email?.trim().toLowerCase();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, created_at')
    .ilike('email', normalized)
    .order('created_at', { ascending: true })
    .limit(1);

  let profile = profiles?.[0];

  if (!profile) {
    const newUserId = crypto.randomUUID();
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        email: normalized,
        company_name: 'Email User',
        role: 'Customer',
        user_id: newUserId,
      })
      .select()
      .single();
    return newUserId;
  }

  if (!profile.user_id) {
    const newUserId = crypto.randomUUID();
    const { data: updated } = await supabase
      .from('profiles')
      .update({ user_id: newUserId })
      .eq('id', profile.id)
      .select()
      .single();
    return newUserId;
  }

  return profile.user_id;
}

async function sendCoachResponse(coachEmail: string, toEmail: string, originalSubject: string, responseMessage: string, addReplyPrefix: boolean = true): Promise<string | null> {
  try {
    const finalSubject = addReplyPrefix ? (originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`) : originalSubject;

    const emailResponse = await resend.emails.send({
      from: `${coachEmail.split('@')[0]} <${coachEmail}>`,
      to: [toEmail],
      subject: finalSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="white-space: pre-wrap; line-height: 1.6;">
${responseMessage}
          </div>
        </div>
      `,
      reply_to: coachEmail,
    });

    return emailResponse.data?.id ?? null;
  } catch (error) {
    console.error('Error sending coach response:', error);
    throw error;
  }
}

serve(handler);