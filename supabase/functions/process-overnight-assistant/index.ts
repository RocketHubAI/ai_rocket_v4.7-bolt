import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserContext {
  userId: string;
  teamId: string;
  userName: string;
  teamName: string;
  proactiveLevel: string;
  notificationTypes: Record<string, boolean>;
  strategicIdentity: string;
  userPriorities: string[];
  teamPriorities: string[];
  hasFinancialAccess: boolean;
  recentFeedback: any[];
  recentInsightTitles: string[];
  activeSkills: string[];
}

interface TeamDataSnapshot {
  categories: Array<{ category: string; count: number; sampleTitles: string[] }>;
  totalDocuments: number;
  hasEmails: boolean;
  emailCount: number;
  emailThreadCount: number;
}

interface DataDrivenPrompt {
  title: string;
  prompt: string;
  description: string;
  priority_alignment: string;
  lens: string;
}

interface ProactiveInsight {
  title: string;
  prompt_sent: string;
  agent_response: string;
  priority_alignment: string;
  lens: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  strategy: "Strategy",
  meetings: "Meetings",
  financial: "Financial",
  sales: "Sales",
  marketing: "Marketing",
  product: "Product",
  people: "People/HR",
  operations: "Operations",
  customer: "Customer",
  legal: "Legal",
  industry: "Industry",
  reference: "Reference",
  other: "Other",
};

async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || "Unknown error"}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response text from Gemini");
  return text.trim();
}

async function loadUserContext(supabase: any, userId: string): Promise<UserContext | null> {
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, team_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user || !user.team_id) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    teamResult,
    prefsResult,
    identityResult,
    userPrioritiesResult,
    teamPrioritiesResult,
    feedbackResult,
    recentTitlesResult,
    activeSkillsResult,
  ] = await Promise.all([
    supabase.from("teams").select("name").eq("id", user.team_id).maybeSingle(),
    supabase.from("user_assistant_preferences").select("proactive_level, notification_types").eq("user_id", userId).maybeSingle(),
    supabase.from("user_strategic_identity").select("identity_text").eq("user_id", userId).maybeSingle(),
    supabase.from("user_priorities").select("priority_type, priority_value").eq("user_id", userId),
    supabase.from("team_priorities").select("priority_type, priority_value").eq("team_id", user.team_id),
    supabase.from("assistant_proactive_insights")
      .select("insight_type, title, was_helpful, was_dismissed, user_feedback")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("assistant_proactive_insights")
      .select("title, lens:reasoning_lens")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase.from("user_active_skills")
      .select("assistant_skills(name, capability_areas)")
      .eq("user_id", userId),
  ]);

  const hasFinancialAccess = user.email ? true : true;

  const recentInsightTitles = (recentTitlesResult.data || []).map((r: any) => r.title).filter(Boolean);
  const activeSkills = (activeSkillsResult.data || [])
    .map((s: any) => s.assistant_skills?.name)
    .filter(Boolean);

  return {
    userId,
    teamId: user.team_id,
    userName: user.name || "User",
    teamName: teamResult.data?.name || "Team",
    proactiveLevel: prefsResult.data?.proactive_level || "medium",
    notificationTypes: prefsResult.data?.notification_types || {},
    strategicIdentity: identityResult.data?.identity_text || "",
    userPriorities: (userPrioritiesResult.data || []).map((p: any) => `${p.priority_type}: ${p.priority_value}`),
    teamPriorities: (teamPrioritiesResult.data || []).map((p: any) => `${p.priority_type}: ${p.priority_value}`),
    hasFinancialAccess,
    recentFeedback: feedbackResult.data || [],
    recentInsightTitles,
    activeSkills,
  };
}

