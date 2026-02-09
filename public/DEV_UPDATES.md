# Development Updates

This document tracks all code changes, improvements, and fixes made to the AI Rocket platform.

## 2026

### February 2026

#### 2026-02-09: Scheduled Tasks - Features Used Display & Task Process Enforcement
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added "Features Used" detail to each scheduled task card so users can see which platform features the assistant leverages to perform each task. Updated task creation to auto-populate feature metadata. Updated existing tasks with correct metadata.
- **Changes**:
  - Updated create-scheduled-task edge function to auto-populate `features_used` in task metadata based on task_type and delivery_method
  - Added "Features Used" section in ScheduledTasksPanel expanded task details with icon badges (Team Data Search, Reports View, Agent Chat, Notifications)
  - Updated "Delivers to" label to show "Reports" for report-type tasks instead of raw delivery_method
  - Added fallback logic in UI to derive features from task_type when metadata is missing (backward compatibility)
  - Updated 2 existing scheduled tasks with correct features_used metadata
  - Re-triggered today's task which now correctly delivers to Reports tab with real data
  - Deployed updated create-scheduled-task edge function

#### 2026-02-09: Fix Scheduled Tasks - Hallucinated Data, Wrong Name, Report Routing
- **Category**: Bug Fix
- **Impact Score**: 8
- **Description**: Fixed three critical bugs in the process-scheduled-tasks edge function: (1) tasks called Gemini directly with no document context, causing completely fabricated financial data; (2) user was addressed as "User" due to wrong column name; (3) report-type tasks were delivered to Agent Chat instead of the Reports view.
- **Changes**:
  - Fixed loadUserContext to query `name` column instead of non-existent `full_name`
  - Replaced direct Gemini API calls with n8n webhook routing for proper RAG document retrieval
  - Report-type tasks now insert into `astra_chats` with mode='reports' instead of `agent_conversations`
  - Report tasks post a brief notification in Agent Chat directing user to Reports tab
  - Added active skills context to task prompts for skill-aware responses
  - Added explicit anti-hallucination instructions in the task prompt
  - Task execution now fails gracefully if n8n is unavailable rather than generating fabricated content
  - Deployed updated process-scheduled-tasks edge function

#### 2026-02-09: Comprehensive Documentation Sync for All Recent Features
- **Category**: Enhancement
- **Impact Score**: 6
- **Description**: Full audit and update of all user-facing content files against AI_ROCKET_KEY_FEATURES.md. Ensured every feature has FAQ entries, Help Assistant documentation, What's New database entries, and marketing content. Removed duplicate AI Advisors entry and fixed display_order issues.
- **Changes**:
  - Added 16 new FAQ entries: Skills (6), Team Dashboard (4), Category Data Access (2), Assistant Mode (2), Guided Task Builder (2), Connection Management (2)
  - Updated 3 existing FAQ answers to reference Connect page > My Connections tab
  - Added 7 new sections to documentation-context.ts: Team Dashboard, Category Data Access, Assistant Mode, Guided Task Builder, Assistant Skills, Connection Management, Key Concepts
  - Added Assistant Skills, Connection Management Hub, and Guided Task Builder to marketing-context.ts keyFeatures and useCases
  - Inserted 3 new What's New entries into database: Assistant Skills (2100), Guided Task Builder (2060), Connection Management Hub (2050)
  - Fixed 3 database entries with incorrect display_order (were 1-5, now 2020-2040)
  - Removed duplicate AI Advisors database entry (set is_published=false)
  - Updated WHATS_NEW_FEATURE.md with Guided Task Builder entry and SQL snippet

#### 2026-02-09: Connection Management & Suggest New Skill
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: The My Connections tab now allows full management of connections -- not just viewing. Admins can reconnect expired tokens, manage folders (add/remove), disconnect providers, and connect new providers directly from the Connect page. Also added a "Suggest New Skill" feature to the Skills panel where users can submit ideas for new skills they'd like to see added.
- **Changes**:
  - Rewrote MyConnectionsTab with full management capabilities: connect, reconnect, manage folders, add folders, disconnect
  - Integrated ConnectedFoldersStatus component for folder management (same rich UI used in Launch Prep)
  - Integrated AddMoreFoldersStep for adding new folders
  - Added provider-specific Connect buttons for Google Drive and Microsoft OneDrive
  - Added disconnect confirmation modal with safety messaging
  - Uses unified-drive-utils for proper dual-provider connection handling
  - Added SuggestSkillModal to AssistantSkillsPanel with name, description, and use case fields
  - Skill suggestions saved to feedback_submissions table with skill-specific metadata
  - Added "Suggest a New Skill" button at bottom of skills list with dashed border CTA

#### 2026-02-09: Unified Connect Page & Assistant Skill Activation via Chat
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Combined Connected Apps and MCP Tools into a single "Connect" page with three tabs: My Connections (active data connections overview), Apps (business tool integrations), and MCP Tools (AI tools and custom APIs). Also added the ability for the assistant to activate and deactivate Skills via chat conversation -- users can say "turn on financial analyst" and the assistant handles it directly.
- **Changes**:
  - Created `ConnectPage` component with tabbed layout (My Connections, Apps, MCP Tools)
  - My Connections tab shows Google Drive, Microsoft OneDrive, Gmail, and Calendar connections with folder details, status badges, and token expiry warnings
  - Replaced separate `connected-apps` and `mcp-tools` tiles with single `connect` tile (Link2 icon, teal) in Agent Tools
  - Updated routing in AgentModeMainContent and MainContainer to handle `connect` plus legacy tab IDs
  - Added `Link2` icon to all icon maps (MissionControlPage, ComingSoonModal, FeatureInfoModal)
  - Updated FeatureTabType to include `connect`
  - Added `skillUpdate` response field to team-agent-chat for assistant-driven skill activation/deactivation
  - Assistant can now activate/deactivate skills when users ask (e.g., "enable marketing strategist", "turn off competitive intel")
  - Updated navigation targets in assistant prompt to reference `connect` page
  - Deployed team-agent-chat edge function

#### 2026-02-09: Assistant Skills System & AI Improvement Strategies
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Implemented the Assistant Skills system -- capability modules that enhance how the AI assistant analyzes data and provides insights. Users can activate skills like Financial Analyst, Marketing Strategist, Competitive Intelligence, and more from a new Skills panel in Agent Tools. Active skills automatically enhance the assistant's system prompt, overnight insights, and proactive features. Also implemented 4 assistant improvement strategies: Capability Awareness, Feature Cross-Referencing, Contextual Depth, and Progressive Power Disclosure.
- **Changes**:
  - Created `assistant_skills` table with 10 initial skills across 5 categories (analysis, strategy, operations, creative, leadership)
  - Created `user_active_skills` table for per-user skill activation tracking
  - Created `AssistantSkillsPanel` component with skill browsing, activation toggles, and capability tags
  - Added Skills to Agent Tools grid (Zap icon, amber color) in TAB_CONFIGS, FeatureTabType, and all icon maps
  - Updated team-agent-chat edge function to fetch active skills and inject prompt enhancements
  - Added 4 Assistant Excellence Strategies to the system prompt (Capability Awareness, Feature Cross-Referencing, Contextual Depth, Progressive Power Disclosure)
  - Updated process-overnight-assistant to weight insights toward active skill areas
  - Wired Skills panel into AgentModeMainContent routing
  - Added Skills as feature #27 and Guided Task Builder as feature #28 to AI_ROCKET_KEY_FEATURES.md
  - Deployed team-agent-chat and process-overnight-assistant edge functions

#### 2026-02-09: Guided Task Builder & Template Library
- **Category**: Major Feature
- **Impact Score**: 7
- **Description**: Added a Guided Task Builder with browsable task templates to the Scheduled Tasks panel. Users can now discover and create useful scheduled tasks from pre-built templates across four categories: Productivity, Research & Intelligence, Team & Alignment, and Growth & Strategy. The assistant also now proactively mentions templates when users express interest in scheduling.
- **Changes**:
  - Created `scheduled_task_templates` database table with 16 pre-built templates
  - Created `useTaskTemplates` hook for fetching and categorizing templates
  - Created `TaskTemplateBuilder` component with category browsing, popular templates, and customization form
  - Updated `ScheduledTasksPanel` with "New Task" button and integrated template builder
  - Updated empty state to include "Browse Task Templates" call-to-action
  - Updated team-agent-chat system prompt to mention Task Template Builder and guide users to it
  - Added 'ai-advisors' feature description to MissionControlPage featureDescriptions
  - Redeployed team-agent-chat edge function

#### 2026-02-08: Add Advisors Feature to Agent Tools Grid
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added the AI Advisors feature to the Agent Tools grid on Mission Control. This feature was previously only visible in documentation but wasn't showing up in the main UI. Users can now see the Advisors tile and click the info button to learn about the upcoming feature.
- **Changes**:
  - Added 'ai-advisors' to TAB_CONFIGS in useOpenTabs.ts with Crown icon and amber color
  - Added 'ai-advisors' to FeatureTabType union in types/index.ts
  - Added Crown icon import and mapping in MissionControlPage.tsx, ComingSoonModal.tsx, and FeatureInfoModal.tsx
  - Set order to 7.7, placing Advisors between Coach (7.6) and Dashboards (8)
  - Marked as Coming Soon with rich description about AI Advisory Boards

