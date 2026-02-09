import { useState } from 'react';
import { Calendar, X, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ConnectCalendarModalProps {
  provider: 'google' | 'outlook';
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectCalendarModal({ provider, onClose, onSuccess }: ConnectCalendarModalProps) {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const teamId = user?.user_metadata?.team_id;

  const providerConfig = {
    google: {
      name: 'Google Calendar',
      description: 'Connect your Google Calendar to give your AI agent visibility into your schedule, upcoming meetings, and availability.',
      scopes: 'Read-only access to your calendar events',
      note: 'Uses your existing Google Drive connection. No additional sign-in required if you already have Google Drive connected.'
    },
    outlook: {
      name: 'Outlook Calendar',
      description: 'Connect your Outlook Calendar to give your AI agent visibility into your schedule, upcoming meetings, and availability.',
      scopes: 'Read-only access to your calendar events',
      note: 'Uses your existing Microsoft connection. No additional sign-in required if you already have OneDrive/SharePoint connected.'
    }
  };

  const config = providerConfig[provider];

  const handleConnect = async () => {
    if (!user || !teamId) return;

    setConnecting(true);
    setError(null);

    try {
      const driveProvider = provider === 'google' ? 'google' : 'microsoft';
      const { data: driveConn, error: driveError } = await supabase
        .from('user_drive_connections')
        .select('id, access_token, refresh_token, token_expires_at, google_account_email, microsoft_account_email, connection_status')
        .eq('team_id', teamId)
        .eq('provider', driveProvider)
        .eq('is_active', true)
        .maybeSingle();

      if (driveError) throw new Error('Failed to check existing connection');

      if (!driveConn || driveConn.connection_status !== 'connected') {
        setError(
          provider === 'google'
            ? 'Please connect Google Drive first from Launch Preparation, then come back to enable Calendar.'
            : 'Please connect OneDrive/SharePoint first from Launch Preparation, then come back to enable Calendar.'
        );
        setConnecting(false);
        return;
      }

      const calendarSlug = provider === 'google' ? 'google-calendar' : 'outlook-calendar';
      const { data: registryEntry, error: regError } = await supabase
        .from('integration_registry')
        .select('id')
        .eq('provider_slug', calendarSlug)
        .maybeSingle();

      if (regError || !registryEntry) throw new Error('Calendar integration not found in registry');

      const accountEmail = provider === 'google'
        ? driveConn.google_account_email
        : driveConn.microsoft_account_email;

      const { error: insertError } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          team_id: teamId,
          integration_id: registryEntry.id,
          access_token_encrypted: driveConn.access_token,
          refresh_token_encrypted: driveConn.refresh_token,
          token_expires_at: driveConn.token_expires_at,
          connected_account_email: accountEmail,
          connected_account_name: accountEmail,
          status: 'active',
          connection_metadata: {
            drive_connection_id: driveConn.id,
            shared_credentials: true,
            provider: driveProvider
          }
        }, {
          onConflict: 'user_id,integration_id'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Calendar connection error:', err);
      setError(err.message || 'Failed to connect calendar');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Connect {config.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {config.description}
          </p>

          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-slate-300">Permissions</span>
            </div>
            <p className="text-xs text-slate-400">{config.scopes}</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300 leading-relaxed">
              {config.note}
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-400">Calendar connected successfully!</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting || success}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Connected
              </>
            ) : (
              'Connect Calendar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
