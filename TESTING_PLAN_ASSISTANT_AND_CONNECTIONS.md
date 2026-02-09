# Testing Plan: Proactive Assistant & Connected Apps Features

**User:** clay@rockethub.ai
**Date:** 2026-02-09 (Updated)
**Assistant Name:** Elle (custom name already configured)
**Total Test Cases:** 126 across 26 feature areas

---

## Prerequisites

Before starting, make sure you:
- Are logged in as clay@rockethub.ai
- Have a stable internet connection
- Keep your browser console open (right-click > Inspect > Console) to catch any errors

---

## PART 1: AGENT MODE / ASSISTANT MODE

### Test 1.1 - Toggle Agent Mode On
1. Open Settings (click your avatar in the top-right corner)
2. Find the "Assistant Mode" toggle (should show as ON with a teal toggle)
3. Toggle it OFF, then close the settings modal
4. **Expected:** The app should immediately switch to Classic Mode (full-width layout, no chat panel on the left)
5. Open Settings again, toggle it back ON, close the modal
6. **Expected:** The app should immediately switch to Agent Mode (split-screen with chat panel on the left)
7. **Pass criteria:** No page refresh needed. Layout changes instantly when you close the modal.

### Test 1.2 - Agent Mode Desktop Layout
1. With Agent Mode ON, verify you see a split-screen layout:
   - LEFT panel: Chat panel with "Elle" (your assistant)
   - RIGHT panel: Mission Control or the last tab you had open
2. Try resizing the chat panel by dragging the divider between left and right panels
3. **Expected:** Panel resizes smoothly between a minimum and maximum width
4. Click the collapse button on the chat panel
5. **Expected:** Chat panel collapses to a thin strip; right panel expands to fill the space
6. Click again to expand
7. **Expected:** Chat panel returns to its previous width

### Test 1.3 - Agent Mode Chat Panel
1. In the left chat panel, type a question (e.g., "What data do I have connected?")
2. **Expected:** Elle responds with relevant information about your connected data
3. Try asking "Show me my scheduled tasks"
4. **Expected:** Elle should respond or navigate you to the relevant section

### Test 1.4 - Agent Mode Navigation
1. From Mission Control, click on any feature card (e.g., "Team Dashboard", "Reports")
2. **Expected:** The right panel changes to show that feature. A tab appears in the tab bar.
3. Click back on "Mission Control" tab
4. **Expected:** Returns to Mission Control
5. Open multiple features and verify tabs appear and switching between them works

### Test 1.5 - Agent Mode Mobile (if testing on phone/tablet)
1. Open the app on a mobile device or resize your browser to mobile width
2. **Expected:** Instead of side-by-side panels, you should see a single view with a bottom navigation to switch between "Agent" chat and "App" content
3. Tap the agent tab, verify chat works
4. Tap the app tab, verify Mission Control and other features load

---

## PART 2: PROACTIVE ASSISTANT SETTINGS

### Test 2.1 - Access Notification Settings
1. Open Settings (avatar > Settings)
2. Scroll down past the Agent Mode toggle
3. **Expected:** You should see a "Notification Settings" or "Assistant Notifications" section with your current settings

### Test 2.2 - Proactive Notifications Toggle
1. In the notification settings, find the main proactive assistant toggle
2. **Current state:** Enabled, Level = High
3. Toggle it OFF
4. **Expected:** All notification channel options and sub-settings should become disabled/hidden
5. Toggle it back ON
6. **Expected:** Settings reappear. Your previous configuration should be preserved.

### Test 2.3 - Notification Frequency Level
1. Change the frequency level from "High" to "Low"
2. **Expected:** Setting saves immediately (no save button needed). No error in console.
3. Change it to "Medium"
4. **Expected:** Saves successfully
5. Change back to "High"

### Test 2.4 - Email Channel
1. Find the Email notification channel section
2. **Current state:** Enabled, but no email address set
3. Enter your email address (clay@rockethub.ai) in the email field
4. **Expected:** Saves automatically
5. Toggle email OFF, then back ON
6. **Expected:** Your email address is still there after re-enabling

### Test 2.5 - SMS Channel
1. Find the SMS notification channel
2. **Current state:** Enabled
3. If there is a phone number field, enter a test number
4. **Expected:** Saves without error
5. Note: SMS delivery requires external Twilio configuration. The setting should save even if delivery isn't active yet.

### Test 2.6 - WhatsApp Channel
1. Find the WhatsApp notification channel
2. **Current state:** Enabled
3. Same as SMS -- verify the toggle and any phone number field save correctly

### Test 2.7 - Telegram Channel
1. Find the Telegram notification channel
2. **Current state:** Enabled
3. If there is a Telegram username/ID field, verify it saves

### Test 2.8 - Quiet Hours
1. Find the Quiet Hours section
2. **Current state:** Enabled, 10:00 PM - 10:00 AM, America/New_York
3. Change the start time to 11:00 PM
4. **Expected:** Saves automatically
5. Change the timezone to a different zone (e.g., America/Chicago)
6. **Expected:** Saves without error
7. Revert to your preferred settings

### Test 2.9 - Notification Types
1. Find the Notification Types section (checkboxes for different event types)
2. **Current state:**
   - ON: Daily Summary, Team Mention, Weekly Recap, Insight Discovered
   - OFF: Report Ready, Sync Complete, Goal Milestone, Action Item Due, Meeting Reminder
3. Toggle "Report Ready" ON
4. **Expected:** Saves immediately
5. Toggle it back OFF
6. Verify all toggles respond and save correctly

### Test 2.10 - Assistant Name
1. Find the assistant name field (currently set to "elle")
2. Change it to a different name (e.g., "Nova")
3. **Expected:** Saves. The chat panel should reflect the new name.
4. Change it back to "elle" (or keep your new preference)

---

## PART 3: SCHEDULED TASKS

### Test 3.1 - Access Scheduled Tasks
1. From Mission Control, find and click the "AI on Autopilot" or "Scheduled Tasks" card
2. **Expected:** The Scheduled Tasks panel opens showing your existing tasks

### Test 3.2 - View Existing Tasks
1. You should see 2 active scheduled tasks:
   - "Weekly Financial Summary & Core Values Alignment" (weekly, Mondays 10:00 AM ET)
   - "Weekly Financial & Core Values Report" (weekly, Fridays 10:00 AM ET)
