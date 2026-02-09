import React from 'react';
import { X, Shield, ChevronRight, ExternalLink } from 'lucide-react';

interface GoogleOAuthInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
}

export const GoogleOAuthInfoModal: React.FC<GoogleOAuthInfoModalProps> = ({
  isOpen,
  onClose,
  onProceed
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Connect Google Drive</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-blue-300 font-medium mb-2">
                  Secure Connection
                </h3>
                <p className="text-sm text-gray-300">
                  You'll be redirected to Google to sign in and authorize Astra to access your Google Drive folders.
                  This is a secure OAuth connection verified by Google.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-medium">What happens next:</h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Sign in to Google</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Select the Google account you want to connect
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Review & Allow Permissions</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Grant Astra access to your Google Drive folders
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Choose Your Folders</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Select which folders you want Astra to sync and analyze
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="text-green-300 font-medium text-sm mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Your Data is Protected
            </h4>
            <ul className="text-sm text-gray-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>We only access folders you explicitly select</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Your data is never shared or sold</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>You can revoke access anytime in Google settings</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>
              Learn more in our{' '}
              <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </a>
            </span>
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/30 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 min-h-[44px]"
          >
            <span>Connect to Google</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
