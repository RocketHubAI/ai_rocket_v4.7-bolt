# What's New Feature Documentation

## Overview

The "What's New" section in the Help Center keeps users informed about the latest features and improvements to AI Rocket. This feature provides a comprehensive, version-tracked changelog that users can access anytime.

## Location

Access "What's New" from:
- Help Center (? icon in header)
- "What's New" tab (second tab with Zap icon)

## Features

### Version Tracking
- Each feature/improvement includes a version number (e.g., "1.0.0")
- Chronological ordering with newest features at the top
- Date added for each entry

### Feature Types
1. **New Feature**: Brand new capabilities added to the platform
   - Icon: Orange Sparkles
   - Badge: Orange "New Feature" badge

2. **Improvement**: Enhancements to existing features
   - Icon: Blue TrendingUp
   - Badge: Blue "Improvement" badge

### User Experience
- **Expandable Details**: Click any feature to see full description
- **Latest Badge**: Newest feature marked with "Latest" badge
- **Organized Display**: Clean, scannable list with visual hierarchy
- **Rich Descriptions**: Multi-paragraph descriptions with bullet lists

### Database Structure

**Table: `whats_new`**
```sql
- id (uuid): Primary key
- title (text): Short feature title
- description (text): Detailed feature description
- version (text): Version number (e.g., "1.0.0")
- feature_type (text): "new_feature" or "improvement"
- date_added (date): Release date
- is_published (boolean): Whether to show in What's New
- display_order (integer): Sorting order (higher = newer)
- created_at (timestamptz): Record creation timestamp
- updated_at (timestamptz): Last update timestamp
```

### Security (RLS Policies)
- All authenticated users can view published features
- Only super admins can create/edit/delete entries
- Super admin emails:
  - clay@rockethub.co
  - claytondipani@gmail.com
  - mattpugh22@gmail.com

## Adding New Features

### For Super Admins
New features can be added directly to the database:

```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Feature Title',
  'Detailed description with examples and benefits...',
  '1.1.0',
  'new_feature',
  '2025-11-15',
  true,
  1100  -- Higher number = newer, appears first
);
```

### Description Format
Descriptions support:
- Multiple paragraphs (separated by blank lines)
- Bullet lists (use • at start of line)
- Rich text formatting in markdown style

Example:
```
This is the main description paragraph explaining the feature.

Key benefits include:
• Benefit one with details
• Benefit two with examples
• Benefit three with impact

This feature helps teams work more efficiently by providing...
```

## Display Order System

Features are sorted by `display_order` (descending):
- 1000+: Current version features
- 900-999: Previous major features
- 800-899: Earlier features
- And so on...

**Recommendation**: Increment by 100 for major features, by 10 for minor updates.

## Component Structure

### WhatsNewSection Component
**File**: `src/components/WhatsNewSection.tsx`

**Features**:
- Fetches published features from Supabase
- Displays in chronological order (newest first)
- Expandable/collapsible details
- Feature type badges and icons
- Date formatting with date-fns
- Loading and error states

**Props**: None (self-contained)

### Integration with Help Center
**File**: `src/components/HelpCenter.tsx`

- Added as "What's New" tab between "Quick Start" and "FAQ"
- Orange accent color for the tab
- Zap icon for visual distinction
- Full-width layout with padding

## Design Guidelines

