import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCoach, storeAssistantConfig, updateCoachWithAgent } from "./db.ts";
import { createElevenLabsAgent, createElevenLabsTool, updateElevenLabsAgent } from "./elevenlabs.ts";
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
    }
  });
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  }
  try {
    const body = await req.json().catch(()=>null);
    if (!body) return jsonResponse({
      error: "Missing JSON body"
    }, 400);
    const { name, email, description, avatar_url, owner_user_id, is_draft, ...assistantData } = body;
    console.log("Step 1: Create coach");
    const coach = await createCoach({
      name,
      email,
      description,
      avatar_url,
      owner_user_id,
      is_draft
    });
    console.log("Step 2: Store assistant config");
    await storeAssistantConfig(coach.id, assistantData);
    console.log("Step 3: Create ElevenLabs Agent");
    const agentId = await createElevenLabsAgent(coach, assistantData);
    console.log("Step 4: Create ElevenLabs Tool");
    // Build coachConfig dynamically instead of hardcoding
    const coachConfig = {
      coachId: coach.id,
      coachName: coach.name,
      coachingStyle: assistantData.coachingStyle || "default",
      roastingLevel: assistantData.roastingLevel || "1",
      customInstructions: assistantData.customInstructions || "",
      firstMessage: assistantData.firstMessage || "Hi! I’m here to help you.",
      industry: assistantData.industry || "general",
      methodology: assistantData.methodology || "default",
      phone: assistantData.phone || null,
      avatarUrl: coach.avatar_url,
      agentId: agentId
    };
    // Pass the dynamic object to tool creation
    const tool = await createElevenLabsTool(coach.id, coachConfig, owner_user_id);
    const toolId = tool.id;
    console.log("Step 5: Update agent system prompt & attach tool");
    const previousPrompt = assistantData.system_prompt || "";
    const CALLPROOF_TOOL = tool.tool_config.name;
    await updateElevenLabsAgent(agentId, toolId, previousPrompt, CALLPROOF_TOOL);
    console.log("Step 6: Update agent id in coach table");
    const newSystemPrompt = `${previousPrompt}
    ---
IMPORTANT:
If the user asks anything related to real-time database data and other CRM realtime data, use the '${CALLPROOF_TOOL}' custom tool.
1. Use the appropriate tool (e.g., ${CALLPROOF_TOOL}) to retrieve the requested details.
2. Before showing results, display a short "WAITING MESSAGES" so the user feels the system is fetching data in real time. 
   Examples:
   - "Just a moment, I’m pulling up the details for you "
   - "Hang tight, fetching the info right now "
   - "One sec, I’m grabbing the records for you "
3. Once the data is retrieved, present it clearly and organized.
4. Add a sweet, warm CLOSING MESSAGES after the results. 
   Examples:
   - "Here you go! I pulled up the details for you "
   - "Found it for you  Hope this helps you out!"
   - "All set Let me know if you’d like me to dig deeper!"
Rotate the WAITING MESSAGES and SWEET CLOSING MESSAGES so the interaction feels natural.

Example:
CallProof: "Help me find John doe's call details in CallProof."
HubSpot: "Show all activities and calls related to John doe in HubSpot."
Zoho CRM: "Retrieve John doe's recent calls and notes in Zoho CRM."
Salesforce: "Get all logged calls and meeting details for John doe in Salesforce.",
→ Check with '${CALLPROOF_TOOL}'`;
    await updateCoachWithAgent(coach.id, agentId, newSystemPrompt);
    console.log("Coach, assistant, ElevenLabs agent, and tool created successfully");
    return jsonResponse({
      coach,
      agent_id: agentId,
      tool_id: toolId,
      message: "Coach, assistant, ElevenLabs agent, and tool created successfully"
    });
  } catch (err) {
    console.error("Error creating coach agent flow:", err);
    return jsonResponse({
      error: err.message
    }, 500);
  }
});
