# MCP Backend Client Architecture for Astra Intelligence

## Executive Summary

This document outlines a comprehensive plan to integrate Model Context Protocol (MCP) capabilities into Astra Intelligence through a backend architecture that works seamlessly on web-based platforms without requiring browser extensions or desktop applications.

**Core Value Proposition:** Enable Astra to connect to any MCP server (including n8n workflows, filesystems, databases, APIs) through a centralized backend client, providing team-wide access to powerful tools and data sources through simple conversational AI interactions.

---

## 🎯 Strategic Goals

### Primary Objectives
1. **Web-Native MCP Integration** - Enable MCP capabilities without browser extensions
2. **Team-Centric Management** - Centralized configuration managed by team admins
3. **Mobile-First Experience** - Full MCP functionality on all devices
4. **Security by Design** - Server-side credential management and access control
5. **Seamless AI Integration** - Natural tool discovery and execution through conversation

### Success Metrics
- Users can execute MCP tools through natural language within 2 seconds
- Team admins can configure new MCP servers in under 5 minutes
- 100% feature parity across mobile and desktop
- Zero credential exposure to client-side code
- 99.9% uptime for tool execution

---

## 🏗️ Architecture Overview

### High-Level Component Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React PWA)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Chat UI     │  │  Team        │  │  Tool        │         │
│  │  (User)      │  │  Settings    │  │  Analytics   │         │
│  │              │  │  (Admin)     │  │  Dashboard   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓ HTTPS/REST API
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                             │
│                   (mcp-client)                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Authentication & Authorization                  │           │
│  │  • Verify user identity                         │           │
│  │  • Check team membership                        │           │
│  │  • Validate permissions                         │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │  MCP Server Management                          │           │
│  │  • Load team's configured servers               │           │
│  │  • Establish connections (stdio/SSE/HTTP)       │           │
│  │  • Connection pooling & lifecycle               │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Tool Discovery & Execution                     │           │
│  │  • List available tools from servers            │           │
│  │  • Execute tool calls with parameters           │           │
│  │  • Handle async operations                      │           │
│  │  • Format and return results                    │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Logging & Monitoring                           │           │
│  │  • Execution logs                               │           │
│  │  • Performance metrics                          │           │
│  │  • Error tracking                               │           │
│  └─────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓ MCP Protocol (stdio/SSE/HTTP)
┌─────────────────────────────────────────────────────────────────┐
│                        MCP SERVERS                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  n8n MCP     │  │ Filesystem   │  │  Database    │         │
│  │  Server      │  │  MCP Server  │  │  MCP Server  │         │
│  │              │  │              │  │              │         │
│  │  • Workflows │  │  • Read/Write│  │  • Queries   │         │
│  │  • Triggers  │  │  • Search    │  │  • Analytics │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  GitHub      │  │   Slack      │  │   Custom     │         │
│  │  MCP Server  │  │  MCP Server  │  │  MCP Server  │         │
│  │              │  │              │  │              │         │
│  │  • Issues    │  │  • Messages  │  │  • Business  │         │
│  │  • PRs       │  │  • Channels  │  │    Logic     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema Design

### Table: `mcp_servers`
**Purpose:** Store MCP server configurations for each team

```sql
CREATE TABLE mcp_servers (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Server details
  name TEXT NOT NULL,
  description TEXT,
  server_type TEXT NOT NULL CHECK (server_type IN ('stdio', 'sse', 'http')),

  -- Connection configuration (encrypted)
  config JSONB NOT NULL,
  /* Example config structures:
    stdio: { "command": "node", "args": ["server.js"], "env": {...} }
    sse: { "url": "https://mcp.example.com", "auth": {...} }
    http: { "url": "https://api.example.com/mcp", "auth": {...} }
  */

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'pending' CHECK (connection_status IN ('pending', 'connected', 'error', 'disconnected')),
  last_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Indexes
  CONSTRAINT unique_server_name_per_team UNIQUE (team_id, name)
);

-- Indexes for performance
CREATE INDEX idx_mcp_servers_team_id ON mcp_servers(team_id);
CREATE INDEX idx_mcp_servers_is_active ON mcp_servers(is_active);

-- Row Level Security
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team's MCP servers"
  ON mcp_servers FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Team admins can manage MCP servers"
  ON mcp_servers FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users
      WHERE id = auth.uid()
      AND (raw_user_meta_data->>'role' = 'admin')
    )
  );
```

### Table: `mcp_tools`
**Purpose:** Cache available tools from MCP servers (synced periodically)