### Visual Elements
- **Colors**:
  - New Features: Orange (#f97316)
  - Improvements: Blue (#3b82f6)
  - Latest Badge: Orange solid background

- **Icons**:
  - New Features: Sparkles icon
  - Improvements: TrendingUp icon
  - Tab: Zap icon

### Typography
- **Title**: Semibold, 14px, white
- **Description**: Regular, 14px, gray-300
- **Badges**: Extra small (12px), respective colors
- **Dates**: 12px, gray-400

### Spacing
- Items: 12px gap between cards
- Card padding: 16px
- Expanded content: Additional 16px padding
- Section margins: 24px

## Mobile Responsiveness

- Tabs scroll horizontally on mobile
- Cards stack vertically
- Touch-friendly expand/collapse
- Optimized text sizing for small screens
- Responsive icon sizing

## Performance Considerations

- Lazy loading: Only loads when Help Center is opened
- Efficient queries: Filters for `is_published = true`
- Indexed sorting: Uses `display_order` index
- Minimal re-renders: Expand state tracked in Set

## Future Enhancements

Potential improvements:
1. **Search/Filter**: Filter by feature type or date range
2. **Changelog Export**: Export as PDF or markdown
3. **RSS Feed**: Subscribe to updates
4. **Email Notifications**: Alert users about new features
5. **Feature Voting**: Let users vote on feature requests
6. **Tags**: Categorize features by area (UI, AI, Performance, etc.)
7. **Screenshots**: Add visual examples of features
8. **Version Comparison**: Compare features between versions

## Maintenance

### Updating Features
To edit existing features:
```sql
UPDATE whats_new
SET
  description = 'Updated description...',
  updated_at = now()
WHERE id = 'feature-uuid';
```

### Unpublishing Features
To hide features without deleting:
```sql
UPDATE whats_new
SET is_published = false
WHERE id = 'feature-uuid';
```

### Reordering Features
Adjust display_order to change position:
```sql
UPDATE whats_new
SET display_order = 950
WHERE id = 'feature-uuid';
```

## Best Practices

1. **Clear Titles**: Use action-oriented, descriptive titles
2. **Detailed Descriptions**: Explain what, why, and how
3. **Consistent Format**: Follow established description patterns
4. **Regular Updates**: Add features shortly after release
5. **Version Accuracy**: Match version numbers to actual releases
6. **User Benefits**: Focus on value to users, not technical details
7. **Visual Examples**: Describe UI elements users will see
8. **Chronological Order**: Maintain proper ordering via display_order

## Related Documentation

- User Onboarding: `USER_ONBOARDING_GUIDE.md`
- Help System: `src/components/HelpCenter.tsx`
- Documentation Context: `src/lib/documentation-context.ts`

## Help Assistant Integration

The "What's New" content is not directly integrated into the help assistant context, but users can ask questions about features in the "Ask AI Rocket" tab, and AI Rocket will reference the comprehensive documentation context which includes feature explanations.

## Example Entry

```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'AI Rocket Guided Setup for Google Drive',
  'Introducing AI Rocket Guided Setup! When connecting Google Drive folders, AI Rocket now walks you through each folder type (Strategy, Meetings, Financial) with helpful examples and sample prompts.

• Step-by-step guidance with examples
• Sample prompts for each data type
• Best practices and tips
• Save & Continue Later functionality
• Progress tracking

This guided experience helps teams understand the value of each data type and ensures proper folder configuration.',
  '1.0.0',
  'new_feature',
  '2025-11-15',
  true,
  1000
);
```

---

## Recent Features to Add

### February 2026 Updates

#### Assistant Skills - Personalize Your AI (v2.1.0)
**Type:** New Feature
**Description:**
Activate capability modules that sharpen your AI assistant's expertise. Choose from 10 skills like Financial Analyst, Marketing Strategist, Growth Strategist, and more. Each active skill enriches the assistant's analysis in that domain. Stack multiple skills for multi-lens insights.

Key features:
- 10 available skills across finance, marketing, strategy, operations, and more
- Toggle skills on/off per user with one click
- Stack multiple skills simultaneously
- Active skills enhance overnight insights and proactive suggestions
- Suggest New Skill feature lets you submit ideas for skills you would like to see added

**Display Order:** 2100

#### Guided Task Builder - Pre-Built Task Templates (v2.1.0)
**Type:** New Feature
**Description:**
Browse 16 pre-built task templates to quickly set up useful scheduled tasks. Templates are organized across Productivity, Research & Intelligence, Team & Alignment, and Growth & Strategy categories.

Key features:
- 16 ready-to-use templates: Morning Goal Review, Industry News Digest, Weekly Progress Summary, Competitive Intelligence Brief, and more
- 4 organized categories with popular templates highlighted
- Customize title, AI instructions, frequency, time, and day before activating
- One-click creation from any template
- Templates align with Assistant Skills domains for focused automation

**Display Order:** 2060

#### Connection Management Hub (v2.1.0)
**Type:** Improvement
**Description:**
The Connect page now provides full management of all your data connections from one place. Admins can connect new providers, reconnect expired tokens, manage folders (add or remove), and disconnect providers -- all without navigating to Launch Preparation.

Key features:
- My Connections tab with full management capabilities
- Connect Google Drive or Microsoft OneDrive directly from the Connect page
- Reconnect expired tokens with one click
- Add or remove folders using the built-in folder browser
- Disconnect providers with confirmation dialog
- View folder details, document counts, and sync status at a glance

**Display Order:** 2050

#### Proactive Assistant (Preview) (v2.0.0)
**Type:** New Feature
**Description:**
Your AI assistant is getting smarter! The Proactive Assistant monitors your business data overnight and delivers personalized morning insights before you even ask. Configure notification channels, quiet hours, and proactive level in User Settings.
**Display Order:** 2000

#### Scheduled Tasks & Reminders (Preview) (v2.0.0)
**Type:** New Feature
**Description:**
Ask your AI assistant to schedule recurring or one-time tasks! Simply tell your assistant what you need and when. Supports reminders, research, reports, goal reviews, and custom prompts with flexible scheduling options.
**Display Order:** 1950

#### Connected Apps Hub (Preview) (v2.0.0)
**Type:** New Feature
**Description:**
A unified dashboard to connect and manage all your business tools. Browse 20+ integrations across 9 categories with connection status tracking, usage analytics, and encrypted credential storage.
**Display Order:** 1900

#### MCP Tools & API Wizard (Preview) (v2.0.0)
**Type:** New Feature
**Description:**
Discover and manage automation tools powering your AI assistant. The API Wizard lets admins connect any custom API by pasting documentation -- AI automatically discovers endpoints and generates tool schemas.
**Display Order:** 1850

#### Assistant Mode Enhancements (Preview) (v2.0.0)
**Type:** Improvement
**Description:**
Major upgrades including 7-phase onboarding, custom assistant naming, quick action shortcuts, engagement streaks, dynamic suggestions, and impact tracking.
**Display Order:** 1800

---

### January 2026 Updates

#### Creative Suite - AI-Powered Images & Presentations (v1.8.0)
**Type:** New Feature
**Description:**
Introducing Creative Suite - generate beautiful AI-powered images and presentations from your team's data! Choose from 15+ preset content types or create custom visualizations with various artistic styles.

Key features:
- **Content Types**: 15+ presets organized by category: Overview (Team Snapshot, Team Wins), Foundation (Mission, Core Values), Progress (Goals, Weekly/Quarterly/Yearly Reviews), Marketing (Sales Campaign, Thought Leadership), Analysis (Challenges & Opportunities, Financial Health, Trends & Insights, Innovation & Ideas), and Custom prompts
- **Visualization Types**: Single Image or Multi-Slide Presentations (3, 5, 7, or 10 slides)
- **Style Options**: Presentation Styles (Modern Gradient, Tech & Innovation, Bold Headlines, Minimalist Clean, Corporate Professional, Creative Playful) and Image Styles (Photorealistic, Digital Art, 3D Render, Infographic)
- **Text Integration**: Choose how text appears - Integrated, Overlay, Minimal, or Caption
- **Layout Options**: Landscape (16:9), Portrait (9:16), or Square (1:1)
- Data-aware content selection - only shows options you have data for
- Save to your personal gallery and export to PDF
- Select up to 3 content types per creation for focused, coherent output

Creative Suite makes it easy to turn your business data into compelling visual content for presentations, social media, stakeholder updates, and more.

**Display Order:** 1600

#### Microsoft OneDrive & SharePoint Sync (v1.7.0)
**Type:** New Feature
**Description:**
AI Rocket now supports Microsoft OneDrive and SharePoint as a data source! Enterprise teams using Microsoft 365 can now connect their cloud storage alongside Google Drive and local uploads.

Key features:
- Connect Microsoft OneDrive personal or business accounts
- Sync SharePoint document libraries
- Full support for Microsoft Office files (Word, Excel, PowerPoint)
- Automatic AI categorization of Microsoft documents
- Real-time sync progress tracking
- Multi-provider support - use Google, Microsoft, or both simultaneously
- Manage connected folders with document counts per folder
- Remove folders with option to keep or delete synced documents

This is perfect for enterprise teams using Microsoft 365 who want to leverage their existing document infrastructure with AI Rocket's AI capabilities.

**Display Order:** 1500

#### 1. Team Dashboard - Daily AI-Powered Insights (v1.6.0)
**Type:** New Feature
**Description:**
Introducing Team Dashboard - daily AI-powered insights on your team's goals, mission alignment, and overall health! AI Rocket analyzes your synced data every day and presents actionable metrics in a beautiful 3-panel layout.

Key features:
- Goals & Targets Panel: Track projects, OKRs, milestones, and KPIs with status indicators and progress percentages
- Mission Alignment Panel: See how well current work aligns with company mission and core values, with concrete examples
- Team Health Panel: Overall health score with metrics for data richness, engagement, meeting cadence, financial health, and risk indicators
- AI-generated recommendations based on current state analysis
- Export to PDF for sharing with stakeholders and in meetings
- Custom instructions to focus on metrics that matter most to your team
- Daily automatic updates at midnight EST
- Manual regeneration on-demand for admins

Team Dashboard helps you stay on top of what matters most by analyzing all your synced documents and surfacing the key insights your team needs to stay aligned and make progress.

**Display Order:** 1450

#### 2. Category Data Access - Granular Data Permissions (v1.5.0)
**Type:** New Feature
**Description:**
Introducing Category Data Access - control exactly which data categories each team member can access when chatting with AI Rocket! Admins can now grant or restrict access to Strategy, Meetings, Financial, and Projects data on a per-user basis.

Key features:
- Per-user category access controls managed by admins
- Granular permissions for Strategy, Meetings, Financial, and Projects data
- AI Rocket automatically filters AI responses based on user permissions
- New team members get full access by default (admins can customize)
- Visual indicators in User Settings showing category access status
- Invite codes can include pre-configured category access for new users
- Seamless integration - users only see data they're authorized to access

This feature is perfect for teams that need to restrict sensitive financial data or strategic documents to specific team members while still allowing everyone to benefit from AI insights on their authorized data.

**Display Order:** 1350

---

### December 2025 Updates

#### 1. Local File Sync - Unlimited Data from Any Source (v1.3.0)
**Type:** New Feature
**Description:**
You can now sync unlimited data from both your local files AND Google Drive folders! Upload documents directly to AI Rocket without needing to store them in Google Drive first.

Key capabilities:
- Drag-and-drop any supported file directly into AI Rocket
- Supports PDFs, Word docs (.docx), Excel (.xlsx), PowerPoint (.pptx), and text files (.txt, .md, .csv, .json)
- Files are processed and categorized automatically by AI
- All uploaded files count toward your Fuel Level
- View and manage local uploads alongside Google Drive documents
- Delete local files when no longer needed

Combined with Google Drive sync, you now have complete flexibility to power AI Rocket with ALL your business data from any source.

**Display Order:** 1300

#### 2. AI-Powered Report Emails (v1.2.0)
**Type:** New Feature
**Description:**
Your scheduled reports now come with beautifully designed email summaries! AI Rocket generates visually rich emails that make it easy to stay informed without logging in.

Each report email includes:
• Visual section headers with icons for easy scanning
• Key insights organized into clear categories
• "In This Report" overview for quick navigation
• One-click access to view the full report
• Report details including name, type, and schedule

The emails are automatically generated when your scheduled reports run, delivering a professional summary directly to your inbox.

**Display Order:** 1200

---

### November 2025 Updates

The following features have been recently implemented and should be added to the What's New section:

#### 1. Enhanced Error Handling (v1.1.1)
**Type:** Improvement
**Description:**
AI Rocket now provides clear, user-friendly error messages when unable to generate responses. Instead of technical errors, you'll see helpful suggestions:

• What went wrong in plain English
• Specific steps you can try to resolve the issue
• When to contact support for help

This applies to network errors, timeouts, empty responses, and server errors in both Private and Team Chat modes.

**Display Order:** 1110

#### 2. Balanced Data Category Usage in Guided Chat (v1.1.0)
**Type:** Improvement
**Description:**
AI Rocket Guided Chat now ensures balanced use of all your data types. When you have strategy documents, meeting notes, AND financial records, all three suggested prompts will reference multiple data categories:

• Prompt 1: Strategy + Meetings alignment
• Prompt 2: Financials + Strategy insights
• Prompt 3: Cross-functional analysis (all 3 types)

This ensures comprehensive insights across your entire business data.

**Display Order:** 1105

#### 3. Meetings Data Display Fix (v1.1.0)
**Type:** Improvement
**Description:**
Fixed an issue where meeting documents weren't appearing during AI Rocket Guided Chat prompt generation. Now all 123+ meeting documents are properly detected and used in personalized prompt suggestions.

**Display Order:** 1100

---

## Summary

The "What's New" feature provides a professional, user-friendly way to keep the team informed about platform updates. It's easily accessible, well-organized, and designed to highlight the continuous improvement of AI Rocket.

### Quick Add SQL Snippets

**Assistant Skills - Personalize Your AI:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Assistant Skills - Personalize Your AI',
  'Activate capability modules that sharpen your AI assistant''s expertise! Choose from 10 skills like Financial Analyst, Marketing Strategist, Growth Strategist, and more. Each active skill enriches the assistant''s analysis in that domain.

Key features:
- 10 available skills: Financial Analyst, Marketing Strategist, Competitive Intelligence, Operations Optimizer, Team Coach, Growth Strategist, Content Creator, Project Manager, Innovation Scout, Customer Advocate
- Toggle skills on/off per user with one click
- Stack multiple skills simultaneously for multi-lens analysis
- Active skills enhance overnight insights and proactive suggestions
- Suggest New Skill feature lets you submit ideas for new skills you''d like to see added',
  '2.1.0',
  'new_feature',
  '2026-02-09',
  true,
  2100
);
```

**Guided Task Builder - Pre-Built Task Templates:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Guided Task Builder - Pre-Built Task Templates',
  'Browse 16 pre-built task templates to quickly set up useful scheduled tasks! Templates are organized across Productivity, Research & Intelligence, Team & Alignment, and Growth & Strategy categories.

Key features:
- 16 ready-to-use templates: Morning Goal Review, Industry News Digest, Weekly Progress Summary, Competitive Intelligence Brief, and more
- 4 organized categories with popular templates highlighted
- Customize title, AI instructions, frequency, time, and day before activating
- One-click creation from any template
- Templates align with Assistant Skills domains for focused automation',
  '2.1.0',
  'new_feature',
  '2026-02-09',
  true,
  2060
);
```

**Connection Management Hub:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Connection Management Hub',
  'The Connect page now provides full management of all your data connections from one place! Admins can connect new providers, reconnect expired tokens, manage folders (add or remove), and disconnect providers -- all without navigating to Launch Preparation.

Key features:
- My Connections tab with full management capabilities
- Connect Google Drive or Microsoft OneDrive directly from the Connect page
- Reconnect expired tokens with one click
- Add or remove folders using the built-in folder browser
- Disconnect providers with confirmation dialog
- View folder details, document counts, and sync status at a glance',
  '2.1.0',
  'improvement',
  '2026-02-09',
  true,
  2050
);
```

**Creative Suite - AI-Powered Images & Presentations:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Creative Suite - AI-Powered Images & Presentations',
  'Generate beautiful AI-powered images and presentations from your team''s data! Choose from 15+ preset content types or create custom visualizations with various artistic styles.

Key features:
- Content Types: 15+ presets including Team Snapshot, Sales Campaign, Thought Leadership, Goals, Financial Health, Trends & Insights, and more
- Visualization Types: Single Image or Multi-Slide Presentations (3, 5, 7, or 10 slides)
- Style Options: Presentation Styles (Modern Gradient, Tech & Innovation, etc.) and Image Styles (Photorealistic, Digital Art, 3D Render, Infographic)
- Text Integration: Choose Integrated, Overlay, Minimal, or Caption styles
- Layout Options: Landscape (16:9), Portrait (9:16), or Square (1:1)
- Data-aware content selection - only shows options you have data for
- Save to your personal gallery and export to PDF

Turn your business data into compelling visual content for presentations, social media, and stakeholder updates.',
  '1.8.0',
  'new_feature',
  '2026-01-23',
  true,
  1600
);
```

