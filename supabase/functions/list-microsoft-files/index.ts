import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webUrl?: string;
  category?: string;
}

interface FolderResult {
  files: DriveFile[];
  subfolders: { id: string; name: string }[];
}

async function refreshMicrosoftToken(supabase: any, connection: any): Promise<string | null> {
  const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

  if (!microsoftClientId || !microsoftClientSecret || !connection.refresh_token) {
    console.log('[list-microsoft-files] Cannot refresh: missing credentials or refresh token');
    return null;
  }

  console.log('[list-microsoft-files] Attempting token refresh...');

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
      console.error('[list-microsoft-files] Token refresh failed:', tokens.error);
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

    console.log('[list-microsoft-files] Token refreshed successfully');
    return cleanAccessToken;
  } catch (e) {
    console.error('[list-microsoft-files] Token refresh error:', e);
    return null;
  }
}

function categorizeMimeType(mimeType: string): string {
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType === 'application/pdf') {
    return 'document';
  } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return 'spreadsheet';
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'presentation';
  } else if (mimeType.includes('text') || mimeType === 'text/markdown') {
    return 'text';
  }
  return 'other';
}

async function fetchFilesFromFolder(
  driveId: string,
  folderId: string,
  accessToken: string
): Promise<FolderResult> {
  const allFiles: DriveFile[] = [];
  const subfolders: { id: string; name: string }[] = [];
  let nextLink: string | null = null;
  let pageCount = 0;
  const maxPages = 5;

  const graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children?$select=id,name,file,folder,lastModifiedDateTime,size,webUrl&$top=200`;

  let currentUrl = graphUrl;

  do {
    const response = await fetch(currentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const items = data.value || [];

    for (const item of items) {
      if (item.folder) {
        subfolders.push({ id: item.id, name: item.name });
      } else if (item.file) {
        const mimeType = item.file?.mimeType || 'application/octet-stream';
        allFiles.push({
          id: item.id,
          name: item.name,
          mimeType: mimeType,
          modifiedTime: item.lastModifiedDateTime,
          size: item.size?.toString(),
          webUrl: item.webUrl,
          category: categorizeMimeType(mimeType)
        });
      }
    }

    nextLink = data['@odata.nextLink'] || null;
    currentUrl = nextLink || '';
    pageCount++;

  } while (nextLink && pageCount < maxPages);

  return { files: allFiles, subfolders };
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

    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId');
    let driveId = url.searchParams.get('driveId');
    const includeSubfolders = url.searchParams.get('includeSubfolders') !== 'false';
    const maxDepth = parseInt(url.searchParams.get('maxDepth') || '2', 10);

    if (!folderId) {
      return new Response(
        JSON.stringify({ error: 'folderId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[list-microsoft-files] Starting file list for folder:', folderId, 'includeSubfolders:', includeSubfolders, 'maxDepth:', maxDepth);

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
      console.log('[list-microsoft-files] Token expired or expiring soon, refreshing...');
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

    if (!driveId && connection.microsoft_drive_id) {
      driveId = connection.microsoft_drive_id;
    }

    if (!driveId) {
      console.log('[list-microsoft-files] No drive ID, fetching default drive...');
      const meResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        console.error('[list-microsoft-files] Failed to get default drive:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to get drive' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const driveData = await meResponse.json();
      driveId = driveData.id;
    }

    console.log('[list-microsoft-files] Fetching files from drive:', driveId, 'folder:', folderId);

    const allFiles: DriveFile[] = [];
    let totalSubfolders = 0;
    let foldersScanned = 0;

    const foldersToProcess: { id: string; depth: number; name: string }[] = [{ id: folderId, depth: 0, name: 'root' }];

    while (foldersToProcess.length > 0) {
      const currentFolder = foldersToProcess.shift()!;
      foldersScanned++;

      try {
        const result = await fetchFilesFromFolder(driveId!, currentFolder.id, accessToken);

        allFiles.push(...result.files);
        totalSubfolders += result.subfolders.length;

        console.log(`[list-microsoft-files] Folder depth ${currentFolder.depth} (${currentFolder.name}): found ${result.files.length} files, ${result.subfolders.length} subfolders`);

        if (includeSubfolders && currentFolder.depth < maxDepth - 1) {
          for (const subfolder of result.subfolders) {
            foldersToProcess.push({ id: subfolder.id, depth: currentFolder.depth + 1, name: subfolder.name });
          }
        }
      } catch (error) {
        console.error(`[list-microsoft-files] Error fetching folder ${currentFolder.id}:`, error);

        if (currentFolder.depth === 0) {
          const errorText = error instanceof Error ? error.message : String(error);

          if (errorText.includes('401')) {
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

          if (errorText.includes('404')) {
            return new Response(
              JSON.stringify({ files: [], totalCount: 0, folderId, subfolderCount: 0 }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          throw error;
        }
      }
    }

    const sampleNames = allFiles.slice(0, 5).map(f => f.name);
    console.log('[list-microsoft-files] Success - Found', allFiles.length, 'files from', foldersScanned, 'folders (' + totalSubfolders + ' subfolders). Sample:', sampleNames);

    return new Response(
      JSON.stringify({
        files: allFiles,
        totalCount: allFiles.length,
        folderId,
        subfolderCount: totalSubfolders,
        foldersScanned,
        microsoftAccount: connection.microsoft_email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[list-microsoft-files] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
