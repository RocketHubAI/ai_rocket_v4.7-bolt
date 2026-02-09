import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  Wrench,
  Link2,
  HardDrive,
  Cloud,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
  Shield,
  FolderOpen,
  Mail,
  Calendar,
  Plus,
  Settings,
  Unlink,
  FolderPlus,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { initiateGoogleDriveOAuth, checkShouldUseAltOAuth } from '../lib/google-drive-oauth';
import { initiateMicrosoftOAuth } from '../lib/microsoft-graph-oauth';
import { getBothConnections, isTokenExpired, DualConnectionStatus } from '../lib/unified-drive-utils';
import { ConnectedFoldersStatus } from './ConnectedFoldersStatus';
import { AddMoreFoldersStep } from './setup-steps/AddMoreFoldersStep';
import ConnectedAppsPage from './ConnectedAppsPage';
import MCPToolsPage from './MCPToolsPage';

type ConnectTab = 'connections' | 'apps' | 'mcp';

interface GmailConnection {
  id: string;
  gmail_address: string;
  is_active: boolean;
  created_at: string;
}

interface CalendarConnection {
  integration_id: string;
  connected_account_email: string | null;
  status: string;
}

interface UnifiedFolder {
  index: number;
  folderId: string | null;
  folderName: string | null;
  isRoot: boolean;
}

function ConnectionStatusBadge({ isActive, isExpired }: { isActive: boolean; isExpired?: boolean }) {
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
        <Clock className="w-3 h-3" />
        Expired
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
      <AlertCircle className="w-3 h-3" />
      Disconnected
    </span>
  );
}

function extractFolders(conn: any): UnifiedFolder[] {
  const folders: UnifiedFolder[] = [];
  if (conn.root_folder_id) {
    folders.push({ index: 0, folderId: conn.root_folder_id, folderName: conn.root_folder_name || 'Root', isRoot: true });
  }
  for (let i = 1; i <= 19; i++) {
    const id = conn[`folder_${i}_id`];
    const name = conn[`folder_${i}_name`];
    if (id) {
      folders.push({ index: i, folderId: id, folderName: name || `Folder ${i}`, isRoot: false });
    }
  }
  return folders;
}

type ManagementView = 'list' | 'folder-status' | 'add-folders';

function MyConnectionsTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connections, setConnections] = useState<DualConnectionStatus>({ google: null, microsoft: null, hasAnyConnection: false });
  const [gmailConnections, setGmailConnections] = useState<GmailConnection[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [managementView, setManagementView] = useState<ManagementView>('list');
  const [managingProvider, setManagingProvider] = useState<'google' | 'microsoft' | undefined>();
  const [connectingProvider, setConnectingProvider] = useState<'google' | 'microsoft' | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<'google' | 'microsoft' | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const teamId = user?.user_metadata?.team_id;
  const isAdmin = user?.user_metadata?.role === 'admin';

  const fetchConnections = useCallback(async () => {
    if (!user || !teamId) return;

    const [dualConn, gmailRes, calendarRes] = await Promise.all([
      getBothConnections(teamId),
      supabase
        .from('gmail_auth')
        .select('id, gmail_address, is_active, created_at')
        .eq('team_id', teamId),
      supabase
        .from('user_integrations')
        .select('integration_id, connected_account_email, status, integration_registry!inner(provider_category)')
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ]);

    setConnections(dualConn);
    setGmailConnections((gmailRes.data || []) as GmailConnection[]);

    const calConns = (calendarRes.data || [])
      .filter((c: any) => c.integration_registry?.provider_category === 'calendar')
      .map((c: any) => ({
        integration_id: c.integration_id,
        connected_account_email: c.connected_account_email,
        status: c.status,
      }));
    setCalendarConnections(calConns);

    setLoading(false);
  }, [user, teamId]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  };

  const handleConnectProvider = async (provider: 'google' | 'microsoft') => {
    setConnectingProvider(provider);
    try {
      if (provider === 'google') {
        const useAlt = await checkShouldUseAltOAuth();
        initiateGoogleDriveOAuth(false, true, useAlt);
      } else {
        initiateMicrosoftOAuth(false, true);
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'microsoft') => {
    setDisconnecting(true);
    try {
      await supabase
        .from('user_drive_connections')
        .update({ is_active: false, connection_status: 'disconnected' })
        .eq('team_id', teamId)
        .eq('provider', provider);
      await fetchConnections();
      setShowDisconnectConfirm(null);
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleManageFolders = (provider: 'google' | 'microsoft') => {
    setManagingProvider(provider);
    setManagementView('folder-status');
  };

  const handleBackToList = () => {
    setManagementView('list');
    setManagingProvider(undefined);
    fetchConnections();
  };

  const driveProviders: { key: 'google' | 'microsoft'; label: string; icon: typeof Cloud; color: string; bgClass: string; borderClass: string }[] = [
    { key: 'google', label: 'Google Drive', icon: Cloud, color: 'text-blue-400', bgClass: 'bg-blue-500/15', borderClass: 'border-blue-500/20' },
    { key: 'microsoft', label: 'Microsoft OneDrive', icon: HardDrive, color: 'text-sky-400', bgClass: 'bg-sky-500/15', borderClass: 'border-sky-500/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (managementView === 'folder-status') {
    return (
      <ConnectedFoldersStatus
        onConnectMore={(provider) => {
          setManagingProvider(provider || managingProvider);
          setManagementView('add-folders');
        }}
        onClose={handleBackToList}
        onDisconnected={handleBackToList}
        onSyncStarted={handleBackToList}
      />
    );
  }

  if (managementView === 'add-folders') {
    return (
      <AddMoreFoldersStep
        onComplete={handleBackToList}
        onBack={() => setManagementView('folder-status')}
        provider={managingProvider}
      />
    );
  }

  const totalConnections =
    (connections.google ? 1 : 0) +
    (connections.microsoft ? 1 : 0) +
    gmailConnections.length +
    calendarConnections.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {totalConnections > 0
            ? `${totalConnections} active connection${totalConnections !== 1 ? 's' : ''}`
            : 'No active connections yet'}
        </p>
        <div className="flex items-center gap-2">
          {totalConnections > 0 && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {driveProviders.map(({ key, label, icon: ProviderIcon, color, bgClass, borderClass }) => {
        const conn = connections[key];
        const expired = conn?.token_expires_at ? isTokenExpired(conn.token_expires_at) : false;
        const folders = conn ? extractFolders(conn) : [];

        if (!conn) {
          return (
            <div key={key} className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bgClass} border ${borderClass} flex-shrink-0`}>
                  <ProviderIcon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-300 font-medium text-sm">{label}</h4>
                  <p className="text-xs text-gray-500">Not connected</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleConnectProvider(key)}
                    disabled={connectingProvider === key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors disabled:opacity-50"
                  >
                    {connectingProvider === key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={key}
            className={`rounded-xl border transition-all ${
              expired
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-slate-800/60 border-emerald-500/20'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${bgClass} border ${borderClass}`}>
                  <ProviderIcon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium text-sm">{label}</h4>
                    <ConnectionStatusBadge isActive={!expired} isExpired={expired} />
                  </div>
                  {conn.account_email && (
                    <p className="text-xs text-gray-400 mb-2">{conn.account_email}</p>
                  )}

                  {expired && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {"Token expired. Reconnect to restore access."}
                    </div>
                  )}

                  {folders.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                        Connected Folders ({folders.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {folders.map(f => (
                          <div key={f.folderId} className="flex items-center gap-2 text-xs text-gray-400">
                            <FolderOpen className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{f.folderName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/40">
                  {expired ? (
                    <button
                      onClick={() => handleConnectProvider(key)}
                      disabled={connectingProvider === key}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      {connectingProvider === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Reconnect
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleManageFolders(key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-gray-700/60 hover:bg-gray-700 border border-gray-600/50 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Manage Folders
                      </button>
                      <button
                        onClick={() => handleManageFolders(key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Add Folders
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowDisconnectConfirm(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors ml-auto"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {gmailConnections.map(conn => (
        <div
          key={conn.id}
          className={`rounded-xl border transition-all ${
            conn.is_active
              ? 'bg-slate-800/60 border-emerald-500/20'
              : 'bg-slate-800/40 border-gray-700/50'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/20 flex-shrink-0">
                <Mail className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium text-sm">Gmail</h4>
                  <ConnectionStatusBadge isActive={conn.is_active} />
                </div>
                <p className="text-xs text-gray-400">{conn.gmail_address}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {calendarConnections.map(conn => (
        <div
          key={conn.integration_id}
          className="rounded-xl border bg-slate-800/60 border-emerald-500/20 transition-all"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex-shrink-0">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium text-sm">Google Calendar</h4>
                  <ConnectionStatusBadge isActive={true} />
                </div>
                {conn.connected_account_email && (
                  <p className="text-xs text-gray-400">{conn.connected_account_email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {!connections.hasAnyConnection && gmailConnections.length === 0 && calendarConnections.length === 0 && (
        <div className="text-center py-8">
          <Link2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-1">No connections yet</p>
          <p className="text-gray-500 text-xs mb-4">
            Connect your Google Drive or Microsoft OneDrive to give your AI assistant access to your business data.
          </p>
          {isAdmin && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleConnectProvider('google')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                <Cloud className="w-4 h-4" />
                Connect Google Drive
              </button>
              <button
                onClick={() => handleConnectProvider('microsoft')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors"
              >
                <HardDrive className="w-4 h-4" />
                Connect Microsoft
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-800/40 border border-gray-700/50">
        <Shield className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          All connections use encrypted OAuth tokens. Your credentials are never stored directly. Admins can manage connections, add or remove folders, and reconnect expired tokens.
        </p>
      </div>

      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-sm w-full p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/20">
                <Unlink className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Disconnect {showDisconnectConfirm === 'google' ? 'Google Drive' : 'Microsoft OneDrive'}?</h3>
                <p className="text-xs text-gray-400">This will remove the connection and stop syncing data.</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Your synced documents will remain in the system, but no new data will be pulled from this provider. You can reconnect at any time.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowDisconnectConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisconnect(showDisconnectConfirm)}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {disconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS: { id: ConnectTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'connections', label: 'My Connections', icon: Link2, description: 'View and manage your active data connections' },
  { id: 'apps', label: 'Apps', icon: Plug, description: 'Browse and connect business tools' },
  { id: 'mcp', label: 'MCP Tools', icon: Wrench, description: 'AI tools and custom API connections' },
];

export default function ConnectPage() {
  const [activeTab, setActiveTab] = useState<ConnectTab>('connections');

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-teal-500/15 border border-teal-500/20">
            <Link2 className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Connect</h2>
            <p className="text-gray-400 text-sm">Manage your integrations and data sources</p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-800/60 rounded-lg p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'connections' && (
          <div className="p-4">
            <MyConnectionsTab />
          </div>
        )}
        {activeTab === 'apps' && <ConnectedAppsPage />}
        {activeTab === 'mcp' && <MCPToolsPage />}
      </div>
    </div>
  );
}