**Microsoft OneDrive & SharePoint Sync:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Microsoft OneDrive & SharePoint Sync',
  'AI Rocket now supports Microsoft OneDrive and SharePoint as a data source! Enterprise teams using Microsoft 365 can now connect their cloud storage alongside Google Drive and local uploads.

Key features:
- Connect Microsoft OneDrive personal or business accounts
- Sync SharePoint document libraries
- Full support for Microsoft Office files (Word, Excel, PowerPoint)
- Automatic AI categorization of Microsoft documents
- Real-time sync progress tracking
- Multi-provider support - use Google, Microsoft, or both simultaneously
- Manage connected folders with document counts per folder
- Remove folders with option to keep or delete synced documents

This is perfect for enterprise teams using Microsoft 365 who want to leverage their existing document infrastructure with AI Rocket''s AI capabilities.',
  '1.7.0',
  'new_feature',
  '2026-01-20',
  true,
  1500
);
```

**Team Dashboard - Daily AI-Powered Insights:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Team Dashboard - Daily AI-Powered Insights',
  'Introducing Team Dashboard - daily AI-powered insights on your team''s goals, mission alignment, and overall health! AI Rocket analyzes your synced data every day and presents actionable metrics in a beautiful 3-panel layout.

Key features:
- Goals & Targets Panel: Track projects, OKRs, milestones, and KPIs with status indicators and progress percentages
- Mission Alignment Panel: See how well current work aligns with company mission and core values
- Team Health Panel: Overall health score with metrics for data richness, engagement, meeting cadence, and risk indicators
- AI-generated recommendations based on current state analysis
- Export to PDF for sharing with stakeholders
- Custom instructions to focus on metrics that matter to your team
- Daily automatic updates at midnight EST

Team Dashboard helps you stay on top of what matters most by surfacing the key insights your team needs to stay aligned and make progress.',
  '1.6.0',
  'new_feature',
  '2026-01-14',
  true,
  1450
);
```

