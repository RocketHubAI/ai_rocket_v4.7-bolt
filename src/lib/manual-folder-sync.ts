import { supabase } from './supabase';

export interface ManualSyncPayload {
  team_id: string;
  user_id: string;
  folder_id: string;
  access_token: string;
  folder_name?: string;
  folder_path?: string;
  folder_type?: string;
  max_depth?: number;
  exclude_folders?: string[];
  provider?: 'google' | 'microsoft';
  microsoft_drive_id?: string;
}

export interface ManualSyncResponse {
  success: boolean;
  message: string;
  team_id: string;
  folder_id: string;
  folder_name: string;
  files_sent?: number;
  files_failed?: number;
  completed_at?: string;
  has_files?: boolean;
  files_found?: number;
}

const getManualSyncProxyUrl = () => {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manual-folder-sync-proxy`;
};

const getN8nProxyUrl = () => {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy`;
};

export interface IncrementalSyncPayload {
  team_id: string;
  user_id: string;
  folder_id: string;
  access_token: string;
  folder_name?: string;
  folder_path?: string;
  folder_type?: string;
  max_depth?: number;
  exclude_folders?: string[];
  provider?: 'google' | 'microsoft';
  sync_state_token?: string;
  microsoft_drive_id?: string;
}

const N8N_UNIFIED_SYNC_URL = 'https://n8n.rockethub.ai/webhook/astra-unified-manual-sync';
const N8N_SYNC_NOW_URL = 'https://n8n.rockethub.ai/webhook/astra-sync-now';

export interface SyncNowPayload {
  team_id: string;
  user_id: string;
  folder_ids?: string[];
  source: 'manual_sync_now' | 'new_folder_connected';
}

