import React, { useState, useEffect } from 'react';
import { FolderPlus, CheckCircle, Loader2, AlertCircle, Search, Folder, Link, ExternalLink, ArrowLeft, X, HardDrive, Cloud } from 'lucide-react';
import { initiateGoogleDriveOAuth } from '../../lib/google-drive-oauth';
import { initiateMicrosoftOAuth } from '../../lib/microsoft-graph-oauth';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { triggerManualFolderSync } from '../../lib/manual-folder-sync';

type DriveProvider = 'google' | 'microsoft';

interface AddMoreFoldersStepProps {
  onComplete: () => void;
  onBack: () => void;
  provider?: DriveProvider;
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
}

interface SelectedFolder {
  id: string;
  name: string;
  slotIndex: number;
}

export const AddMoreFoldersStep: React.FC<AddMoreFoldersStepProps> = ({ onComplete, onBack, provider: propProvider }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [driveFolders, setDriveFolders] = useState<GoogleDriveFolder[]>([]);
  const [loadingDriveFolders, setLoadingDriveFolders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFolder, setPreviewFolder] = useState<GoogleDriveFolder | null>(null);
  const [folderFiles, setFolderFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<SelectedFolder[]>([]);
  const [existingFolders, setExistingFolders] = useState<{ id: string; name: string }[]>([]);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [activeProvider, setActiveProvider] = useState<DriveProvider>(propProvider || 'google');
  const [microsoftDriveId, setMicrosoftDriveId] = useState<string | null>(null);

  const providerName = activeProvider === 'microsoft' ? 'OneDrive / SharePoint' : 'Google Drive';
  const ProviderIcon = activeProvider === 'microsoft' ? Cloud : HardDrive;


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

  useEffect(() => {
    loadCurrentFolders();
  }, []);

  const loadCurrentFolders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setNeedsReconnect(false);

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
        setNeedsReconnect(true);
        setLoading(false);
        return;
      }

      const { data: connection } = await supabase
        .from('user_drive_connections')
        .select('*')
        .eq('team_id', teamId)
        .eq('provider', activeProvider)
        .eq('is_active', true)
        .maybeSingle();

      if (!connection || connection.connection_status === 'token_expired') {
        setNeedsReconnect(true);
        setLoading(false);
        return;
      }

      let driveIdToUse: string | null = null;
      if (activeProvider === 'microsoft' && connection.microsoft_drive_id) {
        driveIdToUse = connection.microsoft_drive_id;
        setMicrosoftDriveId(connection.microsoft_drive_id);
      }

      const existing: { id: string; name: string }[] = [];
      const usedSlots: number[] = [];

      if (connection.root_folder_id && connection.root_folder_name) {
        existing.push({ id: connection.root_folder_id, name: connection.root_folder_name });
      }

      for (let i = 1; i <= 19; i++) {
        const folderId = connection[`folder_${i}_id`];
        const folderName = connection[`folder_${i}_name`];

        if (folderId && folderName) {
          existing.push({ id: folderId as string, name: folderName as string });
          usedSlots.push(i);
        }
      }

      const available = Array.from({ length: 19 }, (_, i) => i + 1).filter(slot => !usedSlots.includes(slot));

      setExistingFolders(existing);
      setAvailableSlots(available);

      await loadDriveFolders(driveIdToUse);
    } catch (err) {
      console.error('Error loading folders:', err);
      setError('Failed to load folder information');
    } finally {
      setLoading(false);
    }
  };

  const loadDriveFolders = async (driveIdParam?: string | null) => {
    try {
      setLoadingDriveFolders(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      let endpoint = '';
      if (activeProvider === 'microsoft') {
        const driveId = driveIdParam || microsoftDriveId || '';
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load folders');
      }

      const data = await response.json();
      setDriveFolders(data.folders || []);
    } catch (err: any) {
      console.error('Error loading drive folders:', err);
      let errorMessage = err.message || `Failed to load ${providerName} folders`;
      if (errorMessage.includes('SPO license')) {
        errorMessage = 'This Microsoft account does not have OneDrive enabled. Please use a different account or contact your Microsoft 365 admin.';
      }
      setError(errorMessage);
    } finally {
      setLoadingDriveFolders(false);
    }
  };

  const loadFolderFiles = async (folderId: string) => {
    setLoadingFiles(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      let endpoint = '';
      if (activeProvider === 'microsoft') {
        const driveId = microsoftDriveId || '';
        endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-microsoft-files?folderId=${encodeURIComponent(folderId)}&driveId=${encodeURIComponent(driveId)}`;
      } else {
        endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-google-drive-files?folderId=${encodeURIComponent(folderId)}`;
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
        throw new Error(responseData.error || 'Failed to load files');
      }

      setFolderFiles(responseData.files || []);
    } catch (err: any) {
      console.error('Error loading folder files:', err);
      setFolderFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSelectFolder = async (folder: GoogleDriveFolder) => {
    setPreviewFolder(folder);
    setShowFilePreview(true);
    setSearchQuery('');
    await loadFolderFiles(folder.id);
  };

  const addCurrentFolderToSelection = (): SelectedFolder | null => {
    if (!previewFolder || availableSlots.length === 0) return null;

    const usedSlotIndices = selectedFolders.map(f => f.slotIndex);
    const nextSlot = availableSlots.find(slot => !usedSlotIndices.includes(slot));

    if (nextSlot === undefined) return null;

    const newFolder: SelectedFolder = {
      id: previewFolder.id,
      name: previewFolder.name,
      slotIndex: nextSlot
    };

    return newFolder;
  };

  const handleAddMoreFolders = () => {
    const newFolder = addCurrentFolderToSelection();
    if (newFolder) {
      setSelectedFolders(prev => [...prev, newFolder]);
    }
    setShowFilePreview(false);
    setPreviewFolder(null);
    setFolderFiles([]);
  };

  const handleStartSync = async () => {
    if (!user) return;

    const newFolder = addCurrentFolderToSelection();
    const foldersToSave = newFolder
      ? [...selectedFolders, newFolder]
      : selectedFolders;

    if (foldersToSave.length === 0) return;

    try {
      setSaving(true);
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
        setSaving(false);
        return;
      }

      const updates: Record<string, string | boolean> = {};

      for (const folder of foldersToSave) {
        updates[`folder_${folder.slotIndex}_id`] = folder.id;
        updates[`folder_${folder.slotIndex}_name`] = folder.name;
        updates[`folder_${folder.slotIndex}_enabled`] = true;
        updates[`folder_${folder.slotIndex}_connected_by`] = user.id;
      }

      const { error: updateError } = await supabase
        .from('user_drive_connections')
        .update(updates)
        .eq('team_id', teamId)
        .eq('provider', activeProvider);

      if (updateError) throw updateError;

      const { data: connection } = await supabase
        .from('user_drive_connections')
        .select('access_token')
        .eq('team_id', teamId)
        .eq('provider', activeProvider)
        .eq('is_active', true)
        .maybeSingle();

      if (connection?.access_token) {
        console.log('[AddMoreFoldersStep] Triggering manual sync for folders...');
        for (const folder of foldersToSave) {
          try {
            await triggerManualFolderSync({
              team_id: teamId,
              user_id: user.id,
              folder_id: folder.id,
              folder_name: folder.name,
              folder_type: folder.name,
              access_token: connection.access_token,
              provider: activeProvider,
            });
            console.log(`[AddMoreFoldersStep] Manual sync triggered for folder: ${folder.name}`);
          } catch (syncErr) {
            console.error(`[AddMoreFoldersStep] Failed to sync folder ${folder.name}:`, syncErr);
          }
        }
      }

      onComplete();
    } catch (err: any) {
      console.error('Error saving folders:', err);
      setError(err.message || 'Failed to save folders');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSelectedFolder = (folderId: string) => {
    setSelectedFolders(prev => prev.filter(f => f.id !== folderId));
  };

  const handleChooseDifferentFolder = () => {
    setShowFilePreview(false);
    setPreviewFolder(null);
    setFolderFiles([]);
  };

  const openCloudDrive = () => {
    if (activeProvider === 'microsoft') {
      window.open('https://onedrive.live.com', '_blank');
    } else if (previewFolder?.id) {
      window.open(`https://drive.google.com/drive/folders/${previewFolder.id}`, '_blank');
    } else {
      window.open('https://drive.google.com', '_blank');
    }
  };

  const handleSaveFolders = async () => {
    if (!user || selectedFolders.length === 0) return;

    try {
      setSaving(true);
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
        setSaving(false);
        return;
      }

      const updates: Record<string, string | boolean> = {};

      for (const folder of selectedFolders) {
        updates[`folder_${folder.slotIndex}_id`] = folder.id;
        updates[`folder_${folder.slotIndex}_name`] = folder.name;
        updates[`folder_${folder.slotIndex}_enabled`] = true;
        updates[`folder_${folder.slotIndex}_connected_by`] = user.id;
      }

      const { error: updateError } = await supabase
        .from('user_drive_connections')
        .update(updates)
        .eq('team_id', teamId)
        .eq('provider', activeProvider);

      if (updateError) throw updateError;

      const { data: connection } = await supabase
        .from('user_drive_connections')
        .select('access_token')
        .eq('team_id', teamId)
        .eq('provider', activeProvider)
        .eq('is_active', true)
        .maybeSingle();

      if (connection?.access_token) {
        console.log('[AddMoreFoldersStep] Triggering manual sync for newly added folders...');
        for (const folder of selectedFolders) {
          try {
            await triggerManualFolderSync({
              team_id: teamId,
              user_id: user.id,
              folder_id: folder.id,
              folder_name: folder.name,
              folder_type: folder.name,
              access_token: connection.access_token,
              provider: activeProvider,
            });
            console.log(`[AddMoreFoldersStep] Manual sync triggered for folder: ${folder.name}`);
          } catch (syncErr) {
            console.error(`[AddMoreFoldersStep] Failed to sync folder ${folder.name}:`, syncErr);
          }
        }
      }

      onComplete();
    } catch (err: any) {
      console.error('Error saving folders:', err);
      setError(err.message || 'Failed to save folders');
    } finally {
      setSaving(false);
    }
  };

  const handleReconnect = () => {
    setConnecting(true);
    sessionStorage.setItem('reopen_fuel_stage', 'true');
    if (activeProvider === 'microsoft') {
      initiateMicrosoftOAuth(false, true);
    } else {
      initiateGoogleDriveOAuth(false, true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your folders...</p>
        </div>
      </div>
    );
  }

  if (needsReconnect) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-600/20 mb-4">
            <ProviderIcon className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect {providerName}</h2>
          <p className="text-gray-300">
            Connect your {providerName} to select folders
          </p>
        </div>

        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
          <p className="text-sm text-orange-300">
            Your {providerName} is not currently connected. Click below to authenticate.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors min-h-[44px]"
          >
            Back
          </button>
          <button
            onClick={handleReconnect}
            disabled={connecting}
            className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px] disabled:opacity-50"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <ProviderIcon className="w-5 h-5" />
                <span>Connect {providerName}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const remainingSlots = availableSlots.length - selectedFolders.length;
  const canAddMore = remainingSlots > 0;
  const canProceed = selectedFolders.length > 0;

  const alreadyConnectedIds = [...existingFolders.map(f => f.id), ...selectedFolders.map(f => f.id)];
  const filteredDriveFolders = driveFolders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !alreadyConnectedIds.includes(f.id)
  );

  const providerBadgeColor = activeProvider === 'microsoft' ? 'cyan' : 'blue';

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${activeProvider === 'microsoft' ? 'bg-cyan-900/30 border-cyan-600/50' : 'bg-blue-900/30 border-blue-600/50'} border rounded-full`}>
          <ProviderIcon className={`w-4 h-4 ${activeProvider === 'microsoft' ? 'text-cyan-400' : 'text-blue-400'}`} />
          <span className={`text-sm font-medium ${activeProvider === 'microsoft' ? 'text-cyan-300' : 'text-blue-300'}`}>
            {activeProvider === 'microsoft' ? 'Microsoft OneDrive / SharePoint' : 'Google Drive'}
          </span>
        </div>
      </div>

      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${activeProvider === 'microsoft' ? 'bg-cyan-600/20' : 'bg-blue-600/20'} mb-4`}>
          <ProviderIcon className={`w-8 h-8 ${activeProvider === 'microsoft' ? 'text-cyan-400' : 'text-blue-400'}`} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Add More Folders</h2>
        <p className="text-gray-300">
          Select additional {providerName} folders to sync
        </p>
        {remainingSlots > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            You can add up to {remainingSlots} more folder{remainingSlots !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {showFilePreview && previewFolder ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-600/20 mb-3">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Folder Selected</h2>
            <p className="text-gray-300 text-sm">{previewFolder.name}</p>
          </div>

          {loadingFiles ? (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                <span className="text-gray-300 text-sm">Checking folder contents...</span>
              </div>
            </div>
          ) : supportedFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-300 font-medium">
                  Found {supportedFiles.length} supported file{supportedFiles.length !== 1 ? 's' : ''} ready to sync!
                </p>
              </div>

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
                  onClick={handleAddMoreFolders}
                  disabled={availableSlots.length - selectedFolders.length <= 1}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Add More Folders</span>
                </button>
                <button
                  onClick={handleStartSync}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting Sync...</span>
                    </>
                  ) : (
                    <span>Start Sync</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                <p className="text-sm text-yellow-300">
                  This folder is empty or has no supported files. Add some documents to get started.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={openCloudDrive}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  <span>Open in {providerName}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={handleStartSync}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting Sync...</span>
                    </>
                  ) : (
                    <span>Connect Anyway</span>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleChooseDifferentFolder}
            className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
          >
            Choose a different folder
          </button>
        </div>
      ) : (
        <>
          {selectedFolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Selected Folders</h3>
              <div className="space-y-2">
                {selectedFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Folder className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">{folder.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSelectedFolder(folder.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canAddMore && (
            <div className="space-y-4">
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

              {loadingDriveFolders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                </div>
              ) : filteredDriveFolders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">
                    {searchQuery ? `No folders found matching "${searchQuery}"` : 'No available folders found'}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg max-h-[300px] overflow-y-auto">
                  <div className="space-y-1 p-2">
                    {filteredDriveFolders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleSelectFolder(folder)}
                        className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg transition-all text-left group"
                      >
                        <Folder className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{folder.name}</p>
                          {folder.createdTime && (
                            <p className="text-xs text-gray-400">
                              Created {new Date(folder.createdTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!canAddMore && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                You've reached the maximum number of additional folders (19). Save your selections to continue.
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors min-h-[44px]"
            >
              Back
            </button>
            <button
              onClick={handleSaveFolders}
              disabled={!canProceed || saving}
              className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Starting Sync...</span>
                </>
              ) : (
                <span>Start Sync</span>
              )}
            </button>
          </div>

          {!canProceed && !error && (
            <p className="text-center text-sm text-gray-400">
              Select at least one folder to continue
            </p>
          )}
        </>
      )}
    </div>
  );
};
