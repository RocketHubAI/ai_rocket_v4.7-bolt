import React, { useState, useEffect, useCallback } from 'react';
import {
  Workflow, Activity, CheckCircle, XCircle, Clock, RefreshCw,
  TrendingUp, AlertCircle, Play, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface WorkflowStats {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  successRate: number;
}

interface FailedExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  stoppedAt?: string;
  status?: string;
  errorMessage?: string;
}

interface WorkflowInfo {
  id: string;
  name: string;
  active: boolean;
}

interface MetricsData {
  summary: {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    runningCount: number;
    successRate: number;
    avgDurationSeconds: number;
    totalWorkflows: number;
    activeWorkflows: number;
  };
  last24Hours: {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    successRate: number;
  };
  workflowStats: WorkflowStats[];
  failedExecutions: FailedExecution[];
  workflows: WorkflowInfo[];
  syncedAt: string | null;
}

interface AgentWorkflowsPanelProps {
  onMetricsLoad?: (totalExecutions: number) => void;
}

export function AgentWorkflowsPanel({ onMetricsLoad }: AgentWorkflowsPanelProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedWorkflows, setExpandedWorkflows] = useState(false);
  const [expandedFailures, setExpandedFailures] = useState(false);

  const fetchMetrics = useCallback(async (sync = false) => {
    try {
      console.log('AgentWorkflowsPanel: fetchMetrics called, sync:', sync);
      if (sync) {
        setSyncing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      console.log('AgentWorkflowsPanel: Token available:', !!token);

      if (!token) {
        throw new Error('Not authenticated');
      }

      const syncParam = sync ? '&sync=true' : '';
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-execution-metrics?action=metrics${syncParam}`;
      console.log('AgentWorkflowsPanel: Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('AgentWorkflowsPanel: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('AgentWorkflowsPanel: Error response:', errorData);
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('AgentWorkflowsPanel: Response data:', data);
      console.log('AgentWorkflowsPanel: Debug info (stringified):', JSON.stringify(data.debug, null, 2));
      if (data.debug) {
        console.log('AgentWorkflowsPanel: executionsErrorMessage:', data.debug.executionsErrorMessage);
        console.log('AgentWorkflowsPanel: n8nUrlUsed:', data.debug.n8nUrlUsed);
        console.log('AgentWorkflowsPanel: rawResponseSample:', data.debug.rawResponseSample);
      }
      setMetrics(data);
      setLastUpdated(new Date());
      if (onMetricsLoad && data.summary?.totalExecutions) {
        onMetricsLoad(data.summary.totalExecutions);
      }
    } catch (err) {
      console.error('Error fetching agent workflow metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRefresh = () => {
    console.log('AgentWorkflowsPanel: handleRefresh called');
    fetchMetrics(false);
  };

  const handleSync = () => {
    console.log('AgentWorkflowsPanel: handleSync called');
    fetchMetrics(true);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading agent workflow metrics...</p>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Metrics</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-1">
            <Workflow className="w-6 h-6 text-teal-400" />
            Agent Workflow Metrics
          </h2>
          {lastUpdated && (
            <p className="text-sm text-gray-400">
              Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync & Refresh'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {metrics.summary.totalExecutions.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Executions</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {metrics.summary.successRate}%
          </div>
          <div className="text-sm text-gray-400">Success Rate</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatDuration(metrics.summary.avgDurationSeconds)}
          </div>
          <div className="text-sm text-gray-400">Avg Duration</div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <Workflow className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {metrics.summary.activeWorkflows}
          </div>
          <div className="text-sm text-gray-400">Active Workflows</div>
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-yellow-400" />
          Last 24 Hours
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{metrics.last24Hours.totalExecutions}</div>
            <div className="text-sm text-gray-400">Executions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{metrics.last24Hours.successCount}</div>
            <div className="text-sm text-gray-400">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{metrics.last24Hours.errorCount}</div>
            <div className="text-sm text-gray-400">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{metrics.last24Hours.successRate}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
        <button
          onClick={() => setExpandedWorkflows(!expandedWorkflows)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-teal-400" />
            Executions by Workflow ({metrics.workflowStats.length})
          </h3>
          {expandedWorkflows ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedWorkflows && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Workflow Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Success</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Errors</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.workflowStats.map((stat) => (
                  <tr key={stat.workflowId} className="border-b border-gray-700/50 hover:bg-gray-600/30">
                    <td className="py-3 px-4 text-sm text-white">{stat.workflowName}</td>
                    <td className="py-3 px-4 text-sm text-white text-right font-mono">
                      {stat.totalExecutions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-green-400 text-right font-mono">
                      {stat.successCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-red-400 text-right font-mono">
                      {stat.errorCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-mono ${
                        stat.successRate >= 90 ? 'text-green-400' :
                        stat.successRate >= 70 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {stat.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {metrics.failedExecutions.length > 0 && (
        <div className="bg-gray-700/50 rounded-lg p-5 border border-red-500/30">
          <button
            onClick={() => setExpandedFailures(!expandedFailures)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Recent Errors ({metrics.failedExecutions.length})
            </h3>
            {expandedFailures ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedFailures && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Execution ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Workflow</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Error</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.failedExecutions.map((exec) => (
                    <tr key={exec.id} className="border-b border-gray-700/50 hover:bg-gray-600/30">
                      <td className="py-3 px-4 text-sm text-white font-mono">{exec.id}</td>
                      <td className="py-3 px-4 text-sm text-white">{exec.workflowName}</td>
                      <td className="py-3 px-4 text-sm text-red-400 max-w-xs truncate" title={exec.errorMessage}>
                        {exec.errorMessage || 'Unknown error'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {format(new Date(exec.startedAt), 'MMM dd, HH:mm:ss')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          Active Workflows ({metrics.workflows.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="p-3 rounded-lg border bg-green-900/20 border-green-500/30"
            >
              <div className="flex items-center gap-2 mb-1">
                <Play className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">Active</span>
              </div>
              <p className="text-sm text-white truncate" title={workflow.name}>
                {workflow.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
