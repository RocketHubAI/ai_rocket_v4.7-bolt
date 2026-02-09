import { supabase } from './supabase';

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

const OAUTH_STATE_KEY = 'microsoft_oauth_state';
const OAUTH_GUIDED_SETUP_KEY = 'microsoft_from_guided_setup';
const OAUTH_LAUNCH_PREP_KEY = 'microsoft_from_launch_prep';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OAuthStateData {
  value: string;
  timestamp: number;
}

const setOAuthState = (key: string, value: string) => {
  const data: OAuthStateData = { value, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(data));
};

const getOAuthState = (key: string): string | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const data: OAuthStateData = JSON.parse(raw);
    if (Date.now() - data.timestamp > OAUTH_STATE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const removeOAuthState = (key: string) => {
  localStorage.removeItem(key);
};

const cleanupExpiredOAuthStates = () => {
  const keys = [OAUTH_STATE_KEY, OAUTH_GUIDED_SETUP_KEY, OAUTH_LAUNCH_PREP_KEY];
  keys.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > OAUTH_STATE_TTL_MS) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
  });
};

export const getMicrosoftOAuthFlag = (flagName: 'guided_setup' | 'launch_prep'): boolean => {
  const key = flagName === 'guided_setup' ? OAUTH_GUIDED_SETUP_KEY : OAUTH_LAUNCH_PREP_KEY;
  return getOAuthState(key) === 'true';
};

export const clearMicrosoftOAuthFlags = () => {
  removeOAuthState(OAUTH_GUIDED_SETUP_KEY);
  removeOAuthState(OAUTH_LAUNCH_PREP_KEY);
};

const SCOPES = [
  'openid',
  'profile',
  'User.Read',
  'Files.ReadWrite.All',
  'Sites.Read.All',
  'Calendars.Read',
  'offline_access'
].join(' ');

export interface MicrosoftDriveConnection {
  id: string;
  user_id: string;
  team_id: string | null;
  provider: 'microsoft';
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  microsoft_drive_id: string | null;
  microsoft_account_email: string | null;
  root_folder_id: string | null;
  root_folder_name: string | null;
  strategy_folder_id: string | null;
  strategy_folder_name: string | null;
  meetings_folder_id: string | null;
  meetings_folder_name: string | null;
  financial_folder_id: string | null;
  financial_folder_name: string | null;
  projects_folder_id: string | null;
  projects_folder_name: string | null;
  is_active: boolean;
  connection_status: 'connected' | 'error' | 'disconnected' | 'token_expired';
  last_sync_at: string | null;
  sync_state_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface MicrosoftDriveInfo {
  id: string;
  name: string;
  driveType: 'personal' | 'business' | 'documentLibrary';
  webUrl?: string;
  owner?: {
    user?: { displayName: string };
    group?: { displayName: string };
  };
}

export interface MicrosoftFolderInfo {
  id: string;
  name: string;
  webUrl?: string;
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
}

export const getMicrosoftRedirectUri = () => {
  return `${window.location.origin}/auth/microsoft/callback`;
};

export const initiateMicrosoftOAuth = (
  fromGuidedSetup: boolean = false,
  fromLaunchPrep: boolean = false
) => {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error('Microsoft Client ID is not configured. Please set VITE_MICROSOFT_CLIENT_ID in your .env file');
  }

  cleanupExpiredOAuthStates();

  const state = crypto.randomUUID();
  setOAuthState(OAUTH_STATE_KEY, state);

  if (fromGuidedSetup) {
    setOAuthState(OAUTH_GUIDED_SETUP_KEY, 'true');
  }

  if (fromLaunchPrep) {
    setOAuthState(OAUTH_LAUNCH_PREP_KEY, 'true');
  }

