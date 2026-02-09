import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AgentContext {
  agentName: string;
  teamName: string;
  teamMission?: string;
  teamValues?: string[];
  teamGoals?: string[];
  teamPriorities?: {
    ai_goals?: string[];
    improvement_areas?: string[];
    recurring_tasks?: string[];
  };
  userPriorities?: {
    personal_goals?: string[];
    focus_areas?: string[];
    recurring_tasks?: string[];
  };
  learnedFacts?: string[];
  onboardingCompleted: boolean;
  isAdmin?: boolean;
  currentOnboardingStep?: string;
  upcomingCalendarEvents?: Array<{ summary: string; startTime: string; endTime: string; location?: string; meetLink?: string }>;
  connectedIntegrations?: Array<{ provider_name: string; provider_slug: string; category: string; status: string; capabilities: string[]; account_email?: string; times_used: number }>;
  availableIntegrations?: Array<{ provider_name: string; provider_slug: string; category: string; capabilities: string[] }>;
  mcpTools?: Array<{ name: string; description: string; category: string; read_only: boolean; used: number; server: string }>;
  customApis?: Array<{ name: string; description: string; category: string }>;
}

interface AppContext {
  activeTab: string;
  activeTabLabel: string;
  dataSyncStatus: string;
  connectedSources: string[];
  documentCount: number;
}

interface ConversationMessage {
  role: 'user' | 'agent';
  message: string;
}

interface OnboardingState {
  phase: 'priorities' | 'preferences' | 'education' | 'complete' | 'general';
  prioritiesCollected: string[];
  preferencesCollected: string[];
  questionCount: number;
  educationViewed?: string[];
}

interface ImpactItem {
  feature_key: string;
  feature_name: string;
  feature_description: string;
  priority_rank: number;
  action_type: string | null;
  action_target: string | null;
  is_completed: boolean;
  custom_priority: number | null;
}

const AGENT_SELF_KNOWLEDGE = `
WHO I AM - TEAM AI ASSISTANT:
I am your team's dedicated **Team AI Assistant** (the chat you're using right now on the left side of the screen). I'm designed to help your team succeed with AI Rocket. Here's what makes me special:

- **Intelligent & Adaptive**: I learn your team's preferences and communication style from our conversations
- **Connected to Your Data**: I have secure access to your team's synced documents, meeting notes, and files to provide contextual help
- **Memory & Learning**: I remember our conversations and your team's priorities to give increasingly personalized assistance
- **Powered by Multiple AI Models**: My intelligence comes from Gemini, Claude, and OpenAI models working together for the best results
- **Your Personal Guide**: I help you navigate features, answer questions, and recommend actions

HOW I WORK WITH THE TEAM AGENT:
There are two AI systems working together for you:

1. **Team AI Assistant (Me)**: This conversational chat on the left side of your screen. I'm here to:
   - Answer questions and provide guidance
   - Help you understand features and capabilities
   - Navigate you to different parts of the platform
   - Recommend high-impact actions based on your priorities
   - Send complex data queries and prompts to the Team Agent

2. **Team Agent** (in the Agent Chat on the main window): A powerful suite of n8n webhook workflows that can:
   - Search and analyze your team's documents in depth
   - Search the web for current information
   - Generate comprehensive reports and insights
   - Create dashboards, visualizations, and presentations
   - Cross-analyze data from multiple categories (strategy, meetings, financial, projects)
   - Analyze your team's mission, core values, and goals
   - Perform deep research on topics

**How They Work Together**: When you need deep analysis or data queries, I'll send the request to the Team Agent in the Agent Chat (main window) where you can see the full response and interact with your data.

- Team admins can customize my personality and communication style
- I proactively suggest actions based on your team's priorities and goals
`;

const AGENT_SECURITY_CONTEXT = `
DATA SECURITY & PRIVACY:
Your data security is our highest priority. Here's how we protect you:

**Enterprise-Grade Security:**
- All document connections and stored data are fully encrypted using industry-leading encryption standards
- We maintain SOC2 Type II Security Compliance, meeting the highest security standards
- Row Level Security (RLS) policies ensure complete data isolation between teams and users

**Privacy Controls:**
- Team admins can set granular access controls to ensure team members only see data they're approved to view
- Document access is strictly controlled - no cross-team data exposure is possible

**Your Data, Your Control:**
- Export your documents, data, and conversation history at any time
- Delete your data completely whenever you choose - we honor deletion requests immediately
- Your data belongs to you, not us

**AI Model Privacy:**
- We never share your team's data with outside companies
- The AI models we use to help you (Gemini, Claude, OpenAI) do not retain or train on your data
- Your conversations and documents remain private and confidential

**Compliance:**
- GDPR compliant data handling
- Regular security audits and penetration testing
- Encrypted data at rest and in transit
`;

const DEFAULT_PLATFORM_CAPABILITIES = `
AI ROCKET PLATFORM - COMPLETE FEATURE GUIDE:

=== CORE FEATURES (ACTIVE) ===

1. AI DATA SYNC & CONNECTED FOLDERS (Foundation - Start Here!)
   - Connect Google Drive to sync unlimited documents
   - Connect Microsoft OneDrive/SharePoint for enterprise teams
   - Upload local files directly (drag-and-drop)
   - Supported: Google Docs/Sheets/Slides, Word, Excel, PowerPoint, PDFs, text files
   - Real-time sync progress with Fuel Level indicator
   - Connect up to 20 folders from any combination of providers
   - Multi-provider support - use Google, Microsoft, or both simultaneously
   Impact: This powers ALL other AI features - sync data first!

2. AI REPORTS (Automated Insights)
   - Generate comprehensive reports from synced data with one click
   - Templates: Weekly Summary, Meeting Insights, Goal Progress, Custom
   - Schedule automated reports: daily, weekly, or monthly delivery
   - Reports analyze patterns, extract takeaways, highlight action items
   - Beautiful email summaries delivered to your inbox
   Impact: Stay informed without manual work

3. TEAM DASHBOARD (Daily Health Check)
   - AI-generated daily snapshot updated at midnight EST
   - Goals & Targets Panel: Track projects, OKRs, milestones, KPIs
   - Mission Alignment Panel: See how work aligns with company mission
   - Team Health Panel: Overall score with engagement, meeting cadence, risk indicators
   - AI recommendations based on current state
   - Export to PDF, custom instructions for metrics focus
   Impact: Daily visibility into team health and progress

4. TEAM CHAT (Collaborative AI)
   - Real-time group chat with team members AND AI
   - @mention teammates for attention, @mention AI for instant insights
   - Share insights, discuss reports, collaborate seamlessly
   - AI participates to answer questions about your data
   Impact: Team collaboration enhanced by AI

5. CREATIVE SUITE (Images & Presentations)
   - Generate AI-powered images and presentations from your data
   - 15+ content types: Team Snapshot, Mission, Goals, Reviews, Marketing, Analysis
   - Visualization types: Single Image or Multi-Slide Presentation
   - Styles: Modern Gradient, Tech, Bold, Minimalist, Corporate, Creative
   - Layouts: Landscape (16:9), Portrait (9:16), Square (1:1)
   - Save to gallery, export to PDF
   Impact: Create stunning visuals in seconds

6. SMART VISUALIZATIONS
   - Turn conversations into charts, graphs, visual reports
   - Save and organize visualizations for reference
   - Export for presentations and sharing
   Impact: Data storytelling made easy

7. MISSION CONTROL (Progress Tracking)
   - Track Launch Points and team achievements
   - Three stages: Fuel (data), Boosters (features), Guidance (team)
   - Activity feed showing accomplishments
   - Moonshot Challenge leaderboard
   Impact: Gamified progress keeps teams engaged

8. PRIVATE AI ASSISTANT
   - Confidential conversations with AI that understands your business
   - Search across ALL synced documents with natural language
   - No more digging through folders - just ask!
   Impact: Instant access to your business knowledge

9. CATEGORY DATA ACCESS (Admin Feature)
   - Control which data categories team members can access
   - Per-user permissions for Strategy, Meetings, Financial, Projects
   - Astra automatically filters responses based on permissions
   - Invite codes can include pre-configured access
   Impact: Enhanced data security and compliance

10. LAUNCH POINTS SYSTEM
    - Part of $5M AI Moonshot Challenge scoring
    - Earn points through: Launch Prep, Activity, Milestones
    - Categories: Run (operations), Build (create), Grow (scale)
    Impact: Measure and reward AI adoption

11. CONNECTED APPS (Business Tool Integrations)
    - Connect Google Calendar and Outlook Calendar for schedule awareness
    - View all connected and available integrations in one place
    - Coming soon: QuickBooks, Slack, HubSpot, Salesforce, Notion, and 15+ more
    - AI uses connected tools to provide richer, context-aware responses
    - Navigate to Connected Apps to manage integrations
    Impact: AI that understands your full business context

=== COMING SOON FEATURES ===

11. AGENT BUILDER
    - Design custom AI Agents for autonomous task completion
    - Create workflow automations tailored to your business
    - Unlocks at Boosters Level 5
    Status: In Development

12. AI SPECIALISTS
    - Create specialized AI team members (Business Coach, Finance Director, Marketing Manager)
    - Handle specific business functions 24/7
    - Role-based AI assistance
    Status: Coming Soon

13. TEAM SOPs (Standard Operating Procedures)
    - Create guidance documents and playbooks
    - Keep team aligned with consistent processes
    - AI-assisted procedure creation
    Status: Coming Soon

14. RESEARCH PROJECTS
    - Deep AI research investigations on critical topics
    - Multi-source analysis across web and internal data
    - Detailed reports with citations
    - Market research, competitive analysis, technology trends
    Status: Coming Soon

15. EMAIL CONTROL
    - Connect Gmail and Outlook accounts securely
    - AI-drafted email responses with your tone and style
    - Smart email summarization for long threads
    - Priority inbox powered by AI
    - Automated email workflows and templates
    Status: Coming Soon
`;

const NAVIGATION_TARGETS = {
  'mission-control': 'Mission Control - Track progress, achievements, and Launch Points',
  'reports': 'AI Reports - Schedule automated reports delivered to inbox',
  'team': 'Team Chat - Collaborate with team and AI together',
  'visualizations': 'Visualizations - View saved charts and graphs',
  'team-dashboard': 'Team Dashboard - AI-powered daily insights on metrics and goals',
  'creative-suite': 'Creative Suite - Generate AI images and presentations',
  'agent-chat': 'Agent Chat - Powerful AI queries, document search, and cross-category analysis',
  'connect': 'Connect - Manage all integrations, view active connections, browse apps, and configure MCP tools',
  'connected-apps': 'Connect - (Apps tab) Connect business tools like calendars, CRM, accounting, and more',
  'mcp-tools': 'Connect - (MCP Tools tab) Manage MCP servers, discover AI tools, and connect custom APIs via the API Wizard',
  'assistant-skills': 'Assistant Skills - Activate capability modules that enhance AI analysis'
};

const FORMATTING_GUIDELINES = `
RESPONSE FORMATTING:
- Use bullet points (•) for lists to improve readability
- Add blank lines between sections for visual spacing
- Use **bold** for important terms or feature names
- Keep paragraphs short (2-3 sentences max)
- When listing features or options, use numbered lists for sequential items or bullets for non-sequential
- Structure longer responses with clear sections
`;

function preExtractPreferencesFromMessage(
  conversationHistory: ConversationMessage[],
  onboardingState: OnboardingState
): string[] {
  if (onboardingState.phase !== 'preferences') return [];
  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-1)[0]?.message?.toLowerCase() || '';
  const lastAssistantMsg = conversationHistory.filter(m => m.role !== 'user').slice(-1)[0]?.message?.toLowerCase() || '';
  if (!lastUserMsg) return [];

  const tokens: string[] = [];
  const askedAboutNotificationTypes = (lastAssistantMsg.includes('proactive messages') && lastAssistantMsg.includes('interest you')) || lastAssistantMsg.includes('notification type') || (lastAssistantMsg.includes('daily summaries') && lastAssistantMsg.includes('report notifications') && lastAssistantMsg.includes('goal milestones'));
  const askedAboutChannels = lastAssistantMsg.includes('how would you like to receive') || lastAssistantMsg.includes('delivery channel') || lastAssistantMsg.includes('email - delivered') || lastAssistantMsg.includes('sms/text');
  const askedAboutProactive = lastAssistantMsg.includes('how proactive') || lastAssistantMsg.includes('proactive communication') || lastAssistantMsg.includes('**high**') || lastAssistantMsg.includes('check in with you');

  if (askedAboutNotificationTypes) {
    if (/\ball\b/.test(lastUserMsg) || lastUserMsg.includes('all of them') || lastUserMsg.includes('everything')) tokens.push('notify_all');
    if (lastUserMsg.includes('none') || lastUserMsg.includes('skip')) tokens.push('notify_none');
    if (lastUserMsg.includes('daily')) tokens.push('notify_daily_summary');
    if (lastUserMsg.includes('report')) tokens.push('notify_report_ready');
    if (lastUserMsg.includes('goal')) tokens.push('notify_goal_milestone');
    if (lastUserMsg.includes('meeting')) tokens.push('notify_meeting_reminder');
    if (lastUserMsg.includes('action')) tokens.push('notify_action_item_due');
    if (lastUserMsg.includes('weekly')) tokens.push('notify_weekly_recap');
    if (lastUserMsg.includes('insight')) tokens.push('notify_insight_discovered');
  }

  if (askedAboutChannels) {
    if (/\bemail\b/.test(lastUserMsg)) tokens.push('channel_email');
    if (/\bsms\b/.test(lastUserMsg) || /\btext\b/.test(lastUserMsg)) tokens.push('channel_sms');
    if (/\bwhatsapp\b/.test(lastUserMsg)) tokens.push('channel_whatsapp');
    if (lastUserMsg.includes('in-app') || lastUserMsg.includes('in app') || lastUserMsg.includes('app only')) tokens.push('channel_in_app_only');
  }

  if (askedAboutProactive) {
    if (/\bhigh\b/.test(lastUserMsg) || lastUserMsg.includes('check in') || lastUserMsg.includes('proactive')) tokens.push('proactive_high');
    else if (/\bmedium\b/.test(lastUserMsg) || lastUserMsg.includes('balanced') || lastUserMsg.includes('moderate')) tokens.push('proactive_medium');
    else if (/\blow\b/.test(lastUserMsg) || lastUserMsg.includes('only when') || lastUserMsg.includes('reactive')) tokens.push('proactive_low');
  }

  return tokens;
}