#### 2026-02-08: Overnight Assistant Creative Variance Enhancement
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Expanded the overnight assistant to deliver more varied and surprising insights each day. Previously, the 3 daily insights tended to repeat similar themes because the AI had no memory of recent topics and used a narrow set of analysis lenses. Now the system avoids repeating topics from the last 7 days and guarantees at least 1 of the 3 insights uses a rotating "wildcard" creative lens for a fresh perspective.
- **Changes**:
  - Added 7-day recent insight title tracking to prevent topic repetition
  - Added 7 rotating wildcard creative lenses (cross-pollinate, devil's advocate, hidden signal, time machine, outside-in view, what-if scenario, narrative arc) that cycle daily
  - 3rd insight now always uses the day's wildcard lens for guaranteed variety
  - Bumped Gemini temperature from 0.6 to 0.8 for more creative output
  - Prompt now explicitly instructs the AI to avoid recently covered topics
  - Redeployed process-overnight-assistant edge function

#### 2026-02-08: Fix Scheduled Reports Not Running (Stuck next_run_at Bug)
- **Category**: Bug Fix
- **Impact Score**: 7
- **Description**: Fixed two bugs in the scheduled reports system that caused some daily reports to silently fail and never generate. The root cause was that the pre-generation cron (2 AM EST) would mark reports as "run" before the n8n webhook call completed, and if n8n failed, the report appeared processed but produced no output. A second bug in the time calculation caused next_run_at to be set to the same value (not advancing) when reports were processed before their scheduled Eastern time. This affected 6 reports across multiple users.
- **Changes**:
  - Moved last_run_at update to AFTER successful n8n webhook + chat insertion (was incorrectly set before)
  - Added next_run_at revert on n8n webhook failure so reports retry on the next hourly cron
  - Added safeguard in calculateNextRunTime to always return a future time (advances by one period if calculated time is in the past)
  - Fixed EDT/DST calculation bug for March dates when the 1st falls on a Sunday
  - Redeployed check-scheduled-reports edge function
  - Reset 6 stuck reports and triggered immediate re-run

#### 2026-02-07: Assistant Feedback Modal on All Messages
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Replaced the confusing follow-up feedback question ("Were these insights helpful?") with a dedicated Feedback tag on every assistant message. Clicking the tag opens a modal where users can rate the message as helpful/not helpful and provide suggestions. This avoids the issue where the assistant mistakenly treated feedback responses as new analysis requests. The assistant learns from all feedback to improve future insights.
- **Changes**:
  - Created InsightFeedbackModal component with helpful/not helpful toggle, text area for suggestions, and learning indicator
  - Added subtle "Feedback" tag at the bottom of all assistant messages (live and overnight)
  - Modal stores feedback in assistant_conversation_feedback table and calls collect-insight-feedback for overnight insights
  - Removed the follow-up "Were these insights helpful?" message from process-overnight-assistant edge function
  - Redeployed process-overnight-assistant edge function

#### 2026-02-07: Assistant Overnight Message - Create Images & Presentations Flow
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Redesigned the overnight analysis details page to replace the Create Visualization button with a new "Create Images & Presentations" flow. Users now select one of their 3 insights, and the assistant opens the Creative Suite with that insight pre-loaded as a custom prompt. Also changed the Team Data toggle default to OFF across the Creative Suite so custom prompts focus on their own content by default.
- **Changes**:
  - Removed "Create Visualization" button from the OvernightDetailModal
  - Added "Create Images & Presentations" button with insight selection picker
  - When user selects an insight, the content is extracted and inserted into Creative Suite as a custom prompt
  - Creative Suite now opens at step 1 (content) showing the loaded prompt, not step 2
  - Component fully resets via key prop when selecting a new insight (no stale state from previous selection)
  - Assistant sends a chat message confirming the insight was sent to Creative Suite
  - Confirmation screen shown briefly before navigating to Creative Suite
  - Changed Team Data toggle default from ON to OFF in AstraCreateView
  - Updated brief message to use first name only, bold insight titles, and simpler ending
  - Deployed updated process-overnight-assistant edge function
  - Updated assistant test cron to 4:15 PM EST

#### 2026-02-07: Fix New Team Signup - Database Error on User Impact Progress
- **Category**: Bug Fix
- **Impact Score**: 8
- **Description**: Fixed critical signup bug where new team signups (Preview Access invites with no pre-existing team) would fail with "Database error saving new user". The `initialize_user_impact_progress` trigger on the public.users table was inserting into `user_impact_progress` with a NULL team_id, violating the NOT NULL constraint. This affected all users signing up via Preview Access invite codes that create a new team.
- **Changes**:
  - Updated `initialize_user_impact_progress()` function to skip initialization when team_id is NULL
  - Impact progress will be initialized later when the user gets assigned to a team
  - Verified fix with simulation test

#### 2026-02-07: Overnight Assistant UX Overhaul - Simplified Messages, Better Formatting, Weekly Check-in
- **Category**: Feature Enhancement
- **Impact Score**: 8
- **Description**: Overhauled the overnight assistant experience. Reduced insights from 4 to 3, simplified the chat message to just list insight titles with a single "View Full Details" button, removed thumbs up/down feedback in favor of conversational feedback, improved markdown formatting in the detail modal, renamed "Create Infographic" to "Create Presentation", fixed the Create Visualization and Create Presentation buttons to actually trigger their respective features, and added a weekly Friday 1pm EST check-in message.
- **Changes**:
  - Updated process-overnight-assistant edge function to generate exactly 3 insights instead of 2-4
  - Simplified brief summary to just list insight titles (no descriptions in chat message)
  - Added follow-up feedback message after insights asking user for conversational feedback
  - Removed thumbs up/down UI and related state from AgentChatPanel
  - Simplified overnight message to only show "View Full Details" button (removed Create Visualization/Create Infographic from chat)
  - Rewrote OvernightDetailModal with comprehensive markdown rendering (headers, tables, bullets, bold, horizontal rules)
  - Renamed "Create Infographic" to "Create Presentation" throughout the detail modal
  - Fixed Create Visualization to send content as prompt to agent chat for processing
  - Fixed Create Presentation to navigate to AstraCreateView with content prefilled
  - Created assistant_conversation_feedback table for logging conversational feedback
  - Created and deployed process-weekly-checkin edge function for Friday 1pm EST check-ins
  - Added pg_cron job for weekly Friday check-in (0 18 * * 5 = 1pm EST)

#### 2026-02-07: Fix Login Flow - User Exists Check Not Working
- **Category**: Bug Fix
- **Impact Score**: 8
- **Description**: Fixed critical authentication issue where the login flow was incorrectly routing existing users to the signup screen instead of the login screen. The auth-preflight-check edge function was querying the public.users table which was being blocked by RLS policies (from recent infinite recursion fixes), causing it to silently fail and return `exists: false` for all users. Updated to use the Supabase Admin API to check auth.users directly, completely bypassing RLS.
- **Changes**:
  - Updated auth-preflight-check edge function to use `supabase.auth.admin.listUsers()` instead of querying public.users table
  - Added proper error logging for debugging authentication issues
  - Now bypasses RLS entirely by checking auth.users directly through admin API
  - Deployed updated edge function

#### 2026-02-07: Redesign Overnight Assistant to Be Data-Driven and Proactive
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Completely redesigned the overnight assistant to deliver real value from team data instead of generic feature usage metrics. The assistant now analyzes the team's actual document categories, generates priority-aligned research prompts using the Guided Chat pattern, sends those prompts to the n8n team agent to get real insights from synced data, and compiles the agent's responses into a morning briefing. The user sees a brief summary with action buttons to view detail, create a visualization, or create an infographic.
- **Changes**:
  - Rewrote process-overnight-assistant edge function with data-driven approach
  - New flow: analyze team data -> generate priority-aligned prompts -> send to n8n team agent -> compile real insights
  - Removed feature usage metrics focus (team chats, reports counts, etc.)
  - Added team data analysis step using get_team_category_counts and get_team_documents_list RPCs
  - Prompt generation now uses 5 lens types: research, action_items, content_draft, competitive_intel, goal_progress
  - Each generated prompt is sent to the n8n webhook to query actual team data
  - Agent responses are compiled into brief + detailed summaries
  - Changed test cron from 2pm EST to 3pm EST
  - Deployed updated edge function

#### 2026-02-07: Fix Overnight Assistant + Add Action Buttons for Morning Insights
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Fixed the overnight assistant cron job which was failing due to broken configuration references, and enhanced the morning insights experience. The assistant now shows a brief summary with three action buttons: View Detailed Analysis (full modal), Create Visualization (routes to Creative Suite), and Create Infographic (routes to Creative Suite with content prefilled). Also fixed 4 other broken cron jobs with the same issue.
- **Changes**:
  - Fixed 5 broken cron jobs using `current_setting('app.settings.supabase_url')` which doesn't exist -- replaced with hardcoded URL matching working cron jobs
  - Updated process-overnight-assistant edge function to generate brief summary + detailed content stored in metadata
  - Added three action buttons below overnight messages: View Detail, Create Visualization, Create Infographic
  - Added `overnight_detail`, `overnight_visualization`, `overnight_create` action types to AgentAction
  - Added `overnightContent` state to AgentAppContext for passing content between agent chat and main app
  - Created OvernightDetailModal in AgentModeMainContent for viewing full analysis
  - Updated AstraCreateView to accept `initialCustomContent` prop for prefilling from overnight analysis
  - Added 2pm EST test cron job for overnight assistant testing
  - Deployed updated edge function

#### 2026-02-07: Fix Team Settings Admin Detection Across All Tabs
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed issue where Meeting Types, News & Industry, and Category Access tabs in Team Settings did not recognize the user as admin. The modal now checks admin status directly from the auth session as a fallback when the prop isn't passed.
- **Changes**:
  - Added `resolvedIsAdmin` state with direct auth session check in TeamSettingsModal
  - Replaced all `isAdmin` prop references with resolved value

#### 2026-02-07: Combine Team and Admin Settings into Single Team Settings Modal
- **Category**: Enhancement
- **Impact Score**: 4
- **Description**: Merged the separate "Team" and "Admin & Team Settings" menu items into a single "Team Settings" button. The modal now has a "Team Members" tab alongside the existing settings tabs, reducing user confusion.
- **Changes**:
  - Combined two separate menu items into one "Team Settings" button in MissionControlPage
  - Added "Team Members" tab as default first tab in TeamSettingsModal
  - Admin users see all tabs (Members, Meeting Types, News, Category Access); non-admins see only Members tab
  - Removed standalone TeamMembersPanel modal from MissionControlPage
  - Passed isAdmin prop from MainContainer to TeamSettingsModal

#### 2026-02-07: Fix Admin Dashboard Reports Section
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed the Reports section of the Admin Dashboard which was showing 0 for all metrics. The edge function was querying a non-existent table name, the super admin lacked read access to report tables, and the reports query used a foreign key join to auth.users that silently failed.
- **Changes**:
  - Fixed edge function table name from `user_reports` to `astra_reports`
  - Added `reports_today` count to edge function response
  - Added super admin SELECT policies to `astra_reports` and `report_email_deliveries` tables
  - Updated Reports metric card to show reports run today instead of configured count
  - Fixed ReportsAnalyticsPanel query to fetch users separately (FK pointed to auth.users, not public.users)
  - Redeployed admin-dashboard-data edge function

#### 2026-02-07: Fix Infinite Recursion in Users Table RLS Policy
- **Category**: Bug Fix
- **Impact Score**: 8
- **Description**: Fixed a critical database error where the users table SELECT policy referenced itself, causing infinite recursion. This broke profile loading, admin dashboard data, and invite code queries for all authenticated users. Also cleaned up super admin policies on moonshot and workshop tables, and removed the unused Invite New Teams section from User Settings.
- **Changes**:
  - Created `get_my_team_id()` SECURITY DEFINER helper function to safely query team_id without triggering RLS
  - Fixed users table SELECT policy to use helper function instead of self-referencing subquery
  - Updated moonshot_registrations super admin policies to use `is_super_admin()` instead of direct users table queries
  - Updated workshop_registrations super admin SELECT policy to use `is_super_admin()`
  - Removed AdminInviteCodesPanel from UserSettingsModal (no longer needed)

#### 2026-02-07: Comprehensive RLS Security Audit and Fixes
- **Category**: Security
- **Impact Score**: 9
- **Description**: Performed a full security audit of all Row Level Security (RLS) policies across the database. Identified and fixed 9 categories of vulnerabilities including wide-open public access policies, disabled RLS, mislabeled service-role policies, missing ownership checks, and duplicate policies. Created a new edge function to securely handle pre-authentication checks that previously relied on anonymous database access.
- **Changes**:
  - Fixed 4 tables with wide-open `{public} FOR ALL USING(true)` policies (app_config, folder_sync_status, team_goals, team_strategy_config)
  - Enabled RLS on scan_queue table which had it completely disabled
  - Blocked anonymous SELECT on users, teams, and moonshot_registrations tables
  - Fixed moonshot_rbg_scores policies mislabeled as "service role" but granted to authenticated with no restrictions
  - Added ownership checks to astra_notifications and workshop_registrations INSERT policies
  - Added field validation to 5 anonymous INSERT policies across moonshot tables and preview_requests
  - Removed 4 duplicate RLS policies on gmail_auth table
  - Changed document_chunks and team_members from {public} to {authenticated} role
  - Updated is_super_admin() function with comprehensive admin email list
  - Created and deployed auth-preflight-check edge function for secure pre-auth email/team lookups
  - Updated CustomAuth.tsx to use edge function instead of direct anonymous queries
  - Updated MoonshotRegistrationPage.tsx to use edge function for anonymous registration checks
  - Created RLS_SECURITY_FIXES.md with full documentation and rollback instructions for every fix

#### 2026-02-07: Preview Indicators and Tag Cleanup
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Added "Preview Feature" banners to Scheduled Tasks, Connected Apps, and MCP Tools pages to clearly communicate these features are in preview testing and not yet available for all users. Removed the "New" badges from Dashboards and Create in the Mission Control Agent Tools grid.
- **Changes**:
  - Added amber preview banner with FlaskConical icon to ScheduledTasksPanel
  - Added amber preview banner with FlaskConical icon to ConnectedAppsPage
  - Added amber preview banner with FlaskConical icon to MCPToolsPage
  - Removed "New" badge from team-dashboard and team-pulse tiles in MissionControlPage

#### 2026-02-07: Dead Code Cleanup - Remove 11 Unused Files
- **Category**: Cleanup
- **Impact Score**: 4
- **Description**: Removed 11 completely unused files (5,174 lines of dead code) identified through a comprehensive codebase audit. All files had zero imports anywhere in the project and were confirmed superseded by newer implementations.
- **Changes**:
  - Removed GoogleDriveSettings.tsx (1,797 lines) - replaced by Launch Preparation flow
  - Removed AstraCreateModal.tsx (569 lines) - superseded by AstraCreateView.tsx
  - Removed FeedbackAnalyticsPanel.tsx (395 lines) - never wired into admin dashboard
  - Removed MoonshotChallengeModal.tsx (322 lines) - replaced by dedicated page route
  - Removed TeamPulseView.tsx (203 lines) - orphaned top-level view
  - Removed ValidatedAIMessage.tsx (203 lines) - never integrated into chat rendering
  - Removed TeamPulseHealthScore.tsx (179 lines) - superseded by TeamPulseInfographic
  - Removed SavedVisualizationsList.tsx (117 lines) - replaced by visualization gallery
  - Removed useReports.ts hook (826 lines) - superseded by ReportsContext
  - Removed buildPlanGuides.ts (432 lines) - orphaned data never integrated
  - Removed template-search-service.ts (131 lines) - consumers use n8n-templates directly

#### 2026-02-07: Mobile Header Redesign, Navigation Cleanup, Clear Conversation in Settings
- **Category**: Enhancement
- **Impact Score**: 7
- **Description**: Redesigned mobile responsive layout with AI Rocket header at top including all action buttons (Install, Refresh, Notifications, Support, User avatar). Added "Assistant Mode" / "Mission Control" toggle bar. Removed tab bar from both mobile and desktop. Moved Clear Conversation to User Settings with a warning dialog. Removed the agent name header bar from mobile chat. Fixed desktop content being cut off under the fixed header.
- **Changes**:
  - Rewrote AgentModeMobileLayout with full AI Rocket header including all action buttons
  - Added UserSettingsModal integration to mobile layout for user avatar tap
  - Added hideHeader prop to AgentChatPanel to suppress the agent name bar on mobile
  - Fixed desktop content cut off by adding pt-16 offset when Header is shown
  - Removed DynamicTabBar and tab management code from AgentModeMainContent
  - Moved Clear Conversation from chat menu to UserSettingsModal with warning/confirmation UI
  - Removed Refresh data status menu option entirely
  - Added iconSizeOverrides map in MissionControlPage for MCP Tools Wrench icon visual balance

#### 2026-02-07: Document Preview Features Across Help System
- **Category**: Enhancement
- **Impact Score**: 5
- **Description**: Added comprehensive documentation for all new Preview features (Proactive Assistant, Scheduled Tasks, Connected Apps, MCP Tools & API Wizard) across the platform's help system and feature documentation files.
- **Changes**:
  - Updated AI_ROCKET_KEY_FEATURES.md with 4 new Preview feature entries (#25-#28) including detailed feature lists, access paths, and impact descriptions
  - Added 5 new What's New entries to Supabase `whats_new` table (display_order 1800-2000) for Proactive Assistant, Scheduled Tasks, Connected Apps Hub, MCP Tools & API Wizard, and Assistant Mode Enhancements
  - Updated WHATS_NEW_FEATURE.md with February 2026 section documenting all new preview entries
  - Added 4 new FAQ categories to helpFAQ.ts: proactive-assistant, scheduled-tasks, connected-apps, mcp-tools
  - Added 20 new FAQ items covering all preview features with detailed answers
  - Updated documentation-context.ts with 4 new comprehensive sections for the AI Help assistant knowledge base
  - Added "Preview Features" concept to Key Concepts section in documentation context

#### 2026-02-07: Fix MCP Tools Tab Icon and Page Rendering + Testing Guide Update
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed two bugs with the MCP Tools tab: the missing Wrench icon in the tab bar and the empty page content when opened in Agent Mode. Also updated the testing guide with comprehensive Phase 4 and Phase 5 testing steps.
- **Changes**:
  - Added Wrench, Plug, Sparkles, Search, Target icons to DynamicTabBar iconMap
  - Added Wrench icon to MissionControlPage featureIconMap
  - Added mcp-tools entry to MissionControlPage featureDescriptions
  - Added cyan, blue, amber color entries to MissionControlPage colorClasses
  - Added mcp-tools case to AgentModeMainContent switch statement (was falling through to default)
  - Imported MCPToolsPage in AgentModeMainContent
  - Added Part 10 (MCP Tools - 7 tests) and Part 11 (API Wizard - 10 tests) to testing guide

#### 2026-02-07: Build MCP Client Layer (Phase 4) and API Wizard (Phase 5)
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Implemented the complete MCP Client Layer and API Wizard system. Teams now have a built-in MCP server (n8n Automation Hub) that auto-discovers workflows as AI tools. The API Wizard lets users connect any third-party API by pasting documentation -- AI analyzes it, generates tool schemas, and submits for admin approval. The AI assistant is now aware of all MCP tools and custom APIs, and can reference them in conversations.
- **Changes**:
  - Created `mcp_servers` table for MCP server registry with health monitoring
  - Created `mcp_tools` table for tools discovered from MCP servers
  - Created `mcp_tool_executions` table for audit logging of all tool executions
  - Created `custom_api_definitions` table for user-defined API connections via the API Wizard
  - Created `custom_api_endpoints` table for AI-generated endpoint schemas
  - Created `get_team_available_tools()` database function for unified tool discovery
  - Built and deployed `mcp-client` edge function (list servers, list tools, execute tools, sync tools, health check)
  - Built and deployed `api-wizard` edge function (analyze API docs, generate endpoints, test connections, approval workflow)
  - Registered n8n as default MCP server for all teams with auto-registration trigger for new teams
  - Created `useMCPTools.ts` hook with `useMCPServers`, `useMCPTools`, and `useCustomApis` composables
  - Built MCP Tools page with server management, tool discovery, search/filter, and API Wizard integration
  - Built API Wizard modal with 5-step flow: input docs, AI analysis, review endpoints, authentication, generate & submit
  - Added `mcp-tools` tab to navigation system
  - Integrated MCP tools and custom APIs into AI agent context in team-agent-chat edge function
  - Updated Connected Apps page info banner to reference MCP Tools tab
  - All database tables have RLS enabled with proper team-scoped and admin policies
  - Tool execution stats auto-update via database trigger

#### 2026-02-07: Deploy 24 MCP Integration Workflows to n8n
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Built and deployed 24 n8n workflows covering 13 third-party integrations for the MCP connection system. Each integration has a Query workflow (on-demand data fetching) and Sync workflow (scheduled data ingestion into Astra's knowledge base). All workflows are active with webhook endpoints and registered in the integration_registry database.
- **Changes**:
  - Created temporary `n8n-workflow-deployer` edge function for programmatic workflow deployment via n8n REST API
  - Deployed 13 Query workflows: QuickBooks, Xero, Stripe, Slack, HubSpot, Salesforce, GoHighLevel, Notion, Asana, Monday.com, Trello, Fireflies.ai, Mailchimp
  - Deployed 11 Sync workflows: QuickBooks, Xero, Stripe, Slack, HubSpot, Salesforce, Notion, Fireflies.ai, Monday.com, Asana, Trello
  - Each query workflow has: Webhook Trigger, Validate & Get Credentials, IF check, Execute Operation, Respond to Webhook
  - Each sync workflow has: Webhook Trigger, optional Schedule Trigger, Sync All Teams logic, Respond to Webhook
  - Activated all 24 workflows in n8n instance
  - Updated `integration_registry` table: set n8n_workflow_id, n8n_webhook_url, and status='available' for all 13 providers
  - Tested webhook connectivity - all endpoints responding with status 200
  - Known issue: n8n Code nodes use `fetch()` which is not available in n8n's sandboxed environment; HTTP calls need refactoring to use n8n HTTP Request nodes

#### 2026-02-07: Connected Apps Phase 3 - Agent Awareness, Audit Logging, Token Monitoring & Notification Wiring
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Advanced the Connected Apps system with five major infrastructure improvements. Legacy drive connections now automatically sync into the unified integration registry. All integration changes are automatically audit-logged. The AI assistant now knows which integrations a user has connected and can suggest available ones. The overnight assistant now queues daily summary notifications for users who want them. A new token health monitoring system checks all integrations every 30 minutes, auto-marks expired tokens, attempts refresh, and notifies users of expiring connections.
- **Changes**:
  - Created migration to sync `user_drive_connections` into `user_integrations` with automatic trigger for future connections
  - Backfilled all existing active Google Drive and Microsoft OneDrive connections
  - Created `integration_audit_log` table with automatic triggers on INSERT/UPDATE/DELETE of user_integrations
  - Audit log tracks: connect, disconnect, token_refresh, token_expired, status_change, agent_use events
  - Updated `team-agent-chat` edge function to query connected and available integrations
  - Added `connectedIntegrations` and `availableIntegrations` to AgentContext interface
  - Injected integration context into system prompt so agent can reference connected tools and suggest new ones
  - Added `connected-apps` to navigation targets so agent can direct users there
  - Added Connected Apps as feature #11 in platform capabilities
  - Updated `process-overnight-assistant` to query connected integrations and include in reasoning context
  - Wired overnight assistant to queue `daily_summary` notifications with dedup keys
  - Created `check_integration_token_health()` database function for token expiry scanning
  - Created `get_integration_health_summary()` function for team-level health stats
  - Created and deployed `check-integration-health` edge function with auto-refresh for Google/Microsoft tokens
  - Set up cron job running every 30 minutes for continuous health monitoring
  - Deployed updated `team-agent-chat` and `process-overnight-assistant` edge functions

#### 2026-02-07: Add Calendar OAuth Scopes & Extend Agent Calendar Lookahead
- **Category**: Enhancement
- **Impact Score**: 5
- **Description**: Added calendar-specific OAuth scopes to both Google and Microsoft OAuth flows so calendar API calls succeed after user consent. Extended the AI agent's calendar awareness window from 3 days to 7 days so users get a full week of scheduling context in conversations.
- **Changes**:
  - Added `calendar.readonly` scope to Google OAuth flow in `google-drive-oauth.ts`
  - Added `Calendars.Read` scope to Microsoft OAuth flow in `microsoft-graph-oauth.ts`
  - Changed calendar lookahead in `team-agent-chat` from 3 days to 7 days
  - Redeployed `team-agent-chat` edge function
- **Note**: Existing users will need to reconnect their Google/Microsoft accounts to grant the new calendar permission

#### 2026-02-06: Connected Apps Hub & Google Calendar Integration (Phase 1 & 2)
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Implemented the first two phases of the MCP Data Connection Strategy. Created the Integration Registry database system that serves as the foundation for all current and future third-party integrations. Built the Connected Apps page where users can view, connect, and manage integrations. Deployed Google Calendar edge function that fetches upcoming events using existing Google Drive OAuth tokens. Integrated calendar data directly into the AI agent's context so it can reference upcoming meetings, schedule conflicts, and availability in conversations.
- **Changes**:
  - Created `integration_registry` table with provider catalog (20 integrations seeded)
  - Created `user_integrations` table with full RLS policies for connection tracking
  - Seeded registry with providers across 9 categories: storage, calendar, accounting, communication, CRM, project management, transcription, analytics, custom
  - Built `ConnectedAppsPage.tsx` with category-grouped integration cards, status badges, and connect/disconnect flows
  - Built `ConnectCalendarModal.tsx` for one-click calendar connection using existing OAuth tokens
  - Built `useIntegrations.ts` hook for data fetching, category grouping, and connection management
  - Added `connected-apps` tab type, config, and rendering in both MainContainer and AgentModeMainContent
  - Added Plug icon and feature description to MissionControlPage feature grid
  - Created and deployed `google-calendar-events` edge function (fetches next 7 days of events)
  - Integrated calendar event fetching into `team-agent-chat` edge function (3-day lookahead, 15 events max)
  - Added `upcomingCalendarEvents` to AgentContext interface and prompt injection
  - Deployed both edge functions
- **Files Changed**:
  - `supabase/migrations/*_create_integration_registry_system.sql` (new)
  - `supabase/migrations/*_seed_integration_registry_initial_providers.sql` (new)
  - `src/hooks/useIntegrations.ts` (new)
  - `src/components/ConnectedAppsPage.tsx` (new)
  - `src/components/ConnectCalendarModal.tsx` (new)
  - `src/types/index.ts` - Added 'connected-apps' to FeatureTabType
  - `src/hooks/useOpenTabs.ts` - Added connected-apps tab config
  - `src/components/MissionControlPage.tsx` - Added Plug icon and description
  - `src/components/MainContainer.tsx` - Added ConnectedAppsPage rendering
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Added ConnectedAppsPage rendering
  - `supabase/functions/google-calendar-events/index.ts` (new, deployed)
  - `supabase/functions/team-agent-chat/index.ts` - Added calendar context fetching and prompt injection (deployed)

#### 2026-02-06: MCP Data Connection Strategy -- Comprehensive Integration Plan
- **Category**: Infrastructure
- **Impact Score**: 8
- **Description**: Created a comprehensive, customer-demand-driven integration strategy document that maps real user feedback (from shareholder meetings, 1-1 guided setups, and strategic roadmap sessions) to a phased technical implementation plan. The strategy uses three complementary approaches (Native OAuth extensions, n8n Bridge integrations, and MCP Protocol) unified through a single Integration Registry. Updated all related planning and feature documentation to reference the new strategy.
- **Changes**:
  - Created `MCP_DATA_CONNECTION_STRATEGY.md` with full 6-phase plan covering QuickBooks, Calendar, Slack, CRM, project tools, MCP client, API Wizard, and security governance
  - Updated `AGENT_CONNECTION_PLAN.md` to reference new strategy as the implementation plan (v2.1)
  - Updated `MCP_BACKEND_CLIENT_ARCHITECTURE.md` to reference new strategy and mark as Phase 4 (v1.1)
  - Updated `AI_ROCKET_KEY_FEATURES.md` to add "Connected Apps & Integrations" as coming soon feature (#24)
  - Updated `BUILD_PLAN.md` roadmap to replace outdated Q2-Q3 2025 roadmap with Q1 2026 data connection phases
  - Updated `AI_ROCKET_APP_OVERVIEW.md` roadmap section with near-term integration priorities
- **Files Changed**:
  - `MCP_DATA_CONNECTION_STRATEGY.md` (new)
  - `AGENT_CONNECTION_PLAN.md`
  - `MCP_BACKEND_CLIENT_ARCHITECTURE.md`
  - `AI_ROCKET_KEY_FEATURES.md`
  - `BUILD_PLAN.md`
  - `AI_ROCKET_APP_OVERVIEW.md`

#### 2026-02-06: Add SharePoint Site Discovery to Microsoft Drive Selector
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed an issue where Microsoft users with SharePoint drives could only see their personal OneDrive folders during folder selection. The drive listing function was only checking followed sites, which most users don't explicitly follow. Now searches all accessible SharePoint sites so users can browse and connect SharePoint document libraries alongside their OneDrive.
- **Changes**:
  - Updated `list-microsoft-drives` edge function to use `sites?search=*` API to find all accessible SharePoint sites, in addition to followed sites
  - Added deduplication logic for sites found via both search and followed endpoints
  - Added deduplication for drives to prevent duplicate entries
  - Updated provider name from "OneDrive" to "OneDrive / SharePoint" in ChooseFolderStep and AddMoreFoldersStep components
  - Redeployed list-microsoft-drives edge function
- **Files Changed**:
  - `supabase/functions/list-microsoft-drives/index.ts`
  - `src/components/setup-steps/ChooseFolderStep.tsx`
  - `src/components/setup-steps/AddMoreFoldersStep.tsx`

#### 2026-02-06: Fix Google Drive Folder Listing Database Error
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed a "Database error" that appeared when users tried to connect Google Drive folders. The issue occurred for teams that have both Google and Microsoft drive connections active. The edge functions were missing a provider filter, causing the database query to return multiple rows and fail.
- **Changes**:
  - Added `.eq("provider", "google")` filter to both user and team connection queries in `list-google-drive-folders` edge function
  - Added `.eq("provider", "google")` filter to both user and team connection queries in `list-google-drive-files` edge function
  - Redeployed both edge functions
- **Files Changed**:
  - `supabase/functions/list-google-drive-folders/index.ts`
  - `supabase/functions/list-google-drive-files/index.ts`

#### 2026-02-06: Dynamic AI-Generated Greeting Suggestions in Live Mode
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Replaced hardcoded live mode suggestion buttons with AI-generated, personalized suggestions. When a user enters live mode (either after onboarding or returning to chat), the assistant now reviews their priorities, feature usage, strategic identity, scheduled tasks, and time of day to generate 3 contextual action suggestions unique to that user.
- **Changes**:
  - Added `generateGreeting` handler in team-agent-chat edge function that loads full user context and generates personalized greeting + 3 suggestions via Gemini
  - Added `generateGreeting` function in agent-gemini-service.ts
  - Updated `initializeReturningUser` in AgentChatPanel to call dynamic greeting instead of hardcoded text
  - Updated `enterLiveMode` in AgentChatPanel to call dynamic greeting
  - Updated MessageBubble live choices rendering to use dynamic suggestions with fallback to hardcoded defaults
  - Added `DynamicSuggestion` and `GreetingResponse` types
- **Files Changed**:
  - `supabase/functions/team-agent-chat/index.ts` - Added greeting generation handler
  - `src/lib/agent-gemini-service.ts` - Added generateGreeting function and types
  - `src/components/agent-mode/AgentChatPanel.tsx` - Dynamic suggestions in greetings and rendering

#### 2026-02-06: Proactive Assistant Phase 2 -- User-Scheduled Tasks System
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Implemented Phase 2 of the Proactive Assistant system. Users can now schedule recurring or one-time AI tasks through natural conversation. The assistant understands scheduling requests like "Remind me every Monday at 9am to review my goals" and automatically creates tasks that run on schedule. A background processor executes due tasks every 15 minutes using Gemini AI, delivering results directly into the assistant chat. Users can manage tasks (pause, resume, delete) from a dedicated Scheduled Tasks panel accessible from Mission Control.
- **Changes**:
  - Created `user_scheduled_tasks` table with frequency, schedule, and lifecycle tracking
  - Created `scheduled_task_executions` table for execution history and audit trail
  - Built `create-scheduled-task` edge function for task creation with timezone-aware scheduling
  - Built `process-scheduled-tasks` edge function that runs every 15 minutes via pg_cron
  - Set up cron job for scheduled task processing
  - Updated `team-agent-chat` system prompt with full scheduling awareness and `schedule_task` action type
  - Added scheduling handler in team-agent-chat to call create-scheduled-task on detection
  - Added `schedule_task` to AgentAction type in useAgentConversation hook
  - Built `useScheduledTasks` hook with realtime subscriptions, pause/resume/delete, and execution history
  - Built `ScheduledTasksPanel` component with filter tabs, task cards, and execution history modal
  - Added `scheduled-tasks` tab to tab config system, types, DynamicTabBar, and MissionControlPage
  - Integrated ScheduledTasksPanel into AgentModeMainContent routing
- **Files Changed**:
  - `supabase/functions/create-scheduled-task/index.ts` - New edge function
  - `supabase/functions/process-scheduled-tasks/index.ts` - New edge function
  - `supabase/functions/team-agent-chat/index.ts` - Scheduling awareness + action handler
  - `src/hooks/useScheduledTasks.ts` - New hook
  - `src/hooks/useAgentConversation.ts` - Added schedule_task action type
  - `src/hooks/useOpenTabs.ts` - Added scheduled-tasks tab config
  - `src/components/ScheduledTasksPanel.tsx` - New component
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Added route
  - `src/components/DynamicTabBar.tsx` - Added CalendarClock icon
  - `src/components/MissionControlPage.tsx` - Added icon and description
  - `src/types/index.ts` - Added scheduled-tasks to FeatureTabType

#### 2026-02-06: Proactive Assistant Phase 1 -- Strategic Identity, Overnight Reasoning, and Feedback Loop
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Implemented Phase 1 of the Proactive Assistant system. The assistant now runs an autonomous overnight analysis at 3 AM EST for all users with proactive mode enabled. It uses a Four-Lens Reasoning Protocol (Deviation Detection, Goal Alignment, Automation Opportunity, Predictive Risk) to generate personalized insights based on each user's priorities, document activity, and engagement patterns. Results are delivered as a "While You Were Sleeping" morning briefing in the assistant chat. Users can rate insights with thumbs up/down, which feeds into an evolving Strategic Identity profile that makes the assistant smarter about each user over time. The system auto-adjusts proactive level if the helpful ratio drops below 30%.
- **Changes**:
  - Created `user_strategic_identity` table for evolving user profiles ("SOUL" system)
  - Created `assistant_proactive_insights` table for insight tracking with feedback fields
  - Created `assistant_feedback_sessions` table for explicit feedback logging
  - Built `update-strategic-identity` edge function that uses Gemini to evolve user profiles
  - Built `process-overnight-assistant` edge function with Four-Lens Reasoning Protocol
  - Built `collect-insight-feedback` edge function with auto-adjust proactive level logic
  - Set up pg_cron job running daily at 8 AM UTC (3 AM EST)
  - Added thumbs up/down feedback UI to overnight assistant messages in AgentChatPanel
  - High-urgency insights (7+) trigger immediate notifications via existing notification pipeline
  - Feedback triggers Strategic Identity updates for continuous learning
- **Files Changed**:
  - `supabase/functions/update-strategic-identity/index.ts` - New edge function
  - `supabase/functions/process-overnight-assistant/index.ts` - New edge function
  - `supabase/functions/collect-insight-feedback/index.ts` - New edge function
  - `src/components/agent-mode/AgentChatPanel.tsx` - Feedback UI additions

#### 2026-02-06: Desktop Mission Control Layout Redesign
- **Category**: Enhancement
- **Impact Score**: 6
- **Description**: Redesigned the desktop Mission Control layout for better use of space. Agent Tools now takes full width of the main area with larger cards. Launch Points moved to the right sidebar under Team/Admin settings. All subtitles removed from Agent Tool cards. AI Data Sync made more compact. Loading screen text updated.
- **Changes**:
  - Agent Tools section now spans full width of main content area (no max-width constraint)
  - Increased Agent Tool card sizes: larger icons (12x12), more vertical padding
  - Removed all subtitles from Agent Tool cards including "View Progress" and "Soon" labels
  - Moved Launch Points from main area to right sidebar as compact horizontal rows
  - Right sidebar now fixed width (280px) with Data Sync, Team/Admin, and Launch Points
  - Combined Team members panel and Admin Settings into one unified card
  - Made AI Data Sync section more compact with smaller icons and shorter button labels
  - Changed loading screen text to "Loading AI Rocket"
- **Files Changed**:
  - `src/components/MissionControlPage.tsx` - Complete layout restructure
  - `src/App.tsx` - Loading screen text

#### 2026-02-06: Fix Onboarding Preferences-to-Education Transition & Remove Tutorial Step
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed the assistant onboarding flow skipping the education step ("Before we go any further...") after preferences were gathered. The transition condition required both phaseComplete AND nextPhase from the edge function, but nextPhase was sometimes null causing the education step to be skipped entirely. Also added frontend-side preference completeness detection (personality + proactive + notifications) to force the transition even when the AI model doesn't properly signal completion. After the sync check step, users now go directly to live mode instead of the tutorial mode.
- **Changes**:
  - Fixed transition condition from `(phaseComplete && nextPhase)` to just `phaseComplete` so education always shows when preferences are done
  - Added frontend preference completeness check (personality traits + proactive level + notification types) as a fallback trigger
  - Lowered force-education question threshold from 10 to 6
  - Replaced all `enterTutorialMode()` calls in sync check flow with new `enterLiveMode()` function
  - Added `enterLiveMode` function that transitions directly to live mode with smart recommendations
  - Simplified `handleTutorialExit` to use `enterLiveMode`
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Education transition fix, enterLiveMode function, sync check flow update

#### 2026-02-06: Enhanced Proactive Communication Preferences & Live Settings Updates
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Expanded the onboarding preferences phase to ask detailed proactive communication questions across 4 sub-phases: personality/style, proactive level (high/medium/low), notification types (daily summaries, reports, goals, meetings, action items, weekly recaps, insights), and delivery channels (email, SMS, WhatsApp, in-app). Users are told they can update any of these anytime by asking. The assistant now detects settings update requests during live conversation and processes them immediately, including proactive level changes, notification type toggles, channel changes, personal priority updates, and personality adjustments.
- **Changes**:
  - Restructured preferences phase into 4 progressive sub-phases with specific prompts for each
  - Added notification type extraction (notify_daily_summary, notify_report_ready, notify_goal_milestone, etc.)
  - Added channel extraction (channel_email, channel_sms, channel_whatsapp, channel_in_app_only)
  - Preference saving now writes notification_types JSONB with granular per-event-type control
  - Added settingsUpdate field to live mode response format
  - Added settings update detection instructions in buildGeneralPrompt for all update types
  - Added settingsUpdate handler that processes proactive_level, notification_types, notification_channels, personal_priorities, team_priorities (admin), and personality changes
  - Deployed updated team-agent-chat edge function
- **Files Changed**:
  - `supabase/functions/team-agent-chat/index.ts` - Preferences phase restructure, notification_types saving, settingsUpdate detection and processing

#### 2026-02-06: Fix Onboarding Education Flow, Sync Detection, and Navigation
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed multiple issues in the agent onboarding flow: added the 3 missing education action items (capabilities, security, skip) after preferences setup, replaced stale in-memory document count with real-time database query, fixed sync navigation opening a blank page, removed auto-advance to tutorial after sync action, and added proper sync directions.
- **Changes**:
  - Added 'education' phase to OnboardingPhase type with EDUCATION_SUGGESTIONS constant (3 clickable items: capabilities, security, skip)
  - Preferences-complete handler now shows education suggestions instead of skipping to sync_check
  - Added `proceedToSyncCheck()` function that queries `get_document_sync_stats` RPC for actual document count
  - Teams with existing documents get a positive message explaining data benefits instead of "sync your documents"
  - Fixed `handleSyncAction` to use `trigger_sync` action (correct Fuel page) instead of `navigate` to `fuel-stage` (blank page)
  - Removed `setTimeout(() => enterTutorialMode(), 1500)` auto-advance after sync action
  - Added detailed sync instructions (local files and cloud storage options) in sync message
  - Added sync_check phase handler in handleSend to check DB when user reports sync completion
  - Fixed education suggestion filtering to properly show remaining items after viewing one
  - Preserved 'education' phase in legacy phase map so it survives page refreshes
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - All onboarding flow fixes

#### 2026-02-06: Individual User Priorities & Per-User Assistant Personalization
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Introduced a two-tier priority system separating team priorities (set by admins) from individual user priorities (set by each team member). Each team member now gets their own onboarding flow where they can give the assistant a personal name, set personal priorities, and configure personal preferences. The assistant combines both team and individual priorities when responding to each user.
- **Changes**:
  - Created `user_priorities` table for per-user personal goals, focus areas, and recurring tasks
  - Added `assistant_name` column to `user_assistant_preferences` for per-user assistant naming
  - Added `member_onboarding_completed` column to track individual member onboarding status
  - Built member onboarding flow: personal naming, team priorities display (read-only), personal priority collection, personal preference setup
  - Updated edge function to fetch and inject both team priorities and user priorities into AI prompts
  - Edge function now saves member priorities to `user_priorities` table during member onboarding
  - Edge function builds separate prompt sections for team vs personal priorities
  - Updated `AgentChatPanel` to use effective agent name (personal > team > default) everywhere
  - Updated `AgentModeMobileLayout` to display per-user assistant name
  - Non-admin users now go through a personalized onboarding instead of skipping straight to live mode
- **Files Changed**:
  - `src/hooks/useUserAssistantPreferences.ts` - Added assistant_name and member_onboarding_completed fields and methods
  - `src/components/agent-mode/AgentChatPanel.tsx` - Member onboarding flow, per-user name display
  - `src/components/agent-mode/AgentModeMobileLayout.tsx` - Per-user name display
  - `supabase/functions/team-agent-chat/index.ts` - Member onboarding prompts, combined priorities, user_priorities fetching
  - New migration: `create_user_priorities_and_per_user_assistant_name`

#### 2026-02-06: Assistant Intelligence Enhancement Suite
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Comprehensive assistant personalization and intelligence upgrade. Added 8 new features: time-aware greetings, usage streak tracking with milestones, proactive nudges after absence (with doc sync change detection), quick-action shortcuts (/report, /goals, etc.), smart suggestion rotation that avoids repeating the same recommendations, explicit proactive level preferences during onboarding, usage-based feature tips from tracking data, conversation memory with team priorities, and team activity digest capability.
- **Changes**:
  - Created `user_engagement_streaks` table with RPC function for streak tracking and doc change detection
  - Created `user_task_recommendation_usage` table for smart rotation of suggestions
  - Added time-of-day aware greetings (morning/afternoon/evening) and time-relevant task suggestions
  - Added streak display (3/7/14/30-day milestones) and proactive nudge messages on return after absence
  - Added 8 quick-action shortcuts (/report, /goals, /sync, /meetings, /actions, /dashboard, /pulse, /help)
  - Smart suggestion rotation tracks which recommendations were shown and prioritizes least-shown items
  - Updated onboarding preferences phase to explicitly ask about proactive notification levels (high/medium/low)
  - Enhanced edge function general prompt with personality traits, proactive level, feature usage tips, conversation memory, and task recommendations context
  - Edge function now loads user_assistant_preferences, team_agent_settings personality, user_feature_usage, and task_recommendations to build deeply personalized system prompts
  - Enhanced preference extraction to handle explicit proactive levels and additional personality traits (brief/detailed, formal/casual)
  - Added team activity digest instructions for "what's happening with my team?" queries
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - All 8 frontend features
  - `supabase/functions/team-agent-chat/index.ts` - Personalization data loading, enhanced prompts, preference extraction
  - New migrations: `create_user_engagement_streaks_table`, `create_user_task_recommendation_usage_table`

#### 2026-02-05: Major Assistant Conversation Flow Redesign
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Completely redesigned the assistant onboarding and conversation flow with a structured phase system. Users now go through a guided setup (name, priorities, preferences), document sync check, interactive tutorial showing impact items 3 at a time, and then enter live conversation mode with smart task recommendations. In live mode, action item suggestions are suppressed unless the user specifically asks about a feature.
- **Changes**:
  - Created `task_recommendations` table with 18 smart daily task suggestions across 5 categories
  - Rewrote AgentChatPanel with new phase system: awaiting_name -> priorities -> preferences -> sync_check -> tutorial -> live
  - Added tutorial mode with paginated impact items (3 at a time), "Show more" button, and "Exit tutorial" link
  - Added live mode entry with personalized greeting and 3 random task recommendations
  - Added "Help me with daily tasks" / "Help me explore AI Rocket features" choice buttons
  - Added document sync check phase that skips automatically if user has documents
  - Updated edge function to gate auto-populate impact suggestions in live mode
  - Modified AI prompt to not proactively suggest impact items in live mode
  - Added `currentOnboardingStep` to agent context for server-side phase awareness
  - Reset user conversation data for testing
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Complete rewrite with new phase system
  - `supabase/functions/team-agent-chat/index.ts` - Live mode gating and prompt updates
  - `src/lib/agent-gemini-service.ts` - AgentContext interface already had currentOnboardingStep
  - New migration: `create_task_recommendations_table`

#### 2026-02-05: Fix Completed Items Showing as Suggestions and Agent Chat Crash
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed three bugs: completed impact items were still appearing as action card suggestions, the Create Visualization directions were inaccurate, and the agent chat was crashing with "I encountered an issue" due to an undefined variable.
- **Changes**:
  - Fixed edge function Part A to filter by `is_completed = false` via user_impact_progress join
  - Updated SCREEN_CONTEXT_MESSAGES for visualizations with accurate directions
  - Fixed `userId` (undefined) to `user.id` on two occurrences in edge function
- **Files Changed**:
  - `supabase/functions/team-agent-chat/index.ts` - Impact suggestion filtering and variable fix

#### 2026-02-05: Fix Assistant Message Display and Re-enable Follow-up Suggestions
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed issue where recent assistant messages weren't showing after refresh. The query was limited to 50 messages but the user had 67 messages in 24 hours, causing newest messages to be cut off. Also added server-side fallback to auto-populate follow-up suggestions when the AI mentions them in text but fails to include them in the JSON response.
- **Changes**:
  - Increased message query limit from 50 to 100 in useAgentConversation hook
  - Updated edge function prompt to require suggestedImpactItems when mentioning follow-ups
  - Added server-side fallback: detects suggestion phrases in AI text and auto-populates from user's incomplete impact items
  - Added clear rule: if message text mentions suggestions, suggestedImpactItems cannot be empty
  - Provided list of available feature_keys for AI to use based on user priorities
- **Files Changed**:
  - `src/hooks/useAgentConversation.ts` - Increased message limit to 100
  - `supabase/functions/team-agent-chat/index.ts` - Re-enabled and enforced follow-up suggestions

#### 2026-02-05: Assistant UI Polish and Astra Terminology Cleanup
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed multiple UI issues in assistant mode and cleaned up remaining Astra terminology. Action buttons for send_to_agent are now hidden since actions auto-execute, updated placeholders and headers. Fixed assistant to not promise follow-up suggestions without delivering them.
- **Changes**:
  - Hide action button for send_to_agent actions (since they auto-execute)
  - Changed Agent Chat placeholder from "Send a message to Astra..." to "Send a message to your team agent..."
  - Changed Suggested Prompts header from "Get the most out of Astra Intelligence" to "Optimize your Agent Chat"
  - Updated prompts and descriptions to use "AI Rocket" instead of "Astra"
  - Fixed assistant to keep send_to_agent responses short without promising additional suggestions
  - Removed verbose "while that's processing" text when handing off to Agent Chat
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Hide button for send_to_agent
  - `src/components/ChatInput.tsx` - Updated placeholder text
  - `src/components/SuggestedPromptsModal.tsx` - Updated header and prompts
  - `supabase/functions/team-agent-chat/index.ts` - Improved send_to_agent response brevity

#### 2026-02-05: Auto-Navigate on Assistant Actions and What's New Cleanup
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: When the assistant recommends an action (like viewing Reports, Team Dashboard, etc.), the main app window now automatically navigates to that page instead of requiring the user to click an action button. Also removed outdated "Team Pulse" entry from What's New section.
- **Changes**:
  - Added auto-execution of actions after assistant generates a response
  - Actions are executed with a 300ms delay to allow message to render first
  - Works for both normal responses and onboarding flow responses
  - Deleted "Team Pulse" from whats_new database table (feature not in app)
  - Removed Team Pulse section from WHATS_NEW_FEATURE.md documentation
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Added auto-execution of actions
  - `WHATS_NEW_FEATURE.md` - Removed Team Pulse references

#### 2026-02-05: Help Center Terminology Updates and Assistant Handoff Fix
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Updated all Help Center content to replace "Astra" references with "AI Rocket" terminology. Fixed assistant to properly send data analysis requests to Team Agent instead of navigating to Reports, and added explicit instruction to not mention document counts unless asked.
- **Changes**:
  - Renamed "Astra Help Center" to "AI Help Center" in header
  - Updated "What's New" section - "Astra Create" now "Creative Suite", "Astra Guided Chat" now "Agent Guided Chat"
  - Updated Quick Start guide - all "Astra" references changed to "AI Rocket"
  - Updated FAQ section - all "Astra" references changed to "AI Rocket"
  - Updated AI Help assistant placeholder and sample questions
  - Fixed team-agent-chat to use "send_to_agent" action for generate/analyze requests
  - Added instruction to not mention document counts unless user asks
- **Files Changed**:
  - `src/components/HelpCenter.tsx` - Updated header and subtitle
  - `src/components/QuickStartGuide.tsx` - Updated all Astra references
  - `src/components/HelpAssistant.tsx` - Updated placeholder and sample questions
  - `src/data/helpFAQ.ts` - Updated all Astra references
  - `supabase/functions/team-agent-chat/index.ts` - Added send_to_agent guidance and document count instructions
  - Database: Updated all whats_new entries to use new terminology

#### 2026-02-05: Assistant Mode Navigation and AI Response Fixes
- **Category**: Bug Fix
- **Impact Score**: 7
- **Description**: Fixed multiple issues with Assistant Mode navigation and AI assistant responses. Add + Manage now opens Fuel stage, What's New and FAQ & AI Help now open correctly, assistant no longer shows "Data query service not configured" error for capability questions, and assistant no longer limits responses based on current view.
- **Changes**:
  - Fixed Add + Manage button to open Fuel stage instead of Team Settings
  - Fixed HelpCenter modal - added missing `isOpen`, `onStartTour`, and `isAdmin` props
  - Fixed isDataQuery function to not treat capability/security questions as data queries
  - Added patterns for "how do you work", "how do I work", "keep my data secure", etc.
  - Removed "my data" and "our data" from data query keywords (too generic)
  - Updated team-agent-chat edge function prompt to always answer questions regardless of current view
  - Added explicit instruction to never say "since we're in Mission Control" to avoid answering
- **Files Changed**:
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Fixed navigation handlers and HelpCenter props
  - `src/lib/agent-gemini-service.ts` - Updated isDataQuery function with better exclusion patterns
  - `supabase/functions/team-agent-chat/index.ts` - Updated prompt to always answer questions

#### 2026-02-05: Fix Team Settings Modal and Report Email Delivery
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed critical bug where Admin Settings, Add + Manage, and FAQ & AI Help were not opening in Assistant Mode. The TeamSettingsModal was missing required isOpen and teamId props. Also fixed report emails not being sent by adding missing Authorization headers to edge function calls.
- **Changes**:
  - Fixed TeamSettingsModal in AgentModeMainContent - added missing `isOpen` and `teamId` props
  - Fixed check-scheduled-reports edge function - added Authorization header to send-report-email and generate-report-visualization calls
  - Fixed deliver-pending-reports edge function - added Authorization header to send-report-email call
- **Files Changed**:
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Fixed TeamSettingsModal props
  - `supabase/functions/check-scheduled-reports/index.ts` - Added Authorization headers
  - `supabase/functions/deliver-pending-reports/index.ts` - Added Authorization header

#### 2026-02-05: Platform Terminology Updates and Navigation Fixes
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Major terminology update across the platform - renamed Ask Astra to AI Help, Agent Mode to Assistant Mode, AI Rocket Features to Agent Tools, Astra Guided Chat to Agent Guided Chat, and Astra Guided Reports to Agent Guided Reports. Fixed navigation items not working in Assistant Mode Mission Control, and fixed launch stages showing level 0 instead of actual progress.
- **Changes**:
  - Renamed "Ask Astra" to "AI Help" in Help Center and all references
  - Renamed "Agent Mode" to "Assistant Mode" in User Settings
  - Renamed "AI Rocket Features" to "Agent Tools" on Mission Control page
  - Renamed "Astra Guided Chat" to "Agent Guided Chat" in Agent Chat, Boosters, and modals
  - Renamed "Astra Guided Reports" to "Agent Guided Reports"
  - Renamed "Team Agents" to "Create Agents" in Agent Tools section
  - Renamed "FAQ & Ask Astra" to "FAQ & AI Help" in Support Menu
  - Added "Agent Guided Reports" button to main Reports page with personalized report suggestions
  - Fixed AgentModeMainContent navigation handlers:
    - Fuel, Boosters, Guidance stages now open correctly with proper progress data
    - What's New, FAQ, AI Help now open Help Center correctly
    - Add + Manage and Admin Settings now open Team Settings correctly
  - Fixed launch stages receiving correct progress data (was showing level 0)
  - Updated AI_ROCKET_KEY_FEATURES.md with new terminology and feature descriptions
- **Files Changed**:
  - `src/components/HelpCenter.tsx` - Renamed tab to "AI Help"
  - `src/components/HelpAssistant.tsx` - Updated heading
  - `src/components/MissionControlPage.tsx` - "Agent Tools" section title
  - `src/components/UserSettingsModal.tsx` - "Assistant Mode" toggle
  - `src/components/launch-stages/BoostersStage.tsx` - "Agent Guided Chat"
  - `src/components/SuggestedPromptsModal.tsx` - "Agent Guided Chat"
  - `src/components/AstraGuidedChatModal.tsx` - "Agent Guided Chat" header
  - `src/components/demo/DemoGuidedReportsSlide.tsx` - "Agent Guided Reports"
  - `src/components/MainContainer.tsx` - Updated comment
  - `src/components/ReportsView.tsx` - Added Agent Guided Reports button and modal
  - `src/components/SupportMenu.tsx` - "FAQ & AI Help"
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Fixed navigation handlers, added full progress props to stages
  - `src/hooks/useOpenTabs.ts` - "Create Agents"
  - `src/data/demoData.ts` - "Create Agents"
  - `AI_ROCKET_KEY_FEATURES.md` - Added new features and updated terminology

#### 2026-02-05: Unified Knowledge System for Ask Astra Help Assistant
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Ask Astra (Help Center) now uses the same auto-generated knowledge as the AI Assistant. Both systems read from AI_ROCKET_KEY_FEATURES.md during build, ensuring consistent and up-to-date feature information. Fixed branding references from "Astra Intelligence" to "AI Rocket".
- **Changes**:
  - Updated `sync-platform-knowledge.js` to generate TypeScript file (`generated-platform-knowledge.ts`) in addition to database sync
  - TypeScript file is generated even without database credentials (for local development)
  - Updated `help-assistant.ts` to import and use generated feature knowledge
  - Fixed branding: Changed "Astra Intelligence" references to "AI Rocket" in help-assistant.ts and documentation-context.ts
  - Added comment in documentation-context.ts noting that features are now auto-generated
- **Files Changed**:
  - `sync-platform-knowledge.js` - Added TypeScript generation and how-to guide extraction
  - `src/lib/generated-platform-knowledge.ts` - New auto-generated file (do not edit manually)
  - `src/lib/help-assistant.ts` - Now imports generated knowledge, fixed branding
  - `src/lib/documentation-context.ts` - Fixed branding, added note about auto-generation

#### 2026-02-05: AI Assistant Database-Driven Knowledge System
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Implemented database-driven feature knowledge system so the AI assistant always has up-to-date information. When AI_ROCKET_KEY_FEATURES.md is updated, it automatically syncs to the database during build, and the assistant fetches the latest content. Also fixed document count showing 0 instead of actual count.
- **Changes**:
  - Created `platform_knowledge` database table to store feature documentation
  - Created `sync-platform-knowledge.js` build script that reads MD file and syncs to database
  - Updated package.json build script to run sync during deployment
  - Updated AI_ROCKET_KEY_FEATURES.md with current feature names:
    - Changed title from "AI Rocket + Astra Intelligence" to "AI Rocket"
    - Renamed "Astra Create" to "Creative Suite"
    - Updated AI Data Sync section to remove old category references
    - Added "Email Control" to Coming Soon features
  - Updated team-agent-chat edge function:
    - Now fetches actual document count from database via `get_document_sync_stats` RPC
    - Now fetches platform knowledge from `platform_knowledge` table (with fallback to defaults)
    - Changed navigation target from "team-pulse" to "creative-suite"
    - Updated function signatures to accept dynamic platform capabilities and navigation targets
  - Updated user_impact_items database: Changed "create_presentation" target to "creative-suite"
- **Files Changed**:
  - `AI_ROCKET_KEY_FEATURES.md` - Feature naming updates and Email Control addition
  - `supabase/functions/team-agent-chat/index.ts` - Document count fix and dynamic knowledge loading
  - `sync-platform-knowledge.js` - New build-time sync script
  - `package.json` - Added sync script to build process
  - `supabase/migrations/..._create_platform_knowledge_table.sql` - New migration

#### 2026-02-04: Branding Update, Agent Chat Fixes, and Impact Recommendations Sync
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Comprehensive update removing "+ Astra Intelligence" branding in favor of clean "AI Rocket" branding. Fixed Agent Chat to properly open new conversations when clicking recommendations. Fixed Chat History sidebar in Agent Mode. Created database sync mechanism to track completed features in impact recommendations.
- **Changes**:
  - Updated Gemini model from `gemini-2.0-flash` to `gemini-3-flash-preview` in team-agent-chat
  - Enhanced transition triggers to recognize "that's all thanks!", "that's it", "nope" as conversation completion signals
  - Created migration to sync `user_impact_progress.is_completed` from `user_feature_usage` table
  - Created trigger `sync_impact_on_feature_usage` to auto-update impact progress when features are used
  - Backfilled existing user completion data based on actual feature usage
  - Added `shouldStartNewAgentChat` to AgentAppContext for forcing new chat creation
  - Updated Agent Mode to start new chat when clicking "send_to_agent" recommendations
  - Added ChatSidebar integration to Agent Mode for viewing conversation history
  - Removed "+ Astra Intelligence" from Header component - now just "AI Rocket"
  - Updated AuthScreen to remove Astra branding, renamed feature card to "Team AI Assistant"
  - Updated CustomAuth to remove Astra references from two locations
  - Simplified MarketingPage and MarketingLogo to show only "AI Rocket"
  - Updated send-invite-email to use "AI Rocket" instead of "Astra" throughout
  - Updated send-report-email prompt and HTML branding
  - Updated send-support-response header to "AI Rocket Support"
  - Updated send-setup-admin-invite to remove Astra references
  - Deployed all updated edge functions
- **Files Changed**:
  - `supabase/functions/team-agent-chat/index.ts` - Model update and transition triggers
  - `supabase/migrations/..._sync_impact_progress_from_feature_usage.sql` - New migration
  - `src/contexts/AgentAppContext.tsx` - Added shouldStartNewAgentChat state
  - `src/components/agent-mode/AgentModeLayout.tsx` - Set flag on send_to_agent action
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Added ChatSidebar integration
  - `src/components/Header.tsx` - Simplified branding
  - `src/components/AuthScreen.tsx` - Updated branding and feature card
  - `src/components/CustomAuth.tsx` - Removed Astra references
  - `src/components/MarketingPage.tsx` - Simplified logo section
  - `src/components/MarketingLogo.tsx` - Complete rewrite for clean branding
  - `supabase/functions/send-invite-email/index.ts` - Branding updates
  - `supabase/functions/send-report-email/index.ts` - Branding updates
  - `supabase/functions/send-support-response/index.ts` - Branding updates
  - `supabase/functions/send-setup-admin-invite/index.ts` - Branding updates

#### 2026-02-04: Assistant Preferences Phase Strict Communication Focus
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Completely refactored the assistant onboarding preferences phase with strict guardrails to ensure it ONLY asks about communication style and personality, never about operational settings. Also removed outdated data category references.
- **Changes**:
  - Added "CRITICAL REQUIREMENT" header emphasizing this phase is only about assistant personality
  - Added wrong/right example comparisons to prevent operational questions
  - Added "IF THE USER'S FIRST MESSAGE" instruction to ensure proper opening question
  - Strengthened "NEVER ASK ABOUT" section with explicit examples of bad questions
  - Updated data sync capabilities description to remove hardcoded category list
  - Updated help FAQ to reflect new flexible folder system (up to 20 folders, multiple providers)
  - Deployed updated edge function with improved prompts
- **Files Changed**:
  - `supabase/functions/team-agent-chat/index.ts` - Completely rewrote preferences phase prompt with strict guidelines
  - `src/data/helpFAQ.ts` - Updated "How do I add more folders?" answer to reflect current system

#### 2026-02-04: AI Assistant Chat UX Improvements
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Improved the AI assistant chat experience with better message formatting, clickable education options, and dynamic action suggestions from user impact items.
- **Changes**:
  - Fixed paragraph spacing in chat messages - now properly separates paragraphs with visual spacing
  - Fixed escape character formatting (removed raw `\n\n`, `\t` display issues)
  - Converted A/B/C education options to clickable action item boxes with icons
  - Added handling for user responses like "A", "option 1", "1" in education phase
  - Replaced hardcoded INITIAL_SUGGESTIONS with actual user impact items from database
  - Added Shield icon import and to icon map for security education option
  - Education phase now shows proper buttons instead of text options
  - Onboarding completion now fetches and displays incomplete impact items
  - Returning user initialization also fetches impact items instead of static suggestions
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Updated formatMessageText, added education options UI
  - `supabase/functions/team-agent-chat/index.ts` - Added A/B/C response detection in education phase

#### 2026-02-04: Proactive Assistant Multi-Channel Notification System
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Implemented a comprehensive proactive notification system that allows the Team AI Assistant to reach users via multiple channels (Email, SMS, WhatsApp, Telegram). Each user has individual preferences for how and when they receive notifications, with support for quiet hours and granular notification type controls.
- **Changes**:
  - Created `user_assistant_preferences` table with per-user notification settings
  - Created `assistant_proactive_events` table to track all sent notifications
  - Created `proactive_notification_queue` table for scheduled notifications with deduplication
  - Created `send-sms-notification` edge function using Twilio API
  - Created `send-whatsapp-notification` edge function using Twilio WhatsApp API
  - Created `send-telegram-notification` edge function using Telegram Bot API
  - Created `send-assistant-notification` unified dispatcher that checks user preferences and quiet hours
  - Created `generate-proactive-message` edge function using Gemini to craft personalized messages
  - Created `process-proactive-notifications` edge function with cron job (every 15 minutes)
  - Created `useUserAssistantPreferences` React hook for managing preferences
  - Created `AssistantNotificationSettings` component with channel toggles, quiet hours, and notification type controls
  - Added proactive notification settings section to UserSettingsModal
  - 9 notification event types: daily_summary, report_ready, goal_milestone, meeting_reminder, action_item_due, team_mention, insight_discovered, sync_complete, weekly_recap
- **Files Changed**:
  - Migration: `create_user_assistant_preferences_system`
  - Migration: `create_proactive_notification_tracking_tables`
  - Migration: `setup_proactive_notifications_cron`
  - `supabase/functions/send-sms-notification/index.ts`
  - `supabase/functions/send-whatsapp-notification/index.ts`
  - `supabase/functions/send-telegram-notification/index.ts`
  - `supabase/functions/send-assistant-notification/index.ts`
  - `supabase/functions/generate-proactive-message/index.ts`
  - `supabase/functions/process-proactive-notifications/index.ts`
  - `src/hooks/useUserAssistantPreferences.ts`
  - `src/components/AssistantNotificationSettings.tsx`
  - `src/components/UserSettingsModal.tsx`

#### 2026-02-04: Team AI Assistant and Agent Chat Terminology & Integration
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Clarified terminology between Team AI Assistant (Gemini chat on left panel) and Team Agent (n8n webhook workflows). Renamed "Astra Chat" to "Agent Chat" throughout the app. Added new high-priority impact items for mission analysis and cross-category data analysis that trigger prompts in Agent Chat.
- **Changes**:
  - Updated AGENT_SELF_KNOWLEDGE with clear distinction between Team AI Assistant and Team Agent
  - Renamed "Astra Chat" to "Agent Chat" in tabs, toggles, and UI components
  - Added `analyze_mission_values` impact item (priority 2) - Analyze team mission, values, and goals
  - Added `cross_category_analysis` impact item (priority 3) - Cross-analyze data from multiple categories
  - Added `send_to_agent` action type for impact items that trigger Agent Chat prompts
  - Added `pendingAgentPrompt` to AgentAppContext for passing prompts to Agent Chat
  - Agent Chat tab now available in Agent Mode main content area
  - Team AI Assistant shows confirmation when sending prompts to Agent Chat
- **Files Changed**:
  - `supabase/functions/team-agent-chat/index.ts` - Terminology and action type updates
  - `src/contexts/AgentAppContext.tsx` - Added pendingAgentPrompt state
  - `src/hooks/useOpenTabs.ts` - Renamed Astra Chat to Agent Chat
  - `src/hooks/useAgentConversation.ts` - Added send_to_agent action type
  - `src/components/agent-mode/AgentModeLayout.tsx` - Handle send_to_agent action
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Added Agent Chat tab support
  - `src/components/agent-mode/AgentChatPanel.tsx` - Handle send_to_agent for impact items
  - `src/components/ChatModeToggle.tsx`, `src/components/MissionControlPage.tsx`, `src/components/AppDemoModal.tsx`, `src/components/AstraGuidedChatModal.tsx` - UI text updates
  - Migration: `add_mission_and_cross_category_analysis_impact_items`

#### 2026-02-04: Updated User Impact Items from Official Features Documentation
- **Category**: Enhancement
- **Impact Score**: 5
- **Description**: Updated the user_impact_items table to match the official AI_ROCKET_KEY_FEATURES.md documentation. Added feature_status column to distinguish active vs coming soon features. Updated team agent's platform capabilities context with comprehensive feature descriptions.
- **Changes**:
  - Added `feature_status` column to user_impact_items (active/coming_soon)
  - Updated to 16 impact items with accurate descriptions from features doc
  - Removed outdated Team Pulse reference (merged into Astra Create)
  - Added coming soon features: Agent Builder, AI Specialists, Team SOPs, Research Projects
  - Updated PLATFORM_CAPABILITIES in team-agent-chat with complete feature guide
  - Agent now has full context of all platform features and their impacts
- **Files Changed**:
  - Migration: `update_user_impact_items_from_features_doc`
  - `supabase/functions/team-agent-chat/index.ts` - Updated capabilities context

#### 2026-02-04: Comprehensive Team Agent Intelligence System
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Built a comprehensive user impact tracking system and enhanced the team agent with self-knowledge, security context, admin-only training, educational onboarding flow, and dynamic impact-based recommendations.
- **Changes**:
  - Created `user_impact_items` table with prioritized feature actions
  - Created `user_impact_progress` table to track user completion of impact items
  - Created `user_onboarding_education` table to track educational prompts viewed
  - Added auto-initialization of impact progress for new users via trigger
  - Added admin-only training - only admins can set team preferences/priorities
  - Added agent self-knowledge context (capabilities, AI models, connected agents)
  - Added comprehensive security/privacy context (SOC2, RLS, encryption, data control)
  - Added education phase with A/B/C options before showing action items
  - Impact-based action recommendations using incomplete items from user_impact_progress
  - Dynamic formatting with markdown bold and improved spacing
  - Agent can detect admin preference changes and offer to update team-wide
  - Non-admins get warm welcome but skip priority/preference collection
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Education phase, impact suggestions, formatting
  - `supabase/functions/team-agent-chat/index.ts` - Complete rewrite with new features
  - Migration: `create_user_impact_tracking_system` - New tables and seed data

#### 2026-02-04: Agent Onboarding Polish and Capability Questions Fix
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed several issues with the agent chat: removed unnecessary confirmation question at end of preferences phase, reduced suggested actions from 3 to 2, expanded platform capabilities documentation, and fixed capability questions triggering incorrect data query errors.
- **Changes**:
  - Removed "Does that sound right?" confirmation - agent now confidently summarizes and transitions
  - Removed "Customize how I work" from suggestions (already covered in onboarding)
  - Now shows only 2 options: "Sync my data" and "What can you do for my team?"
  - Expanded PLATFORM_CAPABILITIES to comprehensive 10-feature documentation
  - Updated general prompt to handle capability questions directly without data queries
  - Fixed isDataQuery function to exclude capability/feature questions
  - Capability questions now get detailed, enthusiastic responses about all features
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Reduced to 2 suggestions
  - `src/lib/agent-gemini-service.ts` - Fixed isDataQuery detection
  - `supabase/functions/team-agent-chat/index.ts` - Enhanced prompts and capabilities

#### 2026-02-04: Conversational AI-Driven Onboarding for Team Agent
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Completely redesigned the Team Agent onboarding to be conversational and AI-driven instead of using preset questions. Gemini now has the freedom to understand user responses and ask intelligent follow-up questions. The agent gathers 3-5 team priorities and 3-5 personality preferences through natural conversation, adapting to what the user says.
- **Changes**:
  - Removed hardcoded question sequences - AI now drives the conversation
  - Edge function has phase-based prompts (priorities, preferences) with platform capability context
  - Agent asks one open-ended question about AI needs, then asks follow-ups based on responses
  - Agent can extract multiple priorities from a single user response
  - Preferences flow asks user to describe their ideal assistant in their own words
  - If user wants to do something else during onboarding, agent adapts and helps
  - Edge function automatically saves extracted priorities and preferences to database
  - Added PLATFORM_CAPABILITIES constant so agent knows what features are available
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Conversational onboarding flow
  - `supabase/functions/team-agent-chat/index.ts` - AI-driven onboarding prompts
  - Migration: `create_team_priorities_table` - Stores extracted priorities

#### 2026-02-04: Agent Mode - Improved UX with Contextual Guidance and Navigation
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Redesigned Agent Mode welcome flow and added contextual guidance when users navigate to features. Removed name entry requirement, added back navigation to Mission Control, and implemented auto-send for prompt suggestions with a complete preference customization flow.
- **Changes**:
  - Simplified welcome message - removed name entry requirement and "I can help you" section
  - Welcome now immediately shows 3 action suggestions (Sync data, Capabilities, Customize)
  - Clicking "Sync my data" now sends contextual follow-up explaining the Fuel Stage screen
  - Added contextual guidance messages for all feature screens (reports, team chat, visualizations, etc.)
  - Clicking prompt suggestions (option 2) now auto-sends the message and generates response
  - Implemented full preferences flow with 3 questions: tone, proactivity, and focus area
  - Added `FeatureWrapper` component with back navigation to Mission Control
  - All feature screens (Reports, Team Chat, Visualizations, etc.) now have back button
  - Fixed icon serialization bug that caused blank screen (icons stored as strings, mapped to components)
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - New welcome flow, contextual messages, preferences
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Added FeatureWrapper with back navigation

#### 2026-02-04: Agent Mode - Conversational Welcome and Personality Preferences
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Completely redesigned the Agent Mode welcome flow to use conversational messages for agent naming and added personality preferences configuration. Actions now show as clickable buttons instead of auto-triggering.
- **Changes**:
  - Rewrote welcome flow to use chat messages asking user to name the agent
  - Agent responds with thank you and suggests 3 next actions after naming
  - Updated 3 suggested actions: Sync data, What can you do, Customize preferences
  - Implemented action box pattern - agent suggestions show as clickable buttons
  - Added personality preferences flow (tone and proactivity settings)
  - Added `updatePersonality` function to useTeamAgent hook
  - Renamed "Astra Reports" to "Reports" / "AI Reports" across the app
  - Main app window works independently from agent chat
- **Files Changed**:
  - `src/components/agent-mode/AgentChatPanel.tsx` - Complete rewrite with conversational flow
  - `src/hooks/useTeamAgent.ts` - Added updatePersonality function
  - `src/components/ReportsView.tsx` - Renamed header to "Reports"
  - `src/components/launch-stages/BoostersStage.tsx` - Renamed to "AI Reports"
  - `src/components/launch-stages/ManualReportBoosterModal.tsx` - Renamed references
  - `src/components/AdminDashboard.tsx` - Renamed to "AI Reports Today"

#### 2026-02-04: Agent Mode - Intelligent Team Agent with Split-Screen Interface
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Implemented Agent Mode, a new AI assistant experience with a split-screen interface. Features a conversational team agent that can navigate the app, trigger features, answer data questions via N8N, and guide users through the platform. The agent chat panel appears on the left with the main app on the right (or toggle view on mobile). Also renamed "Astra Create" to "Creative Suite" across the entire app.
- **Changes**:
  - Created `team_agent_settings` table for agent name and onboarding status per team
  - Created `agent_conversations` table for storing agent chat history with realtime support
  - Created `team_agent_context` table for storing learned team facts and preferences
  - Added `agent_mode` feature flag for clay@rockethub.ai
  - Created `useAgentMode` hook for feature flag and preference management
  - Created `useTeamAgent` hook for agent settings and context management
  - Created `useAgentConversation` hook for chat history with realtime subscriptions
  - Created `AgentGeminiService` for fast AI responses using gemini-2.5-flash
  - Created `AgentAppContext` provider for tracking active tab, modals, and app state
  - Built `AgentChatPanel` component with chat interface, typing indicators, and quick suggestions
  - Built `AgentModeLayout` for desktop with resizable split-screen panels
  - Built `AgentModeMobileLayout` with toggle between chat and app views
  - Built `AgentModeMainContent` for main app without "private" (Astra Chat) tab
  - Added Agent Mode toggle in User Settings for users with feature flag
  - Integrated Agent Mode into App.tsx with conditional rendering
  - Renamed "Astra Create" to "Creative Suite" in all references (tabs, components, FAQ, help docs)
- **Files Changed**:
  - `supabase/migrations/create_agent_mode_system.sql` - Database tables and policies
  - `src/hooks/useAgentMode.ts` - New hook for agent mode state
  - `src/hooks/useTeamAgent.ts` - New hook for agent settings
  - `src/hooks/useAgentConversation.ts` - New hook for chat management
  - `src/lib/agent-gemini-service.ts` - New service for AI responses
  - `src/contexts/AgentAppContext.tsx` - New context for app awareness
  - `src/components/agent-mode/AgentChatPanel.tsx` - Chat panel component
  - `src/components/agent-mode/AgentModeLayout.tsx` - Desktop layout
  - `src/components/agent-mode/AgentModeMobileLayout.tsx` - Mobile layout
  - `src/components/agent-mode/AgentModeMainContent.tsx` - Main app content
  - `src/components/UserSettingsModal.tsx` - Added Agent Mode toggle
  - `src/App.tsx` - Integrated Agent Mode rendering
  - `src/hooks/useOpenTabs.ts` - Renamed Astra Create to Creative Suite
  - `src/components/AstraCreateView.tsx` - Updated header text
  - `src/data/helpFAQ.ts` - Updated FAQ references
  - `src/lib/help-assistant.ts` - Updated help context
  - `src/lib/marketing-context.ts` - Updated marketing copy

#### 2026-02-04: Fixed ALL Milestone Point Values and Tracking (CRITICAL)
- **Category**: Bug Fix
- **Impact Score**: 10
- **Description**: Discovered and fixed critical bugs affecting ALL milestone reward systems. Multiple milestones were awarding incorrect point values (off by 50-300 points), and some weren't updating user point balances at all. This affected Paul Graham and other users who earned achievements but didn't receive proper credit. All 12 active milestones now match the UI specification exactly.
- **Bugs Found and Fixed**:
  - Chatty Day (10 msgs/day): Wasn't updating user_launch_status - 14 users affected
  - 500 messages: Awarded 150 pts instead of 250 pts - 1 user affected
  - 1000 messages: Would award 200 pts instead of 500 pts
  - 25 visualizations: Would award 200 pts instead of 300 pts
  - 100 visualizations: Would award 250 pts instead of 500 pts
  - 3 scheduled reports: Would award 200 pts instead of 100 pts
  - 25 scheduled reports: Completely missing from function
- **Changes**:
  - Fixed track_message_activity() with correct values (100/250/500 for 100/500/1000 messages)
  - Fixed track_visualization_milestone() with correct values (150/300/500 for 5/25/100 viz)
  - Fixed track_scheduled_report_milestone() with correct values (100/250/500 for 3/10/25 reports)
  - Added missing user_launch_status updates to all milestone functions
  - Changed Chatty Day from exact match (= 10) to >= 10 messages for better UX
  - Backfilled 14 users for Chatty Day milestone (25 pts each)
  - Backfilled 1 user for 500 messages milestone (100 pts difference)
- **Files Changed**:
  - `supabase/migrations/fix_daily_power_user_milestone_points.sql`
  - `supabase/migrations/fix_all_milestone_point_values_comprehensive.sql`

#### 2026-02-03: Fixed Build Lab Blank Screen Issue
- **Category**: Bug Fix
- **Impact Score**: 7
- **Description**: Fixed issue in Workshop Build Lab where clicking "Build with ChatGPT" or "Build with Claude" tabs would sometimes result in a blank screen. Added comprehensive error handling, validation checks, and logging to ensure platform plans always render correctly. Added null checks to prevent rendering issues when plan data is missing or malformed.
- **Changes**:
  - Added detailed console logging throughout platform plan generation process
  - Added validation to check for valid plan data in API responses before updating state
  - Added defensive null checks in render logic (currentPlan must have valid steps array)
  - Improved error messages to show specific failure reasons
  - Enhanced state management to handle edge cases where plan data might be incomplete
- **Files Changed**:
  - `src/components/workshop/WishPrototypeView.tsx` - Enhanced error handling and validation

#### 2026-02-03: Fixed Marketing Email Moonshot Challenge Context
- **Category**: Bug Fix
- **Impact Score**: 6
- **Description**: Fixed marketing emails incorrectly referencing "$5 AI Moonshot Challenge" instead of "$5M AI Moonshot Challenge". The AI was missing context about what the challenge actually is, leading to incorrect abbreviation. Added comprehensive Moonshot Challenge details to marketing-context.ts so future AI-generated emails have accurate information about the $5 million equity prize pool and challenge structure.
- **Changes**:
  - Added "$5M AI Moonshot Challenge" feature entry to marketing-context.ts
  - Includes full description: 10 winning teams share $5M in equity prizes
  - Details 90-day free access for first 300 teams, eligibility requirements, scoring criteria
  - Prevents AI from guessing or incorrectly abbreviating challenge details
- **Files Changed**:
  - `src/lib/marketing-context.ts` - Added comprehensive Moonshot Challenge feature context

#### 2026-02-03: Fixed Dev Updates Panel in Production
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed Dev Updates section in Admin Dashboard not loading in production. The DEV_UPDATES.md file was at project root but needed to be in the /public directory to be served as a static asset.
- **Changes**:
  - Copied DEV_UPDATES.md to /public directory
  - Updated build script to automatically copy file during builds
  - Verified file is now included in dist folder for production deployments
- **Files Changed**:
  - `package.json` - Updated build script to copy DEV_UPDATES.md
  - `public/DEV_UPDATES.md` - Added static copy of changelog

#### 2026-02-03: Restored Gemini AI-Powered Report Email Design
- **Category**: Bug Fix
- **Impact Score**: 7
- **Description**: Restored the Gemini AI integration for generating beautifully designed HTML report emails. The feature uses Gemini 2.0 Flash to create premium email designs with section cards, emojis, styled headers, and professional layouts matching the original design.
- **Changes**:
  - Added `generateEmailWithGemini` function that calls Gemini API with detailed design prompt
  - Prompt includes exact specifications for dark theme colors, typography, card layouts, emojis
  - Includes "IN THIS REPORT" summary card, section headers, content cards with blue borders
  - Added fallback `generateFallbackEmailHtml` function if Gemini fails
  - Function now checks for `GEMINI_API_KEY` environment variable
- **Files Changed**:
  - `supabase/functions/send-report-email/index.ts` - Complete rewrite with Gemini integration

#### 2026-02-03: Updated n8n Webhook URL for Astra Intelligence Agent
- **Category**: Infrastructure
- **Impact Score**: 4
- **Description**: Updated the n8n webhook URL from the old healthrocket.app.n8n.cloud domain to the new n8n.rockethub.ai domain for the Astra Intelligence Agent.
- **Changes**:
  - Updated `VITE_N8N_WEBHOOK_URL` environment variable to new URL
  - Updated `VITE_N8N_URL` environment variable for n8n dashboard links
  - Both `useChat.ts` (private Astra chat) and `useGroupChat.ts` (Team chat) use this URL
- **Files Changed**:
  - `.env` - Updated webhook URL and n8n base URL

#### 2026-02-03: Report Visualization Pre-Generation
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Implemented server-side visualization pre-generation to eliminate 2-3 minute loading times on the Reports page. Visualizations are now generated when reports are created, not when users view them.
- **Changes**:
  - Created `generate-report-visualization` edge function using Gemini API
  - Updated `check-scheduled-reports` to call visualization generation after report creation
  - Visualizations are stored in `astra_chats.visualization_data` column
  - Reports page now loads instantly with pre-generated visualizations
- **Technical Details**:
  - Uses `gemini-3-flash-preview` model for HTML dashboard generation
  - Includes responsive design with dark theme matching app aesthetics
  - Handles API rate limits gracefully with proper error messages

#### 2026-02-03: Reports Analytics Panel for Admin Dashboard
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added comprehensive Reports Analytics section to Admin Dashboard for monitoring report execution, email delivery, and pre-generation status.
- **Changes**:
  - Created `ReportsAnalyticsPanel` component with detailed metrics
  - Added Reports card to Admin Dashboard overview grid
  - Tracks: reports configured, run today/7d/30d, email delivery stats, pending deliveries
  - Four tabs: Overview, Recent Executions, Email Deliveries, Pending (pre-generated)
  - Real-time visibility into report health and email delivery success rates

#### 2026-02-03: Updated Report Pre-Generation to 2 AM EST
- **Category**: Enhancement
- **Impact Score**: 5
- **Description**: Moved report pre-generation from 3-5 AM EST to 2 AM EST with 15-second intervals between reports for better API rate limit handling.
- **Changes**:
  - Updated cron job to run at 7 AM UTC (2 AM EST)
  - Changed delay between reports from 5 seconds to 15 seconds
  - Single cron job with 7-hour lookahead replaces three separate jobs
  - Covers 2 AM to 9 AM EST delivery window
- **Database Changes**:
  - Removed cron jobs: `pregenerate-reports-offpeak-3am/4am/5am`
  - Added cron job: `pregenerate-reports-offpeak-2am` at 7 AM UTC

#### 2026-02-03: Fixed Report Email Delivery Issue
- **Category**: Bug Fix
- **Impact Score**: 8
- **Description**: Fixed critical bug where report emails were stuck in "pending" status and never sent. Root cause was the `send-report-email` edge function using Gemini API to generate email HTML, which was timing out.
- **Changes**:
  - Rewrote `send-report-email` to use fast template-based HTML generation
  - Removed Gemini API dependency from email function
  - Emails now send instantly using pre-built HTML template with Resend
  - Added proper markdown-to-HTML conversion for report content
  - Improved error handling and status tracking
- **Impact**:
  - Report emails now deliver successfully within seconds
  - No more "pending" status emails stuck in delivery queue
  - Verified working with test email showing "sent" status

#### 2026-02-03: Off-Peak Report Pre-Processing System
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Implemented off-peak report pre-processing to generate reports during low-demand hours (3-5 AM EST) and deliver them at the user's scheduled time. This prevents API rate limits and ensures reliable report delivery.
- **Changes**:
  - Added `deliver_at` column to `astra_chats` table for pending delivery tracking
  - Created `deliver-pending-reports` edge function to send emails when delivery time is reached
  - Updated `check-scheduled-reports` to support pre-generation mode with `pregenerate` and `hoursAhead` parameters
  - Added cron jobs for off-peak pre-generation (3 AM, 4 AM, 5 AM EST)
  - Added hourly cron job (`deliver-pending-reports-hourly`) at minute 5 to deliver pending reports
  - Updated ReportsContext to filter by `deliver_at IS NULL OR deliver_at <= now()`
  - Reports are now generated hours before delivery, with visualization time to complete
- **Database Changes**:
  - New column: `astra_chats.deliver_at` (timestamptz, nullable)
  - New index: `idx_astra_chats_deliver_at`
  - New cron jobs: `deliver-pending-reports-hourly`, `pregenerate-reports-offpeak-3am/4am/5am`

#### 2026-02-03: Critical Fix - Scheduled Reports Timeout and Email Delivery
- **Category**: Bug Fix
- **Impact Score**: 9
- **Description**: Fixed critical issue causing scheduled reports to run multiple times, fail to show in UI, and not send emails. Root cause was edge function timeout due to 30-second stagger delays between reports combined with processing 21+ daily reports. Reports would timeout before completion, causing re-runs on subsequent cron cycles.
- **Changes**:
  - Reduced stagger delay from 30 seconds to 5 seconds between reports
  - Reduced MAX_REPORTS_PER_RUN from 30 to 10 to prevent timeout
  - Moved last_run_at/next_run_at timestamp update to BEFORE calling n8n (prevents re-runs on timeout)
  - Changed email sending from background task (EdgeRuntime.waitUntil) to synchronous to ensure completion
  - Deployed updated check-scheduled-reports edge function
  - Triggered manual runs for 11 missed reports
- **Impact**:
  - Reports will no longer run multiple times on the same day
  - Email delivery will be more reliable
  - System can handle 20+ daily reports without timeout

#### 2026-02-02: Updated Terminology - Azure AD to Microsoft Entra ID
- **Category**: Cleanup
- **Impact Score**: 2
- **Description**: Updated documentation to reflect Microsoft's 2023 rebrand of Azure AD to Microsoft Entra ID. Clarified for user Brent Antman that existing Microsoft application with extra permissions is acceptable and should be kept.
- **Changes**:
  - Updated AI_ROCKET_LAUNCH_AI_BUSINESSES.md to reference "Microsoft Entra ID" instead of "Azure AD"
  - Confirmed existing Microsoft app permissions are correct and sufficient
  - Added dev updates entry

#### 2026-02-02: Updated Document Delete Warning to Include Microsoft
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Updated the document deletion warning message to reference both Google and Microsoft synced files instead of only mentioning Google Drive.
- **Changes**:
  - Changed warning from "Google Drive folder" to "Google or Microsoft Synced files" in DocumentsListModal
  - Updated warning text to say "connected folder" to be provider-agnostic

#### 2026-02-02: Microsoft Admin Consent Flow Complete Overhaul
- **Category**: Major Feature Enhancement
- **Impact Score**: 8
- **Description**: Completely redesigned Microsoft admin consent flow to fix persistent consent propagation issues. Now uses tenant-specific consent URLs when possible and provides "Try Again" functionality for users waiting for Microsoft to process consent.
- **Changes**:
  - Added tenant-specific admin consent URL generation (uses tenant ID when available vs /common/)
  - Added "Try Connecting My Account Again" button for users whose admin already granted consent
  - Implemented tenant ID extraction, storage, and display in consent UI
  - Enhanced error messaging to distinguish between "needs consent" vs "consent processing" states
  - Added timing information showing minutes elapsed since admin granted consent
  - Added critical warnings about admin account requirements and same-organization matching
  - Improved UX with conditional messaging and instructions based on whether consent was already granted
  - Added tenant ID display in consent link for admin verification
  - Imported RefreshCw and initiateMicrosoftOAuth for retry functionality

#### 2026-02-02: Admin Dashboard Fix and Microsoft Consent UX Improvements
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed Admin Dashboard loading error and enhanced Microsoft admin consent flow with better error handling and timing information to help users understand consent processing delays.
- **Changes**:
  - Fixed missing FileCode icon import in AdminDashboard.tsx
  - Enhanced Microsoft consent callback to show time elapsed since admin approval
  - Added dynamic UI messaging based on consent status and timing
  - Added critical warnings about admin account requirements and organization matching
  - Improved error messages to explain Microsoft's 2-15 minute processing delay
  - Added database query to check consent grant timing

#### 2026-02-02: Dev Updates Tracking System
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created comprehensive development tracking system with markdown file and Admin Dashboard integration. Includes backfilled history of all major changes since September 2025.
- **Changes**:
  - Created DEV_UPDATES.md with standardized format
  - Added Dev Updates panel to Admin Dashboard
  - Implemented search and filtering functionality
  - Backfilled 150+ entries across 5 months of development
  - Added Project Instructions for ongoing maintenance

#### 2026-02-02: Realtime Sync Progress Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Implemented realtime sync progress tracking using Supabase subscriptions. Users now see live file counts during sync instead of waiting for polling intervals.
- **Changes**:
  - Fixed database trigger column name (files_processed -> files_stored)
  - Updated triggerSyncNow to create sync session before triggering n8n
  - Added realtime subscriptions to SyncDataStep component
  - Added realtime subscriptions to ConnectedFoldersStatus component
  - Reduced polling from 2s to 5s as fallback

#### 2026-02-02: Marketing Email Sender Configuration
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added configurable sender name and reply-to email for marketing campaigns. Allows customization per campaign for better brand alignment.
- **Changes**:
  - Added sender_name and reply_to_email columns to marketing_emails table
  - Updated MarketingEmailComposer with sender configuration inputs
  - Modified send-marketing-email and send-marketing-email-campaign edge functions
  - Added sender filtering in get_filtered_marketing_recipients function

#### 2026-02-01: Team Data Toggle for Astra Visualizations
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added toggle to Astra Create allowing users to choose whether to include team data in AI-generated visualizations or rely solely on user prompts.
- **Changes**:
  - Added use_team_data boolean column to astra_visualizations table
  - Added checkbox toggle in AstraCreateModal before generation
  - Updated generate-astra-create-slides function to conditionally include team data
  - Modified system prompts to handle both modes effectively

### January 2026

#### 2026-01-30: Astra Create Feature Tracking
- **Category**: Enhancement
- **Impact Score**: 4
- **Description**: Added Astra Create to user feature tracking system for better analytics on feature adoption.
- **Changes**:
  - Added astra_create_count to user_feature_usage table
  - Updated tracking triggers to count Astra Create generations
  - Added Astra Create to Admin Dashboard feature usage stats

#### 2026-01-30: Dynamic Team Dashboard Categories
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Updated Team Dashboard to dynamically query all connected folder categories instead of using hardcoded list. More flexible and scalable.
- **Changes**:
  - Modified get_user_dashboard_data to query user_category_access
  - Removed hardcoded category list from function
  - Dashboard now shows only categories user has access to
  - Improved query performance with better indexing

#### 2026-01-27: Split Astra Create Generation Steps
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Split Astra Create generation into two phases: starter prompts generation and actual slides generation. Provides better UX with intermediate feedback.
- **Changes**:
  - Added starter_prompts column to astra_visualizations
  - Modified generate-astra-create-slides to support two-phase generation
  - Updated frontend to show starter prompts before final generation
  - Improved error handling for each phase separately

#### 2026-01-26: Report Notification URL Fixes
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed incorrect URLs in report email notifications. Reports now link to correct view instead of generic dashboard.
- **Changes**:
  - Updated send-report-email function with correct report URL format
  - Changed link from /reports to /reports?view=[report_id]
  - Added URL validation in email template

#### 2026-01-26: Microsoft Tenant Admin Consent Tracking
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Implemented system to track Microsoft tenant admin consent status for OneDrive/SharePoint access. Essential for enterprise deployments.
- **Changes**:
  - Created microsoft_tenant_consents table
  - Added store-microsoft-tenant-consent edge function
  - Created check-microsoft-tenant-consent edge function
  - Added UI indicators for consent status in settings

#### 2026-01-25: Workshop Admin Insights Access
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Added super admin access policies for workshop insights and wishes tables for better monitoring.
- **Changes**:
  - Added RLS policies for super admins to view workshop_admin_insights
  - Added RLS policies for super admins to view workshop_wishes
  - Updated Admin Dashboard to show workshop analytics

#### 2026-01-25: Workshop Insights Storage System
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created storage bucket and system for workshop admin insights including slide images from generated presentations.
- **Changes**:
  - Created workshop-insights storage bucket
  - Added slide_images column to workshop_admin_insights
  - Configured storage policies for admin access
  - Updated generate-insights-infographic to store slide images

#### 2026-01-25: Build Lab Platform Export Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added export tracking for Build Lab prototypes to monitor which platforms users are deploying to.
- **Changes**:
  - Added exported_to and exported_at columns to build_lab_prototypes
  - Created export tracking UI in BlueprintExport component
  - Added analytics tracking for export events

#### 2026-01-25: Build Lab Platform-Specific Build Plans
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Added platform-specific build plans (Bolt, Replit, Cursor, Claude) to Build Lab prototypes with detailed implementation steps.
- **Changes**:
  - Added platform_build_plans JSONB column to build_lab_prototypes
  - Integrated platform detection in generate-wish-prototype function
  - Created platform-specific prompt templates
  - Added UI for viewing platform-specific plans

#### 2026-01-25: Build Lab Tool Planner Mode
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added tool planner mode to Build Lab allowing users to select specific MCP tools before generation.
- **Changes**:
  - Added tool_planner_mode and selected_tools columns to build_lab_prototypes
  - Created tool selection UI in Build Lab chat
  - Integrated tool planning into prototype generation
  - Added tool recommendations based on use case

#### 2026-01-25: Build Lab Use Cases and Summaries
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added summary and use cases fields to Build Lab prototypes for better organization and discovery.
- **Changes**:
  - Added summary and use_cases columns to build_lab_prototypes
  - Updated WishPrototypeView to display summary and use cases
  - Modified generate-wish-prototype to include summaries

#### 2026-01-25: Astra Visualizations RLS Fix
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed Row Level Security policies on astra_visualizations table to allow users to view their own created visualizations.
- **Changes**:
  - Updated RLS policies to check both team_id and user_id
  - Added policy for users to view visualizations they created
  - Fixed edge case where team admins couldn't see member visualizations

#### 2026-01-24: Workshop All Goals Creation Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added tracking for when all 10 goals are created in workshop to trigger milestone achievements.
- **Changes**:
  - Added all_goals_created boolean to workshop_teams table
  - Created trigger to set flag when 10th goal is added
  - Added milestone notification for goal completion

#### 2026-01-24: Workshop Wishes Table
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created workshop wishes table to store AI prototype requests from workshop participants.
- **Changes**:
  - Created workshop_wishes table with RLS
  - Added wish submission UI in workshop
  - Integrated with Build Lab for prototype generation
  - Added admin view for monitoring wishes

#### 2026-01-23: Workshop Goal Conversation Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added conversation_id to workshop goals to link goals with the guided chat conversations that created them.
- **Changes**:
  - Added conversation_id column to workshop_goals table
  - Updated goal creation flow to save conversation reference
  - Added UI to navigate back to original conversation

#### 2026-01-23: Workshop Goal Completion Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added completion tracking system for workshop goals allowing participants to mark goals as achieved.
- **Changes**:
  - Added completed boolean and completed_at timestamp to workshop_goals
  - Created goal completion UI with checkboxes
  - Added completion analytics to workshop dashboard

#### 2026-01-23: Workshop Team Setup Function
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Created RPC function to properly set up workshop teams with correct permissions and initialization.
- **Changes**:
  - Created setup_workshop_team RPC function
  - Fixed team creation RLS issues for workshop signup
  - Ensured workshop teams get proper default settings

#### 2026-01-23: Workshop Infographics Storage
- **Category**: Infrastructure
- **Impact Score**: 5
- **Description**: Created dedicated storage bucket for workshop-generated infographics with proper access policies.
- **Changes**:
  - Created workshop-infographics storage bucket
  - Configured public read access for generated images
  - Set up team-based write policies
  - Added storage URL generation in workshop components

#### 2026-01-23: AI-preneur Workshop System Launch
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Launched complete AI-preneur Workshop system including registration, onboarding, guided goal-setting chat, Build Lab for prototyping, and infographic generation.
- **Changes**:
  - Created workshop_teams, workshop_goals, workshop_admin_insights tables
  - Built WorkshopAuth, WorkshopOnboarding, WorkshopHub components
  - Created WorkshopGuidedChat for AI-assisted goal setting
  - Built BuildLabDashboard, BuildLabChat for prototype creation
  - Integrated generate-workshop-infographic edge function
  - Added WorkshopDocumentSync for knowledge base
  - Created workshop analytics panel in Admin Dashboard

#### 2026-01-22: Folder Tracking for Fireflies Meetings
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Backfilled folder tracking for existing Fireflies meeting documents and ensured new meeting syncs track folder placement.
- **Changes**:
  - Backfilled synced_from_folder_id for existing meeting documents
  - Updated manual-folder-sync-proxy to track folder for meetings
  - Added folder tracking to count_folder_documents function

#### 2026-01-22: Expand to 20 Total Folder Slots
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Expanded folder selection from 5 general slots to 20 total slots across all categories for more flexibility.
- **Changes**:
  - Added folder slots 6-20 to user_drive_connections table
  - Updated FolderManagementSection to support 20 slots
  - Modified folder selection UI for better organization
  - Updated database queries to handle expanded slots

#### 2026-01-22: Count Folder Documents Function
- **Category**: Feature
- **Impact Score**: 5
- **Description**: Created RPC function to accurately count documents synced from specific folders for better folder management UI.
- **Changes**:
  - Created count_folder_documents() database function
  - Supports both Google Drive and Microsoft file counting
  - Integrated into FolderManagementSection component
  - Added document count badges to folder cards

#### 2026-01-20: Auto-Add Teams to Moonshot Standings
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Automatically add all new teams to Moonshot Challenge standings when they complete signup, ensuring no team is left out.
- **Changes**:
  - Created database trigger on users table insert
  - Auto-creates moonshot_registrations entry for new teams
  - Sets initial RBG scores to 0
  - Added backfill migration for existing teams

#### 2026-01-20: Team Dashboard and Pulse Feature Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added Team Dashboard and Team Pulse to user feature usage tracking for analytics.
- **Changes**:
  - Added team_dashboard_count and team_pulse_count columns
  - Created tracking triggers for both features
  - Integrated into Admin Dashboard analytics

#### 2026-01-20: User Feature Usage Tracking System
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Implemented comprehensive user feature usage tracking system to monitor adoption of key platform features.
- **Changes**:
  - Created user_feature_usage table tracking 15+ features
  - Added automatic trigger-based tracking for most features
  - Built analytics dashboard for feature adoption metrics
  - Integrated into Admin Dashboard for monitoring

#### 2026-01-20: Simplified Feedback Questions with Feature Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Simplified user feedback questions to focus on feature-specific experience rather than generic ratings. Leverages new feature tracking system.
- **Changes**:
  - Updated feedback_questions table with feature-specific questions
  - Modified FeedbackModal to use new question format
  - Integrated with user_feature_usage for context
  - Streamlined user feedback flow

#### 2026-01-19: Synced From Folder Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added synced_from_folder_id tracking to documents for better folder management and analytics.
- **Changes**:
  - Added synced_from_folder_id column to documents table
  - Updated manual-folder-sync-proxy to track source folder
  - Modified sync UI to show folder-specific document counts
  - Added folder-based filtering in My Library

#### 2026-01-19: Remove Daily Active Points System
- **Category**: Cleanup
- **Impact Score**: 5
- **Description**: Removed daily active points from launch preparation system as it was causing confusion and point inflation.
- **Changes**:
  - Removed daily_active_user achievement from database
  - Updated launch points calculation logic
  - Cleaned up existing daily active point entries
  - Recalculated correct point totals for all teams

#### 2026-01-16: User-Specific Team Dashboard Snapshots
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added user-specific dashboard snapshots allowing team members to view personalized dashboards based on their role and category access.
- **Changes**:
  - Created user_dashboard_snapshots table
  - Built get_user_dashboard_data() function
  - Modified Team Dashboard to support user-specific views
  - Added user filtering in dashboard UI

#### 2026-01-15: Team Dashboard Realtime Updates
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Enabled realtime subscriptions for Team Pulse snapshots so users see updates immediately when new pulse is generated.
- **Changes**:
  - Enabled realtime on team_pulse_snapshots table
  - Added subscription in TeamPulseView component
  - Implemented automatic UI refresh on new data
  - Added loading states during updates

#### 2026-01-15: Team Dashboard Background Generation
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added background generation tracking for Team Dashboard including status, timestamps, and error logging.
- **Changes**:
  - Added background_generation_status columns to team_dashboard_snapshots
  - Added generation_started_at and generation_completed_at timestamps
  - Created error tracking for failed generations
  - Updated UI to show generation progress

#### 2026-01-15: Team Pulse Design Customization
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added design style customization to Team Pulse allowing teams to choose visual style (modern, classic, minimal, bold).
- **Changes**:
  - Added design_style column to team_pulse_settings
  - Created TeamPulseCustomizeModal for style selection
  - Modified generate-team-pulse to apply style preferences
  - Added style preview in settings UI

#### 2026-01-15: Team Pulse Customization Settings
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added comprehensive customization settings for Team Pulse including focus areas, key metrics, and tone preferences.
- **Changes**:
  - Created team_pulse_settings table
  - Built TeamPulseCustomizeModal component
  - Added realtime sync for settings changes
  - Integrated settings into pulse generation

#### 2026-01-15: Team Dashboard Visualization HTML Storage
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added HTML storage to team dashboard snapshots for richer data visualizations and embedded charts.
- **Changes**:
  - Added visualization_html column to team_dashboard_snapshots
  - Modified generate-team-dashboard to output HTML visualizations
  - Updated TeamDashboardView to render HTML safely
  - Added export functionality for visualizations

#### 2026-01-15: Team Dashboard Specialized Queries
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Created specialized database queries for mission/values and goals extraction to improve Team Dashboard accuracy.
- **Changes**:
  - Created extract_mission_values() function for strategy docs
  - Created extract_team_goals() function for goal documents
  - Updated get_team_dashboard_data to use specialized queries
  - Improved relevance scoring for dashboard insights

#### 2026-01-15: Team Strategy Configuration Tables
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created dedicated tables for team strategy configuration including mission, values, goals, and key focus areas.
- **Changes**:
  - Created team_strategy_config table
  - Created team_key_metrics table for tracking KPIs
  - Added RLS policies for team-based access
  - Integrated into Team Dashboard data queries

#### 2026-01-15: Default Category Access for All Users
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Updated default category access to include all 14 categories instead of just strategy, meetings, and financial.
- **Changes**:
  - Modified apply_invite_category_access_on_signup function
  - Added all categories to default access list
  - Backfilled existing users with full access
  - Updated signup flow to apply full access

#### 2026-01-15: Moonshot Invite Code Signup Flow Fix
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed signup flow for users with Moonshot Challenge invite codes to properly create team and set moonshot flags.
- **Changes**:
  - Updated handle_new_user_signup to detect moonshot codes
  - Set is_moonshot_team flag during signup
  - Linked new team to moonshot registration
  - Fixed onboarding redirect for moonshot users

#### 2026-01-15: Remove Daily Active Points from Ledger
- **Category**: Cleanup
- **Impact Score**: 4
- **Description**: Removed daily active user points from launch points ledger as they were causing duplicate counting issues.
- **Changes**:
  - Deleted all daily_active_user entries from ledger
  - Removed daily active achievement type
  - Updated point calculation to exclude daily active
  - Recalculated total points for accuracy

#### 2026-01-15: Microsoft Files in Fuel Level Calculation
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed fuel level calculation to include Microsoft OneDrive/SharePoint files alongside Google Drive files.
- **Changes**:
  - Updated calculate_fuel_level to check microsoft_file_id
  - Modified count logic to include both providers
  - Fixed category counting for Microsoft files
  - Ensured accurate fuel levels for Microsoft users

#### 2026-01-15: Microsoft Files in Category Counts
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed get_team_category_counts to properly count Microsoft files in addition to Google Drive files.
- **Changes**:
  - Updated category counting logic to check microsoft_file_id
  - Added provider-agnostic counting
  - Fixed category breakdown display
  - Ensured accurate metrics for all users

#### 2026-01-15: Microsoft Files in Sync Stats
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed document sync stats to include Microsoft OneDrive/SharePoint files for accurate progress tracking.
- **Changes**:
  - Updated get_document_sync_stats to check microsoft_file_id
  - Modified COALESCE logic to handle both providers
  - Fixed sync progress calculations
  - Ensured accurate sync metrics

#### 2026-01-15: Microsoft Files in Documents List
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed get_team_documents_list to include Microsoft files for complete library view.
- **Changes**:
  - Updated query to check both google_file_id and microsoft_file_id
  - Modified DISTINCT ON logic for Microsoft files
  - Added provider indicator in results
  - Fixed file type detection for Microsoft documents

#### 2026-01-15: Drive Provider Selection in Launch Flow
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added drive provider selection (Google Drive vs Microsoft OneDrive) to launch preparation flow.
- **Changes**:
  - Added drive_flow_provider column to launch_progress table
  - Updated LaunchPreparationFlow to show provider selection
  - Modified fuel stage to support both providers
  - Added provider-specific setup guidance

#### 2026-01-15: Multiple Drive Providers Support
- **Category**: Feature Enhancement
- **Impact Score**: 7
- **Description**: Updated user_drive_connections to support multiple cloud storage providers (Google Drive and Microsoft OneDrive) simultaneously.
- **Changes**:
  - Removed unique constraint on team_id in user_drive_connections
  - Added provider column to distinguish connection types
  - Updated connection UI to support multiple providers
  - Modified sync logic to handle multiple connections

#### 2026-01-14: Moonshot RBG Scores Scheduler
- **Category**: Infrastructure
- **Impact Score**: 5
- **Description**: Set up automated cron job to calculate Moonshot Challenge RBG scores daily at 2 AM EST.
- **Changes**:
  - Created pg_cron job for calculate_moonshot_rbg_scores
  - Scheduled for 2 AM EST (7 AM UTC) daily
  - Added error logging for score calculation
  - Integrated with Admin Dashboard display

#### 2026-01-14: Moonshot RBG Scoring System
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Created Results-Based Growth (RBG) scoring system for Moonshot Challenge tracking participation, results, and growth metrics.
- **Changes**:
  - Added rbg_results, rbg_growth, rbg_participation scores to moonshot_registrations
  - Created calculate_moonshot_rbg_scores() function
  - Built scoring algorithm based on launch points, activity, and documents
  - Added RBG score display in Moonshot Challenge page

#### 2026-01-14: Team Dashboard Custom Instructions
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added custom instructions field to Team Dashboard allowing teams to guide AI on specific metrics or focus areas.
- **Changes**:
  - Added custom_instructions column to team_dashboard_snapshots
  - Created input UI in Team Dashboard settings
  - Modified generate-team-dashboard to incorporate instructions
  - Added examples and guidance for writing instructions

#### 2026-01-14: Team Dashboard Scheduler Cron
- **Category**: Infrastructure
- **Impact Score**: 5
- **Description**: Set up automated cron job to generate weekly Team Dashboard snapshots every Monday at 3 AM EST.
- **Changes**:
  - Created pg_cron job for process-scheduled-team-dashboard
  - Scheduled for Mondays at 3 AM EST
  - Added email notifications for dashboard delivery
  - Implemented error handling and retry logic

#### 2026-01-14: Team Dashboard Data Function
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Created get_team_dashboard_data() function to aggregate and analyze team metrics across all categories and documents.
- **Changes**:
  - Built comprehensive SQL query for team metrics
  - Aggregated document stats by category
  - Calculated team health indicators
  - Extracted key insights from recent documents

#### 2026-01-14: Team Dashboard System Launch
- **Category**: Major Feature
- **Impact Score**: 8
- **Description**: Launched Team Dashboard system providing automated weekly insights on team performance, goals, and document activity.
- **Changes**:
  - Created team_dashboard_snapshots table
  - Built TeamDashboardView component
  - Integrated AI-generated insights and visualizations
  - Added dashboard scheduling and email delivery
  - Created health metrics and trend analysis

#### 2026-01-13: OAuth Certification Tracking System
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Implemented OAuth app certification tracking to manage Google OAuth recertification requirements and deadlines.
- **Changes**:
  - Created oauth_certifications table
  - Built certification management UI in Admin Dashboard
  - Added notification system for recertification deadlines
  - Implemented status tracking (active, pending, expired)

#### 2026-01-13: Category Access to Signup Function
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Integrated category access assignment into signup function to ensure new users get proper folder access immediately.
- **Changes**:
  - Updated handle_new_user_signup to assign category access
  - Applied default access for regular signups
  - Respected invite code category restrictions
  - Fixed edge cases in access assignment

#### 2026-01-13: Backfill Default Category Access
- **Category**: Enhancement
- **Impact Score**: 4
- **Description**: Backfilled default category access for all existing users to ensure consistent access permissions.
- **Changes**:
  - Created migration to add default access for existing users
  - Applied strategy, meetings, financial access to all
  - Ensured no users were left without category access
  - Validated access assignment across all teams

#### 2026-01-13: Setup Delegation Signup Flow Fix
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed setup delegation system to properly assign delegated user during team creation signup flow.
- **Changes**:
  - Updated handle_new_user_signup to check setup_delegations
  - Set delegated_to_user_id when admin invites arrive
  - Fixed RLS policies for delegation table access
  - Added proper error handling for delegation assignment

#### 2026-01-13: Marketing Images Storage Bucket
- **Category**: Infrastructure
- **Impact Score**: 5
- **Description**: Created dedicated storage bucket for marketing email images with proper access policies.
- **Changes**:
  - Created marketing-images storage bucket
  - Configured public read access for email images
  - Set up upload policies for admin users
  - Added image URL generation in email composer

#### 2026-01-13: Team Pulse Monday 3AM EST Schedule
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Updated Team Pulse cron job to run Mondays at 3 AM EST (8 AM UTC) for better timing.
- **Changes**:
  - Modified pg_cron schedule for team pulse
  - Changed from daily to weekly (Monday) execution
  - Adjusted timezone for 3 AM EST delivery
  - Updated notification timing

### December 2025

#### 2025-12-30: Moonshot Challenge Onboarding Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added onboarding tracking columns to moonshot registrations to monitor user journey from registration to full onboarding.
- **Changes**:
  - Added onboarding_completed and onboarded_at columns
  - Created tracking for team creation step
  - Added progress indicators in Moonshot UI
  - Integrated with analytics dashboard

#### 2025-12-30: Moonshot Survey Responses Schema Update
- **Category**: Enhancement
- **Impact Score**: 4
- **Description**: Added email and industry fields to moonshot survey responses for better participant profiling.
- **Changes**:
  - Added email and industry columns to survey_responses
  - Updated WorkshopOnboarding to capture email/industry
  - Modified analytics to segment by industry
  - Improved survey data quality

#### 2025-12-30: Moonshot Registration Timestamps
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Added updated_at timestamp to moonshot registrations for better change tracking.
- **Changes**:
  - Added updated_at column with auto-update trigger
  - Tracks all registration modifications
  - Improves audit trail for registrations

#### 2025-12-30: Anonymous Moonshot Registration by Email
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Allowed anonymous users to look up their Moonshot registration by email for checking status.
- **Changes**:
  - Created RLS policy for anonymous email lookup
  - Built status check UI for unregistered users
  - Added email validation and security measures
  - Improved user experience for pre-launch users

#### 2025-12-30: Authenticated User Moonshot Access
- **Category**: Enhancement
- **Impact Score**: 4
- **Description**: Added policies allowing authenticated users to view their own Moonshot registration and update status.
- **Changes**:
  - Created authenticated user policies for moonshot_registrations
  - Allowed users to update their registration details
  - Added team_id-based access control
  - Improved security around registration updates

#### 2025-12-30: Moonshot Registration Conversion Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added converted_at timestamp to track when Moonshot registrations convert to full accounts.
- **Changes**:
  - Added converted_at column to moonshot_registrations
  - Created trigger to set timestamp on team creation
  - Added conversion metrics to Admin Dashboard
  - Improved registration funnel analytics

#### 2025-12-30: Import Existing Teams to Moonshot
- **Category**: Enhancement
- **Impact Score**: 5
- **Description**: Backfilled moonshot_registrations table with existing teams to include all users in Moonshot Challenge.
- **Changes**:
  - Created migration to import existing teams
  - Set proper registration fields for imported teams
  - Initialized challenge tracking columns
  - Ensured no team data was lost

#### 2025-12-30: Moonshot Challenge Tracking Columns
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added comprehensive tracking columns to moonshot_registrations for monitoring challenge progress.
- **Changes**:
  - Added team_id, team_created_at for team linking
  - Added challenge_started_at for participation tracking
  - Added milestones_completed for progress monitoring
  - Added current_phase for challenge stage tracking

#### 2025-12-29: One Document Per Unique File in List
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed get_team_documents_list to return only one row per unique file instead of duplicates from multiple chunks.
- **Changes**:
  - Added DISTINCT ON (google_file_id, source) to query
  - Ensured proper ordering for most recent version
  - Fixed duplicate file listings in My Library
  - Improved query performance

#### 2025-12-29: Admin Document Stats with Google File ID
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed admin team document stats to use google_file_id instead of source_id for accurate unique document counting.
- **Changes**:
  - Updated get_admin_team_document_stats to use google_file_id
  - Fixed duplicate counting in admin metrics
  - Corrected team document totals
  - Improved admin dashboard accuracy

#### 2025-12-29: Marketing Contacts Import
- **Category**: Infrastructure
- **Impact Score**: 5
- **Description**: Imported initial batch of marketing contacts into new contacts system for email campaigns.
- **Changes**:
  - Created initial import migration
  - Added 50+ contacts from existing list
  - Validated email addresses and metadata
  - Set up for campaign targeting

#### 2025-12-29: Marketing Contacts Table
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created marketing_contacts table to manage email marketing lists separately from users for better campaign management.
- **Changes**:
  - Created marketing_contacts table with RLS
  - Added subscription status and preferences
  - Built unsubscribe tracking
  - Integrated with marketing email campaigns

#### 2025-12-29: Custom Email Frequency and Send Hour
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added custom frequency options (daily, weekly, monthly) and specific send hour for recurring marketing emails.
- **Changes**:
  - Added send_frequency and send_hour columns
  - Updated scheduler to respect frequency settings
  - Created UI for frequency selection
  - Added timezone-aware send time handling

#### 2025-12-28: Recurring Marketing Emails Cron
- **Category**: Infrastructure
- **Impact Score**: 5
- **Description**: Set up automated cron job to process recurring marketing email campaigns at scheduled intervals.
- **Changes**:
  - Created pg_cron job for recurring email processing
  - Scheduled for multiple daily check times
  - Added error handling and retry logic
  - Implemented campaign queuing system

#### 2025-12-28: Recurring Marketing Emails Support
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Added support for recurring marketing email campaigns with configurable schedules and automatic sending.
- **Changes**:
  - Added is_recurring and next_send_date columns
  - Created recurring campaign scheduling logic
  - Built UI for setting up recurring campaigns
  - Added campaign history tracking

#### 2025-12-28: Local File Upload to What's New
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added announcement of local file upload feature to What's New section.
- **Changes**:
  - Created What's New entry for local uploads
  - Added feature description and benefits
  - Linked to local upload documentation
  - Updated feature announcements

#### 2025-12-28: File Modified Date in Documents List
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added file_modified_at to documents list function for showing when files were last modified at source.
- **Changes**:
  - Added file_modified_at to get_team_documents_list return
  - Updated documents table queries to include modified date
  - Added modified date display in My Library UI
  - Improved file freshness indicators

#### 2025-12-28: Local Uploads Folder to Drive Connections
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added local_uploads_folder_id tracking to user_drive_connections for organizing locally uploaded files.
- **Changes**:
  - Added local_uploads_folder_id column
  - Created UI for setting local uploads destination
  - Integrated with file upload flow
  - Added folder management for local files

#### 2025-12-27: Local Uploads Bucket MIME Types Update
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Updated allowed MIME types for local uploads bucket to support wider range of document formats.
- **Changes**:
  - Added additional document MIME types
  - Allowed text/plain and text/markdown files
  - Enabled CSV and Excel file uploads
  - Updated validation logic

#### 2025-12-27: Local Uploads Storage Policies
- **Category**: Security
- **Impact Score**: 5
- **Description**: Created RLS policies for local-uploads storage bucket ensuring team-based access control.
- **Changes**:
  - Created team-based upload policies
  - Added read policies for team members
  - Implemented admin override policies
  - Secured file access by team

#### 2025-12-27: Updated Fuel Level Requirements
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Adjusted fuel level calculation to require minimum documents in key categories (strategy, meetings, or local uploads).
- **Changes**:
  - Updated calculate_fuel_level to check category minimums
  - Required at least 5 documents in one key category
  - Added local uploads to fuel level sources
  - Improved fuel level accuracy

#### 2025-12-27: Sync Stats Include Local Uploads
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Updated document sync stats to include locally uploaded files alongside synced drive documents.
- **Changes**:
  - Modified get_document_sync_stats to count local uploads
  - Added COALESCE for source_id to handle local files
  - Updated sync progress calculations
  - Fixed null source_id handling

#### 2025-12-27: Documents List Include Local Files
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Updated team documents list function to include locally uploaded files in My Library view.
- **Changes**:
  - Modified get_team_documents_list to include local uploads
  - Added source type indicator for local vs synced
  - Updated sorting to show recent local uploads first
  - Fixed null file ID handling

#### 2025-12-26: Local Upload Support in Document Chunks
- **Category**: Feature Enhancement
- **Impact Score**: 6
- **Description**: Added local upload support to document chunks table allowing files to be uploaded directly without cloud drive.
- **Changes**:
  - Modified document_chunks table to allow null google_file_id
  - Added local_upload indicator to chunks
  - Updated vectorization to handle local files
  - Modified search to include local uploads

#### 2025-12-26: Local Uploads Storage Bucket
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Created local-uploads storage bucket with proper policies for users to upload documents directly to AI Rocket.
- **Changes**:
  - Created local-uploads Supabase storage bucket
  - Configured team-based access policies
  - Added file size limits and MIME type validation
  - Created upload-local-file edge function
  - Built LocalFileUpload component with drag-drop UI

#### 2025-12-25: Feedback Questions for AI Data Sync
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Updated feedback questions to focus on AI-powered data sync experience and launch preparation.
- **Changes**:
  - Replaced generic questions with sync-focused queries
  - Added questions about automation value
  - Included launch preparation feedback
  - Improved feedback quality and actionability

#### 2025-12-25: Setup Delegation Policies Fix
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed RLS policies for setup_delegations table to use public.users instead of auth.users.
- **Changes**:
  - Updated policies to reference public.users table
  - Fixed authentication checks in policies
  - Resolved delegation access issues
  - Ensured proper permission inheritance

#### 2025-12-24: Admin Stats Add Chunk Counts
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added document chunk counts to admin team statistics for better monitoring of vectorization progress.
- **Changes**:
  - Added chunk counts to get_admin_team_document_stats
  - Created breakdown by category
  - Added chunk health indicators
  - Improved admin visibility into data quality

#### 2025-12-23: Enable RLS on Remaining Tables
- **Category**: Security
- **Impact Score**: 7
- **Description**: Enabled Row Level Security on all remaining tables that were missing RLS policies for comprehensive data protection.
- **Changes**:
  - Enabled RLS on 20+ remaining tables
  - Created appropriate policies for each table
  - Audited all tables for security compliance
  - Ensured no data leakage between teams

#### 2025-12-23: Allow Null User ID in Marketing Recipients
- **Category**: Enhancement
- **Impact Score**: 3
- **Description**: Modified marketing recipients table to allow null user_id for sending to non-user email addresses.
- **Changes**:
  - Made user_id nullable in marketing_email_recipients
  - Added email-based sending for non-users
  - Updated recipient validation logic
  - Improved marketing campaign flexibility

#### 2025-12-23: Remove Deprecated Folder Columns
- **Category**: Cleanup
- **Impact Score**: 4
- **Description**: Removed deprecated individual folder columns from user_drive_connections after migration to unified slots.
- **Changes**:
  - Dropped strategy_folder_id, meetings_folder_id, financial_folder_id columns
  - Removed unused folder name and permission columns
  - Cleaned up database schema
  - Reduced table complexity

#### 2025-12-23: Fix Astra Team Folder Placement
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed Astra chats to be placed in correct team folder structure instead of generic team chat location.
- **Changes**:
  - Updated astra_chats folder_id assignment logic
  - Fixed team-based folder routing
  - Ensured proper folder permissions
  - Corrected existing misplaced chats

#### 2025-12-23: Admin Document Stats Function
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created comprehensive admin function to get document statistics per team including category breakdowns.
- **Changes**:
  - Created get_admin_team_document_stats() function
  - Returns counts by team and category
  - Includes last 24 hours activity
  - Added team name and member information

#### 2025-12-22: Fix Unified Sync Default to True
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed unified_sync_enabled to default to true for new drive connections ensuring sync works by default.
- **Changes**:
  - Changed default value from false to true
  - Backfilled existing connections to true
  - Updated connection creation logic
  - Fixed sync not working for new users

#### 2025-12-22: Team Chat View Policy
- **Category**: Security
- **Impact Score**: 4
- **Description**: Added RLS policy allowing team members to view all team chat messages for proper collaboration.
- **Changes**:
  - Created policy for team members to SELECT team messages
  - Verified team membership before allowing access
  - Fixed team chat visibility issues
  - Ensured proper message isolation by team

#### 2025-12-22: Fix Team Admin Guidance Progress JSON
- **Category**: Bug Fix
- **Impact Score**: 3
- **Description**: Fixed return type of get_team_admin_guidance_progress to return proper JSONB instead of record.
- **Changes**:
  - Changed function return type to JSONB
  - Fixed JSON aggregation in query
  - Corrected type casting issues
  - Ensured proper JSON parsing in frontend

#### 2025-12-22: Team Admin Guidance Progress Function
- **Category**: Feature
- **Impact Score**: 5
- **Description**: Created function to aggregate team admin guidance progress for dashboard display.
- **Changes**:
  - Created get_team_admin_guidance_progress() function
  - Aggregates progress across all guidance tasks
  - Returns completion percentages by category
  - Integrated into Admin Dashboard

#### 2025-12-22: Trigger Debug Log Table
- **Category**: Infrastructure
- **Impact Score**: 3
- **Description**: Created debug logging table for troubleshooting database triggers and functions.
- **Changes**:
  - Created trigger_debug_logs table
  - Added logging to problematic triggers
  - Improved trigger debugging workflow
  - Added timestamp and context tracking

#### 2025-12-22: Fix Signup with RLS Bypass Helper
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Created RLS bypass helper function for signup trigger to properly create user records.
- **Changes**:
  - Created create_user_bypass_rls() helper function
  - Modified signup trigger to use bypass function
  - Fixed RLS blocking trigger operations
  - Ensured reliable user creation

#### 2025-12-22: Fix Signup Trigger Bypass RLS
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Updated signup trigger to properly bypass RLS when creating user records during authentication.
- **Changes**:
  - Set search_path to bypass RLS in trigger
  - Used SECURITY DEFINER on functions
  - Fixed permission issues during signup
  - Ensured reliable user creation

#### 2025-12-22: Allow Anonymous Team Name Lookup
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Allowed anonymous users to look up team names by team_id for invite code validation.
- **Changes**:
  - Created RLS policy for anonymous team name reads
  - Limited to name and id columns only
  - Improved invite code UX
  - Maintained security on other team data

#### 2025-12-21: New Mission Control Feature Flag
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added feature flag for new Mission Control page with Launch Preparation integration.
- **Changes**:
  - Added new_mission_control feature flag
  - Created gradual rollout system
  - Built A/B testing infrastructure
  - Added toggle in Admin Dashboard

#### 2025-12-21: User Open Tabs Tracking
- **Category**: Feature
- **Impact Score**: 5
- **Description**: Created user_open_tabs table to track and restore user's open tabs across sessions.
- **Changes**:
  - Created user_open_tabs table with RLS
  - Built tab persistence system
  - Added automatic tab restoration on login
  - Created DynamicTabBar component

#### 2025-12-20: Folder Connected By Tracking
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added tracking of which admin connected each folder for better accountability and management.
- **Changes**:
  - Added connected_by_user_id to folder tracking columns
  - Updated folder connection UI to show connector
  - Added connected_at timestamps
  - Improved folder management audit trail

#### 2025-12-20: Team Category Counts Function
- **Category**: Feature
- **Impact Score**: 5
- **Description**: Created function to get document counts by category for team metrics and analytics.
- **Changes**:
  - Created get_team_category_counts() function
  - Returns counts for all 14 categories
  - Optimized for performance with proper indexes
  - Integrated into My Library stats

#### 2025-12-20: Team Documents List Function
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created comprehensive function to list all team documents with metadata for My Library view.
- **Changes**:
  - Created get_team_documents_list() function
  - Returns file names, types, categories, chunk counts
  - Supports pagination and filtering
  - Optimized for large document sets

#### 2025-12-20: Document Sync Stats Function Update
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Updated sync stats function to work with unified chunks table and provide accurate progress.
- **Changes**:
  - Modified get_document_sync_stats for unified table
  - Fixed category counting logic
  - Added total document counts
  - Improved sync progress accuracy

#### 2025-12-20: Automatic Sync Progress Tracking
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Implemented automatic sync progress tracking using database triggers on chunk insertion.
- **Changes**:
  - Created trigger on document_chunks for progress tracking
  - Automatically updates data_sync_sessions table
  - Real-time progress without polling
  - Added realtime subscription support

#### 2025-12-20: Calculate Fuel Level Function
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created function to calculate team's fuel level based on documents synced across categories.
- **Changes**:
  - Created calculate_fuel_level() function
  - Weighs different categories appropriately
  - Returns percentage (0-100) fuel level
  - Integrated into Launch Preparation UI

#### 2025-12-20: Data Sync Sessions Realtime
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Enabled realtime subscriptions on data_sync_sessions for live progress updates.
- **Changes**:
  - Enabled realtime on data_sync_sessions table
  - Created frontend subscriptions
  - Added automatic UI updates on progress
  - Improved user experience during sync

#### 2025-12-20: Data Sync Sessions Table
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created data_sync_sessions table to track document sync progress and status.
- **Changes**:
  - Created data_sync_sessions table with RLS
  - Tracks sync status, progress, file counts
  - Includes error logging
  - Supports multiple concurrent syncs

### November 2025

#### 2025-11-30: Onboarding Seen for Launch Status
- **Category**: Feature Enhancement
- **Impact Score**: 3
- **Description**: Added onboarding_seen flag to launch status table to track welcome screen display.
- **Changes**:
  - Added onboarding_seen column to launch_status
  - Created UI to mark onboarding complete
  - Fixed duplicate onboarding display
  - Improved first-time user experience

#### 2025-11-30: Onboarding Seen for Launch Prep
- **Category**: Feature Enhancement
- **Impact Score**: 3
- **Description**: Added onboarding_seen flag to launch_prep_eligible table for tracking welcome screens.
- **Changes**:
  - Added onboarding_seen column
  - Created onboarding screen component
  - Added skip functionality
  - Improved launch prep UX

#### 2025-11-30: Launch Prep Super Admin Policies
- **Category**: Security
- **Impact Score**: 3
- **Description**: Added super admin policies for launch preparation tables to enable admin monitoring.
- **Changes**:
  - Created super admin SELECT policies on launch tables
  - Allowed admin oversight of launch progress
  - Maintained user privacy for non-admins
  - Improved admin dashboard capabilities

#### 2025-11-30: Launch Achievements RLS Fix
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed RLS policies on launch_achievements table to properly allow user and admin access.
- **Changes**:
  - Updated policies to use correct user_id field
  - Added super admin override policies
  - Fixed achievement visibility issues
  - Ensured proper data isolation

#### 2025-11-30: Launch Prep Eligible RLS Fix
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed RLS policies on launch_prep_eligible table to allow proper user access.
- **Changes**:
  - Updated policies with correct authentication checks
  - Fixed policy syntax errors
  - Enabled user self-service access
  - Added admin monitoring policies

#### 2025-11-30: Launch Preparation System
- **Category**: Major Feature
- **Impact Score**: 9
- **Description**: Launched comprehensive Launch Preparation system with gamified progress tracking, achievements, and 3-stage journey (Guidance, Fuel, Boosters).
- **Changes**:
  - Created launch_prep_eligible, launch_progress, launch_points_ledger tables
  - Created launch_achievements table with 50+ achievements
  - Built LaunchPreparationFlow component with stage navigation
  - Created GuidanceStage, FuelStage, BoostersStage components
  - Implemented point system with milestone tracking
  - Added achievement animations and notifications
  - Created launch activity tracking and analytics

#### 2025-11-29: Guided Chat Prompts Table
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created guided_chat_prompts table to store and manage AI-suggested follow-up prompts for guided conversations.
- **Changes**:
  - Created guided_chat_prompts table with RLS
  - Linked prompts to conversations
  - Added prompt generation logic
  - Integrated into guided chat UI

#### 2025-11-27: Documents Table RLS
- **Category**: Security
- **Impact Score**: 6
- **Description**: Enabled Row Level Security on documents table to properly isolate team data.
- **Changes**:
  - Enabled RLS on documents table
  - Created team-based access policies
  - Added admin override policies
  - Fixed documents visibility issues

#### 2025-11-26: Users Table Recursive RLS Fix
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed recursive RLS policy on users table that was causing authentication failures.
- **Changes**:
  - Removed recursive team_id check in policy
  - Simplified user access logic
  - Fixed login issues for some users
  - Improved policy performance

#### 2025-11-26: Astra Chats Policies Without Auth Users
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed astra_chats RLS policies to not reference auth.users which causes policy failures.
- **Changes**:
  - Updated policies to use public.users
  - Removed auth.users references
  - Fixed chat creation and access issues
  - Improved policy reliability

#### 2025-11-26: Astra Chats RLS Fix
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed RLS policies on astra_chats table to allow proper insert and select operations.
- **Changes**:
  - Updated INSERT policy to check user authentication
  - Fixed SELECT policy to allow team member access
  - Resolved chat creation failures
  - Ensured proper chat visibility

#### 2025-11-26: Feature Flag Migration Trigger
- **Category**: Enhancement
- **Impact Score**: 4
- **Description**: Created trigger to automatically grant feature flags to new users based on their email and team.
- **Changes**:
  - Created auto-grant feature flag trigger
  - Applied flags based on email patterns
  - Enabled instant feature access
  - Simplified feature flag management

#### 2025-11-26: Email-Based Feature Flags
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added email pattern-based feature flags allowing automatic flag assignment based on email domain or pattern.
- **Changes**:
  - Created email_pattern_feature_flags table
  - Built automatic flag assignment system
  - Added wildcard email matching
  - Simplified rollout to specific users

#### 2025-11-26: Google Picker Feature Flag
- **Category**: Feature Enhancement
- **Impact Score**: 5
- **Description**: Added feature flag for Google Picker integration allowing gradual rollout of new folder selection UI.
- **Changes**:
  - Created google_picker feature flag
  - Built feature flag checking in folder selection
  - Added A/B testing infrastructure
  - Created gradual rollout system

#### 2025-11-25: Remove Unique Constraint from Documents
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Removed problematic unique constraint from documents table that was causing sync failures.
- **Changes**:
  - Dropped unique constraint on google_file_id
  - Allowed multiple versions of same file
  - Fixed sync blocking issue
  - Improved data flexibility

#### 2025-11-25: Clean Duplicate Documents
- **Category**: Cleanup
- **Impact Score**: 5
- **Description**: Cleaned up duplicate documents and added unique constraint to prevent future duplicates.
- **Changes**:
  - Identified and removed duplicate document entries
  - Created unique constraint on (team_id, google_file_id)
  - Preserved most recent version of duplicates
  - Improved data quality

#### 2025-11-25: Super Admin Setup Progress Access
- **Category**: Security
- **Impact Score**: 3
- **Description**: Added super admin policies to access all teams' setup progress for monitoring.
- **Changes**:
  - Created super admin SELECT policy on setup_progress
  - Allowed admin oversight of onboarding
  - Maintained user privacy for non-admins
  - Improved admin dashboard data

#### 2025-11-25: Remove Unused JSONB Folder Columns
- **Category**: Cleanup
- **Impact Score**: 3
- **Description**: Removed deprecated JSONB folder columns after successful migration to individual folder slots.
- **Changes**:
  - Dropped selected_folders_jsonb column
  - Dropped selected_folder_names_jsonb column
  - Cleaned up database schema
  - Completed folder migration

#### 2025-11-25: Migrate JSONB Folders to Individual Columns
- **Category**: Enhancement
- **Impact Score**: 6
- **Description**: Migrated folder selection from JSONB arrays to individual folder slot columns for better query performance and flexibility.
- **Changes**:
  - Created migration to convert JSONB to individual columns
  - Preserved all existing folder selections
  - Updated UI to use new column structure
  - Improved folder management performance

#### 2025-11-24: OAuth Scope Version Tracking
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Added OAuth scope version tracking to monitor when users need to re-authenticate for expanded permissions.
- **Changes**:
  - Added scope_version column to user_drive_connections
  - Created scope change detection logic
  - Built re-authentication prompts
  - Added scope version management UI

#### 2025-11-24: Fix Teams RLS for New Creators
- **Category**: Bug Fix
- **Impact Score**: 5
- **Description**: Fixed teams table RLS to allow new team creators to insert their team records.
- **Changes**:
  - Updated INSERT policy to allow authenticated users
  - Fixed team creation failures
  - Ensured proper team ownership
  - Resolved signup blocking issues

#### 2025-11-24: Fix Invited Users See Welcome Modal
- **Category**: Bug Fix
- **Impact Score**: 4
- **Description**: Fixed invited users to see welcome modal and onboarding flow instead of being skipped.
- **Changes**:
  - Updated onboarding logic for invited users
  - Ensured welcome modal displays for all users
  - Fixed invite code handling in onboarding
  - Improved first-time user experience

#### 2025-11-24: Legal Acceptance Table
- **Category**: Feature
- **Impact Score**: 6
- **Description**: Created legal acceptance tracking system to record user consent to Terms of Service and Privacy Policy.
- **Changes**:
  - Created legal_acceptance table with RLS
  - Added acceptance tracking on signup
  - Built legal document versioning
  - Created compliance reporting

### October 2025

#### 2025-10-24: Admin Invites System
- **Category**: Feature
- **Impact Score**: 7
- **Description**: Created admin invite system allowing team admins to invite members with pre-configured invite codes.
- **Changes**:
  - Created admin_invites table
  - Built send-invite-email edge function
  - Created invite management UI
  - Added invite code generation and validation

### September 2025

#### 2025-09-30: Enable Realtime for Reports
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Enabled realtime subscriptions on reports table for live updates when reports are generated.
- **Changes**:
  - Enabled realtime on reports table
  - Created frontend subscriptions
  - Added automatic report list refresh
  - Improved collaborative experience

#### 2025-09-30: Add Schedule Day Field
- **Category**: Feature Enhancement
- **Impact Score**: 4
- **Description**: Added schedule_day field to reports table for weekly/monthly report scheduling.
- **Changes**:
  - Added schedule_day column (0-6 for weekly, 1-31 for monthly)
  - Updated report scheduling UI
  - Modified cron job to respect day preference
  - Improved scheduling flexibility

#### 2025-09-17: Document Chunks Tables Creation
- **Category**: Major Feature
- **Impact Score**: 10
- **Description**: Created initial document chunks tables with vector embeddings for semantic search across strategy, meetings, and financial documents.
- **Changes**:
  - Created document_chunks_strategy table with pgvector
  - Created document_chunks_meetings table
  - Created document_chunks_financial table
  - Set up RLS policies for all tables
  - Created vector similarity search functions
  - Integrated with Google Drive sync

#### 2025-09-13: Initial Database Schema
- **Category**: Infrastructure
- **Impact Score**: 10
- **Description**: Created foundational database schema including users, teams, chats, and reports tables.
- **Changes**:
  - Created users table with auth integration
  - Created teams table for team management
  - Created astra_chats and astra_chat_messages tables
  - Created reports table for scheduled reporting
  - Set up initial RLS policies
  - Created database functions for chat management
