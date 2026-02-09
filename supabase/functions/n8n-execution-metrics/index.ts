import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface N8NExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: string;
  retryOf?: string;
  retrySuccessId?: string;
}

interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchExecutionDetail(n8nUrl: string, n8nApiKey: string, executionId: string): Promise<any> {
  try {
    const response = await fetch(`${n8nUrl}/api/v1/executions/${executionId}`, {
      headers: { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`Error fetching execution ${executionId}:`, err);
    return null;
  }
}

async function fetchAllExecutions(n8nUrl: string, n8nApiKey: string, maxPages: number = 10): Promise<N8NExecution[]> {
  const allExecutions: N8NExecution[] = [];
  let cursor: string | null = null;
  let page = 0;

  while (page < maxPages) {
    const url = cursor
      ? `${n8nUrl}/api/v1/executions?limit=250&cursor=${cursor}`
      : `${n8nUrl}/api/v1/executions?limit=250`;

    console.log(`Fetching executions page ${page + 1}:`, url);

    try {
      const response = await fetch(url, {
        headers: { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error(`Failed to fetch executions page ${page + 1}:`, response.status);
        break;
      }

      const data = await response.json();
      const executions = data.data || [];

      console.log(`Page ${page + 1}: fetched ${executions.length} executions`);
      allExecutions.push(...executions);

      cursor = data.nextCursor;
      if (!cursor || executions.length < 250) {
        console.log('No more pages to fetch');
        break;
      }

      page++;
    } catch (err) {
      console.error(`Error fetching page ${page + 1}:`, err);
      break;
    }
  }

  console.log(`Total executions fetched: ${allExecutions.length}`);
  return allExecutions;
}

function extractErrorMessage(detail: any): string {
  if (!detail) return 'Failed to fetch details';

  console.log('Extracting error from detail keys:', Object.keys(detail));

  // n8n API v1 returns error directly on execution object
  if (detail.error?.message) {
    return detail.error.message;
  }

  // Check stoppedAt with no data - indicates crash
  if (detail.stoppedAt && !detail.data) {
    return 'Workflow crashed or timed out';
  }

  // Check data.resultData.error (workflow-level error)
  if (detail.data?.resultData?.error) {
    const err = detail.data.resultData.error;
    console.log('Found data.resultData.error:', JSON.stringify(err).substring(0, 300));
    if (err.message) return err.message;
    if (err.description) return err.description;
    if (typeof err === 'string') return err;
  }

  // Check node-level errors in runData
  if (detail.data?.resultData?.runData) {
    const runData = detail.data.resultData.runData;
    for (const nodeName of Object.keys(runData)) {
      const nodeRuns = runData[nodeName];
      if (Array.isArray(nodeRuns)) {
        for (const run of nodeRuns) {
          if (run.error) {
            console.log(`Found node error in ${nodeName}:`, JSON.stringify(run.error).substring(0, 200));
            const nodePart = nodeName.length > 30 ? nodeName.substring(0, 30) + '...' : nodeName;
            const errMsg = run.error.message || run.error.description || JSON.stringify(run.error);
            return `[${nodePart}] ${errMsg}`;
          }
        }
      }
    }
  }

  // Check executionData (alternative structure for older n8n versions)
  if (detail.executionData?.resultData?.error) {
    const err = detail.executionData.resultData.error;
    if (err.message) return err.message;
    if (err.description) return err.description;
  }

  // Check for node errors in executionData
  if (detail.executionData?.resultData?.runData) {
    const runData = detail.executionData.resultData.runData;
    for (const nodeName of Object.keys(runData)) {
      const nodeRuns = runData[nodeName];
      if (Array.isArray(nodeRuns)) {
        for (const run of nodeRuns) {
          if (run.error) {
            const nodePart = nodeName.length > 30 ? nodeName.substring(0, 30) + '...' : nodeName;
            const errMsg = run.error.message || run.error.description || 'Node error';
            return `[${nodePart}] ${errMsg}`;
          }
        }
      }
    }
  }

  // Check lastNodeExecuted for clues
  const lastNode = detail.data?.resultData?.lastNodeExecuted || detail.executionData?.resultData?.lastNodeExecuted;
  if (lastNode) {
    return `Failed at node: ${lastNode}`;
  }

  // Log full structure for debugging
  console.log('Could not extract error, full detail structure:', JSON.stringify(detail).substring(0, 1000));

  return 'Unknown error';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const superAdminEmails = ['clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai'];
    if (!user.email || !superAdminEmails.includes(user.email)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const n8nUrl = Deno.env.get('N8N_URL');
    const n8nApiKey = Deno.env.get('N8N_API_KEY');

    console.log('N8N_URL:', n8nUrl);
    console.log('N8N_API_KEY configured:', !!n8nApiKey, 'length:', n8nApiKey?.length);

    if (!n8nUrl || !n8nApiKey) {
      return new Response(
        JSON.stringify({ error: 'N8N not configured', details: { hasUrl: !!n8nUrl, hasKey: !!n8nApiKey } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const syncData = url.searchParams.get('sync') === 'true';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch workflows first
    console.log('Fetching workflows from:', `${n8nUrl}/api/v1/workflows`);
    const workflowsResponse = await fetch(`${n8nUrl}/api/v1/workflows?limit=250`, {
      headers: { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json' }
    });

    if (!workflowsResponse.ok) {
      const errorText = await workflowsResponse.text();
      console.error('Failed to fetch workflows:', workflowsResponse.status, errorText);
      throw new Error(`Failed to fetch workflows: ${workflowsResponse.status}`);
    }

    const workflowsData = await workflowsResponse.json();
    const workflows: N8NWorkflow[] = workflowsData.data || [];
    console.log('Workflows fetched:', workflows.length);

    const workflowMap = new Map<string, string>();
    workflows.forEach(w => workflowMap.set(w.id, w.name));

    // Fetch all executions with pagination (up to 40 pages = 10,000 executions)
    const allExecutions = await fetchAllExecutions(n8nUrl, n8nApiKey, 40);
    console.log(`Total executions loaded: ${allExecutions.length}`);

    // Filter out "Error Workflow" executions from all stats and displays
    const recentExecutions = allExecutions.filter(exec => {
      const workflowName = workflowMap.get(exec.workflowId) || '';
      return workflowName !== 'Error Workflow';
    });
    console.log(`Executions after filtering out Error Workflow: ${recentExecutions.length}`);

    let highestExecutionId = 0;
    recentExecutions.forEach(exec => {
      const execId = parseInt(exec.id, 10);
      if (!isNaN(execId) && execId > highestExecutionId) {
        highestExecutionId = execId;
      }
    });

    const { data: dbStats } = await supabaseAdmin
      .from('workflow_executions')
      .select('execution_id')
      .order('execution_id', { ascending: false })
      .limit(1);
    
    const dbHighestId = dbStats?.[0]?.execution_id ? parseInt(dbStats[0].execution_id, 10) : 0;
    const totalExecutionsEstimate = Math.max(highestExecutionId, dbHighestId);

    // Get failed executions with error details
    const failedExecs = recentExecutions.filter(e => e.status !== 'success').slice(0, 20);

    const failedWithDetails = await Promise.all(
      failedExecs.map(async (exec) => {
        const detail = await fetchExecutionDetail(n8nUrl, n8nApiKey, exec.id);
        const errorMessage = extractErrorMessage(detail);
        return {
          id: exec.id,
          workflowId: exec.workflowId,
          workflowName: workflowMap.get(exec.workflowId) || 'Unknown',
          startedAt: exec.startedAt,
          stoppedAt: exec.stoppedAt,
          status: exec.status,
          errorMessage: errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage
        };
      })
    );

    // Sync to database if requested
    if (syncData && recentExecutions.length > 0) {
      console.log('Syncing', recentExecutions.length, 'executions to database...');
      const executionsToInsert = recentExecutions.slice(0, 1000).map(exec => {
        const failedDetail = failedWithDetails.find(f => f.id === exec.id);
        return {
          execution_id: exec.id,
          workflow_id: exec.workflowId,
          workflow_name: workflowMap.get(exec.workflowId) || 'Unknown Workflow',
          status: exec.status === 'success' ? 'completed' : exec.status === 'error' ? 'failed' : exec.status,
          start_time: exec.startedAt,
          completion_time: exec.stoppedAt || null,
          metrics: {},
          performance: {
            duration_ms: exec.stoppedAt && exec.startedAt 
              ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()
              : null
          },
          error_details: failedDetail ? { message: failedDetail.errorMessage } : null
        };
      });

      const batchSize = 100;
      for (let i = 0; i < executionsToInsert.length; i += batchSize) {
        const batch = executionsToInsert.slice(i, i + batchSize);
        const { error: upsertError } = await supabaseAdmin
          .from('workflow_executions')
          .upsert(batch, { 
            onConflict: 'execution_id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error(`Error syncing batch ${i}:`, upsertError);
        }
      }
    }

    const { count: dbTotalCount } = await supabaseAdmin
      .from('workflow_executions')
      .select('*', { count: 'exact', head: true });

    const { count: dbSuccessCount } = await supabaseAdmin
      .from('workflow_executions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentSuccessCount = recentExecutions.filter(e => e.status === 'success').length;
    const recentErrorCount = recentExecutions.length - recentSuccessCount;
    const recentSuccessRate = recentExecutions.length > 0 
      ? Math.round((recentSuccessCount / recentExecutions.length) * 100) 
      : 0;

    const executions24h = recentExecutions.filter(e => new Date(e.startedAt) >= last24h);
    const executions24hCount = executions24h.length;
    const success24h = executions24h.filter(e => e.status === 'success').length;
    const errors24h = executions24hCount - success24h;

    const completedExecutions = recentExecutions.filter(e => e.finished && e.startedAt && e.stoppedAt);
    const avgDuration = completedExecutions.length > 0
      ? Math.round(completedExecutions.reduce((sum, e) => {
          return sum + (new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime());
        }, 0) / completedExecutions.length / 1000)
      : 0;

    const executionsByWorkflow: Record<string, { name: string; total: number; success: number }> = {};
    recentExecutions.forEach(exec => {
      const workflowName = workflowMap.get(exec.workflowId) || 'Unknown';
      if (!executionsByWorkflow[exec.workflowId]) {
        executionsByWorkflow[exec.workflowId] = { name: workflowName, total: 0, success: 0 };
      }
      executionsByWorkflow[exec.workflowId].total++;
      if (exec.status === 'success') executionsByWorkflow[exec.workflowId].success++;
    });

    const workflowStats = Object.entries(executionsByWorkflow)
      .map(([id, stats]) => ({
        workflowId: id,
        workflowName: stats.name,
        totalExecutions: stats.total,
        successCount: stats.success,
        errorCount: stats.total - stats.success,
        successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.totalExecutions - a.totalExecutions);

    const activeWorkflows = workflows.filter(w => w.active);
    const finalTotalExecutions = recentExecutions.length > 0 ? totalExecutionsEstimate : (dbTotalCount || 0);

    const responseData = {
      summary: {
        totalExecutions: finalTotalExecutions,
        successCount: recentSuccessCount,
        errorCount: recentErrorCount,
        runningCount: recentExecutions.filter(e => e.status === 'running' || e.status === 'waiting').length,
        successRate: recentSuccessRate,
        avgDurationSeconds: avgDuration,
        totalWorkflows: workflows.length,
        activeWorkflows: activeWorkflows.length,
        dataSource: recentExecutions.length > 0 ? 'api' : 'database'
      },
      last24Hours: {
        totalExecutions: executions24hCount,
        successCount: success24h,
        errorCount: errors24h,
        successRate: executions24hCount > 0 ? Math.round((success24h / executions24hCount) * 100) : 0
      },
      workflowStats,
      failedExecutions: failedWithDetails,
      workflows: activeWorkflows.map(w => ({ id: w.id, name: w.name, active: w.active })),
      syncedAt: syncData ? new Date().toISOString() : null,
      dbRecordCount: dbTotalCount || 0,
      debug: {
        recentExecutionsCount: recentExecutions.length,
        highestExecutionId,
        dbHighestId,
        n8nUrlUsed: `${n8nUrl}/api/v1/executions`
      }
    };

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in n8n-execution-metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});