**Category Data Access - Granular Data Permissions:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Category Data Access - Granular Data Permissions',
  'Control exactly which data categories each team member can access when chatting with AI Rocket! Admins can now grant or restrict access to Strategy, Meetings, Financial, and Projects data on a per-user basis.

Key features:
- Per-user category access controls managed by admins
- Granular permissions for Strategy, Meetings, Financial, and Projects data
- AI Rocket automatically filters AI responses based on user permissions
- New team members get full access by default (admins can customize)
- Visual indicators in User Settings showing category access status
- Invite codes can include pre-configured category access for new users
- Seamless integration - users only see data they''re authorized to access

This feature is perfect for teams that need to restrict sensitive financial data or strategic documents to specific team members while still allowing everyone to benefit from AI insights on their authorized data.',
  '1.5.0',
  'new_feature',
  '2026-01-13',
  true,
  1350
);
```

**Local File Sync - Unlimited Data:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Local File Sync - Unlimited Data from Any Source',
  'You can now sync unlimited data from both your local files AND Google Drive folders! Upload documents directly to AI Rocket without needing to store them in Google Drive first.

Key capabilities:
- Drag-and-drop any supported file directly into AI Rocket
- Supports PDFs, Word docs (.docx), Excel (.xlsx), PowerPoint (.pptx), and text files (.txt, .md, .csv, .json)
- Files are processed and categorized automatically by AI
- All uploaded files count toward your Fuel Level
- View and manage local uploads alongside Google Drive documents
- Delete local files when no longer needed

Combined with Google Drive sync, you now have complete flexibility to power AI Rocket with ALL your business data from any source.',
  '1.3.0',
  'new_feature',
  '2025-12-28',
  true,
  1300
);
```

