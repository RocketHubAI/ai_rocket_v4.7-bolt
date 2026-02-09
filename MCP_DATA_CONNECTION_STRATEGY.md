# MCP-Powered Data Connection Strategy

## Bridging Customer Demand to Technical Architecture

**Version:** 1.0
**Created:** 2026-02-06
**Status:** Approved for Implementation
**Related Docs:** [AGENT_CONNECTION_PLAN.md](./AGENT_CONNECTION_PLAN.md), [MCP_BACKEND_CLIENT_ARCHITECTURE.md](./MCP_BACKEND_CLIENT_ARCHITECTURE.md), [PROACTIVE_ASSISTANT_PLAN.md](./PROACTIVE_ASSISTANT_PLAN.md)

---

## Strategic Context

Customer feedback from shareholder meetings, 1-1 guided setups, and strategic roadmap sessions consistently identifies **connecting data** as the single biggest pain point and primary choke point preventing users from extracting full value out of AI Rocket.

The platform already has a solid foundation: mature OAuth flows for Google and Microsoft, an n8n proxy pattern, a vectorization pipeline for documents, and a proactive overnight assistant that benefits from richer data. The challenge is scaling to cover the "gazillion different platforms" users need while maintaining quality and security.

This document synthesizes customer demand data with three complementary technical approaches (Native OAuth, n8n Bridge, MCP Protocol) into a prioritized, actionable implementation plan.

### Source Data

- **Meetings:** AI Rocket Intro: Guided Setup 1-1 (Mike Christensen) (2026-02-06)
- **Meetings:** Shareholders: AI Assistant & Agent Feature Preview & Feedback (2026-02-06)
- **Meetings:** Meet with Clay (kelly resendez) (2026-02-06)
- **Meetings:** Meet with Clay (Zan Hasib) (2026-01-23)
- **Meetings:** AI Rocket Intro: Guided Setup 1-1 (David Greiner) (2026-01-21)
- **Meetings:** Meet with Clay (Robert M. Irving Jr.) (2026-01-08)
- **Strategy:** AI_Rocket_Complete_Strategic_Overview_v2.md (2025-12-27)

---

## Customer-Requested Integrations (Ranked by Demand)

### 1. Financial & Accounting (Highest Priority)
- **QuickBooks Online:** By far the most requested. Users currently export CSVs. Automated sync expected within 30 days.
- **Xero:** Frequently mentioned alongside QuickBooks as a primary financial data source.
- **Payroll Services:** General requests, with **Gusto** specifically noted due to its existing API.

### 2. Communication & Collaboration
- **Email (Gmail & Outlook):** Users want email connected for follow-ups and business context. Strategy focuses on high-quality extraction since email is a "noisy" source (~1% usable data).
- **Slack:** Top request for team communication data.
- **WhatsApp & Telegram:** Requested for proactive notifications and external AI communication.

### 3. CRM & Sales/Marketing
- **Salesforce:** Enterprise-leaning users want deep customer data.
- **Go High Level:** Specifically requested for massive email campaigns and inquiry response.
- **HubSpot & Mailchimp:** Marketing performance data and campaign automation.
- **Google Analytics:** Web traffic and conversion data.

### 4. Project Management & Productivity
- **Notion:** Very common request for internal wikis and knowledge bases.
- **Transcription Services (Fireflies & Otter.ai):** Automated meeting data without manual downloads. Otter API integration estimated ~1 month away.
- **Asana, Trello, & Monday.com:** Project timelines and task statuses.

### 5. Specialized & Proprietary Systems
- **ERP Systems:** NetSuite, Oracle, manufacturing-specific "energy" system.
- **Health & Wearables:** Oura Ring (currently via Spike API conduit).
- **Industry Specific:** Builder Trend (construction), proprietary prescription/medical systems.

---

## Three-Layer Integration Architecture

Rather than choosing a single approach, AI Rocket uses three complementary methods, each suited to different integration tiers.

