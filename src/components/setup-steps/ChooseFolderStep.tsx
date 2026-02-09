import React, { useState, useEffect } from 'react';
import { FolderPlus, CheckCircle, Folder, Loader2, FolderOpen, Plus, Search, FileText, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Cloud, HardDrive, Clock } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { getGoogleDriveConnection, disconnectGoogleDrive } from '../../lib/google-drive-oauth';
import { getMicrosoftDriveConnection, disconnectMicrosoftDrive } from '../../lib/microsoft-graph-oauth';
import { getActiveConnection, getConnectionByProvider } from '../../lib/unified-drive-utils';
import { supabase } from '../../lib/supabase';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { GoogleDriveFolderPicker } from '../GoogleDriveFolderPicker';
import { useAuth } from '../../contexts/AuthContext';
import { trackFeatureUsage } from '../../hooks/useFeatureTracking';

type DriveProvider = 'google' | 'microsoft';

interface ChooseFolderStepProps {
  onComplete: (folderData: any) => void;
  progress: SetupGuideProgress | null;
  onProceed?: () => void;
  onSkipToSync?: () => void;
  provider?: DriveProvider;
  isNewConnection?: boolean;
}

interface GoogleDriveFolder {
  id: string;
  name: string;
  createdTime?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  category?: string;
  webViewLink?: string;
}

interface FilesResponse {
  files: DriveFile[];
  totalCount: number;
  subfolderCount?: number;
  foldersScanned?: number;
}

type ViewMode = 'initial' | 'select-existing' | 'creating-new' | 'file-preview';

const ESTIMATED_SECONDS_PER_FILE = 3;

const STRATEGY_DOCUMENT_EXAMPLES = [
  { icon: '📜', name: 'Mission Statement', desc: 'Your Purpose and Core Mission' },
  { icon: '⭐', name: 'Core Values', desc: 'Guiding Principles for Your Team' },
  { icon: '🎯', name: 'Goals & OKRs', desc: 'Quarterly and Annual Objectives' },
  { icon: '🗺️', name: 'Strategic Plans', desc: 'Long-Term Vision and Roadmaps' },
  { icon: '📊', name: 'SWOT Analysis', desc: 'Strengths, Weaknesses, Opportunities' },
  { icon: '📋', name: 'V/TO Document', desc: 'Vision/Traction Organizer (EOS)' },
];

