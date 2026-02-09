import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScheduledTask {
  id: string;
  user_id: string;
  team_id: string;
  task_type: string;
  title: string;
  description: string;
  frequency: string;
  schedule_day: number | null;
  schedule_hour: number;
  schedule_minute: number;
  timezone: string;
  next_run_at: string;
  run_count: number;
  max_runs: number | null;
  ai_prompt: string;
  delivery_method: string;
  metadata: Record<string, unknown>;
}

interface UserContext {
  userName: string;
  userEmail: string;
  teamName: string;
  teamId: string;
  agentName: string;
  priorities: string[];
  userPriorities: string[];
  activeSkills: string[];
}

async function sendToTeamAgent(
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
        source: "scheduled_task",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent response error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    return result.output || result.response || result.message || "";
  } catch (error) {
    console.error("Error calling team agent:", error);
    return "";
  }
}

async function loadUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  teamId: string
): Promise<UserContext> {
  const [userResult, teamResult, agentResult, prioritiesResult, userPrioritiesResult, skillsResult] =
    await Promise.all([
      supabase.from("users").select("email, name").eq("id", userId).maybeSingle(),
      supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
      supabase.from("team_agent_settings").select("agent_name").eq("team_id", teamId).maybeSingle(),
      supabase.from("team_priorities").select("priorities").eq("team_id", teamId).maybeSingle(),
      supabase.from("user_priorities").select("priorities").eq("user_id", userId).maybeSingle(),
      supabase.from("assistant_skills").select("skill_id, display_name").eq("user_id", userId).eq("is_active", true),
    ]);

  const userName =
    userResult.data?.name ||
    userResult.data?.email?.split("@")[0] ||
    "there";
  const userEmail = userResult.data?.email || "";
  const teamName = teamResult.data?.name || "Your Team";
  const agentName = agentResult.data?.agent_name || "Astra";

  let priorities: string[] = [];
  if (prioritiesResult.data?.priorities) {
    const p = prioritiesResult.data.priorities;
    priorities = Array.isArray(p) ? p : typeof p === "object" ? Object.values(p) : [];
  }

  let userPriorities: string[] = [];
  if (userPrioritiesResult.data?.priorities) {
    const p = userPrioritiesResult.data.priorities;
    userPriorities = Array.isArray(p) ? p : typeof p === "object" ? Object.values(p) : [];
  }

  const activeSkills = (skillsResult.data || []).map((s: { display_name: string }) => s.display_name);

  return { userName, userEmail, teamName, teamId, agentName, priorities, userPriorities, activeSkills };
}

function buildTaskPrompt(task: ScheduledTask, ctx: UserContext): string {
  const prioritiesSection =
    ctx.priorities.length > 0
      ? `\nTeam priorities: ${ctx.priorities.join(", ")}`
      : "";
  const userPrioritiesSection =
    ctx.userPriorities.length > 0
      ? `\nPersonal priorities: ${ctx.userPriorities.join(", ")}`
      : "";
  const skillsSection =
    ctx.activeSkills.length > 0
      ? `\nActive skills: ${ctx.activeSkills.join(", ")}`
      : "";

  return `You are ${ctx.agentName}, the AI assistant for the ${ctx.teamName} team.
You are executing a scheduled ${task.task_type} for ${ctx.userName}.

Task: "${task.title}"
${task.description ? `Description: ${task.description}` : ""}
${prioritiesSection}${userPrioritiesSection}${skillsSection}

The user set up this task with the following instructions:
${task.ai_prompt}

This is execution #${task.run_count + 1}${task.frequency !== "once" ? ` (runs ${task.frequency})` : ""}.
Current date: ${new Date().toISOString()}.

IMPORTANT RULES:
- Use ONLY the team's actual synced document data to inform your response. Do NOT fabricate numbers, metrics, or statistics.
- If no relevant data is found, clearly state that and suggest what data the user should sync.
- Address ${ctx.userName} by name.
- Be concise but thorough. Use markdown formatting with bold headers and bullet points.
- Do not mention that you are an AI or that this is automated.`;
}

