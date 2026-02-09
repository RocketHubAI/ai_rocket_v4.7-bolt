import { supabase } from './supabase';
import { GoogleDriveConnection, getGoogleDriveConnection } from './google-drive-oauth';
import { MicrosoftDriveConnection, getMicrosoftDriveConnection } from './microsoft-graph-oauth';

export type DriveProvider = 'google' | 'microsoft' | 'local_upload';

export interface UnifiedDriveConnection {
  id: string;
  user_id: string;
  team_id: string | null;
  provider: DriveProvider;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  account_email: string | null;
  is_active: boolean;
  connection_status: 'connected' | 'error' | 'disconnected' | 'token_expired';
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  microsoft_drive_id?: string | null;
  root_folder_id?: string | null;
  root_folder_name?: string | null;
  strategy_folder_id?: string | null;
  strategy_folder_name?: string | null;
  meetings_folder_id?: string | null;
  meetings_folder_name?: string | null;
  financial_folder_id?: string | null;
  financial_folder_name?: string | null;
  projects_folder_id?: string | null;
  projects_folder_name?: string | null;
}

export const getAllActiveConnections = async (teamId: string): Promise<UnifiedDriveConnection[]> => {
  const { data, error } = await supabase
    .from('user_drive_connections')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching connections:', error);
    return [];
  }

  return (data || []).map(conn => ({
    ...conn,
    account_email: conn.provider === 'microsoft'
      ? conn.microsoft_account_email
      : conn.google_account_email
  }));
};

export const getConnectionByProvider = async (
  teamId: string,
  provider: DriveProvider
): Promise<UnifiedDriveConnection | null> => {
  const { data, error } = await supabase
    .from('user_drive_connections')
    .select('*')
    .eq('team_id', teamId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    account_email: data.provider === 'microsoft'
      ? data.microsoft_account_email
      : data.google_account_email
  };
};

export const getActiveConnection = async (): Promise<UnifiedDriveConnection | null> => {
  const googleConnection = await getGoogleDriveConnection();
  if (googleConnection?.is_active) {
    return {
      ...googleConnection,
      provider: 'google' as DriveProvider,
      account_email: googleConnection.google_account_email
    };
  }

  const microsoftConnection = await getMicrosoftDriveConnection();
  if (microsoftConnection?.is_active) {
    return {
      ...microsoftConnection,
      provider: 'microsoft' as DriveProvider,
      account_email: microsoftConnection.microsoft_account_email
    };
  }

  return null;
};

export const hasAnyConnection = async (teamId: string): Promise<boolean> => {
  const connections = await getAllActiveConnections(teamId);
  return connections.length > 0;
};

export interface DualConnectionStatus {
  google: UnifiedDriveConnection | null;
  microsoft: UnifiedDriveConnection | null;
  hasAnyConnection: boolean;
}

export const getBothConnections = async (teamId: string): Promise<DualConnectionStatus> => {
  const connections = await getAllActiveConnections(teamId);

  const google = connections.find(c => c.provider === 'google') || null;
  const microsoft = connections.find(c => c.provider === 'microsoft') || null;

  return {
    google,
    microsoft,
    hasAnyConnection: !!google || !!microsoft
  };
};

export const getProviderDisplayInfo = (provider: DriveProvider): {
  name: string;
  shortName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
} => {
  switch (provider) {
    case 'google':
      return {
        name: 'Google Drive',
        shortName: 'Google Drive',
        icon: 'HardDrive',
        color: 'blue-400',
        bgColor: 'blue-600/20',
        borderColor: 'blue-600'
      };
    case 'microsoft':
      return {
        name: 'Microsoft OneDrive / SharePoint',
        shortName: 'Microsoft',
        icon: 'Cloud',
        color: 'cyan-400',
        bgColor: 'cyan-600/20',
        borderColor: 'cyan-600'
      };
    case 'local_upload':
      return {
        name: 'Local Upload',
        shortName: 'Local',
        icon: 'Upload',
        color: 'orange-400',
        bgColor: 'orange-600/20',
        borderColor: 'orange-600'
      };
    default:
      return {
        name: 'Unknown',
        shortName: 'Unknown',
        icon: 'Database',
        color: 'gray-400',
        bgColor: 'gray-600/20',
        borderColor: 'gray-600'
      };
  }
};

export const hasAnyRootFolder = async (teamId: string): Promise<boolean> => {
  const connections = await getAllActiveConnections(teamId);
  return connections.some(conn => !!conn.root_folder_id);
};

export const isTokenExpired = (expiresAt: string): boolean => {
  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000;
  return now >= (expirationTime - bufferTime);
};

export const getConnectionStatus = (connection: UnifiedDriveConnection): {
  status: 'healthy' | 'expiring' | 'expired' | 'error';
  message: string;
} => {
  if (connection.connection_status === 'error') {
    return { status: 'error', message: 'Connection error' };
  }

  if (connection.connection_status === 'token_expired') {
    return { status: 'expired', message: 'Token expired - reconnect required' };
  }

  if (connection.connection_status === 'disconnected') {
    return { status: 'error', message: 'Disconnected' };
  }

  if (isTokenExpired(connection.token_expires_at)) {
    return { status: 'expired', message: 'Token expired' };
  }

  const expirationTime = new Date(connection.token_expires_at).getTime();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (expirationTime - now < oneHour) {
    return { status: 'expiring', message: 'Token expiring soon' };
  }

  return { status: 'healthy', message: 'Connected' };
};
