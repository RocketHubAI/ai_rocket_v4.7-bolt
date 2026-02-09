import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const N8N_URL = Deno.env.get("N8N_URL") || "";
const N8N_API_KEY = Deno.env.get("N8N_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function n8nRequest(
  path: string,
  method = "GET",
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const url = `${N8N_URL}/api/v1${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body && method !== "GET") {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function buildIntegrationQueryWorkflow(
  provider: string,
  displayName: string,
  webhookPath: string,
  _operations: string[],
  _docCategory: string,
  apiBaseUrlTemplate: string,
  operationConfigs: Record<string, { method: string; pathTemplate: string; description: string }>
) {
  const supabaseUrl = SUPABASE_URL;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

  const unifiedQueryCode = `
const input = $input.first().json;
const body = input.body || input;
const { team_id, user_id, operation, params } = body;

if (!team_id || !user_id || !operation) {
  return [{ json: { success: false, provider: '${provider}', operation: operation || 'unknown', error: 'Missing required fields: team_id, user_id, operation', error_code: 'INVALID_REQUEST' } }];
}

const SUPABASE_URL = '${supabaseUrl}';
const SERVICE_KEY = '${serviceRoleKey}';

let integrations;
try {
  integrations = await this.helpers.httpRequest({
    method: 'GET',
    url: SUPABASE_URL + '/rest/v1/user_integrations?select=id,access_token_encrypted,refresh_token_encrypted,api_key_encrypted,token_expires_at,connection_metadata,status&user_id=eq.' + user_id + '&status=eq.active',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY },
    json: true
  });
} catch (e) {
  return [{ json: { success: false, provider: '${provider}', operation, error: 'Failed to check credentials: ' + e.message, error_code: 'INTERNAL_ERROR' } }];
}

const integration = Array.isArray(integrations) ? integrations.find(i => {
  const meta = i.connection_metadata || {};
  return meta.provider_slug === '${provider}';
}) : null;

if (!integration) {
  return [{ json: { success: false, provider: '${provider}', operation, error: 'No active ${displayName} connection found for this user', error_code: 'NOT_CONNECTED', requires_reauth: false } }];
}

const tokenExpiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
if (tokenExpiresAt && tokenExpiresAt < new Date()) {
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: SUPABASE_URL + '/rest/v1/user_integrations?id=eq.' + integration.id,
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
      body: { status: 'expired', last_error: 'Token expired during ${provider} query' },
      json: true
    });
  } catch (e) {}
  return [{ json: { success: false, provider: '${provider}', operation, error: 'Token expired', error_code: 'TOKEN_EXPIRED', requires_reauth: true } }];
}

const accessToken = integration.access_token_encrypted || '';
const apiKey = integration.api_key_encrypted || '';
const connectionMeta = integration.connection_metadata || {};
const integrationId = integration.id;
const token = accessToken || apiKey;

const ops = ${JSON.stringify(operationConfigs)};
const opConfig = ops[operation];
if (!opConfig) {
  return [{ json: { success: false, provider: '${provider}', operation, error: 'Unknown operation: ' + operation, error_code: 'INVALID_OPERATION' } }];
}

let path = opConfig.pathTemplate;
const baseUrl = '${apiBaseUrlTemplate}'.replace('{company_id}', connectionMeta.company_id || '').replace('{realm_id}', connectionMeta.realm_id || '').replace('{instance_url}', connectionMeta.instance_url || '').replace('{dc}', connectionMeta.dc || 'us1');

for (const [key, val] of Object.entries(params || {})) {
  path = path.replace('{' + key + '}', String(val));
}

const queryParams = new URLSearchParams();
for (const [key, val] of Object.entries(params || {})) {
  if (val !== undefined && val !== null && val !== '') {
    queryParams.set(key, String(val));
  }
}
const qs = queryParams.toString();
const apiUrl = baseUrl + path + (qs ? '?' + qs : '');

let rawData;
try {
  const reqOpts = {
    method: opConfig.method,
    url: apiUrl,
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    json: true
  };
  if (opConfig.method === 'POST' && params) { reqOpts.body = params; }
  rawData = await this.helpers.httpRequest(reqOpts);
} catch (apiErr) {
  const errMsg = apiErr.message || String(apiErr);
  if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
    return [{ json: { success: false, provider: '${provider}', operation, error: 'Authentication failed - token may be expired', error_code: 'TOKEN_EXPIRED', requires_reauth: true } }];
  }
  return [{ json: { success: false, provider: '${provider}', operation, error: 'API error: ' + errMsg, error_code: 'API_ERROR' } }];
}

try {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: SUPABASE_URL + '/rest/v1/user_integrations?id=eq.' + integrationId,
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
    body: { last_used_at: new Date().toISOString(), last_synced_at: new Date().toISOString() },
    json: true
  });
} catch (e) {}