| Tier | Method | When to Use | Examples |
|------|--------|-------------|----------|
| 1 | **Native OAuth** | Top services with existing OAuth apps | Google Calendar, Outlook Calendar (extend existing) |
| 2 | **n8n Bridge** | Most-requested integrations, rapid delivery | QuickBooks, Slack, HubSpot, Notion, Xero, Stripe |
| 3 | **MCP Protocol** | Long-tail, niche, user-extensible | Zapier MCP (6000+ apps), custom APIs, industry tools |

All three methods register through a unified **Integration Registry** so they appear in the same Connected Apps UI and surface to the agent through the same tool discovery mechanism.

---

## Phase 1: Immediate Wins -- Extend What Already Works (Weeks 1-4)

No MCP infrastructure required. Build on existing OAuth patterns and n8n proxy.

### QuickBooks Online (Highest Customer Demand)

- Use n8n as the integration bridge -- n8n has a native QuickBooks node handling OAuth and API calls
- Create n8n webhook workflow accepting queries like "get P&L for last quarter" or "list recent transactions"
- Route through existing `n8n-proxy` edge function
- Store financial summaries in `document_chunks` with `doc_category: 'financial'` for vectorization pipeline
- Enriches overnight assistant's "Deviation Detection" lens with real financial data
- Respect existing `view_financial` permission flag on `users` table

### Google Calendar & Outlook Calendar

- **Google:** Add `calendar.readonly` scope to existing OAuth flow, create `google-calendar-events` edge function
- **Microsoft:** Add `Calendars.Read` to existing Microsoft Graph scopes
- Inject upcoming events into `team-agent-chat` system prompt as part of `AppContext`
- Overnight assistant correlates meeting density with productivity patterns
- Extremely low effort -- token exchange, refresh, and storage patterns already exist in `user_drive_connections`

### Slack (High Demand)

- Use n8n's native Slack node for webhook workflow: read channel history, post messages
- Start read-only: "summarize last 24 hours of #general" or "find messages about [topic]"
- Store summaries in `document_chunks` with `doc_category: 'communications'`
- Proactive assistant detects team communication patterns

---

## Phase 2: Integration Registry -- Foundation for Everything (Weeks 3-6)

### Database Layer

#### `integration_registry` Table
Defines all available integrations regardless of connection method:

