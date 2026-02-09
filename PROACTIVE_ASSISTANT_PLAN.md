# Proactive Assistant Scheduling & Autonomous Work Plan

## Overview

This document outlines how the AI assistant evolves from a reactive chatbot into a **proactive digital coworker** -- one that monitors the business, detects deviations, acts autonomously, and reports back on what it accomplished. The system builds on the existing proactive notification infrastructure (`proactive_notification_queue`, `assistant_proactive_events`, `user_assistant_preferences`) and the `agent_conversations` realtime table.

### The Shift: From Tool to Partner

Inspired by the "OpenClaw" model of agentic AI, the assistant operates on three core pillars:

| Pillar | Traditional Chatbot | Our Proactive Assistant |
|---|---|---|
| **Trigger** | User types a prompt | "Heartbeat" loop scans environment on a schedule |
| **Memory** | Session-based, forgotten later | Persistent "Strategic Identity" that evolves over time |
| **Execution** | User clicks "Run" | Agent executes work and notifies user with finished products |

---

## Part 1: The Strategic Identity ("SOUL" System)

### Concept: Evolving User Profile

Rather than storing preferences as static settings fields, the assistant maintains a living **Strategic Identity** document for each user -- a rich text profile that captures not just goals and priorities, but communication preferences, decision-making patterns, and current obsessions. The AI updates this profile after every meaningful interaction.

### What the Strategic Identity Contains

```
Example Strategic Identity for "Sarah":

Sarah prefers concise, data-heavy updates over conversational summaries. She
responds well to financial metrics and ROI framing. She is currently obsessed
with the Q1 product launch and checks pipeline numbers daily. She tends to
deprioritize internal process improvements in favor of customer-facing work.
She likes recommendations framed as "opportunities" not "problems." She has
dismissed 3 out of 4 "team health" insights, suggesting she prefers to handle
team management offline. Her most-engaged insight categories are: goal progress,
competitive intel, and financial analysis. She reads overnight summaries within
30 minutes of logging in, suggesting she values them as a morning ritual.
```

### Database Schema: `user_strategic_identity`

```sql
CREATE TABLE user_strategic_identity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),

  -- The evolving identity document
  identity_text text NOT NULL DEFAULT '',
  identity_version integer DEFAULT 1,

  -- Structured preferences extracted from behavior
  preferred_insight_categories text[],    -- Ranked by engagement
  dismissed_insight_categories text[],    -- Categories they consistently ignore
  preferred_communication_style text,     -- 'concise', 'detailed', 'conversational'
  preferred_framing text,                 -- 'opportunity', 'risk', 'neutral'
  active_obsessions text[],              -- Current high-focus topics
  decision_patterns jsonb,               -- How they respond to different recommendation types

  -- Behavioral signals
  avg_response_time_minutes float,       -- How quickly they engage with proactive messages
  insight_helpful_ratio float DEFAULT 0, -- % of insights rated helpful
  peak_activity_hours int[],             -- Hours of day when most active (0-23)
  preferred_delivery_time time,          -- When they typically read overnight summaries

  -- Evolution tracking
  last_updated_at timestamptz DEFAULT now(),
  last_updated_reason text,
  update_count integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);
```

### How the Identity Evolves

After every feedback interaction, scheduled task result, or periodic check-in, an edge function runs a "Strategic Identity Update" prompt:

```
You are maintaining the Strategic Identity for {user_name}.

Current identity:
{current_identity_text}

New signal:
- Event: {event_type} (e.g., "user dismissed goal_update insight", "user rated financial_analysis 5 stars")
- Context: {event_details}
- Feedback: {user_feedback_if_any}

Update the identity text to reflect this new signal. Preserve existing
observations. Add new patterns. If the new signal contradicts an old
observation, note the evolution. Keep the identity under 500 words.
Focus on actionable patterns that help you serve this user better.

Return the updated identity text.
```

This ensures every interaction makes the assistant smarter about that specific user -- matching the "SOUL.md" concept from the research.

---

## Part 2: The Reasoning Protocol (Four-Lens Analysis)

### Concept: Structured Proactive Reasoning

