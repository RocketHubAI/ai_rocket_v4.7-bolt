import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  iconLink?: string;
  webViewLink?: string;
}

interface DriveItem extends DriveFile {
  category?: string;
}

async function fetchFilesFromFolder(
  folderId: string,
  accessToken: string,
  maxPages: number = 3
): Promise<{ files: DriveFile[]; subfolders: DriveFile[] }> {
  const allItems: DriveFile[] = [];
  let pageToken: string | null = null;
  let pageCount = 0;

  do {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,iconLink,webViewLink)",
      orderBy: "modifiedTime desc",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true"
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const driveUrl = "https://www.googleapis.com/drive/v3/files?" + new URLSearchParams(params).toString();

    const response = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    const pageItems = data.files || [];
    allItems.push(...pageItems);

    pageToken = data.nextPageToken || null;
    pageCount++;

  } while (pageToken && pageCount < maxPages);

  const files = allItems.filter((item: DriveFile) =>
    item.mimeType !== 'application/vnd.google-apps.folder'
  );

  const subfolders = allItems.filter((item: DriveFile) =>
    item.mimeType === 'application/vnd.google-apps.folder'
  );

  return { files, subfolders };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("[list-google-drive-files] Starting file list request");

    const url = new URL(req.url);
    const folderId = url.searchParams.get("folderId");
    const includeSubfolders = url.searchParams.get("includeSubfolders") !== "false";
    const maxDepth = parseInt(url.searchParams.get("maxDepth") || "2", 10);

    if (!folderId) {
      return new Response(JSON.stringify({ error: "folderId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("[list-google-drive-files] Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[list-google-drive-files] User authenticated:", user.id, user.email);

    const teamId = user.user_metadata?.team_id;
    console.log("[list-google-drive-files] User team_id:", teamId);

    let connection = null;
    let connError = null;

    const userResult = await supabaseClient
      .from("user_drive_connections")
      .select("access_token, token_expires_at, google_account_email")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .maybeSingle();

    if (userResult.data) {
      console.log("[list-google-drive-files] Found user's own connection");
      connection = userResult.data;
    } else if (teamId) {
      console.log("[list-google-drive-files] No user connection, trying team connection for team:", teamId);
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
      console.error("[list-google-drive-files] DB error:", connError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connection?.access_token) {
      console.error("[list-google-drive-files] No active connection found for user:", user.id, "or team:", teamId);
      return new Response(JSON.stringify({ error: "No active Google Drive connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[list-google-drive-files] Found connection for Google account:", connection.google_account_email);
    console.log("[list-google-drive-files] Fetching files from folder:", folderId, "includeSubfolders:", includeSubfolders, "maxDepth:", maxDepth);

    const allFiles: DriveFile[] = [];
    let totalSubfolders = 0;

    const foldersToProcess: { id: string; depth: number }[] = [{ id: folderId, depth: 0 }];

    while (foldersToProcess.length > 0) {
      const currentFolder = foldersToProcess.shift()!;

      try {
        const { files, subfolders } = await fetchFilesFromFolder(
          currentFolder.id,
          connection.access_token,
          3
        );

        allFiles.push(...files);
        totalSubfolders += subfolders.length;

        console.log(`[list-google-drive-files] Folder depth ${currentFolder.depth}: found ${files.length} files, ${subfolders.length} subfolders`);

        if (includeSubfolders && currentFolder.depth < maxDepth - 1) {
          for (const subfolder of subfolders) {
            foldersToProcess.push({ id: subfolder.id, depth: currentFolder.depth + 1 });
          }
        }
      } catch (error) {
        console.error(`[list-google-drive-files] Error fetching folder ${currentFolder.id}:`, error);
        if (currentFolder.depth === 0) {
          const errorText = error instanceof Error ? error.message : String(error);

          if (errorText.includes("401")) {
            return new Response(JSON.stringify({
              error: "Google Drive token expired. Please reconnect.",
              googleAccount: connection.google_account_email
            }), {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (errorText.includes("403")) {
            return new Response(JSON.stringify({
              error: "Google Drive access denied. Please reconnect with Drive permissions.",
              googleAccount: connection.google_account_email
            }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (errorText.includes("404")) {
            return new Response(JSON.stringify({
              error: "Folder not found or access denied",
              files: [],
              totalCount: 0
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({
            error: "Failed to fetch files from Google Drive",
            details: errorText
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const categorizedFiles = allFiles.map((file: DriveFile) => {
      let category = 'other';
      const mimeType = file.mimeType;

      if (mimeType.includes('document') || mimeType.includes('word') || mimeType === 'application/pdf') {
        category = 'document';
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
        category = 'spreadsheet';
      } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        category = 'presentation';
      } else if (mimeType.includes('text') || mimeType === 'text/markdown') {
        category = 'text';
      }

      return {
        ...file,
        category
      };
    });

    const sampleNames = categorizedFiles.slice(0, 5).map((f: DriveItem) => f.name);
    console.log("[list-google-drive-files] Success - returned", categorizedFiles.length, "files from", totalSubfolders, "subfolders. Sample:", sampleNames);

    return new Response(JSON.stringify({
      files: categorizedFiles,
      googleAccount: connection.google_account_email,
      totalCount: categorizedFiles.length,
      subfolderCount: totalSubfolders,
      folderId: folderId
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[list-google-drive-files] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
