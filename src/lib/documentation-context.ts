// This file contains documentation context for the Help Assistant
// It combines information from various .md files in the project
// NOTE: Feature information is now auto-generated from AI_ROCKET_KEY_FEATURES.md
// This file contains detailed how-to guides and setup instructions

export const DOCUMENTATION_CONTEXT = `
# AI Rocket Documentation

## Cloud Storage Integration Setup

### Overview
Astra can connect to your team's cloud storage to analyze documents and provide AI insights. We support both Google Drive and Microsoft OneDrive/SharePoint. Admins can configure which folders to sync and combine multiple providers for complete coverage.

### Supported Providers
- **Google Drive**: Connect your Google Workspace or personal Drive
- **Microsoft OneDrive/SharePoint**: Connect Microsoft 365 cloud storage (great for enterprise teams)
- **Multi-Provider Support**: Use Google, Microsoft, or both simultaneously

### Astra Guided Setup
When setting up cloud integration, admins can choose between:
- **Astra Guided Setup** (Recommended): Step-by-step walkthrough with examples and best practices
- **Manual Setup**: Direct folder selection for advanced users

### Guided Setup Features
- Educational content explaining the value of each data type
- Document examples for Strategy, Meetings, and Financial folders
- Sample prompts showing what you can ask after syncing
- Best practices for folder organization
- Save & Continue Later - resume setup anytime
- Progress tracking throughout the process

### Strategy Documents
Examples: Mission statements, quarterly OKRs, strategic plans, company values, annual planning materials, product strategy
Sample Prompt: "Analyze alignment between our mission and recent team meetings"

### Meeting Notes
Examples: Team meetings, 1-on-1s, sprint retrospectives, executive reviews, planning sessions
Sample Prompt: "Summarize key decisions from this week's meetings"

### Financial Documents
Examples: P&Ls, balance sheets, budget forecasts, expense reports, financial dashboards
Sample Prompt: "Summarize our financials and the alignment to our core values and mission"

## Local File Upload

### Overview
Upload files directly from your computer without needing Google Drive. Drag and drop or browse to upload documents that Astra can analyze immediately.

### Supported File Types
- PDF documents
- Microsoft Word (.docx, .doc)
- Microsoft Excel (.xlsx, .xls)
- Microsoft PowerPoint (.pptx, .ppt)
- Plain text files (.txt)
- Markdown files (.md)
- CSV files

### Upload Limits
- Maximum file size: 50 MB per file
- Maximum batch size: 10 files at once

### How to Upload Files
1. Navigate to Mission Control > Fuel Stage
2. Click "Upload Files" or drag and drop files onto the upload area
3. Wait for files to upload, verify, and classify
4. Files appear in your Documents list once processing completes

### AI Classification
After upload, Astra's AI automatically:
- Analyzes document content
- Determines the appropriate category (Strategy, Finance, Marketing, etc.)
- Makes the document searchable and queryable

### Security
- Files are stored in your team's private storage bucket
- Only team members can access uploaded files
- Data is encrypted in transit and at rest
- Each team's data is completely isolated

### When to Use Local Upload
- Documents not stored in Google Drive
- Email attachments you want Astra to analyze
- Downloaded reports from other systems
- Files from external sources

## Scheduled Reports

### Overview
Admins can create automated reports that run on a schedule (daily, weekly, or monthly). These reports execute automatically and deliver insights to the team without manual effort.

### Creating Scheduled Reports
1. Navigate to the Reports page
2. Click "Create New Report"
3. Select "Scheduled" as the report type
4. Choose frequency: Daily, Weekly, or Monthly
5. Set the time of day for report generation
6. Enter your report prompt (what you want Astra to analyze)
7. Save the report

### Report Features
- Automatic execution based on schedule
- Results appear in the Reports view
- Team-wide visibility
- Edit or delete reports anytime
- Manual run option for immediate results

## Team Dashboard

### Overview
Team Dashboard provides daily AI-powered insights on your team's goals, mission alignment, and overall health. It analyzes synced data and presents actionable metrics in a 3-panel layout.

### Three Panels
1. **Goals & Targets**: Track projects, OKRs, milestones, and KPIs with status indicators and progress percentages
2. **Mission Alignment**: See how well current work aligns with company mission and core values, with concrete examples
3. **Team Health**: Overall health score with metrics for data richness, engagement, meeting cadence, financial health, and risk indicators

### Access
- Agent Tools section on Mission Control > Team Dashboard tile
- Team Dashboard tab in Assistant Mode

### Features
- AI-generated recommendations based on current state
- Export to PDF for sharing with stakeholders
- Custom instructions to focus on metrics that matter to your team
- Daily automatic updates at midnight EST
- Manual regeneration on-demand for admins

## Category Data Access

### Overview
Category Data Access lets admins control which data categories each team member can access. Granular permissions for Strategy, Meetings, Financial, and Projects data.

### How It Works
- Per-user access controls managed by admins in User Settings > Team Members
- The AI automatically filters responses based on each user's permissions
- New team members get full access by default (admins can customize)
- Visual indicators show which categories each user can access
- Invite codes can include pre-configured category access for new users

## Assistant Mode

### Overview
Assistant Mode is a focused split-screen interface for working with the AI assistant. It provides a tabbed layout for productive daily use.

### Tabs Available
- **Mission Control**: Launch Points, stages, Agent Tools, and quick links
- **Agent Chat**: Private AI conversations with your data
- **Reports**: Create, view, and manage reports
- **Team Chat**: Collaborative team conversations
- **Connect**: My Connections, Apps, and MCP Tools
- **Skills**: Activate and manage AI capability modules

### Enabling
Go to User Settings and toggle "Assistant Mode" on. The interface switches to the tabbed layout. Toggle off to return to the classic view.

## Guided Task Builder

### Overview
The Guided Task Builder provides 16 pre-built task templates for quickly setting up useful scheduled tasks.

### Categories
- **Productivity**: Morning Goal Review, Daily Priorities Check, End of Day Summary, Focus Time Planner
- **Research & Intelligence**: Industry News Digest, Competitive Intelligence Brief, Market Trend Analysis, Technology Watch
- **Team & Alignment**: Weekly Progress Summary, Team Pulse Check, Meeting Action Items, Cross-Team Communication
- **Growth & Strategy**: Revenue Growth Analysis, New Opportunity Scanner, Customer Feedback Digest, Strategic Risk Assessment

### How to Use
1. Open the Scheduled Tasks panel and click "New Task"
2. Browse templates by category or check popular templates
3. Click a template to preview it
4. Customize title, AI instructions, frequency, time, and day
5. Click "Create Task" to activate

## Data Visualizations

### Creating Visualizations
1. During any conversation with Astra, click the "Create Visualizations" button
2. Astra analyzes the conversation and generates relevant charts
3. Click "Retry" to generate different visualization styles
4. Visualizations are private to you, even in Team mode

### Saving Visualizations
- Click "Save" on any visualization to add it to your library
- Access saved visualizations from the sidebar dropdown
- Export as PDF for presentations and sharing
- Organize your favorite insights for quick reference

## Team Collaboration

### Private vs Team Mode
- **Private Mode**: Personal conversations only you can see
- **Team Mode**: Collaborative discussions visible to all team members
- Switch modes using the toggle below the header

### @Mentions
- In Team mode, type @ to mention team members
- Mentioned users receive notifications
- Use @mentions to direct questions or comments to specific people

### Real-Time Sync
- All messages sync in real-time across devices
- See team activity as it happens
- Conversation history preserved for reference

## Admin Features

### Team Management
- Invite new members via email
- Assign admin or member roles
- View team activity and metrics
- Remove team members when needed
- Configure team-wide settings

### Cloud Storage Management
- Only admins can connect/disconnect cloud storage (Google Drive, Microsoft OneDrive/SharePoint)
- **Connect page > My Connections tab** is the central hub for managing all connections
- Connect new providers, reconnect expired tokens, manage folders, and disconnect -- all from one place
- Configure folder selections for the team
- View and manage synced documents from any provider
- Delete documents from Astra's index
- Use multiple providers simultaneously for complete data coverage
- Remove folders with option to keep or delete associated documents

### Scheduled Reports Management
- Create automated reports for the team
- Set report schedules and frequencies
- Edit or delete scheduled reports
- View all team reports

## User Settings

### Profile Management
- Update your name and profile information
- Manage notification preferences
- Access team settings (admins only)
- Restart the interactive tour

### Notification Preferences
- Control @mention notifications
- Manage system notifications
- Customize your alert settings

## Help & Support

### Getting Help
- **Quick Start Guide**: Overview of key features
- **What's New**: Latest features and improvements
- **FAQ**: Common questions and answers
- **Ask Astra**: AI-powered help assistant

### Interactive Tour
- Comprehensive walkthrough of the platform
- Different tours for admins and members
- Restart anytime from User Settings or Help Center
- Step-by-step feature explanations

## Proactive Assistant (Preview)

### Overview
The Proactive Assistant is a Preview feature that transforms AI Rocket from a reactive chatbot into a proactive digital coworker. It monitors your business data overnight and delivers personalized insights each morning -- so you stay informed without having to ask.

### How It Works
Each night at 3 AM EST, the assistant analyzes your team's data through four lenses:
1. **Deviation Detection**: Identifies metrics that are significantly different from baseline
2. **Goal Alignment Check**: Evaluates progress toward your stated priorities
3. **Automation Opportunity**: Pre-generates work you normally do manually
4. **Predictive Risk**: Identifies problems that may emerge in the next 7 days

### Configuring Proactive Assistant
1. Go to User Settings > Assistant Preferences
2. Toggle on "Proactive Assistant"
3. Choose your proactive level:
   - **Low**: Essential only -- reports and urgent mentions
   - **Medium**: Balanced mix of updates and insights
   - **High**: Everything including daily summaries and insights
4. Enable notification channels (Email, SMS, WhatsApp, Telegram)
5. Set Quiet Hours to prevent notifications during specific times

### Notification Types
You can toggle each notification type individually:
- Daily Summary, Report Ready, Goal Milestone, Meeting Reminder
- Action Item Due, Team Mention, Insight Discovered, Sync Complete, Weekly Recap

### Multi-Channel Delivery
- **Email**: Uses your account email or a custom address
- **SMS**: Enter your phone number in +1 format
- **WhatsApp**: Enter your phone number
- **Telegram**: Message @AIRocketBot to get your Chat ID

### Quiet Hours
Set a do-not-disturb window with start time, end time, and timezone. Non-urgent notifications are held until the window ends. Only critical items bypass quiet hours.

## Scheduled Tasks & Reminders (Preview)

### Overview
Scheduled Tasks is a Preview feature that lets you ask your AI assistant to perform recurring or one-time tasks automatically. Simply tell your assistant what you need and when.

### How to Create a Task
Tell your assistant in Agent Chat what you need. Examples:
- "Remind me every Monday at 9am to review my goals"
- "Every Friday afternoon, research the latest trends in AI automation"
- "Send me a weekly summary of team activity every Sunday evening"

### Task Types
- **Reminder**: Simple alerts and notifications
- **Research**: AI research on a topic with summarized findings
- **Report**: Custom data analysis and reporting
- **Goal Review**: Progress checks toward stated goals
- **Data Check**: Monitor specific metrics or data points
- **Summary**: Regular briefings on team activity
- **Custom Prompt**: Any AI prompt run on a schedule

### Scheduling Options
- Once, Daily, Weekly, Biweekly, or Monthly
- Set specific day of week and time
- Configure timezone for accurate scheduling

### Managing Tasks
View all tasks in the Scheduled Tasks tab:
- Filter by Active, Paused, or Completed
- Pause or resume tasks at any time
- View execution history with success/failure status
- Delete tasks you no longer need

## Connected Apps & Integrations (Preview)

### Overview
Connected Apps is a Preview feature providing a unified hub for connecting third-party business tools to AI Rocket. Browse available integrations, connect accounts, and let the AI agent work across all your data.

### Available Categories
- Storage (Google Drive, Microsoft OneDrive)
- Calendar (Google Calendar, Outlook)
- Finance & Accounting (QuickBooks, Xero, Stripe -- coming soon)
- Communication (Slack -- coming soon)
- CRM & Sales (HubSpot, Salesforce -- coming soon)
- Project Management (Notion, Asana -- coming soon)
- Transcription (Fireflies, Otter.ai -- coming soon)
- Analytics & Marketing
- Advanced / Custom

### How to Connect
1. Go to the Connected Apps tab
2. Browse integrations by category
3. Click "Connect" on the integration card
4. Complete the authorization process
5. Connection status will update automatically

### Connection Status
- **Connected**: Active and working
- **Expired**: Token expired, needs reconnection
- **Error**: Connection failed
- **Disconnected**: Not currently linked
- **Soon**: Coming soon integration

### How AI Uses Connected Apps
Once connected, the AI agent can reference data from these tools. For example, with Google Calendar connected, the agent sees your upcoming events (3-day lookahead) and can reference them in conversation. Usage count is tracked per connection.

## MCP Tools & API Wizard (Preview)

### Overview
MCP Tools is a Preview feature for discovering and managing automation tools that power the AI assistant. MCP (Model Context Protocol) servers provide tools the AI can use to perform actions beyond conversation.

### Connected Servers
View all configured MCP servers (like n8n) with:
- Health status (Healthy, Degraded, Unreachable)
- Number of available tools
- Last health check timestamp

### Available Tools
Browse all discovered automation tools organized by category:
- Finance, CRM, Communication, Project Management
- Transcription, Marketing, Automation, General
Each tool shows description, usage count, and execution time metrics.

### API Wizard (Admin Only)
Connect any custom API to AI Rocket:
1. Click "Connect API" in MCP Tools tab
2. Paste API documentation URL or text
3. AI analyzes and discovers endpoints automatically
4. Review discovered endpoints and configure details
5. Set up authentication (API Key, Bearer Token, Basic Auth)
6. Test the connection
7. Submit for admin approval
8. Once approved, the AI agent can use the new API

### Tool Search and Filtering
- Full-text search across all tools
- Category dropdown filter
- Read-only and write-capable indicators
- Approval requirement flags for sensitive operations

## Assistant Skills

### Overview
Assistant Skills are capability modules that enhance how the AI assistant analyzes data and provides insights. Each skill sharpens the assistant's focus in a specific domain.

### Available Skills
- **Financial Analyst**: Deep financial analysis, trend identification, and budget insights
- **Marketing Strategist**: Marketing campaign analysis, brand positioning, content strategy
- **Competitive Intelligence**: Competitor tracking, market positioning, SWOT analysis
- **Operations Optimizer**: Process efficiency, workflow optimization, resource allocation
- **Team Coach**: Team dynamics, performance coaching, culture development
- **Growth Strategist**: Revenue growth, market expansion, scaling strategies
- **Content Creator**: Content ideation, editorial planning, storytelling
- **Project Manager**: Project tracking, milestone management, risk assessment
- **Innovation Scout**: Emerging trends, innovation opportunities, technology adoption
- **Customer Advocate**: Customer experience, feedback analysis, retention strategies

### How Skills Work
1. Go to the Skills panel (Agent Tools on Mission Control or ask the assistant about skills)
2. Toggle any skill on or off with one click
3. Multiple skills can be active simultaneously (stacking)
4. Active skills automatically enrich the assistant's system prompt
5. Overnight insights and proactive suggestions are weighted toward active skill areas

### Suggesting New Skills
Click "Suggest a New Skill" at the bottom of the Skills panel to submit ideas for new skills. Provide a name, description, and use case.

## Connection Management

### Connect Page
The Connect page provides a unified interface for managing all data connections, apps, and tools. It has three tabs:
- **My Connections**: Full management of Google Drive and Microsoft OneDrive connections
- **Apps**: Browse and connect third-party business tools
- **MCP Tools**: View automation tools and use the API Wizard

### My Connections Tab
Admins can perform all connection management from this tab:
- **Connect**: Add Google Drive or Microsoft OneDrive as a new provider
- **Reconnect**: Refresh expired OAuth tokens with one click
- **Manage Folders**: Add or remove synced folders using the built-in folder browser
- **Disconnect**: Remove a provider with confirmation dialog
- View folder details, document counts, sync status, and token expiry warnings

## Key Concepts

### Reports
Reports are saved analyses that can be run manually or on a schedule. They help track KPIs, generate summaries, and monitor trends over time.

### Visualizations
AI-generated charts and graphs that make data easier to understand. Created from conversations and can be saved for future reference.

### Document Sync
The process of connecting cloud storage folders (Google Drive, Microsoft OneDrive/SharePoint) so Astra can analyze your team's documents and provide contextual insights. You can also upload local files directly.

### Team Collaboration
Working together in Team mode with @mentions, real-time sync, and shared conversations to leverage collective knowledge.

### Preview Features
Features marked as "Preview" are in testing and available to select users. They will be rolled out to all users once testing is complete. Current preview features include the Proactive Assistant, Scheduled Tasks, Connected Apps, and MCP Tools.

### Assistant Skills
Capability modules that enhance AI analysis in specific domains. 10 skills available across finance, marketing, strategy, operations, and more. Skills can be stacked for multi-lens analysis.
`;