Rather than simply "picking prompts to run," the overnight assistant processes all available data through a structured reasoning framework. Every time it wakes up, it evaluates the user's world through four lenses:

### The Four Lenses

1. **Deviation Detection**: Is there a metric or data point in the user's synced documents that is significantly different from the norm? (e.g., "Sales calls dropped 30% this week compared to the 4-week average")

2. **Goal Alignment Check**: Based on the user's stated priorities and team goals, is current activity and data showing progress or stagnation? (e.g., "The 'Launch by March' goal has had no new documents synced in 5 days -- possible stall")

3. **Automation Opportunity** (the "OpenClaw" lens): Is there a task the user usually does manually (based on their activity history and scheduled tasks) that the assistant can perform right now? (e.g., "User runs a pipeline summary every Monday -- it's Sunday night, so pre-generate it")

4. **Predictive Risk**: Based on current trends in the data, what is one problem that will emerge in 7 days if no action is taken? (e.g., "At current close rate, the team will miss Q1 target by 12% -- recommend reviewing the top 5 stalled deals")

### Urgency Scoring

Each insight the assistant generates receives an urgency score from 1-10:

| Score | Classification | Delivery Behavior |
|---|---|---|
| 1-3 | Low | Included in next overnight summary only |
| 4-6 | Medium | Overnight summary + in-app notification |
| 7-8 | High | Immediate in-app notification + email |
| 9-10 | Critical | Immediate push on all enabled channels, bypasses quiet hours |

This replaces the simple "insert everything into overnight summary" approach with intelligent triage.

### The Reasoning Prompt (for process-overnight-assistant)

```
### IDENTITY
You are the Proactive Business Strategist for {user_name} on team {team_name}.
You do not wait for instructions. You monitor business health and identify
opportunities, risks, and tasks that align with the user's vision.

### STRATEGIC IDENTITY
{user_strategic_identity_text}

### INPUT CONTEXT
- Personal Priorities: {user_priorities}
- Team Priorities: {team_priorities}
- Recent Document Activity (24h): {document_changes}
- Recent Data Snapshot: {sync_stats, document_counts, category_breakdown}
- Recent Actions: {last_10_scheduled_task_results}
- Engagement Pattern: {streak, last_active, peak_hours, feature_usage}

### FEEDBACK HISTORY
Insights they found helpful recently: {past_helpful_insights}
Insights they dismissed recently: {past_dismissed_insights}
Their explicit feedback: {recent_feedback_sessions}

### THE REASONING PROTOCOL
Process the data through these four lenses:

1. DEVIATION DETECTION: Is there a metric or pattern that is notably different
   from the baseline? What changed and why might it matter?

2. GOAL ALIGNMENT: Does current data show progress toward stated priorities?
   If progress has stalled on any priority, identify why.

3. AUTOMATION OPPORTUNITY: Based on the user's history and patterns, is there
   a task you can perform for them right now that they would normally do
   themselves? Pre-generate the work product.

4. PREDICTIVE RISK: Based on current trends, what is one problem that will
   occur in 7 days if no action is taken?

### OUTPUT REQUIREMENTS
Return a JSON array of insights. Each insight must include:

[{
  "lens": "deviation | goal_alignment | automation | predictive_risk",
  "title": "Short, specific title",
  "summary": "2-3 sentence finding",
  "detailed_analysis": "Full analysis if applicable",
  "urgency_score": 1-10,
  "related_priorities": ["which user priorities this connects to"],
  "proactive_proposal": "What specific action you recommend or have already taken",
  "prompt_to_run": "The exact prompt to execute against team documents, or null if analysis is complete",
  "confidence_score": 0.0-1.0
}]

Select 2-6 insights based on the user's proactive_level ({proactive_level}):
- low: 2 insights, only urgency >= 5 and confidence >= 0.7
- medium: 3-4 insights, urgency >= 3 and confidence >= 0.5
- high: 4-6 insights, include speculative and exploratory findings
```

---

## Part 3: User-Scheduled Tasks, Reminders, and Research Projects

### Concept

The assistant can accept natural language scheduling requests from users during conversation and create persistent cron-like jobs in the database. These jobs trigger the assistant to perform work at the scheduled time and deliver results.