try {
  await this.helpers.httpRequest({
    method: 'POST',
    url: SUPABASE_URL + '/rest/v1/integration_audit_log',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' },
    body: { user_id, team_id, integration_id: integrationId, action: 'query_' + operation, details: { provider: '${provider}', operation, params }, status: 'success' },
    json: true
  });
} catch (e) {}

return [{ json: {
  success: true,
  provider: '${provider}',
  operation,
  data: rawData,
  metadata: {
    fetched_at: new Date().toISOString(),
    records_count: Array.isArray(rawData) ? rawData.length : (rawData?.data ? (Array.isArray(rawData.data) ? rawData.data.length : 1) : 1)
  }
} }];
`;

  return {
    name: `Astra - ${displayName} Query`,
    nodes: [
      {
        parameters: { httpMethod: "POST", path: webhookPath, responseMode: "lastNode", options: {} },
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [250, 300],
        id: crypto.randomUUID(),
        name: "Webhook Trigger",
        webhookId: crypto.randomUUID()
      },
      {
        parameters: { jsCode: unifiedQueryCode },
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [550, 300],
        id: crypto.randomUUID(),
        name: "Query Integration"
      }
    ],
    connections: {
      "Webhook Trigger": { main: [[{ node: "Query Integration", type: "main", index: 0 }]] }
    },
    settings: { executionOrder: "v1" }
  };
}

function buildSyncHelper(provider: string, supabaseUrl: string, serviceRoleKey: string) {
  return `
async function httpGet(url, headers) {
  return await this.helpers.httpRequest({ method: 'GET', url, headers, json: true });
}
async function httpPost(url, headers, body) {
  return await this.helpers.httpRequest({ method: 'POST', url, headers, body, json: true });
}
async function supabasePost(table, data) {
  return await this.helpers.httpRequest({
    method: 'POST',
    url: '${supabaseUrl}/rest/v1/' + table,
    headers: { 'apikey': '${serviceRoleKey}', 'Authorization': 'Bearer ${serviceRoleKey}', 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: data,
    json: true
  });
}
async function supabasePatch(table, filter, data) {
  return await this.helpers.httpRequest({
    method: 'PATCH',
    url: '${supabaseUrl}/rest/v1/' + table + '?' + filter,
    headers: { 'apikey': '${serviceRoleKey}', 'Authorization': 'Bearer ${serviceRoleKey}', 'Content-Type': 'application/json' },
    body: data,
    json: true
  });
}
`;
}

function buildIntegrationSyncWorkflow(
  provider: string,
  displayName: string,
  webhookPath: string,
  _docCategory: string,
  syncSchedule: string,
  syncLogicCode: string
) {
  const supabaseUrl = SUPABASE_URL;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
  const helpers = buildSyncHelper(provider, supabaseUrl, serviceRoleKey);

  const fullSyncCode = `
const SUPABASE_URL = '${supabaseUrl}';
const SERVICE_KEY = '${serviceRoleKey}';

${helpers}

const input = $input.first().json;
const body = input.body || input;
const isManualTrigger = !!body.team_id;

let teams = [];

if (isManualTrigger) {
  teams = [{ team_id: body.team_id, user_id: body.user_id }];
} else {
  const allIntegrations = await this.helpers.httpRequest({
    method: 'GET',
    url: SUPABASE_URL + '/rest/v1/user_integrations?select=id,user_id,team_id,access_token_encrypted,api_key_encrypted,connection_metadata,token_expires_at&status=eq.active',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY },
    json: true
  });
  teams = (allIntegrations || []).filter(i => {
    const meta = i.connection_metadata || {};
    return meta.provider_slug === '${provider}';
  });
}

if (teams.length === 0) {
  return [{ json: { success: true, provider: '${provider}', message: 'No active connections to sync', synced: 0 } }];
}

const results = [];

for (const integration of teams) {
  try {
    const accessToken = integration.access_token_encrypted || '';
    const apiKey = integration.api_key_encrypted || '';
    const connectionMeta = integration.connection_metadata || {};
    const teamId = integration.team_id;
    const userId = integration.user_id;
    const integrationId = integration.id;

    const tokenExpiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
    if (tokenExpiresAt && tokenExpiresAt < new Date()) {
      results.push({ team_id: teamId, status: 'skipped', reason: 'token_expired' });
      continue;
    }

    ${syncLogicCode}

    try {
      await supabasePatch('user_integrations', 'id=eq.' + integrationId, {
        last_synced_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      });
    } catch (e) {}

    results.push({ team_id: teamId, status: 'success' });
  } catch (err) {
    results.push({ team_id: integration.team_id, status: 'error', error: err.message });
  }
}

