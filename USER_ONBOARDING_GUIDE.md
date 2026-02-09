# Astra Intelligence User Onboarding Guide

## Overview
This document outlines the complete onboarding experience for new users of Astra Intelligence, covering both Admin and Member user flows.

---

## Admin User Onboarding Flow

### Phase 0: Launch Preparation (New in v1.1)

**Note**: As of December 2025, all users complete Launch Preparation before accessing the main application.

#### Launch Preparation Overview
- **3 Stages**: Fuel (data connection), Boosters (AI interaction), Guidance (team configuration)
- **Level System**: 5 levels per stage with point rewards
- **Minimum Requirements**: Fuel L1 + Boosters L4 + Guidance L2 = 140 points
- **Completion**: Click "Launch AI Rocket" to unlock main app and Mission Control

**For complete details, see:** [Launch Preparation Guide](./LAUNCH_PREPARATION_GUIDE.md)

#### Launch Preparation Stages

**Stage 1 - Fuel (Data Connection)**
- Connect Google Drive account
- Select folders (Strategy, Projects, Meetings, Financials)
- Achieve Level 1 minimum (1 document)
- Recommended: Reach Level 2 (all folder types)

**Stage 2 - Boosters (AI Interaction)**
- Send messages to Astra
- Use Guided Chat feature
- Create first visualization
- Generate manual report
- Schedule recurring report
- **Required**: Reach Level 4 (all features tried)

**Stage 3 - Guidance (Team Configuration)**
- Configure team settings
- Enable news preferences
- **Required**: Reach Level 2 (both completed)
- Optional: Invite team members (Level 3)

**Launch Complete**: Access main application and Mission Control

---

### Phase 1: Account Creation & Team Setup

#### Step 1: Sign Up with Invite Code
- **Trigger**: User visits app for first time
- **Action**: User enters email, password, and valid invite code
- **System**:
  - Validates invite code is active and has remaining uses
  - Increments invite code usage counter
  - Creates user account
  - Determines if user is first team member (becomes admin) or joins existing team

#### Step 2: Team Assignment
- **New Team**: If invite code has no team assigned yet
  - System creates new team
  - User becomes team admin (role: 'admin')
  - User is prompted to name their team
- **Existing Team**: If invite code is tied to a team
  - User joins that team as a member (role: 'member')
  - User sees team welcome message

#### Step 3: Welcome Modal
- **Trigger**: First login after account creation
- **Content**:
  - Welcome message personalized to role (admin vs member)
  - Quick overview of Astra Intelligence capabilities
  - "Get Started" CTA button
- **Action**: User dismisses modal or clicks CTA

#### Step 4: Interactive Tour (Optional)
- **Trigger**: After welcome modal (optional for user)
- **Content**:
  - Guided walkthrough of main interface elements
  - Private vs Team chat mode explanation
  - How to ask questions and get AI insights
  - Visualization capabilities overview
  - Settings and configuration options
- **Action**: User can skip, take tour, or mark "Don't show again"

### Phase 2: Initial Configuration (Admin Only)

#### Step 5: User Settings Configuration
- **Access**: Click avatar → User Settings
- **Admin Tasks**:
  - Upload profile photo (optional)
  - Configure notification preferences
  - Set timezone (for scheduled reports)
  - Review personal information

#### Step 6: Team Settings Configuration
- **Access**: Click avatar → Team Settings (Admin only)
- **Admin Tasks**:
  - Set team name (if not done during setup)
  - Configure team-wide preferences
  - Review team member list
  - View team invite code for adding members

#### Step 7: Gmail Integration (Optional but Recommended)
- **Access**: User Settings → Gmail Sync
- **Admin Tasks**:
  1. Review Gmail sync benefits and permissions
  2. Click "Connect Gmail Account"
  3. Complete Google OAuth flow
  4. Review consent modal explaining what data will be synced
  5. Confirm and initiate email sync
  6. Wait for initial sync to complete (progress screen)
- **Outcome**: Team email data available for AI context

#### Step 8: Google Drive Integration (Optional but Recommended)
- **Access**: User Settings → Google Drive Sync
- **Admin Tasks**:
  1. Review Google Drive sync benefits
  2. Click "Connect Google Drive"
  3. Complete Google OAuth flow
  4. Select folders to sync:
     - **Strategy Documents Folder**: Plans, strategies, business documents
     - **Meetings Folder**: Meeting recordings, notes, transcripts
     - **Financial Documents Folder**: Google Sheets with financial data
  5. Save folder configuration
  6. Wait for initial sync
