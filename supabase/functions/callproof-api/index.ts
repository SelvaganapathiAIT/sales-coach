// /supabase/functions/callproof-api/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "npm:openai";
// Import helpers
import { actionMappings } from "./config.ts";
import { jsonResponse, mask, normalizeCompletedForAppointments, buildAuthHeaders, fmtYYYYMMDD, ymdToDMY } from "./utils.ts";
import { packTopics, unpackTopics, preClassify } from "./context.ts";
import { getProfileAndClient, fetchLastConversation, insertConversation, fetchSystemPrompt } from "./supabase.ts";
import { classifyPrompt, summarizeParsed, generateConversationSummary } from "./llm.ts";
import { buildAccountListBody, resolveContactId, resolveContactAndPhoneId } from "./api.ts";
const API_BASE = Deno.env.get("API_BASE_URL");
const LOG_PREFIX = "[callproof-api]";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});
// Handle next page requests for pagination
async function handleNextPageRequest(lastCtx, apiHeaders, openai, sys_prompt,coachId) {
  console.log(`${LOG_PREFIX} ⇢ Handling next page request`);
  const paginationInfo = lastCtx.paginationInfo;
  if (!paginationInfo || !paginationInfo.hasNextPage) {
    return jsonResponse({
      error: "No more pages available"
    }, 400);
  }
  const nextPage = paginationInfo.currentPage + 1;
  const url = `${API_BASE}/ai/salescoach/call-log`;
  const callBody = {
    ...paginationInfo.callBody,
    page: nextPage
  };
  console.log(`${LOG_PREFIX} ⇢ Fetching page ${nextPage}/${paginationInfo.totalPages}`);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(callBody)
    });
    const data = await resp.json().catch(()=>({}));
    let calls = [];
    if (Array.isArray(data?.data)) {
      calls = data.data.flatMap((day)=>day.call_data || []);
    }
    const finalData = {
      calls,
      pagination: {
        currentPage: nextPage,
        totalPages: paginationInfo.totalPages,
        totalItems: paginationInfo.totalItems,
        hasNextPage: data?.hasNextPage || false,
        callBody: callBody
      }
    };
    // Generate summary for this page
    const summary = await summarizeParsed({
      type: "activity",
      userId: lastCtx.userId
    }, finalData, "activity", openai, sys_prompt, {
      ...lastCtx
    },coachId);
    // Update context with new pagination info
    const newContext = {
      ...lastCtx,
      paginationInfo: finalData.pagination,
      nextFollowUp: finalData.pagination.hasNextPage ? `You have ${paginationInfo.totalPages} total pages. Would you like to see page ${nextPage + 1}?` : null
    };
    console.log(`${LOG_PREFIX} ⇢ Context stored:`, newContext);
    return jsonResponse({
      response: summary,
      context: newContext,
      pagination: finalData.pagination
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} ⇢ Next page error:`, error);
    return jsonResponse({
      error: "Failed to fetch next page"
    }, 500);
  }
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { prompt, userId, coachId } = await req.json();
    console.log(`${LOG_PREFIX} ⇢ Prompt:`, prompt);
    console.log(`${LOG_PREFIX} ⇢ userId:`, userId);
    if (!prompt || !userId) {
      return jsonResponse({
        error: "Missing prompt or userId"
      }, 400);
    }
    // Get profile
    const { supabase, profile, error } = await getProfileAndClient(userId);
    if (error || !profile) {
      return jsonResponse({
        error: "Profile not found"
      }, 404);
    }
    if (!profile.callproof_enabled || !profile.callproof_api_key || !profile.callproof_api_secret) {
      return jsonResponse({
        error: "CallProof not connected"
      }, 400);
    }
    // Only fetch system prompt if coachId is provided and is a valid UUID
    let sys_prompt = '';
    if (coachId && coachId !== "undefined" && coachId.trim() !== "") {
      // Basic UUID format validation
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(coachId.trim())) {
        sys_prompt = await fetchSystemPrompt(supabase, coachId.trim());
        console.log(`${LOG_PREFIX} ⇢ System prompt fetched for coach ${coachId}:`, sys_prompt ? "Found" : "Not found");
      } else {
        console.warn(`${LOG_PREFIX} ⇢ Invalid coachId format:`, coachId);
      }
    }
    const apiHeaders = buildAuthHeaders(profile.callproof_api_key, profile.callproof_api_secret);
    console.log(`${LOG_PREFIX} ⇢ API_KEY: ${mask(profile.callproof_api_key)} API_SECRET: ${mask(profile.callproof_api_secret)}`);
    // Load last conversation context
    const lastConv = await fetchLastConversation(supabase, userId);
    const lastCtx = unpackTopics(lastConv?.last_topics);
    console.log(`${LOG_PREFIX} ⇢ Last context:`, lastCtx);
    // Get recent conversation history for follow-up handling
    const recentMessages = [];
    if (lastConv?.conversation_summary) {
      recentMessages.push({
        type: 'assistant',
        content: lastConv.conversation_summary
      });
    }
    // Pre-classify + GPT classify
    const pre = preClassify(prompt);
    const parsed = await classifyPrompt(prompt, {
      lastContactId: lastCtx.contactId,
      lastFollowUp: lastCtx.lastFollowUp,
      nextFollowUp: lastCtx.nextFollowUp
    }, openai, recentMessages);
    parsed.userId = userId;
    // Use pre-classification as fallback
    if (pre && !parsed.action && !parsed.type) {
      if (pre === "activity") {
        parsed.type = "activity";
      } else if (pre === "general") {
        parsed.type = "general";
      } else if (pre === "stats") {
        parsed.type = "stats";
      } else {
        parsed.type = "crm";
        parsed.action = pre;
      }
    }
    console.log(`${LOG_PREFIX} ⇢ Final parsed:`, parsed);
    // Check for "next page" requests
    const isNextPageRequest = /^(yes|ok|yep|sure|next|more|continue)$/i.test(prompt.trim()) && lastCtx.nextFollowUp && /next page/i.test(lastCtx.nextFollowUp);
    if (isNextPageRequest && lastCtx.paginationInfo) {
      console.log(`${LOG_PREFIX} ⇢ Next page request detected`);
      // Handle next page fetch
      return await handleNextPageRequest(lastCtx, apiHeaders, openai, sys_prompt,coachId);
    }
    const type = parsed?.type || "crm";
    let finalData = null;
    let summary = "";
    let currentContactInfo = null;
    // ---------------- CRM ----------------
    if (type === "crm") {
      const action = parsed.action;
      const config = actionMappings[action];
      if (!config) {
        return jsonResponse({
          error: `Unknown action: ${action}`
        }, 400);
      }
      let contactId = null;
      if (config.needsContactId) {
        contactId = parsed.contact_id ?? await resolveContactId(parsed, apiHeaders, lastCtx, prompt);
        if (!contactId) {
          return jsonResponse({
            error: "Contact not found",
            parsed
          }, 404);
        }
      }
      const path = config.path(contactId ?? undefined);
      let url = `${API_BASE}${path}`;
      const method = config.method;
      let params;
      if (action === "contact_search") {
        params = buildAccountListBody(parsed);
      } else {
        params = {
          ...parsed.params ?? {}
        };
        if (config.dateHints) {
          const { startParam, endParam } = config.dateHints;
          if (action === "tasks") {
            if (parsed.start_date) {
              const formattedStart = ymdToDMY(parsed.start_date);
              if (formattedStart) params[startParam] = formattedStart;
            }
            if (parsed.end_date) {
              const formattedEnd = ymdToDMY(parsed.end_date);
              if (formattedEnd) params[endParam] = formattedEnd;
            }
          // if (parsed.start_date) params[startParam] = parsed.start_date;
          // if (parsed.end_date) params[endParam] = parsed.end_date;
          } else if (action === "appointments") {
            const startVal = parsed.start || parsed.start_date;
            const endVal = parsed.end || parsed.end_date;
            if (startVal) params[startParam] = startVal;
            if (endVal) params[endParam] = endVal;
          }
        }
        if (action === "appointments" && parsed.completed !== undefined) {
          const boolCompleted = normalizeCompletedForAppointments(parsed.completed);
          if (typeof boolCompleted === "boolean") {
            params.completed = boolCompleted;
          }
        }
        if (action === "tasks") {
          if (parsed.task_status !== undefined) {
            params.task_status = Number(parsed.task_status);
          } else if (parsed.completed !== undefined) {
            const n = Number(parsed.completed);
            if (!Number.isNaN(n)) {
              params.task_status = n === 1 ? 1 : 0;
            }
          }
          if (parsed.task_type) params.task_type = parsed.task_type;
        }
        if (parsed.limit !== undefined) params.limit = String(parsed.limit);
      }
      let body;
      if (method === "GET") {
        const qs = new URLSearchParams(Object.entries(params).filter(([, v])=>v !== undefined && v !== null && v !== "").map(([k, v])=>[
            k,
            String(v)
          ]));
        if (qs.toString()) url += `?${qs.toString()}`;
      } else {
        body = JSON.stringify(params);
      }
      console.log(`${LOG_PREFIX} ⇢ CRM Request:`, {
        method,
        url,
        params
      });
      const resp = await fetch(url, {
        method,
        headers: apiHeaders,
        body
      });
      console.log(`${LOG_PREFIX} ⇢ API status:`, resp.status);
      let res = await resp.json().catch(()=>({}));
      // Handle 400 retry pattern for account-list
      if (url.includes("account-list") && res?.clientStatusCode === 400 && Array.isArray(res?.search_field) && res.search_field.length > 0) {
        const firstContactId = res.search_field[0]?.contact_id;
        if (firstContactId) {
          console.log(`${LOG_PREFIX} ⇢ Retrying account-list with contact_id=${firstContactId}`);
          const retryPayload = {
            contact_id: firstContactId
          };
          const retryRes = await fetch(url, {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify(retryPayload)
          });
          const newresponse = await retryRes.json().catch(()=>({}));
          res = newresponse;
        }
      }
      finalData = res;
      summary = await summarizeParsed(parsed, finalData, "crm", openai, sys_prompt, {
        ...lastCtx,
        lastFollowUp: lastCtx.nextFollowUp
      },coachId);
      // Extract contact info for context storage
      if (action === "contact_search" && finalData) {
        const first = Array.isArray(finalData) ? finalData[0] : Array.isArray(finalData?.data) ? finalData.data[0] : finalData?.data ?? finalData ?? {};
        if (first?.contact_id || first?.id) {
          currentContactInfo = {
            contactId: first?.contact_id ?? first?.id,
            phoneId: first?.phone_id ?? first?.contact_phone_id,
            companyName: first?.company_name ?? first?.CompanyName
          };
        }
      } else if (contactId) {
        currentContactInfo = {
          contactId,
          phoneId: lastCtx.phoneId,
          companyName: lastCtx.company_name,
          nextFollowUp: lastCtx.nextFollowUp,
          lastFollowUp: lastCtx.lastFollowUp
        };
      }
    } else if (type === "activity") {
      console.log(`${LOG_PREFIX} ⇢ Activity flow`);
      const fromDate = parsed?.from_date || fmtYYYYMMDD(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const toDate = parsed?.to_date || fmtYYYYMMDD(new Date());
      const limit = parsed?.limit || 50;
      console.log(`${LOG_PREFIX} ⇢ Using date range: ${fromDate} to ${toDate}`);
      finalData = {
        calls: [],
        messages: [],
        appointments: [],
        stats: []
      };
      // Handle contact search - use context if referring to "this contact/account"
      let searchTerm = parsed.contact;
      let contactId = null;
      let phoneId = null;
      if (/\b(this|that)\s+(contact|account|lead|company)\b/i.test(searchTerm || "") && lastCtx.contactId) {
        contactId = lastCtx.contactId;
        phoneId = lastCtx.phoneId;
        searchTerm = lastCtx.company_name;
        console.log(`${LOG_PREFIX} ⇢ Using context for activity: contactId=${contactId}, company=${searchTerm}`);
      } else if (searchTerm && searchTerm !== "this contact") {
        const resolved = await resolveContactAndPhoneId(apiHeaders, searchTerm, lastCtx);
        contactId = resolved.contactId;
        phoneId = resolved.phoneId;
        searchTerm = resolved.companyName || searchTerm;
        console.log(`${LOG_PREFIX} ⇢ Resolved for activity: contactId=${contactId}, phoneId=${phoneId}, company=${searchTerm}`);
      }
      // Handle calls with pagination for comprehensive reports
      const shouldIncludeCalls = parsed.include_calls !== false;
      if (shouldIncludeCalls) {
        const fd = ymdToDMY(fromDate);
        const td = ymdToDMY(toDate);
        let url = `${API_BASE}/ai/salescoach/call-log`;
        const callBody = {
          call_type: parsed.call_type ?? 0,
          from_date: fd,
          to_date: td,
          search: searchTerm || ''
        };
        console.log(`${LOG_PREFIX} ⇢ Calls Request:`, {
          url,
          callBody
        });
        try {
          // Fetch first page to check pagination
          const resp = await fetch(url, {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify(callBody)
          });
          const data = await resp.json().catch(()=>({}));
          console.log(`${LOG_PREFIX} ⇢ Call-log response:`, data);
          let allCalls = [];
          // Extract calls from first page
          if (Array.isArray(data?.data)) {
            allCalls = data.data.flatMap((day)=>day.call_data || []);
          } else if (Array.isArray(data)) {
            allCalls = data;
          } else if (data?.call_data) {
            allCalls = data.call_data;
          }
          finalData.calls = allCalls;
          // Store pagination info for progressive loading
          if (data?.hasNextPage && data?.pageCount > 1) {
            finalData.pagination = {
              currentPage: data?.pageNumber || 1,
              totalPages: data?.pageCount,
              totalItems: data?.totalItemCount,
              hasNextPage: data?.hasNextPage,
              nextPageUrl: data?.next_page_url,
              callBody: callBody // Store for next page request
            };
            console.log(`${LOG_PREFIX} ⇢ Pagination info stored: page ${finalData.pagination.currentPage}/${finalData.pagination.totalPages} (${finalData.pagination.totalItems} total calls)`);
          }
          console.log(`${LOG_PREFIX} ⇢ Found ${finalData.calls.length} calls total`);
        } catch (callError) {
          console.error(`${LOG_PREFIX} ⇢ Call-log error:`, callError);
        }
      }
      // Handle messages/SMS
      const shouldIncludeMessages = parsed.include_messages || /\b(sms|message|text|conversation)\b/i.test(prompt);
      if (shouldIncludeMessages && contactId && phoneId) {
        console.log(`${LOG_PREFIX} ⇢ Fetching messages for contactId=${contactId}, phoneId=${phoneId}`);
        try {
          const messageUrl = `${API_BASE}/ai/salescoach/message-conversation/${contactId}/${phoneId}`;
          const messageResp = await fetch(messageUrl, {
            method: "GET",
            headers: apiHeaders
          });
          const messageData = await messageResp.json().catch(()=>({}));
          console.log(`${LOG_PREFIX} ⇢ Message response:`, messageData);
          if (Array.isArray(messageData?.data)) {
            finalData.messages = messageData.data;
          } else if (Array.isArray(messageData)) {
            finalData.messages = messageData;
          }
          console.log(`${LOG_PREFIX} ⇢ Found ${finalData.messages.length} messages`);
        } catch (messageError) {
          console.error(`${LOG_PREFIX} ⇢ Message fetch error:`, messageError);
        }
      } else if (shouldIncludeMessages) {
        console.log(`${LOG_PREFIX} ⇢ Cannot fetch messages: missing contactId=${contactId} or phoneId=${phoneId}`);
      }
      if (contactId) {
        currentContactInfo = {
          contactId,
          phoneId,
          companyName: searchTerm
        };
      }
      summary = await summarizeParsed(parsed, finalData, "activity", openai, sys_prompt, {
        ...lastCtx,
        lastFollowUp: lastCtx.nextFollowUp
      }, coachId);
    } else if (type === "stats") {
      console.log(`${LOG_PREFIX} ⇢ stats flow`);
      const fromDate = parsed?.from_date || fmtYYYYMMDD(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const toDate = parsed?.to_date || fmtYYYYMMDD(new Date());
      const limit = parsed?.limit || 3;
      console.log(`${LOG_PREFIX} ⇢ Using date range: ${fromDate} to ${toDate}`);
      let searchTerm = parsed.contact;
      let contactId = null;
      let phoneId = null;
      if (/\b(this|that)\s+(contact|account|lead|company)\b/i.test(searchTerm || "") && lastCtx.contactId) {
        contactId = contactId = parsed.contact_id ?? lastCtx.contactId;
        phoneId = lastCtx.phoneId;
        searchTerm = lastCtx.company_name;
        console.log(`${LOG_PREFIX} ⇢ Using context for stats: contactId=${contactId}, company=${searchTerm}`);
      } else if (searchTerm && searchTerm !== "this contact") {
        const resolved = await resolveContactAndPhoneId(apiHeaders, searchTerm, lastCtx);
        contactId = resolved.contactId;
        phoneId = resolved.phoneId;
        searchTerm = resolved.companyName || searchTerm;
      }
      if (!contactId) {
        contactId = parsed.contact_id;
      }
      let url = `${API_BASE}/ai/salescoach/contact/${contactId}/statistics?start_date=${fromDate}&end_date=${toDate}&limit=${limit}`;
      console.log(`${LOG_PREFIX} ⇢ Stats Request:`, url);
      let statsData = {
        appointments: [],
        opportunities: [],
        notes: [],
        event_form: []
      };
      if (contactId !== null) {
        try {
          const resp = await fetch(url, {
            method: "GET",
            headers: apiHeaders
          });
          const data = await resp.json().catch(()=>({}));
          console.log(`${LOG_PREFIX} ⇢ stats response:`, data);
          statsData.appointments = data?.data?.appointments || [];
          statsData.opportunities = data?.data?.opportunities || [];
          statsData.notes = data?.data?.notes || [];
          statsData.event_form = data?.data?.event_form || [];
        } catch (callError) {
          console.error(`${LOG_PREFIX} ⇢ stats error:`, callError);
        }
        if (contactId) {
          currentContactInfo = {
            contactId,
            phoneId,
            companyName: searchTerm
          };
        }
      }
      summary = await summarizeParsed(parsed, statsData, "stats", openai, sys_prompt, {
        ...lastCtx,
        lastFollowUp: lastCtx.nextFollowUp
      }, coachId);
    } else {
      console.log(`${LOG_PREFIX} ⇢ General flow (sales assistant)`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: sys_prompt ?? "You are a sales assistant. Your main task is to write emails. Your writing style should be direct and results-oriented, similar to Jack Daly's no-nonsense approach. Your goal is to increase sales, improve efficiency, and build strong client relationships."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      summary = completion.choices[0].message?.content || "";
      finalData = null;
    }
    // ---------------- STORE CONVERSATION CONTEXT ----------------
    try {
      const newContext = {
        ...lastCtx
      };
      if (currentContactInfo) {
        if (currentContactInfo.contactId) newContext.contactId = currentContactInfo.contactId;
        if (currentContactInfo.phoneId) newContext.phoneId = currentContactInfo.phoneId;
        if (currentContactInfo.companyName) newContext.company_name = currentContactInfo.companyName;
        if (currentContactInfo.lastFollowUp) newContext.lastFollowUp = currentContactInfo.lastFollowUp;
        if (currentContactInfo.nextFollowUp) newContext.nextFollowUp = currentContactInfo.nextFollowUp;
      }
      // Extract and store the next follow-up question from the summary
      const followupMatch = summary.match(/Would you like.*\?$/i);
      if (followupMatch) {
        newContext.nextFollowUp = followupMatch[0];
      }
      // Set current follow-up as last follow-up for next request
      if (lastCtx.nextFollowUp) {
        newContext.lastFollowUp = lastCtx.nextFollowUp;
      }
      // Store pagination info for progressive loading
      if (finalData?.pagination) {
        newContext.paginationInfo = finalData.pagination;
        // Override follow-up for pagination with total pages info
        if (finalData.pagination.hasNextPage) {
          newContext.nextFollowUp = `You have ${finalData.pagination.totalPages} total pages. Would you like to see page ${finalData.pagination.currentPage + 1}?`;
        }
      }
      const conversationSummary = await generateConversationSummary(prompt, summary, currentContactInfo, openai);
      const topicsToStore = packTopics(newContext);
      // Note: Session and message creation moved to frontend session manager
      // Backend only processes requests and returns responses
      let user_goals = 'Sales Activities';
      if (type === "crm") {
        user_goals = "CRM Data";
      } else if (type === "stats") {
        user_goals = "Contact Summary";
      } else if (type === "activity") {
        user_goals = "Contact activity";
      }
      // Store conversation history
      await insertConversation(supabase, {
        user_id: userId,
        agent_id: coachId || 'callproof-api',
        conversation_summary: conversationSummary,
        key_insights: currentContactInfo ? [
          currentContactInfo.companyName ? `Company: ${currentContactInfo.companyName}` : null,
          currentContactInfo.contactId ? `Contact ID: ${currentContactInfo.contactId}` : null,
          currentContactInfo.nextFollowUp ? `nextFollowUp: ${currentContactInfo.nextFollowUp}` : null,
          currentContactInfo.phone_id ? `phone ID: ${currentContactInfo.phone_id}` : null,
          currentContactInfo.lastFollowUp ? `lastFollowUp: ${currentContactInfo.lastFollowUp}` : null
        ].filter(Boolean) : null,
        user_name: profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : null,
        user_company: profile.company_name,
        user_goals: user_goals,
        user_challenges: null,
        last_topics: topicsToStore
      });
      console.log(`${LOG_PREFIX} ⇢ Context stored:`, newContext);
    } catch (contextError) {
      console.warn(`${LOG_PREFIX} ⇢ Failed to store context:`, contextError);
    }
    return jsonResponse({
      ok: true,
      type,
      action: parsed.action,
      contactId: currentContactInfo?.contactId || null,
      parsed,
      data: finalData,
      summary,
      context: currentContactInfo
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} ⇢ Error:`, err);
    return jsonResponse({
      error: err?.message || "Unknown error"
    }, 500);
  }
});