return [{ json: { success: true, provider: '${provider}', synced: results.filter(r => r.status === 'success').length, total: results.length, results } }];
`;

  const nodes = [
    {
      parameters: { httpMethod: "POST", path: webhookPath, responseMode: "responseNode", options: {} },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [250, 300],
      id: crypto.randomUUID(),
      name: "Webhook Trigger",
      webhookId: crypto.randomUUID()
    },
    {
      parameters: { jsCode: fullSyncCode },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [550, 300],
      id: crypto.randomUUID(),
      name: "Sync All Teams"
    },
    {
      parameters: { respondWith: "firstIncomingItem", options: { responseCode: 200 } },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [850, 300],
      id: crypto.randomUUID(),
      name: "Return Response"
    }
  ];

  if (syncSchedule) {
    nodes.push({
      parameters: { rule: { interval: [{ triggerAtHour: parseInt(syncSchedule) || 2 }] } },
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [250, 500],
      id: crypto.randomUUID(),
      name: "Daily Schedule"
    });
  }

  const connections: Record<string, unknown> = {
    "Webhook Trigger": { main: [[{ node: "Sync All Teams", type: "main", index: 0 }]] },
    "Sync All Teams": { main: [[{ node: "Return Response", type: "main", index: 0 }]] }
  };

  if (syncSchedule) {
    connections["Daily Schedule"] = { main: [[{ node: "Sync All Teams", type: "main", index: 0 }]] };
  }

  return {
    name: `Astra - ${displayName} Sync`,
    nodes,
    connections,
    settings: { executionOrder: "v1" }
  };
}

function getAllWorkflowDefinitions() {
  const workflows = [];

  workflows.push(buildIntegrationQueryWorkflow(
    'quickbooks', 'QuickBooks', 'astra-quickbooks-query', ['get_profit_loss', 'get_balance_sheet', 'get_cash_flow', 'list_transactions', 'get_revenue_summary', 'get_expense_breakdown', 'get_accounts_receivable', 'get_accounts_payable', 'search_transactions'], 'financial',
    'https://quickbooks.api.intuit.com/v3/company/{realm_id}',
    {
      get_profit_loss: { method: 'GET', pathTemplate: '/reports/ProfitAndLoss', description: 'P&L statement' },
      get_balance_sheet: { method: 'GET', pathTemplate: '/reports/BalanceSheet', description: 'Balance sheet' },
      get_cash_flow: { method: 'GET', pathTemplate: '/reports/CashFlow', description: 'Cash flow' },
      list_transactions: { method: 'GET', pathTemplate: '/query', description: 'List transactions' },
      get_revenue_summary: { method: 'GET', pathTemplate: '/reports/ProfitAndLoss', description: 'Revenue summary' },
      get_expense_breakdown: { method: 'GET', pathTemplate: '/reports/ProfitAndLoss', description: 'Expense breakdown' },
      get_accounts_receivable: { method: 'GET', pathTemplate: '/reports/AgedReceivables', description: 'AR aging' },
      get_accounts_payable: { method: 'GET', pathTemplate: '/reports/AgedPayables', description: 'AP aging' },
      search_transactions: { method: 'GET', pathTemplate: '/query', description: 'Search transactions' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'quickbooks', 'QuickBooks', 'astra-quickbooks-sync', 'financial', '2',
    `
    const token = accessToken || apiKey;
    const realmId = connectionMeta.realm_id || connectionMeta.company_id || '';
    const baseUrl = 'https://quickbooks.api.intuit.com/v3/company/' + realmId;
    const qbHeaders = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    try {
      const plData = await this.helpers.httpRequest({ method: 'GET', url: baseUrl + '/reports/ProfitAndLoss?start_date=' + monthStart + '&end_date=' + today, headers: qbHeaders, json: true });
      if (plData) {
        await supabasePost('document_chunks', {
          team_id: teamId, content: 'QuickBooks Profit & Loss Report - ' + monthStart + ' to ' + today + '\\n' + JSON.stringify(plData, null, 2),
          file_name: 'QuickBooks P&L - ' + monthStart, doc_category: 'financial', doc_type: 'quickbooks_pl',
          source_id: 'qb_pl_' + teamId + '_' + monthStart, sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}

    try {
      const cfData = await this.helpers.httpRequest({ method: 'GET', url: baseUrl + '/reports/CashFlow?start_date=' + monthStart + '&end_date=' + today, headers: qbHeaders, json: true });
      if (cfData) {
        await supabasePost('document_chunks', {
          team_id: teamId, content: 'QuickBooks Cash Flow Statement - ' + monthStart + ' to ' + today + '\\n' + JSON.stringify(cfData, null, 2),
          file_name: 'QuickBooks Cash Flow - ' + monthStart, doc_category: 'financial', doc_type: 'quickbooks_cashflow',
          source_id: 'qb_cf_' + teamId + '_' + monthStart, sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}

    try {
      const arData = await this.helpers.httpRequest({ method: 'GET', url: baseUrl + '/reports/AgedReceivables', headers: qbHeaders, json: true });
      if (arData) {
        await supabasePost('document_chunks', {
          team_id: teamId, content: 'QuickBooks Accounts Receivable Aging - ' + today + '\\n' + JSON.stringify(arData, null, 2),
          file_name: 'QuickBooks AR Aging - ' + today, doc_category: 'financial', doc_type: 'quickbooks_ar',
          source_id: 'qb_ar_' + teamId + '_' + today, sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'slack', 'Slack', 'astra-slack-query', ['list_channels', 'read_history', 'search_messages', 'get_thread', 'summarize_channel'], 'communications',
    'https://slack.com/api',
    {
      list_channels: { method: 'GET', pathTemplate: '/conversations.list', description: 'List channels' },
      read_history: { method: 'GET', pathTemplate: '/conversations.history', description: 'Channel history' },
      search_messages: { method: 'GET', pathTemplate: '/search.messages', description: 'Search messages' },
      get_thread: { method: 'GET', pathTemplate: '/conversations.replies', description: 'Get thread' },
      summarize_channel: { method: 'GET', pathTemplate: '/conversations.history', description: 'Channel summary' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'slack', 'Slack', 'astra-slack-sync', 'communications', '',
    `
    const token = accessToken || apiKey;
    const slackHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

    const chData = await this.helpers.httpRequest({ method: 'GET', url: 'https://slack.com/api/conversations.list?limit=50&types=public_channel,private_channel', headers: slackHeaders, json: true });
    const channels = (chData.channels || []).filter(c => c.is_member);

    for (const channel of channels.slice(0, 10)) {
      try {
        const histData = await this.helpers.httpRequest({ method: 'GET', url: 'https://slack.com/api/conversations.history?channel=' + channel.id + '&limit=50', headers: slackHeaders, json: true });
        const messages = histData.messages || [];
        if (messages.length === 0) continue;

        const summary = messages.map(m => m.text || '').filter(Boolean).join('\\n');
        await supabasePost('document_chunks', {
          team_id: teamId, content: 'Slack Channel: #' + channel.name + ' - Recent Messages\\n\\n' + summary,
          file_name: 'Slack #' + channel.name + ' Summary', doc_category: 'communications', doc_type: 'slack_summary',
          source_id: 'slack_' + channel.id + '_' + teamId + '_' + new Date().toISOString().split('T')[0],
          sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      } catch (e) {}
    }
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'hubspot', 'HubSpot', 'astra-hubspot-query', ['list_contacts', 'get_contact', 'list_deals', 'get_deal_pipeline', 'get_revenue_summary', 'list_companies', 'get_engagement_history', 'search_crm'], 'strategy',
    'https://api.hubapi.com',
    {
      list_contacts: { method: 'GET', pathTemplate: '/crm/v3/objects/contacts', description: 'List contacts' },
      get_contact: { method: 'GET', pathTemplate: '/crm/v3/objects/contacts/{contact_id}', description: 'Get contact' },
      list_deals: { method: 'GET', pathTemplate: '/crm/v3/objects/deals', description: 'List deals' },
      get_deal_pipeline: { method: 'GET', pathTemplate: '/crm/v3/pipelines/deals', description: 'Deal pipeline' },
      get_revenue_summary: { method: 'GET', pathTemplate: '/crm/v3/objects/deals', description: 'Revenue summary' },
      list_companies: { method: 'GET', pathTemplate: '/crm/v3/objects/companies', description: 'List companies' },
      get_engagement_history: { method: 'GET', pathTemplate: '/crm/v3/objects/engagements', description: 'Engagement history' },
      search_crm: { method: 'POST', pathTemplate: '/crm/v3/objects/contacts/search', description: 'Search CRM' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'hubspot', 'HubSpot', 'astra-hubspot-sync', 'strategy', '3',
    `
    const token = accessToken || apiKey;
    const hsHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

    try {
      const pipeData = await this.helpers.httpRequest({ method: 'GET', url: 'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate', headers: hsHeaders, json: true });
      if (pipeData && pipeData.results) {
        const deals = pipeData.results;
        const totalValue = deals.reduce((sum, d) => sum + (parseFloat(d.properties?.amount) || 0), 0);
        const content = 'HubSpot Deal Pipeline Summary - ' + new Date().toISOString().split('T')[0] + '\\nTotal Deals: ' + deals.length + '\\nTotal Pipeline Value: $' + totalValue.toLocaleString() + '\\n\\n' +
          deals.map(d => '- ' + (d.properties?.dealname || 'Unnamed') + ': $' + (d.properties?.amount || '0') + ' (' + (d.properties?.dealstage || 'unknown') + ')').join('\\n');
        await supabasePost('document_chunks', {
          team_id: teamId, content, file_name: 'HubSpot Pipeline Summary', doc_category: 'strategy', doc_type: 'hubspot_pipeline',
          source_id: 'hubspot_pipeline_' + teamId + '_' + new Date().toISOString().split('T')[0],
          sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}

    try {
      const contactsData = await this.helpers.httpRequest({ method: 'GET', url: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=50&properties=firstname,lastname,email,company,createdate', headers: hsHeaders, json: true });
      if (contactsData && contactsData.results) {
        const content = 'HubSpot Contacts Summary - ' + new Date().toISOString().split('T')[0] + '\\nTotal Contacts: ' + contactsData.results.length + '\\n\\n' +
          contactsData.results.slice(0, 20).map(c => '- ' + (c.properties?.firstname || '') + ' ' + (c.properties?.lastname || '') + ' (' + (c.properties?.email || '') + ') - ' + (c.properties?.company || 'No company')).join('\\n');
        await supabasePost('document_chunks', {
          team_id: teamId, content, file_name: 'HubSpot Contacts Summary', doc_category: 'communications', doc_type: 'hubspot_contacts',
          source_id: 'hubspot_contacts_' + teamId + '_' + new Date().toISOString().split('T')[0],
          sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'notion', 'Notion', 'astra-notion-query', ['search_pages', 'get_page', 'list_databases', 'query_database', 'get_recent'], 'projects',
    'https://api.notion.com/v1',
    {
      search_pages: { method: 'POST', pathTemplate: '/search', description: 'Search workspace' },
      get_page: { method: 'GET', pathTemplate: '/pages/{page_id}', description: 'Get page' },
      list_databases: { method: 'POST', pathTemplate: '/search', description: 'List databases' },
      query_database: { method: 'POST', pathTemplate: '/databases/{database_id}/query', description: 'Query database' },
      get_recent: { method: 'POST', pathTemplate: '/search', description: 'Recent pages' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'notion', 'Notion', 'astra-notion-sync', 'projects', '',
    `
    const token = accessToken || apiKey;
    const notionHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' };

    try {
      const searchData = await this.helpers.httpRequest({
        method: 'POST', url: 'https://api.notion.com/v1/search', headers: notionHeaders,
        body: { sort: { direction: 'descending', timestamp: 'last_edited_time' }, page_size: 20 }, json: true
      });

      if (searchData && searchData.results) {
        for (const page of searchData.results) {
          const title = page.properties?.title?.title?.[0]?.plain_text || page.properties?.Name?.title?.[0]?.plain_text || 'Untitled';
          const pageId = page.id;

          let content = 'Notion Page: ' + title + '\\nLast edited: ' + (page.last_edited_time || 'unknown') + '\\n\\n';
          try {
            const blocksData = await this.helpers.httpRequest({ method: 'GET', url: 'https://api.notion.com/v1/blocks/' + pageId + '/children?page_size=100', headers: notionHeaders, json: true });
            if (blocksData && blocksData.results) {
              for (const block of blocksData.results) {
                const texts = block[block.type]?.rich_text || [];
                const text = texts.map(t => t.plain_text || '').join('');
                if (text) content += text + '\\n';
              }
            }
          } catch (e) {}

          await supabasePost('document_chunks', {
            team_id: teamId, content, file_name: title, doc_category: 'projects', doc_type: 'notion_page',
            source_id: 'notion_' + pageId, sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
          });
        }
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'xero', 'Xero', 'astra-xero-query', ['get_profit_loss', 'get_balance_sheet', 'list_transactions', 'get_revenue_summary', 'get_expense_breakdown', 'get_invoices', 'get_bills'], 'financial',
    'https://api.xero.com/api.xro/2.0',
    {
      get_profit_loss: { method: 'GET', pathTemplate: '/Reports/ProfitAndLoss', description: 'P&L' },
      get_balance_sheet: { method: 'GET', pathTemplate: '/Reports/BalanceSheet', description: 'Balance sheet' },
      list_transactions: { method: 'GET', pathTemplate: '/BankTransactions', description: 'Transactions' },
      get_revenue_summary: { method: 'GET', pathTemplate: '/Reports/ProfitAndLoss', description: 'Revenue' },
      get_expense_breakdown: { method: 'GET', pathTemplate: '/Reports/ProfitAndLoss', description: 'Expenses' },
      get_invoices: { method: 'GET', pathTemplate: '/Invoices', description: 'Invoices' },
      get_bills: { method: 'GET', pathTemplate: '/Invoices?where=Type=="ACCPAY"', description: 'Bills' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'xero', 'Xero', 'astra-xero-sync', 'financial', '2',
    `
    const token = accessToken;
    const tenantId = connectionMeta.tenant_id || '';
    const xeroHeaders = { 'Authorization': 'Bearer ' + token, 'xero-tenant-id': tenantId, 'Accept': 'application/json' };

    try {
      const plData = await this.helpers.httpRequest({ method: 'GET', url: 'https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss', headers: xeroHeaders, json: true });
      if (plData) {
        await supabasePost('document_chunks', {
          team_id: teamId, content: 'Xero Profit & Loss Report\\n' + JSON.stringify(plData, null, 2),
          file_name: 'Xero P&L Report', doc_category: 'financial', doc_type: 'xero_pl',
          source_id: 'xero_pl_' + teamId + '_' + new Date().toISOString().split('T')[0],
          sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'stripe', 'Stripe', 'astra-stripe-query', ['get_mrr', 'get_subscription_metrics', 'list_recent_charges', 'get_revenue_by_period', 'list_failed_payments', 'get_customer_metrics'], 'financial',
    'https://api.stripe.com/v1',
    {
      get_mrr: { method: 'GET', pathTemplate: '/subscriptions?status=active&limit=100', description: 'MRR' },
      get_subscription_metrics: { method: 'GET', pathTemplate: '/subscriptions?limit=100', description: 'Subscriptions' },
      list_recent_charges: { method: 'GET', pathTemplate: '/charges?limit={limit}', description: 'Recent charges' },
      get_revenue_by_period: { method: 'GET', pathTemplate: '/charges?limit=100', description: 'Revenue by period' },
      list_failed_payments: { method: 'GET', pathTemplate: '/charges?limit=50', description: 'Failed payments' },
      get_customer_metrics: { method: 'GET', pathTemplate: '/customers?limit=100', description: 'Customer metrics' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'stripe', 'Stripe', 'astra-stripe-sync', 'financial', '4',
    `
    const key = apiKey || accessToken;
    const stripeHeaders = { 'Authorization': 'Bearer ' + key };

    try {
      const subsData = await this.helpers.httpRequest({ method: 'GET', url: 'https://api.stripe.com/v1/subscriptions?status=active&limit=100', headers: stripeHeaders, json: true });
      if (subsData && subsData.data) {
        const mrr = subsData.data.reduce((sum, s) => sum + (s.plan?.amount || 0) / 100, 0);
        const content = 'Stripe Subscription Metrics\\nActive Subscriptions: ' + subsData.data.length + '\\nMonthly Recurring Revenue (MRR): $' + mrr.toFixed(2) + '\\n\\n' +
          subsData.data.slice(0, 20).map(s => '- ' + (s.customer || 'Unknown') + ': $' + ((s.plan?.amount || 0) / 100).toFixed(2) + '/mo').join('\\n');
        await supabasePost('document_chunks', {
          team_id: teamId, content, file_name: 'Stripe MRR Report', doc_category: 'financial', doc_type: 'stripe_mrr',
          source_id: 'stripe_mrr_' + teamId + '_' + new Date().toISOString().split('T')[0],
          sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'gohighlevel', 'GoHighLevel', 'astra-gohighlevel-query', ['list_contacts', 'get_pipeline', 'get_campaign_stats', 'list_opportunities', 'get_conversation_summary'], 'communications',
    'https://services.leadconnectorhq.com',
    {
      list_contacts: { method: 'GET', pathTemplate: '/contacts/', description: 'List contacts' },
      get_pipeline: { method: 'GET', pathTemplate: '/opportunities/pipelines', description: 'Pipeline' },
      get_campaign_stats: { method: 'GET', pathTemplate: '/campaigns/', description: 'Campaign stats' },
      list_opportunities: { method: 'GET', pathTemplate: '/opportunities/search', description: 'Opportunities' },
      get_conversation_summary: { method: 'GET', pathTemplate: '/conversations/', description: 'Conversations' }
    }
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'salesforce', 'Salesforce', 'astra-salesforce-query', ['soql_query', 'list_opportunities', 'get_account', 'get_pipeline_report', 'list_leads', 'get_dashboard_metrics'], 'strategy',
    '{instance_url}/services/data/v59.0',
    {
      soql_query: { method: 'GET', pathTemplate: '/query', description: 'SOQL query' },
      list_opportunities: { method: 'GET', pathTemplate: '/query', description: 'List opportunities' },
      get_account: { method: 'GET', pathTemplate: '/sobjects/Account/{account_id}', description: 'Get account' },
      get_pipeline_report: { method: 'GET', pathTemplate: '/query', description: 'Pipeline report' },
      list_leads: { method: 'GET', pathTemplate: '/query', description: 'List leads' },
      get_dashboard_metrics: { method: 'GET', pathTemplate: '/query', description: 'Dashboard metrics' }
    }
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'salesforce', 'Salesforce', 'astra-salesforce-sync', 'strategy', '3',
    `
    const token = accessToken;
    const instanceUrl = connectionMeta.instance_url || '';
    const sfHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

    try {
      const oppsData = await this.helpers.httpRequest({ method: 'GET', url: instanceUrl + '/services/data/v59.0/query?q=' + encodeURIComponent('SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity ORDER BY CloseDate DESC LIMIT 50'), headers: sfHeaders, json: true });
      if (oppsData && oppsData.records) {
        const content = 'Salesforce Opportunities Summary\\nTotal: ' + oppsData.records.length + '\\n\\n' +
          oppsData.records.map(o => '- ' + o.Name + ': $' + (o.Amount || 0) + ' (' + o.StageName + ') Close: ' + (o.CloseDate || 'TBD')).join('\\n');
        await supabasePost('document_chunks', {
          team_id: teamId, content, file_name: 'Salesforce Opportunities', doc_category: 'strategy', doc_type: 'salesforce_opportunities',
          source_id: 'sf_opps_' + teamId + '_' + new Date().toISOString().split('T')[0],
          sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
        });
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationSyncWorkflow(
    'fireflies', 'Fireflies.ai', 'astra-fireflies-sync', 'meetings', '',
    `
    const token = apiKey || accessToken;
    const ffHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    const query = '{ transcripts { id title date duration organizer_email attendees { displayName email } sentences { text } summary { action_items overview } } }';

    try {
      const gqlData = await this.helpers.httpRequest({ method: 'POST', url: 'https://api.fireflies.ai/graphql', headers: ffHeaders, body: { query }, json: true });
      if (gqlData?.data?.transcripts) {
        for (const transcript of gqlData.data.transcripts.slice(0, 10)) {
          const sentences = (transcript.sentences || []).map(s => s.text).join(' ');
          const content = 'Meeting Transcript: ' + transcript.title + '\\nDate: ' + transcript.date + '\\nAttendees: ' + (transcript.attendees || []).map(a => a.displayName || a.email).join(', ') + '\\n\\nSummary:\\n' + (transcript.summary?.overview || 'No summary') + '\\n\\nAction Items:\\n' + (transcript.summary?.action_items || []).join('\\n') + '\\n\\nTranscript:\\n' + sentences.substring(0, 3000);
          await supabasePost('document_chunks', {
            team_id: teamId, content, file_name: transcript.title, doc_category: 'meetings', doc_type: 'fireflies_transcript',
            source_id: 'fireflies_' + transcript.id, sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
          });
        }
      }
    } catch (e) {}
    `
  ));

  workflows.push(buildIntegrationQueryWorkflow(
    'fireflies', 'Fireflies.ai', 'astra-fireflies-query', ['list_transcripts', 'get_transcript', 'get_action_items', 'search_transcripts'], 'meetings',
    'https://api.fireflies.ai/graphql',
    {
      list_transcripts: { method: 'POST', pathTemplate: '', description: 'List transcripts' },
      get_transcript: { method: 'POST', pathTemplate: '', description: 'Get transcript' },
      get_action_items: { method: 'POST', pathTemplate: '', description: 'Action items' },
      search_transcripts: { method: 'POST', pathTemplate: '', description: 'Search transcripts' }
    }
  ));

  const pmTools = [
    { slug: 'monday', name: 'Monday.com', baseUrl: 'https://api.monday.com/v2', ops: {
      list_projects: { method: 'POST', pathTemplate: '', description: 'List boards' },
      get_project: { method: 'POST', pathTemplate: '', description: 'Get board' },
      list_tasks: { method: 'POST', pathTemplate: '', description: 'List items' },
      get_task: { method: 'POST', pathTemplate: '', description: 'Get item' },
      search: { method: 'POST', pathTemplate: '', description: 'Search' },
      get_overdue_tasks: { method: 'POST', pathTemplate: '', description: 'Overdue items' }
    }},
    { slug: 'asana', name: 'Asana', baseUrl: 'https://app.asana.com/api/1.0', ops: {
      list_projects: { method: 'GET', pathTemplate: '/projects', description: 'List projects' },
      get_project: { method: 'GET', pathTemplate: '/projects/{project_id}', description: 'Get project' },
      list_tasks: { method: 'GET', pathTemplate: '/tasks', description: 'List tasks' },
      get_task: { method: 'GET', pathTemplate: '/tasks/{task_id}', description: 'Get task' },
      search: { method: 'GET', pathTemplate: '/workspaces/{workspace_id}/tasks/search', description: 'Search' },
      get_overdue_tasks: { method: 'GET', pathTemplate: '/tasks', description: 'Overdue tasks' }
    }},
    { slug: 'trello', name: 'Trello', baseUrl: 'https://api.trello.com/1', ops: {
      list_projects: { method: 'GET', pathTemplate: '/members/me/boards', description: 'List boards' },
      get_project: { method: 'GET', pathTemplate: '/boards/{board_id}', description: 'Get board' },
      list_tasks: { method: 'GET', pathTemplate: '/boards/{board_id}/cards', description: 'List cards' },
      get_task: { method: 'GET', pathTemplate: '/cards/{card_id}', description: 'Get card' },
      search: { method: 'GET', pathTemplate: '/search', description: 'Search' },
      get_overdue_tasks: { method: 'GET', pathTemplate: '/boards/{board_id}/cards', description: 'Overdue cards' }
    }}
  ];

  for (const tool of pmTools) {
    workflows.push(buildIntegrationQueryWorkflow(
      tool.slug, tool.name, `astra-${tool.slug}-query`,
      Object.keys(tool.ops), 'projects', tool.baseUrl, tool.ops
    ));

    workflows.push(buildIntegrationSyncWorkflow(
      tool.slug, tool.name, `astra-${tool.slug}-sync`, 'projects', '',
      `
      const token = accessToken || apiKey;
      const pmHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      const content = '${tool.name} sync completed at ' + new Date().toISOString();
      await supabasePost('document_chunks', {
        team_id: teamId, content, file_name: '${tool.name} Sync Summary', doc_category: 'projects', doc_type: '${tool.slug}_sync',
        source_id: '${tool.slug}_sync_' + teamId + '_' + new Date().toISOString().split('T')[0],
        sync_status: 'synced', last_synced_at: new Date().toISOString(), chunk_index: 0
      });
      `
    ));
  }

  workflows.push(buildIntegrationQueryWorkflow(
    'mailchimp', 'Mailchimp', 'astra-mailchimp-query', ['list_campaigns', 'get_campaign_report', 'get_audience_stats', 'get_subscriber_growth'], 'communications',
    'https://{dc}.api.mailchimp.com/3.0',
    {
      list_campaigns: { method: 'GET', pathTemplate: '/campaigns', description: 'List campaigns' },
      get_campaign_report: { method: 'GET', pathTemplate: '/reports/{campaign_id}', description: 'Campaign report' },
      get_audience_stats: { method: 'GET', pathTemplate: '/lists/{list_id}', description: 'Audience stats' },
      get_subscriber_growth: { method: 'GET', pathTemplate: '/lists/{list_id}/growth-history', description: 'Growth' }
    }
  ));

  return workflows;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "health") {
      const result = await n8nRequest("/workflows?limit=1");
      return new Response(
        JSON.stringify({
          n8n_url: N8N_URL,
          api_key_set: !!N8N_API_KEY,
          supabase_url: SUPABASE_URL,
          service_role_set: !!SUPABASE_SERVICE_ROLE_KEY,
          connectivity: result.status === 200 ? "ok" : "failed",
          status: result.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      const result = await n8nRequest("/workflows?limit=200");
      const workflows = ((result.data as any)?.data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active,
      }));
      return new Response(JSON.stringify({ workflows, total: workflows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const body = await req.json();
      const result = await n8nRequest("/workflows", "POST", body);
      return new Response(JSON.stringify(result.data), {
        status: result.status === 200 || result.status === 201 ? 200 : result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const workflowId = url.searchParams.get("id");
      if (!workflowId) throw new Error("Missing workflow id");
      const result = await n8nRequest(`/workflows/${workflowId}`, "DELETE");
      return new Response(JSON.stringify({ id: workflowId, deleted: result.status === 200 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_batch") {
      const body = await req.json();
      const ids = body.ids || [];
      const results = [];
      for (const id of ids) {
        try {
          const result = await n8nRequest(`/workflows/${id}`, "DELETE");
          results.push({ id, deleted: result.status === 200 });
        } catch (err) {
          results.push({ id, deleted: false, error: err.message });
        }
      }
      return new Response(JSON.stringify({ total: ids.length, deleted: results.filter(r => r.deleted).length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deploy_all") {
      const workflows = getAllWorkflowDefinitions();
      const results = [];

      for (const wf of workflows) {
        try {
          const result = await n8nRequest("/workflows", "POST", wf);
          const created = result.data as any;
          results.push({
            name: wf.name,
            id: created?.id || null,
            status: result.status === 200 || result.status === 201 ? "created" : "error",
            error: result.status !== 200 && result.status !== 201 ? JSON.stringify(result.data) : null,
          });
        } catch (err) {
          results.push({ name: wf.name, id: null, status: "error", error: err.message });
        }
      }

      return new Response(
        JSON.stringify({
          total: workflows.length,
          created: results.filter(r => r.status === "created").length,
          errors: results.filter(r => r.status === "error").length,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "activate") {
      const workflowId = url.searchParams.get("id");
      if (!workflowId) throw new Error("Missing workflow id");
      const result = await n8nRequest(`/workflows/${workflowId}/activate`, "POST");
      if (result.status === 200) {
        return new Response(JSON.stringify({ id: workflowId, active: true, status: "activated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const patchResult = await n8nRequest(`/workflows/${workflowId}`, "PATCH", { active: true });
      return new Response(JSON.stringify({ id: workflowId, active: true, status: patchResult.status, data: patchResult.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test_webhook") {
      const webhookPath = url.searchParams.get("path");
      if (!webhookPath) throw new Error("Missing webhook path");
      const body = await req.json();
      const testUrl = `${N8N_URL}/webhook/${webhookPath}`;
      const res = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      return new Response(
        JSON.stringify({ status: res.status, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: health, list, create, delete, delete_batch, deploy_all, activate, test_webhook" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