  const redirectUri = getMicrosoftRedirectUri();
  console.log('[Microsoft OAuth] Starting OAuth flow...');
  console.log('[Microsoft OAuth] Client ID:', MICROSOFT_CLIENT_ID.substring(0, 8) + '...');
  console.log('[Microsoft OAuth] Redirect URI:', redirectUri);

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', MICROSOFT_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('response_mode', 'query');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('prompt', 'consent');

  console.log('[Microsoft OAuth] Redirecting to Microsoft...');
  window.location.href = authUrl.toString();
};

export const handleMicrosoftCallback = async (
  code: string,
  state: string
): Promise<{ success: boolean; email: string; connection_id: string }> => {
  const savedState = getOAuthState(OAUTH_STATE_KEY);
  if (state !== savedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }
  removeOAuthState(OAUTH_STATE_KEY);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const redirectUri = getMicrosoftRedirectUri();
  console.log('[Microsoft OAuth] Exchanging code for tokens...');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microsoft-graph-oauth-exchange`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Microsoft OAuth] Error response:', errorText);

    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    throw new Error(error.error || 'Failed to exchange code for tokens');
  }

  const result = await response.json();
  console.log('[Microsoft OAuth] Successfully connected:', result.email);
  return result;
};

export const getMicrosoftDriveConnection = async (autoRefresh = false): Promise<MicrosoftDriveConnection | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  let { data, error } = await supabase
    .from('user_drive_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'microsoft')
    .eq('is_active', true)
    .maybeSingle();

  if (!data && user.user_metadata?.team_id) {
    const teamResult = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('team_id', user.user_metadata.team_id)
      .eq('provider', 'microsoft')
      .eq('is_active', true)
      .maybeSingle();

    data = teamResult.data;
    error = teamResult.error;
  }

  if (error) {
    console.error('Error fetching Microsoft drive connection:', error);
    throw error;
  }

  if (autoRefresh && data && isMicrosoftTokenExpired(data.token_expires_at)) {
    console.log('[Microsoft OAuth] Token expired, auto-refreshing...');
    await refreshMicrosoftToken();

    const { data: refreshedData } = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .eq('is_active', true)
      .maybeSingle();

    return refreshedData;
  }

  return data;
};

export const disconnectMicrosoftDrive = async (): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('user_drive_connections')
    .delete()
    .eq('user_id', session.user.id)
    .eq('provider', 'microsoft');

  if (error) {
    throw error;
  }

  console.log('[Microsoft OAuth] Disconnected successfully');
};

export const isMicrosoftTokenExpired = (expiresAt: string): boolean => {
  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000;

  return now >= (expirationTime - bufferTime);
};

export const refreshMicrosoftToken = async (): Promise<void> => {
  console.log('[Microsoft OAuth] Refreshing token...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microsoft-graph-refresh-token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Microsoft OAuth] Refresh error:', errorText);

    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      throw new Error(`Failed to refresh token: ${errorText}`);
    }

    throw new Error(error.error || 'Failed to refresh token');
  }

  const result = await response.json();
  console.log('[Microsoft OAuth] Token refreshed, expires at:', result.expires_at);
};

export const listMicrosoftDrives = async (): Promise<MicrosoftDriveInfo[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-microsoft-drives`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to list Microsoft drives:', errorText);
    throw new Error('Failed to list Microsoft drives');
  }

  const data = await response.json();
  return data.drives || [];
};

export const listMicrosoftFolders = async (
  driveId: string,
  itemId: string = 'root'
): Promise<MicrosoftFolderInfo[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-microsoft-folders?driveId=${encodeURIComponent(driveId)}&itemId=${encodeURIComponent(itemId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to list Microsoft folders:', errorText);
    throw new Error('Failed to list Microsoft folders');
  }

  const data = await response.json();
  return data.folders || [];
};

export const saveMicrosoftDriveSelection = async (driveId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('user_drive_connections')
    .update({ microsoft_drive_id: driveId })
    .eq('user_id', session.user.id)
    .eq('provider', 'microsoft')
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  console.log('[Microsoft OAuth] Drive selection saved:', driveId);
};