- **Outcome**: Team documents available for AI context

### Phase 3: First Interaction

#### Step 9: First AI Conversation
- **Trigger**: User navigates to main chat interface
- **Suggested Actions**:
  - Try Private mode first to test personal queries
  - Switch to Team mode to involve team members
  - Ask questions about connected data sources
  - Request data visualization
  - Explore @mention functionality

#### Step 10: Invite Team Members (Admin)
- **Access**: Team Settings → View Invite Code
- **Admin Tasks**:
  1. Copy team invite code
  2. Share with team members via preferred channel
  3. Explain that they'll join the same team automatically
  4. Team members can see all team conversations and data

### Phase 4: Ongoing Engagement

#### Step 11: Explore Advanced Features
- **Scheduled Reports**: Set up recurring AI-generated reports
- **Saved Visualizations**: Bookmark important data views
- **Help Center**: Access FAQs and best practices
- **Feedback System**: Provide feedback to improve Astra

---

## Member User Onboarding Flow

### Phase 1: Account Creation & Team Join

#### Step 1: Sign Up with Team Invite Code
- **Trigger**: User receives invite code from team admin
- **Action**: User enters email, password, and team's invite code
- **System**:
  - Validates invite code
  - Creates user account
  - Automatically joins user to admin's team as 'member' role

#### Step 2: Welcome Modal
- **Trigger**: First login
- **Content**:
  - Welcome to [Team Name]
  - Overview of Astra Intelligence
  - Explanation of member permissions
  - Information about team admin and data sources
- **Action**: User dismisses modal or clicks "Get Started"

#### Step 3: Interactive Tour (Optional)
- **Same as admin tour** but emphasizes:
  - Member can view all team conversations
  - Member can participate in team chats
  - Member can ask questions and generate visualizations
  - Member cannot modify team settings or integrations
  - Member cannot invite new users

### Phase 2: Initial Familiarization

#### Step 4: User Settings Configuration
- **Access**: Click avatar → User Settings
- **Member Tasks**:
  - Upload profile photo (optional)
  - Configure personal notification preferences
  - Set timezone for personal scheduled reports
  - Review team configuration (read-only)

#### Step 5: Review Team Data Sources
- **Access**: User Settings → Gmail Sync & Google Drive Sync
- **Member View**:
  - See which data sources are connected (read-only)
  - View last sync times
  - Understand what data is available for AI queries
  - See which admin manages the connections
  - Cannot connect, disconnect, or modify settings

### Phase 3: First Interaction

#### Step 6: Join Team Conversations
- **Trigger**: User opens main chat interface
- **Suggested Actions**:
  - Review existing team conversations in sidebar
  - Jump into ongoing discussions
  - Try Private mode for personal queries
  - Ask questions about team data
  - Use @mentions to direct questions to AI or team members

#### Step 7: Create First Conversation
- **Action**: Start new conversation in Team mode
- **Suggested First Questions**:
  - "What recent meetings have we had?"
  - "Summarize our strategic priorities"
  - "Show me our financial trends"
  - Request specific visualizations

### Phase 4: Ongoing Engagement

#### Step 8: Explore Features
- **Available to Members**:
  - Private and team conversations
  - Data visualizations
  - Scheduled reports (personal only)
  - Saved visualizations
  - Help center and feedback
  - Real-time collaboration
  - @mentions for team communication

---

## Key Onboarding Success Metrics

### Activation Metrics
- **Time to First Conversation**: Time from signup to first AI query
- **Time to First Team Interaction**: Time from signup to first team mode message
- **Integration Completion Rate**: % of admins who complete Gmail and/or Drive setup
- **Tour Completion Rate**: % of users who complete interactive tour

### Early Engagement Metrics
- **First Week Active Days**: Number of days user logs in during first week
- **Messages in First Week**: Number of messages sent in first 7 days
- **Feature Discovery**: Which features used in first week
- **Team Collaboration Rate**: % of new members who participate in team chats

### Admin-Specific Metrics
- **Team Building Rate**: Average number of members invited within first 30 days
- **Data Source Connection Time**: Time from signup to connecting first data source
- **Configuration Completion**: % of admins who complete all setup steps

### Member-Specific Metrics
- **Join-to-Active Time**: Time from joining team to first conversation
- **Collaboration Engagement**: Frequency of team mode usage vs private mode
- **Data Source Utilization**: % of queries that leverage team data sources