### Example Conversations

```
User: "Remind me every Monday at 9am to review my weekly goals"
Assistant: "Done! I'll send you a goals review reminder every Monday at 9:00 AM EST.
I can also pull your current goal progress from your synced documents when I send
the reminder. Would you like that?"
User: "Yes please"
Assistant: "Got it. Every Monday at 9 AM, I'll review your goal documents, summarize
your progress, and send you the update. You can manage this in your scheduled tasks
anytime."
```

```
User: "Every Friday afternoon, research the latest trends in AI automation
and send me a summary"
Assistant: "I'll schedule a weekly research task for Fridays at 3:00 PM EST.
Each week, I'll query your synced industry documents and my knowledge base to
compile a trends summary and deliver it to you. Sound good?"
```

```
User: "Set a reminder for March 15 to prepare Q1 financials"
Assistant: "Reminder set for March 15 at 9:00 AM EST: Prepare Q1 financials.
I'll also pull any relevant financial documents from your synced data to help
you get started. Want me to set a follow-up reminder too?"
```

### Database Schema: `user_scheduled_tasks`

```sql
CREATE TABLE user_scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),

  -- Task definition
  task_type text NOT NULL CHECK (task_type IN (
    'reminder', 'research', 'report', 'goal_review',
    'data_check', 'summary', 'custom_prompt'
  )),
  title text NOT NULL,
  description text,
  prompt_text text,          -- The actual prompt to run in the team agent

  -- Schedule configuration
  schedule_type text NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  cron_expression text,       -- For custom schedules (e.g., "0 9 * * 1" for Monday 9am)
  schedule_day integer,       -- Day of week (0-6) or day of month (1-31)
  schedule_time time NOT NULL DEFAULT '09:00',
  schedule_timezone text NOT NULL DEFAULT 'America/New_York',
  next_run_at timestamptz,
  last_run_at timestamptz,

  -- One-time schedule
  scheduled_for timestamptz,  -- For 'once' type tasks

  -- Delivery preferences
  deliver_via text[] DEFAULT ARRAY['in_app'],  -- 'in_app', 'email', 'sms', etc.
  use_team_data boolean DEFAULT true,          -- Whether to query synced documents
  include_agent_analysis boolean DEFAULT true,  -- Whether to run through team agent

  -- Status
  is_active boolean DEFAULT true,
  is_paused boolean DEFAULT false,
  run_count integer DEFAULT 0,
  max_runs integer,            -- NULL = unlimited, set for limited tasks

  -- Metadata
  created_from text DEFAULT 'conversation',  -- 'conversation', 'ui', 'system'
  original_request text,       -- The user's original natural language request
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### How Scheduling Works

1. **User requests via conversation** -- The assistant parses natural language scheduling intent
2. **team-agent-chat returns a new action type**: `{ type: "schedule_task", params: { task_type, title, prompt_text, schedule_type, schedule_time, ... } }`
3. **Frontend intercepts the action** and calls an edge function `create-scheduled-task` to persist it
4. **A pg_cron job runs every 15 minutes** checking `next_run_at <= now()` for active tasks
5. **For each due task**, the system:
   - Calls the team agent with the stored `prompt_text` (including user/team context)
   - Captures the response
   - Inserts the result as an agent message in `agent_conversations` (appears in assistant chat)
   - Optionally queues notifications via `proactive_notification_queue` for other channels
   - Updates `last_run_at` and calculates `next_run_at`
6. **User sees the results** next time they open the app, or via push notification / email

### Edge Function: `process-scheduled-tasks`

This new edge function would:
- Query `user_scheduled_tasks` where `is_active = true`, `is_paused = false`, `next_run_at <= now()`
- For each task, build a context-rich prompt by combining:
  - The stored `prompt_text`
  - The user's Strategic Identity
  - The user's priorities from `user_priorities`
  - Team priorities from `team_priorities`
  - Document sync stats (what data is available)
  - User's engagement history
- Call the team agent (either via the `team-agent-chat` edge function or directly via Gemini)
- Insert the response into `agent_conversations` with `role: 'agent'` and metadata flagging it as a scheduled task result
- Queue multi-channel notifications if configured
- Calculate and set the next `next_run_at` based on the schedule

---

## Part 4: The "While You Were Sleeping" System

### Concept

This is the flagship proactive feature. The assistant "wakes up" at 3 AM EST every day, runs the Four-Lens Reasoning Protocol against each user's data, executes the most valuable prompts through the team agent, and packages the results as a morning briefing.

### How It Works

#### Step 1: The Overnight Scheduler (3 AM EST Daily)

A new edge function `process-overnight-assistant` is triggered by pg_cron at `0 8 * * *` (8 AM UTC = 3 AM EST):

```
For each active user with proactive_enabled = true:
  1. Load Strategic Identity from user_strategic_identity
  2. Load user priorities, team priorities, engagement streaks
  3. Load recent document changes (last 24 hours)
  4. Load user's scheduled tasks and their history
  5. Load proactive_level (low/medium/high)
  6. Load feedback history (last 20 helpful/dismissed insights)
  7. Run the Four-Lens Reasoning Protocol (Part 2)
  8. For each insight with a prompt_to_run:
     a. Call the team agent with full context (documents, priorities, etc.)
     b. Capture the response
     c. Store as an assistant_proactive_insight
  9. Triage by urgency score:
     a. Urgency 9-10: Send immediately via all channels
     b. Urgency 7-8: Send as separate high-priority notification
     c. Urgency 1-6: Package into the overnight summary
  10. Insert overnight summary into agent_conversations as agent message
  11. Queue notifications via proactive_notification_queue
  12. Update user_strategic_identity based on what was found
