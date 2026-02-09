import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const N8N_API_URL =
  Deno.env.get("N8N_URL") || "https://healthrocket.app.n8n.cloud";
const N8N_API_KEY = Deno.env.get("N8N_API_KEY") || "";
const N8N_WEBHOOK_BASE = `${N8N_API_URL}/webhook`;

interface MCPRequest {
  action:
    | "list_servers"
    | "list_tools"
    | "execute_tool"
    | "sync_tools"
    | "health_check";
  server_id?: string;
  tool_id?: string;
  tool_name?: string;
  input_params?: Record<string, unknown>;
  conversation_id?: string;
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function handleListServers(teamId: string) {
  const supabase = createServiceClient();

  const { data: servers, error } = await supabase
    .from("mcp_servers")
    .select("id, name, slug, server_type, description, status, health_status, tools_count, capabilities, last_health_check_at, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list servers: ${error.message}`);

  return { servers: servers || [] };
}

async function handleListTools(teamId: string, serverId?: string) {
  const supabase = createServiceClient();

  let query = supabase
    .from("mcp_tools")
    .select("id, tool_name, display_name, description, input_schema, output_schema, category, is_enabled, is_read_only, requires_approval, usage_count, last_used_at, avg_execution_ms, server_id, mcp_servers(name, server_type, status)")
    .eq("team_id", teamId)
    .eq("is_enabled", true);

  if (serverId) {
    query = query.eq("server_id", serverId);
  }

  const { data: tools, error } = await query.order("display_name", { ascending: true });

  if (error) throw new Error(`Failed to list tools: ${error.message}`);

  return { tools: tools || [] };
}

async function handleExecuteTool(
  userId: string,
  teamId: string,
  toolId: string | undefined,
  toolName: string | undefined,
  inputParams: Record<string, unknown>,
  conversationId?: string
) {
  const supabase = createServiceClient();

  let toolQuery = supabase
    .from("mcp_tools")
    .select("*, mcp_servers(*)");

  if (toolId) {
    toolQuery = toolQuery.eq("id", toolId);
  } else if (toolName) {
    toolQuery = toolQuery.eq("tool_name", toolName).eq("team_id", teamId);
  } else {
    throw new Error("Either tool_id or tool_name is required");
  }

  const { data: tool, error: toolError } = await toolQuery.maybeSingle();

  if (toolError || !tool) {
    throw new Error(`Tool not found: ${toolError?.message || "No matching tool"}`);
  }

  if (!tool.is_enabled) {
    throw new Error("This tool is currently disabled");
  }

  if (tool.requires_approval) {
    throw new Error("This tool requires admin approval before execution");
  }

  const server = tool.mcp_servers as any;
  if (!server || server.status !== "active") {
    throw new Error("The server providing this tool is not active");
  }

  const { data: execution } = await supabase
    .from("mcp_tool_executions")
    .insert({
      tool_id: tool.id,
      server_id: tool.server_id,
      user_id: userId,
      team_id: teamId,
      input_params: inputParams,
      status: "running",
      triggered_by: "agent_auto",
      conversation_id: conversationId,
    })
    .select("id")
    .single();

  const executionId = execution?.id;
  const startTime = Date.now();

  try {
    let result: unknown;

    if (server.server_type === "n8n") {
      result = await executeN8nTool(tool, server, inputParams);
    } else if (server.server_type === "custom_api") {
      result = await executeCustomApiTool(tool, server, inputParams);
    } else {
      throw new Error(`Unsupported server type: ${server.server_type}`);
    }

    const executionTimeMs = Date.now() - startTime;

    if (executionId) {
      await supabase
        .from("mcp_tool_executions")
        .update({
          status: "success",
          output_result: typeof result === "object" ? result : { data: result },
          execution_time_ms: executionTimeMs,
        })
        .eq("id", executionId);
    }

    return {
      success: true,
      execution_id: executionId,
      result,
      execution_time_ms: executionTimeMs,
    };
  } catch (execError) {
    const executionTimeMs = Date.now() - startTime;

    if (executionId) {
      await supabase
        .from("mcp_tool_executions")
        .update({
          status: "error",
          error_message: (execError as Error).message,
          execution_time_ms: executionTimeMs,
        })
        .eq("id", executionId);
    }

    throw execError;
  }
}

async function executeN8nTool(
  tool: any,
  server: any,
  inputParams: Record<string, unknown>
): Promise<unknown> {
  const webhookPath =
    tool.input_schema?.webhook_path ||
    server.metadata?.webhook_base_path;

  if (webhookPath) {
    const webhookUrl = `${N8N_WEBHOOK_BASE}/${webhookPath}`;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook error (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { data: text };
    }
  }

  const workflowId = tool.input_schema?.n8n_workflow_id || server.metadata?.workflow_id;
  if (!workflowId) {
    throw new Error("No webhook path or workflow ID configured for this n8n tool");
  }

  const activateUrl = `${N8N_API_URL}/api/v1/workflows/${workflowId}/execute`;
  const response = await fetch(activateUrl, {
    method: "POST",
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: inputParams }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n execution error (${response.status}): ${errorText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { data: text };
  }
}

async function executeCustomApiTool(
  tool: any,
  server: any,
  inputParams: Record<string, unknown>
): Promise<unknown> {
  const baseUrl = server.server_url || server.metadata?.base_url;
  if (!baseUrl) {
    throw new Error("No base URL configured for this custom API server");
  }

  let path = tool.input_schema?.path || "";
  for (const [key, value] of Object.entries(inputParams)) {
    path = path.replace(`{${key}}`, String(value));
  }

  const fullUrl = `${baseUrl}${path}`;
  const method = tool.input_schema?.http_method || "GET";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (server.auth_type === "api_key") {
    const apiKey = server.auth_config?.api_key;
    const headerName = server.auth_config?.header_name || "Authorization";
    const prefix = server.auth_config?.prefix || "Bearer";
    if (apiKey) {
      headers[headerName] = `${prefix} ${apiKey}`;
    }
  } else if (server.auth_type === "bearer_token") {
    const token = server.auth_config?.token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    const bodyParams = { ...inputParams };
    delete bodyParams.path;
    fetchOptions.body = JSON.stringify(bodyParams);
  }

  const response = await fetch(fullUrl, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { data: text };
  }
}

async function handleSyncTools(teamId: string, serverId: string) {
  const supabase = createServiceClient();

  const { data: server, error: serverError } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("id", serverId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (serverError || !server) {
    throw new Error(`Server not found: ${serverError?.message || "No matching server"}`);
  }

  if (server.server_type === "n8n") {
    return await syncN8nWorkflows(supabase, server, teamId);
  }

  throw new Error(`Tool sync not supported for server type: ${server.server_type}`);
}

async function syncN8nWorkflows(supabase: any, server: any, teamId: string) {
  const n8nApiUrl = server.metadata?.api_url || N8N_API_URL;
  const apiKey = server.auth_config?.api_key || N8N_API_KEY;

  const response = await fetch(`${n8nApiUrl}/api/v1/workflows?active=true`, {
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch n8n workflows: ${response.status}`);
  }

  const result = await response.json();
  const workflows = result.data || result || [];

  let synced = 0;
  let skipped = 0;

  for (const workflow of workflows) {
    const toolName = `n8n_${workflow.id}`;
    const displayName = workflow.name || `Workflow ${workflow.id}`;

    const isQuery = displayName.toLowerCase().includes("query");
    const isSync = displayName.toLowerCase().includes("sync");

    let category = "automation";
    if (displayName.toLowerCase().includes("financial") || displayName.toLowerCase().includes("quickbooks") || displayName.toLowerCase().includes("xero") || displayName.toLowerCase().includes("stripe")) {
      category = "finance";
    } else if (displayName.toLowerCase().includes("crm") || displayName.toLowerCase().includes("hubspot") || displayName.toLowerCase().includes("salesforce") || displayName.toLowerCase().includes("gohighlevel")) {
      category = "crm";
    } else if (displayName.toLowerCase().includes("slack") || displayName.toLowerCase().includes("communication")) {
      category = "communication";
    } else if (displayName.toLowerCase().includes("notion") || displayName.toLowerCase().includes("asana") || displayName.toLowerCase().includes("monday") || displayName.toLowerCase().includes("trello")) {
      category = "project_management";
    } else if (displayName.toLowerCase().includes("fireflies") || displayName.toLowerCase().includes("transcript")) {
      category = "transcription";
    } else if (displayName.toLowerCase().includes("mailchimp") || displayName.toLowerCase().includes("marketing")) {
      category = "marketing";
    }

    const webhookNodes = (workflow.nodes || []).filter(
      (n: any) => n.type === "n8n-nodes-base.webhook"
    );
    const webhookPath = webhookNodes.length > 0
      ? webhookNodes[0].parameters?.path
      : null;

    const { error: upsertError } = await supabase
      .from("mcp_tools")
      .upsert(
        {
          server_id: server.id,
          team_id: teamId,
          tool_name: toolName,
          display_name: displayName,
          description: `n8n workflow: ${displayName}. ${isQuery ? "Queries data from connected service." : isSync ? "Syncs data from connected service." : "Automated workflow."}`,
          input_schema: {
            type: "object",
            n8n_workflow_id: workflow.id,
            webhook_path: webhookPath,
            is_query: isQuery,
            is_sync: isSync,
          },
          category,
          is_read_only: isQuery || !isSync,
          is_enabled: true,
          requires_approval: !isQuery,
        },
        { onConflict: "server_id,tool_name" }
      );

    if (upsertError) {
      console.error(`Failed to sync tool ${toolName}:`, upsertError);
      skipped++;
    } else {
      synced++;
    }
  }

  await supabase
    .from("mcp_servers")
    .update({
      tools_count: synced,
      last_health_check_at: new Date().toISOString(),
      health_status: "healthy",
      updated_at: new Date().toISOString(),
    })
    .eq("id", server.id);

  return {
    synced,
    skipped,
    total_workflows: workflows.length,
    server_id: server.id,
  };
}

async function handleHealthCheck(teamId: string, serverId: string) {
  const supabase = createServiceClient();

  const { data: server } = await supabase
    .from("mcp_servers")
    .select("*")
    .eq("id", serverId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!server) throw new Error("Server not found");

  let healthStatus = "unreachable";

  if (server.server_type === "n8n") {
    try {
      const apiUrl = server.metadata?.api_url || N8N_API_URL;
      const apiKey = server.auth_config?.api_key || N8N_API_KEY;

      const response = await fetch(`${apiUrl}/api/v1/workflows?limit=1`, {
        headers: { "X-N8N-API-KEY": apiKey },
      });

      healthStatus = response.ok ? "healthy" : "degraded";
    } catch {
      healthStatus = "unreachable";
    }
  } else if (server.server_type === "custom_api") {
    try {
      const baseUrl = server.server_url || server.metadata?.base_url;
      if (baseUrl) {
        const response = await fetch(baseUrl, { method: "HEAD" });
        healthStatus = response.ok ? "healthy" : "degraded";
      }
    } catch {
      healthStatus = "unreachable";
    }
  }

  await supabase
    .from("mcp_servers")
    .update({
      health_status: healthStatus,
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", server.id);

  return { server_id: serverId, health_status: healthStatus };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createUserClient(authHeader);
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = user.user_metadata?.team_id;
    if (!teamId) {
      return new Response(
        JSON.stringify({ error: "No team associated with user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: MCPRequest = await req.json();

    let result: unknown;

    switch (body.action) {
      case "list_servers":
        result = await handleListServers(teamId);
        break;

      case "list_tools":
        result = await handleListTools(teamId, body.server_id);
        break;

      case "execute_tool":
        result = await handleExecuteTool(
          user.id,
          teamId,
          body.tool_id,
          body.tool_name,
          body.input_params || {},
          body.conversation_id
        );
        break;

      case "sync_tools":
        if (!body.server_id) throw new Error("server_id is required for sync_tools");
        result = await handleSyncTools(teamId, body.server_id);
        break;

      case "health_check":
        if (!body.server_id) throw new Error("server_id is required for health_check");
        result = await handleHealthCheck(teamId, body.server_id);
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in mcp-client:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