**AI-Powered Report Emails:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'AI-Powered Report Emails',
  'Your scheduled reports now come with beautifully designed email summaries! AI Rocket generates visually rich emails that make it easy to stay informed without logging in.

Each report email includes:
• Visual section headers with icons for easy scanning
• Key insights organized into clear categories
• "In This Report" overview for quick navigation
• One-click access to view the full report
• Report details including name, type, and schedule

The emails are automatically generated when your scheduled reports run, delivering a professional summary directly to your inbox.',
  '1.2.0',
  'new_feature',
  '2025-12-13',
  true,
  1200
);
```

**Enhanced Error Handling:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Enhanced Error Handling',
  'AI Rocket now provides clear, user-friendly error messages when unable to generate responses. Instead of technical errors, you''ll see helpful suggestions:

• What went wrong in plain English
• Specific steps you can try to resolve the issue
• When to contact support for help

This applies to network errors, timeouts, empty responses, and server errors in both Private and Team Chat modes.',
  '1.1.1',
  'improvement',
  '2025-11-29',
  true,
  1110
);
```

**Balanced Data Usage:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Balanced Data Category Usage in Guided Chat',
  'AI Rocket Guided Chat now ensures balanced use of all your data types. When you have strategy documents, meeting notes, AND financial records, all three suggested prompts will reference multiple data categories:

• Prompt 1: Strategy + Meetings alignment
• Prompt 2: Financials + Strategy insights
• Prompt 3: Cross-functional analysis (all 3 types)

This ensures comprehensive insights across your entire business data.',
  '1.1.0',
  'improvement',
  '2025-11-29',
  true,
  1105
);
```

**Meetings Data Fix:**
```sql
INSERT INTO whats_new (
  title,
  description,
  version,
  feature_type,
  date_added,
  is_published,
  display_order
) VALUES (
  'Meetings Data Display Fix',
  'Fixed an issue where meeting documents weren''t appearing during AI Rocket Guided Chat prompt generation. Now all your meeting documents are properly detected and used in personalized prompt suggestions.',
  '1.1.0',
  'improvement',
  '2025-11-29',
  true,
  1100
);
```
