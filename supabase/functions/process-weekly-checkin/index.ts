import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: eligibleUsers, error: usersError } = await supabase
      .from("user_assistant_preferences")
      .select("user_id")
      .eq("proactive_enabled", true);

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No eligible users", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const { user_id } of eligibleUsers) {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("id, name, team_id")
          .eq("id", user_id)
          .maybeSingle();

        if (!user || !user.team_id) continue;

        const { data: prefs } = await supabase
          .from("user_assistant_preferences")
          .select("assistant_name")
          .eq("user_id", user_id)
          .maybeSingle();

        const assistantName = prefs?.assistant_name || "Astra";
        const userName = user.name || "there";

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: recentInsights } = await supabase
          .from("assistant_proactive_insights")
          .select("title, was_helpful")
          .eq("user_id", user_id)
          .gte("created_at", oneWeekAgo);

        const totalInsights = recentInsights?.length || 0;
        const helpfulCount = recentInsights?.filter((i: any) => i.was_helpful === true).length || 0;

        let message = `Hi ${userName}, it's ${assistantName} checking in for the week. `;

        if (totalInsights > 0) {
          message += `I delivered ${totalInsights} insights this week. `;
          if (helpfulCount > 0) {
            message += `You found ${helpfulCount} of them helpful -- that's good to know. `;
          }
        } else {
          message += `I didn't deliver any overnight insights this week. `;
        }

        message += `How am I doing? Is there anything you'd like me to focus on or improve? Your feedback helps me serve you better.`;

        const { error: convError } = await supabase
          .from("agent_conversations")
          .insert({
            user_id: user_id,
            team_id: user.team_id,
            role: "agent",
            message: message,
            metadata: {
              source: "weekly_checkin",
              weekly_stats: {
                total_insights: totalInsights,
                helpful_count: helpfulCount,
              },
              action: { type: "none" },
            },
          });

        if (convError) {
          console.error(`Failed to insert check-in for user ${user_id}:`, convError);
        } else {
          processed++;
        }
      } catch (userError) {
        console.error(`Error processing user ${user_id}:`, (userError as Error).message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-weekly-checkin:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