function calculateNextRunAt(
  frequency: string,
  scheduleHour: number,
  scheduleMinute: number,
  scheduleDay: number | null,
  timezone: string,
  fromDate: Date
): string | null {
  if (frequency === "once") return null;

  let offsetHours = -5;
  if (timezone === "America/Chicago") offsetHours = -6;
  else if (timezone === "America/Denver") offsetHours = -7;
  else if (timezone === "America/Los_Angeles") offsetHours = -8;
  else if (timezone === "America/New_York") offsetHours = -5;
  else if (timezone === "UTC") offsetHours = 0;
  else if (timezone === "Europe/London") offsetHours = 0;
  else if (timezone === "Europe/Berlin") offsetHours = 1;
  else if (timezone === "Asia/Tokyo") offsetHours = 9;

  const utcHour = (scheduleHour - offsetHours + 24) % 24;
  const dayShift = scheduleHour - offsetHours < 0 ? 1 : scheduleHour - offsetHours >= 24 ? -1 : 0;

  const next = new Date(fromDate);
  next.setUTCHours(utcHour, scheduleMinute, 0, 0);
  next.setUTCDate(next.getUTCDate() + dayShift);

  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (frequency === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (frequency === "biweekly") {
    next.setUTCDate(next.getUTCDate() + 14);
  } else if (frequency === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + 1);
    if (scheduleDay) next.setUTCDate(scheduleDay);
  }

  return next.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 2 * 60 * 1000);

    const { data: dueTasks, error: fetchError } = await supabase
      .from("user_scheduled_tasks")
      .select("*")
      .eq("status", "active")
      .not("next_run_at", "is", null)
      .lte("next_run_at", windowEnd.toISOString())
      .order("next_run_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Failed to fetch due tasks:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tasks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueTasks || dueTasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No tasks due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${dueTasks.length} due tasks`);

    let processed = 0;
    let failed = 0;
    const results: { taskId: string; status: string }[] = [];

    for (const task of dueTasks as ScheduledTask[]) {
      const executionId = crypto.randomUUID();

      try {
        await supabase.from("scheduled_task_executions").insert({
          id: executionId,
          task_id: task.id,
          user_id: task.user_id,
          team_id: task.team_id,
          status: "running",
        });

        const ctx = await loadUserContext(supabase, task.user_id, task.team_id);
        const taskPrompt = buildTaskPrompt(task, ctx);

        let resultMessage = "";

        if (n8nWebhookUrl) {
          resultMessage = await sendToTeamAgent(
            taskPrompt,
            task.team_id,
            task.user_id,
            n8nWebhookUrl,
            supabaseServiceKey
          );
        }

        if (!resultMessage) {
          console.warn(`Task ${task.id}: n8n unavailable or returned empty, skipping execution`);
          await supabase
            .from("scheduled_task_executions")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error: "No response from team agent. The task requires synced document data but could not reach the data retrieval service.",
            })
            .eq("id", executionId);

          failed++;
          results.push({ taskId: task.id, status: "failed" });
          continue;
        }

        const isReportTask = task.task_type === "report";

        if (isReportTask) {
          await supabase.from("astra_chats").insert({
            user_id: task.user_id,
            user_email: ctx.userEmail,
            mode: "reports",
            message: resultMessage,
            message_type: "astra",
            metadata: {
              source: "scheduled_task",
              task_id: task.id,
              task_title: task.title,
              task_type: task.task_type,
              execution_id: executionId,
              frequency: task.frequency,
            },
          });

          const firstName = ctx.userName.split(" ")[0] || ctx.userName;
          const notificationMsg = `Hi ${firstName}, your scheduled report **"${task.title}"** just finished running. You can view the full results in your **Reports** tab.`;

          await supabase.from("agent_conversations").insert({
            user_id: task.user_id,
            team_id: task.team_id,
            role: "agent",
            message: notificationMsg,
            metadata: {
              source: "scheduled_task_notification",
              task_id: task.id,
              task_title: task.title,
              action: { type: "navigate", destination: "reports" },
            },
          });
        } else {
          await supabase.from("agent_conversations").insert({
            user_id: task.user_id,
            team_id: task.team_id,
            role: "agent",
            message: resultMessage,
            metadata: {
              source: "scheduled_task",
              task_id: task.id,
              task_title: task.title,
              task_type: task.task_type,
              execution_id: executionId,
              frequency: task.frequency,
              action: { type: "none" },
            },
          });
        }

        await supabase
          .from("scheduled_task_executions")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
            result_message: resultMessage,
          })
          .eq("id", executionId);

        const newRunCount = task.run_count + 1;
        const isMaxed = task.max_runs && newRunCount >= task.max_runs;
        const isOneTime = task.frequency === "once";

        const nextRun =
          isMaxed || isOneTime
            ? null
            : calculateNextRunAt(
                task.frequency,
                task.schedule_hour,
                task.schedule_minute,
                task.schedule_day,
                task.timezone,
                now
              );

        await supabase
          .from("user_scheduled_tasks")
          .update({
            run_count: newRunCount,
            last_run_at: now.toISOString(),
            next_run_at: nextRun,
            status: isMaxed || isOneTime ? "completed" : "active",
          })
          .eq("id", task.id);

        if (
          task.delivery_method === "notification" ||
          task.delivery_method === "both"
        ) {
          await supabase.from("proactive_notification_queue").insert({
            user_id: task.user_id,
            event_type: "custom",
            priority: 5,
            context: {
              task_id: task.id,
              task_title: task.title,
              message: resultMessage.substring(0, 500),
            },
            scheduled_for: now.toISOString(),
          });
        }

        processed++;
        results.push({ taskId: task.id, status: "success" });
        console.log(`Task ${task.id} (${task.title}) executed successfully`);
      } catch (taskErr) {
        console.error(`Task ${task.id} failed:`, taskErr);

        await supabase
          .from("scheduled_task_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error: String(taskErr),
          })
          .eq("id", executionId);

        failed++;
        results.push({ taskId: task.id, status: "failed" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: dueTasks.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-scheduled-tasks error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
