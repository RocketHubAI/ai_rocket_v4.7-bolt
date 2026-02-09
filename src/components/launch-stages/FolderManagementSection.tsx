import React, { useState, useEffect } from 'react';
import { Folder, Edit2, Loader2, Lightbulb, HelpCircle, Upload, HardDrive, Cloud, Plus, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LocalFileUpload from '../LocalFileUpload';
import { getBothConnections, DualConnectionStatus, isTokenExpired } from '../../lib/unified-drive-utils';
import { disconnectGoogleDrive } from '../../lib/google-drive-oauth';
import { disconnectMicrosoftDrive } from '../../lib/microsoft-graph-oauth';

interface UnifiedFolder {
  index: number;
  folderId: string | null;
  folderName: string | null;
  isRoot: boolean;
}

interface FolderManagementSectionProps {
  onOpenFolderManager: (provider?: 'google' | 'microsoft') => void;
  onConnectProvider: (provider: 'google' | 'microsoft') => void;
  userRole?: string;
  onLocalUploadComplete?: () => void;
  onDisconnectComplete?: () => void;
}

const FOLDER_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
];

interface ProviderFolders {
  provider: 'google' | 'microsoft';
  folders: UnifiedFolder[];
  isConnected: boolean;
  isExpired: boolean;
  accountEmail: string | null;
}

