# Agent-Guided External App Integration Plan

## Key Architectural Decision: OAuth Apps vs. AI-Driven Connections

This is the most critical question, and the answer is: you need BOTH, but in different proportions depending on the service.

- **OAuth is mandatory** for any service that accesses user data (Google Calendar, Outlook Calendar, HubSpot, Notion, Monday, QuickBooks). These services will not let an AI agent "figure out" how to connect -- they require registered OAuth applications with client IDs and secrets. The user must explicitly grant consent through the provider's consent screen. This is a security and legal requirement, not a technical limitation.

- **The AI assistant's role** is to be the conversational guide that identifies WHICH service the user wants, walks them through the connection steps, triggers the right OAuth flow, and confirms success. Think of the assistant as the "concierge" -- it does not pick the lock, it hands the user the right key and shows them which door to use.

- **API key-based connections** (some services like GoHighLevel or custom APIs) can be more AI-guided, where the assistant asks the user for their API key and the system stores it securely. But even here, the assistant cannot "research and discover" how to connect to an arbitrary system at runtime -- that would be unreliable and a security risk.

### The "USB Interface" Principle

Rather than building static, hard-coded integrations, the system treats tools as **standardized modules** the agent can discover and plug in. The Model Context Protocol (MCP) acts as the universal interface -- each tool provides its own schema describing what functions it offers, how to call them, and what they return. Our software doesn't need to "know" how every service works internally; it just needs to know how to talk to an MCP server.

This transforms the platform from a fixed set of integrations into an **extensible agent ecosystem** where new tools can be added without code changes.

---

## 1. Integration Registry and Connection Framework

This is the foundational layer that makes everything else possible.

### Tool Registry: `integration_registry`

