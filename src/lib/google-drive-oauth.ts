import { supabase } from './supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID_ALT = import.meta.env.VITE_GOOGLE_CLIENT_ID_ALT;

const OAUTH_STATE_KEY = 'google_drive_oauth_state';
const OAUTH_APP_ID_KEY = 'google_drive_oauth_app_id';
const OAUTH_GUIDED_SETUP_KEY = 'google_drive_from_guided_setup';
const OAUTH_LAUNCH_PREP_KEY = 'google_drive_from_launch_prep';
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
  const keys = [OAUTH_STATE_KEY, OAUTH_APP_ID_KEY, OAUTH_GUIDED_SETUP_KEY, OAUTH_LAUNCH_PREP_KEY];
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

export const getGoogleDriveOAuthFlag = (flagName: 'guided_setup' | 'launch_prep'): boolean => {
  const key = flagName === 'guided_setup' ? OAUTH_GUIDED_SETUP_KEY : OAUTH_LAUNCH_PREP_KEY;
  return getOAuthState(key) === 'true';
};

export const clearGoogleDriveOAuthFlags = () => {
  removeOAuthState(OAUTH_GUIDED_SETUP_KEY);
  removeOAuthState(OAUTH_LAUNCH_PREP_KEY);
};

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar.readonly'
].join(' ');

export interface GoogleDriveConnection {
  id: string;
  user_id: string;
  team_id: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  root_folder_id: string | null;
  root_folder_name: string | null;
  is_active: boolean;
  connection_status: 'connected' | 'error' | 'disconnected' | 'token_expired';
  last_sync_at: string | null;
  google_account_email: string;
  scope_version: number;
  created_at: string;
  updated_at: string;
}

export interface FolderInfo {
  id: string;
  name: string;
}

export const getRedirectUri = () => {
  return `${window.location.origin}/auth/google-drive/callback`;
};

/**
 * Checks if the current user should use the alternate OAuth app
 * Returns true if user has 'use_alt_google_oauth' feature flag enabled
 */
export const checkShouldUseAltOAuth = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', 'use_alt_google_oauth')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`);

    if (error) {
      console.error('Error checking alt OAuth flag:', error);
      return false;
    }

    return data?.some(flag => flag.enabled) ?? false;
  } catch (error) {
    console.error('Error checking alt OAuth:', error);
    return false;
  }
};

/**
 * Initiates the Google Drive OAuth flow
 * Opens Google's OAuth consent screen
 */
export const initiateGoogleDriveOAuth = (
  fromGuidedSetup: boolean = false,
  fromLaunchPrep: boolean = false,
  useAltOAuth: boolean = false
) => {
  const clientId = useAltOAuth && GOOGLE_CLIENT_ID_ALT ? GOOGLE_CLIENT_ID_ALT : GOOGLE_CLIENT_ID;
  const oauthAppId = useAltOAuth && GOOGLE_CLIENT_ID_ALT ? 'alternate' : 'primary';

  if (!clientId) {
    throw new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file');
  }

  cleanupExpiredOAuthStates();

  const state = crypto.randomUUID();
  setOAuthState(OAUTH_STATE_KEY, state);
  setOAuthState(OAUTH_APP_ID_KEY, oauthAppId);

  if (fromGuidedSetup) {
    setOAuthState(OAUTH_GUIDED_SETUP_KEY, 'true');
  }

  if (fromLaunchPrep) {
    setOAuthState(OAUTH_LAUNCH_PREP_KEY, 'true');
  }

  const redirectUri = getRedirectUri();
  console.log('📁 Starting Google Drive OAuth flow...');
  console.log('📁 window.location.origin:', window.location.origin);
  console.log('📁 OAuth App:', oauthAppId);
  console.log('📁 Client ID:', clientId.substring(0, 20) + '...');
  console.log('📁 Redirect URI:', redirectUri);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('state', state);

  console.log('📁 Full auth URL:', authUrl.toString());
  console.log('📁 Redirecting to Google...');
  window.location.href = authUrl.toString();
};

/**
 * Handles the OAuth callback after user authorizes
 * Exchanges authorization code for tokens
 */