export const FolderManagementSection: React.FC<FolderManagementSectionProps> = ({
  onOpenFolderManager,
  onConnectProvider,
  userRole = 'admin',
  onLocalUploadComplete,
  onDisconnectComplete
}) => {
  const isAdmin = userRole === 'admin';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [googleData, setGoogleData] = useState<ProviderFolders | null>(null);
  const [microsoftData, setMicrosoftData] = useState<ProviderFolders | null>(null);
  const [showEducation, setShowEducation] = useState(false);
  const [showLocalUpload, setShowLocalUpload] = useState(false);
  const [disconnecting, setDisconnecting] = useState<'google' | 'microsoft' | null>(null);

  useEffect(() => {
    loadFolderStatus();
  }, [user]);

  const handleDisconnect = async (provider: 'google' | 'microsoft') => {
    setDisconnecting(provider);
    try {
      if (provider === 'google') {
        await disconnectGoogleDrive();
        setGoogleData({
          provider: 'google',
          folders: [],
          isConnected: false,
          isExpired: false,
          accountEmail: null
        });
      } else {
        await disconnectMicrosoftDrive();
        setMicrosoftData({
          provider: 'microsoft',
          folders: [],
          isConnected: false,
          isExpired: false,
          accountEmail: null
        });
      }
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setDisconnecting(null);
    }
  };

  const extractFolders = (connection: any): UnifiedFolder[] => {
    if (!connection) return [];

    const folders: UnifiedFolder[] = [];

    if (connection.root_folder_id && connection.root_folder_name) {
      folders.push({
        index: 0,
        folderId: connection.root_folder_id,
        folderName: connection.root_folder_name,
        isRoot: true
      });
    }

    for (let i = 1; i <= 19; i++) {
      const folderId = connection[`folder_${i}_id`];
      const folderName = connection[`folder_${i}_name`];

      if (folderId && folderName) {
        folders.push({
          index: i,
          folderId,
          folderName,
          isRoot: false
        });
      }
    }

    return folders;
  };

  const loadFolderStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);

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
        setLoading(false);
        return;
      }

      const connections = await getBothConnections(teamId);

      setGoogleData({
        provider: 'google',
        folders: extractFolders(connections.google),
        isConnected: !!connections.google,
        isExpired: connections.google ? isTokenExpired(connections.google.token_expires_at) : false,
        accountEmail: connections.google?.account_email || null
      });

      setMicrosoftData({
        provider: 'microsoft',
        folders: extractFolders(connections.microsoft),
        isConnected: !!connections.microsoft,
        isExpired: connections.microsoft ? isTokenExpired(connections.microsoft.token_expires_at) : false,
        accountEmail: connections.microsoft?.account_email || null
      });
    } catch (err) {
      console.error('Error loading folder status:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderProviderSection = (data: ProviderFolders | null, providerType: 'google' | 'microsoft') => {
    const isGoogle = providerType === 'google';
    const providerName = isGoogle ? 'Google Drive' : 'Microsoft OneDrive / SharePoint';
    const Icon = isGoogle ? HardDrive : Cloud;
    const colorClass = isGoogle ? 'blue' : 'cyan';

    if (!data) {
      return (
        <div className={`bg-gray-800/30 border border-gray-700 rounded-lg p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 bg-${colorClass}-600/20 rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${colorClass}-400`} />
              </div>
              <div>
                <h4 className="text-xs font-medium text-white">{providerName}</h4>
                <p className="text-[10px] text-gray-500">Loading...</p>
              </div>
            </div>
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        </div>
      );
    }

    const connectedFolders = data.folders.filter(f => f.folderId);

    return (
      <div className={`bg-gray-800/30 border ${data.isConnected ? `border-${colorClass}-600/30` : 'border-gray-700'} rounded-lg p-3`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 ${data.isConnected ? `bg-${colorClass}-600/20` : 'bg-gray-700/50'} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${data.isConnected ? `text-${colorClass}-400` : 'text-gray-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-medium text-white">{providerName}</h4>
                {data.isConnected && !data.isExpired && (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                )}
              </div>
              {data.isConnected ? (
                <p className="text-[10px] text-gray-400">
                  {data.isExpired ? (
                    <span className="text-red-400">Authorization expired</span>
                  ) : connectedFolders.length === 0 ? (
                    <span className="text-yellow-400">Connected - select folders to sync</span>
                  ) : (
                    `${connectedFolders.length} folder${connectedFolders.length !== 1 ? 's' : ''} synced`
                  )}
                </p>
              ) : (
                <p className="text-[10px] text-gray-500">Not connected</p>
              )}
            </div>
          </div>

          {isAdmin && (
            data.isConnected ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenFolderManager(providerType)}
                  disabled={data.isExpired}
                  className={`flex items-center gap-1.5 px-3 py-1.5 ${isGoogle ? 'bg-blue-600/80 hover:bg-blue-600' : 'bg-cyan-600/80 hover:bg-cyan-600'} text-white rounded text-xs font-medium transition-all disabled:opacity-50 min-h-[34px]`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{connectedFolders.length > 0 ? 'Add or Manage' : 'Select Folders'}</span>
                </button>
                {connectedFolders.length === 0 && (
                  <button
                    onClick={() => handleDisconnect(providerType)}
                    disabled={disconnecting === providerType}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-700 hover:bg-red-600/80 text-gray-300 hover:text-white rounded text-xs font-medium transition-all disabled:opacity-50 min-h-[34px]"
                    title="Disconnect and try a different account"
                  >
                    {disconnecting === providerType ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onConnectProvider(providerType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 ${isGoogle ? 'bg-blue-600/80 hover:bg-blue-600' : 'bg-cyan-600/80 hover:bg-cyan-600'} text-white rounded text-xs font-medium transition-all min-h-[34px]`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect</span>
              </button>
            )
          )}
        </div>

        {data.isConnected && connectedFolders.length > 0 && !data.isExpired && (
          <div className="flex flex-wrap gap-1 mt-2">
            {connectedFolders.slice(0, 3).map((folder, idx) => {
              const colors = FOLDER_COLORS[idx % FOLDER_COLORS.length];
              return (
                <div
                  key={folder.index}
                  className={`flex items-center gap-1 px-2 py-1 rounded ${colors.bg} border ${colors.border}`}
                >
                  <Folder className={`w-3 h-3 ${colors.text}`} />
                  <span className="text-[10px] text-white truncate max-w-[80px]" title={folder.folderName || ''}>
                    {folder.folderName}
                  </span>
                </div>
              );
            })}
            {connectedFolders.length > 3 && (
              <span className="text-[10px] text-gray-400 px-2 py-1">
                +{connectedFolders.length - 3} more
              </span>
            )}
          </div>
        )}

        {data.isExpired && (
          <p className="text-[10px] text-red-400 mt-2">
            Re-authorize to manage folders
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-semibold text-white">Synced Folders</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEducation(!showEducation)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Learn about data sync"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowLocalUpload(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600/80 hover:bg-green-600 text-white rounded text-xs font-medium transition-all min-h-[32px]"
            >
              <Upload className="w-3 h-3" />
              <span>Add Local Files</span>
            </button>
          )}
        </div>
      </div>

      {showEducation && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mb-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-xs text-gray-300">
                Sync documents from Google Drive, Microsoft OneDrive/SharePoint, or upload files directly from your computer.
              </p>
              <p className="text-[10px] text-gray-400">
                You can connect both Google Drive and Microsoft at the same time. Astra will automatically categorize and index your documents for intelligent search and analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {renderProviderSection(googleData, 'google')}
          {renderProviderSection(microsoftData, 'microsoft')}
        </div>
      )}

      {showLocalUpload && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Upload Local Files</h3>
                <button
                  onClick={() => setShowLocalUpload(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Upload documents from your computer to sync with Astra Intelligence
              </p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <LocalFileUpload
                category="other"
                onUploadComplete={(uploadIds) => {
                  console.log('Files uploaded successfully:', uploadIds);
                  if (onLocalUploadComplete) {
                    onLocalUploadComplete();
                  }
                }}
                onUploadError={(error) => {
                  console.error('Upload error:', error);
                }}
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowLocalUpload(false);
                  if (onLocalUploadComplete) {
                    onLocalUploadComplete();
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
