import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: healthResult, error: healthError } = await supabase.rpc(
      "check_integration_token_health"
    );

    if (healthError) {
      console.error("Health check error:", healthError);
      throw new Error(`Health check failed: ${healthError.message}`);
    }

    const { data: expiredIntegrations } = await supabase
      .from("user_integrations")
      .select(
        "user_id, team_id, status, token_expires_at, integration_registry(provider_name, provider_slug)"
      )
      .eq("status", "expired")
      .not("token_expires_at", "is", null)
      .gte("updated_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    let refreshAttempts = 0;
    let refreshSuccesses = 0;

    for (const integration of expiredIntegrations || []) {
      const registry = integration.integration_registry as any;
      if (!registry) continue;

      const slug = registry.provider_slug;
      let refreshFunctionName = "";

      if (slug === "google-drive" || slug === "google-calendar") {
        refreshFunctionName = "google-drive-refresh-token";
      } else if (
        slug === "microsoft-onedrive" ||
        slug === "outlook-calendar"
      ) {
        refreshFunctionName = "microsoft-graph-refresh-token";
      }

      if (!refreshFunctionName) continue;

      refreshAttempts++;
      try {
        const refreshResp = await fetch(
          `${supabaseUrl}/functions/v1/${refreshFunctionName}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: integration.user_id,
              team_id: integration.team_id,
            }),
          }
        );

        if (refreshResp.ok) {
          await supabase
            .from("user_integrations")
            .update({
              status: "active",
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", integration.user_id)
            .eq(
              "integration_id",
              (integration as any).integration_id || ""
            );
          refreshSuccesses++;
        }
      } catch (refreshErr) {
        console.error(
          `Token refresh failed for ${slug}:`,
          (refreshErr as Error).message
        );
      }
    }

    const result = {
      success: true,
      health: healthResult,
      refresh_attempts: refreshAttempts,
      refresh_successes: refreshSuccesses,
      checked_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in check-integration-health:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
