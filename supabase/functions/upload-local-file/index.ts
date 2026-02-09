import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CENTRAL_LOCAL_UPLOADS_FOLDER_ID = "1P-QEFfJQrfw8jlVL6kM5BeK_l1YXC-x1";
const ROCKETHUB_ADMIN_EMAIL = "clay@rockethub.ai";

interface UploadPayload {
  storagePath: string;
  filename: string;
  mimeType: string;
  category?: string;
  teamId: string;
  userId: string;
  uploadId: string;
  fileSize: number;
}

async function refreshGoogleToken(supabase: any, connectionId: string, refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("[upload-local-file] Missing Google OAuth credentials");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[upload-local-file] Token refresh failed:", errorText);
      return null;
    }

    const tokens = await response.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000);

    await supabase
      .from("user_drive_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", connectionId);

    return tokens.access_token;
  } catch (error) {
    console.error("[upload-local-file] Token refresh error:", error);
    return null;
  }
}

async function uploadToGoogleDrive(
  accessToken: string,
  fileBuffer: Uint8Array,
  filename: string,
  mimeType: string,
  folderId: string
): Promise<{ fileId: string; webViewLink?: string } | null> {
  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const boundary = "foo_bar_baz_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataString = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const metadataBytes = encoder.encode(
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    metadataString +
    delimiter +
    `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const closeBytes = encoder.encode(closeDelimiter);

  const totalLength = metadataBytes.length + fileBuffer.length + closeBytes.length;
  const body = new Uint8Array(totalLength);
  body.set(metadataBytes, 0);
  body.set(fileBuffer, metadataBytes.length);
  body.set(closeBytes, metadataBytes.length + fileBuffer.length);

  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": totalLength.toString(),
      },
      body: body,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error("[upload-local-file] Google Drive upload failed:", uploadResponse.status, errorText);
    return null;
  }

  const uploadedFile = await uploadResponse.json();
  console.log("[upload-local-file] File uploaded to Google Drive:", uploadedFile.id, uploadedFile.name);
  return { fileId: uploadedFile.id, webViewLink: uploadedFile.webViewLink };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json() as UploadPayload;

    if (!payload.filename || !payload.storagePath || !payload.teamId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (payload.fileSize > maxSize) {
      return new Response(
        JSON.stringify({ error: "File size exceeds 50 MB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData || userData.team_id !== payload.teamId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - team mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("local-uploads")
      .download(payload.storagePath);

    if (downloadError || !fileData) {
      console.error("[upload-local-file] Storage download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
    const sanitizedFilename = payload.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = payload.filename.toLowerCase();
    const isMarkdown = fileName.endsWith(".md") || fileName.endsWith(".markdown");
    const finalMimeType = isMarkdown ? "text/markdown" : (payload.mimeType || "application/octet-stream");

    const { data: rocketHubConnection, error: connError } = await supabase
      .from("user_drive_connections")
      .select("id, access_token, refresh_token, token_expires_at, is_active")
      .eq("google_account_email", ROCKETHUB_ADMIN_EMAIL)
      .eq("is_active", true)
      .maybeSingle();

    if (connError || !rocketHubConnection?.access_token) {
      console.error("[upload-local-file] Failed to get RocketHub drive connection:", connError);
      return new Response(
        JSON.stringify({
          error: "Central upload service unavailable. Please try again later.",
          details: "RocketHub drive connection not found"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = rocketHubConnection.access_token;

    const tokenExpiresAt = rocketHubConnection.token_expires_at ? new Date(rocketHubConnection.token_expires_at) : null;
    const needsRefresh = !tokenExpiresAt || tokenExpiresAt <= new Date(Date.now() + 5 * 60 * 1000);

    if (needsRefresh && rocketHubConnection.refresh_token) {
      console.log("[upload-local-file] RocketHub token expired or expiring soon, refreshing...");
      const newToken = await refreshGoogleToken(supabase, rocketHubConnection.id, rocketHubConnection.refresh_token);
      if (newToken) {
        accessToken = newToken;
      } else {
        return new Response(
          JSON.stringify({
            error: "Central upload service token expired. Please contact support.",
            needsAdminReauth: true
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[upload-local-file] Uploading to central Local Uploads folder:", CENTRAL_LOCAL_UPLOADS_FOLDER_ID);
    const driveResult = await uploadToGoogleDrive(accessToken, fileBuffer, sanitizedFilename, finalMimeType, CENTRAL_LOCAL_UPLOADS_FOLDER_ID);

    if (!driveResult) {
      return new Response(
        JSON.stringify({ error: "Failed to upload file to Google Drive" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[upload-local-file] Successfully uploaded to Google Drive:", driveResult.fileId);

    const n8nWebhookUrl = Deno.env.get("N8N_UNIFIED_SYNC_WEBHOOK");
    if (n8nWebhookUrl) {
      try {
        const webhookPayload = {
          team_id: payload.teamId,
          user_id: user.id,
          folder_id: CENTRAL_LOCAL_UPLOADS_FOLDER_ID,
          files: [{
            file_id: driveResult.fileId,
            file_name: sanitizedFilename,
            mime_type: finalMimeType,
            upload_source: "local_upload",
            google_drive_id: driveResult.fileId,
            folder_id: CENTRAL_LOCAL_UPLOADS_FOLDER_ID,
            uploaded_by: user.id,
            uploading_team_id: payload.teamId,
            original_filename: payload.filename,
            category: payload.category || "other",
            file_size: payload.fileSize,
            web_view_link: driveResult.webViewLink,
          }],
        };

        console.log("[upload-local-file] Triggering n8n webhook with Google Drive file:", driveResult.fileId);
        await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });
      } catch (webhookError) {
        console.error("[upload-local-file] n8n webhook error:", webhookError);
      }
    }

    try {
      await supabase.storage
        .from("local-uploads")
        .remove([payload.storagePath]);
      console.log("[upload-local-file] Cleaned up temporary storage file");
    } catch (cleanupError) {
      console.error("[upload-local-file] Failed to clean up storage (non-critical):", cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        uploadId: payload.uploadId,
        fileId: driveResult.fileId,
        driveFileId: driveResult.fileId,
        webViewLink: driveResult.webViewLink,
        filename: payload.filename,
        size: payload.fileSize,
        mimeType: finalMimeType,
        uploadedToGoogleDrive: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[upload-local-file] Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});