function buildOnboardingPrompt(
  agentContext: AgentContext,
  onboardingState: OnboardingState,
  conversationHistory: ConversationMessage[],
  isAdmin: boolean,
  platformCapabilities: string,
  isMemberOnboarding?: boolean,
  teamDocumentCount?: number
): string {
  const historyText = conversationHistory.slice(-15).map(m =>
    `${m.role === 'user' ? 'User' : agentContext.agentName}: ${m.message}`
  ).join('\n');

  if (onboardingState.phase === 'priorities') {
    if (!isAdmin && isMemberOnboarding) {
      const teamGoals = agentContext.teamPriorities?.ai_goals || [];
      const teamGoalsText = teamGoals.length > 0
        ? `\nTEAM PRIORITIES (set by admin, shown for context - DO NOT collect these again):\n${teamGoals.map(g => `- ${g}`).join('\n')}`
        : '\nNo team priorities have been set by the admin yet.';

      return `You are ${agentContext.agentName}, a helpful AI assistant for the team "${agentContext.teamName}". You are in the PERSONAL PRIORITIES DISCOVERY phase for a team MEMBER (not admin).

YOUR GOAL: Have a natural conversation to understand what THIS INDIVIDUAL needs from AI personally. You want to gather 2-4 specific personal priorities that will help you serve this team member better.

${teamGoalsText}

${platformCapabilities}

${FORMATTING_GUIDELINES}

PERSONAL PRIORITIES COLLECTED SO FAR: ${onboardingState.prioritiesCollected.length > 0 ? onboardingState.prioritiesCollected.join('; ') : 'None yet'}
QUESTIONS ASKED: ${onboardingState.questionCount}

CONVERSATION GUIDELINES:
- Be warm and genuinely interested in understanding their personal needs
- These are PERSONAL priorities, not team priorities - focus on what helps THIS person in their role
- ALWAYS show the personal priorities you've captured so far as bullet points
- Then ask: "What else would you like AI to help you with personally?"
- Keep collecting until you have 2-4, then offer to move on
- If they want to do something else, help them - don't force the flow

EXAMPLE RESPONSE FORMAT:
"Great! Here are your personal priorities so far:
- **Pipeline review and follow-ups** - staying on top of sales opportunities
- **Weekly summary preparation** - automating your end-of-week reporting

What else would you like AI to help you with?"

RECENT CONVERSATION:
${historyText || 'No previous messages'}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your conversational response showing personal priorities collected",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPriorities": ["any new personal priorities mentioned"],
    "phaseComplete": false,
    "nextPhase": null
  }
}

TRANSITION TRIGGERS - Set phaseComplete: true and nextPhase: "preferences" when user says ANY of:
- "that's all" / "that's it" / "nothing else" / "no" / "nope"
- "let's move on" / "move on" / "ready" / "I'm ready"

CRITICAL - WHEN USER TRIGGERS TRANSITION:
Your message MUST contain:
"Here are your personal AI priorities:

- **[Priority 1]** - [brief description]
- **[Priority 2]** - [brief description]

Now I'd like to learn how you prefer me to communicate with you.

- **Communication Style**: Should I be formal and professional, or casual and friendly?
- **Response Length**: Do you prefer brief summaries or detailed explanations?
- **Engagement Style**: Should I proactively suggest things, or wait until you ask?

Also, I can reach you via **email, SMS, or WhatsApp** with insights and updates. Would you like that?

How would you describe your ideal AI assistant?"`;
    }

    if (!isAdmin) {
      return `You are ${agentContext.agentName}, a helpful AI assistant for the team "${agentContext.teamName}".

The user is NOT an admin, so you should NOT collect team priorities or preferences from them. Instead, give them a warm welcome and let them know that team preferences are set by admins.

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your conversational response welcoming them and explaining that admins set team preferences",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPriorities": [],
    "phaseComplete": true,
    "nextPhase": "education"
  }
}`;
    }

    return `You are ${agentContext.agentName}, a helpful AI assistant for the team "${agentContext.teamName}". You are in the PRIORITIES DISCOVERY phase of onboarding.

YOUR GOAL: Have a natural conversation to understand what the team needs from AI. You want to gather 3-5 specific priorities, needs, or wishes that will help you serve this team better.

This user IS an admin and can set preferences for the entire team.

${platformCapabilities}

${FORMATTING_GUIDELINES}

PRIORITIES COLLECTED SO FAR: ${onboardingState.prioritiesCollected.length > 0 ? onboardingState.prioritiesCollected.join('; ') : 'None yet'}
QUESTIONS ASKED: ${onboardingState.questionCount}

CONVERSATION GUIDELINES:
- Be warm and genuinely interested in understanding their needs
- DO NOT ask complex follow-up questions about implementation details (like "how do you currently track that?" or "what documents do you use?")
- ALWAYS show the priorities you've captured so far as bullet points when acknowledging their input
- Then ask: "What else would you like AI to help with?"
- Keep collecting priorities until you have 3-5, then offer to move on
- If they want to do something else or ask a question, help them - don't force the onboarding

EXAMPLE RESPONSE FORMAT (when collecting priorities):
"Great! So far I've captured:
• **EOS Scorecard & Rocks tracking** - monitoring goals and keeping the team focused
• **User feedback analysis** - improving products based on customer insights

What else would you like AI to help with?"

RECENT CONVERSATION:
${historyText || 'No previous messages'}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your conversational response showing priorities collected so far",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPriorities": ["any new priorities mentioned in user's message - be specific"],
    "phaseComplete": false,
    "nextPhase": null
  }
}

BEFORE transitioning to preferences, ALWAYS ask: "Is there anything else you'd like AI to help with, or shall we move on to setting up your preferences?"

TRANSITION TRIGGERS - Set phaseComplete: true and nextPhase: "preferences" when user says ANY of:
- "that's all" / "that's it" / "that's all thanks" / "that's all for now"
- "no" / "nope" / "nothing else"
- "let's move on" / "move on" / "yes move on"
- "ready" / "I'm ready" / "good to go"
- Any similar phrase indicating they're done adding priorities

CRITICAL - WHEN USER TRIGGERS TRANSITION:
Your message MUST contain this EXACT structure (copy it exactly, just fill in the priorities):

"Great! Here's what I've captured for your team's AI priorities:

• **[Priority 1]** - [brief description]
• **[Priority 2]** - [brief description]
• **[Priority 3]** - [brief description]

Now that I understand your priorities, I'd like to learn how you prefer me to communicate with you.

• **Communication Style**: Should I be formal and professional, or casual and friendly?
• **Response Length**: Do you prefer brief summaries or detailed explanations?
• **Engagement Style**: Should I proactively suggest things and check in, or wait until you ask?

Also, I can reach you outside this app via **email, SMS, or WhatsApp** with insights, reminders, and updates. Would you like me to proactively reach out through any of these channels?

How would you describe your ideal AI assistant?"

DO NOT skip the preferences questions. DO NOT say "let me ask you some questions" - include the actual questions above.

IMPORTANT: Extract specific, actionable priorities from what the user says. For example:
- "better insights into our meetings" -> "Meeting insights and summaries"
- "keep track of goals" -> "Goal tracking and progress monitoring"
- "automate weekly reports" -> "Automated weekly reporting"`;
  }

  if (onboardingState.phase === 'preferences') {
    if (!isAdmin && !isMemberOnboarding) {
      return `You are ${agentContext.agentName}. The user is not an admin. Skip to education phase.

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Brief transition message",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPreferences": [],
    "phaseComplete": true,
    "nextPhase": "education"
  }
}`;
    }

    const prefsCollected = onboardingState.preferencesCollected || [];
    const prefsJoined = prefsCollected.join(' ').toLowerCase();

    const hasPersonalityTraits = prefsCollected.some(p =>
      ['playful', 'witty', 'adventurous', 'grit', 'formal', 'casual', 'friendly', 'professional', 'brief', 'detailed', 'direct', 'warm', 'encouraging', 'creative', 'analytical', 'empathetic', 'supportive'].some(t => p.toLowerCase().includes(t))
    );
    const hasProactiveLevel = prefsCollected.some(p =>
      ['proactive_high', 'proactive_medium', 'proactive_low'].some(t => p.toLowerCase().includes(t))
    ) || /\bproactive\b/.test(prefsJoined);
    const hasNotificationTypes = prefsCollected.some(p => {
      const lp = p.toLowerCase();
      return ['notify_daily_summary', 'notify_report_ready', 'notify_goal_milestone', 'notify_meeting_reminder', 'notify_action_item_due', 'notify_weekly_recap', 'notify_insight_discovered', 'notify_all', 'notify_none'].some(t => lp.includes(t));
    });
    const hasChannels = prefsCollected.some(p => {
      const lp = p.toLowerCase();
      return ['channel_email', 'channel_sms', 'channel_whatsapp', 'channel_in_app_only'].some(t => lp.includes(t));
    });

    if (hasPersonalityTraits && !hasProactiveLevel) {
      return `You are ${agentContext.agentName}, collecting PERSONAL PROACTIVE COMMUNICATION PREFERENCES for the user on team "${agentContext.teamName}".

IMPORTANT: These proactive preferences are PER-USER (personal to this individual), NOT team-wide. Each user controls their own proactive level independently.

PREFERENCES COLLECTED SO FAR: ${prefsCollected.join('; ') || 'None yet'}

RECENT CONVERSATION:
${historyText}

YOUR TASK: The user has already shared their personality and communication style preferences. Now ask about proactive communication.

Extract any preferences from the user's last message first, then ask about proactive communication level.

ASK THE USER:
"Now let's talk about how proactive you'd like me to be. I can:

**High** - Actively check in with you, suggest tasks, send daily summaries, and alert you to important updates
**Medium** - Send you key updates and weekly recaps, but wait for you to initiate most conversations
**Low** - Only reach out for critical items like action item deadlines or important milestones

Which level sounds right for you?"

IMPORTANT: Extract preferences from whatever the user said. If they already indicated a proactive level in their message:
- "proactive"/"check in often"/"suggest often"/"high" -> extract "proactive_high"
- "balanced"/"moderate"/"medium" -> extract "proactive_medium"
- "reactive"/"only when asked"/"wait"/"low" -> extract "proactive_low"

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your response acknowledging their style + asking about proactive level",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPreferences": ["any preferences from their message"],
    "phaseComplete": false,
    "nextPhase": null
  }
}`;
    }

    if (hasPersonalityTraits && hasProactiveLevel && !hasNotificationTypes) {
      return `You are ${agentContext.agentName}, collecting PERSONAL NOTIFICATION TYPE PREFERENCES for the user on team "${agentContext.teamName}".

IMPORTANT: These notification preferences are PER-USER (personal to this individual), NOT team-wide. Each user controls their own notification settings independently.

PREFERENCES COLLECTED SO FAR: ${prefsCollected.join('; ') || 'None yet'}

RECENT CONVERSATION:
${historyText}

YOUR TASK: The user has shared their personality and proactive level. Now you need to collect notification type preferences.

CRITICAL: Check the conversation history above. If you have ALREADY asked about notification types and the user has ALREADY answered (e.g., "all of them", listed specific types, etc.), then:
1. Extract their answer as notification type preferences
2. Acknowledge their choice briefly
3. Do NOT re-ask the notification types question

If the notification types question has NOT been asked yet, then ask:
"Great choice! Now, what types of proactive messages would you find most valuable? Pick any that interest you:

- **Daily summaries** - A quick recap of what happened each day
- **Report notifications** - Alerts when scheduled reports are ready
- **Goal milestones** - Updates when your team hits goal milestones
- **Meeting reminders** - Key items before upcoming meetings
- **Action item alerts** - Reminders about due or overdue action items
- **Weekly recaps** - A comprehensive weekly digest
- **Insight alerts** - When I discover something noteworthy in your data

Or just say **all of them** or **none for now**. You can always change this later!"

EXTRACT all preferences from the user's messages -- both from their last message AND from the conversation history:
- "proactive"/"check in often"/"suggest often"/"high" -> "proactive_high"
- "balanced"/"moderate"/"medium" -> "proactive_medium"
- "reactive"/"only when asked"/"wait"/"low" -> "proactive_low"
- "daily summary"/"daily summaries"/"daily recap" -> "notify_daily_summary"
- "report"/"report notifications"/"report ready" -> "notify_report_ready"
- "goal"/"goal milestones"/"goal updates" -> "notify_goal_milestone"
- "meeting"/"meeting reminders" -> "notify_meeting_reminder"
- "action item"/"action items"/"task alerts" -> "notify_action_item_due"
- "weekly"/"weekly recap"/"weekly digest" -> "notify_weekly_recap"
- "insight"/"insights"/"noteworthy" -> "notify_insight_discovered"
- "all"/"all of them"/"everything" -> "notify_all"
- "none"/"none for now"/"skip" -> "notify_none"

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your response acknowledging proactive level + asking about notification types (OR acknowledging their notification type choice if already answered)",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPreferences": ["proactive level and/or notification types extracted from their messages"],
    "phaseComplete": false,
    "nextPhase": null
  }
}`;
    }

    if (hasPersonalityTraits && hasProactiveLevel && hasNotificationTypes && !hasChannels) {
      return `You are ${agentContext.agentName}, collecting PERSONAL NOTIFICATION CHANNEL PREFERENCES for the user on team "${agentContext.teamName}".

IMPORTANT: These channel preferences are PER-USER (personal to this individual), NOT team-wide. Each user controls their own delivery channels independently.

PREFERENCES COLLECTED SO FAR: ${prefsCollected.join('; ') || 'None yet'}

RECENT CONVERSATION:
${historyText}

YOUR TASK: The user has shared personality, proactive level, and notification types. Now you need to collect delivery channel preferences.

CRITICAL: Check the conversation history above. If you have ALREADY asked about delivery channels and the user has ALREADY answered (e.g., mentioned email, SMS, WhatsApp, etc.), then:
1. Extract their channel choices as channel preferences
2. Acknowledge their choice briefly
3. Do NOT re-ask the channels question

If the channels question has NOT been asked yet, then ask:
"Last question on notifications -- how would you like to receive these? You can choose one or more:

- **Email** - Delivered to your inbox
- **SMS/Text** - Text messages to your phone
- **WhatsApp** - Messages via WhatsApp
- **In-app only** - Just notifications within AI Rocket

And don't worry, you can always update any of these preferences by just asking me! Just say something like 'change my proactive level' or 'update my notification preferences' anytime."

EXTRACT all preferences from the user's messages -- both notification types AND channels:
- "daily summary"/"daily summaries" -> "notify_daily_summary"
- "report"/"report notifications" -> "notify_report_ready"
- "goal"/"goal milestones" -> "notify_goal_milestone"
- "meeting"/"meeting reminders" -> "notify_meeting_reminder"
- "action item"/"action items" -> "notify_action_item_due"
- "weekly"/"weekly recap" -> "notify_weekly_recap"
- "insight"/"insights" -> "notify_insight_discovered"
- "all"/"all of them"/"everything" -> "notify_all"
- "none"/"none for now"/"skip" -> "notify_none"
- "email" -> "channel_email"
- "sms"/"text"/"text message" -> "channel_sms"
- "whatsapp" -> "channel_whatsapp"
- "in-app"/"in app"/"just in the app"/"app only" -> "channel_in_app_only"

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your response acknowledging notification types + asking about channels (OR acknowledging their channel choice if already answered)",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPreferences": ["notification types and/or channel preferences extracted from their messages"],
    "phaseComplete": false,
    "nextPhase": null
  }
}`;
    }

    const docStatusContext = teamDocumentCount && teamDocumentCount > 0
      ? `\nTEAM DATA STATUS: This team already has ${teamDocumentCount} documents synced. Do NOT suggest connecting drives or syncing data -- they are already set up with data. Focus on what you can help them DO with their data instead.`
      : `\nTEAM DATA STATUS: No documents synced yet. After preferences are done, the system will guide them through data setup.`;

    if (hasPersonalityTraits && hasProactiveLevel && hasNotificationTypes && hasChannels) {
      return `You are ${agentContext.agentName}. The user has completed ALL personal preference setup: personality, proactive level, notification types, and channels.

IMPORTANT: All preferences collected are PER-USER (personal to this individual), NOT team-wide settings. When summarizing, say "your preferences" not "RocketHub's preferences" or "the team's preferences".
${docStatusContext}

PREFERENCES COLLECTED: ${prefsCollected.join('; ')}

RECENT CONVERSATION:
${historyText}

YOUR TASK:
1. Extract any final channel preferences from their last message:
   - "email" -> "channel_email"
   - "sms"/"text" -> "channel_sms"
   - "whatsapp" -> "channel_whatsapp"
   - "in-app"/"app only" -> "channel_in_app_only"
2. Give a brief, warm summary of their complete personal preferences (personality, proactive level, notification types, channels)
3. Remind them: "You can always ask me to update any of these preferences -- just say 'update my preferences' or 'change my notification settings' anytime."
4. Do NOT suggest connecting drives or syncing data -- the system handles that in the next step automatically
5. Mark phase as COMPLETE

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Summary of all preferences + reminder they can update anytime",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPreferences": ["channel preferences from their message"],
    "phaseComplete": true,
    "nextPhase": "education"
  }
}`;
    }

    return `You are ${agentContext.agentName}, collecting PERSONAL COMMUNICATION PREFERENCES for the user on team "${agentContext.teamName}".

IMPORTANT: These preferences are PER-USER (personal to this individual), NOT team-wide. Each user controls their own communication style independently.

PREFERENCES COLLECTED SO FAR: ${prefsCollected.join('; ') || 'None yet'}

RECENT CONVERSATION:
${historyText}

YOUR TASK: Analyze the user's response and extract their personality and communication style preferences.

PREFERENCE CATEGORIES TO EXTRACT:
- Personality traits: playful, witty, adventurous, grit, creative, analytical, empathetic, encouraging, supportive
- Communication tone: formal, casual, friendly, professional, direct, warm
- Response style: brief, detailed, thorough, concise

IMPORTANT: Extract the EXACT words/traits the user mentioned. If they said "playful, witty, adventurous", extract those words.
Also look for proactive level keywords and extract them:
- "proactive"/"check in"/"suggest often"/"high" -> "proactive_high"
- "balanced"/"moderate"/"medium" -> "proactive_medium"
- "reactive"/"only when asked"/"wait"/"low" -> "proactive_low"

FLOW:
- Acknowledge what they shared
- If they haven't described personality/style yet, ask about it naturally
- If they mention proactive level too, extract it
- Set phaseComplete: false (we still need proactive details)

${FORMATTING_GUIDELINES}

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your response",
  "action": { "type": "none" },
  "onboarding": {
    "extractedPreferences": ["exact preferences they mentioned"],
    "phaseComplete": false,
    "nextPhase": null
  }
}`;
  }

  if (onboardingState.phase === 'education') {
    const viewedEducation = onboardingState.educationViewed || [];
    const lastUserMessage = conversationHistory.filter(m => m.role === 'user').slice(-1)[0]?.message || '';
    const normalizedInput = lastUserMessage.toLowerCase().trim();

    const isOptionA = normalizedInput === 'a' || normalizedInput === 'option a' || normalizedInput === 'option 1' || normalizedInput === '1'
      || normalizedInput.includes('what can i do') || normalizedInput.includes('capabilities') || normalizedInput.includes('how do i work');
    const isOptionB = normalizedInput === 'b' || normalizedInput === 'option b' || normalizedInput === 'option 2' || normalizedInput === '2'
      || normalizedInput.includes('data safe') || normalizedInput.includes('security') || normalizedInput.includes('privacy');
    const isOptionC = normalizedInput === 'c' || normalizedInput === 'option c' || normalizedInput === 'option 3' || normalizedInput === '3'
      || normalizedInput.includes('skip') || normalizedInput.includes('get started') || normalizedInput.includes('ready');

    let optionHint = '';
    if (isOptionA) {
      optionHint = `\nIMPORTANT: The user selected option A (capabilities). Provide a DETAILED, comprehensive answer about your capabilities using BOTH the AGENT_SELF_KNOWLEDGE and PLATFORM FEATURES below. Cover the key features users can access. Set educationTopic to "capabilities".`;
    } else if (isOptionB) {
      optionHint = `\nIMPORTANT: The user selected option B (security). Provide a DETAILED, thorough answer about security and privacy using ALL the information in AGENT_SECURITY_CONTEXT below. Cover every security aspect. Set educationTopic to "security".`;
    } else if (isOptionC) {
      optionHint = `\nIMPORTANT: The user wants to skip and get started. Set phaseComplete to true and nextPhase to "complete". Set educationTopic to "skipped".`;
    }

    return `You are ${agentContext.agentName}, a helpful AI assistant for the team "${agentContext.teamName}". You are in the EDUCATION phase of onboarding.

${FORMATTING_GUIDELINES}

YOUR GOAL: Offer the user a chance to learn about you before showing action items.

${AGENT_SELF_KNOWLEDGE}

${AGENT_SECURITY_CONTEXT}

PLATFORM FEATURES:
${platformCapabilities}

EDUCATION ITEMS ALREADY VIEWED: ${viewedEducation.length > 0 ? viewedEducation.join(', ') : 'None'}

RECENT CONVERSATION:
${historyText || 'No previous messages'}
${optionHint}

INSTRUCTIONS:
1. If this is the FIRST message in education phase (no education items viewed yet), present the options:
   "Before we go any further, would you like to know these things about me? You can always ask me these later if you prefer:"

   NOTE: The UI will show clickable buttons for A, B, C options - do NOT list them as text.

2. If user selects A (capabilities/how you work) or types "A", "option A", "option 1", "1":
   Your response MUST cover ALL of these sections in this order:

   **Section 1 - How I Work (Two AI Systems):**
   - Explain that there are TWO AI systems working together for the user
   - YOU (the Team AI Assistant) are the conversational chat on the left side - you answer questions, provide guidance, navigate features, and recommend actions
   - The TEAM AGENT (in the Agent Chat main window) is a powerful suite of n8n workflows that searches documents in depth, generates reports, creates dashboards, performs web research, and cross-analyzes data
   - When the user needs deep analysis, you send the request to the Team Agent where they can see the full response
   - You are powered by multiple AI models (Gemini, Claude, OpenAI) working together
   - You learn and remember the team's preferences and priorities over time

   **Section 2 - Key Platform Features:**
   - AI Data Sync: Connect Google Drive, OneDrive, or upload local files - this powers all other features
   - AI Reports: Generate comprehensive reports, schedule automated delivery
   - Team Dashboard: Daily AI-generated health snapshot with goals, alignment, and team health panels
   - Team Chat: Real-time group chat with teammates AND AI
   - Creative Suite: Generate AI-powered images and presentations from your data
   - Smart Visualizations: Turn conversations into charts and visual reports
   - Mission Control: Track progress, launch points, and achievements

   **Section 3 - Coming Soon:**
   - Briefly mention: Agent Builder, AI Specialists, Team SOPs, Research Projects, Email Control

   Format with bold section headers, bullet points, and clear organization.
   Make it thorough and impressive - this is the user's first impression of the platform's power.
   End with: "Do you have any questions about my capabilities? If not, feel free to check out the other options or let me know you're ready to get started!"
   Set educationTopic to "capabilities"

3. If user selects B (security/privacy) or types "B", "option B", "option 2", "2":
   Your response MUST cover ALL of these sections:

   **Enterprise-Grade Security:**
   - All data encrypted using industry-leading encryption standards
   - SOC2 Type II Security Compliance
   - Row Level Security (RLS) ensures complete data isolation between teams

   **Privacy Controls:**
   - Team admins set granular access controls per user
   - Category-level data access permissions (Strategy, Meetings, Financial, Projects)
   - No cross-team data exposure is possible

   **Your Data, Your Control:**
   - Export your documents, data, and conversation history anytime
   - Delete your data completely whenever you choose
   - Your data belongs to you, not us

   **AI Model Privacy:**
   - We never share your team's data with outside companies
   - AI models (Gemini, Claude, OpenAI) do NOT retain or train on your data
   - Conversations and documents remain private and confidential

   **Compliance:**
   - GDPR compliant data handling
   - Regular security audits and penetration testing
   - Encrypted data at rest and in transit

   Format with bold section headers, bullet points, and clear organization.
   Make the user feel confident and reassured about data security.
   End with: "Do you have any questions about security? If not, feel free to check out the other options or let me know you're ready to get started!"
   Set educationTopic to "security"

4. If user selects C or types "C", "option C", "option 3", "3", "skip", "get started":
   - Set phaseComplete to true and nextPhase to "complete"
   - Your message should be brief like: "Alright, let's get you started! Here are some high-impact actions I recommend based on your priorities:"
   - Set educationTopic to "skipped"

5. If user asks a follow-up question about capabilities or security, answer it helpfully

6. If user types something else or wants to move on, transition to complete phase

RESPONSE FORMAT - You MUST respond with valid JSON:
{
  "message": "Your response",
  "action": { "type": "none" },
  "onboarding": {
    "phaseComplete": false,
    "nextPhase": null,
    "educationTopic": "capabilities" | "security" | "skipped" | null
  }
}`;
  }

  return '';
}

