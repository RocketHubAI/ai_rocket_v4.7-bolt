import React, { useEffect, useState } from 'react';
import { Cloud, CheckCircle, XCircle, Copy, Mail, ShieldAlert, ExternalLink, Check, RefreshCw } from 'lucide-react';
import { handleMicrosoftCallback, getMicrosoftOAuthFlag, clearMicrosoftOAuthFlags, initiateMicrosoftOAuth } from '../lib/microsoft-graph-oauth';

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

const isAdminConsentError = (errorParam: string, errorDescription: string): boolean => {
  const adminConsentIndicators = [
    'AADSTS65001',
    'AADSTS90094',
    'consent_required',
    'need_admin_approval',
    'admin_consent',
    'interaction_required',
    'approval_required',
    'not been authorized',
    'admin has not consented',
    'requires admin approval'
  ];

  const combinedError = `${errorParam} ${errorDescription}`.toLowerCase();
  return adminConsentIndicators.some(indicator => combinedError.includes(indicator.toLowerCase()));
};

const getAdminConsentLink = (tenantId?: string): string => {
  const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
  // Use tenant-specific endpoint if available, otherwise use common
  const endpoint = tenantId
    ? `https://login.microsoftonline.com/${tenantId}/adminconsent`
    : `https://login.microsoftonline.com/common/adminconsent`;

  return `${endpoint}?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
};

export const MicrosoftGraphCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'admin_consent_required'>('processing');
  const [message, setMessage] = useState('Connecting your Microsoft account...');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState<string | undefined>(undefined);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getAdminConsentLink(tenantId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEmailAdmin = () => {
    const subject = encodeURIComponent('Action Required: Approve AI Rocket Data Sync for our organization');
    const body = encodeURIComponent(`Hi,

I'm trying to connect my Microsoft account to AI Rocket (our team's AI assistant), but it requires admin approval for our organization.

Could you please:
1. Click this link while logged into your Microsoft admin account
2. Review the permissions (read-only access to files)
3. Click "Accept" to approve "AI Rocket Data Sync" for our organization

${getAdminConsentLink(tenantId)}

IMPORTANT: After you approve it, you'll see a success message. You can close that page.

Then please let me know that you've approved it. I'll wait 1-2 minutes for Microsoft to process the approval, then try connecting my account again.

The approval is organization-wide, so once you approve it, any team member can connect their Microsoft account.