```

#### Step 2: The "Draft & Notify" Pattern

Rather than just telling users about insights, the assistant pre-generates work products whenever possible. This is the single biggest differentiator from a simple notification system:

| Insight Type | What the Assistant Pre-Generates |
|---|---|
| Goal progress stall | A bullet-point list of the 3 specific blockers with suggested next steps |
| Meeting action items | A categorized action item list extracted from transcript data |
| Pipeline deviation | A summary table of stalled deals with days-since-last-activity |
| Weekly research | A formatted briefing document with key findings and source links |
| Competitive intel | A comparison matrix of relevant competitor changes |
| Financial anomaly | A variance analysis against the previous period |

The notification says: *"I noticed [X] and prepared [Y] for you. View it here."* -- not just "Something happened."

#### Step 3: Morning Delivery

When the user opens the app, they see a message in their assistant chat:

```
Good morning, Sarah! Here are some things I worked on overnight:

1. [DEVIATION] Pipeline Slowdown: Your deal close rate dropped 18% this week
   compared to the 4-week average. I've identified the 5 deals that stalled
   and prepared a summary with suggested follow-ups.

2. [GOAL ALIGNMENT] Q1 Launch On Track: 3 new product documents were synced
   yesterday. Based on the latest timeline, you're at 72% completion with
   23 days remaining. One dependency flagged: the design review hasn't been
   scheduled yet.

3. [AUTOMATION] Your Monday Pipeline Summary: You usually run this manually
   on Monday mornings. I've pre-generated it for this week -- 12 active deals,
   $340K total pipeline, 3 expected to close this week.

4. [PREDICTIVE] Capacity Warning: At the current meeting pace, your calendar
   will hit 90% utilization by Thursday. Consider rescheduling the 2 internal
   syncs to create focus time for the launch deliverables.

