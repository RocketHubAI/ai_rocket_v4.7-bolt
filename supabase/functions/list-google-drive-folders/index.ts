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
    console.log("[list-google-drive-folders] Starting folder list request");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("[list-google-drive-folders] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[list-google-drive-folders] User authenticated:", user.id, user.email);

    const teamId = user.user_metadata?.team_id;
    console.log("[list-google-drive-folders] User team_id:", teamId);

    let connection = null;
    let connError = null;

    // First try to find user's own connection
    const userResult = await supabaseClient
      .from("user_drive_connections")
      .select("access_token, token_expires_at, google_account_email")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .maybeSingle();

    if (userResult.data) {
      console.log("[list-google-drive-folders] Found user's own connection");
      connection = userResult.data;
    } else if (teamId) {
      // Fall back to team connection
      console.log("[list-google-drive-folders] No user connection, trying team connection for team:", teamId);
      const teamResult = await supabaseClient
        .from("user_drive_connections")
        .select("access_token, token_expires_at, google_account_email")
        .eq("team_id", teamId)
        .eq("provider", "google")
        .eq("is_active", true)
        .maybeSingle();

      connection = teamResult.data;
      connError = teamResult.error;
    }

    if (connError) {
      console.error("[list-google-drive-folders] DB error:", connError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connection?.access_token) {
      console.error("[list-google-drive-folders] No active connection found for user:", user.id, "or team:", teamId);
      return new Response(JSON.stringify({ error: "No active Google Drive connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[list-google-drive-folders] Found connection for Google account:", connection.google_account_email);

    // Fetch ALL folders from Google Drive with pagination
    // Including shared drives and folders shared with the user
    const allItems: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 20; // Safety limit to prevent infinite loops

    do {
      const params: Record<string, string> = {
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: "nextPageToken,files(id,name,mimeType,createdTime)",
        orderBy: "name",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true"
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const driveUrl = "https://www.googleapis.com/drive/v3/files?" + new URLSearchParams(params).toString();

      console.log(`[list-google-drive-folders] Fetching page ${pageCount + 1} for account:`, connection.google_account_email);

      const response = await fetch(driveUrl, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[list-google-drive-folders] Google Drive API error:", response.status, errorText);

        let googleError: any = {};
        try {
          googleError = JSON.parse(errorText);
        } catch {
          googleError = { raw: errorText };
        }

        if (response.status === 401) {
          return new Response(JSON.stringify({
            error: "Google Drive token expired. Please reconnect.",
            googleAccount: connection.google_account_email
          }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (response.status === 403) {
          const reason = googleError?.error?.errors?.[0]?.reason || googleError?.error?.message || "Unknown";
          console.error("[list-google-drive-folders] 403 Forbidden - Reason:", reason);
          return new Response(JSON.stringify({
            error: "Google Drive access denied. Please reconnect with Drive permissions.",
            reason: reason,
            details: googleError?.error?.message || "The app may need to be re-authorized with Drive access.",
            googleAccount: connection.google_account_email
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          error: "Failed to fetch folders from Google Drive",
          details: googleError?.error?.message || errorText
        }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const pageItems = data.files || [];
      allItems.push(...pageItems);

      pageToken = data.nextPageToken || null;
      pageCount++;

      console.log(`[list-google-drive-folders] Page ${pageCount}: fetched ${pageItems.length} folders, total so far: ${allItems.length}`);

    } while (pageToken && pageCount < maxPages);

    if (pageToken) {
      console.warn(`[list-google-drive-folders] Stopped at page limit (${maxPages}), may have more folders`);
    }
    
    // Double-filter to ensure ONLY folders are returned (belt and suspenders)
    const folders = allItems.filter((item: any) => 
      item.mimeType === 'application/vnd.google-apps.folder'
    );

    // Log any non-folder items that somehow got through
    const nonFolders = allItems.filter((item: any) => 
      item.mimeType !== 'application/vnd.google-apps.folder'
    );
    if (nonFolders.length > 0) {
      console.warn("[list-google-drive-folders] Filtered out non-folder items:", 
        nonFolders.map((f: any) => ({ name: f.name, mimeType: f.mimeType })));
    }

    const sampleNames = folders.slice(0, 5).map((f: any) => f.name);
    console.log("[list-google-drive-folders] Success - returned", folders.length, "folders. Sample:", sampleNames);

    return new Response(JSON.stringify({ 
      folders,
      googleAccount: connection.google_account_email,
      totalCount: folders.length
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[list-google-drive-folders] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});