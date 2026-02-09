import { useState } from 'react';
import {
  Plug,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
  FolderKanban,
  Mic,
  BarChart3,
  Zap,
  HardDrive,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Info,
  FlaskConical
} from 'lucide-react';
import {
  useIntegrations,
  IntegrationWithConnection,
  getCategoryLabel
} from '../hooks/useIntegrations';
import { useAuth } from '../contexts/AuthContext';
import { ConnectCalendarModal } from './ConnectCalendarModal';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  storage: HardDrive,
  calendar: Calendar,
  accounting: DollarSign,
  communication: MessageSquare,
  crm: Users,
  project_management: FolderKanban,
  transcription: Mic,
  analytics: BarChart3,
  custom: Zap
};

const categoryColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  storage: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  calendar: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
  accounting: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
  communication: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
  crm: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', iconBg: 'bg-rose-500/20' },
  project_management: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', iconBg: 'bg-sky-500/20' },
  transcription: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', iconBg: 'bg-teal-500/20' },
  analytics: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', iconBg: 'bg-orange-500/20' },
  custom: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', iconBg: 'bg-slate-500/20' }
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3 h-3" />
          Connected
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertCircle className="w-3 h-3" />
          Error
        </span>
      );
    case 'disconnected':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
          <XCircle className="w-3 h-3" />
          Disconnected
        </span>
      );
    default:
      return null;
  }
}

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  isAdmin
}: {
  integration: IntegrationWithConnection;
  onConnect: (integration: IntegrationWithConnection) => void;
  onDisconnect: (integrationId: string) => void;
  isAdmin: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnected = integration.connection?.status === 'active';
  const isComingSoon = integration.status === 'coming_soon';
  const needsAdmin = integration.requires_admin && !isAdmin;
  const isExistingDrive = integration.provider_slug === 'google-drive' || integration.provider_slug === 'microsoft-onedrive';

  const handleDisconnect = async () => {
    if (!integration.connection || isExistingDrive) return;
    setDisconnecting(true);
    try {
      await onDisconnect(integration.connection.integration_id);
    } catch {
      // Error handled in parent
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 ${
        isConnected
          ? 'bg-slate-800/60 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
          : isComingSoon
          ? 'bg-slate-800/30 border-slate-700/50'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isComingSoon ? 'bg-slate-700/50' : categoryColors[integration.provider_category]?.iconBg || 'bg-slate-700'
          }`}>
            {integration.provider_logo_url ? (
              <img
                src={integration.provider_logo_url}
                alt={integration.provider_name}
                className="w-6 h-6 rounded"
              />
            ) : (
              (() => {
                const Icon = categoryIcons[integration.provider_category] || Plug;
                return <Icon className={`w-5 h-5 ${isComingSoon ? 'text-slate-500' : categoryColors[integration.provider_category]?.text || 'text-slate-400'}`} />;
              })()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className={`text-sm font-semibold truncate ${isComingSoon ? 'text-slate-400' : 'text-white'}`}>
                {integration.provider_name}
              </h4>
              {isConnected && <StatusBadge status={integration.connection!.status} />}
              {isComingSoon && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-400 border border-slate-600">
                  Soon
                </span>
              )}
            </div>

            <p className={`text-xs leading-relaxed line-clamp-2 ${isComingSoon ? 'text-slate-500' : 'text-slate-400'}`}>
              {integration.provider_description}
            </p>

            {isConnected && integration.connection && (
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                {integration.connection.connected_account_email && (
                  <span className="truncate">{integration.connection.connected_account_email}</span>
                )}
                {integration.connection.times_used_by_agent > 0 && (
                  <span className="flex-shrink-0">Used {integration.connection.times_used_by_agent}x by AI</span>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            {isConnected && !isExistingDrive ? (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ) : isExistingDrive ? (
              <div className="p-1.5">
                <Shield className="w-4 h-4 text-emerald-500/50" />
              </div>
            ) : isComingSoon ? (
              <div className="p-1.5">
                <Clock className="w-4 h-4 text-slate-600" />
              </div>
            ) : needsAdmin ? (
              <div className="p-1.5" title="Admin required">
                <Shield className="w-4 h-4 text-slate-600" />
              </div>
            ) : (
              <button
                onClick={() => onConnect(integration)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {showDetails && isConnected && !isExistingDrive && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {integration.connection?.last_synced_at && (
                  <span>Last synced: {new Date(integration.connection.last_synced_at).toLocaleDateString()}</span>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </button>
            </div>
            {integration.connection?.last_error && (
              <p className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                {integration.connection.last_error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConnectedAppsPage() {
  const { user } = useAuth();
  const {
    groupedByCategory,
    sortedCategories,
    connectedCount,
    availableCount,
    loading,
    error,
    refresh,
    disconnectIntegration
  } = useIntegrations();

  const [calendarModalProvider, setCalendarModalProvider] = useState<'google' | 'outlook' | null>(null);
  const isAdmin = user?.user_metadata?.role === 'admin';

  const handleConnect = (integration: IntegrationWithConnection) => {
    if (integration.provider_slug === 'google-calendar') {
      setCalendarModalProvider('google');
    } else if (integration.provider_slug === 'outlook-calendar') {
      setCalendarModalProvider('outlook');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      await disconnectIntegration(integrationId);
    } catch {
      // Error logged in hook
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Preview Feature</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Connected Apps is currently in preview testing and not yet available for all users. Functionality may change before general release.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Plug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Connected Apps</h1>
              <p className="text-sm text-slate-400">
                {connectedCount > 0
                  ? `${connectedCount} connected of ${availableCount} available`
                  : 'Connect your business tools to enhance AI insights'
                }
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Connect your business tools so your AI agent can work across all your data.
                Calendar integrations are ready now. Apps marked "Soon" are being connected via
                our MCP automation server. Visit the <span className="text-cyan-400 font-medium">MCP Tools</span> tab
                to manage automation tools or connect any custom API using the API Wizard.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {sortedCategories.map(category => {
            const integrations = groupedByCategory[category];
            if (!integrations?.length) return null;

            const colors = categoryColors[category] || categoryColors.custom;
            const CategoryIcon = categoryIcons[category] || Plug;

            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className={`w-4 h-4 ${colors.text}`} />
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    {getCategoryLabel(category)}
                  </h2>
                  <span className="text-xs text-slate-600">
                    ({integrations.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {integrations.map(integration => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="text-center">
            <p className="text-xs text-slate-600">
              All connections use read-only access by default. Your credentials are encrypted and never exposed to other users.
            </p>
          </div>
        </div>
      </div>

      {calendarModalProvider && (
        <ConnectCalendarModal
          provider={calendarModalProvider}
          onClose={() => setCalendarModalProvider(null)}
          onSuccess={() => {
            setCalendarModalProvider(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