Was this helpful? [thumbs up] [thumbs down]
```

#### Step 4: Proactive Level Controls

The existing `proactive_level` field (low/medium/high) controls both volume and depth:

- **Low**: 1-2 insights per overnight run, only urgency >= 5, only deviation detection and goal alignment lenses
- **Medium**: 3-4 insights, urgency >= 3, all four lenses active
- **High**: 4-6 insights, includes speculative and exploratory findings, predictive risk analysis with longer time horizons, automation opportunities

---

## Part 5: The "Environment Scan" Heartbeat (Beyond Overnight)

### Concept: Continuous Monitoring, Not Just Daily

The overnight run is the primary scan, but a lighter-weight "heartbeat" check can run more frequently to catch time-sensitive changes. This is the OpenClaw "heartbeat loop" adapted for our architecture.

### Implementation: The Micro-Scan

A lighter edge function `process-environment-scan` runs every 2 hours during business hours (8 AM - 8 PM in user's timezone):

```
For each user with proactive_level = 'high':
  1. Check: Have new documents been synced since last scan?
  2. Check: Are there any scheduled tasks with results pending delivery?
  3. Check: Has the user been mentioned in team chat?
  4. Check: Did any user_engagement_streaks indicate a returning user after absence?

  If any check fires:
    Run a QUICK single-lens analysis (deviation detection only)
    If urgency >= 7: Send immediate notification
    If urgency < 7: Queue for next overnight summary
