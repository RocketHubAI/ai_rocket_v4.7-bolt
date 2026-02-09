import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdateRequest {
  user_id: string;
  signal_type: string;
  signal_details: string;
  user_feedback?: string;
}

async function generateWithGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error("Missing required configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, signal_type, signal_details, user_feedback }: UpdateRequest = await req.json();

    if (!user_id || !signal_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, signal_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: user } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user_id)
      .maybeSingle();

    const { data: currentIdentity } = await supabase
      .from("user_strategic_identity")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    const { data: userPriorities } = await supabase
      .from("user_priorities")
      .select("priority_type, priority_value")
      .eq("user_id", user_id);

    const { data: preferences } = await supabase
      .from("user_assistant_preferences")
      .select("proactive_level, notification_types")
      .eq("user_id", user_id)
      .maybeSingle();

    const { data: recentInsights } = await supabase
      .from("assistant_proactive_insights")
      .select("insight_type, title, was_helpful, was_dismissed, user_rating")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const userName = user?.name || "User";
    const currentText = currentIdentity?.identity_text || "";
    const version = currentIdentity?.identity_version || 0;

    const helpfulCount = (recentInsights || []).filter((i: any) => i.was_helpful === true).length;
    const dismissedCount = (recentInsights || []).filter((i: any) => i.was_dismissed === true).length;
    const totalRated = (recentInsights || []).filter((i: any) => i.was_helpful !== null).length;
    const helpfulRatio = totalRated > 0 ? helpfulCount / totalRated : 0;

    const helpfulTypes = (recentInsights || [])
      .filter((i: any) => i.was_helpful === true)
      .map((i: any) => i.insight_type);
    const dismissedTypes = (recentInsights || [])
      .filter((i: any) => i.was_dismissed === true)
      .map((i: any) => i.insight_type);

    const preferredCategories = [...new Set(helpfulTypes)];
    const dismissedCategories = [...new Set(dismissedTypes)];

    const prompt = `You are maintaining the Strategic Identity for "${userName}".
This is a living profile document that captures their communication preferences, decision-making patterns, current priorities, and how they interact with AI-generated insights.

CURRENT IDENTITY (version ${version}):
${currentText || "(No identity established yet -- this is the initial creation.)"}

USER PRIORITIES:
${(userPriorities || []).map((p: any) => `- ${p.priority_type}: ${p.priority_value}`).join("\n") || "None set"}

PROACTIVE LEVEL: ${preferences?.proactive_level || "medium"}

RECENT INSIGHT ENGAGEMENT:
- Helpful ratio: ${Math.round(helpfulRatio * 100)}% (${helpfulCount}/${totalRated} rated helpful)
- Preferred categories: ${preferredCategories.join(", ") || "Not enough data"}
- Dismissed categories: ${dismissedCategories.join(", ") || "None"}

NEW SIGNAL:
- Event: ${signal_type}
- Details: ${signal_details}
${user_feedback ? `- User feedback: "${user_feedback}"` : ""}

INSTRUCTIONS:
Update the identity text to reflect this new signal. Follow these rules:
1. Preserve existing observations that are still valid
2. Add new patterns discovered from this signal
3. If the new signal contradicts an old observation, note the evolution (e.g., "Previously preferred X, now shows preference for Y")
4. Keep the identity under 500 words
5. Focus on ACTIONABLE patterns that help serve this user better
6. Write in third person (e.g., "${userName} prefers...")
7. Include observations about: communication style, content preferences, engagement patterns, current focus areas, and decision-making tendencies

Return ONLY the updated identity text, no explanations or metadata.`;

    const updatedText = await generateWithGemini(prompt, geminiApiKey);

    const { error: upsertError } = await supabase
      .from("user_strategic_identity")
      .upsert({
        user_id,
        team_id: currentIdentity?.team_id || null,
        identity_text: updatedText,
        identity_version: version + 1,
        preferred_insight_categories: preferredCategories.length > 0 ? preferredCategories : currentIdentity?.preferred_insight_categories || [],
        dismissed_insight_categories: dismissedCategories.length > 0 ? dismissedCategories : currentIdentity?.dismissed_insight_categories || [],
        insight_helpful_ratio: helpfulRatio,
        last_updated_at: new Date().toISOString(),
        last_updated_reason: signal_type,
        update_count: (currentIdentity?.update_count || 0) + 1,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error upserting strategic identity:", upsertError);
      throw new Error(`Failed to update strategic identity: ${upsertError.message}`);
    }

    await supabase.from("assistant_feedback_sessions").insert({
      user_id,
      session_type: "identity_evolution",
      feedback_content: `Signal: ${signal_type} - ${signal_details}`,
      identity_update_applied: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        identity_version: version + 1,
        identity_text_length: updatedText.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-strategic-identity:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
