import { useEffect, useState } from 'react';
import { Folder, ExternalLink } from 'lucide-react';

// Declare global types for Google Picker API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface SelectedFolder {
  id: string;
  name: string;
}

interface GoogleDriveFolderPickerProps {
  accessToken: string;
  folderType: 'meetings' | 'strategy' | 'financial';
  currentFolder?: { id: string; name: string } | null;
  onFolderSelected: (folder: { id: string; name: string }) => void;
  onCreateNew?: () => void; // For "Create Astra Strategy Folder" option
  allowCreateNew?: boolean;
}

export const GoogleDriveFolderPicker = ({
  accessToken,
  folderType,
  currentFolder,
  onFolderSelected,
  onCreateNew,
  allowCreateNew = false
}: GoogleDriveFolderPickerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Picker API script
  useEffect(() => {
    const loadGooglePicker = () => {
      // Check if already fully loaded
      if (window.gapi && window.google?.picker) {
        setScriptLoaded(true);
        return;
      }

      // Check if gapi script exists
      const existingScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');

      if (existingScript) {
        // Script exists, wait for it to load
        if (window.gapi) {
          window.gapi.load('picker', () => {
            setScriptLoaded(true);
          });
        } else {
          existingScript.addEventListener('load', () => {
            window.gapi.load('picker', () => {
              setScriptLoaded(true);
            });
          });
        }
        return;
      }

      // Script doesn't exist, create it
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        window.gapi.load('picker', () => {
          setScriptLoaded(true);
        });
      };

      script.onerror = () => {
        console.error('Failed to load Google Picker API');
      };

      document.body.appendChild(script);
    };

    loadGooglePicker();

    return () => {
      // Don't remove script on unmount - other components might need it
    };
  }, []);

  const openPicker = () => {
    if (!scriptLoaded || !window.gapi || !window.google?.picker) {
      console.error('Google Picker API not loaded', {
        scriptLoaded,
        hasGapi: !!window.gapi,
        hasPicker: !!window.google?.picker
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create folder view
      const view = new window.google.picker.DocsView(
        window.google.picker.ViewId.FOLDERS
      )
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true)
        .setMimeTypes('application/vnd.google-apps.folder');

      // Build the picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setTitle(`Select ${folderType.charAt(0).toUpperCase() + folderType.slice(1)} Folder`)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const folder = data.docs[0];
            onFolderSelected({
              id: folder.id,
              name: folder.name
            });
          }
          setIsLoading(false);
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
      setIsLoading(false);
    }
  };

  const getFolderTypeLabel = () => {
    switch (folderType) {
      case 'meetings':
        return 'Meetings';
      case 'strategy':
        return 'Strategy';
      case 'financial':
        return 'Financial';
      default:
        return folderType;
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        {getFolderTypeLabel()} Folder
      </label>

      {currentFolder ? (
        <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <Folder className="w-5 h-5 text-blue-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{currentFolder.name}</p>
            <p className="text-xs text-gray-400">Selected</p>
          </div>
          <button
            onClick={openPicker}
            disabled={isLoading || !scriptLoaded}
            className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={openPicker}
            disabled={isLoading || !scriptLoaded}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm text-gray-200">
              {isLoading ? 'Loading...' : 'Select Existing Folder'}
            </span>
          </button>

          {allowCreateNew && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm text-white">
                Create Astra {getFolderTypeLabel()} Folder
              </span>
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 rounded p-2">
        <span className="font-medium text-gray-300">How it works:</span> Click the button above to open Google's secure folder picker.
        Select a folder from your Drive and it will be connected to Astra for document analysis.
      </p>
    </div>
  );
};