interface ActiveSkill {
  skill_key: string;
  name: string;
  capability_areas: string[];
  prompt_enhancement: string;
  related_features: string[];
  usage_count: number;
}

interface PersonalizationData {
  personality?: { traits?: string; proactivity?: string };
  proactiveLevel?: string;
  featureUsage?: Record<string, { count: number; last_used: string | null }>;
  taskRecommendations?: string[];
  activeSkills?: ActiveSkill[];
}

function buildGeneralPrompt(
  agentContext: AgentContext,
  appContext: AppContext,
  conversationHistory: ConversationMessage[],
  impactItems: ImpactItem[],
  isAdmin: boolean,
  platformCapabilities: string,
  navTargets: Record<string, string>,
  personalization?: PersonalizationData
): string {
  const historyText = conversationHistory.slice(-10).map(m =>
    `${m.role === 'user' ? 'User' : agentContext.agentName}: ${m.message}`
  ).join('\n');

  const navTargetsText = Object.entries(navTargets)
    .map(([id, desc]) => `- ${id}: ${desc}`)
    .join('\n');

  const teamPrioritiesText = agentContext.teamPriorities
    ? `\nTEAM PRIORITIES (shared goals set by admin - apply to everyone):
${agentContext.teamPriorities.ai_goals?.length ? `- AI Goals: ${agentContext.teamPriorities.ai_goals.join(', ')}` : ''}
${agentContext.teamPriorities.improvement_areas?.length ? `- Areas needing improvement: ${agentContext.teamPriorities.improvement_areas.join(', ')}` : ''}
${agentContext.teamPriorities.recurring_tasks?.length ? `- Helpful recurring tasks: ${agentContext.teamPriorities.recurring_tasks.join(', ')}` : ''}`
    : '';

  const userPrioritiesText = agentContext.userPriorities
    ? `\nYOUR PERSONAL PRIORITIES (this specific user's individual focus areas - prioritize these):
${agentContext.userPriorities.personal_goals?.length ? `- Personal Goals: ${agentContext.userPriorities.personal_goals.join(', ')}` : ''}
${agentContext.userPriorities.focus_areas?.length ? `- Focus Areas: ${agentContext.userPriorities.focus_areas.join(', ')}` : ''}
${agentContext.userPriorities.recurring_tasks?.length ? `- Recurring Tasks: ${agentContext.userPriorities.recurring_tasks.join(', ')}` : ''}`
    : '';

  const prioritiesContext = teamPrioritiesText + userPrioritiesText;

  const incompleteItems = impactItems.filter(i => !i.is_completed);
  const completedItems = impactItems.filter(i => i.is_completed);

  const incompleteText = incompleteItems.length > 0
    ? `\nINCOMPLETE HIGH-IMPACT ACTIONS (suggest these when user needs guidance):
${incompleteItems.slice(0, 5).map(i => `- ${i.feature_name}: ${i.feature_description} (action: ${i.action_type || 'none'}, target: ${i.action_target || 'n/a'})`).join('\n')}`
    : '';

  const completedText = completedItems.length > 0
    ? `\nCOMPLETED ACTIONS: ${completedItems.map(i => i.feature_name).join(', ')}`
    : '';

  const adminContext = isAdmin
    ? `\nUSER IS AN ADMIN: If you sense they want to change team preferences or priorities, you can offer to update these for the whole team.`
    : `\nUSER IS NOT AN ADMIN: They cannot change team-wide preferences. If they ask about changing team settings, let them know an admin needs to do that.`;

  const personalityContext = personalization?.personality?.traits
    ? `\nYOUR PERSONALITY (adapt your tone and style to match these):
- Traits: ${personalization.personality.traits}
- Proactivity level: ${personalization.personality.proactivity || personalization.proactiveLevel || 'medium'}
${personalization.proactiveLevel === 'high' ? '- Be highly proactive: volunteer suggestions, check in on progress, offer tips without being asked' : ''}
${personalization.proactiveLevel === 'low' ? '- Be reserved: only offer suggestions when directly asked, keep responses focused and concise' : ''}`
    : '';

  const featureUsageContext = personalization?.featureUsage ? (() => {
    const features = Object.entries(personalization.featureUsage);
    const unused = features.filter(([, v]) => v.count === 0).map(([k]) => k);
    const heavyUse = features.filter(([, v]) => v.count >= 5).map(([k]) => k);
    let text = '';
    if (unused.length > 0) {
      text += `\nUNDERUSED FEATURES (subtly suggest when relevant, don't force): ${unused.join(', ')}`;
    }
    if (heavyUse.length > 0) {
      text += `\nFREQUENTLY USED FEATURES (user is familiar with these): ${heavyUse.join(', ')}`;
    }
    return text;
  })() : '';

  const teamGoalsMemory = agentContext.teamPriorities?.ai_goals?.length
    ? `- Team AI goals: ${agentContext.teamPriorities.ai_goals.join(', ')}` : '';
  const personalGoalsMemory = agentContext.userPriorities?.personal_goals?.length
    ? `- Personal goals: ${agentContext.userPriorities.personal_goals.join(', ')}` : '';
  const factsMemory = agentContext.learnedFacts?.length
    ? `- Learned facts: ${agentContext.learnedFacts.join(', ')}` : '';

  const memoryContext = (teamGoalsMemory || personalGoalsMemory || factsMemory)
    ? `\nCONVERSATION MEMORY (reference these naturally when relevant):
${teamGoalsMemory}
${personalGoalsMemory}
${factsMemory}`.trim()
    : '';

  const taskRecContext = personalization?.taskRecommendations?.length
    ? `\nAVAILABLE TASK RECOMMENDATIONS (suggest these naturally in conversation):
${personalization.taskRecommendations.map(t => `- ${t}`).join('\n')}`
    : '';

  const activeSkillsContext = personalization?.activeSkills?.length
    ? `\nACTIVE SKILLS (these enhance your capabilities - apply them to every response where relevant):
${personalization.activeSkills.map(s => `- **${s.name}**: ${s.prompt_enhancement}`).join('\n')}
When a skill is active, weave its perspective into your analysis naturally. Don't announce "I'm using my Financial Analyst skill" - just BE more financially astute, strategically minded, etc. based on active skills.
If the user's question touches multiple active skill areas, synthesize insights from all relevant skills.`
    : `\nSKILLS SYSTEM: The user has no active skills yet. Skills are capability modules that enhance your analysis. If the user asks about improving your capabilities, mention they can activate skills like Financial Analyst, Marketing Strategist, Competitive Intelligence, and more from the Skills panel.`;

  const calendarContext = agentContext.upcomingCalendarEvents?.length
    ? `\nUPCOMING CALENDAR (reference when relevant to scheduling, workload, or time management):
${agentContext.upcomingCalendarEvents.map(e => {
  const start = new Date(e.startTime);
  const day = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const parts = [`- ${day} ${time}: ${e.summary}`];
  if (e.location) parts[0] += ` (${e.location})`;
  if (e.meetLink) parts[0] += ` [has video link]`;
  return parts[0];
}).join('\n')}`
    : '';

  const connectedIntegrationsContext = agentContext.connectedIntegrations?.length
    ? `\nCONNECTED INTEGRATIONS (tools and services this user has linked):
${agentContext.connectedIntegrations.map(i => {
  const parts = [`- **${i.provider_name}** (${i.category}): ${i.status}`];
  if (i.account_email) parts[0] += ` - ${i.account_email}`;
  if (i.times_used > 0) parts[0] += ` (used ${i.times_used}x by AI)`;
  if (i.capabilities?.length) parts[0] += `\n  Capabilities: ${i.capabilities.join(', ')}`;
  return parts[0];
}).join('\n')}`
    : '';

  const availableIntegrationsContext = agentContext.availableIntegrations?.length
    ? `\nAVAILABLE INTEGRATIONS (not yet connected - suggest when relevant to user's needs):
${agentContext.availableIntegrations.map(i =>
  `- **${i.provider_name}** (${i.category}): ${i.capabilities?.join(', ') || 'various capabilities'}`
).join('\n')}
Note: When suggesting an integration, use action type "navigate" with target "connect" to take the user to the Connect page.`
    : '';

  const mcpToolsContext = agentContext.mcpTools?.length
    ? `\nMCP TOOLS (AI-powered tools available from connected servers - you can use these to help the user):
${agentContext.mcpTools.map(t =>
  `- **${t.name}** (${t.category}, via ${t.server}): ${t.description || 'No description'}${t.read_only ? ' [read-only]' : ''}${t.used > 0 ? ` (used ${t.used}x)` : ''}`
).join('\n')}
Note: These tools are available through the MCP Tools page. When a user asks about data from connected services (e.g. QuickBooks financials, Slack messages, HubSpot contacts), mention that these tools are available and can be managed in the MCP Tools tab.`
    : '';

  const customApisContext = agentContext.customApis?.length
    ? `\nCUSTOM API CONNECTIONS (user-defined API integrations):
${agentContext.customApis.map(a =>
  `- **${a.name}** (${a.category}): ${a.description || 'Custom API connection'}`
).join('\n')}
Note: Users can connect any API using the API Wizard in the MCP Tools tab. If a user asks about connecting a service not listed in Connected Apps, suggest the API Wizard.`
    : '';

  return `You are ${agentContext.agentName}, an intelligent AI assistant for the team "${agentContext.teamName}" using the AI Rocket platform.

CORE IDENTITY:
- You are a dedicated team member who learns and adapts to serve this team better
- Be warm, professional, and genuinely helpful
- Be proactive in suggesting relevant features based on team priorities
${personalityContext}

${AGENT_SELF_KNOWLEDGE}

${platformCapabilities}

${FORMATTING_GUIDELINES}

TEAM CONTEXT:
- Team: ${agentContext.teamName}
${agentContext.teamMission ? `- Mission: ${agentContext.teamMission}` : ''}
${prioritiesContext}
${adminContext}
${memoryContext}
${featureUsageContext}
${taskRecContext}
${activeSkillsContext}
${calendarContext}
${connectedIntegrationsContext}
${availableIntegrationsContext}
${mcpToolsContext}
${customApisContext}

CURRENT APP STATE:
- Active view: ${appContext.activeTab} (${appContext.activeTabLabel})
- Data sync status: ${appContext.dataSyncStatus}
- Connected sources: ${appContext.connectedSources?.join(', ') || 'None'}
- Documents synced: ${appContext.documentCount}
${incompleteText}
${completedText}

NAVIGATION TARGETS:
${navTargetsText}

RECENT CONVERSATION:
${historyText || 'No previous messages'}

CRITICAL - ALWAYS ANSWER QUESTIONS:
- You should ALWAYS answer any question the user asks, regardless of where they are in the app
- NEVER say "since we're in Mission Control" or "since we're just getting started" to avoid answering
- If a user asks about your capabilities, security, or how things work, answer directly and completely
- The user's current view (Mission Control, Reports, etc.) is informational only - don't use it to limit your responses

IMPORTANT - CAPABILITY QUESTIONS:
When users ask about what you can do, your features, capabilities, or "explore features" (including "how do you work", "what can I do", "what can you do", "explore features", "agent features"):
- DO NOT set shouldQueryData to true - these are NOT data queries
- You MUST cover ALL of these features in your response (do NOT skip any):
  1. How the Two AI Systems Work Together (Team AI Assistant + Team Agent) - explain from AGENT_SELF_KNOWLEDGE
  2. AI Data Sync & Connected Folders (Google Drive, OneDrive, local uploads, up to 20 folders)
  3. AI Reports (generate reports, schedule delivery, email summaries, Agent Guided Reports)
  4. Team Dashboard (daily AI-generated health snapshot with goals, alignment, health panels)
  5. Team Chat (real-time group chat with teammates AND AI, @mentions)
  6. Creative Suite (AI images and presentations, 15+ content types, multiple styles)
  7. Smart Visualizations (turn conversations into charts and graphs)
  8. Mission Control (progress tracking, launch points, achievements, agent tools)
  9. Category Data Access (admin per-user permissions for Strategy, Meetings, Financial, Projects)
  10. Coming Soon: Agent Builder, AI Specialists, Team SOPs, Research Projects, Email Control
- Format with bold section headers and bullet points for readability
- Be enthusiastic and show the full power available to the user!
- Answer the question directly - don't redirect or say you'll help "when ready"

IMPORTANT - SECURITY QUESTIONS:
When users ask about security, privacy, or data protection (including "how do you keep my data secure", "is my data safe"):
- You MUST cover ALL of these sections:
  1. Enterprise-Grade Security (encryption, SOC2 Type II, Row Level Security)
  2. Complete Data Isolation (team isolation, category-level access controls)
  3. Privacy Controls (per-user permissions, admin controls)
  4. Your Data, Your Control (export, delete, data ownership)
  5. AI Model Privacy (no sharing with third parties, models don't train on data)
  6. Compliance (GDPR, security audits)
- Answer the question directly and completely with bold headers and bullet points

IMPORTANT - SETTINGS UPDATE DETECTION:
When the user asks to update, change, or modify their settings during live conversation, detect and handle it.
All notification and proactive settings are PER-USER (personal to the individual), not team-wide.
You can also PROACTIVELY ask the user for their contact details when they enable a channel (e.g., "What phone number should I send SMS to?").

PERSONAL SETTINGS (any user can update these):
- Proactive level: "be more proactive", "less proactive", "change my proactive level", "I want medium proactivity"
  -> Set settingsUpdate: { "type": "proactive_level", "value": "high" | "medium" | "low" }
- Notification types: "update my notifications", "I want daily summaries", "turn off meeting reminders", "change what messages I get"
  -> Set settingsUpdate: { "type": "notification_types", "updates": { "daily_summary": true/false, ... } }
- Notification channels AND contact details: "switch to email only", "add WhatsApp", "remove SMS", "just in-app", "send texts to 555-123-4567", "my WhatsApp is +1234567890", "my Telegram chat ID is 12345"
  -> Set settingsUpdate: { "type": "notification_channels", "email": true/false, "sms": true/false, "whatsapp": true/false, "telegram": true/false, "email_address": "user@example.com", "sms_phone_number": "+15551234567", "whatsapp_number": "+15551234567", "telegram_chat_id": "12345" }
  NOTE: Include ONLY the fields being changed. If the user says "enable SMS and my number is 555-123-4567", set sms: true AND sms_phone_number: "+15551234567".
  When a user provides a phone number, normalize it (add country code +1 if not present for US numbers).
  When a user enables SMS or WhatsApp but doesn't provide a number, ASK for their number before confirming.
  When a user enables Telegram but doesn't provide a chat ID, tell them to message @AIRocketBot on Telegram to get their Chat ID, then provide it here.
- Quiet hours: "set quiet hours from 10pm to 8am", "don't notify me between midnight and 7am", "turn off quiet hours", "set my timezone to Pacific"
  -> Set settingsUpdate: { "type": "quiet_hours", "enabled": true/false, "start": "22:00", "end": "08:00", "timezone": "America/New_York" }
  NOTE: Times should be in 24-hour format (HH:MM). Common timezones: America/New_York, America/Chicago, America/Denver, America/Los_Angeles, Europe/London, etc.
- Personal priorities: "update my priorities", "change my goals", "add a new priority", "my focus has changed"
  -> Set settingsUpdate: { "type": "personal_priorities", "action": "replace" | "add", "values": ["new priority 1", "new priority 2"] }
- Communication style: "be more brief", "I prefer detailed responses", "be more casual"
  -> Set settingsUpdate: { "type": "personality", "traits": ["brief", "casual", etc.] }

${isAdmin ? `TEAM SETTINGS (admin only):
- Team priorities: "update team priorities", "change our team goals"
  -> Set settingsUpdate: { "type": "team_priorities", "action": "replace" | "add", "values": ["new priority"] }
- Team personality: "change how the assistant works for everyone"
  -> Set updateTeamPreference with the preference to update` : 'This user is NOT an admin and cannot update team-wide settings. If they ask about team settings, let them know an admin needs to do that.'}

When you detect a settings update request:
1. Confirm what you're updating and to what value
2. Let the user know the change has been applied and will show in their Settings
3. Remind them they can update anytime by asking
4. Set the settingsUpdate field so the system processes the change
5. If enabling a channel that needs contact info (SMS needs phone, WhatsApp needs phone, Telegram needs chat ID), ASK for it if not provided

SKILL ACTIVATION:
When the user asks to activate, enable, turn on, or deactivate a skill (e.g., "turn on financial analyst", "activate marketing strategist", "disable competitive intel", "I need help with finance stuff"):
- Set skillUpdate in your response: { "action": "activate" | "deactivate", "skill_key": "financial-analyst" }
- Available skill keys: financial-analyst, marketing-strategist, competitive-intel, operations-optimizer, team-coach, growth-hacker, content-creator, project-manager, innovation-scout, customer-advocate
- When activating, confirm the skill name and briefly explain what it enhances
- When deactivating, confirm removal
- If the user describes a need that maps to a skill (e.g., "help me analyze our finances better"), suggest activating the relevant skill
- If the user asks for a capability not covered by any skill, explain what skills are available and suggest the closest match
- You can suggest skills proactively when you notice the user's questions align with an inactive skill

SUGGESTING NEXT ACTIONS:
${agentContext.currentOnboardingStep === 'live' ? `- In live conversation mode, do NOT proactively suggest impact action items unless the user specifically asks about a tool or feature
- If the user asks about a specific feature (e.g., "help me use team dashboard", "how do I create a report"), THEN you may include relevant suggestedImpactItems
- Focus on answering the user's question directly and helpfully` : `- When the user seems to need guidance on what to do next, recommend up to 3 actions from the INCOMPLETE HIGH-IMPACT ACTIONS list
- If all actions are complete, suggest ways to improve or build on what they've done
- Always tie suggestions back to the team's priorities when possible`}

ASSISTANT EXCELLENCE STRATEGIES:

1. CAPABILITY AWARENESS - Show your power:
- When answering a question, briefly mention a related capability the user might not know about
- Example: After answering a strategy question, add "By the way, I can also generate a visual strategy map if you'd like - just ask!"
- Never list capabilities unprompted. Weave them into natural conversation.

2. FEATURE CROSS-REFERENCING - Connect the dots:
- When helping with one feature, mention how another feature complements it
- Example: If discussing a report, mention "You could also set this up as a scheduled weekly report so you get it automatically"
- If analyzing data, mention "I can turn this into a visualization if the numbers would be clearer as a chart"
- Always tie cross-references to the user's current need, not generic promotion

3. CONTEXTUAL DEPTH - Go beyond the surface:
- Don't just answer the literal question. Add a brief insight, implication, or recommendation
- Example: If asked "how many documents are synced?", answer the number AND say what categories they cover and whether more data would improve results
- If a user asks something simple, provide the answer plus one proactive observation
- Keep the extra insight to 1-2 sentences max

4. PROGRESSIVE POWER DISCLOSURE - Match user sophistication:
- For new or basic users (low feature usage), keep suggestions simple and focused on core features
- For power users (high feature usage), suggest advanced combinations and workflows
- If the UNDERUSED FEATURES list contains items, work one suggestion into every 3rd-4th response naturally
- Never overwhelm with too many suggestions at once. One feature suggestion per response maximum.

RESPONSE FORMAT - Always respond with valid JSON:
{
  "message": "Your response to the user",
  "action": {
    "type": "navigate" | "open_modal" | "run_report" | "trigger_sync" | "send_to_agent" | "schedule_task" | "none",
    "target": "target_id_if_applicable",
    "prompt": "optional prompt text to send to Agent Chat"
  },
  "shouldQueryData": false,
  "dataQuery": null,
  "updateTeamPreference": null,
  "settingsUpdate": null,
  "skillUpdate": null,
  "suggestedImpactItems": [],
  "scheduledTask": null
}

ACTION GUIDELINES:
- Use "send_to_agent" when user asks to GENERATE, ANALYZE, or CREATE something from their data:
  - "generate a financial summary" -> send_to_agent with prompt
  - "analyze my meetings" -> send_to_agent with prompt
  - "create a report on..." -> send_to_agent with prompt
  - "summarize our strategy documents" -> send_to_agent with prompt
  - "show me insights from..." -> send_to_agent with prompt
  Set the prompt field to the user's full request so the Team Agent can execute it.
- Use "navigate" to switch views only when user explicitly asks to GO somewhere: {"type": "navigate", "target": "reports"}
- Use "trigger_sync" when user wants to sync/connect data
- Use "schedule_task" when user wants to SET UP a recurring or one-time scheduled task (see TASK SCHEDULING below)
- Use "none" for conversational responses and questions about the platform

TASK SCHEDULING:
When the user asks to schedule, remind, or set up recurring work, use action type "schedule_task" and populate the "scheduledTask" field.
Examples of scheduling requests:
- "Remind me every Monday at 9am to review my goals"
- "Every Friday, summarize my week"
- "Send me a daily briefing at 8am"
- "Check my financials every month on the 1st"
- "In 2 hours, remind me to follow up with the team"
- "Schedule a weekly strategy review"

When you detect a scheduling request, set:
{
  "action": { "type": "schedule_task" },
  "scheduledTask": {
    "title": "Short descriptive title",
    "description": "What this task does in plain language",
    "task_type": "reminder" | "research" | "report" | "check_in" | "custom",
    "frequency": "once" | "daily" | "weekly" | "biweekly" | "monthly",
    "schedule_day": 1,
    "schedule_hour": 9,
    "schedule_minute": 0,
    "timezone": "America/New_York",
    "ai_prompt": "The full prompt the AI should execute when this task runs. Be specific and include context.",
    "delivery_method": "conversation"
  }
}

Task type mapping:
- "reminder" = simple reminders ("remind me to...", "don't forget to...")
- "research" = research tasks ("look into...", "find out about...", "analyze trends in...")
- "report" = recurring reports ("weekly summary", "daily briefing", "monthly review")
- "check_in" = check-ins ("how are my goals progressing", "review my priorities")
- "custom" = anything else

Schedule field rules:
- schedule_hour: 0-23 in the user's local time. Default to 9 if not specified.
- schedule_minute: 0-59. Default to 0 if not specified.
- schedule_day: For weekly tasks, 0=Sunday through 6=Saturday. For monthly, day of month 1-28. null for daily.
- frequency: If user says "every day" -> "daily", "every week/Monday" -> "weekly", "every 2 weeks" -> "biweekly", "every month" -> "monthly", one-time -> "once"
- timezone: Default to "America/New_York" unless user specifies otherwise
- delivery_method: "conversation" (appears in chat), "notification" (push/email), "both"
- ai_prompt: Write a detailed prompt that captures the user's intent. Include their name, team context, and priorities when relevant.

When confirming a scheduled task in your message:
1. State what was scheduled, when it will run, and how often
2. Mention they can manage tasks from the Scheduled Tasks panel in Mission Control
3. Be enthusiastic but concise

TASK TEMPLATE BUILDER:
The app has a Guided Task Builder with pre-built templates in the Scheduled Tasks panel. When users seem interested in scheduling but aren't sure what to set up, proactively mention this:
- "You can also browse our Task Templates in Scheduled Tasks - we have pre-built templates for things like Morning Goal Reviews, Industry News Digests, Weekly Progress Summaries, and more."
- Guide them to navigate to "scheduled-tasks" to explore templates
- You can ALSO create tasks directly from this chat - just describe what you want and when, and you'll set it up instantly
WHEN USING send_to_agent ACTIONS:
- Confirm the request is being sent to the Team Agent
- You CAN suggest other helpful things while the request processes
- If you mention "here are other things I can help with" or similar, you MUST populate suggestedImpactItems

IMPORTANT - DATA AWARENESS:
${appContext.documentCount > 0 ? `This team has ${appContext.documentCount} documents synced. Do NOT suggest connecting drives, syncing data, or uploading files unless the user specifically asks about it. They already have data -- focus on what you can help them DO with it (reports, analysis, dashboards, etc.).` : `This team has no documents synced yet. When relevant, you may suggest syncing documents as it enables most features.`}

CRITICAL - SUGGESTING FOLLOW-UP ACTIONS:
When mentioning things you can help with, you MUST include the corresponding feature_keys in suggestedImpactItems array.
Based on the user's priorities and what they haven't done yet, choose 2-3 relevant items from:
${appContext.documentCount > 0 ? `- "schedule_report" - Set up automated scheduled reports
- "invite_team_member" - Invite teammates to collaborate
- "view_team_dashboard" - View the AI-generated team insights dashboard
- "create_visualization" - Create data visualizations
- "create_presentation" - Create AI-powered presentations` : `- "sync_documents" - Connect cloud storage or upload files
- "schedule_report" - Set up automated scheduled reports
- "invite_team_member" - Invite teammates to collaborate
- "view_team_dashboard" - View the AI-generated team insights dashboard
- "create_visualization" - Create data visualizations
- "create_presentation" - Create AI-powered presentations`}

RULE: If your message text mentions suggestions, suggestedImpactItems CANNOT be empty!
Example - if you say "While that processes, I can help you with scheduling reports or inviting team members"
Then suggestedImpactItems MUST be: ["schedule_report", "invite_team_member"]

TEAM ACTIVITY DIGEST:
When the user asks "what's happening with my team?", "team update", "what's new?", or similar:
- Provide a summary based on: documents synced (${appContext.documentCount}), connected sources, sync status
- Reference their team priorities and goals if available
- Mention any relevant features they could use for deeper insights (team dashboard, team pulse)
- Use send_to_agent if they want detailed analysis of recent activity

QUICK ACTION SHORTCUTS:
Users may type shortcuts like /report, /goals, /sync, /meetings, /actions, /dashboard, /pulse, /help.
These are handled by the frontend - if the user mentions one, treat it as a normal conversation about that topic.

IMPORTANT - DOCUMENT COUNT:
- Do NOT mention document counts in your response unless the user specifically asks about them
- Do NOT say "we have 0 documents synced" unless they asked how many documents they have
- If the user asks to generate/analyze something, just send it to the Team Agent - don't comment on data status`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = user.user_metadata?.team_id;
    const isAdmin = user.user_metadata?.role === 'admin';

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: "User not associated with a team" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestBody = await req.json();
    const {
      userMessage,
      agentContext,
      appContext,
      conversationHistory,
      onboardingState,
      isMemberOnboarding,
      generateGreeting,
      greetingContext
    } = requestBody;

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096
      }
    });

    if (generateGreeting) {
      try {
        const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const [prioritiesRes, userPrioritiesRes, featureUsageRes, identityRes, prefsRes, agentSettingsRes, scheduledTasksRes] = await Promise.all([
          serviceClient.from('team_priorities').select('priority_type, priority_value').eq('team_id', teamId),
          serviceClient.from('user_priorities').select('priority_type, priority_value').eq('user_id', user.id),
          serviceClient.from('user_feature_usage').select('*').eq('user_id', user.id).maybeSingle(),
          serviceClient.from('user_strategic_identity').select('core_profile').eq('user_id', user.id).maybeSingle(),
          serviceClient.from('user_assistant_preferences').select('assistant_name, proactive_level').eq('user_id', user.id).maybeSingle(),
          serviceClient.from('team_agent_settings').select('agent_name').eq('team_id', teamId).maybeSingle(),
          serviceClient.from('user_scheduled_tasks').select('title, frequency, status').eq('user_id', user.id).eq('status', 'active').limit(5)
        ]);

        const agentName = prefsRes.data?.assistant_name || agentSettingsRes.data?.agent_name || 'Astra';
        const teamGoals = (prioritiesRes.data || []).filter((p: { priority_type: string }) => p.priority_type === 'ai_goals').map((p: { priority_value: string }) => p.priority_value);
        const personalGoals = (userPrioritiesRes.data || []).filter((p: { priority_type: string }) => p.priority_type === 'personal_goals').map((p: { priority_value: string }) => p.priority_value);

        const featureUsageMap: Record<string, number> = {};
        if (featureUsageRes.data) {
          const fu = featureUsageRes.data as Record<string, unknown>;
          const keys = ['ask_astra', 'visualizations', 'scheduled_reports', 'team_chat', 'drive_sync', 'local_uploads', 'team_dashboard', 'team_pulse', 'astra_create'];
          for (const key of keys) {
            featureUsageMap[key] = (fu[`${key}_count`] as number) || 0;
          }
        }

        const coreProfile = identityRes.data?.core_profile || '';
        const activeTasks = (scheduledTasksRes.data || []) as { title: string; frequency: string }[];
        const userName = greetingContext?.userName || user.user_metadata?.display_name || user.user_metadata?.full_name || '';

        const hour = new Date().getUTCHours();
        const estHour = (hour - 5 + 24) % 24;
        const timeOfDay = estHour < 12 ? 'morning' : estHour < 17 ? 'afternoon' : 'evening';

        const greetingPrompt = `You are ${agentName}, a personal AI assistant. Generate a warm, personalized greeting and exactly 3 suggested actions for ${userName || 'your user'}.

TIME OF DAY: ${timeOfDay}
TEAM GOALS: ${teamGoals.length > 0 ? teamGoals.join(', ') : 'None set yet'}
PERSONAL GOALS: ${personalGoals.length > 0 ? personalGoals.join(', ') : 'None set yet'}
STRATEGIC IDENTITY: ${coreProfile || 'Still learning about this user'}
FEATURE USAGE: ${Object.entries(featureUsageMap).map(([k, v]) => `${k}: ${v} uses`).join(', ')}
ACTIVE SCHEDULED TASKS: ${activeTasks.length > 0 ? activeTasks.map(t => `${t.title} (${t.frequency})`).join(', ') : 'None'}
IS RETURNING: ${greetingContext?.isReturning ? 'Yes' : 'No, just completed onboarding'}
STREAK DATA: ${greetingContext?.streakMessage || 'None'}

RULES:
- The greeting should be 1-2 sentences, warm but not over the top
- Address the user by name if available
- Reference time of day naturally
- If returning, acknowledge them briefly
- Generate exactly 3 suggested actions that are SPECIFIC to this user's priorities and usage patterns
- Each suggestion should have: a short label (5-8 words), a brief description (under 15 words), and a prompt (what the user would say to trigger it)
- Make suggestions actionable and relevant to their goals, not generic
- If they have goals, suggest actions aligned with those goals
- If they underuse features, suggest trying one
- If they have scheduled tasks, consider referencing related work
- If they have no goals yet, suggest setting some or exploring features
- NEVER suggest the same generic actions. Be creative and specific to THIS user.

Respond with JSON:
{
  "greeting": "Your greeting message",
  "suggestions": [
    { "label": "Short action label", "description": "Brief description", "prompt": "What the user would say" },
    { "label": "Short action label", "description": "Brief description", "prompt": "What the user would say" },
    { "label": "Short action label", "description": "Brief description", "prompt": "What the user would say" }
  ]
}`;

        const greetingResult = await model.generateContent([{ text: greetingPrompt }]);
        const greetingText = greetingResult.response.text();
        const jsonMatch = greetingText.match(/\{[\s\S]*\}/);

        let greeting = `Good ${timeOfDay}, ${userName || 'there'}! I'm ${agentName}, ready to help.`;
        let suggestions = [
          { label: 'Help me with daily tasks', description: 'Action items, summaries, and follow-ups', prompt: 'Help me with daily tasks' },
          { label: 'Review my goals and priorities', description: 'Check progress on what matters most', prompt: 'Review my goals and priorities' },
          { label: 'Explore AI features', description: 'Discover tools to boost productivity', prompt: 'Help me explore AI Rocket features' }
        ];

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.greeting) greeting = parsed.greeting;
            if (parsed.suggestions?.length >= 2) suggestions = parsed.suggestions.slice(0, 3);
          } catch {
            console.log('Greeting JSON parse failed, using defaults');
          }
        }

        return new Response(
          JSON.stringify({ greeting, suggestions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (greetErr) {
        console.error('Greeting generation error:', greetErr);
        return new Response(
          JSON.stringify({
            greeting: `Hello! I'm ready to help you today.`,
            suggestions: [
              { label: 'Help me with daily tasks', description: 'Action items, summaries, and follow-ups', prompt: 'Help me with daily tasks' },
              { label: 'Review my goals', description: 'Check progress on priorities', prompt: 'Review my goals and priorities' },
              { label: 'Explore features', description: 'Discover AI tools available', prompt: 'Help me explore AI Rocket features' }
            ]
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let systemPrompt: string;
    const isOnboarding = onboardingState && ['priorities', 'preferences', 'education'].includes(onboardingState.phase);

    const { data: syncStats } = await supabase.rpc('get_document_sync_stats', { p_team_id: teamId });
    const actualDocumentCount = syncStats && typeof syncStats === 'object' && !Array.isArray(syncStats)
      ? (syncStats as Record<string, number>).total_documents || 0
      : Array.isArray(syncStats) ? (syncStats[0]?.total_documents || 0) : 0;

    const enrichedAppContext = {
      ...(appContext || {}),
      documentCount: actualDocumentCount
    };

    const { data: knowledgeData } = await supabase
      .from('platform_knowledge')
      .select('id, content')
      .in('id', ['features', 'navigation_targets']);

    let platformCapabilities = DEFAULT_PLATFORM_CAPABILITIES;
    let navigationTargets = NAVIGATION_TARGETS;

    if (knowledgeData) {
      const featuresRow = knowledgeData.find(k => k.id === 'features');
      const navRow = knowledgeData.find(k => k.id === 'navigation_targets');

      if (featuresRow?.content && featuresRow.content.length > 100) {
        platformCapabilities = featuresRow.content;
      }
      if (navRow?.content) {
        try {
          const parsed = JSON.parse(navRow.content);
          if (Object.keys(parsed).length > 0) {
            navigationTargets = parsed;
          }
        } catch (e) {
          console.log('Using default navigation targets');
        }
      }
    }

    let preExtractedTokens: string[] = [];

    if (isOnboarding) {
      if (isMemberOnboarding && onboardingState.phase === 'priorities') {
        const { data: teamPriors } = await supabase
          .from('team_priorities')
          .select('priority_type, priority_value')
          .eq('team_id', teamId)
          .eq('priority_type', 'ai_goals');
        const teamGoals = (teamPriors || []).map((p: { priority_value: string }) => p.priority_value);
        agentContext.teamPriorities = { ai_goals: teamGoals, improvement_areas: [], recurring_tasks: [] };
      }
      preExtractedTokens = preExtractPreferencesFromMessage(conversationHistory || [], onboardingState);
      if (preExtractedTokens.length > 0) {
        onboardingState.preferencesCollected = [
          ...(onboardingState.preferencesCollected || []),
          ...preExtractedTokens.filter(t => !(onboardingState.preferencesCollected || []).includes(t))
        ];
      }
      systemPrompt = buildOnboardingPrompt(agentContext, onboardingState, conversationHistory || [], isAdmin, platformCapabilities, isMemberOnboarding, actualDocumentCount);
    } else {
      const { data: priorities } = await supabase
        .from('team_priorities')
        .select('priority_type, priority_value')
        .eq('team_id', teamId);

      const teamPriorities: AgentContext['teamPriorities'] = {
        ai_goals: [],
        improvement_areas: [],
        recurring_tasks: []
      };

      if (priorities) {
        for (const p of priorities) {
          if (p.priority_type === 'ai_goals') teamPriorities.ai_goals?.push(p.priority_value);
          else if (p.priority_type === 'improvement_areas') teamPriorities.improvement_areas?.push(p.priority_value);
          else if (p.priority_type === 'recurring_tasks') teamPriorities.recurring_tasks?.push(p.priority_value);
        }
      }

      const { data: userPriorityRows } = await supabase
        .from('user_priorities')
        .select('priority_type, priority_value')
        .eq('user_id', user.id);

      const userPriorities: AgentContext['userPriorities'] = {
        personal_goals: [],
        focus_areas: [],
        recurring_tasks: []
      };

      if (userPriorityRows) {
        for (const p of userPriorityRows) {
          if (p.priority_type === 'personal_goals') userPriorities.personal_goals?.push(p.priority_value);
          else if (p.priority_type === 'focus_areas') userPriorities.focus_areas?.push(p.priority_value);
          else if (p.priority_type === 'recurring_tasks') userPriorities.recurring_tasks?.push(p.priority_value);
        }
      }

      const { data: impactData } = await supabase
        .from('user_impact_progress')
        .select(`
          feature_key,
          is_completed,
          custom_priority,
          user_impact_items (
            feature_name,
            feature_description,
            priority_rank,
            action_type,
            action_target
          )
        `)
        .eq('user_id', user.id)
        .order('custom_priority', { ascending: true, nullsFirst: false });

      const impactItems: ImpactItem[] = (impactData || []).map((item: Record<string, unknown>) => {
        const itemData = item.user_impact_items as Record<string, unknown> | null;
        return {
          feature_key: item.feature_key as string,
          feature_name: itemData?.feature_name as string || '',
          feature_description: itemData?.feature_description as string || '',
          priority_rank: itemData?.priority_rank as number || 100,
          action_type: itemData?.action_type as string | null,
          action_target: itemData?.action_target as string | null,
          is_completed: item.is_completed as boolean,
          custom_priority: item.custom_priority as number | null
        };
      });

      const calendarEventsPromise = (async () => {
        try {
          const connResult = await supabase
            .from('user_drive_connections')
            .select('access_token, google_account_email')
            .eq('team_id', teamId)
            .eq('provider', 'google')
            .eq('is_active', true)
            .maybeSingle();

          if (!connResult.data?.access_token) return [];

          const now = new Date();
          const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const params = new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: weekAhead.toISOString(),
            maxResults: '15',
            singleEvents: 'true',
            orderBy: 'startTime',
            fields: 'items(id,summary,start,end,location,hangoutLink,conferenceData)'
          });

          const resp = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            { headers: { Authorization: `Bearer ${connResult.data.access_token}` } }
          );

          if (!resp.ok) return [];
          const data = await resp.json();
          return (data.items || []).map((e: any) => ({
            summary: e.summary || 'No title',
            startTime: e.start?.dateTime || e.start?.date || '',
            endTime: e.end?.dateTime || e.end?.date || '',
            location: e.location || undefined,
            meetLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri || undefined
          }));
        } catch {
          return [];
        }
      })();

      const integrationsPromise = (async () => {
        try {
          const { data: userIntegrations } = await supabase
            .from('user_integrations')
            .select('integration_id, status, connected_account_email, times_used_by_agent, integration_registry(provider_name, provider_slug, provider_category, capabilities)')
            .eq('user_id', user.id);

          const { data: allAvailable } = await supabase
            .from('integration_registry')
            .select('id, provider_name, provider_slug, provider_category, capabilities')
            .eq('status', 'available')
            .neq('provider_slug', 'google-drive')
            .neq('provider_slug', 'microsoft-onedrive');

          const connectedIds = new Set((userIntegrations || []).map((ui: any) => ui.integration_id));

          const connected = (userIntegrations || [])
            .filter((ui: any) => ui.status === 'active')
            .map((ui: any) => ({
              provider_name: ui.integration_registry?.provider_name || '',
              provider_slug: ui.integration_registry?.provider_slug || '',
              category: ui.integration_registry?.provider_category || '',
              status: ui.status,
              capabilities: ui.integration_registry?.capabilities || [],
              account_email: ui.connected_account_email,
              times_used: ui.times_used_by_agent || 0
            }));

          const available = (allAvailable || [])
            .filter((ir: any) => !connectedIds.has(ir.id))
            .map((ir: any) => ({
              provider_name: ir.provider_name,
              provider_slug: ir.provider_slug,
              category: ir.provider_category,
              capabilities: ir.capabilities || []
            }));

          return { connected, available };
        } catch {
          return { connected: [], available: [] };
        }
      })();

      const mcpToolsPromise = (async () => {
        try {
          const { data: tools } = await supabase
            .from('mcp_tools')
            .select('display_name, description, category, is_read_only, usage_count, mcp_servers(name, server_type)')
            .eq('team_id', teamId)
            .eq('is_enabled', true)
            .limit(50);

          const { data: customApis } = await supabase
            .from('custom_api_definitions')
            .select('api_name, description, category, status')
            .eq('team_id', teamId)
            .eq('status', 'active');

          return {
            mcpTools: (tools || []).map((t: any) => ({
              name: t.display_name,
              description: t.description,
              category: t.category,
              read_only: t.is_read_only,
              used: t.usage_count || 0,
              server: t.mcp_servers?.name || 'Unknown'
            })),
            customApis: (customApis || []).map((a: any) => ({
              name: a.api_name,
              description: a.description,
              category: a.category
            }))
          };
        } catch {
          return { mcpTools: [], customApis: [] };
        }
      })();

      const activeSkillsPromise = (async () => {
        try {
          const { data } = await supabase
            .from('user_active_skills')
            .select('skill_id, usage_count, assistant_skills(skill_key, name, capability_areas, prompt_enhancement, related_features)')
            .eq('user_id', user.id);
          return (data || []).map((s: any) => ({
            skill_key: s.assistant_skills?.skill_key || '',
            name: s.assistant_skills?.name || '',
            capability_areas: s.assistant_skills?.capability_areas || [],
            prompt_enhancement: s.assistant_skills?.prompt_enhancement || '',
            related_features: s.assistant_skills?.related_features || [],
            usage_count: s.usage_count || 0
          }));
        } catch {
          return [];
        }
      })();

      const [agentSettingsRes, prefsRes, featureUsageRes, taskRecsRes, calendarEvents, integrations, mcpToolsData, activeSkills] = await Promise.all([
        supabase.from('team_agent_settings').select('personality').eq('team_id', teamId).maybeSingle(),
        supabase.from('user_assistant_preferences').select('proactive_level').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_feature_usage').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('task_recommendations').select('title').eq('is_active', true).order('sort_order').limit(20),
        calendarEventsPromise,
        integrationsPromise,
        mcpToolsPromise,
        activeSkillsPromise
      ]);

      const featureUsageMap: Record<string, { count: number; last_used: string | null }> = {};
      if (featureUsageRes.data) {
        const fu = featureUsageRes.data as Record<string, unknown>;
        const featureKeys = ['ask_astra', 'visualizations', 'scheduled_reports', 'team_chat', 'drive_sync', 'local_uploads'];
        for (const key of featureKeys) {
          featureUsageMap[key] = {
            count: (fu[`${key}_count`] as number) || 0,
            last_used: (fu[`${key}_last_used`] as string) || null
          };
        }
      }

      const personalization: PersonalizationData = {
        personality: agentSettingsRes.data?.personality as PersonalizationData['personality'],
        proactiveLevel: prefsRes.data?.proactive_level as string,
        featureUsage: featureUsageMap,
        taskRecommendations: (taskRecsRes.data || []).map((r: { title: string }) => r.title),
        activeSkills: activeSkills
      };

      const enrichedContext: AgentContext = { ...agentContext, teamPriorities, userPriorities, isAdmin, upcomingCalendarEvents: calendarEvents, connectedIntegrations: integrations.connected, availableIntegrations: integrations.available, mcpTools: mcpToolsData.mcpTools, customApis: mcpToolsData.customApis };
      systemPrompt = buildGeneralPrompt(enrichedContext, enrichedAppContext, conversationHistory || [], impactItems, isAdmin, platformCapabilities, navigationTargets, personalization);
    }

    let result;
    try {
      result = await model.generateContent([
        { text: systemPrompt },
        { text: `User: ${userMessage}\n\nRespond with JSON:` }
      ]);
    } catch (genError) {
      console.error("Gemini API error:", genError);
      return new Response(
        JSON.stringify({
          message: "I'm having trouble processing that right now. Could you try again?",
          action: { type: 'none' },
          onboarding: isOnboarding ? {
            extractedPriorities: [],
            extractedPreferences: [],
            phaseComplete: false,
            nextPhase: null
          } : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseText = result.response.text();
    console.log("Raw Gemini response:", responseText.substring(0, 500));

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let parsedResponse;

    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      try {
        parsedResponse = JSON.parse(jsonStr);
      } catch (_firstError) {
        try {
          jsonStr = jsonStr.replace(/"(?:[^"\\]|\\.)*"/gs, (match) =>
            match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
          );
          parsedResponse = JSON.parse(jsonStr);
        } catch (_secondError) {
          const msgMatch = responseText.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
          const extractedMsg = msgMatch ? msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : null;
          if (extractedMsg) {
            parsedResponse = { message: extractedMsg, action: { type: 'none' } };

            const prefsMatch = responseText.match(/"extractedPreferences"\s*:\s*\[(.*?)\]/s);
            const phaseMatch = responseText.match(/"phaseComplete"\s*:\s*(true|false)/);
            const nextPhaseMatch = responseText.match(/"nextPhase"\s*:\s*"(\w+)"/);
            if (prefsMatch || phaseMatch) {
              parsedResponse.onboarding = {
                extractedPreferences: prefsMatch
                  ? prefsMatch[1].match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, '')) || []
                  : [],
                phaseComplete: phaseMatch ? phaseMatch[1] === 'true' : false,
                nextPhase: nextPhaseMatch ? nextPhaseMatch[1] : null
              };
            }
          } else {
            parsedResponse = {
              message: responseText.replace(/```json|```/g, '').replace(/^\s*\{[\s\S]*?"message"\s*:\s*"/s, '').replace(/"\s*,\s*"action[\s\S]*$/s, '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() || responseText.replace(/```json|```/g, '').trim(),
              action: { type: 'none' }
            };
          }
        }
      }
    } else {
      parsedResponse = {
        message: responseText.replace(/```json|```/g, '').trim(),
        action: { type: 'none' }
      };
    }

    if (isOnboarding && parsedResponse.onboarding) {
      const { extractedPriorities, phaseComplete, nextPhase, educationTopic } = parsedResponse.onboarding;
      let extractedPreferences: string[] = parsedResponse.onboarding.extractedPreferences || [];

      if (extractedPreferences.length > 0 && onboardingState?.phase === 'preferences') {
        const normalized: string[] = [];
        for (const pref of extractedPreferences) {
          const lp = pref.toLowerCase();
          normalized.push(pref);
          if ((lp.includes('all of them') || lp === 'all' || lp.includes('all notification') || lp.includes('everything')) && !lp.includes('notify_all')) {
            normalized.push('notify_all');
          }
          if (lp.includes('daily summar') && !lp.includes('notify_daily')) normalized.push('notify_daily_summary');
          if ((lp.includes('report notif') || lp.includes('report ready')) && !lp.includes('notify_report')) normalized.push('notify_report_ready');
          if (lp.includes('goal') && lp.includes('milestone') && !lp.includes('notify_goal')) normalized.push('notify_goal_milestone');
          if (lp.includes('meeting') && lp.includes('remind') && !lp.includes('notify_meeting')) normalized.push('notify_meeting_reminder');
          if (lp.includes('action item') && !lp.includes('notify_action')) normalized.push('notify_action_item_due');
          if (lp.includes('weekly') && (lp.includes('recap') || lp.includes('digest')) && !lp.includes('notify_weekly')) normalized.push('notify_weekly_recap');
          if (lp.includes('insight') && !lp.includes('notify_insight')) normalized.push('notify_insight_discovered');
          if (lp.includes('none') && lp.includes('now') && !lp.includes('notify_none')) normalized.push('notify_none');
          if (/\bemail\b/.test(lp) && !lp.includes('channel_email')) normalized.push('channel_email');
          if ((/\bsms\b/.test(lp) || /\btext\b/.test(lp)) && !lp.includes('channel_sms')) normalized.push('channel_sms');
          if (/\bwhatsapp\b/.test(lp) && !lp.includes('channel_whatsapp')) normalized.push('channel_whatsapp');
          if ((lp.includes('in-app') || lp.includes('in app') || lp.includes('app only')) && !lp.includes('channel_in_app')) normalized.push('channel_in_app_only');
          if (lp.includes('high') && (lp.includes('proactiv') || lp.includes('check in')) && !lp.includes('proactive_high')) normalized.push('proactive_high');
          if (lp.includes('medium') && lp.includes('proactiv') && !lp.includes('proactive_medium')) normalized.push('proactive_medium');
          if (lp.includes('low') && lp.includes('proactiv') && !lp.includes('proactive_low')) normalized.push('proactive_low');
        }
        extractedPreferences = [...new Set(normalized)];
        parsedResponse.onboarding.extractedPreferences = extractedPreferences;
      }

      const userMsgText = userMessage?.toLowerCase() || '';
      if (onboardingState?.phase === 'preferences' && extractedPreferences.length === 0) {
        const fallbackPrefs: string[] = [];
        if (/\ball\b/.test(userMsgText) && (userMsgText.includes('them') || userMsgText.includes('notification') || userMsgText.length < 40)) {
          fallbackPrefs.push('notify_all');
        }
        if (/\bemail\b/.test(userMsgText)) fallbackPrefs.push('channel_email');
        if (/\bsms\b/.test(userMsgText) || /\btext\b/.test(userMsgText)) fallbackPrefs.push('channel_sms');
        if (/\bwhatsapp\b/.test(userMsgText)) fallbackPrefs.push('channel_whatsapp');
        if (/\bhigh\b/.test(userMsgText)) fallbackPrefs.push('proactive_high');
        if (/\bmedium\b/.test(userMsgText)) fallbackPrefs.push('proactive_medium');
        if (/\blow\b/.test(userMsgText)) fallbackPrefs.push('proactive_low');
        if (fallbackPrefs.length > 0) {
          extractedPreferences = fallbackPrefs;
          parsedResponse.onboarding.extractedPreferences = extractedPreferences;
        }
      }

      if (onboardingState?.phase === 'preferences' && preExtractedTokens.length > 0) {
        const merged = [...new Set([...extractedPreferences, ...preExtractedTokens])];
        extractedPreferences = merged;
        parsedResponse.onboarding.extractedPreferences = extractedPreferences;
      }

      if (extractedPriorities?.length > 0) {
        if (isMemberOnboarding) {
          for (const priority of extractedPriorities) {
            if (priority && priority.trim()) {
              await supabase.from('user_priorities').insert({
                user_id: user.id,
                team_id: teamId,
                priority_type: 'personal_goals',
                priority_value: priority.trim(),
                source: 'onboarding'
              });
            }
          }
        } else if (isAdmin) {
          for (const priority of extractedPriorities) {
            if (priority && priority.trim()) {
              await supabase.from('team_priorities').insert({
                team_id: teamId,
                user_id: user.id,
                priority_type: 'ai_goals',
                priority_value: priority.trim(),
                source: 'onboarding'
              });
            }
          }
        }
      }

      if (onboardingState.phase === 'preferences' && extractedPreferences?.length > 0 && (isAdmin || isMemberOnboarding)) {
        const currentPrefs = onboardingState.preferencesCollected || [];
        const allPrefs = [...currentPrefs, ...extractedPreferences];

        const personalityTraits: string[] = [];
        let proactiveEnabled = false;
        let proactiveLevel: 'low' | 'medium' | 'high' = 'medium';
        let emailEnabled = false;
        let smsEnabled = false;
        let whatsappEnabled = false;
        let inAppOnly = false;

        const notificationTypes: Record<string, boolean> = {
          daily_summary: false,
          report_ready: false,
          goal_milestone: false,
          meeting_reminder: false,
          action_item_due: false,
          weekly_recap: false,
          insight_discovered: false,
          sync_complete: false,
          team_mention: true
        };
        let hasNotifyAll = false;
        let hasNotifyNone = false;

        for (const pref of allPrefs) {
          const lowerPref = pref.toLowerCase();

          if (lowerPref.includes('playful') || lowerPref.includes('witty') || lowerPref.includes('adventurous') ||
              lowerPref.includes('grit') || lowerPref.includes('creative') || lowerPref.includes('analytical') ||
              lowerPref.includes('empathetic') || lowerPref.includes('encouraging') || lowerPref.includes('supportive')) {
            personalityTraits.push(pref.trim());
          }

          if (lowerPref.includes('proactive_high') || lowerPref.includes('check in often') || lowerPref.includes('suggest often')) {
            proactiveEnabled = true;
            proactiveLevel = 'high';
          } else if (lowerPref.includes('proactive_medium') || lowerPref.includes('balanced') || lowerPref.includes('moderate')) {
            proactiveEnabled = true;
            proactiveLevel = 'medium';
          } else if (lowerPref.includes('proactive_low') || lowerPref.includes('reactive') || lowerPref.includes('wait') || lowerPref.includes('only when i ask') || lowerPref.includes('only when asked')) {
            proactiveEnabled = false;
            proactiveLevel = 'low';
          } else if (lowerPref.includes('proactive') || lowerPref.includes('suggest') || lowerPref.includes('check in')) {
            proactiveEnabled = true;
            proactiveLevel = 'high';
          }

          if (lowerPref.includes('brief') || lowerPref.includes('concise') || lowerPref.includes('short')) {
            personalityTraits.push('brief');
          } else if (lowerPref.includes('detailed') || lowerPref.includes('thorough') || lowerPref.includes('comprehensive')) {
            personalityTraits.push('detailed');
          }
          if (lowerPref.includes('formal') || lowerPref.includes('professional')) {
            personalityTraits.push(pref.trim());
          } else if (lowerPref.includes('casual') || lowerPref.includes('friendly') || lowerPref.includes('warm') || lowerPref.includes('direct')) {
            personalityTraits.push(pref.trim());
          }

          if (lowerPref.includes('notify_daily_summary')) notificationTypes.daily_summary = true;
          if (lowerPref.includes('notify_report_ready')) notificationTypes.report_ready = true;
          if (lowerPref.includes('notify_goal_milestone')) notificationTypes.goal_milestone = true;
          if (lowerPref.includes('notify_meeting_reminder')) notificationTypes.meeting_reminder = true;
          if (lowerPref.includes('notify_action_item_due')) notificationTypes.action_item_due = true;
          if (lowerPref.includes('notify_weekly_recap')) notificationTypes.weekly_recap = true;
          if (lowerPref.includes('notify_insight_discovered')) notificationTypes.insight_discovered = true;
          if (lowerPref.includes('notify_all')) hasNotifyAll = true;
          if (lowerPref.includes('notify_none')) hasNotifyNone = true;

          if (lowerPref.includes('channel_email')) emailEnabled = true;
          if (lowerPref.includes('channel_sms')) smsEnabled = true;
          if (lowerPref.includes('channel_whatsapp')) whatsappEnabled = true;
          if (lowerPref.includes('channel_in_app_only')) inAppOnly = true;
        }

        if (hasNotifyAll) {
          Object.keys(notificationTypes).forEach(k => { notificationTypes[k] = true; });
        }
        if (hasNotifyNone) {
          Object.keys(notificationTypes).forEach(k => { notificationTypes[k] = false; });
          notificationTypes.team_mention = true;
        }

        if (inAppOnly) {
          emailEnabled = false;
          smsEnabled = false;
          whatsappEnabled = false;
        }

        const prefsData: Record<string, unknown> = {
          user_id: user.id,
          proactive_enabled: proactiveEnabled,
          proactive_level: proactiveLevel,
          email_enabled: emailEnabled,
          sms_enabled: smsEnabled,
          whatsapp_enabled: whatsappEnabled,
          notification_types: notificationTypes,
          updated_at: new Date().toISOString()
        };

        const prefsResult = await supabase.from('user_assistant_preferences').upsert(
          prefsData, { onConflict: 'user_id' }
        );

        console.log('Preferences save result:', prefsResult.error ? prefsResult.error : 'Success');

        if (phaseComplete && personalityTraits.length > 0 && isAdmin) {
          const personalityData: Record<string, string> = {
            traits: personalityTraits.join(', '),
            proactivity: proactiveLevel
          };

          await supabase.from('team_agent_settings')
            .update({ agent_personality: personalityData })
            .eq('team_id', teamId);
        }

        if (phaseComplete && isMemberOnboarding) {
          await supabase.from('user_assistant_preferences').upsert({
            user_id: user.id,
            member_onboarding_completed: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        }
      }

      if (educationTopic && educationTopic !== 'skipped') {
        await supabase.from('user_onboarding_education').upsert({
          user_id: user.id,
          education_key: educationTopic,
          viewed_at: new Date().toISOString()
        }, { onConflict: 'user_id,education_key' });
      }

      return new Response(
        JSON.stringify({
          message: parsedResponse.message,
          action: parsedResponse.action || { type: 'none' },
          onboarding: {
            extractedPriorities: extractedPriorities || [],
            extractedPreferences: extractedPreferences || [],
            phaseComplete: phaseComplete || false,
            nextPhase: nextPhase || null,
            educationTopic: educationTopic || null
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (parsedResponse.updateTeamPreference && isAdmin) {
      const prefUpdate = parsedResponse.updateTeamPreference;
      if (prefUpdate.type && prefUpdate.value) {
        const currentSettings = await supabase
          .from('team_agent_settings')
          .select('personality')
          .eq('team_id', teamId)
          .single();

        const currentPersonality = currentSettings.data?.personality || {};
        const updatedPersonality = { ...currentPersonality, [prefUpdate.type]: prefUpdate.value };

        await supabase.from('team_agent_settings')
          .update({ personality: updatedPersonality })
          .eq('team_id', teamId);
      }
    }

    if (parsedResponse.settingsUpdate) {
      const update = parsedResponse.settingsUpdate;
      try {
        if (update.type === 'proactive_level' && update.value) {
          const level = update.value.toLowerCase();
          if (['low', 'medium', 'high'].includes(level)) {
            await supabase.from('user_assistant_preferences').upsert({
              user_id: user.id,
              proactive_level: level,
              proactive_enabled: level !== 'low',
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          }
        }

        if (update.type === 'notification_types' && update.updates) {
          const { data: currentPrefs } = await supabase
            .from('user_assistant_preferences')
            .select('notification_types')
            .eq('user_id', user.id)
            .maybeSingle();

          const currentTypes = currentPrefs?.notification_types || {};
          const merged = { ...currentTypes, ...update.updates };

          await supabase.from('user_assistant_preferences').upsert({
            user_id: user.id,
            notification_types: merged,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        }

        if (update.type === 'notification_channels') {
          const channelUpdate: Record<string, unknown> = {
            user_id: user.id,
            updated_at: new Date().toISOString()
          };
          if (update.email !== undefined) channelUpdate.email_enabled = update.email;
          if (update.sms !== undefined) channelUpdate.sms_enabled = update.sms;
          if (update.whatsapp !== undefined) channelUpdate.whatsapp_enabled = update.whatsapp;
          if (update.telegram !== undefined) channelUpdate.telegram_enabled = update.telegram;
          if (update.email_address) channelUpdate.email_address = update.email_address;
          if (update.sms_phone_number) channelUpdate.sms_phone_number = update.sms_phone_number;
          if (update.whatsapp_number) channelUpdate.whatsapp_number = update.whatsapp_number;
          if (update.telegram_chat_id) channelUpdate.telegram_chat_id = update.telegram_chat_id;

          await supabase.from('user_assistant_preferences').upsert(
            channelUpdate, { onConflict: 'user_id' }
          );
        }

        if (update.type === 'quiet_hours') {
          const qhUpdate: Record<string, unknown> = {
            user_id: user.id,
            updated_at: new Date().toISOString()
          };
          if (update.enabled !== undefined) qhUpdate.quiet_hours_enabled = update.enabled;
          if (update.start) qhUpdate.quiet_hours_start = update.start;
          if (update.end) qhUpdate.quiet_hours_end = update.end;
          if (update.timezone) qhUpdate.quiet_hours_timezone = update.timezone;

          await supabase.from('user_assistant_preferences').upsert(
            qhUpdate, { onConflict: 'user_id' }
          );
        }

        if (update.type === 'personal_priorities' && update.values?.length > 0) {
          if (update.action === 'replace') {
            await supabase.from('user_priorities')
              .delete()
              .eq('user_id', user.id)
              .eq('team_id', teamId)
              .eq('priority_type', 'personal_goals');
          }
          for (const val of update.values) {
            if (val && val.trim()) {
              await supabase.from('user_priorities').insert({
                user_id: user.id,
                team_id: teamId,
                priority_type: 'personal_goals',
                priority_value: val.trim(),
                source: 'conversation'
              });
            }
          }
        }

        if (update.type === 'team_priorities' && isAdmin && update.values?.length > 0) {
          if (update.action === 'replace') {
            await supabase.from('team_priorities')
              .delete()
              .eq('team_id', teamId)
              .eq('priority_type', 'ai_goals');
          }
          for (const val of update.values) {
            if (val && val.trim()) {
              await supabase.from('team_priorities').insert({
                team_id: teamId,
                user_id: user.id,
                priority_type: 'ai_goals',
                priority_value: val.trim(),
                source: 'conversation'
              });
            }
          }
        }

        if (update.type === 'personality' && update.traits?.length > 0) {
          if (isAdmin) {
            const currentSettings = await supabase
              .from('team_agent_settings')
              .select('agent_personality')
              .eq('team_id', teamId)
              .maybeSingle();

            const current = currentSettings.data?.agent_personality || {};
            await supabase.from('team_agent_settings')
              .update({ agent_personality: { ...current, traits: update.traits.join(', ') } })
              .eq('team_id', teamId);
          }
        }

        console.log('Settings update processed:', update.type);
      } catch (settingsErr) {
        console.error('Error processing settings update:', settingsErr);
      }
    }

    if (parsedResponse.skillUpdate) {
      try {
        const su = parsedResponse.skillUpdate;
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: skillRow } = await serviceClient
          .from('assistant_skills')
          .select('id')
          .eq('skill_key', su.skill_key)
          .eq('is_active', true)
          .maybeSingle();

        if (skillRow) {
          if (su.action === 'activate') {
            await serviceClient.from('user_active_skills').upsert({
              user_id: user.id,
              team_id: teamId,
              skill_id: skillRow.id,
              activated_at: new Date().toISOString()
            }, { onConflict: 'user_id,skill_id' });
          } else if (su.action === 'deactivate') {
            await serviceClient.from('user_active_skills')
              .delete()
              .eq('user_id', user.id)
              .eq('skill_id', skillRow.id);
          }
          console.log(`Skill ${su.action}: ${su.skill_key}`);
        }
      } catch (skillErr) {
        console.error('Error processing skill update:', skillErr);
      }
    }

    if (parsedResponse.action?.type === 'schedule_task' && parsedResponse.scheduledTask) {
      try {
        const taskPayload = parsedResponse.scheduledTask;
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const createTaskResponse = await fetch(
          `${supabaseUrl}/functions/v1/create-scheduled-task`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || '',
            },
            body: JSON.stringify({
              title: taskPayload.title || 'Scheduled Task',
              description: taskPayload.description || '',
              task_type: taskPayload.task_type || 'custom',
              frequency: taskPayload.frequency || 'once',
              schedule_day: taskPayload.schedule_day ?? null,
              schedule_hour: taskPayload.schedule_hour ?? 9,
              schedule_minute: taskPayload.schedule_minute ?? 0,
              timezone: taskPayload.timezone || 'America/New_York',
              ai_prompt: taskPayload.ai_prompt || taskPayload.description || '',
              delivery_method: taskPayload.delivery_method || 'conversation',
              max_runs: taskPayload.max_runs || null,
              metadata: { created_via: 'assistant_conversation' },
            }),
          }
        );
        const taskResult = await createTaskResponse.json();
        if (taskResult.success) {
          parsedResponse.scheduledTaskResult = {
            success: true,
            taskId: taskResult.task.id,
            nextRunAt: taskResult.task.next_run_at,
          };
          console.log('Scheduled task created:', taskResult.task.id);
        } else {
          console.error('Failed to create scheduled task:', taskResult.error);
          parsedResponse.scheduledTaskResult = { success: false, error: taskResult.error };
        }
      } catch (scheduleErr) {
        console.error('Error creating scheduled task:', scheduleErr);
        parsedResponse.scheduledTaskResult = { success: false, error: String(scheduleErr) };
      }
    }

    if (parsedResponse.suggestedImpactItems?.length > 0) {
      const { data: impactItems } = await supabase
        .from('user_impact_progress')
        .select('feature_key, user_impact_items(feature_key, feature_name, feature_description, action_type, action_target)')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .in('feature_key', parsedResponse.suggestedImpactItems);

      if (impactItems && impactItems.length > 0) {
        parsedResponse.impactSuggestions = impactItems
          .filter((p: Record<string, unknown>) => p.user_impact_items)
          .map((p: Record<string, unknown>) => {
            const item = p.user_impact_items as Record<string, unknown>;
            return {
              feature_key: item.feature_key,
              feature_name: item.feature_name,
              feature_description: item.feature_description,
              action_type: item.action_type,
              action_target: item.action_target
            };
          });
      }
    }

    const msgLower = (parsedResponse.message || '').toLowerCase();
    const isSendToAgent = parsedResponse.action?.type === 'send_to_agent';
    const mentionsSuggestions = msgLower.includes('help you with') ||
      msgLower.includes('can also') ||
      msgLower.includes('other things') ||
      msgLower.includes('high-impact') ||
      msgLower.includes('meanwhile') ||
      msgLower.includes('in the meantime') ||
      msgLower.includes('while that') ||
      msgLower.includes('while the agent') ||
      msgLower.includes('i can help you') ||
      msgLower.includes('ways i can help') ||
      msgLower.includes('here are a few');

    const isLiveMode = agentContext?.currentOnboardingStep === 'live' || agentContext?.currentOnboardingStep === 'complete' || agentContext?.currentOnboardingStep === 'general';

    if (!isLiveMode && (isSendToAgent || mentionsSuggestions) && (!parsedResponse.impactSuggestions || parsedResponse.impactSuggestions.length === 0)) {
      const { data: userProgress } = await supabase
        .from('user_impact_progress')
        .select('feature_key, user_impact_items(feature_key, feature_name, feature_description, action_type, action_target)')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .not('user_impact_items.feature_key', 'is', null)
        .limit(3);

      if (userProgress && userProgress.length > 0) {
        parsedResponse.impactSuggestions = userProgress
          .filter((p: Record<string, unknown>) => p.user_impact_items)
          .map((p: Record<string, unknown>) => {
            const item = p.user_impact_items as Record<string, unknown>;
            return {
              feature_key: item.feature_key,
              feature_name: item.feature_name,
              feature_description: item.feature_description,
              action_type: item.action_type,
              action_target: item.action_target
            };
          });
      }
    }

    return new Response(
      JSON.stringify({
        message: parsedResponse.message || "I'm not sure how to help with that. Could you rephrase?",
        action: parsedResponse.action || { type: 'none' },
        shouldQueryData: parsedResponse.shouldQueryData || false,
        dataQuery: parsedResponse.dataQuery || null,
        impactSuggestions: parsedResponse.impactSuggestions || null,
        scheduledTaskResult: parsedResponse.scheduledTaskResult || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in team-agent-chat:", error);
    return new Response(
      JSON.stringify({
        message: "I encountered an issue processing that. Let me try to help differently - what would you like to do?",
        action: { type: 'none' }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
