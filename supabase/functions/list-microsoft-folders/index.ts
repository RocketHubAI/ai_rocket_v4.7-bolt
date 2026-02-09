import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function refreshMicrosoftToken(supabase: any, connection: any): Promise<string | null> {
  const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

  if (!microsoftClientId || !microsoftClientSecret || !connection.refresh_token) {
    console.log('[List Microsoft Folders] Cannot refresh: missing credentials or refresh token');
    return null;
  }

  console.log('[List Microsoft Folders] Attempting token refresh...');

  try {
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: microsoftClientId,
        client_secret: microsoftClientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[List Microsoft Folders] Token refresh failed:', tokens.error);
      return null;
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const cleanAccessToken = tokens.access_token?.replace?.(/[\r\n]/g, '') || tokens.access_token;
    const cleanRefreshToken = tokens.refresh_token?.replace?.(/[\r\n]/g, '') || tokens.refresh_token || connection.refresh_token;

    await supabase
      .from('user_drive_connections')
      .update({
        access_token: cleanAccessToken,
        refresh_token: cleanRefreshToken,
        token_expires_at: expiresAt.toISOString(),
        connection_status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id);

    console.log('[List Microsoft Folders] Token refreshed successfully');
    return cleanAccessToken;
  } catch (e) {
    console.error('[List Microsoft Folders] Token refresh error:', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let { data: connection, error: connError } = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'microsoft')
      .eq('is_active', true)
      .maybeSingle();

    if (!connection) {
      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', userId)
        .maybeSingle();

      if (userData?.team_id) {
        const teamResult = await supabase
          .from('user_drive_connections')
          .select('*')
          .eq('team_id', userData.team_id)
          .eq('provider', 'microsoft')
          .eq('is_active', true)
          .maybeSingle();

        connection = teamResult.data;
        connError = teamResult.error;
      }
    }

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Microsoft connection not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let accessToken = connection.access_token;
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const isExpiredOrSoon = tokenExpiresAt && (tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000);

    if (isExpiredOrSoon || connection.connection_status === 'token_expired') {
      console.log('[List Microsoft Folders] Token expired or expiring soon, refreshing...');
      const newToken = await refreshMicrosoftToken(supabase, connection);
      if (newToken) {
        accessToken = newToken;
      } else {
        return new Response(
          JSON.stringify({ error: 'Token expired. Please reconnect.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const url = new URL(req.url);
    let driveId = url.searchParams.get('driveId');
    const itemId = url.searchParams.get('itemId') || 'root';

    if (!driveId && connection.microsoft_drive_id) {
      driveId = connection.microsoft_drive_id;
      console.log('[List Microsoft Folders] Using stored drive ID:', driveId);
    }

    if (!driveId) {
      console.log('[List Microsoft Folders] No drive ID provided, fetching default drive...');
      let meResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (meResponse.status === 401) {
        console.log('[List Microsoft Folders] Got 401 on drive fetch, attempting refresh...');
        const newToken = await refreshMicrosoftToken(supabase, connection);
        if (newToken) {
          accessToken = newToken;
          meResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        }
      }

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        console.error('[List Microsoft Folders] Failed to get default drive:', meResponse.status, errorText);

        if (meResponse.status === 401) {
          await supabase
            .from('user_drive_connections')
            .update({ connection_status: 'token_expired' })
            .eq('id', connection.id);

          return new Response(
            JSON.stringify({ error: 'Token expired. Please reconnect.' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        let errorDetail = 'Failed to get default drive';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorDetail = `${errorDetail}: ${errorJson.error.message}`;
          }
        } catch {}

        return new Response(
          JSON.stringify({ error: errorDetail, status: meResponse.status }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const driveData = await meResponse.json();
      driveId = driveData.id;
      console.log('[List Microsoft Folders] Got default drive ID:', driveId);

      if (driveId) {
        await supabase
          .from('user_drive_connections')
          .update({ microsoft_drive_id: driveId })
          .eq('id', connection.id);
        console.log('[List Microsoft Folders] Saved drive ID to connection');
      }
    }

    if (!driveId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine drive ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[List Microsoft Folders] Fetching folders from drive:', driveId, 'item:', itemId);

    let graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children?$filter=folder ne null&$select=id,name,folder,webUrl,parentReference`;

    let foldersResponse = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (foldersResponse.status === 401) {
      console.log('[List Microsoft Folders] Got 401 on folder fetch, attempting refresh...');
      const newToken = await refreshMicrosoftToken(supabase, connection);
      if (newToken) {
        accessToken = newToken;
        foldersResponse = await fetch(graphUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
    }

    if (foldersResponse.status === 400) {
      const errorText = await foldersResponse.text();
      console.log('[List Microsoft Folders] Got 400 error, checking if drive ID is invalid:', errorText);

      if (errorText.includes('invalidRequest') || errorText.includes('malformed') || errorText.includes('does not represent a valid drive')) {
        console.log('[List Microsoft Folders] Stored drive ID appears invalid, clearing and re-fetching default drive...');

        await supabase
          .from('user_drive_connections')
          .update({ microsoft_drive_id: null })
          .eq('id', connection.id);

        const meResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (meResponse.ok) {
          const driveData = await meResponse.json();
          const newDriveId = driveData.id;
          console.log('[List Microsoft Folders] Got fresh drive ID:', newDriveId);

          if (newDriveId) {
            await supabase
              .from('user_drive_connections')
              .update({ microsoft_drive_id: newDriveId })
              .eq('id', connection.id);

            driveId = newDriveId;
            graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children?$filter=folder ne null&$select=id,name,folder,webUrl,parentReference`;

            foldersResponse = await fetch(graphUrl, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
          }
        } else {
          console.error('[List Microsoft Folders] Failed to re-fetch default drive:', meResponse.status);
        }
      }
    }

    if (!foldersResponse.ok) {
      const errorText = await foldersResponse.text();
      console.error('[List Microsoft Folders] Graph API error:', foldersResponse.status, errorText);

      if (foldersResponse.status === 401) {
        await supabase
          .from('user_drive_connections')
          .update({ connection_status: 'token_expired' })
          .eq('id', connection.id);

        return new Response(
          JSON.stringify({ error: 'Token expired. Please reconnect.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error(`Failed to list folders: ${errorText}`);
    }

    const data = await foldersResponse.json();
    const items = data.value || [];

    const folders = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      parentReference: item.parentReference ? {
        driveId: item.parentReference.driveId,
        id: item.parentReference.id,
        path: item.parentReference.path
      } : undefined
    }));

    console.log('[List Microsoft Folders] Found', folders.length, 'folders');

    return new Response(
      JSON.stringify({ folders }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[List Microsoft Folders] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});