```

This gives "high" proactive level users near-real-time awareness without overwhelming the system. "Medium" users get overnight-only scans. "Low" users get overnight scans with only the highest-confidence findings.

### pg_cron Schedule

```sql
-- Environment scan: every 2 hours during business hours (12-00 UTC = 8 AM - 8 PM EST)
SELECT cron.schedule(
  'process-environment-scan',
  '0 12,14,16,18,20,22,0 * * *',
  $$SELECT ... process-environment-scan ...$$
);
```

---

## Part 6: Feedback Learning Loop

### How the Assistant Learns What's Helpful

#### In-Conversation Feedback

After delivering proactive insights, the assistant includes feedback prompts:

```
Was this helpful? [thumbs up] [thumbs down]
```

Or more contextually:

```
"Would you like me to do more analysis like this, or should I focus on
different areas? You can tell me anytime to adjust."
```

The feedback is captured via:
- **Quick reactions**: Thumbs up/down stored in `assistant_proactive_insights.was_helpful`
- **Star ratings**: Optional 1-5 rating stored in `user_rating`
- **Text feedback**: "I'd prefer more financial analysis" stored in `user_feedback`
- **Implicit feedback**: Dismissing without reading = `was_dismissed = true`
- **Engagement signals**: Time-to-read (measured via `delivered_at` vs. first interaction), whether the user asked follow-up questions

#### Periodic Feedback Check-ins

Every 2 weeks, the assistant proactively asks:

```
"Hey Sarah, I've been sending you overnight insights for 2 weeks now.
Quick check-in: What's been most useful so far? Is there anything you
wish I'd focus on more? Or anything that hasn't been helpful?"
```

This response is stored and fed back into the meta-prompt AND used to update the Strategic Identity.

#### Automatic Preference Learning

Beyond explicit feedback, the system tracks implicit signals:
- If a user consistently dismisses "team health" insights, reduce their frequency automatically
- If a user always opens "financial analysis" insights within 5 minutes, increase their priority
- If a user's helpful ratio drops below 30% over 2 weeks, auto-reduce proactive_level by one step and notify: "I noticed my recent insights haven't been as helpful. I've dialed back the frequency. Let me know what would be more useful."

#### Database Schema: `assistant_proactive_insights`

```sql
CREATE TABLE assistant_proactive_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),

  -- Insight content
  insight_type text NOT NULL CHECK (insight_type IN (
    'deviation', 'goal_alignment', 'automation', 'predictive_risk',
    'priority_progress', 'data_discovery', 'goal_update',
    'team_health', 'recommendation', 'research_finding',
    'overnight_summary', 'weekly_digest'
  )),
  title text NOT NULL,
  summary text NOT NULL,
  detailed_content text,
  related_priorities text[],   -- Which user priorities this relates to
  action_suggestions jsonb,    -- Suggested next steps
  proactive_proposal text,     -- The specific action the assistant recommends or took
  work_product_id text,        -- Reference to a pre-generated report/analysis if applicable

  -- Reasoning metadata
  reasoning_lens text,         -- Which of the four lenses generated this
  urgency_score integer,       -- 1-10 urgency classification
  confidence_score float,      -- 0-1 AI confidence in this insight

  -- Source tracking
  source_prompt text,
  source_documents text[],

  -- Delivery
  delivered boolean DEFAULT false,
  delivered_at timestamptz,
  delivered_via text[],
  first_viewed_at timestamptz, -- When user first saw it (implicit engagement signal)

  -- User feedback
  user_rating integer,         -- 1-5 stars
  user_feedback text,
  was_helpful boolean,
  was_dismissed boolean DEFAULT false,
  follow_up_asked boolean DEFAULT false,  -- Did user ask a follow-up question?

  created_at timestamptz DEFAULT now()
);
```

#### Database Schema: `assistant_feedback_sessions`

```sql
CREATE TABLE assistant_feedback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  session_type text CHECK (session_type IN (
    'quick_rating', 'detailed_feedback', 'periodic_checkin',
    'preference_update', 'identity_evolution'
  )),
  feedback_content text,
  preferences_updated jsonb,
  insights_referenced uuid[],
  identity_update_applied boolean DEFAULT false,  -- Was this fed into Strategic Identity update?
  created_at timestamptz DEFAULT now()
);
```

The overnight meta-prompt includes the last 10 feedback entries to continuously improve, AND triggers a Strategic Identity update after every feedback session.

---

## Part 7: Human-in-the-Loop for External Actions

### Concept: "Propose Before Execute"

As the assistant becomes more autonomous, it needs guardrails. For any action that has external consequences (sending an email, updating a document, triggering a workflow), the assistant should propose the action and wait for approval.

### Implementation

Proactive insights include an `action_suggestions` field. When an action requires approval:

```json
{
  "action_suggestions": [
    {
      "type": "send_followup_emails",
      "description": "I've drafted 5 follow-up emails for stalled pipeline deals",
      "requires_approval": true,
      "urgency": 7,
      "preview_available": true
    }
  ]
}
```

The assistant message includes an approval prompt:

```
I've drafted 5 follow-up emails for the stalled deals. Want me to send them,
or would you like to review them first?
[Review Drafts] [Approve & Send] [Dismiss]
```

Rules:
- **Read-only actions** (analyzing documents, generating summaries): No approval needed
- **Internal actions** (scheduling a report, creating a reminder): No approval needed
- **External actions** (sending emails, updating CRM, posting to channels): Always require approval
- **Urgency 9-10**: Can bypass approval if the user has explicitly enabled "auto-execute critical actions" in preferences

---

## Part 8: Can the Assistant Send Messages at Scheduled/Random Times?

### Yes -- Here's How

The `agent_conversations` table has realtime subscriptions (`useAgentConversation` hook). Any row inserted with `role: 'agent'` immediately appears in the user's assistant chat panel via the Supabase Realtime subscription.

This means an edge function can inject messages into a user's assistant chat at any time by:

```sql
INSERT INTO agent_conversations (user_id, team_id, role, message, metadata)
VALUES (
  'user-uuid',
  'team-uuid',
  'agent',
  'Good morning! Here are some things I worked on overnight...',
  '{"source": "overnight_assistant", "insight_ids": ["..."], "action": {"type": "none"}}'
);
```

When the user opens the app, the realtime subscription catches up and displays the message. If the user is already in the app, it appears immediately.

Combined with the `astra_notifications` table and browser push notifications (already implemented in `useAppNotifications`), the system can:
1. Insert the message into `agent_conversations` (appears in assistant chat)
2. Insert a notification into `astra_notifications` (appears in notification bell, triggers browser push)
3. Queue external notifications via `proactive_notification_queue` (email, SMS, WhatsApp, Telegram)

### Timing Options

- **Scheduled**: Edge function triggered by pg_cron at specific times
- **Event-driven**: Triggered by database events (new documents synced, report generated, etc.)
- **Semi-random**: A scheduled job that adds a random delay (0-60 minutes) before execution, creating natural-feeling timing rather than exact-clock delivery
- **Urgency-driven**: High-urgency insights bypass scheduling and deliver immediately

---

## Part 9: Implementation Architecture

### New Database Tables

1. **`user_strategic_identity`** -- The evolving "SOUL" profile for each user
2. **`user_scheduled_tasks`** -- User-created scheduled tasks, reminders, and research projects
3. **`assistant_proactive_insights`** -- Log of all generated insights with feedback tracking
4. **`assistant_feedback_sessions`** -- Explicit feedback conversations and check-ins

### New Edge Functions

1. **`process-overnight-assistant`** -- The main 3 AM job that runs the Four-Lens Reasoning Protocol
   - Triggered by pg_cron daily at 8 AM UTC (3 AM EST)
   - For each eligible user: loads Strategic Identity, context, runs reasoning, executes prompts, packages results
   - Triages by urgency score for delivery routing
   - Updates Strategic Identity based on findings

2. **`process-environment-scan`** -- Lighter "heartbeat" check every 2 hours for high-proactive users
   - Quick deviation detection only
   - Catches time-sensitive changes between overnight runs

3. **`process-scheduled-tasks`** -- Runs every 15 minutes to check for due user-scheduled tasks
   - Queries `user_scheduled_tasks` for due items
   - Executes prompts via team agent with Strategic Identity context
   - Delivers results via configured channels
   - Updates schedule for recurring tasks

4. **`create-scheduled-task`** -- Called by the frontend when the assistant schedules something
   - Validates schedule parameters
   - Calculates `next_run_at`
   - Persists to `user_scheduled_tasks`

5. **`update-strategic-identity`** -- Called after feedback events and periodic check-ins
   - Loads current identity + new signals
   - Asks Gemini to evolve the identity text
   - Updates structured preference fields based on behavioral patterns
   - Persists new version

6. **`collect-insight-feedback`** -- Called when user rates or provides feedback on insights
   - Updates `assistant_proactive_insights` with feedback
   - Creates `assistant_feedback_sessions` record
   - Triggers `update-strategic-identity`
   - Auto-adjusts proactive_level if helpful ratio drops

### New pg_cron Jobs

```sql
-- Overnight assistant: 3 AM EST daily
SELECT cron.schedule(
  'process-overnight-assistant',
  '0 8 * * *',
  $$SELECT ... process-overnight-assistant ...$$
);

