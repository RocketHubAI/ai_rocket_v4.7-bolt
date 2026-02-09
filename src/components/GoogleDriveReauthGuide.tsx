import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, CheckCircle, ChevronDown, ChevronUp, Shield, Trash2, Link2 } from 'lucide-react';
import { initiateGoogleDriveOAuth } from '../lib/google-drive-oauth';

interface GoogleDriveReauthGuideProps {
  userEmail?: string;
  onReconnectStarted?: () => void;
  fromLaunchPrep?: boolean;
}

export const GoogleDriveReauthGuide: React.FC<GoogleDriveReauthGuideProps> = ({
  userEmail,
  onReconnectStarted,
  fromLaunchPrep = false
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleStepComplete = (step: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(step);
      return newSet;
    });
    if (step < 3) {
      setExpandedStep(step + 1);
    }
  };

  const handleReconnect = () => {
    onReconnectStarted?.();
    initiateGoogleDriveOAuth(false, fromLaunchPrep);
  };

  const googlePermissionsUrl = 'https://myaccount.google.com/permissions';

  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-orange-500/20 rounded-lg flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Google Drive Reconnection Required
          </h3>
          <p className="text-gray-300 text-sm">
            We've upgraded to a Google-verified OAuth application for enhanced security.
            Follow the steps below to reconnect and restore your data sync.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Step 1: Revoke Access in Google */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                completedSteps.has(1)
                  ? 'bg-green-500 text-white'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
              }`}>
                {completedSteps.has(1) ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <div>
                <span className="text-white font-medium">Revoke Access in Google Account</span>
                <span className="text-xs text-gray-400 block">Recommended for a clean reconnection</span>
              </div>
            </div>
            {expandedStep === 1 ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedStep === 1 && (
            <div className="px-4 pb-4 border-t border-gray-700">
              <div className="pt-4 space-y-4">
                <p className="text-sm text-gray-300">
                  To ensure a clean reconnection, first remove our app's access from your Google account:
                </p>

                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      A
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        Click the button below to open Google Account Permissions
                      </p>
                      <a
                        href={googlePermissionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Google Permissions
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      B
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        Find <span className="font-semibold text-orange-300">"airocket.app"</span> in the list of apps with access
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Scroll through your connected apps to find it
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      C
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        Click on the app, then click <span className="font-semibold text-red-400">"Remove Access"</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <Trash2 className="w-3 h-3" />
                        <span>This removes our stored authorization</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      D
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        Confirm the removal when prompted
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">
                    After completing this step, return here to continue
                  </p>
                  <button
                    onClick={() => handleStepComplete(1)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    I've Done This
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Why This Happens */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                completedSteps.has(2)
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              }`}>
                {completedSteps.has(2) ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <div>
                <span className="text-white font-medium">Why Did This Happen?</span>
                <span className="text-xs text-gray-400 block">Optional: Understand the issue</span>
              </div>
            </div>
            {expandedStep === 2 ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedStep === 2 && (
            <div className="px-4 pb-4 border-t border-gray-700">
              <div className="pt-4 space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">This is a security feature</h4>
                      <p className="text-sm text-gray-300">
                        Google's authorization tokens expire periodically as a security measure.
                        When this happens, you need to re-authorize to continue syncing your documents.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-300 space-y-2">
                  <p><strong className="text-white">Why you need to reconnect:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                    <li><strong className="text-blue-300">We upgraded to a Google-verified OAuth app</strong> for enhanced security</li>
                    <li>Google account password was changed</li>
                    <li>Two-factor authentication was updated</li>
                    <li>Access was manually revoked from Google settings</li>
                    <li>Extended period of inactivity</li>
                  </ul>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleStepComplete(2)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Continue to Reconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Reconnect */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setExpandedStep(expandedStep === 3 ? null : 3)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                completedSteps.has(3)
                  ? 'bg-green-500 text-white'
                  : 'bg-green-500/20 text-green-400 border border-green-500/50'
              }`}>
                {completedSteps.has(3) ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <div>
                <span className="text-white font-medium">Reconnect Google Drive</span>
                <span className="text-xs text-gray-400 block">Final step to restore your connection</span>
              </div>
            </div>
            {expandedStep === 3 ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedStep === 3 && (
            <div className="px-4 pb-4 border-t border-gray-700">
              <div className="pt-4 space-y-4">
                <p className="text-sm text-gray-300">
                  Now that you've cleared the old authorization, click below to establish a fresh connection.
                  You'll be redirected to Google to grant access again.
                </p>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Link2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">What happens next:</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>1. You'll be redirected to Google's sign-in page</li>
                        <li>2. Select your Google account{userEmail && <span className="text-green-400"> ({userEmail})</span>}</li>
                        <li>3. Review and approve the requested permissions</li>
                        <li>4. You'll be redirected back to Astra automatically</li>
                        <li>5. Your folder settings will be preserved</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleReconnect}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reconnect Google Drive Now
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Your existing folder configurations will be preserved after reconnecting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action for Users Who Want to Skip Reading */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-400">
              Already revoked access in Google? Skip straight to reconnecting:
            </p>
          </div>
          <button
            onClick={handleReconnect}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Quick Reconnect
          </button>
        </div>
      </div>
    </div>
  );
};
