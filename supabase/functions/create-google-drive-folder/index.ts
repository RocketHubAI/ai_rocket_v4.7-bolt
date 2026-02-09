import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    console.log("[create-google-drive-folder] Starting folder creation request");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("[create-google-drive-folder] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-google-drive-folder] User authenticated:", user.id, user.email);

    const { folderName } = await req.json();
    if (!folderName) {
      console.error("[create-google-drive-folder] Missing folder name");
      return new Response(JSON.stringify({ error: "Folder name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-google-drive-folder] Creating folder:", folderName);

    const teamId = user.user_metadata?.team_id;
    if (!teamId) {
      console.error("[create-google-drive-folder] No team ID in user metadata");
      return new Response(JSON.stringify({ error: "No team ID found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-google-drive-folder] Team ID:", teamId);

    let connection = null;

    // First try user's own connection
    const userResult = await supabaseClient
      .from("user_drive_connections")
      .select("access_token, google_account_email")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (userResult.data) {
      console.log("[create-google-drive-folder] Found user's own connection");
      connection = userResult.data;
    } else {
      // Fall back to team connection
      console.log("[create-google-drive-folder] No user connection, trying team connection");
      const teamResult = await supabaseClient
        .from("user_drive_connections")
        .select("access_token, google_account_email")
        .eq("team_id", teamId)
        .eq("is_active", true)
        .maybeSingle();

      if (teamResult.error) {
        console.error("[create-google-drive-folder] DB error:", teamResult.error);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      connection = teamResult.data;
    }

    if (!connection?.access_token) {
      console.error("[create-google-drive-folder] No active connection found for user:", user.id, "or team:", teamId);
      return new Response(JSON.stringify({ error: "No active Google Drive connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[create-google-drive-folder] Using Google account:", connection.google_account_email);

    // Create folder in Google Drive
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[create-google-drive-folder] Google Drive API error:", response.status, errorText);

      if (response.status === 401) {
        return new Response(JSON.stringify({
          error: "Google Drive token expired. Please reconnect your account.",
          needsReauth: true
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to create folder in Google Drive" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const folder = await response.json();
    console.log("[create-google-drive-folder] Successfully created folder:", folder.id, folder.name);

    return new Response(JSON.stringify({ folder }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[create-google-drive-folder] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});