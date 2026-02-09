/*
  # Seed Integration Registry with Initial Providers

  1. Available Integrations (ready to connect)
    - Google Calendar - Extends existing Google OAuth
    - Outlook Calendar - Extends existing Microsoft OAuth
    - Google Drive - Already connected (maps to existing flow)
    - Microsoft OneDrive/SharePoint - Already connected (maps to existing flow)

  2. Coming Soon Integrations (visible but not yet connectable)
    - QuickBooks Online - Financial data via n8n bridge
    - Slack - Communication data via n8n bridge
    - HubSpot - CRM data via n8n bridge
    - Salesforce - CRM data via n8n bridge
    - GoHighLevel - Marketing/CRM via n8n bridge
    - Notion - Project/wiki data via n8n bridge
    - Xero - Financial data via n8n bridge
    - Stripe - Payment data via n8n bridge
    - Fireflies - Meeting transcription via n8n bridge
    - Otter.ai - Meeting transcription via n8n bridge
    - Asana - Project management via n8n bridge
    - Monday.com - Project management via n8n bridge
    - Trello - Project management via n8n bridge
    - Mailchimp - Email marketing via n8n bridge
    - Google Analytics - Web analytics via n8n bridge
    - Zapier MCP - 6000+ apps via MCP protocol

  3. Notes
    - Using ON CONFLICT to safely re-run
    - Google Drive and OneDrive marked as 'available' to reflect existing connections
    - Sort order groups by category priority
*/