export async function triggerSyncNow(payload: SyncNowPayload): Promise<{ success: boolean; message: string; session_id?: string }> {
  console.log('[triggerSyncNow] Triggering sync via n8n-proxy...');
  console.log('[triggerSyncNow] Payload:', {
    team_id: payload.team_id,
    user_id: payload.user_id,
    folder_ids: payload.folder_ids,
    source: payload.source
  });

  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.error('[triggerSyncNow] No auth session available');
      return {
        success: false,
        message: 'No authentication session',
      };
    }

    let sessionId: string | undefined;
    const { data: sessionResult, error: sessionError } = await supabase.rpc('create_sync_session', {
      p_team_id: payload.team_id,
      p_user_id: payload.user_id,
      p_sync_type: 'manual',
      p_source: payload.source,
      p_folder_ids: payload.folder_ids || null
    });

    if (sessionError) {
      console.error('[triggerSyncNow] Failed to create sync session:', sessionError);
    } else {
      sessionId = sessionResult?.session_id;
      console.log('[triggerSyncNow] Created sync session:', sessionId);
    }

    const proxyUrl = getN8nProxyUrl();
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({
        webhook_path: 'astra-sync-now',
        method: 'GET',
        query_params: {
          team_id: payload.team_id,
          user_id: payload.user_id,
          folder_ids: payload.folder_ids?.join(',') || '',
          source: payload.source,
        },
      }),
      keepalive: true,
    });

    if (response.ok) {
      const text = await response.text();
      console.log('[triggerSyncNow] Sync triggered successfully:', text);
      return {
        success: true,
        message: payload.folder_ids?.length
          ? `Sync queued for ${payload.folder_ids.length} folder(s)`
          : 'Sync queued for all folders',
        session_id: sessionId,
      };
    } else {
      const errorText = await response.text();
      console.error('[triggerSyncNow] Failed to trigger sync:', response.status, errorText);
      return {
        success: false,
        message: `Failed to trigger sync: ${response.status}`,
        session_id: sessionId,
      };
    }
  } catch (error) {
    console.error('[triggerSyncNow] Error triggering sync:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function triggerIncrementalSync(payload: IncrementalSyncPayload): Promise<{ success: boolean; message: string }> {
  const provider = payload.provider || 'google';
  console.log(`Triggering incremental sync via unified workflow for ${provider}...`);

  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.error('No auth session available for incremental sync');
      return {
        success: false,
        message: 'No authentication session',
      };
    }

    const webhookPayload: Record<string, unknown> = {
      team_id: payload.team_id,
      user_id: payload.user_id,
      folder_id: payload.folder_id,
      folder_type: payload.folder_type || payload.folder_name || 'Root',
      access_token: payload.access_token,
      folder_name: payload.folder_name || 'Root',
      folder_path: payload.folder_path || '/',
      max_depth: payload.max_depth || 10,
      exclude_folders: payload.exclude_folders || ['Archive', 'Old', 'Trash', '.hidden'],
      provider: provider,
    };

    if (payload.sync_state_token) {
      webhookPayload.sync_state_token = payload.sync_state_token;
      console.log(`[triggerIncrementalSync] Using sync_state_token for incremental sync`);
    }

    if (provider === 'microsoft' && payload.microsoft_drive_id) {
      webhookPayload.microsoft_drive_id = payload.microsoft_drive_id;
      console.log(`[triggerIncrementalSync] Including microsoft_drive_id for Microsoft sync`);
    }

    const response = await fetch(N8N_UNIFIED_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
      keepalive: true,
    });

    if (response.ok) {
      const text = await response.text();
      console.log('Incremental sync triggered successfully via unified workflow:', text);
      return {
        success: true,
        message: 'Incremental sync started - processing changes in background',
      };
    } else {
      console.error('Failed to trigger incremental sync:', response.status);
      return {
        success: false,
        message: 'Failed to trigger sync',
      };
    }
  } catch (error) {
    console.error('Error triggering incremental sync:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function triggerManualFolderSync(payload: ManualSyncPayload): Promise<ManualSyncResponse> {
  const proxyUrl = getManualSyncProxyUrl();
  const folderName = payload.folder_name || 'Root';

  console.log('========================================');
  console.log('[triggerManualFolderSync] CALLING EDGE FUNCTION PROXY');
  console.log('[triggerManualFolderSync] URL:', proxyUrl);
  console.log('[triggerManualFolderSync] Payload:', JSON.stringify({
    team_id: payload.team_id,
    user_id: payload.user_id,
    folder_id: payload.folder_id,
    folder_name: folderName,
    access_token: '[REDACTED]'
  }, null, 2));
  console.log('========================================');

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    console.error('[triggerManualFolderSync] No auth session available');
    return {
      success: false,
      message: 'No authentication session',
      team_id: payload.team_id,
      folder_id: payload.folder_id,
      folder_name: folderName,
      files_sent: 0,
      files_failed: 0,
    };
  }

  fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify({
      ...payload,
      folder_name: folderName,
    }),
    keepalive: true,
  }).then(async (response) => {
    if (response.ok) {
      console.log('[triggerManualFolderSync] Proxy request completed for', folderName);
    } else {
      const errorText = await response.text();
      console.error('[triggerManualFolderSync] Proxy request failed for', folderName, ':', response.status, errorText);
    }
  }).catch((err) => {
    console.error('[triggerManualFolderSync] Proxy request FAILED for', folderName, ':', err);
  });

  console.log('[triggerManualFolderSync] Sync triggered successfully for', folderName, '- processing in background');

  return {
    success: true,
    message: 'Sync triggered successfully',
    team_id: payload.team_id,
    folder_id: payload.folder_id,
    folder_name: folderName,
    files_sent: 1,
    files_failed: 0,
  };
}

interface DriveConnection {
  id: string;
  provider: 'google' | 'microsoft';
  access_token: string;
  refresh_token?: string;
  token_expires_at: string;
  sync_state_token?: string;
  microsoft_drive_id?: string;
  root_folder_id?: string;
  root_folder_name?: string;
  [key: `folder_${number}_id`]: string | undefined;
  [key: `folder_${number}_name`]: string | undefined;
  [key: `folder_${number}_enabled`]: boolean | undefined;
}