```sql
CREATE TABLE integration_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider identity
  provider_slug text UNIQUE NOT NULL,          -- 'google_calendar', 'hubspot', 'notion', etc.
  provider_name text NOT NULL,                 -- Display name
  provider_logo_url text,
  provider_description text,
  provider_category text NOT NULL CHECK (provider_category IN (
    'calendar', 'crm', 'project_management', 'communication',
    'accounting', 'storage', 'analytics', 'custom', 'mcp'
  )),

  -- Connection configuration
  auth_type text NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'mcp', 'n8n_workflow')),
  oauth_scopes text[],                         -- Required OAuth scopes
  api_base_url text,
  token_refresh_endpoint text,
  setup_instructions text,                     -- Shown to user during connection

  -- MCP-specific fields
  mcp_server_url text,                         -- URL of the MCP server
  mcp_server_schema jsonb,                     -- Cached schema (functions, descriptions, params)
  mcp_last_schema_refresh timestamptz,

  -- Capabilities this integration provides
  capabilities text[] NOT NULL DEFAULT '{}',   -- ['read_calendar', 'write_events', 'read_contacts']
  capability_descriptions jsonb,               -- Human-readable descriptions of each capability

  -- Status
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN (
    'available', 'beta', 'coming_soon', 'deprecated'
  )),
  requires_admin boolean DEFAULT false,        -- Does team admin need to enable this?

  -- n8n bridge fields
  n8n_workflow_id text,                        -- For n8n-bridged integrations
  n8n_webhook_url text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### User Connections: `user_integrations`

```sql
CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  integration_id uuid NOT NULL REFERENCES integration_registry(id),

  -- Connection credentials (encrypted)
  access_token_encrypted text,
  refresh_token_encrypted text,
  api_key_encrypted text,
  token_expires_at timestamptz,
  token_last_refreshed_at timestamptz,

  -- Connection metadata
  connected_account_email text,
  connected_account_name text,
  connection_metadata jsonb,                   -- Provider-specific metadata (org ID, workspace, etc.)

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'error', 'disconnected', 'pending_setup'
  )),
  last_error text,
  last_used_at timestamptz,
  last_synced_at timestamptz,

  -- Agent interaction tracking
  connected_via text DEFAULT 'ui',             -- 'ui', 'assistant', 'auto_suggestion'
  times_used_by_agent integer DEFAULT 0,       -- How many times the agent has used this connection
  last_agent_use_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, integration_id)
);
```

Build a unified integration service layer (similar to how `unified-drive-utils.ts` works today) that abstracts connection management across all providers.

---

## 2. OAuth Application Setup (Per-Provider)

Each external service requires a registered OAuth app on YOUR side. This is unavoidable.

- **Google Calendar**: Extend the existing Google OAuth app -- you already have `google-drive-oauth-exchange` and scopes for Drive. Add Google Calendar scopes (`calendar.readonly`, `calendar.events`) as an additional consent screen, or create a separate OAuth flow for calendar specifically
- **Microsoft Outlook Calendar**: Extend the existing Microsoft Graph OAuth -- you already have `microsoft-graph-oauth-exchange`. Add calendar scopes (`Calendars.ReadWrite`) to the existing Microsoft integration
- **Notion**: Register an OAuth app at notion.so/my-integrations. Create a new `notion-oauth-exchange` edge function following the same pattern as your Google/Microsoft ones
- **Monday.com**: Register an OAuth app in Monday's developer portal. Create a `monday-oauth-exchange` edge function
- **HubSpot**: Register an OAuth app in HubSpot's developer portal. Create a `hubspot-oauth-exchange` edge function
- **GoHighLevel**: Supports OAuth2 -- register in their marketplace. Create a `gohighlevel-oauth-exchange` edge function
- **QuickBooks**: Register via Intuit Developer portal. Create a `quickbooks-oauth-exchange` edge function. QuickBooks is particularly strict about OAuth security and requires periodic reauthorization
- For each provider, create a pair of edge functions: `{provider}-oauth-exchange` (handles initial token exchange) and `{provider}-refresh-token` (handles token refresh), following the existing Google/Microsoft pattern exactly

---

## 3. Agent-Suggested Connection Flow

This is the key shift from the research: instead of a static "Integrations" page where users browse and connect, the **assistant proactively suggests connections** when it detects a need.

### How the Agent Suggests Connections

During the overnight reasoning protocol (see PROACTIVE_ASSISTANT_PLAN.md, Part 2), the assistant checks what tools are available and what the user's data suggests they need:

```
Agent internal reasoning:
  1. User has 15 "To-Do" mentions in recent meeting transcripts
  2. Check integration_registry: is 'google_calendar' available? YES
  3. Check user_integrations: is user connected to google_calendar? NO
  4. Proactive suggestion: "I noticed a lot of action items in your meetings.
     If you connect your Google Calendar, I can automatically block out time
     to complete them. Want me to set that up?"
```

### The Conversational Connection Flow

The existing pattern works well and should be enhanced with proactive suggestions:

- **Reactive flow** (user asks):
  - User: "Can you connect to my calendar?"
  - Assistant: "I can help with that! Which calendar service do you use? Google Calendar, Outlook/Microsoft 365, or Apple Calendar?"
  - User: "Google Calendar"
  - Assistant: "I will open a Google authorization window. Please sign in and allow AI Rocket to view and manage your calendar events." [Action: initiate_integration -> google_calendar]
  - On callback: "Your Google Calendar is now connected! I can see you have 12 events this week. Would you like me to summarize your schedule?"

- **Proactive flow** (agent suggests):
  - Agent (overnight or environment scan): "I noticed you've been manually tracking client meetings in your documents. If you connect your Google Calendar, I can automatically pull meeting data and match it with your client files. Want to set this up?" [Action: suggest_integration -> google_calendar]
  - The user can accept (triggers OAuth flow) or dismiss (noted in Strategic Identity as "dismissed google_calendar suggestion" to avoid repeating)

- **API-key flow** (guided by assistant):
  - User: "I want to connect GoHighLevel"
  - Assistant: "To connect GoHighLevel, I will need your API key. You can find it in GoHighLevel under Settings > Business Profile > API Key. Once you have it, paste it here and I will securely store it."
  - User provides key, assistant calls `store-integration-credential` edge function
  - Assistant confirms: "Connected! I can now access your GoHighLevel contacts and pipelines."

### Agent Action Types for Integrations

```typescript
type: 'initiate_integration'   // User explicitly asked, trigger OAuth flow
    | 'suggest_integration'    // Agent proactively suggests, user can accept/dismiss
    | 'disconnect_integration' // User wants to remove a connection