---

## Onboarding Best Practices

### For Admins
1. **Complete integrations early**: Gmail and Google Drive provide the most value
2. **Invite team members quickly**: Collaboration amplifies value
3. **Set up scheduled reports**: Establish regular data review cadence
4. **Explore visualizations**: See your data in new ways
5. **Provide feedback**: Help us improve the platform

### For Members
1. **Review team data sources**: Understand what data is available
2. **Start with questions**: Don't hesitate to ask AI anything
3. **Use team mode**: Collaborate openly with teammates
4. **Try visualizations**: Request charts and graphs for insights
5. **Set up personal reports**: Stay informed on your schedule

### For Both
1. **Complete the interactive tour**: 5 minutes well spent
2. **Try both private and team modes**: Different use cases
3. **Use @mentions**: Direct questions effectively
4. **Save important visualizations**: Build your knowledge library
5. **Check the Help Center**: Answers to common questions

---

## Onboarding Support Resources

### In-App Resources
- **Interactive Tour**: Contextual walkthrough of all features
- **Help Center**: FAQs and best practices
- **Help Assistant**: AI-powered support chat
- **Quick Start Guide**: Step-by-step getting started checklist
- **Tool Tips**: Contextual hints throughout interface

### Documentation
- **Launch Preparation Guide**: LAUNCH_PREPARATION_GUIDE.md
- **Mission Control & Launch Points**: MISSION_CONTROL_LAUNCH_POINTS_GUIDE.md
- **Gmail Setup Guide**: GMAIL_SETUP.md
- **Google Drive Integration**: GOOGLE_DRIVE_INTEGRATION_SETUP.md
- **Scheduled Reports**: SCHEDULED_REPORTS_SETUP.md
- **Admin Invites**: ADMIN_INVITE_SETUP.md

### Getting Help
- **Feedback Modal**: Accessible from any conversation
- **Help Assistant**: Real-time AI support within app
- **Team Admin**: Members can reach out to their admin
- **Feature Requests**: Submit via feedback system

---

## Post-Launch: Mission Control & Ongoing Engagement

### Mission Control Dashboard

After launching from Launch Preparation, users gain access to **Mission Control** - a comprehensive progress tracking dashboard.

**Features:**
- Personal and team point totals
- Stage progress visualization (Fuel, Boosters, Guidance)
- Achievement history and unlocks
- Next milestone previews
- Team collaboration metrics

**For complete details, see:** [Mission Control & Launch Points Guide](./MISSION_CONTROL_LAUNCH_POINTS_GUIDE.md)

### 30-Day Success Plan

### Week 1: Launch & Foundation
- [x] Complete Launch Preparation (140 points minimum)
- [x] Click "Launch AI Rocket"
- [ ] Review Mission Control dashboard
- [ ] Send 20+ messages to AI
- [ ] Try both private and team modes
- [ ] Goal: Reach 200 total points

### Week 2: Feature Exploration
- [ ] Create 5 visualizations (earn points)
- [ ] Set up 2 scheduled reports
- [ ] Participate in team conversations
- [ ] Save useful visualizations
- [ ] Explore help center
- [ ] Goal: Reach Boosters Level 5

### Week 3: Data & Team Integration
- [ ] Connect additional data sources (if available)
- [ ] Invite remaining team members
- [ ] Use AI insights in actual work
- [ ] Share visualizations with team
- [ ] Establish regular usage pattern
- [ ] Goal: Reach 400 total points

### Week 4: Mastery & Optimization
- [ ] Consistently use Astra daily
- [ ] Leverage all connected data sources
- [ ] Guide team members in usage
- [ ] Optimize scheduled reports
- [ ] Complete all stages at Level 5
- [ ] Goal: Reach Power User status (500+ points)

---

## Measuring Onboarding Success

### Updated Success Criteria (v1.1)

An onboarding is considered **successful** when a user:
1. ✅ Completes account creation and team assignment
2. ✅ Completes Launch Preparation (140+ points)
3. ✅ Successfully launches into main application
4. ✅ Returns for 3+ sessions in first week
5. ✅ Reaches 250+ total points within 30 days
6. ✅ Engages with Mission Control dashboard regularly

**Ultimate Success**: User becomes a weekly active user (WAU) with consistent Mission Control engagement and 500+ Launch Points.