INSERT INTO integration_registry (provider_slug, provider_name, provider_logo_url, provider_description, provider_category, auth_type, oauth_scopes, capabilities, capability_descriptions, status, requires_admin, sort_order)
VALUES
  -- Available: Calendar integrations (extend existing OAuth)
  ('google-calendar', 'Google Calendar', null, 'View your upcoming meetings, events, and schedule. AI can factor your calendar into recommendations and reports.', 'calendar', 'oauth2',
    ARRAY['https://www.googleapis.com/auth/calendar.readonly'],
    ARRAY['read_events', 'read_schedule'],
    '{"read_events": "View upcoming meetings and events", "read_schedule": "Check availability and scheduling conflicts"}'::jsonb,
    'available', false, 10),

  ('outlook-calendar', 'Outlook Calendar', null, 'View your upcoming meetings, events, and schedule from Microsoft 365. AI can factor your calendar into recommendations.', 'calendar', 'oauth2',
    ARRAY['Calendars.Read'],
    ARRAY['read_events', 'read_schedule'],
    '{"read_events": "View upcoming meetings and events", "read_schedule": "Check availability and scheduling conflicts"}'::jsonb,
    'available', false, 11),

  -- Available: Storage (maps to existing connections)
  ('google-drive', 'Google Drive', null, 'Already connected through your data sync setup. Documents from Google Drive are vectorized and available to your AI agent.', 'storage', 'oauth2',
    ARRAY['https://www.googleapis.com/auth/drive'],
    ARRAY['read_files', 'sync_documents'],
    '{"read_files": "Access files and folders", "sync_documents": "Sync and vectorize documents for AI"}'::jsonb,
    'available', false, 5),

  ('microsoft-onedrive', 'OneDrive / SharePoint', null, 'Already connected through your data sync setup. Documents from OneDrive and SharePoint are vectorized and available to your AI agent.', 'storage', 'oauth2',
    ARRAY['Files.Read.All'],
    ARRAY['read_files', 'sync_documents'],
    '{"read_files": "Access files and folders", "sync_documents": "Sync and vectorize documents for AI"}'::jsonb,
    'available', false, 6),

  -- Coming Soon: Financial
  ('quickbooks', 'QuickBooks Online', null, 'Connect your accounting data. AI can analyze P&L statements, cash flow, recent transactions, and detect financial anomalies.', 'accounting', 'n8n_workflow',
    '{}',
    ARRAY['read_financials', 'read_transactions', 'read_reports'],
    '{"read_financials": "View P&L, balance sheets, cash flow", "read_transactions": "Access recent transactions", "read_reports": "Generate financial summaries"}'::jsonb,
    'coming_soon', true, 20),

  ('xero', 'Xero', null, 'Connect your Xero accounting data for AI-powered financial insights, P&L analysis, and cash flow monitoring.', 'accounting', 'n8n_workflow',
    '{}',
    ARRAY['read_financials', 'read_transactions', 'read_reports'],
    '{"read_financials": "View P&L, balance sheets, cash flow", "read_transactions": "Access recent transactions", "read_reports": "Generate financial summaries"}'::jsonb,
    'coming_soon', true, 21),

  ('stripe', 'Stripe', null, 'Connect your payment data. AI can track MRR, churn rates, subscription metrics, and alert you to failed payments.', 'accounting', 'api_key',
    '{}',
    ARRAY['read_payments', 'read_subscriptions', 'read_metrics'],
    '{"read_payments": "View payment history and trends", "read_subscriptions": "Track subscription metrics and MRR", "read_metrics": "Analyze revenue and churn data"}'::jsonb,
    'coming_soon', false, 22),

  -- Coming Soon: Communication
  ('slack', 'Slack', null, 'Connect your Slack workspace. AI can summarize channel conversations, find messages, and detect communication patterns.', 'communication', 'n8n_workflow',
    '{}',
    ARRAY['read_messages', 'read_channels', 'search_messages'],
    '{"read_messages": "Read channel message history", "read_channels": "View available channels", "search_messages": "Search across conversations"}'::jsonb,
    'coming_soon', true, 30),

  -- Coming Soon: CRM
  ('hubspot', 'HubSpot', null, 'Connect your CRM data. AI can access contacts, deals, pipeline metrics, and engagement history for business insights.', 'crm', 'n8n_workflow',
    '{}',
    ARRAY['read_contacts', 'read_deals', 'read_pipeline', 'read_engagement'],
    '{"read_contacts": "Access contact database", "read_deals": "View deal pipeline and stages", "read_pipeline": "Track pipeline metrics", "read_engagement": "View engagement history"}'::jsonb,
    'coming_soon', false, 40),

  ('salesforce', 'Salesforce', null, 'Connect your Salesforce CRM. AI can access accounts, opportunities, leads, and generate sales intelligence.', 'crm', 'n8n_workflow',
    '{}',
    ARRAY['read_accounts', 'read_opportunities', 'read_leads', 'read_reports'],
    '{"read_accounts": "Access account data", "read_opportunities": "View opportunity pipeline", "read_leads": "Track leads and conversions", "read_reports": "Generate sales reports"}'::jsonb,
    'coming_soon', false, 41),

  ('gohighlevel', 'GoHighLevel', null, 'Connect your GoHighLevel account. AI can access campaign performance, lead data, and help optimize marketing efforts.', 'crm', 'n8n_workflow',
    '{}',
    ARRAY['read_contacts', 'read_campaigns', 'read_pipeline'],
    '{"read_contacts": "Access contact and lead data", "read_campaigns": "View campaign performance", "read_pipeline": "Track deal pipeline"}'::jsonb,
    'coming_soon', false, 42),

  -- Coming Soon: Project Management
  ('notion', 'Notion', null, 'Connect your Notion workspace. AI can search pages, access databases, and incorporate your team wiki into its knowledge base.', 'project_management', 'n8n_workflow',
    '{}',
    ARRAY['read_pages', 'search_content', 'read_databases'],
    '{"read_pages": "Access Notion pages and content", "search_content": "Search across your workspace", "read_databases": "Read database entries and properties"}'::jsonb,
    'coming_soon', false, 50),

  ('asana', 'Asana', null, 'Connect your Asana projects. AI can track task status, project timelines, and provide project management insights.', 'project_management', 'n8n_workflow',
    '{}',
    ARRAY['read_tasks', 'read_projects', 'read_timelines'],
    '{"read_tasks": "View task status and assignments", "read_projects": "Access project details", "read_timelines": "Track project timelines"}'::jsonb,
    'coming_soon', false, 51),

  ('monday', 'Monday.com', null, 'Connect your Monday.com boards. AI can access board data, track work items, and analyze team workload.', 'project_management', 'n8n_workflow',
    '{}',
    ARRAY['read_boards', 'read_items', 'read_status'],
    '{"read_boards": "Access board data", "read_items": "View work items", "read_status": "Track item statuses"}'::jsonb,
    'coming_soon', false, 52),

  ('trello', 'Trello', null, 'Connect your Trello boards. AI can track cards, lists, and provide project status insights.', 'project_management', 'n8n_workflow',
    '{}',
    ARRAY['read_boards', 'read_cards', 'read_lists'],
    '{"read_boards": "Access Trello boards", "read_cards": "View card details", "read_lists": "Track list progress"}'::jsonb,
    'coming_soon', false, 53),

  -- Coming Soon: Transcription
  ('fireflies', 'Fireflies.ai', null, 'Connect your Fireflies account. AI can access meeting transcripts and notes without manual downloads.', 'transcription', 'n8n_workflow',
    '{}',
    ARRAY['read_transcripts', 'read_summaries', 'search_meetings'],
    '{"read_transcripts": "Access meeting transcripts", "read_summaries": "View meeting summaries", "search_meetings": "Search across meetings"}'::jsonb,
    'coming_soon', false, 60),

  ('otter-ai', 'Otter.ai', null, 'Connect your Otter.ai account. AI can access meeting transcripts and action items automatically.', 'transcription', 'n8n_workflow',
    '{}',
    ARRAY['read_transcripts', 'read_action_items', 'search_meetings'],
    '{"read_transcripts": "Access meeting transcripts", "read_action_items": "View extracted action items", "search_meetings": "Search across meetings"}'::jsonb,
    'coming_soon', false, 61),

  -- Coming Soon: Marketing/Analytics
  ('mailchimp', 'Mailchimp', null, 'Connect your email marketing data. AI can analyze campaign performance, subscriber engagement, and optimize email strategy.', 'analytics', 'n8n_workflow',
    '{}',
    ARRAY['read_campaigns', 'read_subscribers', 'read_analytics'],
    '{"read_campaigns": "View email campaign data", "read_subscribers": "Access subscriber lists", "read_analytics": "Analyze campaign performance"}'::jsonb,
    'coming_soon', false, 70),

  ('google-analytics', 'Google Analytics', null, 'Connect your web analytics. AI can analyze traffic patterns, conversion data, and provide actionable growth insights.', 'analytics', 'oauth2',
    '{}',
    ARRAY['read_traffic', 'read_conversions', 'read_reports'],
    '{"read_traffic": "View website traffic data", "read_conversions": "Track conversion metrics", "read_reports": "Generate analytics reports"}'::jsonb,
    'coming_soon', false, 71),

  -- Coming Soon: MCP Protocol
  ('zapier-mcp', 'Zapier (6000+ Apps)', null, 'Connect to thousands of apps through Zapier MCP. AI can interact with virtually any cloud service your business uses.', 'custom', 'mcp',
    '{}',
    ARRAY['universal_read', 'universal_write', 'workflow_trigger'],
    '{"universal_read": "Read data from 6000+ connected apps", "universal_write": "Send data to connected apps", "workflow_trigger": "Trigger multi-step Zapier workflows"}'::jsonb,
    'coming_soon', false, 90)

ON CONFLICT (provider_slug) DO UPDATE SET
  provider_name = EXCLUDED.provider_name,
  provider_description = EXCLUDED.provider_description,
  provider_category = EXCLUDED.provider_category,
  capabilities = EXCLUDED.capabilities,
  capability_descriptions = EXCLUDED.capability_descriptions,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();