async function analyzeTeamData(supabase: any, teamId: string, hasFinancialAccess: boolean): Promise<TeamDataSnapshot> {
  const [categoryCountsResult, documentsResult, emailsResult] = await Promise.all([
    supabase.rpc("get_team_category_counts", { p_team_id: teamId }),
    supabase.rpc("get_team_documents_list", { p_team_id: teamId }),
    supabase
      .from("company_emails")
      .select("id, thread_id")
      .eq("team_id", teamId)
      .order("email_date", { ascending: false })
      .limit(100),
  ]);

  let categoryCounts = categoryCountsResult.data || [];
  let documents = documentsResult.data || [];
  const emails = emailsResult.data || [];

  if (!hasFinancialAccess) {
    categoryCounts = categoryCounts.filter((cat: any) => cat.category !== "financial");
    documents = documents.filter((d: any) => d.category !== "financial");
  }

  const uniqueThreads = new Set(emails.map((e: any) => e.thread_id)).size;

  const categories = categoryCounts.map((cat: any) => {
    const categoryDocs = documents.filter((d: any) => d.category === cat.category);
    const sampleTitles = categoryDocs.slice(0, 5).map((d: any) => d.file_name).filter(Boolean);
    return { category: cat.category, count: cat.count, sampleTitles };
  });

  return {
    categories,
    totalDocuments: categories.reduce((sum: number, cat: any) => sum + cat.count, 0),
    hasEmails: emails.length > 0,
    emailCount: emails.length,
    emailThreadCount: uniqueThreads,
  };
}

function buildDataSummary(snapshot: TeamDataSnapshot): string {
  const lines: string[] = [];
  lines.push(`Total Documents: ${snapshot.totalDocuments}`);
  lines.push(`Categories: ${snapshot.categories.length}`);
  lines.push("");
  lines.push("Documents by Category:");
  snapshot.categories.forEach((cat) => {
    const label = CATEGORY_LABELS[cat.category] || cat.category;
    lines.push(`- ${label}: ${cat.count} documents`);
    if (cat.sampleTitles.length > 0) {
      lines.push(`  Sample titles: ${cat.sampleTitles.slice(0, 3).join(", ")}`);
    }
  });
  if (snapshot.hasEmails) {
    lines.push("");
    lines.push(`Emails: ${snapshot.emailCount} emails across ${snapshot.emailThreadCount} threads`);
  }
  return lines.join("\n");
}

const WILDCARD_LENSES = [
  { lens: "cross_pollinate", label: "CROSS-POLLINATE", description: "Find unexpected connections between two unrelated document categories (e.g., how customer feedback relates to internal strategy, or how meeting discussions echo financial trends)" },
  { lens: "devils_advocate", label: "DEVIL'S ADVOCATE", description: "Challenge an assumption or strategy visible in the data. Identify what the documents might be getting wrong or what risks are being ignored." },
  { lens: "hidden_signal", label: "HIDDEN SIGNAL", description: "Find a subtle pattern, overlooked detail, or emerging trend buried in the data that the team likely hasn't noticed yet." },
  { lens: "time_machine", label: "TIME MACHINE", description: "Compare recent documents/meetings against older ones to surface how thinking, priorities, or language has shifted over time." },
  { lens: "outside_in", label: "OUTSIDE-IN VIEW", description: "Analyze the team's data as if you were an outside consultant seeing it for the first time. What stands out? What questions would an outsider ask?" },
  { lens: "what_if", label: "WHAT-IF SCENARIO", description: "Take a real data point from documents and explore a hypothetical scenario - what would change if a key metric doubled, a competitor moved, or a strategy pivoted?" },
  { lens: "narrative_arc", label: "NARRATIVE ARC", description: "Weave together data points from across multiple categories into a compelling story about where the company is heading and what it means for the team." },
];

function getTodaysWildcard(): typeof WILDCARD_LENSES[0] {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return WILDCARD_LENSES[dayOfYear % WILDCARD_LENSES.length];
}

