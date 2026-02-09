# Assistant Onboarding Plan

This document is the source of truth for the step-by-step onboarding flow that the AI assistant takes a user through before entering live mode.

---

## Step 1: Name Selection

**Phase**: `awaiting_name`

**Trigger**: User opens assistant chat for the first time (no `assistant_name` set in their preferences). This is the same for ALL users -- admin and non-admin alike.

**Assistant Delivers**:
- Greeting message: "Hi there! I'm your team's AI assistant, here to help you get the most out of AI Rocket. Before we dive in, what would you like to call me? Pick any name you'd like!"

**User Action**: Types a name (e.g., "Ellee").

**Assistant Response**:
- Confirms the name enthusiastically
- Saves the name to `user_assistant_preferences.assistant_name`
- Transitions to priorities by asking: "Now I'd love to understand your team's biggest needs so I can be more helpful. What are the biggest AI needs or wishes you hope to accomplish for your team?"

**Data Stored**:
- `user_assistant_preferences.assistant_name` (personal to each user)
- If admin: also saves to `team_agent_settings.agent_name` as the team default
- Phase metadata in conversation message -> `priorities`

---

## Step 2: Priorities Discovery

**Phase**: `priorities`

**Trigger**: Name has been set, phase transitions to `priorities`.

**Assistant Delivers**:
- A conversational loop that collects 3-5 team AI priorities
- Each round shows priorities collected so far as bullet points
- Asks "What else would you like AI to help with?" after each entry

**User Action**: Describes priorities one by one. Signals completion with phrases like "that's all", "let's move on", "done", etc.

**Assistant Response**:
- Summarizes all collected priorities
- Transitions to preferences by asking about communication style, response length, engagement style, and proactive channels

**Data Stored**:
- `user_assistant_preferences.user_priorities` (JSONB array of priority strings)
- `user_assistant_preferences.onboarding_phase` -> `preferences`

---

## Step 3: Preferences Collection

**Phase**: `preferences`

This phase has 4 sub-phases, each collecting a different preference category. The edge function checks which categories have already been collected and asks for the next missing one.

### Sub-phase 3a: Personality / Communication Style

**Assistant Delivers**:
- Asks the user to describe how they'd like the assistant to communicate
- Offers examples: playful, professional, brief, detailed, encouraging, direct, etc.

**User Action**: Describes preferred communication traits.

**Data Stored**:
- `user_assistant_preferences.personality_traits` (JSONB array of trait strings)

### Sub-phase 3b: Proactive Level

**Assistant Delivers**:
- Asks how proactive the assistant should be
- Offers three options: **High** (reach out frequently with tips and insights), **Medium** (occasional helpful nudges), **Low** (only respond when asked)

**User Action**: Selects a level.

**Data Stored**:
- `user_assistant_preferences.proactive_level` (text: "high", "medium", or "low")

### Sub-phase 3c: Notification Types

**Assistant Delivers**:
- Asks which types of messages the user wants to receive
- Lists options: daily summaries, report notifications, goal milestones, meeting reminders, action item alerts, weekly recaps, insight alerts
- Offers shortcuts: "all" or "none"

**User Action**: Selects one or more notification types.

**Data Stored**:
- `user_assistant_preferences.notification_types` (JSONB array of type strings)

### Sub-phase 3d: Delivery Channels

**Assistant Delivers**:
- Asks how the user wants messages delivered
- Lists options: Email, SMS/Text, WhatsApp, In-app only

**User Action**: Selects one or more channels.

**Data Stored**:
- `user_assistant_preferences.delivery_channels` (JSONB array of channel strings)

### Preferences Completion

**Assistant Response**:
- Gives a summary of all preferences collected
- Reminds the user they can update preferences anytime from settings
- Transitions to education phase

**Phase Transition**: `preferences` -> `education`

---

## Step 4: Education

**Phase**: `education`

**Trigger**: All 4 preference categories have been collected.

**Assistant Delivers**:
- Message: "Great setup, [assistant name] is ready! Before we go any further, let me walk you through the key tools available to you and your team."
- Presents 3 clickable buttons:

### Button 1: "What can I do for you and how do I work?"
Shows a capabilities breakdown including:
- Data search across all connected documents
- Automated and manual reports
- Visual data presentations (Astra Create)
- Team collaboration features
- Smart features (follow-ups, context awareness)