```

---

## 4. Dynamic Tool Discovery via MCP

This is the "USB interface" concept from the research -- the architecture that makes the platform extensible without code changes.

### How MCP Tool Discovery Works

1. An MCP server (hosted externally or self-hosted) exposes a schema describing its available functions
2. When the agent starts a reasoning loop, it queries `integration_registry` for all MCP-type integrations the user has connected
3. For each connected MCP integration, the agent loads the cached schema from `mcp_server_schema`
4. These tools are injected into the agent's active toolset for that session
5. The agent can then call MCP functions as needed during its reasoning

### MCP Schema Caching

Rather than querying MCP servers on every agent invocation, cache the schema and refresh periodically:

```sql
-- Refresh MCP schemas weekly or on demand
-- The process-environment-scan edge function (from PROACTIVE_ASSISTANT_PLAN.md)
-- can include an MCP schema refresh check
```

### MCP Server Management

Team admins can add custom MCP servers through the admin UI:

1. Admin provides an MCP server URL
2. System fetches the server's schema (available functions, parameters, descriptions)
3. Schema is stored in `integration_registry.mcp_server_schema`
4. The integration becomes available to team members
5. When the agent needs a tool, it checks available MCP servers and their capabilities

### n8n as the MCP Bridge

For services that don't have native MCP servers, n8n acts as the bridge:

- n8n has 400+ pre-built connectors
- Create n8n workflows that expose specific functionality via webhooks
- Register these as "n8n_workflow" type integrations in the registry
- The agent calls them through the existing `n8n-proxy` edge function
- This lets you rapidly add new integrations without writing custom code

### Priority Tiers for Integration Methods

| Tier | Method | When to Use | Examples |
|---|---|---|---|
| 1 | Native OAuth | Top 6-8 most-requested services | Google Calendar, Outlook, HubSpot |
| 2 | n8n Workflows | Next tier, rapid implementation | Monday.com, Notion, Slack, QuickBooks |
| 3 | MCP Servers | Advanced/custom/extensible | Custom APIs, niche tools, user-added services |

---

## 5. Adaptive Skill Generation ("The Molt")

This is the most advanced concept from the research: when the agent encounters a problem it doesn't have a tool for, it can create a new capability.

### How It Works

When the agent hits a "no tool available" wall during its reasoning:

1. **Detection**: The agent identifies a missing capability (e.g., "I need to parse this specific CSV format" or "I need to calculate a custom financial ratio")
2. **Skill Request**: The agent calls a `generate-agent-skill` edge function with a description of what it needs
3. **Generation**: The edge function uses Gemini to write a small, self-contained function (JavaScript snippet or SQL query) that solves the specific problem
4. **Storage**: The new skill is saved to a `user_agent_skills` table
5. **Execution**: Future agent runs can pull and execute this skill via an edge function runner
6. **Review**: All generated skills are flagged for admin review before becoming "trusted"

### Database Schema: `user_agent_skills`

```sql
CREATE TABLE user_agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  created_by_user_id uuid REFERENCES auth.users(id),

  -- Skill definition
  skill_name text NOT NULL,
  skill_description text NOT NULL,             -- What this skill does, in plain English
  skill_type text NOT NULL CHECK (skill_type IN (
    'sql_query', 'data_transform', 'calculation', 'formatter', 'analyzer'
  )),
  skill_code text NOT NULL,                    -- The generated code/query
  skill_input_schema jsonb,                    -- Expected input format
  skill_output_schema jsonb,                   -- Expected output format

  -- Origin tracking
  generated_by text DEFAULT 'agent',           -- 'agent', 'admin', 'template'
  generation_prompt text,                      -- What the agent asked for
  generation_context text,                     -- Why the agent needed this

  -- Trust and safety
  is_reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  is_trusted boolean DEFAULT false,            -- Only trusted skills run without approval
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  last_execution_result text,

  -- Status
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Safety Guardrails