-- Scheduled tasks: every 15 minutes
SELECT cron.schedule(
  'process-scheduled-tasks',
  '*/15 * * * *',
  $$SELECT ... process-scheduled-tasks ...$$
);

-- Environment scan: every 2 hours during business hours (high proactive users only)
SELECT cron.schedule(
  'process-environment-scan',
  '0 12,14,16,18,20,22,0 * * *',
  $$SELECT ... process-environment-scan ...$$
);
```

### New Agent Action Types

Add to the existing `AgentAction` type in `useAgentConversation.ts`:

```typescript
type: 'navigate' | 'open_modal' | 'highlight' | 'run_report' | 'trigger_sync'
    | 'send_to_agent' | 'schedule_task' | 'rate_insight' | 'approve_action' | 'none';
```

- `schedule_task`: Triggers the `create-scheduled-task` edge function with parsed schedule params
- `rate_insight`: Captures feedback on a proactive insight
- `approve_action`: Approves a proposed external action from a proactive insight

---

## Part 10: Data Flow Summary

```
3 AM EST Daily (Overnight Assistant):
  pg_cron -> process-overnight-assistant
    -> Load Strategic Identity + priorities + engagement data
    -> Load recent document changes + sync stats
    -> Load feedback history (helpful/dismissed patterns)
    -> Run Four-Lens Reasoning Protocol via Gemini
    -> For each insight with prompt_to_run:
       -> Call team-agent-chat with full document context
       -> Pre-generate work products (the "Draft & Notify" pattern)
       -> Store in assistant_proactive_insights
    -> Triage by urgency score:
       -> 9-10: Send immediately on all channels
       -> 7-8: Send as high-priority notification
       -> 1-6: Package into overnight summary
    -> INSERT summary into agent_conversations (role: 'agent')
    -> INSERT into astra_notifications (bell + push)
    -> Queue to proactive_notification_queue (email, SMS, etc.)
    -> Update Strategic Identity with new observations

User opens app:
  -> Realtime subscription fires on agent_conversations
  -> Overnight message appears in assistant chat
  -> Notification badge shows on bell icon
  -> User reads, reacts, provides feedback
  -> Feedback triggers:
     -> Update assistant_proactive_insights
     -> Create assistant_feedback_sessions record
     -> Trigger update-strategic-identity
  -> Next overnight run uses evolved identity + feedback

