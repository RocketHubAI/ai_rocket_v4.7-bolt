import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const N8N_UNIFIED_SYNC_URL = 'https://healthrocket.app.n8n.cloud/webhook/astra-unified-manual-sync';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();

    if (!payload.team_id || !payload.user_id || !payload.folder_id || !payload.access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: team_id, user_id, folder_id, access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const provider = payload.provider || 'google';
    console.log(`[manual-folder-sync-proxy] Creating sync session for team ${payload.team_id}, provider: ${provider}`);

    if (provider === 'microsoft' && !payload.microsoft_drive_id) {
      console.log('[manual-folder-sync-proxy] Microsoft sync requires microsoft_drive_id, fetching from connection...');
      const { data: connection } = await supabase
        .from('user_drive_connections')
        .select('microsoft_drive_id')
        .eq('user_id', payload.user_id)
        .eq('provider', 'microsoft')
        .eq('is_active', true)
        .maybeSingle();
      
      if (connection?.microsoft_drive_id) {
        payload.microsoft_drive_id = connection.microsoft_drive_id;
        console.log(`[manual-folder-sync-proxy] Found microsoft_drive_id: ${payload.microsoft_drive_id}`);
      } else {
        console.error('[manual-folder-sync-proxy] Microsoft drive ID not found in connection');
        return new Response(
          JSON.stringify({ error: 'Microsoft drive ID not found. Please reconnect your Microsoft account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const folderName = payload.folder_name || 'Root';

    const { data: session, error: sessionError } = await supabase
      .from('data_sync_sessions')
      .insert({
        team_id: payload.team_id,
        user_id: payload.user_id,
        sync_type: 'manual',
        root_folder_id: payload.folder_id,
        additional_folders: { folder_name: folderName, folder_type: payload.folder_type || folderName },
        status: 'in_progress',
        total_files_discovered: 0,
        files_stored: 0,
        files_classified: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[manual-folder-sync-proxy] Failed to create sync session:', sessionError);
    } else {
      console.log(`[manual-folder-sync-proxy] Created sync session: ${session.id}`);
    }

    console.log(`[manual-folder-sync-proxy] Forwarding sync request to UNIFIED workflow for team ${payload.team_id}, folder: ${folderName}, provider: ${provider}`);

    const n8nPayload: Record<string, unknown> = {
      team_id: payload.team_id,
      user_id: payload.user_id,
      folder_id: payload.folder_id,
      folder_type: payload.folder_type || folderName,
      access_token: payload.access_token,
      folder_name: folderName,
      folder_path: payload.folder_path || '/',
      max_depth: payload.max_depth || 10,
      exclude_folders: payload.exclude_folders || ['Archive', 'Old', 'Trash', '.hidden'],
      sync_session_id: session?.id,
      provider: provider,
    };

    if (provider === 'microsoft' && payload.microsoft_drive_id) {
      n8nPayload.microsoft_drive_id = payload.microsoft_drive_id;
      console.log(`[manual-folder-sync-proxy] Including microsoft_drive_id: ${payload.microsoft_drive_id}`);
    }

    const n8nResponse = await fetch(N8N_UNIFIED_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    let responseData;
    const responseText = await n8nResponse.text();

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { success: n8nResponse.ok, message: responseText || 'Sync triggered' };
      }
    } else {
      responseData = { success: n8nResponse.ok, message: 'Sync triggered successfully' };
    }

    if (session) {
      responseData.session_id = session.id;
    }

    console.log(`[manual-folder-sync-proxy] n8n unified workflow response status: ${n8nResponse.status}`);

    return new Response(
      JSON.stringify(responseData),
      {
        status: n8nResponse.ok ? 200 : n8nResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[manual-folder-sync-proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});