import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, email, teamId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "check-email") {
      if (!email || typeof email !== "string") {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user exists in auth.users using admin API (bypasses RLS completely)
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
          console.error('[auth-preflight-check] Error listing auth users:', authError);
          return new Response(
            JSON.stringify({ exists: false, debug: 'auth_error' }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const userExists = authUsers.users.some(u => u.email?.toLowerCase() === email.toLowerCase().trim());

        console.log('[auth-preflight-check] Email check result:', {
          email: email.toLowerCase().trim(),
          exists: userExists,
          totalUsers: authUsers.users.length
        });

        return new Response(
          JSON.stringify({ exists: userExists }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (checkError) {
        console.error('[auth-preflight-check] Exception during check:', checkError);
        return new Response(
          JSON.stringify({ exists: false, debug: 'exception' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "lookup-team-name") {
      if (!teamId || typeof teamId !== "string") {
        return new Response(
          JSON.stringify({ error: "Team ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ name: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ name: data.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-moonshot-registration") {
      if (!email || typeof email !== "string") {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("moonshot_registrations")
        .select("id, team_name, user_id, team_id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ registration: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ registration: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-moonshot-team-registered") {
      if (!teamId || typeof teamId !== "string") {
        return new Response(
          JSON.stringify({ error: "Team ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("moonshot_registrations")
        .select("id")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ registered: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ registered: true, id: data.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
