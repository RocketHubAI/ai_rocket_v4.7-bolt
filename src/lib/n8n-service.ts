import { supabase } from './supabase';

export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes?: N8NNode[];
  connections?: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  executionCount?: number;
}

export interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface N8NExecution {
  id: string;
  workflowId: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  data?: {
    resultData?: {
      runData?: Record<string, any>;
      error?: {
        message: string;
        stack?: string;
      };
    };
  };
}

export interface WorkflowStats {
  total: number;
  success: number;
  error: number;
  running: number;
  successRate: number;
  avgExecutionTime: number;
}

class N8NService {
  private async proxyRequest(path: string, options: RequestInit = {}) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy?path=${encodeURIComponent(path)}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  async getWorkflows(): Promise<N8NWorkflow[]> {
    const data = await this.proxyRequest('/workflows');
    return data.data || [];
  }

  async getWorkflow(workflowId: string): Promise<N8NWorkflow> {
    const data = await this.proxyRequest(`/workflows/${workflowId}`);
    return data.data || data;
  }

  async createWorkflow(workflow: {
    name: string;
    nodes?: N8NNode[];
    connections?: Record<string, any>;
    settings?: Record<string, any>;
  }): Promise<N8NWorkflow> {
    const data = await this.proxyRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name: workflow.name,
        nodes: workflow.nodes || [],
        connections: workflow.connections || {},
        settings: workflow.settings || {},
        // Note: 'active' field is read-only and set by n8n, don't include it
      }),
    });
    return data.data || data;
  }

  async updateWorkflow(workflowId: string, updates: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    const currentWorkflow = await this.getWorkflow(workflowId);

    const updatedWorkflow = {
      ...currentWorkflow,
      ...updates,
    };

    const data = await this.proxyRequest(`/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedWorkflow),
    });
    return data.data || data;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.proxyRequest(`/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async activateWorkflow(workflowId: string): Promise<N8NWorkflow> {
    return this.updateWorkflow(workflowId, { active: true });
  }

  async deactivateWorkflow(workflowId: string): Promise<N8NWorkflow> {
    return this.updateWorkflow(workflowId, { active: false });
  }

  async executeWorkflow(workflowId: string, data?: any): Promise<N8NExecution> {
    const result = await this.proxyRequest(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    return result.data || result;
  }

  async getExecutions(workflowId: string, limit: number = 20): Promise<N8NExecution[]> {
    const data = await this.proxyRequest(`/executions?workflowId=${workflowId}&limit=${limit}`);
    return data.data || [];
  }

  async getExecution(executionId: string): Promise<N8NExecution> {
    const data = await this.proxyRequest(`/executions/${executionId}`);
    return data.data || data;
  }

  async retryExecution(executionId: string): Promise<N8NExecution> {
    const data = await this.proxyRequest(`/executions/${executionId}/retry`, {
      method: 'POST',
    });
    return data.data || data;
  }

  async deleteExecution(executionId: string): Promise<void> {
    await this.proxyRequest(`/executions/${executionId}`, {
      method: 'DELETE',
    });
  }

  async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    const executions = await this.getExecutions(workflowId, 100);

    const total = executions.length;
    const success = executions.filter(e => e.status === 'success').length;
    const error = executions.filter(e => e.status === 'error').length;
    const running = executions.filter(e => e.status === 'running').length;

    const successRate = total > 0 ? (success / total) * 100 : 0;

    const completedExecutions = executions.filter(e => e.finished && e.startedAt && e.stoppedAt);
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => {
          const duration = new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime();
          return sum + duration;
        }, 0) / completedExecutions.length
      : 0;

    return {
      total,
      success,
      error,
      running,
      successRate: Math.round(successRate),
      avgExecutionTime: Math.round(avgExecutionTime / 1000),
    };
  }

  async analyzeWorkflowForOptimization(workflowId: string): Promise<{
    issues: string[];
    suggestions: string[];
    health: 'healthy' | 'warning' | 'critical';
  }> {
    const workflow = await this.getWorkflow(workflowId);
    const stats = await this.getWorkflowStats(workflowId);

    const issues: string[] = [];
    const suggestions: string[] = [];
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (stats.successRate < 50) {
      health = 'critical';
      issues.push('Low success rate - less than 50% of executions succeed');
      suggestions.push('Review error logs to identify common failure patterns');
    } else if (stats.successRate < 80) {
      health = 'warning';
      issues.push('Moderate success rate - room for improvement');
      suggestions.push('Consider adding error handling nodes');
    }

    if (stats.avgExecutionTime > 300) {
      if (health === 'healthy') health = 'warning';
      issues.push('Long average execution time - over 5 minutes');
      suggestions.push('Consider optimizing slow nodes or splitting into smaller workflows');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      health = 'critical';
      issues.push('Workflow has no nodes configured');
      suggestions.push('Add workflow nodes to make it functional');
    } else if (workflow.nodes.length > 20) {
      if (health === 'healthy') health = 'warning';
      issues.push('Complex workflow with many nodes');
      suggestions.push('Consider breaking into smaller, reusable sub-workflows');
    }

    if (!workflow.active && stats.total === 0) {
      if (health === 'healthy') health = 'warning';
      issues.push('Workflow never executed');
      suggestions.push('Test the workflow before activating');
    }

    if (issues.length === 0) {
      suggestions.push('Workflow is performing well');
      suggestions.push('Monitor regularly to maintain health');
    }

    return { issues, suggestions, health };
  }

  async saveWorkflowMetadata(workflowId: string, name: string, description?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('n8n_workflows')
      .upsert({
        n8n_workflow_id: workflowId,
        user_id: user.id,
        team_id: user.user_metadata?.team_id,
        name,
        description,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async getUserWorkflows(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('n8n_workflows')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const n8nService = new N8NService();

export async function checkN8NAccess(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;

  const { data: accessRecord } = await supabase
    .from('n8n_user_access')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_enabled', true)
    .maybeSingle();

  return !!accessRecord;
}
