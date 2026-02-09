import { useState, useEffect } from 'react';
import { FolderInfo } from '../lib/google-drive-oauth';
import { MicrosoftFolderInfo } from '../lib/microsoft-graph-oauth';
import { GoogleDriveFolderPicker } from './GoogleDriveFolderPicker';
import { Search, FolderOpen, CheckCircle, ChevronRight, ArrowLeft, Cloud, HardDrive } from 'lucide-react';

export type DriveProvider = 'google' | 'microsoft';

interface UnifiedFolderInfo {
  id: string;
  name: string;
  webUrl?: string;
  parentReference?: {
    driveId?: string;
    id?: string;
    path?: string;
  };
}

interface FolderSelectionWrapperProps {
  accessToken: string;
  folderType: 'meetings' | 'strategy' | 'financial' | 'projects';
  folders: FolderInfo[] | MicrosoftFolderInfo[];
  currentFolder: FolderInfo | MicrosoftFolderInfo | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFolderSelect: (folder: UnifiedFolderInfo | null) => void;
  onCreateNew?: () => void;
  allowCreateNew?: boolean;
  provider?: DriveProvider;
  microsoftDriveId?: string;
  onNavigateToFolder?: (folderId: string) => void;
  breadcrumbs?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

export const FolderSelectionWrapper = ({
  accessToken,
  folderType,
  folders,
  currentFolder,
  searchTerm,
  onSearchChange,
  onFolderSelect,
  onCreateNew,
  allowCreateNew = false,
  provider = 'google',
  microsoftDriveId,
  onNavigateToFolder,
  breadcrumbs = [],
  loading = false
}: FolderSelectionWrapperProps) => {
  const useGooglePicker = false;

  if (useGooglePicker && provider === 'google') {
    return (
      <GoogleDriveFolderPicker
        accessToken={accessToken}
        folderType={folderType}
        currentFolder={currentFolder as FolderInfo}
        onFolderSelected={onFolderSelect}
        onCreateNew={onCreateNew}
        allowCreateNew={allowCreateNew}
      />
    );
  }

  const filteredFolders = (folders as UnifiedFolderInfo[]).filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ProviderIcon = provider === 'microsoft' ? Cloud : HardDrive;
  const providerColor = provider === 'microsoft' ? 'cyan' : 'blue';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200 flex items-center gap-2">
        <ProviderIcon className={`w-4 h-4 text-${providerColor}-400`} />
        {folderType.charAt(0).toUpperCase() + folderType.slice(1)} Folder
        {provider === 'microsoft' && (
          <span className="text-xs text-cyan-400 font-normal">(OneDrive/SharePoint)</span>
        )}
      </label>

      {currentFolder && (
        <div className={`bg-${providerColor}-600/20 border-2 border-${providerColor}-500 rounded-lg p-3 mb-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <CheckCircle className={`w-5 h-5 text-${providerColor}-400 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium text-${providerColor}-300 mb-0.5`}>Currently Selected:</p>
                <p className="text-sm font-semibold text-white truncate">{currentFolder.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentFolder && (
        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full border-2 border-gray-500 flex-shrink-0" />
            <p className="text-sm text-gray-400">No folder currently selected</p>
          </div>
        </div>
      )}

      {provider === 'microsoft' && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 overflow-x-auto pb-1">
          <button
            onClick={() => onNavigateToFolder?.('root')}
            className="hover:text-cyan-400 transition-colors flex-shrink-0"
          >
            Root
          </button>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1 flex-shrink-0">
              <ChevronRight className="w-3 h-3" />
              <button
                onClick={() => onNavigateToFolder?.(crumb.id)}
                className={`hover:text-cyan-400 transition-colors ${
                  index === breadcrumbs.length - 1 ? 'text-cyan-400 font-medium' : ''
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search folders..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
        />
      </div>

      <div className="max-h-48 overflow-y-auto bg-gray-700/30 border border-gray-600 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Loading folders...</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => onFolderSelect(null)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                !currentFolder
                  ? `bg-${providerColor}-600/30 text-${providerColor}-200 border-l-4 border-${providerColor}-500 font-semibold`
                  : 'text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              <span>-- No folder selected --</span>
              {!currentFolder && <CheckCircle className={`w-4 h-4 text-${providerColor}-400`} />}
            </button>
            {filteredFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => onFolderSelect(folder)}
                onDoubleClick={() => provider === 'microsoft' && onNavigateToFolder?.(folder.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-t border-gray-600/50 flex items-center justify-between group ${
                  (currentFolder as UnifiedFolderInfo)?.id === folder.id
                    ? `bg-${providerColor}-600/30 text-${providerColor}-200 border-l-4 border-${providerColor}-500 font-semibold`
                    : 'text-white hover:bg-gray-700/50'
                }`}
              >
                <span className="flex items-center flex-1 min-w-0">
                  <FolderOpen className="w-4 h-4 inline mr-2 flex-shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </span>
                <div className="flex items-center gap-2">
                  {provider === 'microsoft' && onNavigateToFolder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToFolder(folder.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
                      title="Open folder"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  {(currentFolder as UnifiedFolderInfo)?.id === folder.id && (
                    <CheckCircle className={`w-4 h-4 text-${providerColor}-400`} />
                  )}
                </div>
              </button>
            ))}
            {filteredFolders.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                {searchTerm ? 'No folders match your search' : 'No folders found'}
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {provider === 'microsoft'
          ? `Select a folder from OneDrive/SharePoint for your ${folderType} documents`
          : `Folder containing your ${folderType} documents`
        }
      </p>

      {allowCreateNew && onCreateNew && provider === 'google' && (
        <button
          onClick={onCreateNew}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-sm text-white">
            Create Astra {folderType.charAt(0).toUpperCase() + folderType.slice(1)} Folder
          </span>
        </button>
      )}
    </div>
  );
};
