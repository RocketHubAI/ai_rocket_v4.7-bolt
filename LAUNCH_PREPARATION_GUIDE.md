# Launch Preparation Guide
## Complete Setup System for AI Rocket + Astra Intelligence

**Version:** 1.0.0
**Last Updated:** December 8, 2025
**Status:** Active for All Users

---

## Overview

**Launch Preparation** is a comprehensive onboarding system that ensures users complete essential setup steps before accessing the full AI Rocket application. This guided flow helps users:

1. **Connect their data** (Fuel Stage, or anytime via Connect page > My Connections)
2. **Learn AI capabilities** (Boosters Stage)
3. **Configure team settings** (Guidance Stage)

Once users complete minimum requirements, they "launch" into the main application with access to **Mission Control** - a progress tracking and achievement system.

---

## Table of Contents

1. [Purpose & Goals](#purpose--goals)
2. [Entry Requirements](#entry-requirements)
3. [The Three Stages](#the-three-stages)
4. [Level & Points System](#level--points-system)
5. [Minimum Requirements to Launch](#minimum-requirements-to-launch)
6. [User Experience Flow](#user-experience-flow)
7. [Legacy User Handling](#legacy-user-handling)
8. [Exit & Logout Behavior](#exit--logout-behavior)
9. [Technical Implementation](#technical-implementation)

---

## Purpose & Goals

### Primary Objectives

1. **Ensure Data Connection**: Users must connect at least one data source before launching
2. **Feature Discovery**: Users learn key AI capabilities (chat, visualizations, reports)
3. **Team Configuration**: Admins complete critical team setup tasks
4. **Reduce Abandonment**: Guided flow prevents users from feeling lost
5. **Drive Engagement**: Gamified progression encourages thorough setup

### Success Metrics

- **Time to Launch**: Average time users take to complete Launch Prep
- **Completion Rate**: % of users who successfully launch (target: >90%)
- **Feature Adoption**: % of users who try visualizations, reports, and team chat
- **Data Connection Rate**: % of users who connect Drive/Gmail (target: >80%)
- **Return Rate**: % of launched users who return within 7 days

---

## Entry Requirements

### Who Sees Launch Preparation?

**All users** are automatically enrolled in Launch Preparation upon signup. This includes:

- New users signing up for the first time
- Existing users migrated during the rollout
- Both admin and member roles

### When Does It Appear?

Launch Preparation appears:

1. **After initial onboarding** (team creation/joining)
2. **Before accessing main app** (if not yet launched)
3. **After OAuth callbacks** (if setup incomplete)
4. **On every login** until user clicks "Launch AI Rocket"

### What Determines Eligibility?

All users are eligible. The system checks:

```sql
-- User exists in launch_preparation_eligible_users table
SELECT * FROM launch_preparation_eligible_users WHERE user_id = [current_user];

-- User's launch status
SELECT is_launched FROM user_launch_status WHERE user_id = [current_user];
```

---

## The Three Stages

Launch Preparation consists of three sequential stages, each with 5 levels:

### 🟠 Stage 1: Fuel Stage (Data Connection)

**Purpose**: Ensure users connect their business data to Astra

**Note**: After initial setup, connections can be fully managed from the Connect page > My Connections tab (reconnect, manage folders, add/remove folders, disconnect).

**Available Actions:**
- Connect Google Drive account
- Connect Microsoft OneDrive / SharePoint
- Select folders (Strategy, Projects, Meetings, Financials, and more)
- Trigger data sync

**Level Requirements:**

| Level | Description | Requirements | Points |
|-------|-------------|--------------|--------|
| **1** | Get started with your first document | 1 document (any type) | 10 |
| **2** | Establish your data foundation | 1 Strategy, 1 Project, 1 Meeting, 1 Financial | 20 |
| **3** | Build a solid data collection | 3 Strategy, 3 Project, 10 Meeting, 3 Financial | 30 |
| **4** | Establish a mature data foundation | 10 Strategy, 10 Project, 50 Meeting, 10 Financial | 40 |
| **5** | Advanced preparation for maximum insights | 10 Strategy, 10 Project, 100 Meeting, 10 Financial | 50 |

**Achievements:**
- First Document Upload (+5 points)
- Google Drive Connected (+10 points)
- Strategy Folder Selected (+10 points)
- Meetings Folder Selected (+10 points)
- Financial Folder Selected (+10 points)
- Projects Folder Selected (+10 points)

---

### 🔵 Stage 2: Boosters Stage (AI Interaction)

**Purpose**: Ensure users experience core AI capabilities

**Available Actions:**
- Use Guided Chat for personalized prompts
- Send messages to Astra in Team or Private mode
- Generate data visualizations
- Create manual reports
- Schedule recurring reports

**Level Requirements:**

| Level | Description | Requirements | Points |
|-------|-------------|--------------|--------|
| **1** | Start talking to Astra | Use Guided Chat OR send 5 prompts | 10 |
| **2** | See your data come to life | Create 1 visualization | 20 |
| **3** | Generate insights on demand | Generate 1 manual report | 30 |
| **4** | Set up automated insights | Schedule 1 recurring report | 40 |
| **5** | Build your first AI agent | Build 1 AI agent *(coming soon)* | 50 |

**Achievements:**
- First Message Sent (+5 points)
- First Guided Chat Used (+10 points)
- First Visualization Created (+10 points)
- First Manual Report Generated (+10 points)
- First Scheduled Report Created (+10 points)

---

### 🟢 Stage 3: Guidance Stage (Team Configuration)

**Purpose**: Ensure team settings and collaboration features are configured

**Available Actions:**
- Configure team settings (name, preferences)
- Enable news preferences
- Invite team members
- *(Coming Soon)* Create AI job roles
- *(Coming Soon)* Create guidance documents

**Level Requirements:**

| Level | Description | Requirements | Points |
|-------|-------------|--------------|--------|
| **1** | Set up your team | Configure team settings | 10 |
| **2** | Stay informed | Enable news preferences | 20 |
| **3** | Build your team | Invite 1+ team member | 30 |
| **4** | Create automated workflows | Create 1 AI job *(coming soon)* | 40 |
| **5** | Document your processes | Create 1 guidance document *(coming soon)* | 50 |

**Achievements:**
- Team Settings Configured (+10 points)
- News Preferences Enabled (+10 points)
- First Team Member Invited (+10 points)
- Admin Drive Setup Complete (+20 points)

---

## Level & Points System

### How Levels Work

**Each stage has 5 levels** that unlock progressively:

1. **Level 0**: Starting state (no requirements met)
2. **Level 1**: Minimum viable setup
3. **Level 2**: Basic functionality unlocked
4. **Level 3**: Intermediate usage
5. **Level 4**: Advanced features enabled
6. **Level 5**: Complete mastery

**Progression Model:**
- Users advance levels by meeting specific requirements
- Each level awards points upon completion
- Points contribute to overall Launch Points total
- Higher levels require more substantial accomplishments

### How Points Work

**Two types of points:**

1. **Task Achievement Points**: Earned by completing specific actions
   - Example: "First Visualization Created" = +10 points

2. **Level Achievement Points**: Earned by reaching new levels
   - Example: "Fuel Level 2 Reached" = +20 points

**Points are cumulative** and visible in:
- Stage progress cards
- Launch Preparation header
- Mission Control dashboard (after launch)

### Point Values

**Fuel Stage:**
- Task achievements: 5-10 points each
- Level achievements: 10-50 points (cumulative: 150 max)

**Boosters Stage:**
- Task achievements: 5-10 points each
- Level achievements: 10-50 points (cumulative: 150 max)

**Guidance Stage:**
- Task achievements: 10-20 points each
- Level achievements: 10-50 points (cumulative: 150 max)

**Maximum Total Points**: 450 points (all stages at level 5)

---

## Minimum Requirements to Launch

### Launch Criteria

Users must meet **minimum level requirements** across all three stages:

| Stage | Minimum Level | Points Required | Description |
|-------|---------------|-----------------|-------------|
| **Fuel** | Level 1 | 10 | At least 1 document connected |
| **Boosters** | Level 4 | 100 | Chat, visualization, manual report, and scheduled report completed |
| **Guidance** | Level 2 | 30 | Team settings and news preferences configured |

**Minimum Total Points to Launch**: 140 points

### Why These Requirements?

1. **Fuel Level 1**: Ensures data is connected for AI to provide meaningful insights
2. **Boosters Level 4**: Guarantees user has experienced all core AI features
3. **Guidance Level 2**: Confirms team is properly configured for collaboration

### Launch Button Behavior

The "Launch AI Rocket" button:
- **Disabled (gray)** when requirements not met
- **Enabled (gradient)** when all minimums achieved
- Shows tooltip explaining remaining requirements
- Located in "Ready to Launch?" panel
- Visible from any stage

---

## User Experience Flow

### Initial Onboarding (New Users)

```
1. Sign Up with Invite Code
   ↓
2. Team Assignment (Admin creates team / Member joins team)
   ↓
3. Launch Preparation Onboarding Screens
   - Screen 1: Welcome to Launch Preparation
   - Screen 2: Three Stages Overview
   - Screen 3: Fuel Stage Introduction
   - Screen 4: Boosters Stage Introduction
   - Screen 5: Guidance Stage Introduction
   - Screen 6: Ready to Begin
   ↓
4. Launch Preparation Flow (Locked In)
   - Fuel Stage → Boosters Stage → Guidance Stage
   - Progress tracked in real-time
   - Cannot access main app until launched
   ↓
5. Click "Launch AI Rocket" (when requirements met)
   ↓
6. Celebration Animation
   ↓
7. Main Application (Mission Control unlocked)
```

### Legacy User Experience

Users who existed before Launch Prep rollout see a modified flow:

```
1. Login After Migration
   ↓
2. Launch Preparation Onboarding Screens (Special Banner)
   - "Welcome Back!" message
   - Explanation of new Launch Preparation System
   - One-time setup message
   - Earn points for completing tasks
   ↓
3. Same three-stage flow as new users
   ↓
4. Launch into main app when requirements met
```

**Special Banner Text:**
> "Welcome Back! We've introduced a new Launch Preparation System. Complete this one-time setup to unlock Mission Control and start tracking your team's progress!"

### Stage Navigation

**Stage Selector:**
- Always visible at top of Launch Prep screen
- Shows current stage with highlight
- Displays level badges for each stage
- Click to switch between stages (forward only)

**Progression Rules:**
- Start at Fuel Stage (locked to stage initially)
- Must reach Level 1 in current stage to unlock next stage
- Can return to previous stages anytime
- All progress is saved automatically

**Visual Indicators:**
- 🔒 Locked stages (gray, not clickable)
- 🟠/🔵/🟢 Active/unlocked stages (colored, clickable)
- ✓ Completed tasks (checkmark icon)
- Progress bars for each level requirement

---

## Exit & Logout Behavior

### Close Button (X)

Located in top-right header:
- **Action**: Shows confirmation modal
- **Modal Options**:
  - "Continue Setup" (cancel)
  - "Exit & Logout" (logs out user)
- **Outcome**: User is logged out and returned to login screen
- **Progress**: All progress is saved and restored on next login

### No Skip Option

**Critical Design Decision**: Users cannot skip Launch Prep

- No "Skip for now" button
- No "I'll do this later" option
- Must complete minimum requirements
- Only exit is logout

**Rationale:**
- Ensures users have proper setup for Mission Control
- Prevents confusion in main app without data connected
- Guarantees feature discovery and adoption
- Protects user experience by avoiding broken workflows

### Return After Logout

When user logs in again:
- Sees Launch Prep exactly where they left off
- All progress and levels preserved
- Can continue from any stage
- Onboarding screens not shown again

---

## Legacy User Handling

### Who Are Legacy Users?

**Legacy users** are users who existed before the Launch Prep rollout.

Identified by:
```sql
SELECT is_legacy_user FROM launch_preparation_eligible_users
WHERE user_id = [current_user];
```

### Migration Process

All existing users were migrated on December 8, 2025:

1. **Added to Eligible Users Table**
   - All existing users enrolled automatically
   - Users with `team_id` marked as `is_legacy_user = true`

2. **Initialized Launch Status**
   - Stage: `fuel`
   - Level: 0 (starting level)
   - Points: 0
   - `is_launched`: `false` (must complete Launch Prep)

3. **Backfilled Progress**
   - Created initial Fuel stage progress record
   - Set all stages to level 0

### Legacy User Experience Differences

**1. Special Welcome Banner**
- Appears on first onboarding screen
- Explains new Launch Preparation system
- Acknowledges they're existing users
- Sets expectations for one-time setup

**2. Retroactive Point Earning**
- Can earn points for data they've already connected
- Existing documents count toward Fuel levels
- Past actions don't automatically grant points
- Must trigger sync/actions to earn achievements

**3. Requirement Enforcement**
- Same requirements as new users
- Must reach minimum levels to launch
- Cannot bypass even if they used old system

### Technical Flag

```typescript
// Frontend check
const isLegacyUser = launchStatus?.is_legacy_user || false;

// Database field
user_launch_status.is_legacy_user: boolean
```

---

## Technical Implementation

### Database Schema

**launch_preparation_eligible_users**
```sql
CREATE TABLE launch_preparation_eligible_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_legacy_user boolean DEFAULT false
);
```

**user_launch_status**
```sql
CREATE TABLE user_launch_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  current_stage text DEFAULT 'fuel',
  total_points integer DEFAULT 0,
  is_launched boolean DEFAULT false,
  is_legacy_user boolean DEFAULT false,
  onboarding_seen boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**launch_preparation_progress**
```sql
CREATE TABLE launch_preparation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  stage text NOT NULL, -- 'fuel', 'boosters', 'guidance'
  level integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  last_level_up_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**launch_achievements**
```sql
CREATE TABLE launch_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  points_awarded integer NOT NULL,
  stage text, -- 'fuel', 'boosters', 'guidance'
  earned_at timestamptz DEFAULT now()
);
```

### React Hooks

**useLaunchPreparation()**
```typescript
const {
  launchStatus,
  stageProgress,
  achievements,
  loading,
  error,
  checkEligibility,
  initializeLaunchStatus,
  updateCurrentStage,
  recordAchievement,
  updateProgress,
  launch,
  refresh
} = useLaunchPreparation();
```

**useLaunchActivity()**
```typescript
const {
  recordMessage,
  recordVisualization,
  recordReport,
  recordScheduledReport,
  recordDriveConnection,
  recordFolderSelection,
  recordTeamSettings,
  recordNewsPreferences,
  recordInvite
} = useLaunchActivity();
```

### Level Calculation Logic

Located in: `src/lib/launch-preparation-utils.ts`

**Key Functions:**
- `isReadyToLaunch()` - Checks if minimum requirements met
- `canProgressToNextStage()` - Validates stage progression
- `calculateStageProgress()` - Returns 0-100% completion
- `getLevelRequirements()` - Returns level definitions per stage
- `getMinimumPointsToLaunch()` - Returns 140

### Real-Time Updates

**Realtime Subscriptions:**
```typescript
// Listen for progress updates
supabase
  .channel('launch_preparation_progress')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'launch_preparation_progress',
    filter: `user_id=eq.${userId}`
  }, handleProgressUpdate)
  .subscribe();
```

### Entry Point Logic

Located in: `src/App.tsx`

```typescript
// Determine if user needs Launch Prep
const needsLaunchPreparation =
  !needsOnboarding &&
  isEligibleForLaunchPrep &&
  !launchStatus?.is_launched;

// Routing logic
{needsLaunchPreparation ? (
  <LaunchPreparationFlow onLaunch={handleLaunchComplete} />
) : (
  <MainContainer /> // Full app access
)}
```

---

## Best Practices for Users

### For Admins

1. **Connect Drive Early**: The more data you connect, the faster you level up
2. **Select All Folders**: Choose Strategy, Projects, Meetings, and Financials
3. **Try Guided Chat**: Get personalized prompt suggestions
4. **Schedule Reports**: Set up recurring insights for your team
5. **Configure Team Settings**: Complete team setup before inviting members

### For Members

1. **Complete Required Levels**: Focus on minimum requirements first
2. **Explore Features**: Try visualizations and reports to earn points
3. **Engage with Astra**: Send messages to understand AI capabilities
4. **Review Team Data**: Understand what data is available
5. **Complete Setup**: Don't logout until launched

### For Both

1. **Read Onboarding Screens**: They explain what's expected
2. **Check Requirements**: Review what's needed for each level
3. **Track Progress**: Watch your points and levels increase
4. **Complete Minimums First**: Don't try to max out early stages
5. **Launch When Ready**: Don't wait - minimum requirements are enough

---

## Troubleshooting

### Common Issues

**Issue**: Stuck on a level with no progress
- **Solution**: Check specific requirements for that level
- **Action**: Click level card to see detailed requirements

**Issue**: Can't advance to next stage
- **Solution**: Must reach Level 1 in current stage first
- **Action**: Complete at least one requirement in current stage

**Issue**: "Launch AI Rocket" button is disabled
- **Solution**: Haven't met minimum requirements
- **Action**: Check "Ready to Launch?" panel for missing items

**Issue**: Progress not updating after completing task
- **Solution**: May need to refresh or trigger sync
- **Action**: Navigate away and back, or wait 5-10 seconds

**Issue**: Want to exit but don't want to lose progress
- **Solution**: Progress is auto-saved continuously
- **Action**: Safe to logout - progress will be restored

### Getting Help

- **Help Assistant**: Available via header icon (context-aware)
- **Support Menu**: Submit feedback or contact support
- **Tool Tips**: Hover over elements for inline help
- **Level Cards**: Click for detailed requirement explanations

---

## Future Enhancements

### Planned Features

1. **Agent Builder Integration** (Boosters Level 5)
   - Build custom AI agents during Launch Prep
   - Unlock advanced capabilities

2. **AI Specialists** (Boosters Level 5)
   - Create specialized AI team members like Business Coach, Finance Director
   - Deploy AI specialists to handle tasks 24/7

3. **Guidance Documents** (Guidance Level 5)
   - Document business processes
   - Train AI on custom workflows

4. **Social Sharing**
   - Share launch achievements
   - Invite colleagues with referral tracking

5. **Leaderboards**
   - Compare progress with other teams
   - Gamification elements

---

## Related Documentation

- [Mission Control and Launch Points Guide](./MISSION_CONTROL_LAUNCH_POINTS_GUIDE.md)
- [User Onboarding Guide](./USER_ONBOARDING_GUIDE.md)
- [Google Drive Integration Setup](./GOOGLE_DRIVE_INTEGRATION_SETUP.md)
- [Scheduled Reports Setup](./SCHEDULED_REPORTS_SETUP.md)
- [AI Rocket Key Features](./AI_ROCKET_KEY_FEATURES.md)

---

**Launch Preparation ensures every user starts their AI Rocket journey with proper setup, feature discovery, and team configuration - setting the foundation for long-term success with Astra Intelligence.**