async function getValidAccessToken(teamId: string, userId: string, provider: 'google' | 'microsoft' = 'google'): Promise<string | null> {
  console.log(`getValidAccessToken: Querying by user_id: ${userId}, provider: ${provider}`);
  let { data: connection, error } = await supabase
    .from('user_drive_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle();

  console.log('getValidAccessToken: Query by user_id result:', { hasConnection: !!connection, error });

  if (!connection && !error) {
    console.log('getValidAccessToken: No connection found by user_id, trying team_id:', teamId);
    const result = await supabase
      .from('user_drive_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('team_id', teamId)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    console.log('getValidAccessToken: Query by team_id result:', { hasConnection: !!result.data, error: result.error });
    connection = result.data;
    error = result.error;
  }

  if (error || !connection) {
    console.error('getValidAccessToken: Failed to get drive connection:', error);
    return null;
  }

  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMinutes = 5;
  const needsRefresh = expiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000;

  if (needsRefresh) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.error('No auth session available');
      return null;
    }

    try {
      const refreshEndpoint = provider === 'microsoft'
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microsoft-graph-refresh-token`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-refresh-token`;

      const refreshResponse = await fetch(refreshEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team_id: teamId }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        return refreshData.access_token;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }

  return connection.access_token;
}

async function getAllDriveConnections(teamId: string, userId: string): Promise<DriveConnection[]> {
  console.log('[getAllDriveConnections] Fetching all active connections for team:', teamId, 'user:', userId);

  const folderColumns = Array.from({ length: 19 }, (_, i) => i + 1)
    .map(i => `folder_${i}_id, folder_${i}_name, folder_${i}_enabled`)
    .join(',\n      ');

  const { data: userConnections } = await supabase
    .from('user_drive_connections')
    .select(`
      id, provider, access_token, refresh_token, token_expires_at, sync_state_token, microsoft_drive_id,
      root_folder_id, root_folder_name,
      ${folderColumns}
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: teamConnections } = await supabase
    .from('user_drive_connections')
    .select(`
      id, provider, access_token, refresh_token, token_expires_at, sync_state_token, microsoft_drive_id,
      root_folder_id, root_folder_name,
      ${folderColumns}
    `)
    .eq('team_id', teamId)
    .eq('is_active', true);

  const allConnections: DriveConnection[] = [];
  const seenProviders = new Set<string>();

  if (userConnections) {
    for (const conn of userConnections) {
      allConnections.push(conn as DriveConnection);
      seenProviders.add(conn.provider);
    }
  }

  if (teamConnections) {
    for (const conn of teamConnections) {
      if (!seenProviders.has(conn.provider)) {
        allConnections.push(conn as DriveConnection);
        seenProviders.add(conn.provider);
      }
    }
  }

  console.log('[getAllDriveConnections] Found', allConnections.length, 'connections:', allConnections.map(c => c.provider));
  return allConnections;
}

interface FolderToSync {
  id: string;
  name: string;
  slot: string;
  provider: 'google' | 'microsoft';
  sync_state_token?: string;
  microsoft_drive_id?: string;
}

export interface SyncAllFoldersOptions {
  teamId: string;
  userId: string;
}

export interface SyncAllFoldersResult {
  success: boolean;
  results: {
    folderName: string;
    slot: string;
    success: boolean;
    filesSent: number;
    filesFailed: number;
    error?: string;
  }[];
  totalFilesSent: number;
  totalFilesFailed: number;
}

export async function incrementalSyncAllFolders(options: SyncAllFoldersOptions): Promise<SyncAllFoldersResult> {
  const { teamId, userId } = options;

  console.log('========================================');
  console.log('[incrementalSyncAllFolders] STARTING INCREMENTAL SYNC');
  console.log('[incrementalSyncAllFolders] Input:', { teamId, userId });
  console.log('========================================');

  const connections = await getAllDriveConnections(teamId, userId);

  if (connections.length === 0) {
    console.error('[incrementalSyncAllFolders] No active drive connections found');
    throw new Error('No active drive connection found');
  }

  const foldersToSync: FolderToSync[] = [];

  for (const connection of connections) {
    const provider = connection.provider as 'google' | 'microsoft';
    const syncStateToken = connection.sync_state_token;
    const microsoftDriveId = connection.microsoft_drive_id;
    console.log(`[incrementalSyncAllFolders] Processing ${provider} connection (has sync_state_token: ${!!syncStateToken}, microsoft_drive_id: ${microsoftDriveId || 'N/A'})`);

    if (connection.root_folder_id && connection.root_folder_name) {
      foldersToSync.push({
        id: connection.root_folder_id,
        name: connection.root_folder_name,
        slot: `${provider}_root`,
        provider,
        sync_state_token: syncStateToken,
        microsoft_drive_id: microsoftDriveId
      });
    }

    for (let i = 1; i <= 19; i++) {
      const folderId = connection[`folder_${i}_id` as keyof typeof connection] as string | null;
      const folderName = connection[`folder_${i}_name` as keyof typeof connection] as string | null;
      const folderEnabled = connection[`folder_${i}_enabled` as keyof typeof connection] as boolean | null;

      if (folderId && folderName && folderEnabled !== false) {
        foldersToSync.push({
          id: folderId,
          name: folderName,
          slot: `${provider}_folder_${i}`,
          provider,
          sync_state_token: syncStateToken,
          microsoft_drive_id: microsoftDriveId
        });
      }
    }
  }

  console.log('[incrementalSyncAllFolders] Folders to sync:', foldersToSync.map(f => ({ name: f.name, provider: f.provider, hasToken: !!f.sync_state_token })));

  if (foldersToSync.length === 0) {
    console.log('[incrementalSyncAllFolders] No folders configured to sync');
    return {
      success: false,
      results: [],
      totalFilesSent: 0,
      totalFilesFailed: 0,
    };
  }

  const results: SyncAllFoldersResult['results'] = [];
  let totalFilesSent = 0;
  let totalFilesFailed = 0;

  console.log('[incrementalSyncAllFolders] Starting incremental sync for', foldersToSync.length, 'folder(s)');

  for (const folder of foldersToSync) {
    console.log(`[incrementalSyncAllFolders] Processing ${folder.name} (${folder.slot}, ${folder.provider}): folderId=${folder.id}, hasToken=${!!folder.sync_state_token}`);

    const accessToken = await getValidAccessToken(teamId, userId, folder.provider);
    if (!accessToken) {
      console.error(`[incrementalSyncAllFolders] Failed to get access token for ${folder.provider}`);
      results.push({
        folderName: folder.name,
        slot: folder.slot,
        success: false,
        filesSent: 0,
        filesFailed: 0,
        error: `Failed to get ${folder.provider} access token`,
      });
      continue;
    }

    try {
      const response = await triggerIncrementalSync({
        team_id: teamId,
        user_id: userId,
        folder_id: folder.id,
        folder_name: folder.name,
        folder_type: folder.name,
        access_token: accessToken,
        provider: folder.provider,
        sync_state_token: folder.sync_state_token,
        microsoft_drive_id: folder.microsoft_drive_id,
      });

      results.push({
        folderName: folder.name,
        slot: folder.slot,
        success: response.success,
        filesSent: 0,
        filesFailed: 0,
      });

      if (response.success) {
        totalFilesSent += 1;
      }
    } catch (error) {
      console.error(`Failed to trigger incremental sync for folder ${folder.name}:`, error);
      results.push({
        folderName: folder.name,
        slot: folder.slot,
        success: false,
        filesSent: 0,
        filesFailed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: results.some(r => r.success),
    results,
    totalFilesSent,
    totalFilesFailed,
  };
}

export async function syncAllFolders(options: SyncAllFoldersOptions): Promise<SyncAllFoldersResult> {
  const { teamId, userId } = options;

  console.log('========================================');
  console.log('[syncAllFolders] STARTING SYNC');
  console.log('[syncAllFolders] Input:', { teamId, userId });
  console.log('========================================');

  const connections = await getAllDriveConnections(teamId, userId);

  if (connections.length === 0) {
    console.error('[syncAllFolders] No active drive connections found');
    throw new Error('No active drive connection found');
  }

  const foldersToSync: FolderToSync[] = [];

  for (const connection of connections) {
    const provider = connection.provider as 'google' | 'microsoft';
    const microsoftDriveId = connection.microsoft_drive_id;
    console.log(`[syncAllFolders] Processing ${provider} connection (microsoft_drive_id: ${microsoftDriveId || 'N/A'})`);

    if (connection.root_folder_id && connection.root_folder_name) {
      foldersToSync.push({
        id: connection.root_folder_id,
        name: connection.root_folder_name,
        slot: `${provider}_root`,
        provider,
        microsoft_drive_id: microsoftDriveId
      });
    }

    for (let i = 1; i <= 19; i++) {
      const folderId = connection[`folder_${i}_id` as keyof typeof connection] as string | null;
      const folderName = connection[`folder_${i}_name` as keyof typeof connection] as string | null;
      const folderEnabled = connection[`folder_${i}_enabled` as keyof typeof connection] as boolean | null;

      if (folderId && folderName && folderEnabled !== false) {
        foldersToSync.push({
          id: folderId,
          name: folderName,
          slot: `${provider}_folder_${i}`,
          provider,
          microsoft_drive_id: microsoftDriveId
        });
      }
    }
  }

  console.log('[syncAllFolders] Folders to sync:', foldersToSync.map(f => ({ name: f.name, provider: f.provider })));

  if (foldersToSync.length === 0) {
    console.log('[syncAllFolders] No folders configured to sync');
    return {
      success: false,
      results: [],
      totalFilesSent: 0,
      totalFilesFailed: 0,
    };
  }

  const results: SyncAllFoldersResult['results'] = [];
  let totalFilesSent = 0;
  let totalFilesFailed = 0;

  console.log('[syncAllFolders] Starting to sync', foldersToSync.length, 'folder(s)');

  for (const folder of foldersToSync) {
    console.log(`[syncAllFolders] Processing ${folder.name} (${folder.slot}, ${folder.provider}): folderId=${folder.id}`);

    const accessToken = await getValidAccessToken(teamId, userId, folder.provider);
    if (!accessToken) {
      console.error(`[syncAllFolders] Failed to get access token for ${folder.provider}`);
      results.push({
        folderName: folder.name,
        slot: folder.slot,
        success: false,
        filesSent: 0,
        filesFailed: 0,
        error: `Failed to get ${folder.provider} access token`,
      });
      continue;
    }

    try {
      const response = await triggerManualFolderSync({
        team_id: teamId,
        user_id: userId,
        folder_id: folder.id,
        folder_name: folder.name,
        access_token: accessToken,
        provider: folder.provider,
        microsoft_drive_id: folder.microsoft_drive_id,
      });

      results.push({
        folderName: folder.name,
        slot: folder.slot,
        success: response.success,
        filesSent: response.files_sent || 0,
        filesFailed: response.files_failed || 0,
      });

      totalFilesSent += response.files_sent || 0;
      totalFilesFailed += response.files_failed || 0;
    } catch (error) {
      console.error(`Failed to sync folder ${folder.name}:`, error);
      results.push({
        folderName: folder.name,
        slot: folder.slot,
        success: false,
        filesSent: 0,
        filesFailed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: results.some(r => r.success),
    results,
    totalFilesSent,
    totalFilesFailed,
  };
}