function buildPromptGenerationRequest(ctx: UserContext, dataSnapshot: TeamDataSnapshot): string {
  const helpfulInsights = ctx.recentFeedback.filter((f: any) => f.was_helpful === true);
  const dismissedInsights = ctx.recentFeedback.filter((f: any) => f.was_dismissed === true);
  const dataSummary = buildDataSummary(dataSnapshot);
  const wildcard = getTodaysWildcard();

  const promptCount = 3;

  const recentTitlesBlock = ctx.recentInsightTitles.length > 0
    ? `\n### RECENTLY COVERED TOPICS (last 7 days - DO NOT repeat these or similar topics)\n${ctx.recentInsightTitles.map((t) => `- "${t}"`).join("\n")}\n`
    : "";

  return `You are a proactive business strategist AI that researches company data to deliver real insights overnight.

### CONTEXT
User: ${ctx.userName}
Team: "${ctx.teamName}"
Strategic Identity: ${ctx.strategicIdentity || "(Not yet established)"}

### USER PRIORITIES (most important - align prompts to these)
Personal: ${ctx.userPriorities.length > 0 ? ctx.userPriorities.join("; ") : "None set"}
Team: ${ctx.teamPriorities.length > 0 ? ctx.teamPriorities.join("; ") : "None set"}
${ctx.activeSkills.length > 0 ? `\n### ACTIVE SKILLS (user has activated these capability lenses - bias insights toward these areas)\n${ctx.activeSkills.map(s => `- ${s}`).join("\n")}\nWeight at least 1 of your 3 prompts toward an active skill area.` : ""}

### TEAM DATA AVAILABLE
${dataSummary}

### FEEDBACK HISTORY
Helpful insights: ${helpfulInsights.map((i: any) => `"${i.title}"`).join(", ") || "None"}
Dismissed insights: ${dismissedInsights.map((i: any) => `"${i.title}"`).join(", ") || "None"}
User feedback: ${ctx.recentFeedback.filter((f: any) => f.user_feedback).map((f: any) => `"${f.user_feedback}"`).join("; ") || "None"}
${recentTitlesBlock}
### YOUR TASK
Generate exactly ${promptCount} data research prompts that will be sent to the team's AI agent to extract real insights from the team's synced documents, meetings, and emails.

CRITICAL RULES:
- Each prompt MUST have a UNIQUE angle and title that differs from recent topics listed above
- Prompt #1 and #2: Use standard lenses aligned to the user's top priorities
- Prompt #3: MUST use the wildcard lens "${wildcard.lens}" (${wildcard.label}) - ${wildcard.description}. This prompt should surprise the user with an unexpected angle they wouldn't have thought to ask about.

Each prompt should:
1. DIRECTLY ALIGN with one of the user's priorities (or explore a creative angle for the wildcard)
2. QUERY ACTUAL DATA - ask the agent to analyze specific document categories, meetings, or emails
3. PRODUCE A WORK PRODUCT - not suggest the user do something, but actually generate useful output (e.g., a summary, analysis, draft, action items, etc.)
4. Use relative language ("recent", "latest", "key") - never reference specific document counts

### PROMPT CATEGORIES
Standard lenses (for prompts #1 and #2):
- "research" - Deep analysis of documents to find patterns, trends, or insights
- "action_items" - Extract action items, next steps, or decisions from meetings/documents
- "content_draft" - Generate a draft document (marketing content, strategy summary, email, etc.) from team data
- "competitive_intel" - Analyze industry/market data from team documents
- "goal_progress" - Check alignment between goals and recent work/meetings

Wildcard lens (REQUIRED for prompt #3):
- "${wildcard.lens}" - ${wildcard.description}

### OUTPUT FORMAT (JSON array)
[
  {
    "title": "Short title (under 50 chars)",
    "prompt": "The actual prompt to send to the team agent (50-120 words). Be specific about what data to look at and what output to produce.",
    "description": "One sentence about what value this delivers",
    "priority_alignment": "Which user priority this serves",
    "lens": "research | action_items | content_draft | competitive_intel | goal_progress | ${wildcard.lens}"
  }
]

GOOD EXAMPLES:
- "Review our most recent strategy documents and meeting notes to identify the top 3 strategic priorities the team is currently executing on. Compare these against our stated goals and flag any misalignment."
- "Analyze our latest sales documents and customer conversations to draft a brief competitive positioning summary highlighting our key differentiators."
- "From our recent meeting notes, extract all action items and commitments made in the last few meetings. Group them by owner and flag any that appear overdue."

BAD EXAMPLES (do NOT generate these):
- "You should consider reviewing your strategy documents" (suggesting, not doing)
- "Your team chat usage has increased 20%" (feature metrics, not data insights)
- "I recommend setting up a scheduled report" (feature recommendation, not data analysis)
- Any title or topic too similar to recently covered topics listed above

Return ONLY the JSON array.`;
}

async function sendPromptToTeamAgent(
  prompt: string,
  teamId: string,
  userId: string,
  n8nWebhookUrl: string,
  serviceRoleKey: string
): Promise<string> {
  try {
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        team_id: teamId,
        user_id: userId,
        source: "overnight_assistant",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent response error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    return result.output || result.response || result.message || "No response received from agent.";
  } catch (error) {
    console.error("Error calling team agent:", error);
    return `Unable to complete this analysis: ${(error as Error).message}`;
  }
}

function buildBriefSummary(userName: string, insights: ProactiveInsight[]): string {
  const firstName = userName.split(' ')[0] || userName;
  const greeting = getTimeGreeting();
  let summary = `${greeting}, ${firstName}! I researched your team's data overnight and prepared ${insights.length} insights based on your priorities:\n\n`;

  insights.forEach((insight, i) => {
    summary += `${i + 1}. **${insight.title}**\n`;
  });

  summary += `\nYou can view them by clicking below.`;

  return summary;
}

function buildDetailedSummary(userName: string, teamName: string, insights: ProactiveInsight[]): string {
  const lensLabels: Record<string, string> = {
    research: "DATA RESEARCH",
    action_items: "ACTION ITEMS",
    content_draft: "CONTENT DRAFT",
    competitive_intel: "COMPETITIVE INTEL",
    goal_progress: "GOAL PROGRESS",
  };

  let detail = `# Overnight Research for ${teamName}\n`;
  detail += `Prepared for ${userName}\n\n`;

  insights.forEach((insight, i) => {
    const label = lensLabels[insight.lens] || insight.lens.toUpperCase();
    detail += `## ${i + 1}. [${label}] ${insight.title}\n\n`;
    detail += `**Priority:** ${insight.priority_alignment}\n\n`;
    detail += `${insight.agent_response}\n\n`;
    detail += `---\n\n`;
  });

  return detail;
}

function getTimeGreeting(): string {
  const hour = new Date().getUTCHours();
  const estHour = (hour - 5 + 24) % 24;
  if (estHour < 12) return "Good morning";
  if (estHour < 17) return "Good afternoon";
  return "Good evening";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const n8nWebhookUrl = "https://n8n.rockethub.ai/webhook/eac4b8f0-d6b4-45e4-b27d-ed3bec56983f/chat";

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error("Missing required configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: eligibleUsers, error: usersError } = await supabase
      .from("user_assistant_preferences")
      .select("user_id")
      .eq("proactive_enabled", true);

    if (usersError) throw new Error(`Failed to fetch eligible users: ${usersError.message}`);

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No eligible users", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const batchId = crypto.randomUUID();
    let processed = 0;
    let insightsGenerated = 0;
    const errors: string[] = [];

    for (const { user_id } of eligibleUsers) {
      try {
        const ctx = await loadUserContext(supabase, user_id);
        if (!ctx) {
          console.log(`Skipping user ${user_id}: no context available`);
          continue;
        }

        const dataSnapshot = await analyzeTeamData(supabase, ctx.teamId, ctx.hasFinancialAccess);
        if (dataSnapshot.totalDocuments === 0) {
          console.log(`Skipping user ${user_id}: no documents synced`);
          continue;
        }

        console.log(`User ${user_id}: ${dataSnapshot.totalDocuments} docs across ${dataSnapshot.categories.length} categories`);

        const promptRequest = buildPromptGenerationRequest(ctx, dataSnapshot);
        const rawResponse = await generateWithGemini(promptRequest, geminiApiKey);

        let dataPrompts: DataDrivenPrompt[];
        try {
          const parsed = JSON.parse(rawResponse);
          dataPrompts = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          console.error(`Failed to parse prompts for user ${user_id}:`, rawResponse.substring(0, 200));
          continue;
        }

        dataPrompts = dataPrompts
          .filter((p) => p.title && p.prompt && p.lens)
          .slice(0, 3);

        if (dataPrompts.length === 0) {
          console.log(`No valid prompts generated for user ${user_id}`);
          continue;
        }

        console.log(`Generated ${dataPrompts.length} data prompts for user ${user_id}, sending to team agent...`);

        const insights: ProactiveInsight[] = [];

        for (const dp of dataPrompts) {
          const agentResponse = await sendPromptToTeamAgent(
            dp.prompt,
            ctx.teamId,
            ctx.userId,
            n8nWebhookUrl,
            supabaseServiceKey
          );

          if (agentResponse && !agentResponse.startsWith("Unable to complete")) {
            insights.push({
              title: dp.title,
              prompt_sent: dp.prompt,
              agent_response: agentResponse,
              priority_alignment: dp.priority_alignment || "",
              lens: dp.lens,
            });

            const { error: insertError } = await supabase
              .from("assistant_proactive_insights")
              .insert({
                user_id: ctx.userId,
                team_id: ctx.teamId,
                insight_type: dp.lens,
                title: dp.title,
                summary: agentResponse.substring(0, 500),
                detailed_content: agentResponse,
                related_priorities: dp.priority_alignment ? [dp.priority_alignment] : [],
                proactive_proposal: dp.prompt,
                reasoning_lens: dp.lens,
                urgency_score: 5,
                confidence_score: 0.8,
                batch_id: batchId,
              });

            if (insertError) {
              console.error(`Failed to insert insight for user ${user_id}:`, insertError);
            } else {
              insightsGenerated++;
            }
          } else {
            console.log(`Agent returned no useful response for prompt: "${dp.title}"`);
          }
        }

        if (insights.length === 0) {
          console.log(`No successful agent responses for user ${user_id}`);
          continue;
        }

        const briefMessage = buildBriefSummary(ctx.userName, insights);
        const detailedContent = buildDetailedSummary(ctx.userName, ctx.teamName, insights);

        const { error: convError } = await supabase
          .from("agent_conversations")
          .insert({
            user_id: ctx.userId,
            team_id: ctx.teamId,
            role: "agent",
            message: briefMessage,
            metadata: {
              source: "overnight_assistant",
              batch_id: batchId,
              insight_count: insights.length,
              lenses_used: [...new Set(insights.map((i) => i.lens))],
              detailed_content: detailedContent,
              insight_titles: insights.map((i) => i.title),
              prompts_sent: insights.map((i) => ({ title: i.title, prompt: i.prompt_sent })),
              action: { type: "none" },
            },
          });

        if (convError) {
          console.error(`Failed to insert conversation for user ${user_id}:`, convError);
        }

        await supabase
          .from("assistant_proactive_insights")
          .update({
            delivered: true,
            delivered_at: new Date().toISOString(),
            delivered_via: ["in_app"],
          })
          .eq("batch_id", batchId)
          .eq("user_id", ctx.userId);

        const notifTypes = ctx.notificationTypes || {};
        if (notifTypes.daily_summary !== false) {
          await supabase.from("proactive_notification_queue").insert({
            user_id: ctx.userId,
            team_id: ctx.teamId,
            event_type: "daily_summary",
            priority: 5,
            context: {
              user_name: ctx.userName,
              team_name: ctx.teamName,
              insight_count: insights.length,
              top_insights: insights.slice(0, 3).map((i) => ({
                title: i.title,
                summary: i.agent_response.substring(0, 200),
                lens: i.lens,
              })),
              batch_id: batchId,
            },
            scheduled_for: new Date().toISOString(),
            process_after: new Date().toISOString(),
            dedup_key: `daily_summary_${ctx.userId}_${new Date().toISOString().split("T")[0]}`,
          });
        }

        try {
          await fetch(`${supabaseUrl}/functions/v1/update-strategic-identity`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: ctx.userId,
              signal_type: "overnight_analysis_complete",
              signal_details: `Overnight data research completed. Sent ${insights.length} prompts to team agent aligned with priorities. Topics: ${insights.map((i) => i.title).join("; ")}. Lenses: ${[...new Set(insights.map((i) => i.lens))].join(", ")}.`,
            }),
          });
        } catch (e) {
          console.error(`Failed to update strategic identity for ${user_id}:`, e);
        }

        processed++;
      } catch (userError) {
        const msg = `Error processing user ${user_id}: ${(userError as Error).message}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batchId,
        eligible_users: eligibleUsers.length,
        processed,
        insights_generated: insightsGenerated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-overnight-assistant:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
