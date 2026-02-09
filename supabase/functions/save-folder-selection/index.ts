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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { folderIds, folderType, folderName, provider } = await req.json();
    if (!folderIds || !folderType) {
      return new Response(JSON.stringify({ error: "Folder IDs and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamId = user.user_metadata?.team_id;
    if (!teamId) {
      return new Response(JSON.stringify({ error: "No team ID found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveProvider = provider || 'google';

    // Update the user_drive_connections table with selected folders
    const updateData: any = {};

    // Handle root folder separately - it doesn't use the _folder suffix
    if (folderType === 'root') {
      if (folderIds.length > 0) {
        updateData.root_folder_id = folderIds[0];
        if (folderName) {
          updateData.root_folder_name = folderName;
        }
        updateData.root_folder_connected_by = user.id;
      } else {
        updateData.root_folder_id = null;
        updateData.root_folder_name = null;
        updateData.root_folder_connected_by = null;
      }
    } else {
      // Handle other folder types (strategy, meetings, financial, projects) - DEPRECATED
      // These are legacy columns and should not be used for new folder connections
      if (folderIds.length > 0) {
        updateData[`${folderType}_folder_id`] = folderIds[0];
        if (folderName) {
          updateData[`${folderType}_folder_name`] = folderName;
        }
      } else {
        updateData[`${folderType}_folder_id`] = null;
        updateData[`${folderType}_folder_name`] = null;
      }
    }

    const { error: updateError } = await supabaseClient
      .from("user_drive_connections")
      .update(updateData)
      .eq("team_id", teamId)
      .eq("provider", driveProvider);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to save folder selection" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in save-folder-selection:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});