```sql
CREATE TABLE mcp_tools (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,

  -- Tool information
  tool_name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB NOT NULL,
  /* Example input_schema:
    {
      "type": "object",
      "properties": {
        "workflow_id": { "type": "string", "description": "Workflow to trigger" },
        "parameters": { "type": "object" }
      },
      "required": ["workflow_id"]
    }
  */

  -- Tool configuration
  is_enabled BOOLEAN DEFAULT true,
  requires_confirmation BOOLEAN DEFAULT false,
  timeout_seconds INTEGER DEFAULT 30,

  -- Usage statistics
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER,
  last_executed_at TIMESTAMPTZ,

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_tool_per_server UNIQUE(server_id, tool_name)
);

-- Indexes
CREATE INDEX idx_mcp_tools_server_id ON mcp_tools(server_id);
CREATE INDEX idx_mcp_tools_is_enabled ON mcp_tools(is_enabled);

-- Row Level Security
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view tools from their team's servers"
  ON mcp_tools FOR SELECT
  TO authenticated
  USING (
    server_id IN (
      SELECT id FROM mcp_servers
      WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    )
  );
```

### Table: `mcp_tool_executions`
**Purpose:** Log all tool executions for analytics, debugging, and auditing

```sql
CREATE TABLE mcp_tool_executions (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who, what, when
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  tool_id UUID NOT NULL REFERENCES mcp_tools(id),
  server_id UUID NOT NULL REFERENCES mcp_servers(id),

  -- Execution details
  input_parameters JSONB NOT NULL,
  output_result JSONB,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'timeout')),

  -- Performance metrics
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Context tracking
  chat_id UUID REFERENCES astra_chats(id),
  message_id UUID REFERENCES group_messages(id),

  -- Metadata
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_mcp_executions_user_id ON mcp_tool_executions(user_id);
CREATE INDEX idx_mcp_executions_team_id ON mcp_tool_executions(team_id);
CREATE INDEX idx_mcp_executions_tool_id ON mcp_tool_executions(tool_id);
CREATE INDEX idx_mcp_executions_executed_at ON mcp_tool_executions(executed_at);
CREATE INDEX idx_mcp_executions_status ON mcp_tool_executions(status);

-- Row Level Security
ALTER TABLE mcp_tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team's executions"
  ON mcp_tool_executions FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view their own executions"
  ON mcp_tool_executions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### Table: `mcp_server_credentials`
**Purpose:** Securely store encrypted credentials (separate from main config)

```sql
CREATE TABLE mcp_server_credentials (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,

  -- Encrypted credentials
  credential_type TEXT NOT NULL CHECK (credential_type IN ('api_key', 'oauth_token', 'basic_auth', 'custom')),
  encrypted_value TEXT NOT NULL, -- Use Supabase Vault or pgcrypto

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_credential_per_server UNIQUE(server_id, credential_type)
);

-- Row Level Security (very restrictive - only service role)
ALTER TABLE mcp_server_credentials ENABLE ROW LEVEL SECURITY;