export const handleGoogleDriveCallback = async (
  code: string,
  state: string
): Promise<{ success: boolean; email: string; connection_id: string }> => {
  const savedState = getOAuthState(OAUTH_STATE_KEY);
  if (state !== savedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }
  removeOAuthState(OAUTH_STATE_KEY);

  const oauthAppId = getOAuthState(OAUTH_APP_ID_KEY) || 'primary';
  removeOAuthState(OAUTH_APP_ID_KEY);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const redirectUri = getRedirectUri();
  console.log('📁 Exchanging OAuth code for tokens...');
  console.log('📁 OAuth App ID:', oauthAppId);
  console.log('📁 Using redirect URI:', redirectUri);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-oauth-exchange`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri, oauth_app_id: oauthAppId })
    }
  );

  console.log('📁 Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('📁 Error response:', errorText);

    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    throw new Error(error.error || 'Failed to exchange code for tokens');
  }

  const result = await response.json();
  console.log('📁 Successfully connected Google Drive:', result.email);
  return result;
};

/**
 * Gets the user's Google Drive connection
 */
export const getGoogleDriveConnection = async (autoRefresh = false): Promise<GoogleDriveConnection | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // First try to find user's own connection
  let { data, error } = await supabase
    .from('user_drive_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .maybeSingle();

  // If no user connection, try team connection
  if (!data && user.user_metadata?.team_id) {
    const teamResult = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('team_id', user.user_metadata.team_id)
      .eq('provider', 'google')
      .eq('is_active', true)
      .maybeSingle();

    data = teamResult.data;
    error = teamResult.error;
  }

  if (error) {
    console.error('Error fetching drive connection:', error);
    throw error;
  }

  // Auto-refresh token if expired
  if (autoRefresh && data && isTokenExpired(data.token_expires_at)) {
    console.log('📁 Token expired, auto-refreshing...');
    await refreshGoogleDriveToken();

    // Re-fetch the connection after refresh
    const { data: refreshedData } = await supabase
      .from('user_drive_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('is_active', true)
      .maybeSingle();

    return refreshedData;
  }

  return data;
};

/**
 * Disconnects Google Drive by deleting the connection
 */
export const disconnectGoogleDrive = async (): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('user_drive_connections')
    .delete()
    .eq('user_id', session.user.id);

  if (error) {
    throw error;
  }

  console.log('📁 Google Drive disconnected successfully');
};

/**
 * Checks if the access token is expired or will expire soon
 */
export const isTokenExpired = (expiresAt: string): boolean => {
  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

  return now >= (expirationTime - bufferTime);
};

/**
 * Refreshes the Google Drive access token using the refresh token
 */
export const refreshGoogleDriveToken = async (): Promise<void> => {
  console.log('[refreshGoogleDriveToken] Starting token refresh...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('[refreshGoogleDriveToken] Session found, calling edge function...');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-refresh-token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    }
  );

  console.log('[refreshGoogleDriveToken] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[refreshGoogleDriveToken] Error response:', errorText);

    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      throw new Error(`Failed to refresh token: ${errorText}`);
    }

    throw new Error(error.error || 'Failed to refresh token');
  }

  const result = await response.json();
  console.log('[refreshGoogleDriveToken] Token refreshed successfully, expires at:', result.expires_at);
};

/**
 * @deprecated This function is deprecated. Use save-folder-selection edge function instead.
 * Updates the folder configuration using the new unified structure.
 */
export const updateFolderConfiguration = async (): Promise<void> => {
  console.warn('updateFolderConfiguration is deprecated. Use save-folder-selection edge function instead.');
  throw new Error('This function is deprecated. Use save-folder-selection edge function instead.');
};

/**
 * Lists folders from user's Google Drive
 * This can be used to populate a folder picker UI
 */
export const listGoogleDriveFolders = async (): Promise<FolderInfo[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Use the edge function to fetch folders
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-google-drive-folders`,
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
    console.error('Failed to list folders:', errorText);
    throw new Error('Failed to list Google Drive folders');
  }

  const data = await response.json();
  return data.folders || [];
};

/**
 * @deprecated This function is deprecated. Use create-google-drive-folder edge function instead.
 * Creates a new folder in Google Drive using the new unified structure.
 */
export const createAstraFolder = async (): Promise<{ folderId: string; folderName: string }> => {
  console.warn('createAstraFolder is deprecated. Use create-google-drive-folder edge function instead.');
  throw new Error('This function is deprecated. Use create-google-drive-folder edge function instead.');
};
