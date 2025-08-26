import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
export async function createCoach(data) {
  const { data: coach, error } = await supabase.from("coaches").insert([
    data
  ]).select().single();
  if (error) throw error;
  return coach;
}
export async function storeAssistantConfig(coachId, assistantData) {
  const { error } = await supabase.from("coach_assistants").insert([
    {
      coach_id: coachId,
      ...assistantData
    }
  ]);
  if (error) throw error;
}
export async function updateCoachWithAgent(coachId, agentId,newSystemPrompt) {
  const { error } = await supabase.from("coaches").update({
    agent_id: agentId
  }).eq("id", coachId);
  if (error) throw error;

  const { assist_error } = await supabase.from("coach_assistants").update({
    system_prompt: newSystemPrompt
  }).eq("id", coachId);
  if (assist_error) throw assist_error;
}