This is where the "Human-in-the-loop" principle from PROACTIVE_ASSISTANT_PLAN.md applies:

- **New skills** always require admin review before becoming "trusted"
- **Untrusted skills** can only run in a sandboxed preview mode -- agent shows the user what it WOULD produce
- **Skill code** is limited to read-only operations (SELECT queries, data transforms) -- no INSERT/UPDATE/DELETE unless explicitly approved
- **Execution limits**: Skills have a timeout (5 seconds max) and result size cap (1MB)
- **Audit trail**: Every skill execution is logged with input, output, and duration

### How Skills Grow the Platform

Over time, a team accumulates custom skills that make the agent increasingly capable for their specific business:

```
Month 1: Agent generates a "Calculate gross margin by product line" SQL query
Month 2: Agent generates a "Parse our custom invoice CSV format" transformer
Month 3: Agent generates a "Score leads by our company's criteria" analyzer
Month 4: Agent combines all three into a quarterly financial analysis

The agent has effectively "molted" -- it can now do things it couldn't when first deployed.
```

---

## 6. Security and Credential Management

Critical for handling multiple providers' credentials safely.

- All OAuth client secrets and API keys must be stored as Supabase Edge Function environment variables (secrets), never in client-side code
- User tokens and API keys stored in the database must be encrypted at rest using pgcrypto or Supabase Vault
- Implement per-integration RLS policies so teams can only access their own connections
- Add audit logging for all integration actions (connect, disconnect, token refresh, API calls)
- Implement token rotation and expiry monitoring -- a scheduled edge function (similar to `refresh-google-tokens`) that proactively refreshes tokens before they expire
- The assistant should NEVER display, echo, or log raw API keys or tokens in conversation

### Credential Audit Table

```sql
CREATE TABLE integration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  integration_id uuid REFERENCES integration_registry(id),

  action text NOT NULL CHECK (action IN (
    'connect', 'disconnect', 'token_refresh', 'api_call',
    'credential_store', 'credential_rotate', 'error',
    'agent_use', 'skill_execute'
  )),
  action_details jsonb,
  ip_address text,
  success boolean DEFAULT true,
  error_message text,

  created_at timestamptz DEFAULT now()
);
```

---

## 7. Context Injection: Making Connections Useful to the Agent

Connected integrations are only valuable if the agent actually uses them during reasoning. Here's how connections flow into the agent's context:

### At Agent Startup (Every Reasoning Loop)

When the team-agent-chat or process-overnight-assistant edge function starts:

1. Query `user_integrations` WHERE `status = 'active'` for this user
2. For each active connection, look up capabilities from `integration_registry`
3. Build a "connected tools" context block:

```
Connected Tools Available:
- Google Calendar (read_calendar, write_events): Access to 12 upcoming events
- HubSpot (read_contacts, read_deals): 247 contacts, 34 active deals
- GoHighLevel (read_pipeline): Connected to "Sales Pipeline" workspace

Custom Skills Available:
- "Calculate gross margin by product line" (SQL, trusted, used 14 times)
- "Parse invoice CSV format" (transformer, trusted, used 8 times)
```

4. Inject this into the agent's system prompt so it knows what tools it can use
5. Provide function-calling schemas for each connected tool so the agent can invoke them

### Tool Usage Tracking

Every time the agent uses a connected tool, increment `user_integrations.times_used_by_agent` and update `last_agent_use_at`. This data feeds back into:
- The Strategic Identity (from PROACTIVE_ASSISTANT_PLAN.md) -- "This user's agent frequently uses HubSpot data"
- Proactive suggestions -- "You haven't used your Notion connection in 30 days. Would you like to keep it active?"
- Usage analytics for the admin dashboard

---

## 8. Frontend Integration Management UI

Give users visibility and control over their connections.