2. **Expected:** Each task card shows:
   - Task title and type icon
   - Schedule description (e.g., "Every Monday at 10:00 AM")
   - Status badge ("Active")
   - Next run date
   - Run count (0 for both, they haven't executed yet)

### Test 3.3 - Pause a Task
1. Click the pause button on one of the tasks
2. **Expected:** Task status changes to "Paused". The task card should reflect the paused state.
3. The next_run_at should be cleared or the task should indicate it won't run while paused.

### Test 3.4 - Resume a Task
1. Click the resume button on the paused task
2. **Expected:** Task status returns to "Active". A new next_run_at is calculated.

### Test 3.5 - View Execution History
1. If there's a "history" or "details" button on a task, click it
2. **Expected:** Shows execution history (empty for now since no tasks have run yet)
3. Verify no errors when opening the history view

### Test 3.6 - Task Creation (via Chat)
1. Go to the Agent Chat panel (Agent Mode) or classic chat
2. Ask Elle: "Schedule a daily check-in for 9 AM every morning"
3. **Expected:** Elle should either:
   - Create a new scheduled task, OR
   - Explain how to set up the task
4. If a task was created, verify it appears in the Scheduled Tasks panel

---

## PART 4: ENGAGEMENT STREAKS

### Test 4.1 - Streak Tracking
1. Your current streak data:
   - Current streak: 1 day
   - Longest streak: 1 day
   - Total sessions: 1
   - Last active: 2026-02-06
2. Log in today (2026-02-07)
3. Navigate around the app for a minute
4. **Expected:** Your engagement streak should update (check the database or any streak display in the UI)
5. The streak should increment if you use the app on consecutive days

### Test 4.2 - Streak Display
1. Look for any streak indicator in the app (Mission Control, Agent Chat, or Settings)
2. If visible, verify it shows the correct current streak count
3. Note: If no visible UI element shows streaks, they are tracked in the background for the AI assistant to reference

---

## PART 5: CONNECTED APPS / INTEGRATIONS

### Test 5.1 - Access Connected Apps
1. From Mission Control, find and click the "Connected Apps" card
2. **Expected:** The Connected Apps page opens showing integrations organized by category

### Test 5.2 - View Integration Categories
1. **Expected categories visible:**
   - Storage (Google Drive - Connected, OneDrive/SharePoint - Connected)
   - Calendar (Google Calendar, Outlook Calendar - Available)
   - Accounting/Finance (QuickBooks, Xero, Stripe - Coming Soon)
   - Communication (Slack - Coming Soon)
   - CRM (HubSpot, Salesforce, GoHighLevel - Coming Soon)
   - Project Management (Notion, Asana, Monday.com, Trello - Coming Soon)
   - Transcription (Fireflies, Otter.ai - Coming Soon)
   - Analytics (Mailchimp, Google Analytics - Coming Soon)
   - Advanced (Zapier MCP - Coming Soon)
2. Verify each category header is visible and integrations are grouped correctly

### Test 5.3 - Connected Integration Status
1. Find Google Drive in the list
2. **Expected:** Shows as "Connected" with your email (clay@rockethub.ai)
3. Find OneDrive / SharePoint
4. **Expected:** Shows as "Connected" with your email
5. Both connections are active and synced from your drive connections

### Test 5.4 - Available Integrations
1. Find Google Calendar in the list
2. **Expected:** Shows as "Available" with a connect button
3. Click the connect button for Google Calendar
4. **Expected:** Either starts an OAuth flow or shows connection instructions
5. Note: If OAuth isn't fully wired up yet, verify the button responds and doesn't crash

### Test 5.5 - Coming Soon Integrations
1. Find any "Coming Soon" integration (e.g., Slack, QuickBooks)
2. **Expected:** Shows a "Coming Soon" badge or disabled state
3. Clicking on it should NOT start a connection flow
4. May show an info modal or tooltip about upcoming availability

### Test 5.6 - Disconnect Integration
1. On one of your connected integrations (Google Drive or OneDrive), look for a disconnect option
2. **DO NOT actually disconnect** if you need these for data sync
3. Verify the option exists and is accessible
4. If you test disconnecting, verify the status changes to "Disconnected"

### Test 5.7 - Token Health Status
1. Check if any integration shows a warning about expiring tokens
2. Your tokens expire around 2026-02-07 05:20-05:37 UTC
3. **Expected:** If tokens are expired/expiring, the UI should show a warning or "Reconnect" prompt
4. The health check cron runs every 30 minutes and should flag expired tokens

---

## PART 6: OVERNIGHT ASSISTANT / PROACTIVE INSIGHTS

### Test 6.1 - Verify Overnight Processing Runs
1. The overnight assistant cron runs daily at 8 AM UTC (3 AM EST)
2. Check if you have received any insights (in-app notifications or via your enabled channels)
3. If no insights yet: This is expected if the cron hasn't run since features were activated
4. **To manually test:** Ask Elle in the chat: "What insights do you have for me?"

### Test 6.2 - Proactive Notification Delivery
1. With proactive notifications enabled and email configured:
2. Wait for the next cron cycle (every 15 minutes for queue processing)
3. Check your email for any AI assistant notifications
4. Check in-app notification bell for any proactive messages
5. **Expected:** When insights are generated, they should be delivered via your enabled channels

### Test 6.3 - Notification Bell
1. Click the notification bell icon in the top-right header
2. **Expected:** Shows a dropdown with your notifications
3. Any proactive assistant notifications should appear here
4. Verify read/unread states work (clicking a notification marks it as read)

---

## PART 7: CROSS-FEATURE INTEGRATION TESTS

### Test 7.1 - Agent Mode + Connected Apps
1. In Agent Mode, ask Elle: "What apps do I have connected?"
2. **Expected:** Elle should reference your Google Drive and OneDrive connections

### Test 7.2 - Agent Mode + Scheduled Tasks
1. In Agent Mode, ask Elle: "What tasks are scheduled?"
2. **Expected:** Elle should mention your two weekly reports

### Test 7.3 - Settings Persistence
1. Make changes in notification settings
2. Close the settings modal
3. Reopen settings
4. **Expected:** All your changes are preserved
5. Refresh the page entirely (F5/Cmd+R)
6. Reopen settings
7. **Expected:** All settings still reflect your saved preferences

### Test 7.4 - Agent Mode Toggle Persistence
1. Toggle Agent Mode ON, close settings
2. Refresh the page
3. **Expected:** Agent Mode layout persists (split-screen with chat panel)
4. Toggle Agent Mode OFF, close settings
5. Refresh the page
6. **Expected:** Classic Mode layout persists

---

## Results Tracking

| Test ID | Test Name | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| 1.1 | Toggle Agent Mode | | |
| 1.2 | Desktop Layout | | |
| 1.3 | Chat Panel | | |
| 1.4 | Navigation | | |
| 1.5 | Mobile Layout | | |
| 2.1 | Access Notification Settings | | |
| 2.2 | Proactive Toggle | | |
| 2.3 | Frequency Level | | |
| 2.4 | Email Channel | | |
| 2.5 | SMS Channel | | |
| 2.6 | WhatsApp Channel | | |
| 2.7 | Telegram Channel | | |
| 2.8 | Quiet Hours | | |
| 2.9 | Notification Types | | |
| 2.10 | Assistant Name | | |
| 3.1 | Access Scheduled Tasks | | |
| 3.2 | View Existing Tasks | | |
| 3.3 | Pause a Task | | |
| 3.4 | Resume a Task | | |
| 3.5 | Execution History | | |
| 3.6 | Task Creation via Chat | | |
| 4.1 | Streak Tracking | | |
| 4.2 | Streak Display | | |
| 5.1 | Access Connected Apps | | |
| 5.2 | Integration Categories | | |
| 5.3 | Connected Status | | |
| 5.4 | Available Integrations | | |
| 5.5 | Coming Soon Integrations | | |
| 5.6 | Disconnect Integration | | |
| 5.7 | Token Health Status | | |
| 6.1 | Overnight Processing | | |
| 6.2 | Notification Delivery | | |
| 6.3 | Notification Bell | | |
| 7.1 | Agent + Connected Apps | | |
| 7.2 | Agent + Scheduled Tasks | | |
| 7.3 | Settings Persistence | | |
| 7.4 | Agent Mode Persistence | | |
| 8.1 | All 24 Workflows Active | | |
| 8.2 | Integration Registry Matches | | |
| 8.3 | Query: No Credentials Error | | |
| 8.4 | Query: Invalid Operation | | |
| 8.5 | Query: Missing Required Fields | | |
| 8.6 | Sync: Manual Trigger | | |
| 8.7 | Query with Real Credentials | | |
| 8.8 | Token Expiration Handling | | |
| 8.9 | API Auth Failure (401) | | |
| 8.10 | Sync: Full Team Sync | | |
| 8.11 | Sync Deduplication | | |
| 8.12 | Sync: Expired Token Skip | | |
| 8.13 | Webhook Response Time | | |
| 8.14 | Edge Function Proxy | | |
| 8.15 | Audit Log Verification | | |

---

## Your Current Configuration Summary

| Setting | Current Value |
|---------|---------------|
| Assistant Name | elle |
| Proactive Enabled | Yes |
| Proactive Level | High |
| Email Notifications | On (no email address set -- add clay@rockethub.ai) |
| SMS Notifications | On |
| WhatsApp Notifications | On |
| Telegram Notifications | On |
| Quiet Hours | 10:00 PM - 10:00 AM ET |
| Daily Summary | On |
| Team Mention | On |
| Weekly Recap | On |
| Insight Discovered | On |
| Report Ready | Off |
| Connected Integrations | Google Drive, OneDrive/SharePoint |
| Scheduled Tasks | 2 weekly reports (active, 0 runs so far) |
| Engagement Streak | 1 day |
| Priorities Set | 0 (consider adding some for better AI insights) |

---

## PART 8: N8N INTEGRATION WORKFLOWS (MCP Connections)

These tests cover the 24 n8n workflows deployed for third-party integrations. Each provider has a **Query workflow** (on-demand data retrieval) and most have a **Sync workflow** (scheduled batch data sync into document_chunks).

### Architecture Overview

- All workflows are deployed to n8n at healthrocket.app.n8n.cloud
- Webhooks are triggered via the `n8n-proxy` edge function or the `n8n-workflow-deployer` edge function
- Query workflows: Webhook receives request -> Code node validates credentials from `user_integrations` -> Makes API call -> Returns structured JSON
- Sync workflows: Webhook or schedule trigger -> Code node fetches all active integrations -> Loops through teams -> Syncs data to `document_chunks`
- All Code nodes use `this.helpers.httpRequest()` (not `fetch()`) for HTTP calls

### Prerequisites for Integration Testing

1. At least one integration must be connected via the Connected Apps page (Part 5)
2. The connected integration must have an entry in `user_integrations` with `status = 'active'`
3. API tokens/keys must be stored in `access_token_encrypted` or `api_key_encrypted`
4. The `connection_metadata` JSONB column must contain `provider_slug` matching the provider

### Test 8.1 - Verify All 24 Workflows Are Active

1. Open the n8n dashboard or use the deployer edge function:
   ```
   POST https://[SUPABASE_URL]/functions/v1/n8n-workflow-deployer?action=list
   ```
2. **Expected:** 24 workflows with "Astra -" prefix should be listed and all active:

| Provider | Query Workflow ID | Sync Workflow ID |
|----------|------------------|-----------------|
| QuickBooks | wGW1PFn3ibGpuSv8 | k53vTipnChQsWRLK |
| Slack | qm0N1upH7VtQTL3q | a8LSud8pToAjhGDB |
| HubSpot | LeX3Znj0qCQg3nal | DmeHHQ8TbEbQ4XX6 |
| Notion | PiYFXsQ2EHjnZDRz | H4QVKGnckAdiPmnX |
| Xero | tvJn5wtYRRE2QfrP | 7uM7kBxVvuC9m3To |
| Stripe | CSrpPLHwUza30QZ3 | V5T4h3aRokA3Z1v9 |
| GoHighLevel | bEYkatMUS2xbVGOJ | (query only) |
| Salesforce | QwIcjSmuIxvQLVJk | J48tcVrGhWAHaPMx |
| Fireflies.ai | GZ41sP9i9rbYXSMW | CRiq9HlSo4LHphvj |
| Monday.com | W0h2eNLUoUN3RMmO | PAHFrwoRNbKgY8ez |
| Asana | OMqSGlBboTGRWbXD | LvJ1SCoAJFFHai7q |
| Trello | fiakj7x33eieZBmy | hj7zvy8HZeKu7SY3 |
| Mailchimp | MvJx3N0HhGhvvrgp | (query only) |

3. **Pass criteria:** All 24 show `active: true`

### Test 8.2 - Integration Registry Matches Workflow IDs

1. Query the database:
   ```sql
   SELECT provider_slug, n8n_workflow_id, n8n_webhook_url, status
   FROM integration_registry
   WHERE n8n_workflow_id IS NOT NULL
   ORDER BY provider_slug;
   ```
2. **Expected:** 13 rows, each with the correct query workflow ID from the table above
3. **Expected:** Each row has a webhook URL in the format `astra-{provider}-query`
4. **Pass criteria:** Every workflow ID in the registry matches a live n8n workflow

### Test 8.3 - Query Workflow: No Credentials (Expected Error)

Test that workflows correctly handle missing credentials:

1. Send a test request to any query webhook with a non-existent user:
   ```
   POST /functions/v1/n8n-workflow-deployer?action=test_webhook&path=astra-quickbooks-query
   Body: {"team_id":"[valid-team-uuid]","user_id":"[non-existent-uuid]","operation":"list_invoices","params":{}}
   ```
2. **Expected response:**
   ```json
   {
     "success": false,
     "provider": "quickbooks",
     "operation": "list_invoices",
     "error": "No active QuickBooks connection found for this user",
     "error_code": "NOT_CONNECTED",
     "requires_reauth": false
   }
   ```
3. **Pass criteria:** Returns structured error JSON (not an empty response or crash)

### Test 8.4 - Query Workflow: Invalid Operation

1. Send a request with an operation that doesn't exist:
   ```
   POST with: {"team_id":"...","user_id":"...","operation":"nonexistent_op","params":{}}
   ```
2. **Expected:** Returns `error_code: "INVALID_OPERATION"` with a descriptive error message
3. **Pass criteria:** Workflow handles gracefully without crashing

### Test 8.5 - Query Workflow: Missing Required Fields

1. Send a request missing `team_id`, `user_id`, or `operation`:
   ```
   POST with: {"team_id":"abc"}
   ```
2. **Expected:** Returns `error_code: "INVALID_REQUEST"` with "Missing required fields" error
3. **Pass criteria:** Returns proper validation error

### Test 8.6 - Sync Workflow: Manual Trigger (No Credentials)

1. Trigger a sync workflow with a test team:
   ```
   POST /functions/v1/n8n-workflow-deployer?action=test_webhook&path=astra-quickbooks-sync
   Body: {"team_id":"test-team-123","user_id":"test-user-456"}
   ```
2. **Expected response:**
   ```json
   {
     "success": true,
     "provider": "quickbooks",
     "synced": 1,
     "total": 1,
     "results": [{"team_id": "test-team-123", "status": "success"}]
   }
   ```
3. Note: With fake credentials, the sync runs but the provider-specific sync logic may produce empty results or graceful errors
4. **Pass criteria:** Returns structured JSON, no `fetch is not defined` errors

### Test 8.7 - Query Workflow with Real Credentials (Per Provider)

For each connected integration, test with a real user. Replace `[user_id]` and `[team_id]` with actual values.

**QuickBooks (if connected):**
- Operations to test: `get_profit_loss`, `get_balance_sheet`, `list_transactions`, `get_revenue_summary`
- Webhook: `astra-quickbooks-query`
- **Expected:** `success: true` with financial data in `data` field
- Verify `records_count` in metadata is accurate

**Slack (if connected):**
- Operations: `list_channels`, `search_messages`
- Webhook: `astra-slack-query`
- **Expected:** Channel list or message search results

**HubSpot (if connected):**
- Operations: `list_contacts`, `list_deals`, `get_revenue_summary`
- Webhook: `astra-hubspot-query`
- **Expected:** CRM data returned

**Notion (if connected):**
- Operations: `search_pages`, `list_databases`, `get_recent`
- Webhook: `astra-notion-query`
- **Expected:** Page/database listings

**Xero (if connected):**
- Operations: `get_profit_loss`, `get_balance_sheet`, `get_invoices`
- Webhook: `astra-xero-query`
- **Expected:** Financial data (similar structure to QuickBooks)

**Stripe (if connected):**
- Operations: `get_mrr`, `get_subscription_metrics`, `list_recent_charges`
- Webhook: `astra-stripe-query`
- Note: Uses API key (not OAuth). Key stored in `api_key_encrypted`

**GoHighLevel (if connected):**
- Operations: `list_contacts`, `get_pipeline`, `get_campaign_stats`
- Webhook: `astra-gohighlevel-query`

**Salesforce (if connected):**
- Operations: `soql_query`, `list_opportunities`, `get_pipeline_report`
- Webhook: `astra-salesforce-query`
- Note: Requires `instance_url` in `connection_metadata`

**Fireflies.ai (if connected):**
- Operations: `list_transcripts`, `get_transcript`, `get_action_items`
- Webhook: `astra-fireflies-query`

**Monday.com (if connected):**
- Operations: `list_projects`, `list_tasks`, `get_overdue_tasks`
- Webhook: `astra-monday-query`

**Asana (if connected):**
- Operations: `list_projects`, `list_tasks`, `get_overdue_tasks`
- Webhook: `astra-asana-query`

**Trello (if connected):**
- Operations: `list_projects`, `list_tasks`, `search`
- Webhook: `astra-trello-query`

**Mailchimp (if connected):**
- Operations: `list_campaigns`, `get_campaign_report`, `get_audience_stats`
- Webhook: `astra-mailchimp-query`

**Pass criteria per provider:**
- Returns `success: true` with actual data from the provider
- `metadata.fetched_at` is populated with a recent timestamp
- `metadata.records_count` reflects the actual data returned
- `user_integrations.last_used_at` is updated after the call
- An entry is created in `integration_audit_log`

### Test 8.8 - Token Expiration Handling

1. Find an integration where `token_expires_at` is in the past
2. Send a query request for that provider
3. **Expected:**
   ```json
   {
     "success": false,
     "error_code": "TOKEN_EXPIRED",
     "requires_reauth": true
   }
   ```
4. Verify the integration status in `user_integrations` is updated to `'expired'`
5. Verify an `integration_audit_log` entry is created with `action: 'token_expired'`
6. **Pass criteria:** Expired tokens are detected before making API calls; user is prompted to reauth

### Test 8.9 - API Authentication Failure (401)

1. Manually set an invalid token in `user_integrations.access_token_encrypted` for a test integration
2. Send a query request
3. **Expected:**
   ```json
   {
     "success": false,
     "error_code": "TOKEN_EXPIRED",
     "requires_reauth": true,
     "error": "Authentication failed - token may be expired"
   }
   ```
4. **Pass criteria:** 401 errors from provider APIs are caught and returned as structured error responses

### Test 8.10 - Sync Workflow: Full Team Sync

1. Trigger a sync workflow for a provider that has at least one connected user:
   ```
   POST /functions/v1/n8n-workflow-deployer?action=test_webhook&path=astra-{provider}-sync
   Body: {} (empty body triggers scheduled/full sync mode)
   ```
2. **Expected:** The workflow queries all active integrations for this provider and syncs each team
3. **Expected response:**
   ```json
   {
     "success": true,
     "provider": "...",
     "synced": N,
     "total": N,
     "results": [{"team_id": "...", "status": "success"}, ...]
   }
   ```
4. Verify data was written to `document_chunks`:
   ```sql
   SELECT source, category, COUNT(*)
   FROM document_chunks
   WHERE team_id = '[team-id]' AND source = '{provider}'
   GROUP BY source, category;
   ```
5. **Pass criteria:** New chunks appear with appropriate category classification

### Test 8.11 - Sync Deduplication

1. Run the same sync workflow twice for the same team
2. **Expected:** The second run should not create duplicate entries in `document_chunks`
3. Check for duplicates:
   ```sql
   SELECT source_id, COUNT(*)
   FROM document_chunks
   WHERE team_id = '[team-id]' AND source = '{provider}'
   GROUP BY source_id
   HAVING COUNT(*) > 1;
   ```
4. **Pass criteria:** No duplicate `source_id` entries (upsert via `Prefer: resolution=merge-duplicates`)

### Test 8.12 - Sync Workflow: Expired Token Skipping

1. Set a connected integration's `token_expires_at` to a past date
2. Trigger the sync workflow
3. **Expected:** The team is skipped with `status: 'skipped', reason: 'token_expired'`
4. The workflow should continue processing other teams without failing
5. **Pass criteria:** One team skipped, others processed normally

### Test 8.13 - Webhook Response Time

1. Time the response for each query workflow (use browser network tab or `curl -w "%{time_total}"`)
2. **Expected:** Query webhooks respond within 30 seconds
3. Sync webhooks may take longer depending on data volume but should complete within 5 minutes
4. **Pass criteria:** No timeouts; all webhooks return before the n8n execution timeout

### Test 8.14 - Edge Function Proxy Integration

1. Test calling a query workflow through the `n8n-proxy` edge function (the production path):
   ```
   POST /functions/v1/n8n-proxy
   Authorization: Bearer [user-jwt]
   Body: {"webhookPath": "astra-quickbooks-query", "data": {"team_id":"...","user_id":"...","operation":"list_invoices","params":{}}}
   ```
2. **Expected:** The proxy authenticates the user, forwards to n8n, and returns the same structured response
3. **Pass criteria:** Authenticated users can invoke workflows through the proxy

### Test 8.15 - Audit Log Verification

After running several query and sync operations:

1. Check the audit log:
   ```sql
   SELECT action, status, details, created_at
   FROM integration_audit_log
   WHERE user_id = '[user-id]'
   ORDER BY created_at DESC
   LIMIT 20;
   ```
2. **Expected:** Each successful query creates an entry with `action: 'query_{operation}'`
3. **Expected:** Each token expiration creates an entry with `action: 'token_expired'`
4. **Pass criteria:** Complete audit trail for all integration operations

---

## PART 9: N8N WORKFLOW TROUBLESHOOTING

### Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Empty response from webhook | Workflow inactive or webhook path mismatch | Verify workflow is active; check path spelling |
| `fetch is not defined` | Old workflow version deployed | Redeploy using `n8n-workflow-deployer?action=deploy_all` |
| `Request failed with status code 400` | Invalid UUID in user_id/team_id | Ensure real UUIDs are passed |
| `TOKEN_EXPIRED` response | OAuth token needs refresh | Reconnect via Connected Apps page |
| `NOT_CONNECTED` response | No active integration for this user/provider | Connect the integration first via Connected Apps |
| `INVALID_OPERATION` response | Operation name misspelled or unsupported | Check the provider's supported operations list above |
| Sync returns 0 synced | No active integrations for the provider | At least one user must have the integration connected |
| Timeout (no response) | n8n execution took too long | Check n8n execution logs; may need to optimize sync logic |

### How to Redeploy Workflows

If workflows need to be redeployed (e.g., after code changes):

1. Delete existing workflows:
   ```
   POST /functions/v1/n8n-workflow-deployer?action=delete_batch
   Body: {"ids": ["id1", "id2", ...]}
   ```
2. Deploy fresh:
   ```
   POST /functions/v1/n8n-workflow-deployer?action=deploy_all
   ```
3. Activate all (one at a time):
   ```
   POST /functions/v1/n8n-workflow-deployer?action=activate&id={workflow_id}
   ```
4. Update `integration_registry` with new query workflow IDs

---

## PART 10: MCP TOOLS (Phase 4 - MCP Client Layer)

These tests cover the MCP (Model Context Protocol) server registry, tool discovery, and tool execution capabilities.

### Architecture Overview

- MCP Servers are registered per team in `mcp_servers` table
- Tools are discovered from MCP servers (n8n workflows) and stored in `mcp_tools` table
- Tool execution goes through the `mcp-client` edge function
- n8n is automatically registered as the default MCP server for every team
- The AI agent has awareness of available MCP tools via the system prompt

### Test 10.1 - Access MCP Tools Page

1. From Mission Control, find and click the "MCP Tools" card
2. **Expected:** The MCP Tools page opens showing:
   - A Wrench icon on the tab
   - At least one MCP Server card (n8n Automation Hub)
   - A "Connect API" button (admin only)
3. **Pass criteria:** Page loads without "Select a feature to get started" fallback

### Test 10.2 - View MCP Servers

1. On the MCP Tools page, verify the n8n Automation Hub server card is displayed
2. **Expected card details:**
   - Server name: "n8n Automation Hub"
   - Type: "n8n"
   - Status: "active" (green badge)
   - Health status indicator
   - Tool count (may be 0 if tools haven't been synced yet)
3. **Pass criteria:** Server card renders with correct information

### Test 10.3 - Sync Tools from n8n (Admin Only)

1. As an admin user, click the "Sync Tools" button on the n8n server card
2. **Expected:** The system calls the `mcp-client` edge function with `action: sync_tools`
3. **Expected result:** Tools are discovered from n8n workflows and stored in `mcp_tools`
4. After sync completes, the tool count on the server card should update
5. **Pass criteria:** No error; tool count increases or shows correct number

### Test 10.4 - View Discovered Tools

1. After syncing, verify tool cards appear below the server card
2. Each tool card should show:
   - Tool name
   - Description
   - Input parameters (if any)
   - Enabled/disabled status
3. Use the search bar to filter tools by name
4. **Expected:** Tools are filtered as you type
5. **Pass criteria:** Tools display correctly with all metadata

### Test 10.5 - Health Check

1. Click the "Health Check" button on a server card
2. **Expected:** The system pings the MCP server to verify connectivity
3. **Expected result:**
   - If healthy: Status shows "active" with last_health_check timestamp updated
   - If unhealthy: Status shows "error" with an error message
4. **Pass criteria:** Health check completes and updates the UI

### Test 10.6 - Tool Execution via Agent Chat

1. Open Agent Chat (the main chat panel)
2. Ask the agent about available tools: "What tools do I have available?"
3. **Expected:** The agent should reference MCP tools in its response (since tools are injected into the system prompt)
4. Ask the agent to use a specific tool (e.g., "List my n8n workflows")
5. **Expected:** The agent processes the request using the available MCP tool context
6. **Pass criteria:** Agent is aware of MCP tools and can reference them

### Test 10.7 - Database Verification

1. Check the mcp_servers table:
   ```sql
   SELECT name, server_type, status, tool_count, last_health_check
   FROM mcp_servers
   WHERE team_id = '[team-id]';
   ```
2. **Expected:** At least one row for n8n with status = 'active'

3. Check the mcp_tools table:
   ```sql
   SELECT tool_name, description, is_enabled
   FROM mcp_tools
   WHERE server_id IN (SELECT id FROM mcp_servers WHERE team_id = '[team-id]');
   ```
4. **Expected:** Tools from the synced server appear here

5. After executing a tool, check the execution log:
   ```sql
   SELECT tool_id, status, execution_time_ms, created_at
   FROM mcp_tool_executions
   WHERE user_id = '[user-id]'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
6. **Pass criteria:** All tables have correct data with proper team scoping

---

## PART 11: API WIZARD (Phase 5 - Custom API Integration)

These tests cover the AI-powered API Wizard that analyzes API documentation and auto-generates tool schemas.

### Architecture Overview

- The API Wizard uses Gemini AI to analyze API documentation
- Custom API definitions are stored in `custom_api_definitions` with an approval workflow
- Endpoints are stored in `custom_api_endpoints`
- Approval states: draft -> pending_review -> active (or rejected)
- The `api-wizard` edge function handles all wizard actions

### Test 11.1 - Open API Wizard

1. On the MCP Tools page, click the "Connect API" button (admin only)
2. **Expected:** The API Wizard modal opens with a step-by-step interface
3. **Step 1 options:**
   - Paste API documentation URL
   - Paste API documentation text directly
4. **Pass criteria:** Modal opens cleanly with input options

### Test 11.2 - Analyze API Documentation (URL Mode)

1. Enter a publicly accessible API docs URL (e.g., a Swagger/OpenAPI spec URL)
2. Click "Analyze"
3. **Expected:** The wizard calls the `api-wizard` edge function with `action: analyze_api`
4. **Expected result:** Gemini AI analyzes the docs and returns:
   - API name
   - Description
   - Base URL
   - Auth type (api_key, bearer_token, oauth2, basic_auth, none)
   - Auth instructions
   - Category
   - Suggested endpoints (up to 10 read-only endpoints)
5. **Pass criteria:** Analysis completes with structured JSON output

### Test 11.3 - Analyze API Documentation (Paste Mode)

1. Click "Paste" mode in the wizard
2. Paste raw API documentation text (e.g., copy from a REST API docs page)
3. Click "Analyze"
4. **Expected:** Same analysis as Test 11.2 but using pasted text instead of URL
5. **Pass criteria:** Analysis produces similar structured output

### Test 11.4 - Review Discovered Endpoints

1. After analysis, the wizard should show Step 3: Review
2. **Expected:** A list of discovered endpoints showing:
   - Endpoint name and display name
   - HTTP method (GET, POST, etc.)
   - Path
   - Input parameters with types and descriptions
   - Read-only flag
3. Verify the endpoints look reasonable for the API you analyzed
4. **Pass criteria:** Endpoints are displayed with complete metadata

### Test 11.5 - Test Connection

1. In Step 4 (Authentication), enter test credentials
2. Click "Test Connection"
3. **Expected:** The wizard calls `api-wizard` with `action: test_connection`
4. **Expected result:**
   - If successful: Shows status code 200 and body preview
   - If failed: Shows error message or non-200 status
5. **Pass criteria:** Connection test runs and reports results

### Test 11.6 - Submit for Review

1. Complete all wizard steps and click "Submit"
2. **Expected:** The wizard:
   - Creates a `custom_api_definitions` record with status = 'draft'
   - Creates `custom_api_endpoints` records for each discovered endpoint
   - Updates the status to 'pending_review'
3. Verify in the database:
   ```sql
   SELECT api_name, api_slug, status, auth_type, base_url
   FROM custom_api_definitions
   WHERE team_id = '[team-id]'
   ORDER BY created_at DESC;
   ```
4. **Pass criteria:** Definition created with correct metadata and pending_review status

### Test 11.7 - Admin Approve/Reject API

1. As an admin, find the pending API definition in the MCP Tools page
2. Click "Approve" on the API definition
3. **Expected:** Status changes to 'active'
4. Verify:
   ```sql
   SELECT api_name, status, approved_by, approved_at
   FROM custom_api_definitions
   WHERE team_id = '[team-id]' AND status = 'active';
   ```
5. To test rejection: Submit another API, then click "Reject"
6. **Expected:** Status changes to 'rejected' with approval_notes

### Test 11.8 - Non-Admin Cannot Approve

1. Log in as a non-admin team member
2. Attempt to approve or reject an API definition
3. **Expected:** Error message "Only admins can approve API definitions"
4. **Pass criteria:** Admin-only actions are properly restricted

### Test 11.9 - Custom API in Agent Context

1. After approving a custom API, go to Agent Chat
2. Ask the agent: "What APIs are available?"
3. **Expected:** The agent should mention the custom API along with MCP tools
4. **Pass criteria:** Custom APIs appear in the agent's system prompt context

### Test 11.10 - Database RLS Verification

1. Log in as User A from Team A
2. Verify you can see only Team A's API definitions:
   ```sql
   SELECT * FROM custom_api_definitions WHERE team_id != '[team-a-id]';
   ```
3. **Expected:** Returns no rows (RLS prevents cross-team access)
4. Same for `custom_api_endpoints` and `mcp_servers`
5. **Pass criteria:** All MCP/API tables are properly team-scoped

---

## Results Tracking (Parts 10-11)

| Test ID | Test Name | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| 10.1 | Access MCP Tools Page | | |
| 10.2 | View MCP Servers | | |
| 10.3 | Sync Tools (Admin) | | |
| 10.4 | View Discovered Tools | | |
| 10.5 | Health Check | | |
| 10.6 | Tool Execution via Agent | | |
| 10.7 | Database Verification | | |
| 11.1 | Open API Wizard | | |
| 11.2 | Analyze API (URL Mode) | | |
| 11.3 | Analyze API (Paste Mode) | | |
| 11.4 | Review Endpoints | | |
| 11.5 | Test Connection | | |
| 11.6 | Submit for Review | | |
| 11.7 | Admin Approve/Reject | | |
| 11.8 | Non-Admin Cannot Approve | | |
| 11.9 | Custom API in Agent Context | | |
| 11.10 | Database RLS Verification | | |

---

## PART 12: DATA SYNC & FOLDER MANAGEMENT

### Test 12.1 - Access Folder Management
1. From Launch Preparation > Fuel Stage, click "Manage Folders" or "Add More Folders"
2. **Expected:** Folder management section shows all connected folders (up to 20 slots)
3. Verify each folder shows: provider icon (Google Drive / OneDrive), folder name, document count, sync status

### Test 12.2 - Connect Google Drive Folder
1. Click "Add Folder" and select Google Drive
2. Browse and select a folder containing documents
3. **Expected:** Folder appears in the list with "Syncing" status
4. Wait for sync to complete
5. **Expected:** Document count updates, Fuel Level increases

### Test 12.3 - Connect Microsoft OneDrive Folder
1. Click "Add Folder" and select OneDrive/SharePoint
2. Browse and select a folder
3. **Expected:** Same flow as Google Drive with Microsoft-specific OAuth if needed

### Test 12.4 - Local File Upload
1. Click "Upload Files" or drag-and-drop files onto the upload area
2. Upload various file types: PDF, DOCX, XLSX, PPTX, TXT
3. **Expected:** Files upload with progress indicator, then appear in document list
4. Verify uploaded files are categorized and searchable by Astra

### Test 12.5 - Real-Time Sync Progress
1. Trigger a folder sync (disconnect and reconnect, or click "Sync Now" if available)
2. **Expected:** Real-time progress bar shows files being processed
3. **Expected:** Fuel Level updates as documents are synced

### Test 12.6 - Multi-Provider Folder Slots
1. Verify you can have folders from Google Drive, OneDrive, and local uploads simultaneously
2. Add folders until you reach 20 total slots
3. **Expected:** After 20 slots, the "Add Folder" option is disabled or shows limit reached

### Test 12.7 - Remove a Folder
1. Click the remove/disconnect button on a synced folder
2. **Expected:** Confirmation dialog appears
3. Confirm removal
4. **Expected:** Folder is removed, document count decreases, Fuel Level adjusts

---

## PART 13: CREATIVE SUITE (Astra Create)

### Test 13.1 - Access Creative Suite
1. From Agent Tools on Mission Control, click "Creative Suite" or "Astra Create"
2. **Expected:** Multi-step creation wizard opens

### Test 13.2 - Content Type Selection
1. Browse the 15+ content types: Team Snapshot, Mission, Core Values, Goals, Weekly Review, Quarterly Review, Yearly Review, Sales Campaign, Thought Leadership, Challenges & Opportunities, Financial Health, Trends & Insights, Innovation & Ideas, Custom
2. Select "Team Snapshot"
3. **Expected:** Selection highlights and "Next" button enables

### Test 13.3 - Visualization Type Selection
1. Choose between "Single Image" and "Multi-Slide Presentation"
2. Select "Multi-Slide Presentation"
3. **Expected:** Additional options for slide count appear (3, 5, 7, or 10 slides)

### Test 13.4 - Style Selection
1. For presentations, choose from: Modern Gradient, Tech & Innovation, Bold Headlines, Minimalist Clean, Corporate Professional, Creative Playful
2. For images, choose from: Photorealistic, Digital Art, 3D Render, Infographic
3. **Expected:** Preview thumbnails for each style

### Test 13.5 - Layout Selection
1. Choose layout: Landscape (16:9), Portrait (9:16), or Square (1:1)
2. **Expected:** Layout preview updates to show selected aspect ratio

### Test 13.6 - Generation
1. Click "Generate" after configuring all options
2. **Expected:** Loading state with progress indicator
3. **Expected:** Content is generated based on your team's actual synced data (not generic/placeholder)
4. Verify content mentions real team name, real metrics, real goals from documents

### Test 13.7 - Slide Viewer
1. After generation, view slides in the slide viewer
2. Navigate between slides using arrows or thumbnails
3. **Expected:** All slides render correctly with formatted content

### Test 13.8 - Save to Gallery
1. Click "Save to Gallery"
2. **Expected:** Visualization is saved to your personal gallery
3. Navigate to gallery view and verify it appears with title, date, and thumbnail

### Test 13.9 - Export to PDF
1. Click "Export to PDF"
2. **Expected:** PDF downloads with all slides/images formatted correctly
3. Verify PDF preserves styling, colors, and layout

---

## PART 14: TEAM DASHBOARD

### Test 14.1 - Access Team Dashboard
1. From Mission Control Agent Tools, click "Team Dashboard"
2. **Expected:** Dashboard loads with 3-panel layout

### Test 14.2 - Goals & Targets Panel
1. View the Goals & Targets section
2. **Expected:** Shows OKRs, projects, milestones, and KPIs extracted from synced strategy documents
3. Each goal should have a progress indicator and status
4. Verify goals reference actual data from your team documents

### Test 14.3 - Mission Alignment Panel
1. View the Mission Alignment section
2. **Expected:** Shows how recent work aligns with company mission and core values
3. Alignment score or percentage should be visible
4. Specific examples from recent documents should be cited

### Test 14.4 - Team Health Panel
1. View the Team Health section
2. **Expected:** Shows overall health score with sub-metrics
3. Sub-metrics may include: data richness, engagement, meeting cadence, financial health, risk indicators
4. Each sub-metric should have a score and brief explanation

### Test 14.5 - AI Recommendations
1. Look for AI-generated recommendations at the bottom of the dashboard
2. **Expected:** 2-5 actionable recommendations based on current team state
3. Recommendations should reference specific data points

### Test 14.6 - Custom Instructions
1. Click "Edit Instructions" or similar button
2. Enter custom instructions (e.g., "Focus on Q1 revenue targets and customer retention")
3. Save and regenerate
4. **Expected:** Dashboard regenerates with focus on specified areas

### Test 14.7 - Manual Regeneration
1. Click "Refresh" or "Regenerate" button
2. **Expected:** Dashboard regenerates with latest data (may take 30-60 seconds)
3. Verify content updates to reflect most recent synced documents

### Test 14.8 - Export Dashboard
1. Click export button
2. **Expected:** Dashboard exports as PDF or image with all three panels

---

## PART 15: TEAM PULSE

### Test 15.1 - Access Team Pulse
1. From Mission Control Agent Tools, click "Team Pulse"
2. **Expected:** Team Pulse page loads showing latest weekly pulse

### Test 15.2 - View Pulse Infographic
1. **Expected:** A visually formatted infographic summarizing the team's weekly activity
2. Should include: key metrics, highlights, document activity summary, category breakdown
3. Content should reference real data from the past week

### Test 15.3 - Customize Pulse
1. Click "Customize" button
2. **Expected:** Modal opens with customization options (design style, focus areas, etc.)
3. Change the design style (e.g., from "Modern" to "Corporate")
4. Save and verify the pulse updates its visual style

### Test 15.4 - Insights Panel
1. View the Insights panel alongside the infographic
2. **Expected:** AI-generated insights about team activity trends
3. Insights should be actionable and data-driven

### Test 15.5 - Historical Pulses
1. If available, navigate to previous weeks' pulses
2. **Expected:** Can view past pulse snapshots for comparison

---

## PART 16: CATEGORY DATA ACCESS (Admin)

### Test 16.1 - Access Category Access Settings
1. As admin, open Team Settings
2. Find the "Category Access" tab or section
3. **Expected:** List of all team members with category checkboxes

### Test 16.2 - View Default Permissions
1. **Expected:** All categories enabled by default for existing members
2. Categories: Strategy, Meetings, Financial, Projects (and potentially more)

### Test 16.3 - Restrict a Category
1. Uncheck "Financial" for a non-admin team member
2. **Expected:** Change saves immediately
3. Have that member ask Astra about financial data
4. **Expected:** Astra should not reference financial documents in its response

### Test 16.4 - Restore Access
1. Re-check "Financial" for the member
2. **Expected:** Member can now see financial data in Astra responses again

### Test 16.5 - Invite Code Category Defaults
1. Create a new invite code with specific category restrictions
2. **Expected:** New users who sign up with that code inherit the specified category access

---

## PART 17: ASSISTANT SKILLS

### Test 17.1 - Access Skills Panel
1. From Mission Control Agent Tools, click "Skills" or find it in settings
2. **Expected:** Skills panel shows all 10 available skills with toggle switches

### Test 17.2 - View Skill Details
1. Each skill card should display:
   - Skill name (e.g., "Financial Analyst", "Marketing Strategist")
   - Brief description
   - Capability areas
   - Active/inactive toggle
2. **Expected:** All 10 skills visible: Financial Analyst, Marketing Strategist, Competitive Intelligence, Operations Optimizer, Team Coach, Growth Strategist, Content Creator, Project Manager, Innovation Scout, Customer Advocate

### Test 17.3 - Activate a Skill
1. Toggle ON "Financial Analyst"
2. **Expected:** Skill activates immediately (no save button needed)
3. Go to Agent Chat and ask a financial question
4. **Expected:** Response uses financial analysis frameworks, terminology, and deeper financial insight

### Test 17.4 - Stack Multiple Skills
1. Activate 3+ skills simultaneously
2. Ask a question that spans multiple skill areas
3. **Expected:** Response reflects combined skill perspectives

### Test 17.5 - Deactivate a Skill
1. Toggle OFF a previously active skill
2. **Expected:** Next responses no longer reflect that skill's perspective

### Test 17.6 - Suggest New Skill
1. Click "Suggest New Skill" button
2. Enter a name, description, and use case
3. **Expected:** Suggestion is submitted successfully

---

## PART 18: GUIDED TASK BUILDER & TEMPLATES

### Test 18.1 - Access Task Templates
1. Open Scheduled Tasks panel
2. Click "Browse Templates" or the "+" button
3. **Expected:** Template library opens with categories

### Test 18.2 - Browse Template Categories
1. **Expected categories:** Productivity, Research & Intelligence, Team & Alignment, Growth & Strategy
2. Verify each category has multiple templates
3. **Expected:** "Popular Templates" section highlights most-used templates

### Test 18.3 - Preview a Template
1. Click on any template
2. **Expected:** Preview shows template title, description, default frequency, and AI prompt
3. Verify the AI prompt is relevant and well-written

### Test 18.4 - Create Task from Template
1. Select a template and click "Use Template" or "Create Task"
2. Customize: change title, frequency, time, day
3. Click "Create"
4. **Expected:** New task appears in active tasks list with correct settings
5. Verify the "Features Used" badges appear on the new task

### Test 18.5 - Features Used Display
1. Expand any scheduled task card
2. **Expected:** "Features Used" section shows labeled badges:
   - "Team Data Search" (always present)
   - "Reports View" (for report-type tasks)
   - "Agent Chat" (for non-report tasks)
   - "Notifications" (if delivery includes notifications)
3. Verify the "Delivers to" line shows "Reports" for report tasks

---

## PART 19: SCHEDULED TASK EXECUTION & REPORT ROUTING

### Test 19.1 - Report Task Delivers to Reports Tab
1. Create or wait for a report-type scheduled task to execute
2. **Expected:** The full report content appears in the **Reports** tab (not in Agent Chat)
3. **Expected:** Agent Chat receives a brief notification: "Your scheduled report just finished running. View it in your Reports tab."

### Test 19.2 - Report Uses Real Data
1. View the generated report in the Reports tab
2. **Expected:** Content references actual team data (real names, real metrics from synced documents)
3. **Expected:** No fabricated numbers, statistics, or entity names that don't match your data
4. If no relevant data exists for the prompt, the report should clearly state that

### Test 19.3 - User Addressed by Name
1. View the generated report or agent notification
2. **Expected:** Your actual name is used (e.g., "Hello Clay" or "Hi Clay"), NOT "Hello, User"

### Test 19.4 - Non-Report Task Delivers to Agent Chat
1. Create a non-report task (e.g., type "research" or "check_in")
2. Wait for execution
3. **Expected:** Full content appears directly in Agent Chat (not in Reports tab)

### Test 19.5 - Task Execution History
1. Expand a task that has executed at least once
2. Click to view execution history
3. **Expected:** Shows each execution with timestamp, status (success/failed), and result preview
4. Failed executions should show an error message

### Test 19.6 - Task Fails Gracefully Without Data
1. If the data retrieval service (n8n) is unavailable, the task should:
2. **Expected:** Status shows "failed" with error message about unavailable data service
3. **Expected:** No fabricated/hallucinated content is generated as fallback

---

## PART 20: LAUNCH PREPARATION SYSTEM

### Test 20.1 - View Launch Preparation
1. From Mission Control, view the Launch Preparation section
2. **Expected:** 3-stage progress display: Fuel, Boosters, Guidance
3. Current stage should be highlighted

### Test 20.2 - Fuel Stage Progress
1. Click on Fuel stage
2. **Expected:** Shows connected folders, document counts, sync status
3. Fuel Level indicator shows percentage based on synced data volume
4. Level thresholds: Level 1 (basic), Level 2, Level 3, Level 4, Level 5 (max)

### Test 20.3 - Boosters Stage Progress
1. Click on Boosters stage (if unlocked)
2. **Expected:** Shows AI feature usage checklist
3. Features to use: Run a report, create a visualization, use team chat, etc.
4. Each feature used should increase Boosters level

### Test 20.4 - Guidance Stage Progress
1. Click on Guidance stage (if unlocked)
2. **Expected:** Shows team configuration checklist
3. Items: Invite members, set team name, configure news preferences, set priorities

### Test 20.5 - Launch Points Display
1. View Launch Points counter (right sidebar or header)
2. **Expected:** Shows total points earned across all stages
3. Points breakdown: 50 per level, up to 750 total from launch prep

### Test 20.6 - Ready to Launch
1. Complete all stages to maximum levels
2. **Expected:** "Ready to Launch" panel appears with launch button
3. Click Launch
4. **Expected:** Team status updates to "launched", Mission Control view changes

---

## PART 21: TEAM COLLABORATION (Team Chat)

### Test 21.1 - Access Team Chat
1. From Agent Tools, click "Team Chat"
2. **Expected:** Shared conversation view loads

### Test 21.2 - Send a Message
1. Type a message in the input field
2. Press Enter or click Send
3. **Expected:** Message appears in the conversation with your name and avatar

### Test 21.3 - @Mention Team Member
1. Type "@" followed by a team member's name
2. **Expected:** Autocomplete dropdown shows matching members
3. Select a member
4. **Expected:** Mention appears highlighted in the message

### Test 21.4 - @Mention AI Assistant
1. Type "@Astra" or "@Elle" (your assistant name) in team chat
2. Ask a question
3. **Expected:** AI assistant responds in the team chat with data-aware answer
4. Response should be visible to all team members

### Test 21.5 - Real-Time Updates
1. Have another team member send a message (or use a second browser session)
2. **Expected:** New messages appear in real-time without manual refresh

---

## PART 22: WORKSHOP SYSTEM

### Test 22.1 - Access Workshop
1. Navigate to the Workshop page (may require workshop registration/access)
2. **Expected:** Workshop hub loads with available workshop features

### Test 22.2 - Workshop Onboarding
1. If first time, complete the onboarding flow
2. **Expected:** Step-by-step introduction to workshop features

### Test 22.3 - Workshop Guided Chat
1. Open the guided chat within workshop
2. Follow prompts to explore workshop topics
3. **Expected:** AI provides workshop-specific guidance and exercises

### Test 22.4 - Workshop Goals
1. Create workshop goals through the goal-setting flow
2. **Expected:** Goals are saved and trackable
3. Verify goals can be marked as complete

### Test 22.5 - Build Lab
1. Access Build Lab from workshop
2. **Expected:** Multi-platform build interface loads
3. View build plans with platform-specific guidance (ChatGPT, Claude, etc.)
4. Use Tool Planner mode to select recommended tools

### Test 22.6 - Blueprint Export
1. Generate a build blueprint from the Build Lab
2. Click Export
3. **Expected:** Blueprint exports as PDF or shareable format

---

## PART 23: MOONSHOT CHALLENGE

### Test 23.1 - Access Moonshot Challenge
1. Navigate to Moonshot Challenge page
2. **Expected:** Challenge overview page loads with scoring information

### Test 23.2 - View Scores
1. **Expected:** Your team's Run, Build, Grow (RBG) scores are displayed
2. Scores should reflect your Launch Points progress
3. Total score should be the sum of RBG categories

### Test 23.3 - View Standings
1. If leaderboard is accessible, view team standings
2. **Expected:** Your team appears in the list with correct score
3. Teams are ranked by total score

### Test 23.4 - Score Updates
1. Complete an action that earns Launch Points (e.g., sync more data, create a report)
2. **Expected:** Moonshot scores update to reflect new points (may take up to next cron cycle)

---

## PART 24: REPORTS SYSTEM

### Test 24.1 - Access Reports
1. From Agent Tools, click "Reports"
2. **Expected:** Reports view loads showing all generated reports

### Test 24.2 - View Generated Reports
1. Click on any report in the list
2. **Expected:** Full report content displays with formatted markdown
3. Report should include real data, charts/metrics descriptions, and actionable recommendations

### Test 24.3 - Create Manual Report
1. Click "New Report" or use the Agent Guided Reports
2. Enter or select a report prompt
3. **Expected:** Report generates with data from synced documents
4. Report appears in the Reports list

### Test 24.4 - Scheduled Report Configuration
1. Create a scheduled report with specific frequency and time
2. **Expected:** Report appears in Scheduled Tasks with correct settings
3. Wait for scheduled execution
4. **Expected:** Report is generated and appears in Reports tab at scheduled time

### Test 24.5 - Report Email Delivery
1. Ensure email notifications are enabled
2. Wait for a scheduled report to execute
3. **Expected:** Receive email with formatted report summary
4. Email should include key insights and link to full report in-app

### Test 24.6 - Team Reports
1. Create a report marked as "Team Report"
2. **Expected:** Report is delivered to all team members (in their Reports tab)
3. Each member should receive their own copy

---

## PART 25: HELP CENTER

### Test 25.1 - Access Help Center
1. Click the "?" icon or Help button in the app
2. **Expected:** Help Center opens with tabs: Quick Start, FAQ, Ask Astra

### Test 25.2 - FAQ Section
1. Browse FAQ entries
2. **Expected:** Questions organized by category (Getting Started, Chat Modes, Visualizations, Creative Suite, Team, Integrations, Reports, Admin, Launch Prep, Data Sync, Proactive Assistant, Scheduled Tasks, Connected Apps, MCP Tools, Skills)
3. Click an FAQ to expand the answer
4. **Expected:** Answer is accurate and reflects current feature behavior

### Test 25.3 - AI Help (Ask Astra)
1. Switch to the "Ask Astra" tab
2. Type a question about a feature (e.g., "How do I use the Creative Suite?")
3. **Expected:** AI provides accurate, platform-specific guidance
4. **Expected:** Response references actual feature names, navigation paths, and capabilities

### Test 25.4 - Quick Start Guide
1. View the Quick Start tab
2. **Expected:** Step-by-step getting started guide with actionable steps

---

## PART 26: SECURITY & DATA PRIVACY

### Test 26.1 - Team Data Isolation
1. If you have access to a second team account, log in
2. Attempt to view data from the first team
3. **Expected:** No cross-team data is visible. All queries return only the logged-in user's team data.

### Test 26.2 - Private Chat Isolation
1. Send a private message in Agent Chat
2. Log in as a different team member
3. **Expected:** The other member cannot see your private chat messages

### Test 26.3 - Admin-Only Features
1. Log in as a non-admin team member
2. Attempt to access: Team Settings, Category Access, Admin Dashboard
3. **Expected:** Access is denied or these options are not visible

### Test 26.4 - Category Access Enforcement
1. As admin, restrict "Financial" category for a member
2. As that member, ask Astra about financial data
3. **Expected:** Astra does not include financial documents in its response

---

## Results Tracking (Parts 12-26)

| Test ID | Test Name | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| 12.1 | Access Folder Management | | |
| 12.2 | Connect Google Drive Folder | | |
| 12.3 | Connect Microsoft OneDrive Folder | | |
| 12.4 | Local File Upload | | |
| 12.5 | Real-Time Sync Progress | | |
| 12.6 | Multi-Provider Folder Slots | | |
| 12.7 | Remove a Folder | | |
| 13.1 | Access Creative Suite | | |
| 13.2 | Content Type Selection | | |
| 13.3 | Visualization Type Selection | | |
| 13.4 | Style Selection | | |
| 13.5 | Layout Selection | | |
| 13.6 | Generation | | |
| 13.7 | Slide Viewer | | |
| 13.8 | Save to Gallery | | |
| 13.9 | Export to PDF | | |
| 14.1 | Access Team Dashboard | | |
| 14.2 | Goals & Targets Panel | | |
| 14.3 | Mission Alignment Panel | | |
| 14.4 | Team Health Panel | | |
| 14.5 | AI Recommendations | | |
| 14.6 | Custom Instructions | | |
| 14.7 | Manual Regeneration | | |
| 14.8 | Export Dashboard | | |
| 15.1 | Access Team Pulse | | |
| 15.2 | View Pulse Infographic | | |
| 15.3 | Customize Pulse | | |
| 15.4 | Insights Panel | | |
| 15.5 | Historical Pulses | | |
| 16.1 | Access Category Access Settings | | |
| 16.2 | View Default Permissions | | |
| 16.3 | Restrict a Category | | |
| 16.4 | Restore Access | | |
| 16.5 | Invite Code Category Defaults | | |
| 17.1 | Access Skills Panel | | |
| 17.2 | View Skill Details | | |
| 17.3 | Activate a Skill | | |
| 17.4 | Stack Multiple Skills | | |
| 17.5 | Deactivate a Skill | | |
| 17.6 | Suggest New Skill | | |
| 18.1 | Access Task Templates | | |
| 18.2 | Browse Template Categories | | |
| 18.3 | Preview a Template | | |
| 18.4 | Create Task from Template | | |
| 18.5 | Features Used Display | | |
| 19.1 | Report Task Delivers to Reports Tab | | |
| 19.2 | Report Uses Real Data | | |
| 19.3 | User Addressed by Name | | |
| 19.4 | Non-Report Task to Agent Chat | | |
| 19.5 | Task Execution History | | |
| 19.6 | Task Fails Gracefully | | |
| 20.1 | View Launch Preparation | | |
| 20.2 | Fuel Stage Progress | | |
| 20.3 | Boosters Stage Progress | | |
| 20.4 | Guidance Stage Progress | | |
| 20.5 | Launch Points Display | | |
| 20.6 | Ready to Launch | | |
| 21.1 | Access Team Chat | | |
| 21.2 | Send a Message | | |
| 21.3 | @Mention Team Member | | |
| 21.4 | @Mention AI Assistant | | |
| 21.5 | Real-Time Updates | | |
| 22.1 | Access Workshop | | |
| 22.2 | Workshop Onboarding | | |
| 22.3 | Workshop Guided Chat | | |
| 22.4 | Workshop Goals | | |
| 22.5 | Build Lab | | |
| 22.6 | Blueprint Export | | |
| 23.1 | Access Moonshot Challenge | | |
| 23.2 | View Scores | | |
| 23.3 | View Standings | | |
| 23.4 | Score Updates | | |
| 24.1 | Access Reports | | |
| 24.2 | View Generated Reports | | |
| 24.3 | Create Manual Report | | |
| 24.4 | Scheduled Report Configuration | | |
| 24.5 | Report Email Delivery | | |
| 24.6 | Team Reports | | |
| 25.1 | Access Help Center | | |
| 25.2 | FAQ Section | | |
| 25.3 | AI Help (Ask Astra) | | |
| 25.4 | Quick Start Guide | | |
| 26.1 | Team Data Isolation | | |
| 26.2 | Private Chat Isolation | | |
| 26.3 | Admin-Only Features | | |
| 26.4 | Category Access Enforcement | | |

---

## Recommended Actions After Testing

1. **Add your email address** to the email notification channel so proactive emails can be delivered
2. **Set some priorities** via the Agent Chat (ask Elle: "Help me set my priorities") so the overnight assistant can generate personalized insights
3. **Check back tomorrow** after the overnight assistant cron runs at 3 AM EST to see if insights were generated
4. **Monitor your scheduled tasks** -- the first one should execute on its next_run_at date