-- No policies for users - only accessible by service role
-- This ensures credentials are never exposed to clients
```

---

## 🔧 Supabase Edge Function Implementation

### File: `supabase/functions/mcp-client/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://esm.sh/@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "https://esm.sh/@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "https://esm.sh/@modelcontextprotocol/sdk/client/stdio.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MCPRequest {
  action: 'list_servers' | 'list_tools' | 'call_tool' | 'sync_tools';
  server_id?: string;
  tool_name?: string;
  parameters?: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // 2. Get user's team
    const teamId = user.user_metadata?.team_id;
    if (!teamId) {
      throw new Error("User not assigned to a team");
    }

    // 3. Parse request
    const body: MCPRequest = await req.json();

    // 4. Route to appropriate handler
    switch (body.action) {
      case 'list_servers':
        return await handleListServers(supabaseClient, teamId);

      case 'list_tools':
        return await handleListTools(supabaseClient, body.server_id!);

      case 'call_tool':
        return await handleCallTool(
          supabaseClient,
          user.id,
          teamId,
          body.server_id!,
          body.tool_name!,
          body.parameters || {}
        );

      case 'sync_tools':
        return await handleSyncTools(supabaseClient, body.server_id!);

      default:
        throw new Error("Invalid action");
    }

  } catch (error) {
    console.error("MCP Client Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Handler: List all MCP servers for team
async function handleListServers(supabaseClient: any, teamId: string) {
  const { data: servers, error } = await supabaseClient
    .from('mcp_servers')
    .select('id, name, description, server_type, is_active, last_connected_at, connection_status')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return new Response(
    JSON.stringify({ servers }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Handler: List all tools from a specific server
async function handleListTools(supabaseClient: any, serverId: string) {
  const { data: tools, error } = await supabaseClient
    .from('mcp_tools')
    .select('id, tool_name, description, input_schema, execution_count')
    .eq('server_id', serverId)
    .eq('is_enabled', true)
    .order('tool_name');

  if (error) throw error;

  return new Response(
    JSON.stringify({ tools }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Handler: Execute a tool
async function handleCallTool(
  supabaseClient: any,
  userId: string,
  teamId: string,
  serverId: string,
  toolName: string,
  parameters: Record<string, unknown>
) {
  const startTime = Date.now();
  let executionId: string | null = null;

  try {
    // 1. Get server configuration
    const { data: server, error: serverError } = await supabaseClient
      .from('mcp_servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      throw new Error("Server not found");
    }

    // 2. Get tool details
    const { data: tool, error: toolError } = await supabaseClient
      .from('mcp_tools')
      .select('*')
      .eq('server_id', serverId)
      .eq('tool_name', toolName)
      .single();

    if (toolError || !tool) {
      throw new Error("Tool not found");
    }

    // 3. Create execution log (pending)
    const { data: execution, error: execError } = await supabaseClient
      .from('mcp_tool_executions')
      .insert({
        user_id: userId,
        team_id: teamId,
        tool_id: tool.id,
        server_id: serverId,
        input_parameters: parameters,
        status: 'pending'
      })
      .select()
      .single();

    if (execError) throw execError;
    executionId = execution.id;

    // 4. Create MCP client and connect
    const client = await createMCPClient(server);

    // 5. Execute tool with timeout
    const timeoutMs = tool.timeout_seconds * 1000 || 30000;
    const result = await executeWithTimeout(
      client.callTool({ name: toolName, arguments: parameters }),
      timeoutMs
    );

    const duration = Date.now() - startTime;

    // 6. Update execution log (success)
    await supabaseClient
      .from('mcp_tool_executions')
      .update({
        output_result: result,
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: duration
      })
      .eq('id', executionId);

    // 7. Update tool statistics
    await supabaseClient.rpc('increment_tool_stats', {
      p_tool_id: tool.id,
      p_success: true,
      p_duration_ms: duration
    });

    return new Response(
      JSON.stringify({
        success: true,
        result,
        duration_ms: duration,
        execution_id: executionId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    // Update execution log (error)
    if (executionId) {
      await supabaseClient
        .from('mcp_tool_executions')
        .update({
          error_message: error.message,
          status: error.message.includes('timeout') ? 'timeout' : 'error',
          completed_at: new Date().toISOString(),
          duration_ms: duration
        })
        .eq('id', executionId);
    }

    throw error;
  }
}

// Handler: Sync tools from MCP server
async function handleSyncTools(supabaseClient: any, serverId: string) {
  try {
    // 1. Get server configuration
    const { data: server, error: serverError } = await supabaseClient
      .from('mcp_servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      throw new Error("Server not found");
    }

    // 2. Connect to MCP server
    const client = await createMCPClient(server);

    // 3. List available tools
    const { tools } = await client.listTools();

    // 4. Upsert tools to database
    const toolRecords = tools.map(tool => ({
      server_id: serverId,
      tool_name: tool.name,
      description: tool.description || null,
      input_schema: tool.inputSchema,
      synced_at: new Date().toISOString()
    }));

    for (const record of toolRecords) {
      await supabaseClient
        .from('mcp_tools')
        .upsert(record, {
          onConflict: 'server_id,tool_name'
        });
    }

    // 5. Update server status
    await supabaseClient
      .from('mcp_servers')
      .update({
        last_connected_at: new Date().toISOString(),
        connection_status: 'connected',
        last_error: null
      })
      .eq('id', serverId);

    return new Response(
      JSON.stringify({
        success: true,
        tools_synced: tools.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Update server status with error
    await supabaseClient
      .from('mcp_servers')
      .update({
        connection_status: 'error',
        last_error: error.message
      })
      .eq('id', serverId);

    throw error;
  }
}

// Utility: Create MCP client based on server type
async function createMCPClient(server: any): Promise<Client> {
  const client = new Client(
    {
      name: "astra-mcp-client",
      version: "1.0.0",
    },
    {
      capabilities: {}
    }
  );

  let transport;

  switch (server.server_type) {
    case 'sse':
      transport = new SSEClientTransport(
        new URL(server.config.url)
      );
      break;

    case 'stdio':
      transport = new StdioClientTransport({
        command: server.config.command,
        args: server.config.args || [],
        env: server.config.env || {}
      });
      break;

    case 'http':
      throw new Error("HTTP transport not yet implemented");

    default:
      throw new Error(`Unsupported server type: ${server.server_type}`);
  }

  await client.connect(transport);
  return client;
}

// Utility: Execute with timeout
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutHandle: number;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}
```

### Supporting Database Functions

```sql
-- Function to increment tool statistics atomically
CREATE OR REPLACE FUNCTION increment_tool_stats(
  p_tool_id UUID,
  p_success BOOLEAN,
  p_duration_ms INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE mcp_tools
  SET
    execution_count = execution_count + 1,
    success_count = success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    error_count = error_count + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    avg_duration_ms = COALESCE(
      (avg_duration_ms * execution_count + p_duration_ms) / (execution_count + 1),
      p_duration_ms
    ),
    last_executed_at = NOW()
  WHERE id = p_tool_id;
END;
$$;
```

---

## 🎨 Frontend Implementation

### 1. MCP Client Service

**File:** `src/lib/mcp-client.ts`

```typescript
import { supabase } from './supabase';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  server_type: 'stdio' | 'sse' | 'http';
  is_active: boolean;
  last_connected_at: string | null;
  connection_status: 'pending' | 'connected' | 'error' | 'disconnected';
}

export interface MCPTool {
  id: string;
  tool_name: string;
  description: string;
  input_schema: any;
  execution_count: number;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration_ms?: number;
  execution_id?: string;
}

class MCPClientService {
  private baseUrl: string;
  private cache: {
    servers?: MCPServer[];
    tools?: Map<string, MCPTool[]>;
    lastFetch?: number;
  } = {};

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-client`;
  }

  private async makeRequest(body: any): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'MCP request failed');
    }

    return response.json();
  }

  async listServers(forceRefresh = false): Promise<MCPServer[]> {
    // Cache for 5 minutes
    if (!forceRefresh && this.cache.servers && this.cache.lastFetch) {
      if (Date.now() - this.cache.lastFetch < 5 * 60 * 1000) {
        return this.cache.servers;
      }
    }

    const { servers } = await this.makeRequest({ action: 'list_servers' });
    this.cache.servers = servers;
    this.cache.lastFetch = Date.now();
    return servers;
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const { tools } = await this.makeRequest({
      action: 'list_tools',
      server_id: serverId
    });
    return tools;
  }

  async getAllTools(): Promise<Map<string, MCPTool[]>> {
    const servers = await this.listServers();
    const toolsMap = new Map<string, MCPTool[]>();

    await Promise.all(
      servers.map(async (server) => {
        const tools = await this.listTools(server.id);
        toolsMap.set(server.id, tools);
      })
    );

    return toolsMap;
  }

  async callTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    return this.makeRequest({
      action: 'call_tool',
      server_id: serverId,
      tool_name: toolName,
      parameters
    });
  }

  async syncTools(serverId: string): Promise<void> {
    await this.makeRequest({
      action: 'sync_tools',
      server_id: serverId
    });

    // Invalidate cache
    this.cache.servers = undefined;
    this.cache.lastFetch = undefined;
  }

  clearCache(): void {
    this.cache = {};
  }
}

export const mcpClient = new MCPClientService();
```

### 2. Team Settings - MCP Server Management

**File:** `src/components/MCPServerSettings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Server, RefreshCw, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { mcpClient, MCPServer } from '../lib/mcp-client';
import { AddMCPServerModal } from './AddMCPServerModal';

export const MCPServerSettings: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const data = await mcpClient.listServers(true);
      setServers(data);
    } catch (error) {
      console.error('Error loading MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (serverId: string) => {
    setSyncing(serverId);
    try {
      await mcpClient.syncTools(serverId);
      await loadServers();
    } catch (error) {
      console.error('Error syncing tools:', error);
      alert('Failed to sync tools. Please try again.');
    } finally {
      setSyncing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">MCP Servers</h3>
          <p className="text-sm text-gray-400 mt-1">
            Configure Model Context Protocol servers to extend AI capabilities
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Server</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
          <Server className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400 mb-2">No MCP servers configured</p>
          <p className="text-sm text-gray-500">
            Add an MCP server to enable tool access for your team
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    <h4 className="font-medium text-white">{server.name}</h4>
                    {getStatusIcon(server.connection_status)}
                  </div>

                  <p className="text-sm text-gray-400 mb-3">
                    {server.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-gray-600" />
                      <span>Type: {server.server_type}</span>
                    </span>
                    {server.last_connected_at && (
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-gray-600" />
                        <span>Last sync: {new Date(server.last_connected_at).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleSync(server.id)}
                    disabled={syncing === server.id}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                    title="Sync tools from server"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing === server.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                    title="Remove server"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddMCPServerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadServers();
          }}
        />
      )}
    </div>
  );
};
```

### 3. AI Integration - Tool Discovery & Execution

**File:** `src/lib/ai-tool-integration.ts`

```typescript
import { mcpClient } from './mcp-client';

export interface AIToolCall {
  server_id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
}

export class AIToolIntegration {
  // Parse AI message to detect tool calls
  static async parseToolCall(message: string): Promise<AIToolCall | null> {
    // This would integrate with your AI provider to detect tool calls
    // For now, this is a placeholder showing the structure

    // Example: AI might return structured JSON indicating a tool call
    // {"action": "call_tool", "server": "n8n", "tool": "trigger_workflow", "params": {...}}

    return null; // Would return parsed tool call
  }

  // Execute tool call and format result for AI
  static async executeTool(toolCall: AIToolCall): Promise<string> {
    try {
      const result = await mcpClient.callTool(
        toolCall.server_id,
        toolCall.tool_name,
        toolCall.parameters
      );

      if (result.success) {
        return `Tool executed successfully:\n${JSON.stringify(result.result, null, 2)}`;
      } else {
        return `Tool execution failed: ${result.error}`;
      }
    } catch (error: any) {
      return `Error executing tool: ${error.message}`;
    }
  }

  // Get tool context for AI prompt
  static async getToolContext(): Promise<string> {
    const servers = await mcpClient.listServers();
    const toolsMap = await mcpClient.getAllTools();

    let context = "Available MCP Tools:\n\n";

    for (const server of servers) {
      const tools = toolsMap.get(server.id) || [];
      context += `Server: ${server.name}\n`;
      context += `Description: ${server.description}\n`;
      context += `Tools:\n`;

      for (const tool of tools) {
        context += `  - ${tool.tool_name}: ${tool.description}\n`;
        context += `    Parameters: ${JSON.stringify(tool.input_schema)}\n`;
      }
      context += `\n`;
    }

    return context;
  }
}
```

---

## 📊 Analytics & Monitoring

### Analytics Dashboard Queries

```sql
-- Most used tools (last 30 days)
SELECT
  s.name as server_name,
  t.tool_name,
  t.description,
  COUNT(*) as execution_count,
  COUNT(*) FILTER (WHERE e.status = 'success') as success_count,
  COUNT(*) FILTER (WHERE e.status = 'error') as error_count,
  AVG(e.duration_ms)::INTEGER as avg_duration_ms,
  ROUND(COUNT(*) FILTER (WHERE e.status = 'success')::DECIMAL / COUNT(*) * 100, 1) as success_rate
FROM mcp_tool_executions e
JOIN mcp_tools t ON e.tool_id = t.id
JOIN mcp_servers s ON e.server_id = s.id
WHERE e.executed_at > NOW() - INTERVAL '30 days'
GROUP BY s.id, s.name, t.id, t.tool_name, t.description
ORDER BY execution_count DESC
LIMIT 20;

-- Tool usage by team
SELECT
  tm.name as team_name,
  COUNT(DISTINCT e.user_id) as unique_users,
  COUNT(*) as total_executions,
  COUNT(DISTINCT e.tool_id) as unique_tools_used,
  AVG(e.duration_ms)::INTEGER as avg_duration_ms
FROM mcp_tool_executions e
JOIN teams tm ON e.team_id = tm.id
WHERE e.executed_at > NOW() - INTERVAL '30 days'
GROUP BY tm.id, tm.name
ORDER BY total_executions DESC;

-- Daily usage trends
SELECT
  DATE(executed_at) as date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  COUNT(*) FILTER (WHERE status = 'timeout') as timeouts,
  AVG(duration_ms)::INTEGER as avg_duration_ms
FROM mcp_tool_executions
WHERE executed_at > NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- User activity
SELECT
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  COUNT(*) as executions,
  COUNT(DISTINCT e.tool_id) as unique_tools,
  MAX(e.executed_at) as last_execution
FROM mcp_tool_executions e
JOIN auth.users u ON e.user_id = u.id
WHERE e.executed_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email, full_name
ORDER BY executions DESC
LIMIT 10;

-- Error analysis
SELECT
  t.tool_name,
  s.name as server_name,
  e.error_message,
  COUNT(*) as occurrence_count,
  MAX(e.executed_at) as last_occurrence
FROM mcp_tool_executions e
JOIN mcp_tools t ON e.tool_id = t.id
JOIN mcp_servers s ON e.server_id = s.id
WHERE e.status = 'error'
  AND e.executed_at > NOW() - INTERVAL '7 days'
GROUP BY t.tool_name, s.name, e.error_message
ORDER BY occurrence_count DESC
LIMIT 20;
```

---

## 🎯 Real-World Use Cases

### Use Case 1: n8n Workflow Integration

**Scenario:** User wants to trigger a customer onboarding workflow

**Configuration:**
```json
{
  "name": "n8n Production Workflows",
  "server_type": "http",
  "config": {
    "url": "https://n8n.example.com/mcp",
    "auth": {
      "type": "api_key",
      "header": "X-N8N-API-Key"
    }
  }
}
```

**Conversation Flow:**
```
User: "Trigger the customer onboarding workflow for john@example.com"

Astra: [Detects tool call needed]
       [Calls MCP tool: n8n_trigger_workflow]

       Parameters: {
         "workflow_name": "customer_onboarding",
         "email": "john@example.com"
       }

Result: {
  "execution_id": "exec_abc123",
  "status": "running",
  "workflow_id": "workflow_456"
}

Astra: "I've triggered the customer onboarding workflow for john@example.com.
        Workflow execution ID: exec_abc123
        Status: Running

        You can track progress in your n8n dashboard."
```

### Use Case 2: Database Queries

**Scenario:** User asks for business metrics

**Configuration:**
```json
{
  "name": "Analytics Database",
  "server_type": "sse",
  "config": {
    "url": "https://mcp-db.example.com",
    "auth": {
      "type": "basic_auth"
    }
  }
}
```

**Conversation Flow:**
```
User: "What were our top 10 customers by revenue last month?"

Astra: [Detects data query needed]
       [Calls MCP tool: database_query]

       Parameters: {
         "query": "SELECT customer_name, SUM(revenue) as total_revenue
                   FROM sales
                   WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                     AND sale_date < DATE_TRUNC('month', CURRENT_DATE)
                   GROUP BY customer_name
                   ORDER BY total_revenue DESC
                   LIMIT 10"
       }

Result: [
  {"customer_name": "Acme Corp", "total_revenue": 125000},
  {"customer_name": "Tech Solutions", "total_revenue": 98000},
  ...
]

Astra: "Here are your top 10 customers by revenue last month:

        1. Acme Corp: $125,000
        2. Tech Solutions: $98,000
        3. Global Industries: $87,500
        ...

        Total revenue from top 10: $687,500"
```

### Use Case 3: File System Operations

**Scenario:** User needs to find specific documentation

**Configuration:**
```json
{
  "name": "Company Documentation",
  "server_type": "stdio",
  "config": {
    "command": "node",
    "args": ["mcp-filesystem-server.js"],
    "env": {
      "ROOT_PATH": "/company/docs"
    }
  }
}
```

**Conversation Flow:**
```
User: "Find all policy documents updated in the last week"

Astra: [Detects file search needed]
       [Calls MCP tool: filesystem_search]

       Parameters: {
         "path": "/policies",
         "pattern": "*.pdf",
         "modified_after": "2024-11-13T00:00:00Z"
       }

Result: [
  {"path": "/policies/remote_work_policy_v2.pdf", "modified": "2024-11-18"},
  {"path": "/policies/expense_policy_updated.pdf", "modified": "2024-11-15"}
]

Astra: "I found 2 policy documents updated in the last week:

        1. Remote Work Policy v2
           Updated: November 18, 2024
           Path: /policies/remote_work_policy_v2.pdf

        2. Expense Policy (Updated)
           Updated: November 15, 2024
           Path: /policies/expense_policy_updated.pdf"
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Core infrastructure and basic functionality

#### Week 1: Database & Backend
- [ ] Create database schema (tables, RLS policies, indexes)
- [ ] Implement supporting database functions
- [ ] Set up credential encryption system
- [ ] Create basic edge function structure

#### Week 2: Edge Function Core
- [ ] Implement server listing functionality
- [ ] Implement tool listing functionality
- [ ] Add SSE transport support
- [ ] Add basic error handling and logging

**Deliverable:** Backend can list servers and tools

---

### Phase 2: Tool Execution (Weeks 3-4)
**Goal:** Execute tools and handle results

#### Week 3: Execution Engine
- [ ] Implement tool execution logic
- [ ] Add timeout handling
- [ ] Create execution logging system
- [ ] Add retry logic for transient failures

#### Week 4: Frontend Integration
- [ ] Create `mcp-client.ts` service
- [ ] Build Team Settings UI for MCP servers
- [ ] Add tool sync functionality
- [ ] Implement error display and user feedback

**Deliverable:** Users can execute MCP tools through UI

---

### Phase 3: AI Integration (Weeks 5-6)
**Goal:** Seamless AI-driven tool usage

#### Week 5: AI Tool Discovery
- [ ] Implement tool context generation for AI prompts
- [ ] Add tool call detection in AI responses
- [ ] Create tool execution wrapper for AI
- [ ] Build tool result formatting for AI understanding

#### Week 6: Conversational UX
- [ ] Add tool execution status in chat
- [ ] Implement loading states for long-running tools
- [ ] Create tool result visualization in chat
- [ ] Add user confirmation for sensitive operations

**Deliverable:** AI can discover and use tools conversationally

---

### Phase 4: Advanced Features (Weeks 7-8)
**Goal:** Production-ready with monitoring

#### Week 7: Analytics & Monitoring
- [ ] Build analytics dashboard
- [ ] Implement real-time execution monitoring
- [ ] Add performance tracking
- [ ] Create error aggregation and alerting

#### Week 8: Polish & Optimization
- [ ] Add connection pooling for MCP clients
- [ ] Implement caching strategies
- [ ] Optimize database queries
- [ ] Add comprehensive error messages

**Deliverable:** Production-ready MCP platform

---

### Phase 5: Testing & Documentation (Weeks 9-10)
**Goal:** Ensure reliability and usability

#### Week 9: Testing
- [ ] Unit tests for edge function
- [ ] Integration tests for tool execution
- [ ] Load testing for concurrent executions
- [ ] Security testing (penetration testing)

#### Week 10: Documentation & Launch
- [ ] Write user documentation
- [ ] Create admin setup guides
- [ ] Build video tutorials
- [ ] Soft launch to beta users

**Deliverable:** Public launch of MCP features

---

## 🔒 Security Considerations

### Credential Management
- **Never expose credentials to client**: All credentials stored server-side only
- **Encryption at rest**: Use Supabase Vault or pgcrypto for credential encryption
- **Encryption in transit**: All MCP communication over HTTPS/TLS
- **Principle of least privilege**: Service role only for credential access

### Access Control
- **Team isolation**: RLS policies ensure teams can only access their servers
- **Role-based permissions**: Admin-only configuration, user execution
- **Audit logging**: All tool executions logged with user attribution
- **Rate limiting**: Prevent abuse with per-user/per-team rate limits

### Input Validation
- **Parameter validation**: Validate all tool parameters against schemas
- **SQL injection prevention**: Use parameterized queries
- **Command injection prevention**: Sanitize all inputs to MCP servers
- **Output sanitization**: Sanitize tool results before display

### Monitoring & Alerting
- **Anomaly detection**: Alert on unusual execution patterns
- **Error tracking**: Monitor and alert on error spikes
- **Performance monitoring**: Track and alert on slow executions
- **Security events**: Alert on failed auth attempts, suspicious patterns

---

## ⚠️ Challenges & Solutions

### Challenge 1: Long-Running Operations
**Problem:** Some MCP tools may take minutes to complete, blocking the user

**Solutions:**
1. **Async Execution with Callbacks**
   - Implement webhook-based async tool execution
   - Return execution ID immediately
   - Send notification when complete

2. **Progress Updates**
   - Real-time progress via WebSocket/Realtime
   - Show estimated completion time
   - Allow cancellation

3. **Background Jobs**
   - Queue long-running tasks
   - Process in background workers
   - Notify user on completion

**Implementation Priority:** Phase 4 (Advanced Features)

---

### Challenge 2: Server Availability & Reliability
**Problem:** MCP servers may be unavailable or slow

**Solutions:**
1. **Health Checks**
   - Periodic health check pings
   - Update server status in database
   - Disable unhealthy servers automatically

2. **Retry Logic**
   - Exponential backoff for transient failures
   - Circuit breaker pattern
   - Fallback to cached results when appropriate

3. **Redundancy**
   - Support multiple servers for same tool type
   - Automatic failover to backup servers
   - Load balancing across servers

**Implementation Priority:** Phase 4 (Advanced Features)

---

### Challenge 3: Cost Management
**Problem:** Edge function invocations and duration could get expensive

**Solutions:**
1. **Rate Limiting**
   - Per-user limits (e.g., 100 executions/day)
   - Per-team limits based on plan
   - Throttle expensive operations

2. **Caching**
   - Cache tool definitions (5-minute TTL)
   - Cache deterministic tool results
   - Implement cache invalidation strategy

3. **Resource Optimization**
   - Connection pooling for MCP clients
   - Batch operations when possible
   - Optimize database queries

**Implementation Priority:** Phase 3 (Core Development)

---

### Challenge 4: Tool Discovery & AI Understanding
**Problem:** AI needs to understand when and how to use tools

**Solutions:**
1. **Rich Tool Descriptions**
   - Require detailed descriptions in MCP tool definitions
   - Include examples in tool schemas
   - Provide context about tool purpose

2. **AI Prompt Engineering**
   - Include tool context in system prompts
   - Format tool schemas for AI understanding
   - Provide usage examples to AI

3. **User Feedback Loop**
   - Track successful vs failed tool calls
   - Learn from user corrections
   - Improve tool discovery over time

**Implementation Priority:** Phase 3 (AI Integration)

---

## 📈 Success Metrics

### Usage Metrics
- **Tool Executions per Day**: Target 1000+ executions/day after 3 months
- **Unique Users Using Tools**: Target 70% of active users
- **Average Tools per User**: Target 5+ different tools used
- **Tool Success Rate**: Target >95% successful executions

### Performance Metrics
- **Average Execution Time**: Target <2 seconds for 90th percentile
- **Edge Function Cold Start**: Target <500ms
- **Database Query Time**: Target <100ms for all queries
- **End-to-End Latency**: Target <3 seconds for complete tool execution

### Business Metrics
- **Team Adoption Rate**: Target 80% of teams configure at least 1 server
- **Feature Retention**: Target 60% of users return to use tools within 7 days
- **Admin Satisfaction**: Target 4.5/5 stars for configuration ease
- **Cost per Execution**: Target <$0.01 per tool execution

---

## 🎯 Why This Architecture is Superior

### vs. Browser Extension Approach

| Aspect | Browser Extension | Backend MCP Client |
|--------|------------------|-------------------|
| **Platform Support** | Desktop Chrome only | Any browser, any device |
| **Setup Complexity** | Each user installs + configures | Team admin configures once |
| **Mobile Support** | ❌ Not possible | ✅ Full support |
| **Security** | Client-side credentials | Server-side encrypted credentials |
| **Reliability** | Depends on user's machine | Cloud infrastructure (99.9% uptime) |
| **Maintenance** | Update extension for each user | Deploy once, all users updated |
| **Monitoring** | ❌ No visibility | ✅ Full analytics and logging |
| **Team Collaboration** | Manual sharing per user | Automatic team-wide access |
| **Cost** | Per-seat licensing | Cloud infrastructure costs |

---

## 💡 Future Enhancements

### Phase 6+: Advanced Capabilities

#### Multi-Step Workflows
- Chain multiple tool calls together
- Conditional logic based on tool results
- Loop and retry patterns
- Save and replay workflows

#### Custom Tool Builder
- Visual tool builder for non-technical users
- Template library for common patterns
- Test and debug tools before deployment
- Version control for tool definitions

#### Marketplace
- Public marketplace for MCP servers
- Community-contributed tools
- Rating and review system
- One-click installation

#### Enterprise Features
- SSO integration for MCP servers
- Advanced RBAC for tool access
- Compliance logging and reporting
- SLA monitoring and guarantees

#### AI-Powered Optimization
- Learn optimal tool selection from usage
- Suggest tool chaining patterns
- Predict tool execution times
- Auto-scale based on demand

---

## 📚 Documentation Requirements

### User Documentation
1. **Getting Started Guide**
   - What is MCP and why it matters
   - How to use tools in conversations
   - Example use cases

2. **Tool Reference**
   - Complete list of available tools
   - Parameter documentation
   - Example requests and responses

3. **Troubleshooting Guide**
   - Common errors and solutions
   - Performance optimization tips
   - How to report issues

### Admin Documentation
1. **Setup Guide**
   - How to add MCP servers
   - Configuration best practices
   - Security recommendations

2. **Server Management**
   - Monitoring server health
   - Syncing tools
   - Managing credentials

3. **Analytics Dashboard**
   - Understanding metrics
   - Identifying optimization opportunities
   - Exporting data

### Developer Documentation
1. **Architecture Overview**
   - System design
   - Data flow
   - Security model

2. **API Reference**
   - Edge function endpoints
   - Request/response formats
   - Error codes

3. **Integration Guide**
   - Creating custom MCP servers
   - Best practices
   - Testing strategies

---

## 🎬 Conclusion

This MCP Backend Client Architecture transforms Astra Intelligence into a powerful, extensible AI platform that can connect to any data source or tool through the Model Context Protocol. By implementing this backend-first approach, we deliver:

✅ **Universal Access** - Works on any device, any browser
✅ **Team Efficiency** - Configure once, benefit team-wide
✅ **Enterprise Security** - Server-side credential management
✅ **Scalable Architecture** - Cloud-native, production-ready
✅ **Rich Analytics** - Complete visibility into tool usage

The roadmap is aggressive but achievable with focused development across 10 weeks, delivering a game-changing feature that sets Astra apart from competitors and provides genuine value to users.

**Next Steps:**
1. Review and approve this architecture document
2. Prioritize which MCP servers to support first (recommend starting with n8n)
3. Allocate development resources
4. Begin Phase 1 implementation

---

---

## Implementation Plan

This architecture document covers the MCP-specific backend client implementation (Phase 4 of the broader strategy). For the complete, customer-demand-driven integration strategy that sequences this work alongside native OAuth extensions, n8n bridge integrations, the Integration Registry, and the API Wizard, see **[MCP_DATA_CONNECTION_STRATEGY.md](./MCP_DATA_CONNECTION_STRATEGY.md)**.

---

**Document Version:** 1.1
**Last Updated:** 2026-02-06
**Status:** Architecture Approved -- Phase 4 of MCP_DATA_CONNECTION_STRATEGY.md
**Estimated Effort:** 10 weeks (2 developers)
**Priority:** High Impact, Medium Urgency