- **IMPLEMENTED**: Connect page with tabbed layout (My Connections, Apps, MCP Tools)
- **IMPLEMENTED**: My Connections tab provides full management: connect new providers, reconnect expired tokens, manage/add/remove folders, and disconnect providers
- Display a grid of available integrations with connection status (connected, disconnected, error, coming_soon)
- Each integration card shows: provider logo, name, connection status, last synced, connected account email, agent usage count, and disconnect button
- The assistant's `initiate_integration` action opens the same OAuth flow that the UI's "Connect" button would trigger
- **IMPLEMENTED**: Skills panel with "Suggest New Skill" feature for users to submit skill ideas as feedback
- For MCP integrations, include an "Add Custom Tool" flow for admins to register new MCP server URLs
- Connect page is accessible as a tab in Agent Tools on Mission Control

---

## 9. Priority Implementation Order

### Phase 1: Core Registry + Calendar Integrations
- Create `integration_registry`, `user_integrations`, `integration_audit_log` tables
- Seed registry with Google Calendar and Outlook Calendar entries
- Extend existing Google/Microsoft OAuth flows to include calendar scopes
- Build `integration-oauth-exchange` generic edge function
- Add `initiate_integration` agent action type to team-agent-chat
- Build basic "Connected Apps" UI in settings

### Phase 2: Agent-Suggested Connections
- Add `suggest_integration` agent action type
- Integrate connection awareness into overnight reasoning protocol (check what's connected vs. what could help)
- Track suggestion dismissals in Strategic Identity to avoid repeating
- Add CRM integrations (HubSpot, GoHighLevel)

### Phase 3: n8n Bridge Integrations
- Build n8n workflow templates for Notion, Monday.com, Slack, QuickBooks
- Register as n8n_workflow type integrations in registry
- Agent can trigger these via existing n8n-proxy edge function
- Rapidly expand available integrations without custom code

### Phase 4: MCP Tool Discovery
- Build MCP schema fetching and caching in integration_registry
- Allow admins to add custom MCP server URLs
- Inject MCP tools into agent context at runtime
- Build "Tool Marketplace" UI for browsing and connecting MCP tools

### Phase 5: Adaptive Skill Generation
- Create `user_agent_skills` table
- Build `generate-agent-skill` edge function
- Build sandboxed skill execution environment
- Admin review and approval workflow
- Skill usage tracking and effectiveness metrics

---

## Open Questions

1. Which 3-4 integrations to prioritize first? Google Calendar and Outlook Calendar are natural starting points since Google and Microsoft OAuth apps are already registered
2. Should the assistant perform ACTIONS on connected services (create events, update contacts) or initially just READ data? (Recommendation: start read-only, add write actions with human-in-the-loop approval per PROACTIVE_ASSISTANT_PLAN.md Part 7)
3. Can n8n be used as middleware for less common services? This would speed up delivery since n8n has pre-built connectors for HubSpot, Monday, Notion, QuickBooks, and hundreds of others
4. What is the trust model for agent-generated skills? Should all skills require admin review, or can "read-only" skills be auto-trusted?
5. Should MCP server management be limited to super admins, or should team admins be able to add their own MCP servers?

---

---

## Implementation Plan

For the prioritized, customer-demand-driven implementation plan that maps these architectural concepts to specific integrations and phases, see **[MCP_DATA_CONNECTION_STRATEGY.md](./MCP_DATA_CONNECTION_STRATEGY.md)**.

That document synthesizes real customer feedback (from shareholder meetings, 1-1 guided setups, and strategic roadmap sessions) with this architectural framework to produce a phased rollout covering:
- Phase 1: QuickBooks, Calendar, Slack (extend existing infrastructure)
- Phase 2: Integration Registry and Connected Apps UI (foundation)
- Phase 3: n8n Bridge integrations (CRM, Notion, Xero, transcription services)
- Phase 4: MCP Client and Zapier MCP (long-tail coverage)
- Phase 5: API Wizard (competitive differentiator)
- Phase 6: Security and Governance

---

**Document Version:** 2.1
**Last Updated:** 2026-02-06
**Status:** Architecture Approved -- See MCP_DATA_CONNECTION_STRATEGY.md for Implementation Plan
**Research Sources:** OpenClaw agentic architecture patterns, MCP "USB Interface" model, Recursive Skill Generation
