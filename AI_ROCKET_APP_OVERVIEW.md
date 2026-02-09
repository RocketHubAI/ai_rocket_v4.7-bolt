# AI Rocket + Astra Intelligence
## Complete Product Overview & Feature Documentation

**Version:** 1.1.0
**Last Updated:** November 29, 2025
**Platform:** Progressive Web App (PWA)

---

## Executive Summary

**AI Rocket powered by Astra Intelligence** is an enterprise AI platform that connects all your company data and makes it instantly accessible through conversational AI. Astra transforms how teams work with their business information by synthesizing data from Google Drive, Microsoft OneDrive, local file uploads, financial records, and meeting transcripts into actionable insights.

### Core Value Proposition
**"AI Connected to ALL Your Data"** - One AI platform that connects private conversations, team collaboration, and cross-product insights across your entire business ecosystem.

---

## Table of Contents

1. [Product Architecture](#product-architecture)
2. [Core Features](#core-features)
3. [Launch Preparation System](#launch-preparation-system)
4. [Mission Control & Launch Points](#mission-control--launch-points)
5. [AI Capabilities](#ai-capabilities)
6. [Data Integration](#data-integration)
7. [User Experience](#user-experience)
8. [Team Collaboration](#team-collaboration)
9. [Visualization & Reporting](#visualization--reporting)
10. [Security & Permissions](#security--permissions)
11. [Setup & Onboarding](#setup--onboarding)
12. [Technical Specifications](#technical-specifications)

---

## Product Architecture

### Design Philosophy

1. **Mobile-First PWA**: Every feature works excellently on mobile before web
2. **Real-Time First**: All collaborative features use real-time synchronization
3. **AI-Enhanced**: Leverage AI to augment human intelligence, not replace it
4. **Secure by Design**: User data privacy and security are non-negotiable
5. **Progressive Enhancement**: Core functionality works without AI, enhanced with AI

### Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS (mobile-optimized, dark theme)
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **AI Orchestration**: n8n workflows (webhook-based architecture)
- **AI Provider**: Google Gemini 2.5 Flash
- **Authentication**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (file uploads, attachments)
- **Deployment**: Netlify (auto-deploy from main branch)

### AI Integration Pattern

- **External Orchestration**: AI logic runs in n8n workflows, not client-side
- **Webhook Architecture**: Secure, scalable, and maintainable
- **Context-Aware**: Preserves conversation history for meaningful interactions
- **Multi-Provider Ready**: Designed to support multiple AI providers

---

## Core Features

### 1. Dual Interaction Modes

#### Private Chat Mode
- **One-on-one conversations** with Astra Intelligence
- Personal AI assistant for individual insights
- Private conversation history (only visible to user)
- Persistent conversations with full context retention
- Fast response times optimized for quick queries

**Use Cases:**
- Quick data lookups from your company files
- Financial analysis of your records
- Meeting summaries and insights
- Strategic planning research
- Personal productivity queries

#### Team Chat Mode
- **Collaborative workspace** where teams interact with AI together
- Real-time message synchronization across all active users
- @mention system to direct attention (@astra for AI, @username for teammates)
- Shared context and conversation history
- Team-wide visibility of all messages and AI responses

**Use Cases:**
- Group brainstorming sessions with AI assistance
- Team data analysis and decision making
- Collaborative problem solving
- Knowledge sharing across team members
- Cross-functional project discussions

### 2. Astra Guided Chat

**Smart prompt generation** based on your actual data:

- **Data-Aware Prompts**: Astra analyzes what data you have (strategy docs, meetings, financials)
- **Balanced Recommendations**: When all 3 data types exist, prompts use a balanced combination
- **Contextual Suggestions**: 3 personalized prompt suggestions per session
- **Real-Time Analysis**: Shows document counts during generation
- **One-Click Launch**: Start conversations with pre-loaded context

**Example Flow:**
```
Generating personalized prompts...
✓ 8 strategy documents found
✓ 123 meeting notes found
✓ 36 financial records found

Suggested Prompts:
1. "Analyze strategic alignment with recent meetings"
2. "Compare financial performance to strategic goals"
3. "Identify cross-functional insights from all data"
```

### 3. Data Visualization Engine

**AI-Generated Visual Insights** from conversational data:

- **On-Demand Generation**: Create visualizations from any Astra response
- **Interactive HTML**: Fully interactive charts, graphs, and dashboards
- **Multiple Format Support**:
  - Bar charts, line graphs, pie charts
  - Tables with sorting and filtering
  - Timeline visualizations
  - Comparison dashboards
  - Custom HTML layouts

**Visualization Features:**
- Permission-based access (only requesters can generate/view)
- Modal and full-screen viewing options
- Save for later access
- Export to PDF with formatted layouts
- Real-time generation with loading states

**Example Use Cases:**
- Revenue trends over time
- Meeting attendance patterns
- Strategic initiative progress tracking
- Budget allocation breakdowns
- Team performance metrics

### 4. Scheduled & Manual Reports

#### Scheduled Reports
**Automated recurring reports** delivered on your schedule:

- **Flexible Scheduling**: Daily, weekly, monthly intervals
- **Customizable Timing**: Choose specific day/time for delivery
- **Report Templates**: Pre-built templates based on data availability
- **Email Delivery**: Reports sent directly to team inbox
- **Visualization Support**: Generate charts and graphs automatically

**Report Types:**
- Weekly Team Summary
- Monthly Financial Overview
- Strategic Progress Update
- Meeting Insights Digest
- Custom Query Reports

#### Manual Reports
**On-demand report generation** with custom queries:

- Instant generation from any prompt
- One-time or save for reuse
- Custom visualization options
- Export and share capabilities

### 5. Message Actions & Interactions

**Every Astra response includes:**

#### Reply Feature
- Reply directly to specific Astra messages
- Maintains conversation context
- Follow-up questions on specific topics
- Thread-based organization

#### Copy to Clipboard
- One-click text copying
- Formatted markdown preservation
- Share insights with external tools
- Visual confirmation feedback

#### Visualization Creation
- Generate charts from response data
- Multiple visualization types
- Interactive exploration
- Save and export options

#### Favorite Prompts
- Save your best prompts for reuse
- Quick access from favorites dropdown
- Personal prompt library
- Team prompt sharing (coming soon)

### 6. Real-Time Collaboration

**Powered by Supabase Real-time:**

- **Instant Message Sync**: All team members see updates immediately
- **@Mention Notifications**: Get notified when mentioned
- **Typing Indicators**: See when Astra or teammates are responding
- **Presence Awareness**: Know who's online and active
- **Conflict Resolution**: Handles concurrent edits gracefully

### 7. Cloud Storage Integration

**Seamless connection to your cloud storage:**

#### Supported Services
- **Google Drive**: Full integration with Google Workspace documents
- **Microsoft OneDrive/SharePoint**: Connect Microsoft 365 files
- **Local File Upload**: Upload documents directly from your computer

#### Folder-Based Organization
- **Four Data Categories**: Strategy, Meetings, Financial, Projects
- **Multi-Folder Support**: Connect multiple folders per category
- **Automatic Sync**: New files detected and processed automatically
- **Version Control**: Track document updates and changes
- **Selective Sync**: Choose which folders to include

#### Smart Document Processing
- **Vector Embeddings**: Semantic search across all documents
- **Chunk Optimization**: Efficient storage for large documents
- **Metadata Extraction**: Preserve file names, dates, types
- **Team Scoping**: Only access your team's documents
- **Privacy Controls**: RLS (Row Level Security) on all data

#### Google Picker Interface
- Modern folder selection UI
- Browse entire Google Drive structure
- Visual folder hierarchy
- Quick search and filtering
- One-click folder selection

### 8. Gmail Integration (Feature Flag)

**Email intelligence** for comprehensive business context:

- **Thread-Based Organization**: Group related emails automatically
- **Vectorized Search**: Semantic search across all emails
- **Privacy-First**: Only your team's emails, secure storage
- **Incremental Sync**: Fast updates for new emails
- **Auto-Categorization**: Smart organization by topic

**Use Cases:**
- Find customer communication history
- Analyze email sentiment trends
- Track project email threads
- Summarize lengthy email chains
- Extract action items from emails

---

## AI Capabilities

### Powered by Google Gemini 2.5 Flash

**Standard Model Configuration:**
- **Model**: `gemini-2.5-flash-latest`
- **Optimized for**: Speed, accuracy, cost-effectiveness
- **Context Window**: Large context for comprehensive understanding
- **Multi-Modal**: Text analysis with future image support

### AI Features

#### Semantic Search
- **Vector-Based Retrieval**: Find information by meaning, not just keywords
- **Cross-Document Search**: Search across all connected data sources
- **Relevance Ranking**: Most relevant results first
- **Category Filtering**: Search within specific data types

#### Context Preservation
- **Conversation Memory**: Astra remembers your entire conversation
- **Multi-Turn Reasoning**: Build on previous questions and answers
- **User Preferences**: Learns your communication style
- **Team Context**: Aware of team structure and permissions

#### Intelligent Summarization
- **Meeting Summaries**: Condense hours of meetings into key points
- **Document Digests**: Extract main themes from long documents
- **Email Thread Summary**: Get the gist of lengthy email chains
- **Multi-Document Synthesis**: Combine insights from multiple sources

#### Data Analysis
- **Trend Identification**: Spot patterns across time periods
- **Comparative Analysis**: Compare metrics, documents, or time periods
- **Anomaly Detection**: Highlight unusual data points
- **Predictive Insights**: Forecast trends based on historical data

#### Natural Language Understanding
- **Intent Recognition**: Understand what you're really asking
- **Entity Extraction**: Identify key people, dates, numbers, topics
- **Sentiment Analysis**: Gauge tone and emotion in communications
- **Question Refinement**: Suggest better ways to phrase queries

---

## Launch Preparation System

**Version 1.1 - December 2025**

Launch Preparation is a comprehensive guided onboarding system that ensures every user completes essential setup before accessing the full AI Rocket application.

### Overview

**Purpose**: Guarantee proper data connection, feature discovery, and team configuration before users enter the main application.

**Design**: Three sequential stages with gamified progression and point rewards.

**Requirements**: Users must reach minimum levels in all stages before "launching" into the main app.

### The Three Stages

#### 🟠 Stage 1: Fuel (Data Connection)

**Goal**: Connect business data to enable AI insights

**Key Activities:**
- Connect cloud storage (Google Drive or Microsoft OneDrive) via OAuth
- Upload local files directly to Astra
- Select folder categories (Strategy, Projects, Meetings, Financials)
- Trigger initial data synchronization
- Monitor document counts per category

**Level Progression:**
- **Level 1** (10 pts): Connect 1 document (any type)
- **Level 2** (20 pts): 1 of each folder type
- **Level 3** (30 pts): 3+ Strategy, 3+ Projects, 10+ Meetings, 3+ Financials
- **Level 4** (40 pts): 10+ Strategy, 10+ Projects, 50+ Meetings, 10+ Financials
- **Level 5** (50 pts): 10+ Strategy, 10+ Projects, 100+ Meetings, 10+ Financials

**Achievements:**
- First Document Upload (+5 pts)
- Google Drive Connected (+10 pts)
- Each Folder Type Selected (+10 pts each)
- Admin Drive Setup Complete (+20 pts)

**Rationale**: Without data, AI cannot provide meaningful insights. Fuel stage ensures minimum viable data connection. Connections can also be managed from the Connect page > My Connections tab, where admins can connect, reconnect, manage folders, and disconnect providers.

#### 🔵 Stage 2: Boosters (AI Interaction)

**Goal**: Experience all core AI capabilities before main app access

**Key Activities:**
- Use Guided Chat for personalized prompts
- Send messages to Astra (Team or Private mode)
- Create data visualizations
- Generate manual reports
- Schedule recurring reports

**Level Progression:**
- **Level 1** (10 pts): Use Guided Chat OR send 5 prompts
- **Level 2** (20 pts): Create 1 visualization
- **Level 3** (30 pts): Generate 1 manual report
- **Level 4** (40 pts): Schedule 1 recurring report
- **Level 5** (50 pts): Build 1 AI agent *(coming soon)*

**Achievements:**
- First Message Sent (+5 pts)
- First Guided Chat Used (+10 pts)
- First Visualization Created (+10 pts)
- First Manual Report Generated (+10 pts)
- First Scheduled Report Created (+10 pts)

**Rationale**: Level 4 requirement ensures users have tried chat, visualizations, and both report types before launching.

#### 🟢 Stage 3: Guidance (Team Configuration)

**Goal**: Complete team setup and collaboration configuration

**Key Activities:**
- Configure team settings (name, preferences)
- Enable news preferences
- Invite team members (optional at Level 3)
- Create AI job roles *(coming soon)*
- Document processes *(coming soon)*

**Level Progression:**
- **Level 1** (10 pts): Configure team settings
- **Level 2** (20 pts): Enable news preferences
- **Level 3** (30 pts): Invite 1+ team member
- **Level 4** (40 pts): Create 1 AI job *(coming soon)*
- **Level 5** (50 pts): Create 1 guidance document *(coming soon)*

**Achievements:**
- Team Settings Configured (+10 pts)
- News Preferences Enabled (+10 pts)
- First Team Member Invited (+10 pts)

**Rationale**: Level 2 requirement ensures team is properly configured before accessing collaborative features.

### Minimum Launch Requirements

To click "Launch AI Rocket" and access the main application, users must achieve:

| Stage | Minimum Level | Points | Key Requirement |
|-------|---------------|--------|-----------------|
| **Fuel** | Level 1 | 10 | At least 1 document connected |
| **Boosters** | Level 4 | 100 | All core features tried |
| **Guidance** | Level 2 | 30 | Team configuration complete |
| **Total** | - | **140** | Minimum to launch |

**Maximum Possible**: 450 points (all stages at Level 5)

### User Experience

**Entry Flow:**
1. Sign up and complete initial onboarding (team creation/joining)
2. See Launch Preparation welcome screens
3. Navigate through three stages sequentially
4. Cannot skip or bypass - must complete minimum requirements
5. Click "Launch AI Rocket" when ready
6. Celebration animation, then enter main app

**Navigation:**
- Stage selector at top (shows current stage, level badges)
- Progress bars for each stage
- Real-time point updates
- Achievement notifications (toasts)
- "Ready to Launch?" panel visible from any stage

**Exit Behavior:**
- Close button (X) shows confirmation modal
- "Exit & Logout" logs user out (progress saved)
- No "skip" or "later" option
- Must complete requirements to access main app

### Legacy User Support

**Who**: Users who existed before Launch Prep rollout (December 2025)

**Experience:**
- Special "Welcome Back!" banner on onboarding screens
- Explanation of new system
- Same requirements as new users
- Can earn points for completing setup tasks
- Existing data counts toward level requirements

**Migration:**
- All existing users enrolled automatically
- Start at Fuel Stage, Level 0, 0 points
- `is_launched = false` (must complete Launch Prep)
- Can leverage existing data connections

### Technical Details

**Database Tables:**
- `launch_preparation_eligible_users`: Enrollment tracking
- `user_launch_status`: Current stage, points, launched status
- `launch_preparation_progress`: Per-stage level and points
- `launch_achievements`: Achievement history

**Key Logic:**
- `isReadyToLaunch()`: Validates minimum requirements met
- `canProgressToNextStage()`: Checks if user can unlock next stage
- Level calculation based on document counts and completions
- Real-time progress sync via Supabase Realtime

**For complete technical documentation, see:** [Launch Preparation Guide](./LAUNCH_PREPARATION_GUIDE.md)

---

## Mission Control & Launch Points

**Version 1.1 - December 2025**

Mission Control is the central progress tracking and achievement dashboard, unlocked after users complete Launch Preparation and launch into the main application.

### Overview

**Purpose**: Maintain post-launch engagement through gamified progress tracking, achievement systems, and team collaboration metrics.

**Access**: Only available to users who have clicked "Launch AI Rocket" and completed minimum Launch Prep requirements.

**Location**: Accessible via header icon, sidebar navigation, and user profile.

### Core Components

#### Personal Stats Dashboard

**Individual Metrics:**
- Total Launch Points earned
- Current personal level (Rookie → Master)
- Progress to next level
- User rank/tier status

**Stage Progress:**
- Visual progress bars for Fuel, Boosters, Guidance
- Current level per stage
- Points earned per stage
- Percentage completion indicators

#### Team Stats Dashboard

**Team Metrics:**
- Aggregate team points (sum of all members)
- Team level (collective progression)
- Active member count
- Team ranking (if enabled)

**Collaboration Metrics:**
- Team message frequency
- Shared visualizations count
- Collective achievements
- Multi-admin coordination stats

#### Achievement Feed

**Recent Achievements:**
- Chronological list of unlocked achievements
- Point values displayed
- Achievement icons and descriptions
- Timestamps for all unlocks

**Achievement Categories:**
- Setup achievements (Drive connection, folder selection)
- Usage achievements (messages, visualizations, reports)
- Level achievements (reaching new levels)
- Milestone achievements (special recognition)

#### Next Milestones

**Upcoming Goals:**
- Next achievable level requirements
- Feature unlock previews
- Progress indicators toward milestones
- Recommended actions to advance

### Launch Points System

**What Are Launch Points?**

A unified scoring system that tracks user engagement, rewards meaningful interactions, and enables progression through levels.

**How Points Are Earned:**

**Setup & Configuration:**
- First Document Upload: +5 pts
- Data Source Connected: +10 pts
- Folder Selection (each type): +10 pts
- Team Settings Configured: +10 pts
- News Preferences Enabled: +10 pts
- First Team Member Invited: +10 pts
- Admin Drive Setup Complete: +20 pts

**AI Interaction:**
- First Message Sent: +5 pts
- First Guided Chat Used: +10 pts
- Every 10 Messages: +5 pts (recurring)
- Every 50 Messages: +10 pts (recurring)

**Visualizations & Reports:**
- First Visualization: +10 pts
- First Manual Report: +10 pts
- First Scheduled Report: +10 pts
- Every 5 Visualizations: +5 pts (recurring)
- Every 10 Reports: +10 pts (recurring)

**Level Completions:**
- Each stage level: 10-50 points (cumulative: 150 per stage)
- Total level points possible: 450 points across all stages

**Team Collaboration:**
- First Team Member Invited: +10 pts
- Every 5 Team Members: +10 pts (recurring)
- Team Chat Message: +1 pt per message

### Personal & Team Levels

**Personal Level Tiers:**

| Level | Points Range | Title | Description |
|-------|--------------|-------|-------------|
| **1** | 0-99 | Rookie | Just getting started |
| **2** | 100-249 | Explorer | Learning the ropes |
| **3** | 250-499 | Contributor | Regular user |
| **4** | 500-999 | Power User | Advanced capabilities |
| **5** | 1000+ | Master | Elite status |

**Team Level Progression:**

Team level calculated from sum of all member points:
- **Level 1**: 0-199 (Basic features)
- **Level 2**: 200-499 (Team analytics)
- **Level 3**: 500-999 (Advanced collaboration)
- **Level 4**: 1000-1999 (Premium features)
- **Level 5**: 2000+ (Elite team status)

### Multi-Admin Support

**Collaborative Setup:**
- Multiple admins can connect Drive, Gmail
- Each admin's points count toward team total
- No penalties for multiple admins
- Encourages distributed setup responsibility

**Example:**
- Admin A connects Drive (Strategy + Projects) → +20 team pts
- Admin B connects Gmail + Meetings → +20 team pts
- Total team benefit: +40 pts from dual admin collaboration

### Point Persistence

**Durability:**
- ✅ Points never decrease or reset
- ✅ Permanent record in database
- ✅ Historical tracking maintained
- ✅ Survive role changes and team transfers
- ✅ Achievement history preserved

**Storage:**
- `user_launch_status.total_points`: Personal total
- `launch_preparation_progress.points_earned`: Per-stage points
- `launch_achievements.points_awarded`: Achievement history
- `teams.total_points`: Team aggregate (calculated via trigger)

### Use Cases

**For Individual Users:**
- Track personal growth and progress
- Discover new features through achievements
- Set personal goals based on milestones
- Earn recognition and status

**For Team Admins:**
- Monitor team engagement and adoption
- Identify active vs inactive members
- Track onboarding completion rates
- Measure feature utilization
- Celebrate team milestones

**For the Platform:**
- Increase daily/weekly active users
- Drive feature discovery and adoption
- Reduce churn through engagement
- Extend session duration
- Guide product roadmap with usage data

### Technical Details

**Real-Time Updates:**
```typescript
// Subscribe to personal points
supabase.channel('launch_points')
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'user_launch_status',
    filter: `user_id=eq.${userId}`
  }, handlePointUpdate)
  .subscribe();
```

**Team Points Aggregation:**
```sql
-- Trigger updates team total on user point change
CREATE TRIGGER sync_user_points_to_team_total
AFTER UPDATE ON user_launch_status
FOR EACH ROW EXECUTE FUNCTION sync_team_points();
```

**Achievement Award Logic:**
1. Check for duplicate (prevent re-awarding)
2. Create achievement record
3. Increment user total points
4. Show toast notification
5. Update real-time subscribers

**For complete technical documentation, see:** [Mission Control & Launch Points Guide](./MISSION_CONTROL_LAUNCH_POINTS_GUIDE.md)

---

## Data Integration

### Supported Data Sources

#### 1. Cloud Storage (Google Drive & Microsoft OneDrive)
**File Types:**
- Google Docs, Sheets, Slides
- Microsoft Word, Excel, PowerPoint
- PDF documents
- Text files and markdown

**Organization:**
- Strategy folder: Business plans, strategic docs, proposals
- Meetings folder: Meeting notes, transcripts, agendas
- Financial folder: Budgets, P&L statements, forecasts
- Projects folder: Project documentation, timelines

#### 2. Local File Upload
**Supported Formats:**
- PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx)
- Text files (.txt, .md), CSV files
- Up to 50MB per file, 10 files per batch

#### 3. Gmail (Feature Flag)
**Email Processing:**
- Thread detection and grouping
- Sender/recipient extraction
- Date and time parsing
- Subject line analysis
- Body content vectorization

#### 3. Financial Records
**Supported Formats:**
- Spreadsheets (Excel, Google Sheets)
- CSV exports from accounting software
- PDF financial statements
- Budget documents

### Data Processing Pipeline

```
1. File Detection → 2. Content Extraction → 3. Vectorization → 4. Storage → 5. Search Index
```

**Stage Details:**

1. **File Detection**: n8n monitors Google Drive for new/updated files
2. **Content Extraction**: Text extracted from documents
3. **Vectorization**: Gemini generates embeddings for semantic search
4. **Storage**: Chunked content stored in Supabase with metadata
5. **Search Index**: Vector database optimized for fast retrieval

### Data Security

- **Team Isolation**: Strict RLS ensures teams only see their data
- **Encryption**: All data encrypted at rest and in transit
- **Access Control**: Role-based permissions (Admin, Member)
- **Audit Logging**: Track all data access and modifications
- **GDPR Compliant**: Right to deletion, data export

---

## User Experience

### Progressive Web App (PWA)

**Native App Experience on Web:**
- **Install to Home Screen**: One-tap installation on mobile/desktop
- **Offline Capability**: Core features work without internet
- **Push Notifications**: Get notified of important updates (coming soon)
- **Auto-Updates**: Always on the latest version
- **Fast Loading**: Optimized bundle size and caching

### Mobile-Optimized Design

**Touch-First Interface:**
- **44px Minimum Touch Targets**: Thumb-friendly tap areas
- **Swipe Gestures**: Natural mobile interactions
- **Responsive Layouts**: Adapts from phone to tablet to desktop
- **Performance**: Optimized for mobile networks and battery life

**Mobile Features:**
- Bottom navigation for one-handed use
- Collapsible sections to save screen space
- Optimized keyboard handling
- Native-feeling animations (60fps)

### Dark Theme

**Optimized for Extended Use:**
- OLED-friendly pure blacks for battery savings
- Reduced eye strain for long sessions
- High contrast ratios for readability
- Consistent gradient accents (orange → green → blue)

### Accessibility

- **Semantic HTML**: Screen reader compatible
- **Keyboard Navigation**: Full keyboard support
- **Focus Indicators**: Clear focus states for all interactive elements
- **Color Contrast**: WCAG AA compliant contrast ratios
- **Alt Text**: Descriptive text for all visual elements

### Loading States & Feedback

**Clear User Feedback:**
- Loading spinners for async operations
- Progress indicators for long operations
- Success/error toasts for actions
- Skeleton screens for content loading
- Typing indicators when Astra is thinking

---

## Team Collaboration

### Team Structure

#### Roles & Permissions

**Team Admin:**
- Create and manage team
- Invite and remove members
- Configure team settings
- Manage folder connections
- Access all team data
- View usage analytics

**Team Member:**
- Access team data based on permissions
- Participate in team chat
- Create private conversations
- Generate visualizations
- Run reports
- Limited financial data access (if restricted)

#### Permission Controls

**Financial Data Visibility:**
- Admins can restrict financial data access
- Toggle per member: view_financial (true/false)
- Applies to both chat and reports
- Real-time enforcement via RLS

### Team Settings

**Configurable Options:**
- Team name and branding
- Default data categories
- Report templates
- Notification preferences
- Integration connections

### Invite System

**Multi-Method Invitations:**

1. **Invite Codes**:
   - Pre-generated codes for quick onboarding
   - Track usage and expiration
   - Auto-assign to correct team

2. **Email Invitations**:
   - Send direct email invites
   - Branded invitation templates
   - Automatic account creation
   - Direct link to team

3. **Admin Approval**:
   - Request access via preview
   - Admin reviews and approves
   - Controlled team growth

### Team Chat Features

**Collaboration Tools:**
- @mentions for users and Astra
- Message threading and replies
- Real-time synchronization
- Shared conversation history
- Message search and filtering

---

## Visualization & Reporting

### Visualization Types

#### Charts & Graphs
- **Bar Charts**: Compare categories or time periods
- **Line Graphs**: Show trends over time
- **Pie Charts**: Display proportional data
- **Area Charts**: Visualize cumulative values
- **Scatter Plots**: Show correlations

#### Data Tables
- **Sortable Columns**: Click headers to sort
- **Filterable Rows**: Search and filter data
- **Pagination**: Handle large datasets
- **Exportable**: Copy or download data

#### Dashboard Layouts
- **Multi-Panel**: Combine multiple visualizations
- **Responsive Grid**: Adapts to screen size
- **Interactive Elements**: Click to drill down
- **Custom HTML**: Unlimited layout possibilities

### Astra Create - Images & Presentations

**AI-Powered Visual Content Generation** from your team's data:

Astra Create transforms your business data into beautiful, shareable visual content. Generate single images or multi-slide presentations with AI-powered analysis of your synced documents.

#### Content Types (15+ Presets)

**Overview:**
- **Team Snapshot**: Comprehensive overview of your team's current state and momentum
- **Team Wins & Celebrations**: Recent achievements, milestones, and recognition moments

**Foundation:**
- **Mission**: Your organization's purpose, vision, and impact
- **Core Values**: The principles and beliefs guiding your team's decisions

**Progress:**
- **Goals**: Current objectives, key results, and progress toward targets
- **Weekly Review**: Past week's accomplishments, learnings, and priorities
- **Quarterly Review**: 90-day retrospective with achievements and growth areas
- **Yearly Review**: Annual highlights, milestones, and transformations

**Marketing:**
- **Sales Campaign**: Highlight the benefits of customers using your products or services
- **Thought Leadership**: Content that establishes your team's expertise and authority

**Analysis:**
- **Challenges & Opportunities**: Key obstacles and strategic opportunities
- **Financial Health**: Revenue, expenses, runway, and business alignment
- **Trends & Insights**: Positive and negative trends affecting your team
- **Innovation & Ideas**: New initiatives, experiments, and creative exploration

**Custom:**
- Enter your own prompt for complete control over the generated content

#### Visualization Types
- **Single Image**: One powerful visual for social media, presentations, or reports
- **Multi-Slide Presentation**: 3, 5, 7, or 10 slides for comprehensive storytelling

#### Style Options

**Presentation Styles:**
- Modern Gradient, Tech & Innovation, Bold Headlines
- Minimalist Clean, Corporate Professional, Creative Playful

**Image Styles:**
- Photorealistic, Digital Art, 3D Render, Infographic

**Text Integration:**
- **Integrated**: Text naturally embedded within the image composition
- **Overlay**: Clean text overlay on top of the image
- **Minimal**: Image-focused with only essential text
- **Caption**: Image as hero with text below

#### Layout Options
- **Landscape (16:9)**: Perfect for presentations and widescreen displays
- **Portrait (9:16)**: Ideal for social media stories and mobile viewing
- **Square (1:1)**: Great for social media posts and profile content

#### Features
- Data-aware content selection (only shows options you have data for)
- Save visualizations to your personal gallery
- Export to PDF for easy sharing
- Regenerate with different styles or content
- Full-screen preview mode

### Report Templates

**Pre-Built Templates:**

1. **Weekly Team Summary**
   - Meeting highlights
   - Key decisions made
   - Action items assigned
   - Upcoming priorities

2. **Monthly Financial Overview**
   - Revenue and expenses
   - Budget variance analysis
   - Cash flow trends
   - Year-over-year comparison

3. **Strategic Progress Update**
   - OKR tracking
   - Initiative status
   - Milestone completion
   - Risk identification

4. **Meeting Insights Digest**
   - Attendance patterns
   - Common discussion topics
   - Decision-making trends
   - Action item follow-through

### Report Delivery

**Email Integration:**
- Automated delivery to team inbox
- Clean, branded email templates
- Embedded visualizations
- Links to interactive versions
- PDF attachments (optional)

### Export Options

**Multiple Formats:**
- **PDF**: Formatted reports with charts
- **CSV**: Raw data for further analysis
- **PNG**: Individual chart images
- **HTML**: Interactive dashboards

---

## Security & Permissions

### Authentication

**Supabase Auth:**
- Email/password authentication
- Secure password requirements
- Password reset via email
- Session management
- Token-based API security

### Row Level Security (RLS)

**Database-Level Protection:**
- Every table has RLS enabled
- Users only access their team's data
- Policies enforce permission checks
- No way to bypass security
- Audit trail of all access

### Data Privacy

**GDPR Compliance:**
- Right to deletion
- Data export capability
- Privacy policy acceptance
- Clear data usage terms
- Opt-in for non-essential features

### API Security

**Webhook Protection:**
- HTTPS-only communication
- API key authentication
- Rate limiting
- Request validation
- Error handling without data leaks

### Super Admin Access

**System Administration:**
- Limited to 3 verified emails
- Full system visibility
- User management capabilities
- Support ticket handling
- Analytics dashboard access

**Super Admins:**
- clay@rockethub.co
- claytondipani@gmail.com
- mattpugh22@gmail.com

---

## Setup & Onboarding

### Astra Guided Setup

**11-Step Comprehensive Onboarding:**

1. **Welcome to Astra**
   - Platform overview
   - Key features introduction
   - Value proposition explanation

2. **Connect Your Cloud Storage**
   - Choose Google Drive or Microsoft OneDrive
   - OAuth authorization
   - Permission explanation
   - Security assurances

3. **Choose Your Folders**
   - Browse cloud storage structure
   - Select folders per category
   - Multi-folder support

4. **Place Your Files**
   - Guidance on file organization
   - Best practices for folder structure
   - File type recommendations

5. **Sync Your Data**
   - Initial data import
   - Progress tracking
   - Estimated completion time

6. **Configure Team Settings**
   - Set team name
   - Configure permissions
   - Customize preferences

7. **Send Your First Prompt**
   - Try a sample query
   - See Astra in action
   - Get instant results

8. **Create a Visualization**
   - Generate your first chart
   - Explore visualization options
   - Learn export features

9. **Run a Manual Report**
   - Create on-demand report
   - Customize report content
   - Preview before finalizing

10. **Schedule a Report**
    - Set up recurring reports
    - Choose frequency and timing
    - Configure email delivery

11. **Invite Team Members** (Optional)
    - Send invitations
    - Assign roles
    - Set permissions

**Setup Features:**
- Progress tracking
- Save & continue later
- Skip optional steps
- Contextual help at each step
- Sample prompts and examples

### User Onboarding

**First-Time User Experience:**
- Welcome modal with quick tour
- Interactive product tour (optional)
- Tooltips on key features
- Help assistant availability
- Quick start guide access

**Onboarding Flags:**
- Track completion status
- Show onboarding only once
- Allow reset for new users
- Team-level onboarding sync

---

## Technical Specifications

### Performance Benchmarks

**Target Metrics:**
- Initial Load: < 2 seconds on 3G mobile
- Message Send: < 500ms user feedback
- Real-Time Sync: < 500ms latency
- UI Responsiveness: 60fps scrolling
- AI Response: < 30 seconds (with clear loading states)

### Browser Support

**Supported Browsers:**
- Chrome/Edge: Latest 2 versions
- Safari: Latest 2 versions (iOS & macOS)
- Firefox: Latest 2 versions
- Opera: Latest version

**Mobile Support:**
- iOS Safari: 14+
- Chrome Android: Latest
- Samsung Internet: Latest

### Database Schema

**Key Tables:**
- `teams`: Team information and settings
- `users`: User accounts and permissions
- `astra_chats`: Chat messages and history
- `documents`: Uploaded file metadata
- `document_chunks`: Vectorized content chunks
- `document_chunks_meetings`: Meeting-specific data
- `document_chunks_financial`: Financial data
- `company_emails`: Gmail integration data
- `scheduled_reports`: Report configuration
- `saved_visualizations`: Stored charts
- `whats_new`: Feature announcements

### API Endpoints (Supabase Functions)

**Core Functions:**
- `n8n-proxy`: Main AI webhook relay
- `generate-report`: Report generation
- `create-strategy-document`: Document creation
- `google-drive-oauth-exchange`: OAuth handling
- `gmail-oauth-exchange`: Gmail authentication
- `send-invite-email`: User invitations
- `invite-user`: Admin invitation handling
- `refresh-google-tokens`: Token refresh

### Environment Variables

**Required Configuration:**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

---

## Key Differentiators

### What Makes Astra Unique

1. **True Multi-Source Intelligence**
   - Not just one data type - combines strategy, meetings, financials, emails
   - Holistic business view impossible with single-source tools

2. **Team-First Collaboration**
   - Built for teams, not just individuals
   - Real-time collaboration with AI as a team member
   - Shared context and knowledge building

3. **Mobile-Native Experience**
   - Not a desktop app shrunk to mobile
   - Purpose-built for mobile from the ground up
   - Touch-optimized, thumb-friendly, fast on mobile networks

4. **Transparent AI Architecture**
   - Clear about data sources used in responses
   - Explainable AI with citations
   - No black-box mystery answers

5. **Privacy-First Design**
   - Your data stays in your control
   - Team isolation by design
   - No data sold or shared
   - GDPR compliant

6. **Guided Setup Experience**
   - Not dumped into complex UI
   - Step-by-step onboarding with Astra's help
   - Learn by doing, not by reading manuals

7. **Actionable Insights**
   - Not just answers - visualizations, reports, exports
   - Turn insights into action immediately
   - Share with stakeholders easily

---

## Roadmap & Future Enhancements

### Near-Term (Q1 2026) -- Data Connection Strategy

> **See [MCP_DATA_CONNECTION_STRATEGY.md](./MCP_DATA_CONNECTION_STRATEGY.md) for full plan**

- **Connected Apps Hub**: Unified integration dashboard for managing all external connections
- **QuickBooks Online**: Automated financial data sync (highest customer demand)
- **Calendar Integration**: Google Calendar and Outlook Calendar for schedule intelligence
- **Slack Integration**: Team communication data for AI context
- **Integration Registry**: Foundation database for all current and future integrations
- **CRM Integrations**: HubSpot, Salesforce, GoHighLevel via n8n bridge
- **Project Tools**: Notion, Monday.com, Asana via n8n bridge
- **MCP Protocol**: Standardized extensibility for custom and niche tool connections

### Mid-Term (Q2-Q3 2026)

- **API Wizard**: AI-guided tool that helps users connect any third-party API
- **Zapier MCP**: Access to 6,000+ apps through single MCP connection
- **Multi-Language Support**: Global team support
- **Marketplace**: Share and discover report templates and integration configurations
- **Advanced Permissions**: Granular data access controls per integration
- **Compliance Tools**: SOC2, HIPAA support

### Long-Term (Q4 2026+)

- **Cross-Product Insights**: Integration with Health Rocket, EOS Rocket
- **AI Training**: Train Astra on your company-specific knowledge
- **Predictive Analytics**: Forecasting and trend prediction
- **Workflow Automation**: AI-triggered actions via connected tools
- **Enterprise Features**: SSO, advanced security, compliance

---

## Support & Resources

### In-App Help

**Help Center Access:**
- Click "?" icon in header
- Three tabs: Quick Start, What's New, FAQ
- Search functionality
- Contextual help tooltips

**Ask Astra Tab:**
- Get help from Astra itself
- Ask questions about features
- Learn best practices
- Troubleshooting assistance

### Documentation

**Available Guides:**
- User Onboarding Guide
- Setup Progress Guide
- Google Drive Integration Setup
- Gmail Integration Setup
- Scheduled Reports Setup
- Metrics Tracking Guide
- What's New Feature Log

### Support Channels

**Feedback & Support:**
- In-app feedback button
- Email support via contact form
- Help assistant for common questions
- Community knowledge base (coming soon)

### Admin Resources

**Admin Dashboard:**
- User management
- Usage analytics
- System health monitoring
- Support ticket management
- Feature flags control

---

## Metrics & Analytics

### User Metrics Tracked

**Activity Tracking:**
- Messages sent (private & team)
- Visualizations created
- Reports generated
- Data synced
- Login frequency
- Feature usage patterns

**Performance Metrics:**
- AI response times
- Visualization generation time
- Report delivery success rate
- Error rates and types
- API latency

### Team Analytics

**Admin Dashboard Metrics:**
- Active users
- Message volume
- Most-used features
- Data source utilization
- Storage usage
- Cost tracking

### Business Intelligence

**Insights Generated:**
- User engagement trends
- Feature adoption rates
- Churn indicators
- Usage patterns
- ROI tracking

---

## Pricing & Licensing

### Current Model

**Beta Access:**
- Invite-code based access
- Limited availability
- Free during beta period
- Early adopter benefits

### Future Pricing (Planned)

**Tiered Structure:**

1. **Starter**: Small teams (1-5 users)
   - Basic features
   - Limited data sources
   - Community support

2. **Professional**: Growing teams (6-25 users)
   - All features
   - Multiple data sources
   - Priority support
   - Advanced analytics

3. **Enterprise**: Large organizations (25+ users)
   - Custom features
   - Dedicated support
   - SSO and compliance
   - Custom SLAs

---

## Success Stories & Use Cases

### Marketing Agency
"Astra transformed how we access client data. Instead of digging through Google Drive for hours, we ask Astra and get instant, contextualized answers. We're delivering insights to clients 5x faster."

### Financial Services
"The financial data analysis is incredible. Astra spots trends in our data that would take analysts days to find. The scheduled reports keep our executive team informed without manual work."

### Software Company
"Team chat with Astra has become our knowledge hub. New employees get up to speed in days instead of weeks by asking Astra about our processes, decisions, and history."

### Healthcare Startup
"Privacy and security were our top concerns. Astra's team isolation and RLS give us confidence that patient data stays protected while still being accessible to authorized staff."

---

## Conclusion

**AI Rocket powered by Astra Intelligence** represents the future of how teams interact with their business data. By combining multiple data sources, real-time collaboration, and conversational AI, Astra delivers insights that would be impossible to obtain manually.

Whether you're a small team looking to work smarter or a large organization seeking to democratize data access, Astra provides the tools and intelligence to transform how your business operates.

### Core Benefits Summary

✓ **Save Time**: Get instant answers instead of searching for hours
✓ **Make Better Decisions**: Insights from all your data, not just one source
✓ **Work Smarter**: AI handles analysis, you focus on action
✓ **Collaborate Better**: Team knowledge sharing with AI assistance
✓ **Stay Secure**: Enterprise-grade security with zero compromise
✓ **Move Fast**: Mobile-first design for work anywhere, anytime

---

## Contact & Additional Information

**Product Team:**
- Clay DiPani - Founder & CEO - clay@rockethub.co
- Matt Pugh - Technical Lead - mattpugh22@gmail.com

**Company:** RocketHub
**Website:** rockethub.co
**Platform:** Astra Intelligence
**Product Line:** AI Rocket (part of RocketHub ecosystem)

**Related Products:**
- Health Rocket: Personal health optimization
- EOS Rocket: Entrepreneurial Operating System implementation

---

**Document Version:** 1.0
**Last Updated:** November 29, 2025
**Next Review:** January 15, 2026