### Button 2: "How do I keep your data safe and private?"
Shows security information including:
- Data isolation (each team's data is separate)
- Encryption standards
- Access control and permissions
- AI privacy (data not used for training)

### Button 3: "Skip this and get started!"
Skips education entirely and proceeds to sync check.

**User Action**: Can explore one or both info topics, then clicks to proceed. Or skips directly.

**Phase Transition**: `education` -> `sync_check`

---

## Step 5: Sync Check

**Phase**: `sync_check`

**Trigger**: Education phase completed or skipped.

**Assistant Delivers**:
- Queries the database for the team's actual document count

### If Documents Exist (count > 0):
- Shows a message explaining what synced documents enable:
  - Search across all connected files
  - Generate reports from real data
  - Trend analysis and insights
  - Answer questions about team content
- Mentions they can add more documents from the Fuel page
- Automatically transitions to live mode

### If No Documents Exist (count = 0):
- Explains the value of syncing documents
- Presents two buttons:
  - **"Sync My Documents"** - Navigates user to the Fuel page to connect their drive
  - **"Skip for now"** - Proceeds to live mode without documents

**Phase Transition**: `sync_check` -> `live`

---

## Step 6: Live Mode

**Phase**: `live`

**Trigger**: Sync check completed or skipped.

**Assistant Delivers**:
- Confirmation message: "You're all set, [user name]! [Assistant name] is ready to help."
- 3 smart task recommendations based on the user's collected priorities
- Two quick-action buttons:
  - **"Help me with daily tasks"**
  - **"Help me explore AI Rocket features"**

**Behavior**:
- Full conversational mode is now active
- Assistant uses collected preferences (personality traits, proactive level) to shape responses
- User can ask anything, generate reports, create visualizations, etc.

---

## Data Storage

Onboarding state is distributed across multiple tables and in-memory state:

### 1. `agent_conversations` table
Stores the conversation history. Each message includes metadata with:
- `onboardingPhase` - current phase when message was sent
- `prioritiesCollected` - array of priorities gathered so far
- `preferencesCollected` - array of preferences gathered so far
- `questionCount` - number of questions asked in current phase
- `suggestions` - clickable button data for education step
- `syncActions` / `liveChoices` - flags for rendering action buttons

### 2. `user_assistant_preferences` table
Stores the user's personal assistant preferences:
| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | uuid | Primary key, references auth.users |
| `assistant_name` | text | User's personal name for the assistant (null = use team default) |
| `member_onboarding_completed` | boolean | Whether non-admin user finished onboarding |
| `proactive_enabled` | boolean | Whether proactive messages are enabled |
| `proactive_level` | text | high, medium, or low |
| `notification_types` | jsonb | Object with boolean flags for each notification type |
| `email_enabled` / `sms_enabled` / `whatsapp_enabled` / `telegram_enabled` | boolean | Delivery channel toggles |

### 3. `team_agent_settings` table
Stores team-level agent configuration:
| Column | Type | Purpose |
|--------|------|---------|
| `team_id` | uuid | Primary key |
| `agent_name` | text | Team-wide agent name (set by admin in Step 1) |
| `agent_personality` | jsonb | Personality traits and proactivity level |
| `onboarding_completed` | boolean | Whether admin onboarding is complete |

### 4. `team_priorities` table
Stores priorities collected in Step 2:
| Column | Type | Purpose |
|--------|------|---------|
| `team_id` | uuid | Foreign key to teams |
| `priority_type` | text | Category (e.g., 'ai_goals') |
| `priority_value` | text | The priority text |

### 5. `user_priorities` table
Stores individual user priorities (for non-admin members).

### 6. Frontend in-memory state (`onboardingData`)
Tracks the current phase and collected data during the session:
- `phase` - current onboarding phase
- `prioritiesCollected` - array of priority strings
- `preferencesCollected` - array of preference strings
- `questionCount` - questions asked in current phase
- `educationViewed` - which education topics user has viewed
- `tutorialOffset` - pagination for tutorial items
- `allImpactItems` - full list of impact/feature items

## Key Components

### Edge Function
The onboarding conversation (Steps 2-3) is powered by: `team-agent-chat` edge function.

### Frontend Files
- `src/components/agent-mode/AgentChatPanel.tsx` - Main chat UI and onboarding flow controller
- `src/hooks/useUserAssistantPreferences.ts` - User preferences CRUD
- `src/hooks/useTeamAgent.ts` - Team-level agent settings
- `src/hooks/useAgentConversation.ts` - Conversation message persistence

---

## Notes

- The frontend has a fallback mechanism that detects when all preference sub-phases are collected and forces the education transition, even if the edge function doesn't explicitly return `nextPhase`.
- Each phase transition is persisted to the database (via conversation message metadata) so the user can resume where they left off if they close the app. On reload, the last message's `onboardingPhase` metadata determines where to resume.
- ALL users (admin and non-admin) go through the same unified onboarding flow. Every user names their own assistant.
- Each user's chosen name is saved to `user_assistant_preferences.assistant_name` (personal). If the user is an admin, the name is also saved to `team_agent_settings.agent_name` as the team default.
- The `effectiveAgentName` priority is: personal name > team name > "Astra" fallback.
- A user is considered "returning" (skips onboarding) if `assistantPrefs.assistant_name` is set.
