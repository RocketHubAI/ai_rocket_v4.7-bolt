import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle, AlertCircle, Cloud, Upload, ArrowLeft } from 'lucide-react';
import { SetupGuideProgress } from '../../lib/setup-guide-utils';
import { initiateGoogleDriveOAuth, getGoogleDriveConnection } from '../../lib/google-drive-oauth';
import { initiateMicrosoftOAuth, getMicrosoftDriveConnection } from '../../lib/microsoft-graph-oauth';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { GoogleOAuthInfoModal } from '../GoogleOAuthInfoModal';
import { GoogleDriveTroubleshootGuide } from '../GoogleDriveTroubleshootGuide';
import { DataSourceSelector, DataSourceProvider } from '../DataSourceSelector';
import { MicrosoftDriveSelector } from '../MicrosoftDriveSelector';
import LocalFileUpload from '../LocalFileUpload';

interface ConnectDriveStepProps {
  onComplete: (provider?: 'google' | 'microsoft') => void;
  progress: SetupGuideProgress | null;
  fromLaunchPrep?: boolean;
  onLocalUploadComplete?: () => void;
}

type ViewMode = 'select-provider' | 'google-connect' | 'microsoft-connect' | 'microsoft-drive-select' | 'local-upload';

export const ConnectDriveStep: React.FC<ConnectDriveStepProps> = ({
  onComplete,
  fromLaunchPrep = false,
  onLocalUploadComplete
}) => {
  const microsoftEnabled = useFeatureFlag('microsoft_onedrive_enabled');
  const [viewMode, setViewMode] = useState<ViewMode>('select-provider');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [showOAuthInfo, setShowOAuthInfo] = useState(false);

  useEffect(() => {
    checkConnections();

    const params = new URLSearchParams(window.location.search);
    if (params.get('selectMicrosoftDrive') === 'true') {
      setViewMode('microsoft-drive-select');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const checkConnections = async () => {
    try {
      const googleConnection = await getGoogleDriveConnection();
      if (googleConnection?.is_active) {
        setGoogleConnected(true);
      }

      const microsoftConnection = await getMicrosoftDriveConnection();
      if (microsoftConnection?.is_active) {
        setMicrosoftConnected(true);
      }
    } catch (err) {
      console.error('Error checking connections:', err);
    }
  };

  const handleProviderSelect = (provider: DataSourceProvider) => {
    setError('');
    switch (provider) {
      case 'google':
        setViewMode('google-connect');
        break;
      case 'microsoft':
        setViewMode('microsoft-connect');
        break;
      case 'local':
        setViewMode('local-upload');
        break;
    }
  };

  const handleGoogleConnect = () => {
    setShowOAuthInfo(true);
  };

  const handleProceedToGoogleOAuth = async () => {
    setShowOAuthInfo(false);
    setIsConnecting(true);
    setError('');

    try {
      initiateGoogleDriveOAuth(!fromLaunchPrep, fromLaunchPrep);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Drive');
      setIsConnecting(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    setIsConnecting(true);
    setError('');

    try {
      initiateMicrosoftOAuth(!fromLaunchPrep, fromLaunchPrep);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Microsoft');
      setIsConnecting(false);
    }
  };

  const handleMicrosoftDriveSelected = (driveId: string, driveName: string) => {
    console.log('Microsoft drive selected:', driveId, driveName);
    setMicrosoftConnected(true);
    onComplete('microsoft');
  };

  const handleLocalUploadComplete = () => {
    if (onLocalUploadComplete) {
      onLocalUploadComplete();
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    setViewMode('select-provider');
    setError('');
  };

  if (viewMode === 'microsoft-drive-select') {
    return (
      <MicrosoftDriveSelector
        onComplete={handleMicrosoftDriveSelected}
        onBack={handleBack}
      />
    );
  }

  if (viewMode === 'local-upload') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to options
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-600/20 mb-3">
            <Upload className="w-7 h-7 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Upload Local Files</h2>
          <p className="text-sm text-gray-400">
            Upload documents directly from your computer
          </p>
        </div>

        <LocalFileUpload
          category="strategy"
          onUploadComplete={handleLocalUploadComplete}
        />

        <div className="flex justify-center pt-2">
          <button
            onClick={onComplete}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Skip and continue
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'google-connect') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to options
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600/20 mb-3">
            <HardDrive className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Connect Google Drive
          </h2>
          <p className="text-sm text-gray-400">
            Sync documents automatically from your Google Drive
          </p>
        </div>

        {!googleConnected && (
          <>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-lg">🔓</span>
                Astra Can Access:
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-950/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs text-blue-200">Read Docs</div>
                </div>
                <div className="bg-orange-950/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📁</div>
                  <div className="text-xs text-orange-200">Create Folders</div>
                </div>
                <div className="bg-green-950/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📋</div>
                  <div className="text-xs text-green-200">File Info</div>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <p className="text-xs text-green-300 flex-1">
                <span className="font-medium">Secure:</span> Only access folders you select. Never shared.
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {googleConnected ? (
          <>
            <div className="bg-green-900/20 border-2 border-green-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-300 font-semibold">Google Drive Connected!</p>
                  <p className="text-xs text-green-400 mt-1">
                    Ready to select folders and sync data
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center pt-2">
              <button
                onClick={() => onComplete('google')}
                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition-all min-h-[44px]"
              >
                Next: Choose Folder
              </button>
            </div>
          </>
        ) : (
          <>
            <GoogleDriveTroubleshootGuide compact />
            <div className="flex justify-center pt-2">
              <button
                onClick={handleGoogleConnect}
                disabled={isConnecting}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all min-h-[44px] flex items-center gap-2"
              >
                <HardDrive className="w-5 h-5" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Google Drive'}</span>
              </button>
            </div>
          </>
        )}

        <GoogleOAuthInfoModal
          isOpen={showOAuthInfo}
          onClose={() => setShowOAuthInfo(false)}
          onProceed={handleProceedToGoogleOAuth}
        />
      </div>
    );
  }

  if (viewMode === 'microsoft-connect') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to options
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-600/20 mb-3">
            <Cloud className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Connect Microsoft OneDrive / SharePoint
          </h2>
          <p className="text-sm text-gray-400">
            Sync documents from OneDrive or SharePoint
          </p>
        </div>

        {!microsoftConnected && (
          <>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-lg">🔓</span>
                Astra Can Access:
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cyan-950/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs text-cyan-200">Read Files</div>
                </div>
                <div className="bg-cyan-950/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📁</div>
                  <div className="text-xs text-cyan-200">Browse Folders</div>
                </div>
                <div className="bg-cyan-950/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🏢</div>
                  <div className="text-xs text-cyan-200">SharePoint Sites</div>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <p className="text-xs text-green-300 flex-1">
                <span className="font-medium">Secure:</span> Only access folders you select. Never shared.
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {microsoftConnected ? (
          <>
            <div className="bg-green-900/20 border-2 border-green-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-300 font-semibold">Microsoft Connected!</p>
                  <p className="text-xs text-green-400 mt-1">
                    Ready to select folders and sync data
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center pt-2">
              <button
                onClick={() => onComplete('microsoft')}
                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition-all min-h-[44px]"
              >
                Next: Choose Folder
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleMicrosoftConnect}
              disabled={isConnecting}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all min-h-[44px] flex items-center gap-2"
            >
              <Cloud className="w-5 h-5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Microsoft'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600/20 mb-3">
          <HardDrive className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Connect Your Data (Optional)
        </h2>
        <p className="text-sm text-gray-400">
          Sync documents from cloud storage or upload files locally
        </p>
      </div>

      <DataSourceSelector
        onSelect={handleProviderSelect}
        googleConnected={googleConnected}
        microsoftConnected={microsoftConnected}
        showMicrosoft={microsoftEnabled}
      />

      {(googleConnected || microsoftConnected) && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition-all min-h-[44px]"
          >
            Continue to Folder Setup
          </button>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onComplete}
          className="text-sm text-gray-400 hover:text-white underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};