Every 15 minutes (Scheduled Tasks):
  pg_cron -> process-scheduled-tasks
    -> Check user_scheduled_tasks for due items
    -> Execute each task via team agent (with Strategic Identity context)
    -> Deliver results to user
    -> Update next_run_at

Every 2 hours (Environment Scan, high proactive users only):
  pg_cron -> process-environment-scan
    -> Quick deviation check: new docs? mentions? returning users?
    -> If urgency >= 7: Immediate notification
    -> If urgency < 7: Queue for overnight summary
```

---

## Part 11: Priority Implementation Order

### Phase 1: Overnight Assistant + Strategic Identity (Highest Impact)
- Create `user_strategic_identity`, `assistant_proactive_insights`, `assistant_feedback_sessions` tables
- Build `process-overnight-assistant` edge function with Four-Lens Reasoning
- Build `update-strategic-identity` edge function
- Add feedback UI (thumbs up/down + optional text) to assistant chat messages
- Set up 3 AM EST cron job
- Wire up `agent_conversations` insertion for overnight results
- Initialize Strategic Identity from existing `user_priorities` + `user_assistant_preferences`

### Phase 2: User-Scheduled Tasks
- Create `user_scheduled_tasks` table
- Build `process-scheduled-tasks` and `create-scheduled-task` edge functions
- Add `schedule_task` action type to assistant
- Update team-agent-chat system prompt with scheduling awareness
- Build task management UI (list, pause, delete scheduled tasks)

### Phase 3: Feedback Learning Loop + Identity Evolution
- Implement periodic feedback check-ins (every 2 weeks)
- Feed feedback history into overnight meta-prompt
- Auto-evolve Strategic Identity after every feedback event
- Track insight effectiveness metrics (helpful ratio, dismissal rate, time-to-read)
- Auto-adjust proactive level based on engagement patterns

### Phase 4: Environment Scan Heartbeat
- Build `process-environment-scan` edge function (lighter than overnight)
- Set up 2-hour cron during business hours
- Enable for high-proactive users only
- Urgency-based immediate notifications

### Phase 5: Human-in-the-Loop + Advanced Actions
- Implement `approve_action` agent action type
- Build approval UI for proposed external actions
- Connect to external integrations (per AGENT_CONNECTION_PLAN.md) for actual execution
- Natural language schedule parsing improvements
- Cross-user coordination ("remind the whole team about the deadline")

---

## Key Design Principles

1. **Not hardcoded**: The Four-Lens Reasoning Protocol dynamically generates insights based on current data and priorities. No fixed prompt lists.
2. **Evolving intelligence**: The Strategic Identity system means the assistant gets meaningfully smarter about each user over time -- remembering their preferences, obsessions, and communication style.
3. **Draft & Notify, not just alert**: The assistant pre-generates work products (summaries, analyses, action item lists) so users receive finished outputs, not just notifications that something happened.
4. **Urgency-aware delivery**: Not everything is treated equally. Critical deviations bypass quiet hours; low-urgency findings wait for the overnight summary.
5. **Human-in-the-loop for external actions**: The assistant proposes before it executes anything with external consequences.
6. **User-controlled**: Proactive level, quiet hours, notification types, and individual task management all under user control. The system respects boundaries.
7. **Feedback-driven**: Every proactive interaction has a feedback mechanism. Both explicit (ratings, text) and implicit (engagement timing, dismissals) signals feed back into the Strategic Identity.
8. **Transparent reasoning**: Each insight is labeled with its reasoning lens and explains WHY it was surfaced ("This relates to your Q1 revenue priority" or "This is a deviation from your typical pattern").
9. **Builds on existing infrastructure**: Uses the existing `proactive_notification_queue`, `user_assistant_preferences`, `agent_conversations` realtime, and `team-agent-chat` edge function rather than creating parallel systems.

---

**Document Version:** 2.0
**Last Updated:** 2026-02-06
**Status:** Proposed for Implementation
**Research Sources:** OpenClaw agentic architecture patterns, Strategic Reasoning Loop methodology