Thanks for your help!`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');
        const adminConsent = params.get('admin_consent');
        const tenant = params.get('tenant');

        console.log('[MicrosoftGraphCallback] Processing OAuth callback');

        // Check if this is an admin consent callback (no code/state, but has admin_consent)
        if (adminConsent && tenant && !code) {
          console.log('[MicrosoftGraphCallback] Admin consent callback detected');
          console.log('[MicrosoftGraphCallback] Tenant ID:', tenant);

          if (adminConsent === 'True') {
            try {
              console.log('[MicrosoftGraphCallback] Storing tenant consent...');
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              const consentResponse = await fetch(
                `${supabaseUrl}/functions/v1/store-microsoft-tenant-consent`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                  },
                  body: JSON.stringify({
                    tenant_id: tenant,
                    admin_email: null,
                  }),
                }
              );

              if (!consentResponse.ok) {
                const errorText = await consentResponse.text();
                console.error('[MicrosoftGraphCallback] Consent storage failed:', consentResponse.status, errorText);
              } else {
                const consentResult = await consentResponse.json();
                console.log('[MicrosoftGraphCallback] Tenant consent stored:', consentResult);
              }
            } catch (consentError) {
              console.error('[MicrosoftGraphCallback] Error storing tenant consent:', consentError);
            }

            setStatus('success');
            setMessage('Admin approval granted successfully!');
            setError('The app has been approved for your organization. Please let the user know to wait 1-2 minutes for Microsoft to process the approval, then try connecting their Microsoft account again.');

            setTimeout(() => {
              window.location.href = '/';
            }, 8000);
            return;
          } else {
            throw new Error('Admin consent was not granted');
          }
        }

        if (errorParam) {
          if (isAdminConsentError(errorParam, errorDescription || '')) {
            console.log('[MicrosoftGraphCallback] Admin consent required');

            // Store tenant ID for generating tenant-specific consent links
            if (tenant) {
              setTenantId(tenant);
              console.log('[MicrosoftGraphCallback] Checking if tenant consent was recently granted...');
              try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                const checkResponse = await fetch(
                  `${supabaseUrl}/functions/v1/check-microsoft-tenant-consent`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': supabaseAnonKey,
                    },
                    body: JSON.stringify({
                      tenant_id: tenant,
                    }),
                  }
                );

                const checkResult = await checkResponse.json();
                console.log('[MicrosoftGraphCallback] Consent check result:', checkResult);

                if (checkResult.has_consent) {
                  console.log('[MicrosoftGraphCallback] Tenant has consent in database, but Microsoft still showing error');
                  console.log('[MicrosoftGraphCallback] Consent was granted at:', checkResult.granted_at);

                  const grantedAt = new Date(checkResult.granted_at);
                  const now = new Date();
                  const minutesSinceGrant = Math.floor((now.getTime() - grantedAt.getTime()) / 60000);

                  console.log('[MicrosoftGraphCallback] Minutes since admin consent:', minutesSinceGrant);

                  setStatus('admin_consent_required');
                  setMessage('Admin approval is still processing');
                  setError(`Admin approval was granted ${minutesSinceGrant} minute(s) ago, but Microsoft is still processing it. This can take 2-15 minutes. Please wait a few more minutes, then try connecting again. If this continues after 15 minutes, the admin may need to grant consent again using the link below.`);
                  return;
                }
              } catch (checkError) {
                console.error('[MicrosoftGraphCallback] Error checking tenant consent:', checkError);
              }
            }

            setStatus('admin_consent_required');
            setMessage('Your organization requires admin approval');
            setError(errorDescription || 'Admin consent is required to use this app.');
            return;
          }
          throw new Error(errorDescription || errorParam);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        setMessage('Exchanging authorization code...');
        const result = await handleMicrosoftCallback(code, state);

        console.log('[MicrosoftGraphCallback] Success:', result);
        setStatus('success');
        setMessage(`Successfully connected: ${result.email}`);

        const fromGuidedSetup = getMicrosoftOAuthFlag('guided_setup');
        const fromLaunchPrep = getMicrosoftOAuthFlag('launch_prep');

        clearMicrosoftOAuthFlags();

        if (fromLaunchPrep) {
          sessionStorage.setItem('reopen_fuel_stage', 'true');
          sessionStorage.setItem('return_to_launch_prep', 'true');
        }

        sessionStorage.setItem('microsoft_oauth_complete', 'true');
        sessionStorage.setItem('show_microsoft_drive_selector', 'true');

        setTimeout(() => {
          if (fromGuidedSetup) {
            window.location.href = '/?openGuidedSetup=true&selectMicrosoftDrive=true';
          } else {
            window.location.href = '/?selectMicrosoftDrive=true';
          }
        }, 2000);

      } catch (err: any) {
        console.error('[MicrosoftGraphCallback] Error:', err);
        setStatus('error');
        setError(err.message || 'Failed to connect Microsoft account');
        setMessage('Connection failed');

        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      }
    };

    processCallback();
  }, []);

  if (status === 'admin_consent_required') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white text-center">
              Admin Approval Required
            </h2>
          </div>

          <p className="text-gray-300 text-center mb-6">
            {error.includes('minutes since') ?
              error :
              'Your organization requires an IT administrator to approve this app before you can connect your Microsoft account.'
            }
          </p>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-2">
              {error.includes('minutes since') ? 'What to do next:' : 'What to do:'}
            </h3>
            {error.includes('minutes since') ? (
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Wait 2-15 minutes for Microsoft to finish processing the admin approval</li>
                <li>Microsoft's systems can be slow - this is normal</li>
                <li>After waiting, return to the app and try connecting again</li>
                <li>If it still doesn't work after 15-20 minutes, ask your admin to click the consent link below again</li>
              </ol>
            ) : (
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Copy or email the Admin Consent Link below to your IT administrator</li>
                <li>Have them click the link while logged into their admin account and approve the app</li>
                <li>After they approve (they'll see a success message), wait 2-15 minutes for Microsoft to process the approval</li>
                <li>Then come back here and try connecting your Microsoft account again</li>
              </ol>
            )}
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <p className="text-blue-300 text-xs">
              <strong>Important:</strong> Your admin doesn't need an AI Rocket account. After they approve, they'll see a success message and can close the page. Then you can connect your account.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
            <p className="text-amber-300 text-xs">
              <strong>Critical:</strong> The admin must be logged into Microsoft with an account that has admin privileges for <strong>the same organization</strong> as your work account. Using a personal Microsoft account or an admin account from a different organization will not work.
            </p>
          </div>

          <div className="space-y-3">
            {error.includes('minutes since') && (
              <button
                onClick={() => {
                  console.log('[MicrosoftGraphCallback] User retrying OAuth flow after consent delay');
                  initiateMicrosoftOAuth();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Try Connecting My Account Again
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Admin Consent Link
                </>
              )}
            </button>

            <button
              onClick={handleEmailAdmin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              <Mail className="w-5 h-5" />
              Email This Link to My Admin
            </button>
          </div>

          <div className="mt-6 p-3 bg-gray-700/30 rounded-lg">
            <p className="text-xs text-gray-400 break-all font-mono">
              {getAdminConsentLink(tenantId)}
            </p>
          </div>

          {tenantId && (
            <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-xs text-blue-300">
                <strong>Note:</strong> This link is specific to your organization (Tenant ID: {tenantId.substring(0, 8)}...)
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center">
            <a
              href="/"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Return to App
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          {status === 'processing' && (
            <div className="flex flex-col items-center space-y-4">
              <Cloud className="w-16 h-16 text-cyan-400" />
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
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
          {status === 'processing' && 'Connecting Microsoft'}
          {status === 'success' && 'Successfully Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h2>

        <p className="text-gray-400 mb-4">{message}</p>

        {error && (
          <div className={`${status === 'success' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-red-500/10 border-red-500/50'} border rounded-lg p-3 mt-4`}>
            <p className={`${status === 'success' ? 'text-blue-300' : 'text-red-400'} text-sm`}>{error}</p>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-6">
          {status === 'processing' && 'Please wait...'}
          {status === 'success' && (message.includes('Admin approval') ? 'Closing this window...' : 'Redirecting to select your drive...')}
          {status === 'error' && 'Redirecting you back to the app...'}
        </p>
      </div>
    </div>
  );
};
