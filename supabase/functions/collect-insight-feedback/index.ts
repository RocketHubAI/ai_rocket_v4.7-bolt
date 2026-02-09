import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackRequest {
  user_id: string;
  insight_id?: string;
  batch_id?: string;
  was_helpful?: boolean;
  user_rating?: number;
  user_feedback?: string;
  was_dismissed?: boolean;
}

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
    const body: FeedbackRequest = await req.json();
    const { user_id, insight_id, batch_id, was_helpful, user_rating, user_feedback, was_dismissed } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!insight_id && !batch_id) {
      return new Response(
        JSON.stringify({ error: "Must provide either insight_id or batch_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatePayload: Record<string, any> = {};
    if (was_helpful !== undefined) updatePayload.was_helpful = was_helpful;
    if (user_rating !== undefined) updatePayload.user_rating = Math.min(5, Math.max(1, user_rating));
    if (user_feedback !== undefined) updatePayload.user_feedback = user_feedback;
    if (was_dismissed !== undefined) updatePayload.was_dismissed = was_dismissed;

    if (!updatePayload.first_viewed_at) {
      updatePayload.first_viewed_at = new Date().toISOString();
    }

    let updatedIds: string[] = [];

    if (insight_id) {
      const { data, error } = await supabase
        .from("assistant_proactive_insights")
        .update(updatePayload)
        .eq("id", insight_id)
        .eq("user_id", user_id)
        .select("id");

      if (error) throw new Error(`Failed to update insight: ${error.message}`);
      updatedIds = (data || []).map((r: any) => r.id);
    } else if (batch_id) {
      const { data, error } = await supabase
        .from("assistant_proactive_insights")
        .update(updatePayload)
        .eq("batch_id", batch_id)
        .eq("user_id", user_id)
        .select("id");

      if (error) throw new Error(`Failed to update batch insights: ${error.message}`);
      updatedIds = (data || []).map((r: any) => r.id);
    }

    const sessionType = user_feedback ? "detailed_feedback" : "quick_rating";
    await supabase.from("assistant_feedback_sessions").insert({
      user_id,
      session_type: sessionType,
      feedback_content: user_feedback || (was_helpful === true ? "Thumbs up" : was_helpful === false ? "Thumbs down" : "Dismissed"),
      insights_referenced: updatedIds,
      identity_update_applied: false,
    });

    const signalDetails = [];
    if (was_helpful !== undefined) signalDetails.push(`rated ${was_helpful ? "helpful" : "not helpful"}`);
    if (user_rating) signalDetails.push(`gave ${user_rating}/5 stars`);
    if (user_feedback) signalDetails.push(`feedback: "${user_feedback}"`);
    if (was_dismissed) signalDetails.push("dismissed insight without reading");

    if (signalDetails.length > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/update-strategic-identity`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id,
            signal_type: "insight_feedback",
            signal_details: `User ${signalDetails.join(", ")} for ${updatedIds.length} insight(s)`,
            user_feedback: user_feedback || undefined,
          }),
        });
      } catch (e) {
        console.error("Failed to trigger strategic identity update:", e);
      }
    }

    const { data: allRated } = await supabase
      .from("assistant_proactive_insights")
      .select("was_helpful")
      .eq("user_id", user_id)
      .not("was_helpful", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (allRated && allRated.length >= 10) {
      const helpfulCount = allRated.filter((r: any) => r.was_helpful === true).length;
      const helpfulRatio = helpfulCount / allRated.length;

      if (helpfulRatio < 0.3) {
        const { data: currentPrefs } = await supabase
          .from("user_assistant_preferences")
          .select("proactive_level")
          .eq("user_id", user_id)
          .maybeSingle();

        const currentLevel = currentPrefs?.proactive_level || "medium";
        const downgradeMap: Record<string, string> = { high: "medium", medium: "low" };
        const newLevel = downgradeMap[currentLevel];

        if (newLevel) {
          await supabase
            .from("user_assistant_preferences")
            .update({ proactive_level: newLevel })
            .eq("user_id", user_id);

          await supabase.from("agent_conversations").insert({
            user_id,
            team_id: null,
            role: "agent",
            message: `I noticed my recent insights haven't been as helpful as I'd like them to be. I've adjusted my proactive level from "${currentLevel}" to "${newLevel}" to focus on higher-quality, more relevant findings. You can always adjust this in your assistant settings.`,
            metadata: {
              source: "feedback_auto_adjust",
              previous_level: currentLevel,
              new_level: newLevel,
              helpful_ratio: helpfulRatio,
              action: { type: "none" },
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated_insights: updatedIds.length,
        feedback_recorded: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in collect-insight-feedback:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