```sql
CREATE TABLE integration_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  provider_logo_url text,
  provider_description text,
  provider_category text NOT NULL CHECK (provider_category IN (
    'calendar', 'crm', 'project_management', 'communication',
    'accounting', 'storage', 'analytics', 'custom', 'mcp'
  )),
  auth_type text NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'mcp', 'n8n_workflow')),
  oauth_scopes text[],
  api_base_url text,
  setup_instructions text,
  mcp_server_url text,
  mcp_server_schema jsonb,
  capabilities text[] NOT NULL DEFAULT '{}',
  capability_descriptions jsonb,
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN (
    'available', 'beta', 'coming_soon', 'deprecated'
  )),
  requires_admin boolean DEFAULT false,
  n8n_workflow_id text,
  n8n_webhook_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `user_integrations` Table
Tracks which users/teams have connected which integrations:

```sql
CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  integration_id uuid NOT NULL REFERENCES integration_registry(id),
  access_token_encrypted text,
  refresh_token_encrypted text,
  api_key_encrypted text,
  token_expires_at timestamptz,
  connected_account_email text,
  connected_account_name text,
  connection_metadata jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'error', 'disconnected', 'pending_setup'
  )),
  last_error text,
  last_used_at timestamptz,
  last_synced_at timestamptz,
  connected_via text DEFAULT 'ui',
  times_used_by_agent integer DEFAULT 0,
  last_agent_use_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, integration_id)
);
```

### Admin UI -- "Connected Apps" Page

- New section in Team Settings showing all available integrations as a grid of cards
- Each card: provider logo, name, connection status, last synced, connected account, usage count, disconnect button
- Show "Available" integrations not yet connected with "Connect" CTA
- Use existing tab-based navigation from `TAB_CONFIGS` for Mission Control access

### Agent Awareness

- Update `team-agent-chat` edge function to query `integration_registry` at conversation start
- Inject connected integrations and capabilities into system prompt
- Inject available-but-not-connected integrations so agent can suggest connections
- Track suggestion dismissals in `user_strategic_identity` to avoid repetition

---

## Phase 3: n8n Bridge Integrations -- Rapid Expansion (Weeks 5-10)

Fastest path to covering customer-requested apps. n8n has 400+ native connectors.

### CRM Integrations (Salesforce, HubSpot, GoHighLevel)

- Create n8n workflow templates exposing standard operations: list contacts, get deal pipeline, search engagement history, get revenue summary
- Register in `integration_registry` as `type: 'n8n_workflow'`
- Agent calls through `n8n-proxy` using same pattern as `astra-sync-now`
- GoHighLevel: workflow pulls campaign performance data for Creative Suite AI-generated optimization
- Start read-only for all CRM integrations; add write operations later with explicit user confirmation

### Project Management (Notion, Monday.com, Asana, Trello)

- Notion priority: n8n workflow searches workspace and retrieves page content
- Store in `document_chunks` with `doc_category: 'projects'`
- Overnight assistant's "Goal Alignment" lens becomes much more powerful with actual project status

### Financial Tools (Xero, Stripe)

- Xero follows QuickBooks pattern via n8n native node
- Stripe: API key based (simpler), pull subscription metrics, MRR, churn, failed payments
- Feed into "Deviation Detection" lens for financial anomaly alerts

### Transcription Services (Fireflies, Otter.ai)

- n8n polls for new transcripts, feeds into document vectorization pipeline
- Eliminates manual download step users currently endure
- Store with `doc_category: 'meetings'`

---

## Phase 4: MCP Client Layer -- Standardized Extensibility (Weeks 8-14)

MCP provides the standardized interface for the long tail of integrations.

### Edge Function: `mcp-client`

- Supabase Edge Function speaking MCP protocol (JSON-RPC 2.0)
- SSE transport first (most relevant for cloud-hosted MCP servers)
- Four core operations: `list_servers`, `list_tools`, `call_tool`, `sync_tools`
- 30-second timeout default for edge function execution limits
- Log all tool executions to `mcp_tool_executions` for analytics

See [MCP_BACKEND_CLIENT_ARCHITECTURE.md](./MCP_BACKEND_CLIENT_ARCHITECTURE.md) for full schema and implementation details.

### MCP Server Registry

- `mcp_servers` and `mcp_tools` tables (schema in MCP_BACKEND_CLIENT_ARCHITECTURE.md)
- Team admins add custom MCP server URLs through Connected Apps UI
- Edge function discovers available tools and caches in `mcp_tools`
- Admin review and approval before tools become available to agent

### Agent Tool Discovery

- Update `team-agent-chat` system prompt with Discovery Prompt pattern:
  > "You have access to a library of tools. If you cannot solve a problem with your internal data, check the Tool Registry to see if you can connect to the user's external apps."
- Agent calls `mcp-client` edge function which routes to appropriate MCP server
- Write operations require explicit user confirmation before execution

### Zapier MCP Integration

- Zapier's MCP interface gives agent access to 6,000+ apps through a single connection
- Register as special entry in `mcp_servers`
- Catch-all for niche tools: Builder Trend, NetSuite, Oura Ring, medical systems
- Addresses the "gazillion platforms" problem without building native integrations

---

## Phase 5: The API Wizard -- Competitive Differentiator (Weeks 12-18)

The most ambitious piece: an AI-guided tool that helps users connect any third-party API.

### How It Works

1. User tells agent "I want to connect my Builder Trend account"
2. Agent searches for service's API documentation (web search or curated API database)
3. Agent explains needed credentials (API key, OAuth app, etc.) and guides user
4. Agent generates connection configuration and registers in integration registry
5. Agent can then query the connected API going forward

### Implementation Approach

- Build on top of MCP client layer -- API Wizard creates new MCP-compatible connections dynamically
- Use Gemini to analyze API documentation and generate tool schemas
- Store generated configs in `integration_registry` with `type: 'api_wizard_generated'`
- Require admin approval before new connections go live (security review step)
- Track popularity across teams to identify candidates for promotion to native integrations

### Why This Matters

- Directly addresses "gazillion different platforms" problem from strategy meetings
- Turns a weakness (cannot build native integrations fast enough) into a strength (AI builds them)
- Creates network effect: more users connecting new APIs grows the platform's integration library
- Positions AI Rocket as an open platform rather than a walled garden

---

## Phase 6: Security and Governance Framework

Must be built alongside integrations, not after.

### Scoped Permissions

- Each integration declares accessible data scope
- Store permission scopes in `user_integrations`
- Agent respects scopes at query time
- Extend existing `view_financial` pattern to all data categories

### Credential Security

- All API keys and OAuth tokens in Supabase Vault (encrypted at rest, decrypted only by service role)
- Never expose credentials to frontend -- all API calls through edge functions
- Credential rotation reminders for API-key-based connections
- Leverage existing `token_refresh_logs` pattern for health monitoring

### Audit Trail

- Log every external API call: user, team, integration, operation, timestamp, success/failure, duration
- Feed audit data into Team Dashboard for admin visibility
- Rate limits per user and per team to prevent cost overruns

### Human-in-the-Loop for Write Operations

- Any operation modifying external data requires explicit user confirmation
- Agent describes intent, user clicks "Approve" or "Reject"
- Log approved/rejected actions for compliance

---

## Priority Sequencing Summary

| Priority | Integration | Method | Effort | Customer Impact |
|----------|------------|--------|--------|----------------|
| 1 | QuickBooks Online | n8n bridge | Medium | Highest demand |
| 2 | Google Calendar | Extend existing OAuth | Low | High daily value |
| 3 | Outlook Calendar | Extend existing OAuth | Low | High daily value |
| 4 | Integration Registry + Connected Apps UI | New database + UI | Medium | Foundation for everything |
| 5 | Slack | n8n bridge | Medium | High demand |
| 6 | HubSpot / GoHighLevel | n8n bridge | Medium | CRM top request category |
| 7 | Notion | n8n bridge | Medium | High demand |
| 8 | Xero / Stripe | n8n bridge | Low-Medium | Financial data enrichment |
| 9 | Fireflies / Otter.ai | n8n bridge | Medium | Eliminates manual downloads |
| 10 | MCP Client + Zapier MCP | New edge function + protocol | High | Long-tail coverage |
| 11 | API Wizard | AI-guided connection builder | High | Competitive differentiator |

---

## Architecture Decision: Why All Three Methods

The core insight is that Native OAuth, n8n bridges, and MCP are not competing approaches -- they are complementary layers:

- **Native OAuth** handles existing Google and Microsoft connections plus calendar expansion (lowest effort, highest immediate value)
- **n8n Bridge** handles the top 10-15 most-requested integrations without custom OAuth flows (medium effort, rapid expansion)
- **MCP + Zapier** handles the long tail of niche and industry-specific tools (highest effort, only way to solve "gazillion platforms" at scale)
- **API Wizard** ties it all together as the unique differentiator (AI builds its own integrations)

The **Integration Registry** (Phase 2) is the critical early investment that unifies all three methods into a single system: same Connected Apps UI, same agent tool discovery, same audit trail -- regardless of how the connection works under the hood.

---

## Open Questions (Resolved and Remaining)

### Resolved
1. **Which integrations first?** QuickBooks, Calendar (Google + Outlook), Slack -- based on customer demand data
2. **Read vs Write?** Start read-only for all integrations; add write with human-in-the-loop approval
3. **n8n as middleware?** Yes -- fastest path for HubSpot, Monday, Notion, QuickBooks, etc.

### Remaining
1. **Trust model for API Wizard connections?** Require admin approval for all, or auto-trust read-only?
2. **MCP server management scope?** Super admins only, or team admins can add their own?
3. **Zapier MCP pricing model?** Per-call costs need evaluation before team-wide rollout
4. **Calendar write access?** Users will want to create events -- when to enable?
5. **Data retention for integration data?** How long to keep synced CRM/financial data in document_chunks?

---

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Status:** Approved for Implementation
**Priority:** High Impact, High Urgency
