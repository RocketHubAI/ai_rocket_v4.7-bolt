import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, CheckCircle, XCircle } from 'lucide-react';
import { handleGoogleDriveCallback, getGoogleDriveOAuthFlag, clearGoogleDriveOAuthFlags } from '../lib/google-drive-oauth';

export const GoogleDriveCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting your Google Drive...');
  const [error, setError] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get code and state from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        console.log('📁 [GoogleDriveCallback] Processing OAuth callback');
        console.log('📁 Code present:', !!code);
        console.log('📁 State present:', !!state);

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        setMessage('Exchanging authorization code...');
        const result = await handleGoogleDriveCallback(code, state);

        console.log('📁 [GoogleDriveCallback] Success:', result);
        setStatus('success');
        setMessage(`Successfully connected Google Drive account: ${result.email}`);

        const fromGuidedSetup = getGoogleDriveOAuthFlag('guided_setup');
        const fromLaunchPrep = getGoogleDriveOAuthFlag('launch_prep');

        clearGoogleDriveOAuthFlags();

        if (fromLaunchPrep) {
          sessionStorage.setItem('reopen_fuel_stage', 'true');
          sessionStorage.setItem('return_to_launch_prep', 'true');
        }

        // Redirect back to main app after 2 seconds
        setTimeout(() => {
          if (fromGuidedSetup) {
            // Redirect to main app with flag to reopen Guided Setup
            window.location.href = '/?openGuidedSetup=true';
          } else {
            // Just go back to main app - session storage flags will handle reopening
            window.location.href = '/';
          }
        }, 2000);

      } catch (err: any) {
        console.error('📁 [GoogleDriveCallback] Error:', err);
        setStatus('error');
        setError(err.message || 'Failed to connect Google Drive');
        setMessage('Failed to connect Google Drive');

        // Redirect back after 5 seconds even on error
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          {status === 'processing' && (
            <div className="flex flex-col items-center space-y-4">
              <HardDrive className="w-16 h-16 text-blue-400" />
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          {status === 'processing' && 'Connecting Google Drive'}
          {status === 'success' && 'Successfully Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h2>

        <p className="text-gray-400 mb-4">{message}</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mt-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-6">
          {status === 'processing' && 'Please wait...'}
          {status === 'success' && 'Redirecting you back to the app...'}
          {status === 'error' && 'Redirecting you back to the app...'}
        </p>
      </div>
    </div>
  );
};
