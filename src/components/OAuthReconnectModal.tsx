import React from 'react';
import { RefreshCw, Shield, CheckCircle } from 'lucide-react';
import { initiateGoogleDriveOAuth } from '../lib/google-drive-oauth';

interface OAuthReconnectModalProps {
  onClose: () => void;
  onReconnect: () => void;
}

export const OAuthReconnectModal: React.FC<OAuthReconnectModalProps> = ({ onClose, onReconnect }) => {
  const handleReconnect = () => {
    console.log('[OAuth] User clicked reconnect from modal');
    onReconnect();
    initiateGoogleDriveOAuth();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-blue-500/30 animate-in fade-in duration-300 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-blue-500/30 p-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Google Drive Reconnection Required
            </h2>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-gray-200 text-sm leading-relaxed">
              We've upgraded to a new <strong className="text-blue-300">Google-verified OAuth application</strong> for
              enhanced security and reliability. Please reconnect your Google Drive to continue syncing documents.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-semibold text-sm flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Why This Upgrade?</span>
            </h3>
            <ul className="space-y-1.5 text-gray-300 text-xs">
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span><strong className="text-white">Google Verified:</strong> Our app is now officially verified by Google for enhanced trust</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span><strong className="text-white">Improved Reliability:</strong> More stable connections with better token management</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span><strong className="text-white">Enhanced Security:</strong> Latest security standards and compliance requirements</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
            <h3 className="text-white font-semibold text-sm mb-1 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Your Data is Safe</span>
            </h3>
            <p className="text-gray-300 text-xs">
              All your existing folder configurations and synced documents will be preserved.
              This is a one-time reconnection that takes less than 30 seconds.
            </p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <p className="text-orange-300 text-xs font-medium">
              Document sync is paused until you reconnect with the new verified app
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 border-t border-gray-700 p-4 rounded-b-xl flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Remind Me Later
          </button>
          <button
            onClick={handleReconnect}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reconnect Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
