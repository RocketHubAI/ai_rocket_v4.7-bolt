import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Workflow, Play, Pause, Trash2, Plus, ExternalLink, RefreshCw, Settings, Eye, Download, Upload, AlertCircle, CheckCircle, Loader, Search, ArrowUpDown, Sparkles, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Header } from './Header';
import { AstraGuidedAgentBuilder } from './AstraGuidedAgentBuilder';
import TemplateBrowser from './TemplateBrowser';
import { TemplateSearchDemo } from './TemplateSearchDemo';

interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  nodes?: any[];
  executionCount?: number;
  lastRunAt?: string;
  successRate?: number;
}

interface WorkflowMetadata {
  id: string;
  n8n_workflow_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const BuildAgentsPage: React.FC = () => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowMetadata[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAstraBuilder, setShowAstraBuilder] = useState(false);
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [showTemplateSearchDemo, setShowTemplateSearchDemo] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'active' | 'name' | 'updated' | 'nodes' | 'executions'>('active');
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    try {
      checkAccess();
    } catch (err: any) {
      console.error('Critical error in checkAccess:', err);
      setCriticalError(err?.message || 'Failed to initialize Build Agents');
      setLoading(false);
    }
  }, [user]);

  const checkAccess = async () => {
    try {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const { data: accessRecord } = await supabase
        .from('n8n_user_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .maybeSingle();

      setHasAccess(!!accessRecord);

      if (accessRecord) {
        await loadWorkflows();
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error checking N8N access:', err);
      setError(err?.message || 'Unknown error occurred');
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Load workflows from our database
      const { data: dbWorkflows, error: dbError } = await supabase
        .from('n8n_workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      setSavedWorkflows(dbWorkflows || []);

      // Load workflows from N8N
      try {
        const n8nWorkflows = await fetchN8NWorkflows();
        // Deduplicate workflows by ID
        const uniqueWorkflows = Array.from(
          new Map(n8nWorkflows.map(w => [w.id, w])).values()
        );
        setWorkflows(uniqueWorkflows);

        // Load execution counts in the background
        loadExecutionCounts(uniqueWorkflows);
      } catch (n8nError: any) {
        console.error('N8N fetch error:', n8nError);
        // Don't fail completely if N8N is unavailable, just show the error
        setError(`Failed to load workflows: ${n8nError.message}`);
        setWorkflows([]);
      }
    } catch (err: any) {
      console.error('Error loading workflows:', err);
      setError(err?.message || 'Failed to load workflows');
      setSavedWorkflows([]);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchN8NWorkflows = async (): Promise<N8NWorkflow[]> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=/workflows`,
      {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('N8N API Error:', { status: response.status, errorData });
      throw new Error(errorData.error || `Failed to fetch workflows (${response.status})`);
    }

    const data = await response.json();
    return data.data || [];
  };

  const fetchWorkflowExecutionData = async (workflowId: string): Promise<{ count: number; lastRunAt?: string; successRate?: number }> => {
    try {
      let totalCount = 0;
      let successCount = 0;
      let lastRunAt: string | undefined = undefined;
      let cursor: string | undefined = undefined;
      let hasMore = true;

      // N8N API has a max limit of 100 per request, so we need to paginate
      // We'll fetch up to 10 pages (1000 executions) for performance
      const maxPages = 10;
      let pageCount = 0;
      let allExecutions: any[] = [];

      while (hasMore && pageCount < maxPages) {
        const cursorParam = cursor ? `&cursor=${cursor}` : '';
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=/executions?workflowId=${workflowId}&limit=100${cursorParam}`,
          {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          break;
        }

        const data = await response.json();

        // Add executions from this page
        const pageResults = data.data || [];
        allExecutions = allExecutions.concat(pageResults);
        totalCount += pageResults.length;

        // Check if there are more pages
        if (data.nextCursor && pageResults.length === 100) {
          cursor = data.nextCursor;
          pageCount++;
        } else {
          hasMore = false;
        }
      }

      // Calculate success rate from all executions
      if (allExecutions.length > 0) {
        // Get most recent execution date
        lastRunAt = allExecutions[0]?.stoppedAt || allExecutions[0]?.startedAt;

        // Count successful executions
        successCount = allExecutions.filter(exec => exec.status === 'success' || exec.finished === true).length;
      }

      const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : undefined;

      // If we hit max pages, add a "+" indicator by returning a negative number
      const count = hasMore && pageCount >= maxPages ? -(totalCount) : totalCount;

      return { count, lastRunAt, successRate };
    } catch (error) {
      console.error(`Failed to fetch execution data for workflow ${workflowId}:`, error);
      return { count: 0 };
    }
  };

  const loadExecutionCounts = async (workflows: N8NWorkflow[]) => {
    try {
      setLoadingExecutions(true);
      const workflowsWithData = await Promise.all(
        workflows.map(async (workflow) => {
          const { count, lastRunAt, successRate } = await fetchWorkflowExecutionData(workflow.id);
          return {
            ...workflow,
            executionCount: count,
            lastRunAt,
            successRate
          };
        })
      );
      setWorkflows(workflowsWithData);
    } catch (error) {
      console.error('Error loading execution data:', error);
    } finally {
      setLoadingExecutions(false);
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      setError('Workflow name is required');
      return;
    }

    try {
      setCreatingWorkflow(true);
      setError('');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=/workflows`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newWorkflowName,
            nodes: [],
            connections: {},
            active: false,
            settings: {},
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      const newWorkflow = await response.json();

      // Save metadata to our database
      const { error: dbError } = await supabase
        .from('n8n_workflows')
        .insert({
          n8n_workflow_id: newWorkflow.id,
          user_id: user!.id,
          team_id: user!.user_metadata?.team_id,
          name: newWorkflowName,
          description: newWorkflowDescription,
          is_active: false,
        });

      if (dbError) throw dbError;

      setSuccess(`Workflow "${newWorkflowName}" created successfully!`);
      setShowCreateModal(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      loadWorkflows();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error creating workflow:', err);
      setError(err.message);
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const toggleWorkflowStatus = async (workflowId: string, currentStatus: boolean) => {
    try {
      setError('');

      // First, fetch the complete workflow
      const getResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=/workflows/${workflowId}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error('Failed to fetch workflow details');
      }

      const workflowData = await getResponse.json();

      // Update the active status in the workflow data
      const updatedWorkflow = {
        ...workflowData.data,
        active: !currentStatus
      };

      // Send the complete workflow back with updated status
      const putResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=/workflows/${workflowId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedWorkflow),
        }
      );

      if (!putResponse.ok) {
        const errorData = await putResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to update workflow status:', errorData);
        throw new Error(errorData.error || 'Failed to update workflow status');
      }

      // Update in our database
      await supabase
        .from('n8n_workflows')
        .update({ is_active: !currentStatus })
        .eq('n8n_workflow_id', workflowId);

      setSuccess(`Workflow ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      loadWorkflows();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error toggling workflow:', err);
      setError(err.message);
    }
  };

  const deleteWorkflow = async (workflowId: string, workflowName: string) => {
    if (!confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=/workflows/${workflowId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      // Delete from our database
      await supabase
        .from('n8n_workflows')
        .delete()
        .eq('n8n_workflow_id', workflowId);

      setSuccess(`Workflow "${workflowName}" deleted successfully!`);
      loadWorkflows();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting workflow:', err);
      setError(err.message);
    }
  };

  const openWorkflowInN8N = (workflowId: string) => {
    const n8nUrl = import.meta.env.VITE_N8N_URL;
    if (n8nUrl) {
      window.open(`${n8nUrl}/workflow/${workflowId}`, '_blank');
    }
  };

  if (criticalError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-red-700 rounded-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Critical Error</h2>
          <p className="text-gray-300 mb-4">{criticalError}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setCriticalError(null);
                setLoading(true);
                checkAccess();
              }}
              className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredAndSortedWorkflows = useMemo(() => {
    let filtered = workflows.filter(workflow => {
      const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = showActiveOnly ? workflow.active : true;
      return matchesSearch && matchesActive;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'active':
          // Sort by active status first (active = true comes first)
          if (a.active !== b.active) {
            return a.active ? -1 : 1;
          }
          // Then by execution count
          const aExecsActive = Math.abs(a.executionCount || 0);
          const bExecsActive = Math.abs(b.executionCount || 0);
          return bExecsActive - aExecsActive;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bDate - aDate;
        case 'nodes':
          const aNodes = a.nodes?.length || 0;
          const bNodes = b.nodes?.length || 0;
          return bNodes - aNodes;
        case 'executions':
          const aExecs = Math.abs(a.executionCount || 0);
          const bExecs = Math.abs(b.executionCount || 0);
          return bExecs - aExecs;
        default:
          return 0;
      }
    });

    return filtered;
  }, [workflows, searchQuery, sortBy, showActiveOnly]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-white text-lg">Loading Build Agents...</span>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-300 mb-4">
            You don't have access to the Build Agents feature. Please contact an administrator to request access.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header
        onToggleSidebar={() => window.location.href = '/'}
        showSidebarToggle={false}
      />
      <div className="pt-24 p-6">
        <div className="max-w-7xl mx-auto">

          {/* Hero Section - Marketing Focused */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 mb-6 mx-auto">
              <Workflow className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Build Intelligent Agents
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Automate your workflows with AI-powered agents. Start from templates or build from scratch.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => setShowCreateChoice(true)}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl transition-all flex items-center space-x-3 font-bold text-lg shadow-lg shadow-orange-500/25 transform hover:scale-105"
              >
                <Plus className="w-6 h-6" />
                <span>Create Your First Agent</span>
              </button>
              <button
                onClick={() => setShowTemplateSearchDemo(true)}
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-purple-500/30 text-white rounded-xl transition-all flex items-center space-x-3 font-semibold text-lg"
              >
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span>Try AI Search</span>
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">AI-Guided Builder</h3>
                <p className="text-gray-400 text-sm">Let Astra help you design the perfect workflow</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Download className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">6,600+ Templates</h3>
                <p className="text-gray-400 text-sm">Import community workflows in one click</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Settings className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Full Control</h3>
                <p className="text-gray-400 text-sm">Build custom workflows from scratch</p>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">×</button>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-green-400 font-medium">Success</p>
                <p className="text-green-300 text-sm">{success}</p>
              </div>
              <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">×</button>
            </div>
          )}

          {/* Manage Agents Section */}
          {workflows.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Manage Agents</h2>
                <button
                  onClick={loadWorkflows}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Search, Filter, Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>

                {/* Active Only Toggle */}
                <button
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                  className={`px-4 py-2.5 rounded-lg border transition-all text-sm font-medium whitespace-nowrap ${
                    showActiveOnly
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${showActiveOnly ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span>Active Only</span>
                  </div>
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'active' | 'name' | 'updated' | 'nodes' | 'executions')}
                    className="px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="active">Active First</option>
                    <option value="name">Name A-Z</option>
                    <option value="updated">Recently Updated</option>
                    <option value="nodes">Node Count</option>
                    <option value="executions">Most Runs</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        {/* Agents Grid - Optimized Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {workflows.length === 0 && !loading ? (
            <div className="col-span-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-12 text-center">
              <Workflow className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Workflows Yet</h3>
              <p className="text-gray-400 mb-6">Create your first workflow to get started with AI automation</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Workflow</span>
              </button>
            </div>
          ) : filteredAndSortedWorkflows.length === 0 ? (
            <div className="col-span-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-12 text-center">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Agents Found</h3>
              <p className="text-gray-400 mb-6">
                {showActiveOnly ? 'No active agents. Try disabling "Active Only" filter.' : 'No agents match your search.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                {showActiveOnly && (
                  <button
                    onClick={() => setShowActiveOnly(false)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Show All Agents
                  </button>
                )}
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            filteredAndSortedWorkflows.map((workflow) => {
              const metadata = savedWorkflows.find(w => w.n8n_workflow_id === workflow.id);
              return (
                <div
                  key={workflow.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-all group"
                >
                  {/* Header with Status */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex-1 pr-2 group-hover:text-blue-400 transition-colors leading-tight">
                      {workflow.name}
                    </h3>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${workflow.active ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-2 mb-3 text-xs">
                    {/* Row 1: Nodes & Executions */}
                    <div className="flex items-center justify-between text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        <span>{workflow.nodes?.length || 0} nodes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5" />
                        <span>
                          {workflow.executionCount !== undefined
                            ? workflow.executionCount < 0
                              ? `${Math.abs(workflow.executionCount)}+`
                              : workflow.executionCount
                            : '0'} runs
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Updated Date */}
                    {workflow.updatedAt && (
                      <div className="text-gray-500">
                        <span className="text-gray-400">Updated:</span> {new Date(workflow.updatedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    {/* Row 3: Last Run */}
                    <div className="text-gray-500">
                      <span className="text-gray-400">Last run:</span>{' '}
                      {workflow.lastRunAt
                        ? `${new Date(workflow.lastRunAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })} ${new Date(workflow.lastRunAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                        : 'Never'}
                    </div>

                    {/* Row 4: Success Rate */}
                    {workflow.successRate !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Success rate:</span>
                        <span className={`font-semibold ${
                          workflow.successRate >= 80 ? 'text-green-400' :
                          workflow.successRate >= 50 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {workflow.successRate}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openWorkflowInN8N(workflow.id)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center justify-center gap-1.5 font-medium"
                      title="Edit in N8N"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => toggleWorkflowStatus(workflow.id, workflow.active)}
                      className={`p-2 ${workflow.active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded transition-colors`}
                      title={workflow.active ? 'Deactivate' : 'Activate'}
                    >
                      {workflow.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteWorkflow(workflow.id, workflow.name)}
                      className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Astra Guided Agent Builder */}
      {showAstraBuilder && (
        <AstraGuidedAgentBuilder
          onClose={() => setShowAstraBuilder(false)}
          onComplete={(workflowId) => {
            setShowAstraBuilder(false);
            navigate(`/build-agents/workflow/${workflowId}`);
          }}
        />
      )}

      {/* Template Browser */}
      {showTemplateBrowser && (
        <TemplateBrowser
          onClose={() => setShowTemplateBrowser(false)}
          onTemplateImport={(workflowId) => {
            setShowTemplateBrowser(false);
            navigate(`/build-agents/workflow/${workflowId}`);
          }}
        />
      )}

      {/* Template Search Demo */}
      {showTemplateSearchDemo && (
        <TemplateSearchDemo />
      )}

      {/* Create Choice Modal */}
      {showCreateChoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">How Would You Like to Create Your Agent?</h3>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  setShowCreateChoice(false);
                  setShowAstraBuilder(true);
                }}
                className="w-full p-6 bg-gradient-to-br from-purple-900/50 to-blue-900/50 hover:from-purple-900/70 hover:to-blue-900/70 border-2 border-purple-500/50 hover:border-purple-500 rounded-lg transition-all text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                      <span>Astra-Guided Builder</span>
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Recommended</span>
                    </h4>
                    <p className="text-gray-400 mb-3">
                      Perfect for beginners! Astra will guide you through choosing a use case, understanding how workflows work, and building your first agent step-by-step.
                    </p>
                    <ul className="space-y-1 text-sm text-purple-300">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Choose from common automation scenarios</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Get AI-powered guidance and explanations</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Learn best practices as you build</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateChoice(false);
                  setShowTemplateBrowser(true);
                }}
                className="w-full p-6 bg-gradient-to-br from-orange-900/50 to-pink-900/50 hover:from-orange-900/70 hover:to-pink-900/70 border-2 border-orange-500/50 hover:border-orange-500 rounded-lg transition-all text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                      <span>Browse Templates</span>
                      <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded">6,600+ Templates</span>
                    </h4>
                    <p className="text-gray-400 mb-3">
                      Explore the n8n community template library. Find and import pre-built workflows for common use cases, then customize them to your needs.
                    </p>
                    <ul className="space-y-1 text-sm text-orange-300">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Search thousands of community templates</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Browse by category (AI, Marketing, Sales, etc.)</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>One-click import to your workspace</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateChoice(false);
                  setShowCreateModal(true);
                }}
                className="w-full p-6 bg-gray-900/50 hover:bg-gray-900/70 border-2 border-gray-700 hover:border-gray-600 rounded-lg transition-all text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-6 h-6 text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white mb-2">Build Manually</h4>
                    <p className="text-gray-400 mb-3">
                      For experienced users who know exactly what they want to build. Create a blank workflow and configure it yourself in the N8N editor.
                    </p>
                    <ul className="space-y-1 text-sm text-gray-400">
                      <li className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        <span>Full control over workflow configuration</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        <span>Direct access to N8N editor</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        <span>For advanced automation needs</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setShowCreateChoice(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Create New Workflow</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="My Workflow"
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newWorkflowDescription}
                  onChange={(e) => setNewWorkflowDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkflowName('');
                  setNewWorkflowDescription('');
                }}
                disabled={creatingWorkflow}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createWorkflow}
                disabled={creatingWorkflow || !newWorkflowName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {creatingWorkflow ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Workflow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
