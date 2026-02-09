import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateTaskPayload {
  title: string;
  description: string;
  task_type: "reminder" | "research" | "report" | "check_in" | "custom";
  frequency: "once" | "daily" | "weekly" | "biweekly" | "monthly";
  schedule_day?: number;
  schedule_hour: number;
  schedule_minute?: number;
  timezone?: string;
  ai_prompt: string;
  delivery_method?: "conversation" | "notification" | "both";
  max_runs?: number;
  metadata?: Record<string, unknown>;
}

function calculateNextRunAt(
  frequency: string,
  scheduleHour: number,
  scheduleMinute: number,
  scheduleDay: number | null,
  timezone: string
): string {
  const now = new Date();
  const utcNow = now.getTime();

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

  const candidate = new Date(now);
  candidate.setUTCHours(utcHour, scheduleMinute, 0, 0);
  candidate.setUTCDate(candidate.getUTCDate() + dayShift);

  if (frequency === "once" || frequency === "daily") {
    if (candidate.getTime() <= utcNow) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
  } else if (frequency === "weekly") {
    const targetDay = scheduleDay ?? 1;
    const currentDay = candidate.getUTCDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0 && candidate.getTime() <= utcNow) {
      daysUntil = 7;
    }
    candidate.setUTCDate(candidate.getUTCDate() + daysUntil);
  } else if (frequency === "biweekly") {
    const targetDay = scheduleDay ?? 1;
    const currentDay = candidate.getUTCDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0 && candidate.getTime() <= utcNow) {
      daysUntil = 14;
    }
    candidate.setUTCDate(candidate.getUTCDate() + daysUntil);
  } else if (frequency === "monthly") {
    const targetDayOfMonth = scheduleDay ?? 1;
    candidate.setUTCDate(targetDayOfMonth);
    if (candidate.getTime() <= utcNow) {
      candidate.setUTCMonth(candidate.getUTCMonth() + 1);
      candidate.setUTCDate(targetDayOfMonth);
    }
  }

  return candidate.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!userData?.team_id) {
      return new Response(
        JSON.stringify({ error: "No team found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateTaskPayload = await req.json();

    if (!body.title || !body.ai_prompt) {
      return new Response(
        JSON.stringify({ error: "Title and ai_prompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timezone = body.timezone || "America/New_York";
    const scheduleMinute = body.schedule_minute ?? 0;
    const scheduleDay = body.schedule_day ?? null;

    const nextRunAt = calculateNextRunAt(
      body.frequency,
      body.schedule_hour,
      scheduleMinute,
      scheduleDay,
      timezone
    );

    const taskType = body.task_type || "custom";
    const deliveryMethod = body.delivery_method || "conversation";

    const featuresUsed: string[] = ["Team Data Search"];
    if (taskType === "report") {
      featuresUsed.push("Reports View");
    } else {
      featuresUsed.push("Agent Chat");
    }
    if (deliveryMethod === "notification" || deliveryMethod === "both") {
      featuresUsed.push("Notifications");
    }

    const metadata = {
      ...(body.metadata || {}),
      features_used: featuresUsed,
    };

    const { data: task, error: insertError } = await supabase
      .from("user_scheduled_tasks")
      .insert({
        user_id: user.id,
        team_id: userData.team_id,
        task_type: taskType,
        title: body.title,
        description: body.description || "",
        frequency: body.frequency || "once",
        schedule_day: scheduleDay,
        schedule_hour: body.schedule_hour,
        schedule_minute: scheduleMinute,
        timezone,
        next_run_at: nextRunAt,
        status: "active",
        ai_prompt: body.ai_prompt,
        delivery_method: deliveryMethod,
        max_runs: body.max_runs || null,
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create task", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, task }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-scheduled-task error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
