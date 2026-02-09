import { useState } from 'react';
import {
  Wrench,
  Server,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Globe,
  Plus,
  Search,
  ExternalLink,
  FlaskConical
} from 'lucide-react';
import { useMCPServers, useMCPTools } from '../hooks/useMCPTools';
import { useAuth } from '../contexts/AuthContext';
import ApiWizardModal from './ApiWizardModal';

function HealthBadge({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3 h-3" /> Healthy
        </span>
      );
    case 'degraded':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertCircle className="w-3 h-3" /> Degraded
        </span>
      );
    case 'unreachable':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertCircle className="w-3 h-3" /> Unreachable
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
          <Clock className="w-3 h-3" /> Unknown
        </span>
      );
  }
}

function ServerCard({
  server,
  onSync,
  onHealthCheck,
  isAdmin
}: {
  server: any;
  onSync: (id: string) => Promise<any>;
  onHealthCheck: (id: string) => Promise<any>;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await onSync(server.id);
      setSyncResult(result);
    } catch (err: any) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleHealthCheck = async () => {
    setChecking(true);
    try {
      await onHealthCheck(server.id);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-sm font-semibold text-white truncate">{server.name}</h4>
              <HealthBadge status={server.health_status} />
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{server.description}</p>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {server.tools_count} tools
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {server.server_type}
              </span>
              {server.last_health_check_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Checked {new Date(server.last_health_check_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/50 p-4 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            {isAdmin && (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {syncing ? 'Syncing...' : 'Sync Tools'}
                </button>
                <button
                  onClick={handleHealthCheck}
                  disabled={checking}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                  Health Check
                </button>
              </>
            )}
          </div>

          {syncResult && (
            <div className={`text-xs p-2.5 rounded-lg mb-3 ${syncResult.error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {syncResult.error
                ? `Sync error: ${syncResult.error}`
                : `Synced ${syncResult.synced} tools from ${syncResult.total_workflows} workflows`}
            </div>
          )}

          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Type</span>
              <span className="text-slate-400">{server.server_type}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-slate-400">{server.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Capabilities</span>
              <span className="text-slate-400">{(server.capabilities || []).join(', ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: any }) {
  const [expanded, setExpanded] = useState(false);
  const serverName = tool.mcp_servers?.name || 'Unknown Server';

  const categoryColors: Record<string, string> = {
    finance: 'text-amber-400 bg-amber-500/20',
    crm: 'text-rose-400 bg-rose-500/20',
    communication: 'text-cyan-400 bg-cyan-500/20',
    project_management: 'text-sky-400 bg-sky-500/20',
    transcription: 'text-teal-400 bg-teal-500/20',
    marketing: 'text-orange-400 bg-orange-500/20',
    automation: 'text-slate-400 bg-slate-500/20',
    general: 'text-slate-400 bg-slate-500/20',
  };

  const colorClass = categoryColors[tool.category] || categoryColors.general;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 hover:border-slate-600 transition-colors">
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass.split(' ')[1]}`}>
            <Zap className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h5 className="text-xs font-semibold text-white truncate">{tool.display_name}</h5>
              {tool.is_read_only && (
                <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  Read Only
                </span>
              )}
              {tool.requires_approval && (
                <Shield className="w-3 h-3 text-amber-400" title="Requires approval" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">{tool.description}</p>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-600">
              <span>{serverName}</span>
              {tool.usage_count > 0 && <span>Used {tool.usage_count}x</span>}
              <span className={`px-1 py-0.5 rounded ${colorClass}`}>{tool.category}</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-slate-700/50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/50 p-3 bg-slate-800/20">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Tool Name</span>
              <span className="text-slate-400 font-mono text-[10px]">{tool.tool_name}</span>
            </div>
            {tool.avg_execution_ms > 0 && (
              <div className="flex justify-between">
                <span>Avg Execution</span>
                <span className="text-slate-400">{tool.avg_execution_ms}ms</span>
              </div>
            )}
            {tool.last_used_at && (
              <div className="flex justify-between">
                <span>Last Used</span>
                <span className="text-slate-400">{new Date(tool.last_used_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MCPToolsPage() {
  const { user } = useAuth();
  const { servers, loading: serversLoading, syncTools, checkHealth } = useMCPServers();
  const { tools, loading: toolsLoading, refresh: refreshTools } = useMCPTools();
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isAdmin = user?.user_metadata?.role === 'admin';
  const loading = serversLoading || toolsLoading;

  const categories = ['all', ...new Set(tools.map(t => t.category))];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = !searchQuery ||
      tool.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSyncTools = async (serverId: string) => {
    const result = await syncTools(serverId);
    await refreshTools();
    return result;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading MCP tools...</p>
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
              MCP Tools is currently in preview testing and not yet available for all users. Functionality may change before general release.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MCP Tools</h1>
                <p className="text-sm text-slate-400">
                  {tools.length} tools available from {servers.length} server{servers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Connect API
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-300 leading-relaxed">
                MCP tools let your AI agent interact with external services. Tools are discovered
                from connected MCP servers like n8n. Admins can sync tools and connect custom APIs
                using the API Wizard.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Connected Servers
            <span className="text-xs text-slate-600">({servers.length})</span>
          </h2>

          {servers.length === 0 ? (
            <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No MCP servers connected yet</p>
              <p className="text-xs text-slate-600 mt-1">Servers will appear here once configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map(server => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onSync={handleSyncTools}
                  onHealthCheck={checkHealth}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Available Tools
              <span className="text-xs text-slate-600">({filteredTools.length})</span>
            </h2>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:border-cyan-500/50 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <Wrench className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                {tools.length === 0
                  ? 'No tools discovered yet'
                  : 'No tools match your search'}
              </p>
              {tools.length === 0 && servers.length > 0 && isAdmin && (
                <p className="text-xs text-slate-600 mt-1">
                  Click "Sync Tools" on a server to discover available tools
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="text-center">
            <p className="text-xs text-slate-600">
              MCP tools use read-only access by default. Write operations require admin approval.
              All tool executions are logged for audit.
            </p>
          </div>
        </div>
      </div>

      {showWizard && (
        <ApiWizardModal
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            refreshTools();
          }}
        />
      )}
    </div>
  );
}
