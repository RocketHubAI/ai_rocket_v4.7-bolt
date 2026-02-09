import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface MCPServer {
  id: string;
  name: string;
  slug: string;
  server_type: string;
  description: string | null;
  status: string;
  health_status: string;
  tools_count: number;
  capabilities: string[];
  last_health_check_at: string | null;
  created_at: string;
}

export interface MCPTool {
  id: string;
  tool_name: string;
  display_name: string;
  description: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  category: string;
  is_enabled: boolean;
  is_read_only: boolean;
  requires_approval: boolean;
  usage_count: number;
  last_used_at: string | null;
  avg_execution_ms: number;
  server_id: string;
  mcp_servers?: { name: string; server_type: string; status: string };
}

export interface CustomApiDefinition {
  id: string;
  api_name: string;
  api_slug: string;
  base_url: string;
  description: string | null;
  auth_type: string;
  status: string;
  category: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  created_at: string;
}

export interface CustomApiEndpoint {
  id: string;
  api_definition_id: string;
  endpoint_name: string;
  display_name: string;
  description: string | null;
  http_method: string;
  path: string;
  is_read_only: boolean;
  is_enabled: boolean;
  ai_generated: boolean;
  usage_count: number;
}

async function callMCPClient(action: string, params: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/mcp-client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `MCP client error: ${response.status}`);
  }

  return response.json();
}

async function callApiWizard(action: string, params: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/api-wizard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Wizard error: ${response.status}`);
  }

  return response.json();
}

export function useMCPServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const result = await callMCPClient('list_servers');
      setServers(result.servers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const syncTools = useCallback(async (serverId: string) => {
    const result = await callMCPClient('sync_tools', { server_id: serverId });
    await fetchServers();
    return result;
  }, [fetchServers]);

  const checkHealth = useCallback(async (serverId: string) => {
    const result = await callMCPClient('health_check', { server_id: serverId });
    await fetchServers();
    return result;
  }, [fetchServers]);

  return { servers, loading, error, refresh: fetchServers, syncTools, checkHealth };
}

export function useMCPTools(serverId?: string) {
  const { user } = useAuth();
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const result = await callMCPClient('list_tools', serverId ? { server_id: serverId } : {});
      setTools(result.tools || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, serverId]);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const executeTool = useCallback(async (
    toolId: string,
    inputParams: Record<string, unknown>,
    conversationId?: string
  ) => {
    return callMCPClient('execute_tool', {
      tool_id: toolId,
      input_params: inputParams,
      conversation_id: conversationId,
    });
  }, []);

  return { tools, loading, error, refresh: fetchTools, executeTool };
}

export function useCustomApis() {
  const { user } = useAuth();
  const [definitions, setDefinitions] = useState<CustomApiDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamId = user?.user_metadata?.team_id;

  const fetchDefinitions = useCallback(async () => {
    if (!user || !teamId) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('custom_api_definitions')
        .select('id, api_name, api_slug, base_url, description, auth_type, status, category, created_by, approved_by, approved_at, approval_notes, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDefinitions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, teamId]);

  useEffect(() => { fetchDefinitions(); }, [fetchDefinitions]);

  const analyzeApi = useCallback(async (params: {
    api_docs_url?: string;
    api_docs_text?: string;
    openapi_spec?: Record<string, unknown>;
  }) => {
    return callApiWizard('analyze_api', params);
  }, []);

  const generateEndpoints = useCallback(async (params: {
    api_name: string;
    base_url: string;
    auth_type?: string;
    auth_config?: Record<string, string>;
    api_docs_url?: string;
    api_docs_text?: string;
    openapi_spec?: Record<string, unknown>;
  }) => {
    const result = await callApiWizard('generate_endpoints', params);
    await fetchDefinitions();
    return result;
  }, [fetchDefinitions]);

  const testConnection = useCallback(async (params: {
    base_url: string;
    auth_type?: string;
    auth_config?: Record<string, string>;
  }) => {
    return callApiWizard('test_connection', params);
  }, []);

  const submitForReview = useCallback(async (apiDefinitionId: string) => {
    const result = await callApiWizard('submit_for_review', { api_definition_id: apiDefinitionId });
    await fetchDefinitions();
    return result;
  }, [fetchDefinitions]);

  const approveApi = useCallback(async (apiDefinitionId: string, notes?: string) => {
    const result = await callApiWizard('approve', { api_definition_id: apiDefinitionId, approval_notes: notes });
    await fetchDefinitions();
    return result;
  }, [fetchDefinitions]);

  const rejectApi = useCallback(async (apiDefinitionId: string, notes?: string) => {
    const result = await callApiWizard('reject', { api_definition_id: apiDefinitionId, approval_notes: notes });
    await fetchDefinitions();
    return result;
  }, [fetchDefinitions]);

  return {
    definitions,
    loading,
    error,
    refresh: fetchDefinitions,
    analyzeApi,
    generateEndpoints,
    testConnection,
    submitForReview,
    approveApi,
    rejectApi,
  };
}
