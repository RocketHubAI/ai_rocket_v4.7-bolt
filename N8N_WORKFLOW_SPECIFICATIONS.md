# N8N Workflow Specifications for MCP Connection Plan

## Complete Developer Guide for Building and Integrating n8n Workflows

**Version:** 1.0
**Created:** 2026-02-07
**Status:** Ready for Development
**Related Docs:** [MCP_DATA_CONNECTION_STRATEGY.md](./MCP_DATA_CONNECTION_STRATEGY.md), [AGENT_CONNECTION_PLAN.md](./AGENT_CONNECTION_PLAN.md)

---

## Table of Contents

1. [Current State & Existing Infrastructure](#1-current-state--existing-infrastructure)
2. [Architecture Overview](#2-architecture-overview)
3. [Standard Patterns & Conventions](#3-standard-patterns--conventions)
4. [Priority 1: QuickBooks Online Workflow](#4-priority-1-quickbooks-online-workflow)
5. [Priority 2: Slack Workflow](#5-priority-2-slack-workflow)
6. [Priority 3: HubSpot Workflow](#6-priority-3-hubspot-workflow)
7. [Priority 4: Notion Workflow](#7-priority-4-notion-workflow)
8. [Priority 5: Xero Workflow](#8-priority-5-xero-workflow)
9. [Priority 6: Stripe Workflow](#9-priority-6-stripe-workflow)
10. [Priority 7: GoHighLevel Workflow](#10-priority-7-gohighlevel-workflow)
11. [Priority 8: Salesforce Workflow](#11-priority-8-salesforce-workflow)
12. [Priority 9: Fireflies.ai Workflow](#12-priority-9-firefliesai-workflow)
13. [Priority 10: Monday.com / Asana / Trello Workflows](#13-priority-10-mondaycom--asana--trello-workflows)
14. [Priority 11: Mailchimp Workflow](#14-priority-11-mailchimp-workflow)
15. [Integration Registry Updates](#15-integration-registry-updates)
16. [Data Vectorization Pipeline](#16-data-vectorization-pipeline)
17. [Testing & Validation](#17-testing--validation)

---

## 1. Current State & Existing Infrastructure

### What Already Exists in n8n

The app currently has two active n8n workflow patterns:

#### Workflow A: Main Chat AI Agent
- **Webhook URL:** `https://n8n.rockethub.ai/webhook/eac4b8f0-d6b4-45e4-b27d-ed3bec56983f/chat`
- **Purpose:** The primary AI agent workflow. Receives user chat messages and returns AI-generated responses with data analysis.
- **Triggered by:** Frontend `useChat.ts` hook via direct POST
- **Input payload:**
  ```json
  {
    "chatInput": "user's message text",
    "user_id": "uuid",
    "user_email": "user@example.com",
    "user_name": "John Doe",
    "conversation_id": "uuid",
    "team_id": "uuid",
    "team_name": "My Team",
    "role": "admin",
    "view_financial": true,
    "mode": "private",
    "is_reply": false,
    "reply_context": "optional previous message",
    "recent_context": "optional context from last message",
    "is_likely_followup": true,
    "followup_confidence": "high",
    "followup_type": "clarification"
  }
  ```
- **Expected response:**
  ```json
  {
    "output": "AI response markdown text",
    "metadata": {},
    "tokens_used": {},
    "tools_used": ["tool_name"],
    "model_used": "model-name"
  }
  ```

#### Workflow B: Document Sync (Astra Sync Now)
- **Webhook URL:** `https://n8n.rockethub.ai/webhook/astra-sync-now` (GET)
- **Purpose:** Quick sync trigger for folders already connected
- **Triggered by:** Frontend `triggerSyncNow()` via `n8n-proxy` edge function
- **Query parameters:** `team_id`, `user_id`, `folder_ids` (comma-separated), `source`

#### Workflow C: Unified Manual Folder Sync
- **Webhook URL:** `https://n8n.rockethub.ai/webhook/astra-unified-manual-sync` (POST)
- **Purpose:** Full folder sync with file discovery, content extraction, chunking, vectorization, and classification
- **Triggered by:** `manual-folder-sync-proxy` edge function
- **Input payload:**
  ```json
  {
    "team_id": "uuid",
    "user_id": "uuid",
    "folder_id": "google-drive-or-onedrive-folder-id",
    "folder_type": "Strategy Documents",
    "access_token": "oauth-access-token",
    "folder_name": "My Folder",
    "folder_path": "/path/to/folder",
    "max_depth": 10,
    "exclude_folders": ["Archive", "Old", "Trash", ".hidden"],
    "sync_session_id": "uuid",
    "provider": "google",
    "microsoft_drive_id": "optional-for-microsoft"
  }
  ```

### Two n8n Hosts

The app currently uses two n8n hosts (being consolidated):

| Host | URL | Used For |
|------|-----|----------|
| Primary (new) | `https://n8n.rockethub.ai` | Main chat webhook, sync-now |
| Legacy | `https://healthrocket.app.n8n.cloud` | n8n-proxy webhook routing, manual-folder-sync |

**Action Required:** New workflows should be built on `https://n8n.rockethub.ai`. The `n8n-proxy` edge function's `N8N_WEBHOOK_BASE` constant and the `manual-folder-sync-proxy` edge function's URL will need updating once migration is complete.

### How the App Calls n8n Workflows

There are two routing patterns:

**Pattern 1: Direct Webhook Call (Frontend)**
The frontend calls n8n webhooks directly (for the main chat):
```javascript
const response = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
});
```

**Pattern 2: n8n-Proxy Edge Function (Server-side routing)**
For non-chat webhooks, the frontend calls the `n8n-proxy` Supabase Edge Function, which authenticates the user and forwards to n8n:
```javascript
// Frontend sends to edge function:
fetch(`${SUPABASE_URL}/functions/v1/n8n-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase_jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    webhook_path: 'my-webhook-name',    // Appended to N8N_WEBHOOK_BASE
    method: 'POST',                      // HTTP method for the webhook
    payload: { ... },                    // Body sent to webhook
    query_params: { key: 'value' }       // Query params (for GET)
  })
});
```

The n8n-proxy constructs the URL as: `https://healthrocket.app.n8n.cloud/webhook/{webhook_path}` and forwards the request.

### Supabase Database Tables the Workflows Interact With

Workflows write data to these tables (via Supabase REST API or direct Postgres connection):

- **`document_chunks`** -- The main vectorized content store. Key columns:
  - `team_id`, `document_id`, `chunk_index`, `content`, `embedding` (vector)
  - `doc_category` (enum: strategy, meetings, financial, projects, communications, etc.)
  - `doc_type`, `file_name`, `file_path`, `google_file_id`, `source_id`
  - `ai_classification` (jsonb), `classification_confidence`
  - `batch_id`, `sync_status`, `content_hash`

- **`documents`** -- Parent document metadata (one per file)

- **`data_sync_sessions`** -- Tracks sync progress (files_discovered, files_stored, status)

- **`user_integrations`** -- Connection status tracking. Workflows should update:
  - `last_synced_at` after successful data pull
  - `last_used_at` when data is accessed
  - `times_used_by_agent` when agent queries integration data
  - `status` if errors occur
  - `last_error` with error details

- **`integration_audit_log`** -- Workflows should log significant events

- **`integration_registry`** -- Each workflow registers here with its `n8n_webhook_url` and `n8n_workflow_id`

---

## 2. Architecture Overview

### How New Integration Workflows Fit Into the System

```
User asks: "What were my QuickBooks sales last month?"
    |
    v
team-agent-chat (Supabase Edge Function)
    |-- Sees user has QuickBooks connected in user_integrations
    |-- Sees QuickBooks has capabilities: [read_financials, read_transactions, read_reports]
    |-- Determines this requires external data fetch
    |-- Returns action: { type: 'send_to_agent', prompt: 'Fetch QuickBooks P&L...' }
    |
    v
Agent Chat sends prompt to Main n8n Chat Webhook
    |-- n8n workflow receives the prompt with user context
    |-- Detects it needs QuickBooks data
    |-- Calls QuickBooks Integration Webhook (sub-workflow)
    |-- Receives structured financial data
    |-- AI processes data + generates response
    |
    v
Response returned to frontend with formatted analysis
```

### Two Integration Models

Each new integration workflow can operate in two modes:

**Mode A: On-Demand Query (Agent-Triggered)**
The main chat n8n workflow calls the integration webhook when the AI agent determines it needs external data. This is for real-time queries like "What's my revenue this month?"

**Mode B: Scheduled Sync (Background)**
A separate n8n workflow runs on a schedule (daily/hourly) to pull data and store it in `document_chunks` for vectorized search. This is for making data available to the overnight assistant and general AI queries without real-time API calls.

Most integrations should support BOTH modes.

---

## 3. Standard Patterns & Conventions

### Webhook Naming Convention

All new integration webhooks should follow this pattern:
```
astra-{provider}-{operation}
```

Examples:
- `astra-quickbooks-query`
- `astra-slack-read`
- `astra-hubspot-query`
- `astra-notion-search`
- `astra-quickbooks-sync` (for scheduled sync variant)

### Standard Input Contract (All Integration Webhooks)

Every integration webhook MUST accept this base payload:

```json
{
  "team_id": "uuid (required)",
  "user_id": "uuid (required)",
  "operation": "string (required) - what to do",
  "params": {
    "...operation-specific parameters"
  }
}
```

The webhook should:
1. Look up the user's connection credentials from `user_integrations` (via Supabase API)
2. Use the stored tokens/API keys to call the external service
3. Return structured data in a standard response format

### Standard Output Contract (All Integration Webhooks)

Every integration webhook MUST return:

```json
{
  "success": true,
  "provider": "quickbooks",
  "operation": "get_profit_loss",
  "data": {
    "...structured response data"
  },
  "metadata": {
    "fetched_at": "2026-02-07T12:00:00Z",
    "records_count": 42,
    "date_range": { "start": "2026-01-01", "end": "2026-01-31" }
  }
}
```

Error response:
```json
{
  "success": false,
  "provider": "quickbooks",
  "operation": "get_profit_loss",
  "error": "Token expired",
  "error_code": "TOKEN_EXPIRED",
  "requires_reauth": true
}
```

### Credential Retrieval Pattern

Every workflow needs to retrieve the user's stored credentials. Standard n8n flow:

1. **HTTP Request node** -> Supabase REST API:
   ```
   GET {SUPABASE_URL}/rest/v1/user_integrations
     ?select=access_token_encrypted,refresh_token_encrypted,api_key_encrypted,token_expires_at,connection_metadata
     &user_id=eq.{user_id}
     &integration_id=eq.{integration_uuid}
     &status=eq.active
   Headers:
     apikey: {SUPABASE_SERVICE_ROLE_KEY}
     Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
   ```
2. **IF node** -> Check if token is expired (`token_expires_at < now`)
3. **If expired** -> Call the appropriate refresh function:
   - For n8n OAuth-managed credentials: Use n8n's built-in credential refresh
   - For app-managed OAuth: Call the app's refresh edge function
4. **Proceed** with valid access token

### Token Refresh Handling

When a workflow detects an expired token:

1. Attempt the API call first (some providers auto-refresh)
2. If 401 response, update `user_integrations.status` to `'expired'`
3. Log to `integration_audit_log` with action `'token_expired'`
4. Return `{ success: false, error_code: 'TOKEN_EXPIRED', requires_reauth: true }`
5. The app's `check-integration-health` cron (runs every 30 min) will attempt auto-refresh

### Writing Data to document_chunks (Vectorization)

When a workflow syncs data for storage (Mode B), it should write to `document_chunks` via Supabase:

```
POST {SUPABASE_URL}/rest/v1/document_chunks
Headers:
  apikey: {SUPABASE_SERVICE_ROLE_KEY}
  Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
  Content-Type: application/json
  Prefer: resolution=merge-duplicates

Body:
{
  "team_id": "uuid",
  "document_id": "uuid (generate or look up from documents table)",
  "chunk_index": 0,
  "content": "The extracted text content",
  "file_name": "QuickBooks P&L Report - January 2026",
  "file_path": "quickbooks/reports/profit_loss_2026_01",
  "doc_category": "financial",
  "doc_type": "quickbooks_report",
  "google_file_id": null,
  "source_id": "qb_pl_2026_01",
  "sync_status": "synced",
  "last_synced_at": "2026-02-07T12:00:00Z",
  "content_hash": "sha256_of_content",
  "batch_id": "uuid_for_this_sync_batch"
}
```

### Updating Integration Status After Use

After every successful data fetch, update the integration record:

```
PATCH {SUPABASE_URL}/rest/v1/user_integrations
  ?user_id=eq.{user_id}&integration_id=eq.{integration_uuid}
Headers:
  apikey: {SUPABASE_SERVICE_ROLE_KEY}
  Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}

Body:
{
  "last_used_at": "2026-02-07T12:00:00Z",
  "last_synced_at": "2026-02-07T12:00:00Z",
  "times_used_by_agent": "existing_value + 1"
}
```

Note: For the `times_used_by_agent` increment, use a Supabase RPC function or read-then-write pattern.

---

## 4. Priority 1: QuickBooks Online Workflow

**Customer demand:** Highest -- most requested integration across all customer meetings
**Integration type:** `n8n_workflow` (n8n has a native QuickBooks node)
**Registry slug:** `quickbooks`
**Doc category:** `financial`

### Workflow A: On-Demand Query (`astra-quickbooks-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-quickbooks-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `get_profit_loss` | P&L statement for date range | `start_date`, `end_date`, `accounting_method` (cash/accrual) |
| `get_balance_sheet` | Balance sheet snapshot | `as_of_date` |
| `get_cash_flow` | Cash flow statement | `start_date`, `end_date` |
| `list_transactions` | Recent transactions | `start_date`, `end_date`, `limit`, `type` (expense/income/all) |
| `get_revenue_summary` | Total revenue by period | `period` (monthly/quarterly/yearly), `num_periods` |
| `get_expense_breakdown` | Expenses by category | `start_date`, `end_date` |
| `get_accounts_receivable` | Outstanding invoices | `status` (open/overdue/all) |
| `get_accounts_payable` | Bills to pay | `status` (open/overdue/all) |
| `search_transactions` | Search by keyword/amount | `query`, `min_amount`, `max_amount` |

**Example Input:**
```json
{
  "team_id": "abc-123",
  "user_id": "def-456",
  "operation": "get_profit_loss",
  "params": {
    "start_date": "2026-01-01",
    "end_date": "2026-01-31",
    "accounting_method": "accrual"
  }
}
```

**Example Output:**
```json
{
  "success": true,
  "provider": "quickbooks",
  "operation": "get_profit_loss",
  "data": {
    "report_name": "Profit and Loss",
    "period": { "start": "2026-01-01", "end": "2026-01-31" },
    "currency": "USD",
    "total_income": 125000.00,
    "total_cost_of_goods": 45000.00,
    "gross_profit": 80000.00,
    "total_expenses": 52000.00,
    "net_income": 28000.00,
    "income_breakdown": [
      { "category": "Sales", "amount": 100000.00 },
      { "category": "Service Revenue", "amount": 25000.00 }
    ],
    "expense_breakdown": [
      { "category": "Payroll", "amount": 30000.00 },
      { "category": "Rent", "amount": 8000.00 },
      { "category": "Marketing", "amount": 5000.00 },
      { "category": "Other", "amount": 9000.00 }
    ]
  },
  "metadata": {
    "fetched_at": "2026-02-07T12:00:00Z",
    "accounting_method": "accrual"
  }
}
```

**n8n Workflow Nodes:**

1. **Webhook Trigger** -- Receives POST request
2. **HTTP Request (Supabase)** -- Fetch user's QuickBooks credentials from `user_integrations`
3. **IF** -- Check token expiry, refresh if needed
4. **Switch** -- Route based on `operation` field
5. **QuickBooks Node** (one per operation) -- Native n8n QuickBooks node with the fetched OAuth credentials
6. **Code Node** -- Transform QuickBooks API response to standard output format
7. **HTTP Request (Supabase)** -- Update `user_integrations.last_used_at`
8. **Respond to Webhook** -- Return structured response

**Security:** This workflow MUST respect the `view_financial` permission flag. The main chat workflow should check this BEFORE calling the QuickBooks webhook. The webhook itself should verify the user has an active QuickBooks connection.

### Workflow B: Scheduled Sync (`astra-quickbooks-sync`)

**Schedule:** Daily at 2 AM (team timezone), or triggered manually
**Purpose:** Pull key financial summaries and store in `document_chunks` for vectorized search

**What to sync daily:**
1. P&L for current month-to-date
2. P&L for previous month (if within first 5 days of month)
3. Cash flow summary for current month
4. Any transactions > $1,000 in last 24 hours
5. Accounts receivable aging summary
6. Accounts payable aging summary

**Storage format in document_chunks:**
- `doc_category`: `'financial'`
- `doc_type`: `'quickbooks_pl'`, `'quickbooks_cashflow'`, `'quickbooks_transactions'`, etc.
- `source_id`: `'qb_{report_type}_{team_id}_{date}'` (for deduplication)
- `content`: Human-readable text summary of the financial data (this is what gets vectorized and searched by the AI)

**Example content for a P&L chunk:**
```
QuickBooks Profit & Loss Report - January 2026
Company: Acme Corp

Total Income: $125,000.00
  - Sales: $100,000.00
  - Service Revenue: $25,000.00

Cost of Goods Sold: $45,000.00
Gross Profit: $80,000.00

Total Expenses: $52,000.00
  - Payroll: $30,000.00
  - Rent: $8,000.00
  - Marketing: $5,000.00
  - Other: $9,000.00

Net Income: $28,000.00
Net Profit Margin: 22.4%

Period: January 1 - January 31, 2026
Accounting Method: Accrual
```

### QuickBooks OAuth Credential Management

QuickBooks uses OAuth 2.0. Tokens expire every ~1 hour and must be refreshed. Options:

**Option A (Recommended): n8n Manages Credentials**
Use n8n's built-in QuickBooks OAuth credential. The user connects through the n8n credential UI (via the Build Agents page), and n8n handles token refresh automatically.

**Option B: App Manages Credentials**
Build a `quickbooks-oauth-exchange` Supabase Edge Function following the Google/Microsoft pattern. Store tokens in `user_integrations`. The n8n workflow reads tokens from the database. This requires building a separate `quickbooks-refresh-token` edge function.

**Recommendation:** Start with Option A for faster delivery. Migrate to Option B later for a more unified Connected Apps experience.

---

## 5. Priority 2: Slack Workflow

**Customer demand:** High -- top communication integration request
**Integration type:** `n8n_workflow`
**Registry slug:** `slack`
**Doc category:** `communications`

### Workflow A: On-Demand Query (`astra-slack-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-slack-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `list_channels` | List accessible channels | `limit` |
| `read_history` | Get channel message history | `channel_id`, `hours_back` (default 24), `limit` |
| `search_messages` | Search across channels | `query`, `channel_id` (optional), `from_user` (optional) |
| `get_thread` | Get full thread replies | `channel_id`, `thread_ts` |
| `summarize_channel` | AI summary of recent activity | `channel_id`, `hours_back` |

**Example Input:**
```json
{
  "team_id": "abc-123",
  "user_id": "def-456",
  "operation": "search_messages",
  "params": {
    "query": "product launch",
    "hours_back": 168
  }
}
```

**Example Output:**
```json
{
  "success": true,
  "provider": "slack",
  "operation": "search_messages",
  "data": {
    "messages": [
      {
        "channel": "#general",
        "author": "Jane Smith",
        "text": "Product launch is confirmed for March 15th",
        "timestamp": "2026-02-05T14:30:00Z",
        "thread_reply_count": 5,
        "permalink": "https://team.slack.com/archives/..."
      }
    ],
    "total_results": 12
  },
  "metadata": {
    "fetched_at": "2026-02-07T12:00:00Z",
    "records_count": 12
  }
}
```

**n8n Workflow Nodes:**
1. **Webhook Trigger**
2. **HTTP Request (Supabase)** -- Fetch Slack bot token from `user_integrations`
3. **Switch** -- Route by operation
4. **Slack Node** -- n8n native Slack node (conversations.history, search.messages, etc.)
5. **Code Node** -- Transform and filter results
6. **Respond to Webhook**

### Workflow B: Scheduled Sync (`astra-slack-sync`)

**Schedule:** Every 6 hours
**Purpose:** Pull recent channel summaries and store for AI context

**What to sync:**
1. Message counts per channel (last 24h)
2. Key discussions (threads with 5+ replies)
3. Mentions of team-relevant keywords (configurable per team)
4. New channel creations

**Storage:**
- `doc_category`: `'communications'`
- `doc_type`: `'slack_summary'`
- `source_id`: `'slack_summary_{team_id}_{date}'`

### Slack Credential Approach

Slack uses Bot tokens (OAuth 2.0). The team admin installs a Slack app to their workspace, which generates a Bot token.

**Recommended approach:** Create a Slack app in the Slack API portal. Use n8n's native Slack credential with the bot token. Store the bot token in `user_integrations.api_key_encrypted` for the app's awareness.

---

## 6. Priority 3: HubSpot Workflow

**Customer demand:** High -- top CRM request alongside Salesforce
**Integration type:** `n8n_workflow`
**Registry slug:** `hubspot`
**Doc category:** varies (contacts -> `communications`, deals -> `financial`, reports -> `strategy`)

### Workflow: On-Demand Query (`astra-hubspot-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-hubspot-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `list_contacts` | List/search contacts | `query`, `limit`, `properties[]` |
| `get_contact` | Get single contact details | `contact_id` or `email` |
| `list_deals` | List deals by pipeline/stage | `pipeline_id`, `stage`, `limit` |
| `get_deal_pipeline` | Get pipeline summary | `pipeline_id` |
| `get_revenue_summary` | Revenue by period | `start_date`, `end_date` |
| `list_companies` | List company records | `query`, `limit` |
| `get_engagement_history` | Recent activities for contact | `contact_id`, `types[]` |
| `search_crm` | Search across all CRM objects | `query`, `object_types[]` |

**Example Input:**
```json
{
  "team_id": "abc-123",
  "user_id": "def-456",
  "operation": "get_deal_pipeline",
  "params": {
    "pipeline_id": "default"
  }
}
```

**Example Output:**
```json
{
  "success": true,
  "provider": "hubspot",
  "operation": "get_deal_pipeline",
  "data": {
    "pipeline_name": "Sales Pipeline",
    "total_deals": 47,
    "total_value": 890000.00,
    "currency": "USD",
    "stages": [
      { "name": "Qualified", "count": 15, "value": 320000.00 },
      { "name": "Proposal", "count": 12, "value": 250000.00 },
      { "name": "Negotiation", "count": 8, "value": 180000.00 },
      { "name": "Closed Won", "count": 7, "value": 95000.00 },
      { "name": "Closed Lost", "count": 5, "value": 45000.00 }
    ],
    "average_deal_size": 18936.17,
    "win_rate": 58.3
  },
  "metadata": {
    "fetched_at": "2026-02-07T12:00:00Z"
  }
}
```

### Scheduled Sync (`astra-hubspot-sync`)

**Schedule:** Daily at 3 AM
**What to sync:**
1. Deal pipeline summary (stages, values, counts)
2. New contacts added in last 24h
3. Deals that changed stage in last 24h
4. Win/loss ratio for current month
5. Top 10 deals by value

---

## 7. Priority 4: Notion Workflow

**Customer demand:** High -- most requested project management/knowledge base tool
**Integration type:** `n8n_workflow`
**Registry slug:** `notion`
**Doc category:** `projects` (or `strategy` depending on content)

### Workflow: On-Demand Query (`astra-notion-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-notion-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `search_pages` | Search workspace | `query`, `filter_type` (page/database) |
| `get_page` | Get page content | `page_id` |
| `list_databases` | List all Notion databases | none |
| `query_database` | Query a specific database | `database_id`, `filter`, `sorts` |
| `get_recent` | Recently edited pages | `hours_back`, `limit` |

**Example Input:**
```json
{
  "team_id": "abc-123",
  "user_id": "def-456",
  "operation": "search_pages",
  "params": {
    "query": "Q1 OKRs"
  }
}
```

**Example Output:**
```json
{
  "success": true,
  "provider": "notion",
  "operation": "search_pages",
  "data": {
    "results": [
      {
        "page_id": "notion-page-id",
        "title": "Q1 2026 OKRs",
        "last_edited": "2026-02-05T10:00:00Z",
        "content_preview": "Objective 1: Launch new product line...",
        "url": "https://notion.so/...",
        "parent_database": "Company Goals"
      }
    ],
    "total_results": 3
  },
  "metadata": {
    "fetched_at": "2026-02-07T12:00:00Z",
    "records_count": 3
  }
}
```

### Scheduled Sync (`astra-notion-sync`)

**Schedule:** Every 12 hours
**What to sync:**
1. All pages modified in the last 24 hours
2. Extract full page content as markdown
3. Store each page as a document chunk

**Storage:**
- `doc_category`: Classify based on content (strategy, projects, etc.) using AI classification in the workflow
- `doc_type`: `'notion_page'` or `'notion_database_entry'`
- `source_id`: `'notion_{page_id}'`

This is high value because Notion typically contains company wikis, SOPs, project plans, and OKRs -- exactly the kind of data users want the AI to know about.

---

## 8. Priority 5: Xero Workflow

**Customer demand:** Frequently mentioned alongside QuickBooks
**Integration type:** `n8n_workflow`
**Registry slug:** `xero`
**Doc category:** `financial`

### Workflow: On-Demand Query (`astra-xero-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-xero-query`

**Operations:** Mirror QuickBooks operations:

| Operation | Description |
|-----------|-------------|
| `get_profit_loss` | P&L for date range |
| `get_balance_sheet` | Balance sheet |
| `list_transactions` | Bank transactions |
| `get_revenue_summary` | Revenue by period |
| `get_expense_breakdown` | Expenses by category |
| `get_invoices` | Outstanding invoices |
| `get_bills` | Outstanding bills |

Structure is identical to QuickBooks -- same input/output contracts. The n8n workflow uses n8n's native Xero node instead of QuickBooks node.

### Scheduled Sync

Same pattern as QuickBooks: daily P&L, cash flow, major transactions.

---

## 9. Priority 6: Stripe Workflow

**Customer demand:** Medium -- SaaS/subscription businesses
**Integration type:** `api_key` (Stripe uses API keys, not OAuth)
**Registry slug:** `stripe`
**Doc category:** `financial`

### Workflow: On-Demand Query (`astra-stripe-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-stripe-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `get_mrr` | Monthly recurring revenue | none |
| `get_subscription_metrics` | Active subs, churn, growth | `period` |
| `list_recent_charges` | Recent payments | `limit`, `status` |
| `get_revenue_by_period` | Revenue by month/quarter | `periods`, `granularity` |
| `list_failed_payments` | Failed/disputed charges | `limit` |
| `get_customer_metrics` | Customer count, LTV | none |

**Credential approach:** User provides their Stripe Secret Key via the Connected Apps UI. Stored in `user_integrations.api_key_encrypted`. The workflow reads the key and uses it directly with Stripe's API (or n8n's native Stripe node).

### Scheduled Sync

**Schedule:** Daily at 4 AM
**What to sync:**
1. MRR and subscriber count
2. Failed payments requiring attention
3. Significant charges (> configurable threshold)
4. Churn events in last 24h

---

## 10. Priority 7: GoHighLevel Workflow

**Customer demand:** Specifically requested for marketing campaigns
**Integration type:** `n8n_workflow`
**Registry slug:** `gohighlevel`
**Doc category:** `communications` / `strategy`

### Workflow: On-Demand Query (`astra-gohighlevel-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-gohighlevel-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `list_contacts` | Search/list contacts | `query`, `limit`, `tags[]` |
| `get_pipeline` | Pipeline stages & deals | `pipeline_id` |
| `get_campaign_stats` | Campaign performance | `campaign_id` |
| `list_opportunities` | Sales opportunities | `pipeline_id`, `stage` |
| `get_conversation_summary` | Recent conversations | `contact_id`, `limit` |

**Credential approach:** GoHighLevel supports OAuth2. Use n8n's native credential or store API key in `user_integrations`.

---

## 11. Priority 8: Salesforce Workflow

**Customer demand:** Enterprise users
**Integration type:** `n8n_workflow`
**Registry slug:** `salesforce`
**Doc category:** varies by object type

### Workflow: On-Demand Query (`astra-salesforce-query`)

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-salesforce-query`

**Operations:**

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `soql_query` | Execute SOQL query | `query` (SOQL string) |
| `list_opportunities` | Get opportunities | `stage`, `close_date_range`, `limit` |
| `get_account` | Get account details | `account_id` |
| `get_pipeline_report` | Pipeline summary | `forecast_category` |
| `list_leads` | Recent leads | `status`, `source`, `limit` |
| `get_dashboard_metrics` | Key KPIs | none |

---

## 12. Priority 9: Fireflies.ai Workflow

**Customer demand:** High -- eliminates manual transcript downloads
**Integration type:** `n8n_workflow`
**Registry slug:** `fireflies`
**Doc category:** `meetings`

### Workflow: Scheduled Sync (`astra-fireflies-sync`)

This is primarily a SYNC workflow rather than on-demand query, because meeting transcripts are batch content.

**Webhook:** `POST https://n8n.rockethub.ai/webhook/astra-fireflies-sync`
**Schedule:** Every 6 hours (or webhook-triggered when new transcript is ready)

**Flow:**
1. Query Fireflies API for transcripts since last sync
2. For each new transcript:
   a. Download full transcript text
   b. Extract: title, date, attendees, duration, summary, action items
   c. Chunk transcript into ~1000 token segments
   d. Write chunks to `document_chunks` with:
      - `doc_category`: `'meetings'`
      - `doc_type`: `'fireflies_transcript'`
      - `source_id`: `'fireflies_{transcript_id}'`
   e. Write parent record to `documents` table
3. Update `user_integrations.last_synced_at`

### On-Demand Query (`astra-fireflies-query`)

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `list_transcripts` | Recent meeting transcripts | `limit`, `from_date` |
| `get_transcript` | Full transcript content | `transcript_id` |
| `get_action_items` | Action items from meetings | `from_date`, `limit` |
| `search_transcripts` | Search across all transcripts | `query` |

---

## 13. Priority 10: Monday.com / Asana / Trello Workflows

These three project management tools follow the same pattern with provider-specific API nodes.

### Standard Operations (All Three)

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `list_projects` | List boards/projects | `limit` |
| `get_project` | Get project details + tasks | `project_id` |
| `list_tasks` | Tasks with filters | `project_id`, `status`, `assignee`, `due_before` |
| `get_task` | Single task details | `task_id` |
| `search` | Search across workspace | `query` |
| `get_overdue_tasks` | Tasks past due date | `assignee` (optional) |

### Webhook Names

- Monday.com: `astra-monday-query` and `astra-monday-sync`
- Asana: `astra-asana-query` and `astra-asana-sync`
- Trello: `astra-trello-query` and `astra-trello-sync`

### Scheduled Sync (All Three)

**Schedule:** Every 12 hours
**What to sync:**
1. All projects and their current status
2. Tasks due in the next 7 days
3. Tasks completed in the last 24 hours
4. Overdue tasks

**Storage:**
- `doc_category`: `'projects'`
- `doc_type`: `'monday_board'`, `'asana_project'`, `'trello_board'`

---

## 14. Priority 11: Mailchimp Workflow

**Customer demand:** Medium -- marketing analytics
**Integration type:** `n8n_workflow`
**Registry slug:** `mailchimp`
**Doc category:** `communications` / `strategy`

### Workflow: On-Demand Query (`astra-mailchimp-query`)

| Operation | Description | Key Params |
|-----------|-------------|------------|
| `list_campaigns` | Recent campaigns | `status`, `limit` |
| `get_campaign_report` | Detailed campaign stats | `campaign_id` |
| `get_audience_stats` | List/audience metrics | `list_id` |
| `get_subscriber_growth` | Growth trends | `period` |

---

## 15. Integration Registry Updates

When each workflow is deployed, the `integration_registry` table must be updated with the workflow's URL and ID.

### SQL to run after deploying each workflow:

```sql
-- Example for QuickBooks
UPDATE integration_registry
SET
  n8n_webhook_url = 'https://n8n.rockethub.ai/webhook/astra-quickbooks-query',
  n8n_workflow_id = 'your_n8n_workflow_id_here',
  status = 'beta'
WHERE provider_slug = 'quickbooks';
```

Repeat for each provider as workflows are deployed. Change `status` from `'coming_soon'` to `'beta'` during testing, then to `'available'` when ready for all users.

### How the Agent Uses the Registry

The `team-agent-chat` edge function already queries connected integrations at conversation start and injects them into the AI system prompt. When a user has QuickBooks connected and asks a financial question, the AI sees:

```
Connected Integrations:
- QuickBooks Online (accounting): read_financials, read_transactions, read_reports
  Status: active | Last used: 2 hours ago | Times used: 47

Available (Not Connected):
- Slack (communication): read_messages, read_channels, search_messages
- Notion (project_management): read_pages, search_content, read_databases
```

The agent then knows it CAN fetch real QuickBooks data and returns a `send_to_agent` action that tells the main n8n chat workflow to call the QuickBooks webhook.

### How the Main Chat Workflow Routes to Integration Webhooks

The main chat n8n workflow (Workflow A) needs a new routing layer:

1. **AI Agent node** analyzes the user's message + context
2. **IF the AI determines external data is needed**, it returns a structured tool call:
   ```json
   {
     "tool": "integration_query",
     "provider": "quickbooks",
     "operation": "get_profit_loss",
     "params": { "start_date": "2026-01-01", "end_date": "2026-01-31" }
   }
   ```
3. **Switch node** routes to the appropriate integration webhook based on `provider`
4. **HTTP Request node** calls `https://n8n.rockethub.ai/webhook/astra-{provider}-query`
5. **Response feeds back** into the AI agent for final answer generation

---

## 16. Data Vectorization Pipeline

### How Synced Data Becomes Searchable

The overnight assistant and real-time AI use vector similarity search to find relevant content. Here is the pipeline:

```
Integration Sync Workflow
    |-- Pulls raw data from external API (QuickBooks, Slack, etc.)
    |-- Transforms to human-readable text
    |-- Writes to document_chunks table
    v
Existing Vectorization Pipeline (already built)
    |-- Generates embeddings for new chunks
    |-- Stores embeddings in the 'embedding' column
    v
AI Agent Query
    |-- User asks question
    |-- Agent performs vector similarity search on document_chunks
    |-- Finds relevant financial/project/communication data
    |-- Generates informed response
```

### Content Formatting Guidelines

When writing to `document_chunks`, the `content` field should be:

1. **Human-readable text** -- Not raw JSON or API responses
2. **Rich with context** -- Include dates, names, amounts, categories
3. **Structured but natural** -- Use headers, bullet points, key-value pairs
4. **Appropriately sized** -- Each chunk should be 500-2000 tokens
5. **Deduplication-aware** -- Use `source_id` and `content_hash` to avoid duplicates

### Doc Category Mapping

| Integration | Primary doc_category | Secondary categories |
|-------------|---------------------|---------------------|
| QuickBooks | `financial` | - |
| Xero | `financial` | - |
| Stripe | `financial` | - |
| Slack | `communications` | - |
| HubSpot | `strategy` | `communications` |
| Salesforce | `strategy` | `financial` |
| GoHighLevel | `communications` | `strategy` |
| Notion | `projects` | `strategy` |
| Monday.com | `projects` | - |
| Asana | `projects` | - |
| Trello | `projects` | - |
| Fireflies | `meetings` | - |
| Otter.ai | `meetings` | - |
| Mailchimp | `communications` | `strategy` |

---

## 17. Testing & Validation

### For Each Workflow, Verify:

1. **Authentication:** Workflow correctly retrieves and uses stored credentials
2. **All operations:** Each operation returns data in the standard output format
3. **Error handling:** Expired tokens return `TOKEN_EXPIRED` error code
4. **Error handling:** Rate limits are handled gracefully with retry
5. **Error handling:** Network failures return meaningful errors
6. **Status updates:** `user_integrations` table is updated after each use
7. **Audit logging:** `integration_audit_log` receives entries
8. **Data format:** Synced data in `document_chunks` is properly formatted text (not raw JSON)
9. **Deduplication:** Running sync twice doesn't create duplicate chunks
10. **Performance:** Webhook responds within 30 seconds for on-demand queries

### Test from the App

1. Connect the integration via Connected Apps page
2. Ask the AI assistant a question that requires that integration's data
3. Verify the agent correctly identifies the need for external data
4. Verify the main chat workflow routes to the integration webhook
5. Verify data comes back and is included in the AI response
6. Check `user_integrations` table for updated `last_used_at` and `times_used_by_agent`
7. Check `integration_audit_log` for the query event

### Webhook Testing (Direct)

Use Postman or similar to test each webhook directly:

```bash
curl -X POST https://n8n.rockethub.ai/webhook/astra-quickbooks-query \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "test-team-id",
    "user_id": "test-user-id",
    "operation": "get_profit_loss",
    "params": {
      "start_date": "2026-01-01",
      "end_date": "2026-01-31"
    }
  }'
```

---

## Summary: Complete Workflow List

| # | Workflow Name | Webhook Path | Type | n8n Node | Priority |
|---|-------------|-------------|------|----------|----------|
| 1 | QuickBooks Query | `astra-quickbooks-query` | On-demand | QuickBooks | Highest |
| 2 | QuickBooks Sync | `astra-quickbooks-sync` | Scheduled (daily) | QuickBooks | Highest |
| 3 | Slack Query | `astra-slack-query` | On-demand | Slack | High |
| 4 | Slack Sync | `astra-slack-sync` | Scheduled (6h) | Slack | High |
| 5 | HubSpot Query | `astra-hubspot-query` | On-demand | HubSpot | High |
| 6 | HubSpot Sync | `astra-hubspot-sync` | Scheduled (daily) | HubSpot | High |
| 7 | Notion Query | `astra-notion-query` | On-demand | Notion | High |
| 8 | Notion Sync | `astra-notion-sync` | Scheduled (12h) | Notion | High |
| 9 | Xero Query | `astra-xero-query` | On-demand | Xero | Medium |
| 10 | Xero Sync | `astra-xero-sync` | Scheduled (daily) | Xero | Medium |
| 11 | Stripe Query | `astra-stripe-query` | On-demand | Stripe | Medium |
| 12 | Stripe Sync | `astra-stripe-sync` | Scheduled (daily) | Stripe | Medium |
| 13 | GoHighLevel Query | `astra-gohighlevel-query` | On-demand | HTTP Request | Medium |
| 14 | Salesforce Query | `astra-salesforce-query` | On-demand | Salesforce | Medium |
| 15 | Salesforce Sync | `astra-salesforce-sync` | Scheduled (daily) | Salesforce | Medium |
| 16 | Fireflies Sync | `astra-fireflies-sync` | Scheduled (6h) | HTTP Request | Medium |
| 17 | Fireflies Query | `astra-fireflies-query` | On-demand | HTTP Request | Medium |
| 18 | Monday.com Query | `astra-monday-query` | On-demand | Monday.com | Lower |
| 19 | Monday.com Sync | `astra-monday-sync` | Scheduled (12h) | Monday.com | Lower |
| 20 | Asana Query | `astra-asana-query` | On-demand | Asana | Lower |
| 21 | Asana Sync | `astra-asana-sync` | Scheduled (12h) | Asana | Lower |
| 22 | Trello Query | `astra-trello-query` | On-demand | Trello | Lower |
| 23 | Trello Sync | `astra-trello-sync` | Scheduled (12h) | Trello | Lower |
| 24 | Mailchimp Query | `astra-mailchimp-query` | On-demand | Mailchimp | Lower |

**Total: 24 workflows across 12 integrations**

---

## App-Side Changes Required After Workflows Are Built

Once n8n workflows are deployed, the following app changes are needed:

1. **Update `integration_registry`** -- Set `n8n_webhook_url` and `n8n_workflow_id` for each provider, change `status` to `'available'`

2. **Update `n8n-proxy` edge function** -- The `N8N_WEBHOOK_BASE` should point to `https://n8n.rockethub.ai/webhook` (consolidate from legacy host)

3. **Add integration webhook routing to main chat workflow** -- The main n8n chat workflow needs a Switch node that recognizes when the AI requests external data and calls the appropriate integration webhook

4. **Build credential storage UI** -- For API-key-based integrations (Stripe, GoHighLevel), add a secure input field in the Connected Apps page that stores the key via edge function

5. **Build OAuth flows for new providers** -- For OAuth-based integrations not covered by n8n's built-in credentials (if using Option B credential management), create `{provider}-oauth-exchange` edge functions

6. **Update overnight assistant** -- The `process-overnight-assistant` edge function already has integration awareness. Once data starts flowing into `document_chunks`, the overnight assistant will automatically benefit from richer financial, communication, and project data.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-07
**Status:** Ready for Development
**Estimated Effort:** 2-3 weeks for top 4 priorities (QuickBooks, Slack, HubSpot, Notion), then 3-4 weeks for the rest