export const ChooseFolderStep: React.FC<ChooseFolderStepProps> = ({ onComplete, onProceed, onSkipToSync, provider: propProvider, isNewConnection }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('initial');
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<GoogleDriveFolder | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingFolders, setHasExistingFolders] = useState(false);
  const [isNewlyCreated, setIsNewlyCreated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [folderFiles, setFolderFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [activeProvider, setActiveProvider] = useState<DriveProvider>(propProvider || 'google');
  const [microsoftDriveId, setMicrosoftDriveId] = useState<string | null>(null);
  const [wasAutoDisconnected, setWasAutoDisconnected] = useState(false);
  const [subfolderCount, setSubfolderCount] = useState(0);
  const [scanningStatus, setScanningStatus] = useState<string>('');
  const useGooglePicker = false;

  const providerName = activeProvider === 'microsoft' ? 'OneDrive / SharePoint' : 'Google Drive';
  const ProviderIcon = activeProvider === 'microsoft' ? Cloud : HardDrive;

  useEffect(() => {
    const initNewConnection = async () => {
      if (isNewConnection) {
        setHasExistingFolders(false);
        if (propProvider) {
          setActiveProvider(propProvider);
          if (propProvider === 'microsoft') {
            let teamId = user?.user_metadata?.team_id;
            if (!teamId && user) {
              const { data: userData } = await supabase
                .from('users')
                .select('team_id')
                .eq('id', user.id)
                .maybeSingle();
              teamId = userData?.team_id;
            }
            if (teamId) {
              const msConnection = await getConnectionByProvider(teamId, 'microsoft');
              if (msConnection?.microsoft_drive_id) {
                setMicrosoftDriveId(msConnection.microsoft_drive_id);
              }
            }
          }
        }
        setLoading(false);
        return;
      }
      checkExistingSetup();
    };
    initNewConnection();
  }, [propProvider, isNewConnection, user]);

  const checkExistingSetup = async () => {
    setLoading(true);
    try {
      let teamId = user?.user_metadata?.team_id;
      if (!teamId && user) {
        const { data: userData } = await supabase
          .from('users')
          .select('team_id')
          .eq('id', user.id)
          .maybeSingle();
        teamId = userData?.team_id;
      }

      if (propProvider && teamId) {
        const providerConnection = await getConnectionByProvider(teamId, propProvider);
        if (providerConnection) {
          setActiveProvider(propProvider);
          if (propProvider === 'microsoft' && providerConnection.microsoft_drive_id) {
            setMicrosoftDriveId(providerConnection.microsoft_drive_id);
          }
          if (!isNewConnection && (providerConnection.root_folder_id || providerConnection.strategy_folder_id)) {
            setHasExistingFolders(true);
          }
          setLoading(false);
          return;
        }
      }

      const connection = await getActiveConnection();

      if (!connection) {
        setLoading(false);
        return;
      }

      setActiveProvider(connection.provider as DriveProvider);

      if (connection.provider === 'microsoft' && connection.microsoft_drive_id) {
        setMicrosoftDriveId(connection.microsoft_drive_id);
      }

      if (!isNewConnection && (connection.root_folder_id || connection.strategy_folder_id)) {
        setHasExistingFolders(true);
      }
    } catch (error) {
      console.error('Error checking existing setup:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderFiles = async (folderId: string, provider: DriveProvider = activeProvider) => {
    setLoadingFiles(true);
    setError('');
    setSubfolderCount(0);
    setScanningStatus('Scanning folder and subfolders...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      let endpoint: string;
      if (provider === 'microsoft') {
        const driveIdParam = microsoftDriveId ? `&driveId=${encodeURIComponent(microsoftDriveId)}` : '';
        endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-microsoft-files?folderId=${encodeURIComponent(folderId)}${driveIdParam}`;
      } else {
        endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-google-drive-files?folderId=${encodeURIComponent(folderId)}`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const responseData: FilesResponse = await response.json();

      if (!response.ok) {
        console.error('Edge function error:', response.status, responseData);
        throw new Error((responseData as any).error || 'Failed to load files');
      }

      setFolderFiles(responseData.files || []);
      setSubfolderCount(responseData.subfolderCount || 0);
      setScanningStatus('');
    } catch (err: any) {
      console.error('Error loading folder files:', err);
      setFolderFiles([]);
      setScanningStatus('');
    } finally {
      setLoadingFiles(false);
    }
  };

  const isSupportedFileType = (mimeType: string): boolean => {
    const supportedTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'application/pdf',
      'text/plain',
      'text/csv',
      'text/markdown',
    ];

    return supportedTypes.some(type => mimeType === type) ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.startsWith('text/');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document') || mimeType.includes('word')) return '📄';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.includes('text') || mimeType === 'text/markdown') return '📝';
    return '📄';
  };

  const supportedFiles = folderFiles.filter(file => isSupportedFileType(file.mimeType));

  const openCloudDrive = () => {
    if (activeProvider === 'microsoft') {
      window.open('https://onedrive.live.com', '_blank');
    } else if (selectedFolder?.id) {
      window.open(`https://drive.google.com/drive/folders/${selectedFolder.id}`, '_blank');
    } else {
      window.open('https://drive.google.com', '_blank');
    }
  };

  const loadFolders = async () => {
    setLoading(true);
    setError('');
    try {
      const connection = await getActiveConnection();
      if (!connection) {
        setError(`Not authenticated with ${providerName}`);
        return;
      }

      setActiveProvider(connection.provider as DriveProvider);
      setAccessToken(connection.access_token);

      if (connection.provider === 'microsoft' && connection.microsoft_drive_id) {
        setMicrosoftDriveId(connection.microsoft_drive_id);
      }

      if (useGooglePicker && connection.provider === 'google') {
        setViewMode('select-existing');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      let endpoint = '';
      if (connection.provider === 'microsoft') {
        const driveId = connection.microsoft_drive_id || '';
        endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-microsoft-folders?driveId=${encodeURIComponent(driveId)}`;
      } else {
        endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-google-drive-folders`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Edge function error:', response.status, responseData);
        const errorMessage = responseData.error || 'Failed to load folders';

        if (errorMessage.toLowerCase().includes('access denied')) {
          console.log('Access denied - auto-disconnecting drive connection...');
          try {
            if (connection.provider === 'microsoft') {
              await disconnectMicrosoftDrive();
            } else {
              await disconnectGoogleDrive();
            }
            setWasAutoDisconnected(true);
            console.log('Drive connection auto-disconnected successfully');
          } catch (disconnectErr) {
            console.error('Failed to auto-disconnect:', disconnectErr);
          }
        }

        throw new Error(errorMessage);
      }

      const driveFolders = responseData.folders || [];
      setFolders(driveFolders);
      setViewMode('select-existing');
    } catch (err: any) {
      console.error('Error loading folders:', err);
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewFolder = async () => {
    // Prevent double-clicks
    if (creatingFolder) return;

    setCreatingFolder(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setCreatingFolder(false);
        return;
      }

      console.log('🚀 Creating Astra Team Folder...');

      // Create the "Astra Team Folder"
      const createResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-google-drive-folder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ folderName: 'Astra Team Folder' }),
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const { folder } = await createResponse.json();
      console.log('✅ Folder created:', folder);

      // Save folder selection to root folder
      const saveResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-folder-selection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folderIds: [folder.id],
            folderType: 'root',
            folderName: folder.name,
            provider: activeProvider,
          }),
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save folder selection');
      }

      console.log('✅ Folder selection saved');

      if (user?.id) {
        trackFeatureUsage(user.id, 'drive_sync');
      }

      // Reset loading state and show success screen
      setCreatingFolder(false);
      setSelectedFolder(folder);
      setHasExistingFolders(true);
      setIsNewlyCreated(true);

      // Call onComplete to notify parent (parent should NOT close modal yet)
      onComplete({
        selectedFolder: folder,
        folderType: 'root',
        isNewFolder: true,
        provider: activeProvider,
      });
    } catch (err: any) {
      console.error('❌ Error creating folder:', err);
      setError(err.message || 'Failed to create folder');
      setCreatingFolder(false);
    }
  };

  const handleSelectFolder = async (folder: GoogleDriveFolder) => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const saveResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-folder-selection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folderIds: [folder.id],
            folderType: 'root',
            folderName: folder.name,
            provider: activeProvider,
          }),
        }
      );

      if (!saveResponse.ok) {
        throw new Error('Failed to save folder selection');
      }

      if (user?.id) {
        trackFeatureUsage(user.id, 'drive_sync');
      }

      setSelectedFolder(folder);
      setLoading(false);
      setViewMode('file-preview');
      loadFolderFiles(folder.id, activeProvider);
    } catch (err: any) {
      console.error('Error selecting folder:', err);
      setError(err.message || 'Failed to select folder');
      setLoading(false);
    }
  };

  const handleConfirmFolder = () => {
    if (!selectedFolder) return;

    const folderDataToSend = {
      selectedFolder,
      folderType: 'root',
      isNewFolder: false,
      filesInFolder: supportedFiles.length,
    };

    onComplete(folderDataToSend);

    if (supportedFiles.length > 0 && onSkipToSync) {
      onSkipToSync();
    } else {
      setHasExistingFolders(true);
    }
  };

  if (loading && viewMode === 'initial') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-600/20 mb-4">
            <FolderPlus className="w-8 h-8 text-orange-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Choose Your Folder</h2>
          <p className="text-gray-300">Checking your connected folders...</p>
        </div>
      </div>
    );
  }

  // If already has folders configured
  if (hasExistingFolders) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {isNewlyCreated ? 'Folder Created Successfully!' : 'Team Folder Connected!'}
          </h2>
          <p className="text-gray-300">
            {isNewlyCreated
              ? `Your "Astra Team Folder" has been created in ${providerName}.`
              : "You've already set up a team folder. Let's continue with the setup."}
          </p>
          {selectedFolder && (
            <p className="text-sm text-gray-400 mt-2">
              📁 {selectedFolder.name}
            </p>
          )}
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <p className="text-sm text-green-300">
            <span className="font-medium">✅ All set!</span> {isNewlyCreated ? 'Now add your team documents to this folder.' : 'Your team folder is connected and ready to use.'}
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={() => {
              if (onProceed) {
                onProceed();
              } else {
                onComplete({ existingFolder: true });
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition-all min-h-[44px]"
          >
            Next: Place Your Files →
          </button>
        </div>
      </div>
    );
  }

  // Initial view - choose between existing or create new
  if (viewMode === 'initial') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-600/20 mb-4">
            <FolderPlus className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Choose Your Team Folder</h2>
          <p className="text-gray-300">
            Select an existing folder or let Astra create one for you
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 space-y-3">
            <p className="text-sm text-red-300 font-medium">{error}</p>
            {error.toLowerCase().includes('access denied') && (
              <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3 mt-2">
                <p className="text-sm text-yellow-300 font-medium mb-2">Did you receive a security email from Google?</p>
                <p className="text-xs text-yellow-200/80 mb-2">
                  Google sometimes sends a security verification email when connecting new apps. If you received one:
                </p>
                <ol className="text-xs text-yellow-200/80 list-decimal list-inside space-y-1">
                  <li>Check your email for a message from Google about app access</li>
                  <li>Click the link in the email to approve the connection</li>
                  <li>Return here and click "Connect Google Drive" to reconnect</li>
                </ol>
                {wasAutoDisconnected && (
                  <p className="text-xs text-green-300 mt-2 font-medium">
                    Your connection has been cleared - just click "Connect Google Drive" below to try again.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Select Existing Folder Option */}
          <button
            onClick={loadFolders}
            className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-orange-500 rounded-lg p-6 transition-all text-left group min-h-[200px] flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-orange-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FolderOpen className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
              Select Existing Folder
            </h3>
            <p className="text-sm text-gray-400 text-center">
              Browse and choose a folder from your {providerName}
            </p>
          </button>

          {/* Create New Folder Option - Only for Google Drive */}
          {activeProvider === 'google' && (
            <button
              onClick={handleCreateNewFolder}
              disabled={creatingFolder}
              className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-blue-500 rounded-lg p-6 transition-all text-left group min-h-[200px] flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {creatingFolder ? (
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                ) : (
                  <Plus className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 text-center">
                {creatingFolder ? 'Creating Folder...' : 'Create "Astra Team Folder"'}
              </h3>
              <p className="text-sm text-gray-400 text-center">
                {creatingFolder ? 'Please wait...' : 'Let Astra create a new folder for your team documents'}
              </p>
            </button>
          )}
        </div>

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <span className="font-medium">💡 About Team Folders:</span> This folder will contain documents about your team's mission, goals, strategic plans, and business data. Astra will read these to better understand your team.
          </p>
        </div>
      </div>
    );
  }

  // Folder selection view
  if (viewMode === 'select-existing') {
    // Use Google Picker for beta users
    if (useGooglePicker) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-600/20 mb-4">
              <Folder className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Choose Your Strategy Folder</h2>
            <p className="text-gray-300 mb-2">
              Select a folder from your Google Drive containing strategy documents
            </p>
            <p className="text-sm text-gray-400">
              This includes mission statements, goals, strategic plans, and business objectives
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-300 font-medium">{error}</p>
              {error.toLowerCase().includes('access denied') && (
                <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3 mt-2">
                  <p className="text-sm text-yellow-300 font-medium mb-2">Did you receive a security email from Google?</p>
                  <p className="text-xs text-yellow-200/80 mb-2">
                    Google sometimes sends a security verification email when connecting new apps. If you received one:
                  </p>
                  <ol className="text-xs text-yellow-200/80 list-decimal list-inside space-y-1">
                    <li>Check your email for a message from Google about app access</li>
                    <li>Click the link in the email to approve the connection</li>
                    <li>Return here and click "Connect Google Drive" to reconnect</li>
                  </ol>
                  {wasAutoDisconnected && (
                    <p className="text-xs text-green-300 mt-2 font-medium">
                      Your connection has been cleared - just click "Connect Google Drive" below to try again.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <GoogleDriveFolderPicker
            accessToken={accessToken}
            folderType="strategy"
            onFolderSelected={(folder) => {
              handleSelectFolder({ id: folder.id, name: folder.name });
            }}
          />

          <div className="flex justify-center space-x-3">
            <button
              onClick={() => {
                setViewMode('initial');
              }}
              disabled={loading}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    const providerBadgeColor = activeProvider === 'microsoft' ? 'cyan' : 'blue';

    return (
      <div className="space-y-6">
        <div className="flex justify-center mb-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-${providerBadgeColor}-900/30 border border-${providerBadgeColor}-600/50 rounded-full`}>
            <ProviderIcon className={`w-4 h-4 text-${providerBadgeColor}-400`} />
            <span className={`text-sm font-medium text-${providerBadgeColor}-300`}>
              {activeProvider === 'microsoft' ? 'Microsoft OneDrive / SharePoint' : 'Google Drive'}
            </span>
          </div>
        </div>

        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${activeProvider === 'microsoft' ? 'bg-cyan-600/20' : 'bg-blue-600/20'} mb-4`}>
            <ProviderIcon className={`w-8 h-8 ${activeProvider === 'microsoft' ? 'text-cyan-400' : 'text-blue-400'}`} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Select a Folder</h2>
          <p className="text-gray-300">
            Choose a folder from your {providerName} for team documents
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 space-y-3">
            <p className="text-sm text-red-300 font-medium">{error}</p>
            {error.toLowerCase().includes('access denied') && (
              <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3 mt-2">
                <p className="text-sm text-yellow-300 font-medium mb-2">Did you receive a security email from Google?</p>
                <p className="text-xs text-yellow-200/80 mb-2">
                  Google sometimes sends a security verification email when connecting new apps. If you received one:
                </p>
                <ol className="text-xs text-yellow-200/80 list-decimal list-inside space-y-1">
                  <li>Check your email for a message from Google about app access</li>
                  <li>Click the link in the email to approve the connection</li>
                  <li>Return here and click "Connect Google Drive" to reconnect</li>
                </ol>
                {wasAutoDisconnected && (
                  <p className="text-xs text-green-300 mt-2 font-medium">
                    Your connection has been cleared - just click "Connect Google Drive" below to try again.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">
                  {searchQuery ? `No folders found matching "${searchQuery}"` : `No folders found in your ${providerName}`}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setViewMode('initial');
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors min-h-[44px]"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleSelectFolder(folder)}
                    disabled={loading}
                    className="w-full flex items-center space-x-3 p-4 bg-gray-900/50 hover:bg-gray-700 border border-gray-700 hover:border-orange-500 rounded-lg transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Folder className="w-6 h-6 text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{folder.name}</p>
                      {folder.createdTime && (
                        <p className="text-xs text-gray-400">
                          Created {new Date(folder.createdTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {loading && selectedFolder?.id === folder.id && (
                      <Loader2 className="w-5 h-5 text-orange-400 animate-spin flex-shrink-0" />
                    )}
                  </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setViewMode('initial');
                }}
                disabled={loading}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[44px]"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (viewMode === 'file-preview') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-600/20 mb-3">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Folder Connected!</h2>
          <p className="text-sm text-gray-400">
            {selectedFolder?.name}
          </p>
        </div>

        {loadingFiles ? (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                <div className="absolute inset-0 bg-orange-400/20 rounded-full animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-gray-300 text-sm font-medium">{scanningStatus || 'Scanning folder contents...'}</p>
                <p className="text-gray-500 text-xs mt-1">Including files from subfolders</p>
              </div>
            </div>
          </div>
        ) : supportedFiles.length > 0 ? (
          <div className="space-y-3">
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <p className="text-sm text-green-300 font-medium">
                Found {supportedFiles.length} supported file{supportedFiles.length !== 1 ? 's' : ''} ready to sync!
              </p>
              {subfolderCount > 0 && (
                <p className="text-xs text-green-400/80 mt-1">
                  Includes files from {subfolderCount} subfolder{subfolderCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {supportedFiles.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-300 font-medium">
                      Estimated sync time: {(() => {
                        const seconds = supportedFiles.length * ESTIMATED_SECONDS_PER_FILE;
                        if (seconds < 60) return 'Less than a minute';
                        if (seconds < 3600) {
                          const mins = Math.ceil(seconds / 60);
                          return `About ${mins} minute${mins !== 1 ? 's' : ''}`;
                        }
                        const hours = Math.ceil(seconds / 3600);
                        return `About ${hours} hour${hours !== 1 ? 's' : ''}`;
                      })()}
                    </p>
                    <p className="text-xs text-blue-400/70 mt-0.5">
                      You can continue using the app while files sync in the background
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4 max-h-[200px] overflow-y-auto">
              <div className="space-y-2">
                {supportedFiles.slice(0, 10).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 p-2 bg-gray-900/50 rounded-lg"
                  >
                    <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      {file.modifiedTime && (
                        <p className="text-xs text-gray-500">
                          Modified {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {supportedFiles.length > 10 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{supportedFiles.length - 10} more files
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={openCloudDrive}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <span>Add More Files</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={handleConfirmFolder}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg text-sm font-medium transition-all min-h-[44px]"
              >
                Sync These Files
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <p className="text-sm text-yellow-300">
                This folder is empty. Add some strategy documents to get started.
              </p>
            </div>

            <button
              onClick={() => setShowExamples(!showExamples)}
              className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <span className="text-sm text-gray-300 font-medium">What should I put here?</span>
              {showExamples ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showExamples && (
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-3">Strategy documents include:</p>
                <div className="grid grid-cols-2 gap-2">
                  {STRATEGY_DOCUMENT_EXAMPLES.map((example, idx) => (
                    <div key={idx} className="bg-gray-900/50 rounded-lg p-2 flex items-start gap-2">
                      <span className="text-lg">{example.icon}</span>
                      <div>
                        <p className="text-xs text-white font-medium">{example.name}</p>
                        <p className="text-xs text-gray-500">{example.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={openCloudDrive}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <span>Open in {providerName}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => selectedFolder && loadFolderFiles(selectedFolder.id)}
                disabled={loadingFiles}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                <span>Check Again</span>
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleConfirmFolder}
                className="text-sm text-gray-400 hover:text-white underline"
              >
                Skip for now, I'll add files later
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={() => {
              setViewMode('select-existing');
              setFolderFiles([]);
            }}
            className="text-sm font-semibold text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 px-4 py-2 rounded-lg transition-colors"
          >
            Choose a different folder
          </button>
        </div>
      </div>
    );
  }

  return null;
};
