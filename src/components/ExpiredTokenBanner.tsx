import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { initiateGoogleDriveOAuth } from '../lib/google-drive-oauth';

interface ExpiredTokenBannerProps {
  onDismiss: () => void;
}

export const ExpiredTokenBanner: React.FC<ExpiredTokenBannerProps> = ({ onDismiss }) => {
  const handleReauthorize = async () => {
    try {
      await initiateGoogleDriveOAuth();
    } catch (error) {
      console.error('Failed to initiate reauthorization:', error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4 mx-4 mt-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white mb-1">
            Google Drive Reconnection Required
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            We've upgraded to a Google-verified OAuth app for enhanced security.
            Please reconnect to continue syncing your documents.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReauthorize}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect Now
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
