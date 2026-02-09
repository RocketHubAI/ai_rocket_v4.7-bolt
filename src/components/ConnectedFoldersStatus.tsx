import React, { useState, useEffect } from 'react';
import { Folder, CheckCircle, Loader2, FolderPlus, RefreshCw, Trash2, Edit2, X, Search, FolderOpen, User, Plus, FilePlus, Unlink, AlertTriangle, HardDrive, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { triggerSyncNow } from '../lib/manual-folder-sync';
import { PlaceFilesStep } from './setup-steps/PlaceFilesStep';
import { GoogleDriveTroubleshootGuide } from './GoogleDriveTroubleshootGuide';
import { initiateGoogleDriveOAuth } from '../lib/google-drive-oauth';
import { initiateMicrosoftOAuth } from '../lib/microsoft-graph-oauth';
import { getBothConnections, isTokenExpired, DualConnectionStatus, UnifiedDriveConnection } from '../lib/unified-drive-utils';

interface ConnectedFoldersStatusProps {
  onConnectMore: (provider?: 'google' | 'microsoft') => void;
  onClose: () => void;
  onDisconnected?: () => void;
  onOpenLocalUpload?: () => void;
  onSyncStarted?: () => void;
}

interface UnifiedFolder {
  index: number;
  folderId: string | null;
  folderName: string | null;
  isRoot: boolean;
  connectedBy: string | null;
  connectedByEmail: string | null;
}

interface ProviderData {
  connection: UnifiedDriveConnection | null;
  folders: UnifiedFolder[];
  isExpired: boolean;
}

const FOLDER_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/50' },
  { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/50' },
];

export const ConnectedFoldersStatus: React.FC<ConnectedFoldersStatusProps> = ({ onConnectMore, onClose, onDisconnected, onOpenLocalUpload, onSyncStarted }) => {
  const { user } = useAuth();
  const microsoftEnabled = useFeatureFlag('microsoft_onedrive_enabled');
  const [loading, setLoading] = useState(true);
  const [googleData, setGoogleData] = useState<ProviderData | null>(null);
  const [microsoftData, setMicrosoftData] = useState<ProviderData | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [removingFolder, setRemovingFolder] = useState<{ provider: 'google' | 'microsoft'; index: number } | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<'google' | 'microsoft' | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showAddFilesModal, setShowAddFilesModal] = useState(false);
  const [addFilesFolder, setAddFilesFolder] = useState<{ folder: UnifiedFolder; provider: 'google' | 'microsoft' } | null>(null);
  const [showRemoveFolderConfirm, setShowRemoveFolderConfirm] = useState<{ folder: UnifiedFolder; provider: 'google' | 'microsoft' } | null>(null);
  const [deletingDocuments, setDeletingDocuments] = useState(false);
  const [folderDocCount, setFolderDocCount] = useState<number | null>(null);
  const [activeSyncSession, setActiveSyncSession] = useState<{
    session_id: string;
    status: string;
    files_stored: number;
    files_classified: number;
  } | null>(null);

  const extractFolders = async (connection: UnifiedDriveConnection | null): Promise<UnifiedFolder[]> => {
    if (!connection) return [];

    const connectedByIds: string[] = [];
    if (connection.root_folder_id) {
      const connectedBy = (connection as any).root_folder_connected_by;
      if (connectedBy) connectedByIds.push(connectedBy);
    }
    for (let i = 1; i <= 19; i++) {
      const connectedBy = (connection as any)[`folder_${i}_connected_by`];
      if (connectedBy) connectedByIds.push(connectedBy);
    }

    let userEmails: Record<string, string> = {};
    if (connectedByIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email')
        .in('id', connectedByIds);
      if (usersData) {
        usersData.forEach(u => {
          userEmails[u.id] = u.email;
        });
      }
    }

    const folders: UnifiedFolder[] = [];

    if (connection.root_folder_id && connection.root_folder_name) {
      const connectedById = (connection as any).root_folder_connected_by;
      folders.push({
        index: 0,
        folderId: connection.root_folder_id,
        folderName: connection.root_folder_name,
        isRoot: true,
        connectedBy: connectedById || null,
        connectedByEmail: connectedById ? userEmails[connectedById] || null : null
      });
    }

    for (let i = 1; i <= 19; i++) {
      const folderId = (connection as any)[`folder_${i}_id`];
      const folderName = (connection as any)[`folder_${i}_name`];
      const connectedById = (connection as any)[`folder_${i}_connected_by`];

      if (folderId && folderName) {
        folders.push({
          index: i,
          folderId,
          folderName,
          isRoot: false,
          connectedBy: connectedById || null,
          connectedByEmail: connectedById ? userEmails[connectedById] || null : null
        });
      }
    }

    return folders;
  };

  useEffect(() => {
    loadFolderStatus();
  }, []);

  useEffect(() => {
    if (!syncing || !user) return;

    const teamId = user.user_metadata?.team_id;
    if (!teamId) return;

    const channel = supabase
      .channel('sync-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_sync_sessions',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('[ConnectedFoldersStatus] Sync session update:', payload);
          if (payload.new) {
            const session = payload.new as {
              id: string;
              status: string;
              files_stored: number;
              files_classified: number;
            };
            setActiveSyncSession({
              session_id: session.id,
              status: session.status,
              files_stored: session.files_stored || 0,
              files_classified: session.files_classified || 0
            });

            if (session.files_stored > 0) {
              setSyncMessage({
                type: 'success',
                text: `Syncing... ${session.files_stored} file${session.files_stored !== 1 ? 's' : ''} processed`
              });
            }

            if (session.status === 'completed') {
              setSyncing(false);
              setSyncCompleted(true);
              setActiveSyncSession(null);
              setSyncMessage({
                type: 'success',
                text: `Sync complete! ${session.files_stored} file${session.files_stored !== 1 ? 's' : ''} synced.`
              });
              if (onSyncStarted) {
                onSyncStarted();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncing, user]);

  const loadFolderStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      let teamId = user.user_metadata?.team_id;

      if (!teamId) {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();
        teamId = userData?.team_id;
      }

      if (!teamId) {
        setError('No team found');
        setLoading(false);
        return;
      }

      const connections = await getBothConnections(teamId);

      const googleFolders = await extractFolders(connections.google);
      const microsoftFolders = await extractFolders(connections.microsoft);

      setGoogleData({
        connection: connections.google,
        folders: googleFolders,
        isExpired: connections.google ? isTokenExpired(connections.google.token_expires_at) : false
      });

      setMicrosoftData({
        connection: connections.microsoft,
        folders: microsoftFolders,
        isExpired: connections.microsoft ? isTokenExpired(connections.microsoft.token_expires_at) : false
      });
    } catch (err) {
      console.error('Error loading folder status:', err);
      setError('Failed to load folder information');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDocuments = async () => {
    if (!user || syncing) return;

    setSyncing(true);
    setSyncMessage(null);
    setSyncCompleted(false);

    try {
      let teamId = user.user_metadata?.team_id;
      if (!teamId) {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();
        teamId = userData?.team_id;
      }

      if (!teamId) {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: 'No team found.' });
        setTimeout(() => setSyncMessage(null), 5000);
        return;
      }

      setSyncMessage({ type: 'success', text: 'Syncing documents...' });

      const result = await triggerSyncNow({
        team_id: teamId,
        user_id: user.id,
        source: 'manual_sync_now'
      });

      if (result.success) {
        setSyncMessage({ type: 'success', text: 'Syncing documents...' });
        if (result.session_id) {
          console.log('[ConnectedFoldersStatus] Sync session created:', result.session_id);
        }
        setTimeout(() => {
          if (syncing) {
            setSyncing(false);
            setSyncCompleted(true);
            setSyncMessage({ type: 'success', text: 'Sync started successfully!' });
            if (onSyncStarted) {
              onSyncStarted();
            }
          }
        }, 30000);
      } else {
        setSyncing(false);
        setSyncMessage({ type: 'error', text: 'Failed to start sync.' });
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncing(false);
      if (error.message === 'GOOGLE_TOKEN_EXPIRED' || error.message === 'TOKEN_EXPIRED') {
        setSyncMessage({ type: 'error', text: 'Cloud connection expired. Please reconnect.' });
      } else {
        setSyncMessage({ type: 'error', text: 'Failed to sync. Please try again.' });
      }
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const getFolderDocumentCount = async (folderName: string, folderId?: string | null): Promise<number> => {
    console.log('[getFolderDocumentCount] Called with folderName:', folderName, 'folderId:', folderId);
    if (!user) {
      console.log('[getFolderDocumentCount] No user, returning 0');
      return 0;
    }

    try {
      let teamId = user.user_metadata?.team_id;
      if (!teamId) {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();
        teamId = userData?.team_id;
      }

      console.log('[getFolderDocumentCount] Team ID:', teamId);
      if (!teamId) return 0;

      const { data, error } = await supabase.rpc('count_folder_documents', {
        p_team_id: teamId,
        p_folder_name: folderName,
        p_folder_id: folderId || null
      });

      console.log('[getFolderDocumentCount] RPC result:', { data, error });

      if (error) {
        console.error('Error counting folder documents:', error);
        return 0;
      }

      return data ?? 0;
    } catch (err) {
      console.error('Error getting folder document count:', err);
      return 0;
    }
  };

  const handleRemoveFolderClick = async (folder: UnifiedFolder, provider: 'google' | 'microsoft') => {
    console.log('[handleRemoveFolderClick] folder:', folder, 'provider:', provider);
    if (!folder.folderName) {
      console.log('[handleRemoveFolderClick] Early return - no folderName');
      return;
    }

    setFolderDocCount(null);
    setShowRemoveFolderConfirm({ folder, provider });

    console.log('[handleRemoveFolderClick] Fetching doc count for:', folder.folderName, 'folderId:', folder.folderId);
    const count = await getFolderDocumentCount(folder.folderName, folder.folderId);
    console.log('[handleRemoveFolderClick] Got count:', count);
    setFolderDocCount(count);
  };

  const handleConfirmRemoveFolder = async (deleteDocuments: boolean) => {
    if (!user || !showRemoveFolderConfirm) return;

    const { folder, provider } = showRemoveFolderConfirm;

    setRemovingFolder({ provider, index: folder.index });

    if (deleteDocuments) {
      setDeletingDocuments(true);
    }

    try {
      let teamId = user.user_metadata?.team_id;
      if (!teamId) {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();
        teamId = userData?.team_id;
      }

      if (!teamId) return;

      if (deleteDocuments && folder.folderName) {
        const { error: deleteError1, count: count1 } = await supabase
          .from('document_chunks')
          .delete({ count: 'exact' })
          .eq('team_id', teamId)
          .eq('synced_from_folder_name', folder.folderName);

        if (deleteError1) {
          console.error('Error deleting documents by synced_from_folder_name:', deleteError1);
          throw deleteError1;
        }

        const { error: deleteError2, count: count2 } = await supabase
          .from('document_chunks')
          .delete({ count: 'exact' })
          .eq('team_id', teamId)
          .eq('parent_folder_name', folder.folderName)
          .is('synced_from_folder_name', null);

        if (deleteError2) {
          console.error('Error deleting documents by parent_folder_name:', deleteError2);
          throw deleteError2;
        }

        const { error: deleteError3, count: count3 } = await supabase
          .from('document_chunks')
          .delete({ count: 'exact' })
          .eq('team_id', teamId)
          .is('synced_from_folder_name', null)
          .is('parent_folder_name', null)
          .like('folder_path', `%:/${folder.folderName}`);

        if (deleteError3) {
          console.error('Error deleting documents by folder_path:', deleteError3);
          throw deleteError3;
        }

        const totalDeleted = (count1 || 0) + (count2 || 0) + (count3 || 0);
        console.log(`Deleted ${totalDeleted} document chunks from folder: ${folder.folderName} (${count1} by synced_from, ${count2} by parent_folder, ${count3} by folder_path)`);
      }

      const updates: Record<string, null | boolean> = folder.index === 0
        ? {
            root_folder_id: null,
            root_folder_name: null,
            root_folder_connected_by: null
          }
        : {
            [`folder_${folder.index}_id`]: null,
            [`folder_${folder.index}_name`]: null,
            [`folder_${folder.index}_enabled`]: false,
            [`folder_${folder.index}_connected_by`]: null
          };

      const { error } = await supabase
        .from('user_drive_connections')
        .update(updates)
        .eq('team_id', teamId)
        .eq('provider', provider);

      if (error) throw error;

      setShowRemoveFolderConfirm(null);
      await loadFolderStatus();
    } catch (err) {
      console.error('Error removing folder:', err);
      setError('Failed to remove folder');
    } finally {
      setRemovingFolder(null);
      setDeletingDocuments(false);
    }
  };

  const handleRemoveFolder = async (provider: 'google' | 'microsoft', folderIndex: number) => {
    console.log('[handleRemoveFolder] Called with provider:', provider, 'folderIndex:', folderIndex);
    if (!user) {
      console.log('[handleRemoveFolder] Early return - no user');
      return;
    }

    const data = provider === 'google' ? googleData : microsoftData;
    console.log('[handleRemoveFolder] Data:', data);
    const folder = data?.folders.find(f => f.index === folderIndex);
    console.log('[handleRemoveFolder] Found folder:', folder);

    if (folder) {
      handleRemoveFolderClick(folder, provider);
    } else {
      console.log('[handleRemoveFolder] No folder found!');
    }
  };

  const handleDisconnectProvider = async (provider: 'google' | 'microsoft') => {
    if (!user || disconnecting) return;

    setDisconnecting(true);

    try {
      let teamId = user.user_metadata?.team_id;
      if (!teamId) {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();
        teamId = userData?.team_id;
      }

      if (!teamId) {
        setError('No team found');
        setDisconnecting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_drive_connections')
        .update({
          is_active: false,
          connection_status: 'disconnected'
        })
        .eq('team_id', teamId)
        .eq('provider', provider);

      if (updateError) throw updateError;

      setShowDisconnectConfirm(null);
      await loadFolderStatus();

      const hasOtherConnection = provider === 'google' ? microsoftData?.connection : googleData?.connection;
      if (!hasOtherConnection && onDisconnected) {
        onDisconnected();
      }
    } catch (err) {
      console.error('Error disconnecting drive:', err);
      setError(`Failed to disconnect ${provider === 'google' ? 'Google Drive' : 'Microsoft OneDrive/SharePoint'}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleOpenAddFiles = (folder: UnifiedFolder, provider: 'google' | 'microsoft') => {
    setAddFilesFolder({ folder, provider });
    setShowAddFilesModal(true);
  };

  const handleAddFilesComplete = () => {
    setShowAddFilesModal(false);
    setAddFilesFolder(null);
  };

  const renderProviderSection = (data: ProviderData | null, provider: 'google' | 'microsoft') => {
    const isGoogle = provider === 'google';
    const providerName = isGoogle ? 'Google Drive' : 'Microsoft OneDrive / SharePoint';
    const Icon = isGoogle ? HardDrive : Cloud;
    const isConnected = !!data?.connection;
    const isExpired = data?.isExpired ?? false;
    const folders = data?.folders ?? [];

    const containerClasses = isGoogle
      ? (isConnected ? 'border-blue-600/50 bg-blue-900/10' : 'border-gray-700 bg-gray-800/30')
      : (isConnected ? 'border-cyan-600/50 bg-cyan-900/10' : 'border-gray-700 bg-gray-800/30');

    const iconBgClasses = isGoogle
      ? (isConnected ? 'bg-blue-600/20' : 'bg-gray-700/50')
      : (isConnected ? 'bg-cyan-600/20' : 'bg-gray-700/50');

    const iconTextClasses = isGoogle
      ? (isConnected ? 'text-blue-400' : 'text-gray-500')
      : (isConnected ? 'text-cyan-400' : 'text-gray-500');

    return (
      <div className={`border rounded-lg p-4 ${containerClasses}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${iconBgClasses} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconTextClasses}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{providerName}</h3>
                {isConnected && !isExpired && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {isExpired && (
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                )}
              </div>
              {isConnected ? (
                <p className="text-xs text-gray-400">
                  {isExpired ? (
                    <span className="text-orange-400">Authorization expired - reconnect required</span>
                  ) : (
                    `${folders.length} folder${folders.length !== 1 ? 's' : ''} connected`
                  )}
                </p>
              ) : (
                <p className="text-xs text-gray-500">Not connected</p>
              )}
            </div>
          </div>

          {!isConnected && (
            <button
              onClick={() => isGoogle ? initiateGoogleDriveOAuth(false, true) : initiateMicrosoftOAuth(false, true)}
              className={`px-3 py-2 ${isGoogle ? 'bg-blue-600 hover:bg-blue-700' : 'bg-cyan-600 hover:bg-cyan-700'} text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Connect
            </button>
          )}
        </div>

        {isConnected && folders.length > 0 && !isExpired && (
          <div className="space-y-2 mt-3">
            {folders.map((folder, idx) => {
              const colors = FOLDER_COLORS[idx % FOLDER_COLORS.length];
              const isRemoving = removingFolder?.provider === provider && removingFolder?.index === folder.index;

              return (
                <div
                  key={folder.index}
                  className={`${colors.bg} border ${colors.border} rounded-lg p-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                        <Folder className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate text-sm">{folder.folderName}</p>
                        {folder.connectedByEmail && (
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {folder.connectedByEmail === user?.email ? 'Connected by you' : folder.connectedByEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddFiles(folder, provider)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Add files to folder"
                      >
                        <FilePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFolder(provider, folder.index)}
                        disabled={isRemoving}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/20 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-50"
                        title="Remove folder"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isConnected && isExpired && (
          <div className="mt-3">
            <button
              onClick={() => isGoogle ? initiateGoogleDriveOAuth(false, true) : initiateMicrosoftOAuth(false, true)}
              className={`w-full px-3 py-2 ${isGoogle ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect {isGoogle ? 'Google Drive' : 'Microsoft'}
            </button>
          </div>
        )}

        {isConnected && !isExpired && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={() => onConnectMore(provider)}
              className="flex-1 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Add Folders
            </button>
            <button
              onClick={() => setShowDisconnectConfirm(provider)}
              className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your connected folders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const hasAnyConnection = !!googleData?.connection || !!microsoftData?.connection;
  const totalFolders = (googleData?.folders?.length ?? 0) + (microsoftData?.folders?.length ?? 0);

  return (
    <div className="space-y-6">
      {syncCompleted && syncMessage?.type === 'success' && (
        <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300 font-medium">{syncMessage.text}</p>
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">AI Data Sync</h2>
        <p className="text-gray-300">
          {hasAnyConnection
            ? `${totalFolders} folder${totalFolders !== 1 ? 's' : ''} connected across ${(googleData?.connection ? 1 : 0) + (microsoftData?.connection ? 1 : 0)} provider${((googleData?.connection ? 1 : 0) + (microsoftData?.connection ? 1 : 0)) !== 1 ? 's' : ''}`
            : 'Connect your cloud storage to sync documents'}
        </p>
      </div>

      <GoogleDriveTroubleshootGuide compact />

      <div className="space-y-4">
        {renderProviderSection(googleData, 'google')}
        {microsoftEnabled && renderProviderSection(microsoftData, 'microsoft')}
      </div>

      {syncMessage && !syncCompleted && (
        <div className={`p-3 rounded-lg ${
          syncMessage.type === 'success' ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'
        }`}>
          <p className={`text-sm text-center ${
            syncMessage.type === 'success' ? 'text-green-300' : 'text-red-300'
          }`}>
            {syncMessage.text}
          </p>
        </div>
      )}

      <div className="flex flex-col space-y-3 pt-4">
        {hasAnyConnection && totalFolders > 0 && (
          <button
            onClick={handleSyncDocuments}
            disabled={syncing}
            className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync All Folders'}</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
        >
          Done
        </button>
      </div>

      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Disconnect {showDisconnectConfirm === 'google' ? 'Google Drive' : 'Microsoft OneDrive/SharePoint'}?
                  </h3>
                  <p className="text-sm text-gray-400">This action can be undone by reconnecting</p>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  Disconnecting will pause document syncing from this provider. Your existing synced documents will remain, but new changes won't be detected until you reconnect.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDisconnectConfirm(null)}
                  disabled={disconnecting}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDisconnectProvider(showDisconnectConfirm)}
                  disabled={disconnecting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Disconnecting...</span>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-4 h-4" />
                      <span>Disconnect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddFilesModal && addFilesFolder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-white">
                Add Files to {addFilesFolder.folder.folderName}
              </h3>
              <button
                onClick={handleAddFilesComplete}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <PlaceFilesStep
                onComplete={handleAddFilesComplete}
                progress={null}
                folderData={{ selectedFolder: { id: addFilesFolder.folder.folderId, name: addFilesFolder.folder.folderName } }}
                folderType={addFilesFolder.folder.isRoot ? 'strategy' : 'projects'}
                forceChooseOption={true}
                isAddFilesMode={true}
              />
            </div>
          </div>
        </div>
      )}

      {showRemoveFolderConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full border border-gray-700">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-600/20 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Remove "{showRemoveFolderConfirm.folder.folderName}"?
                  </h3>
                  <p className="text-sm text-gray-400">Choose how to handle synced documents</p>
                </div>
              </div>

              {folderDocCount === null ? (
                <div className="bg-gray-700/30 rounded-lg p-4 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin mr-2" />
                  <span className="text-sm text-gray-400">Checking documents...</span>
                </div>
              ) : (
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    This folder has <span className="font-semibold">{folderDocCount.toLocaleString()} document{folderDocCount !== 1 ? 's' : ''}</span> synced in Astra.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => handleConfirmRemoveFolder(false)}
                  disabled={removingFolder !== null}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Stop Syncing Only</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Remove folder from sync. Keep all existing documents in Astra.
                      </p>
                    </div>
                    {removingFolder && !deletingDocuments && (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleConfirmRemoveFolder(true)}
                  disabled={removingFolder !== null || folderDocCount === null}
                  className="w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-white rounded-lg font-medium transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-300">Stop Syncing & Delete Documents</p>
                      <p className="text-xs text-red-400/80 mt-0.5">
                        Remove folder and delete all {folderDocCount?.toLocaleString() ?? 0} synced documents from Astra.
                      </p>
                    </div>
                    {deletingDocuments && (
                      <Loader2 className="w-5 h-5 text-red-400 animate-spin flex-shrink-0" />
                    )}
                  </div>
                </button>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  Note: This will not delete any files from your {showRemoveFolderConfirm.provider === 'google' ? 'Google Drive' : 'Microsoft OneDrive'}. Only the synced copies in Astra will be affected.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowRemoveFolderConfirm(null)}
                  disabled={removingFolder !== null}
                  className="w-full px-4 py-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
