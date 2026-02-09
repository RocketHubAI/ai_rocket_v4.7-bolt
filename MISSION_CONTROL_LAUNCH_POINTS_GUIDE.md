# Mission Control & Launch Points Guide
## Progress Tracking and Achievement System for AI Rocket

**Version:** 1.0.0
**Last Updated:** December 8, 2025
**Status:** Active for All Launched Users

---

## Overview

**Mission Control** is the central progress tracking and achievement dashboard for AI Rocket + Astra Intelligence. After users complete Launch Preparation and "launch" into the main application, Mission Control becomes their hub for monitoring team progress, tracking achievements, and visualizing growth.

**Launch Points** are the gamified currency that tracks user and team engagement across all platform activities.

---

## Table of Contents

1. [What is Mission Control?](#what-is-mission-control)
2. [Access & Availability](#access--availability)
3. [Mission Control Interface](#mission-control-interface)
4. [Launch Points System](#launch-points-system)
5. [Achievement Types](#achievement-types)
6. [Point Distribution](#point-distribution)
7. [Team Points & Collaboration](#team-points--collaboration)
8. [Levels & Progression](#levels--progression)
9. [Use Cases & Benefits](#use-cases--benefits)
10. [Technical Implementation](#technical-implementation)

---

## What is Mission Control?

**Mission Control** is a comprehensive dashboard that provides:

### Core Functions

1. **Progress Visualization**
   - Real-time view of team advancement
   - Stage completion tracking (Fuel, Boosters, Guidance)
   - Individual and team point totals

2. **Achievement Tracking**
   - Complete history of earned achievements
   - Point awards for specific actions
   - Milestone celebrations

3. **Team Analytics**
   - Team-wide statistics
   - Collaborative progress metrics
   - Multi-admin coordination

4. **Motivation System**
   - Visual progression indicators
   - Level-up celebrations
   - Continuous engagement rewards

### Purpose & Goals

**Primary Objectives:**
- Maintain user engagement after initial launch
- Encourage exploration of advanced features
- Foster team collaboration and growth
- Provide visibility into platform usage
- Reward consistent activity and achievement

**Success Metrics:**
- Weekly active user rate (WAU)
- Average session duration
- Feature adoption beyond basics
- Team collaboration frequency
- Achievement unlock rate

---

## Access & Availability

### Who Can Access Mission Control?

**All launched users** have access to Mission Control:

- ✅ Users who completed Launch Preparation
- ✅ Users who clicked "Launch AI Rocket"
- ✅ Both admins and members
- ✅ Individual and team views available

### When Does It Become Available?

Mission Control unlocks:

1. **Immediately after launching** from Launch Preparation
2. **Accessible from main app** via header navigation
3. **Visible in sidebar** as navigation option
4. **Persistent across sessions** (always available once unlocked)

### Where to Find It

**Access Points:**
- Header icon (rocket/dashboard icon)
- Sidebar navigation menu
- Quick access from user profile
- Team settings integration

### Pre-Launch Restrictions

**Before launching**, Mission Control is:
- ❌ Not visible in navigation
- ❌ Not accessible via direct URL
- ❌ Not shown in onboarding
- ❌ Hidden from settings menus

**Rationale**: Mission Control is a post-launch feature designed for ongoing engagement, not initial setup.

---

## Mission Control Interface

### Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  🚀 Mission Control                             │
├─────────────────────────────────────────────────┤
│                                                  │
│  👤 Personal Stats        👥 Team Stats          │
│  ┌──────────────────┐   ┌──────────────────┐   │
│  │ Total Points: 450│   │ Team Points: 850 │   │
│  │ Level: 5         │   │ Team Level: 4    │   │
│  │ Rank: Power User │   │ Members: 3       │   │
│  └──────────────────┘   └──────────────────┘   │
│                                                  │
│  📊 Stage Progress                              │
│  ┌──────────────────────────────────────────┐  │
│  │ 🟠 Fuel:     ████████ Level 5 (150pts)  │  │
│  │ 🔵 Boosters: ██████░░ Level 4 (100pts)  │  │
│  │ 🟢 Guidance: ████░░░░ Level 3 (60pts)   │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  🏆 Recent Achievements                         │
│  ┌──────────────────────────────────────────┐  │
│  │ ✓ First Visualization Created  (+10pts) │  │
│  │ ✓ Fuel Level 5 Reached        (+50pts) │  │
│  │ ✓ Team Member Invited         (+10pts) │  │
│  │ ✓ 50th Message Sent           (+10pts) │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  📈 Next Milestones                             │
│  ┌──────────────────────────────────────────┐  │
│  │ □ Boosters Level 5 (Build first agent)  │  │
│  │ □ Guidance Level 4 (Create AI job role) │  │
│  │ □ 100 Messages Sent                      │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Components

**1. Personal Stats Card**
- Total points earned by user
- Current personal level
- User rank/tier
- Progress to next level

**2. Team Stats Card**
- Aggregate team points
- Team level (combined progress)
- Number of active members
- Team rankings (if enabled)

**3. Stage Progress Bars**
- Visual bars for each stage (Fuel, Boosters, Guidance)
- Current level indicators
- Points earned per stage
- Clickable to view stage details

**4. Recent Achievements Feed**
- Chronological list of unlocked achievements
- Point values displayed
- Achievement icons and descriptions
- Timestamp of unlock

**5. Next Milestones Section**
- Upcoming achievable goals
- Requirements for next levels
- Feature unlock previews
- Progress indicators

**6. Point History Chart** (optional)
- Line graph of points over time
- Comparison to team average
- Daily/weekly/monthly views
- Export capabilities

---

## Launch Points System

### What Are Launch Points?

**Launch Points** are a unified scoring system that:

- Track user engagement and achievement
- Reward meaningful platform interactions
- Enable progression through levels
- Foster competition and collaboration
- Provide tangible feedback on usage

### How Points Are Earned

Points are awarded for:

1. **Initial Setup Activities** (Launch Prep)
   - Data connection (Drive folders, Gmail)
   - Feature usage (chat, visualizations, reports)
   - Configuration completion (team settings, preferences)

2. **Ongoing Usage** (Post-Launch)
   - Sending messages to Astra
   - Creating visualizations
   - Generating reports
   - Inviting team members
   - Achieving milestones

3. **Level Completions**
   - Reaching new levels in any stage
   - Cumulative level rewards
   - Stage mastery bonuses

### Point Values Reference

**Setup & Configuration:**
- First Document Upload: **+5 points**
- Google Drive Connected: **+10 points**
- Strategy Folder Selected: **+10 points**
- Meetings Folder Selected: **+10 points**
- Financial Folder Selected: **+10 points**
- Projects Folder Selected: **+10 points**
- Team Settings Configured: **+10 points**
- News Preferences Enabled: **+10 points**
- First Team Member Invited: **+10 points**
- Admin Drive Setup Complete: **+20 points**

**AI Interaction:**
- First Message Sent: **+5 points**
- First Guided Chat Used: **+10 points**
- Every 10 Messages: **+5 points** (recurring)
- Every 50 Messages: **+10 points** (recurring)

**Visualizations & Reports:**
- First Visualization Created: **+10 points**
- First Manual Report Generated: **+10 points**
- First Scheduled Report Created: **+10 points**
- Every 5 Visualizations: **+5 points** (recurring)
- Every 10 Reports: **+10 points** (recurring)

**Level Achievements:**
- Fuel Level 1: **+10 points**
- Fuel Level 2: **+20 points**
- Fuel Level 3: **+30 points**
- Fuel Level 4: **+40 points**
- Fuel Level 5: **+50 points**
- *(Same pattern for Boosters and Guidance stages)*

**Team Collaboration:**
- First Team Member Invited: **+10 points**
- Every 5 Team Members: **+10 points** (recurring)
- Team Chat Message: **+1 point** (per message)

### Maximum Points

**Theoretical Maximum:**
- Fuel Stage: 150 points (levels) + ~50 points (tasks) = **200 points**
- Boosters Stage: 150 points (levels) + ~50 points (tasks) = **200 points**
- Guidance Stage: 150 points (levels) + ~50 points (tasks) = **200 points**
- Recurring Activities: Unlimited (ongoing usage)

**Total Stage Points**: 600+ points per user
**Team Cumulative**: Unlimited (sum of all members)

---

## Achievement Types

### Setup Achievements

Earned during Launch Preparation:

| Achievement | Description | Points | Stage |
|-------------|-------------|--------|-------|
| First Document Upload | Upload your first file | +5 | Fuel |
| Data Source Connected | Connect Drive or Gmail | +10 | Fuel |
| Folder Selection Complete | Select all 4 folder types | +40 | Fuel |
| First AI Conversation | Send first message to Astra | +5 | Boosters |
| Guided Chat Explorer | Use Guided Chat feature | +10 | Boosters |
| Visual Thinker | Create first visualization | +10 | Boosters |
| Report Generator | Generate first report | +10 | Boosters |
| Scheduled Insights | Schedule first recurring report | +10 | Boosters |
| Team Configured | Complete team settings | +10 | Guidance |
| News Enabled | Enable news preferences | +10 | Guidance |
| Team Builder | Invite first team member | +10 | Guidance |

### Usage Achievements

Earned through ongoing platform usage:

| Achievement | Description | Points | Category |
|-------------|-------------|--------|----------|
| Chatty | Send 10 messages | +5 | Engagement |
| Conversationalist | Send 50 messages | +10 | Engagement |
| AI Expert | Send 100 messages | +20 | Engagement |
| Data Visualizer | Create 5 visualizations | +5 | Analytics |
| Dashboard Pro | Create 10 visualizations | +10 | Analytics |
| Report Regular | Generate 5 manual reports | +5 | Insights |
| Report Master | Generate 10 manual reports | +10 | Insights |
| Team Collaborator | Send 20 team messages | +5 | Collaboration |
| Mentor | Invite 3 team members | +15 | Growth |

### Level Achievements

Automatically earned when reaching new levels:

| Achievement | Description | Points | Stage |
|-------------|-------------|--------|-------|
| Fuel Level 1 | First document connected | +10 | Fuel |
| Fuel Level 2 | Data foundation established | +20 | Fuel |
| Fuel Level 3 | Solid data collection | +30 | Fuel |
| Fuel Level 4 | Mature data foundation | +40 | Fuel |
| Fuel Level 5 | Maximum data preparation | +50 | Fuel |
| *(Similar for Boosters & Guidance)* | | | |

### Milestone Achievements

Special recognition for significant accomplishments:

| Achievement | Description | Points | Trigger |
|-------------|-------------|--------|---------|
| Rocket Launch | Complete Launch Preparation | +50 | First Launch |
| Power User | Reach 500 total points | +25 | Cumulative |
| Team Captain | Have 5+ team members | +30 | Team Size |
| Data Master | All stages at Level 5 | +100 | Full Mastery |

---

## Point Distribution

### Individual vs Team Points

**Individual Points:**
- Tracked per user account
- Reflect personal progress
- Contribute to personal levels
- Visible in personal dashboard

**Team Points:**
- Sum of all team member points
- Reflect collective progress
- Enable team-wide achievements
- Visible in team dashboard

### Point Persistence

**Where Points Are Stored:**

```sql
-- Personal points
user_launch_status.total_points

-- Stage-specific points
launch_preparation_progress.points_earned

-- Achievement history
launch_achievements.points_awarded

-- Team aggregation (calculated)
SUM(user_launch_status.total_points)
WHERE team_id = [current_team]
```

**Point Durability:**
- ✅ Never decremented or removed
- ✅ Permanent record in database
- ✅ Historical tracking maintained
- ✅ Survive user role changes
- ✅ Persist across team transfers

### Retroactive Point Awarding

**Legacy Users:**
- Do NOT automatically receive points for past actions
- Must trigger new actions to earn points
- Existing data counts toward level requirements
- Can "catch up" by completing pending achievements

**Example**: User who connected Drive before Launch Prep:
- ❌ No automatic +10 points for past connection
- ✅ Documents count toward Fuel level requirements
- ✅ Can re-trigger sync to earn "Data Source Connected" achievement

---

## Team Points & Collaboration

### How Team Points Work

**Calculation:**
```typescript
teamPoints = sum(all_team_members.total_points)
```

**Updates:**
- Real-time aggregation on Mission Control load
- Recalculated after any member earns points
- Visible to all team members
- Used for team level progression

### Team Levels

**Progression Model:**

| Team Level | Total Points Required | Benefits |
|------------|----------------------|----------|
| **1** | 0-199 | Basic team features |
| **2** | 200-499 | Team analytics unlocked |
| **3** | 500-999 | Advanced collaboration |
| **4** | 1000-1999 | Premium features |
| **5** | 2000+ | Elite team status |

**Team Level Benefits:**
- Unlock team-wide features
- Enable advanced analytics
- Access to team leaderboards
- Premium AI capabilities
- Custom branding options

### Multi-Admin Support

**Points from Multiple Admins:**
- Each admin's points count equally
- Drive connections by any admin benefit team
- Collaborative setup encouraged
- No point penalties for multiple admins

**Example Scenario:**
- Admin A connects Drive (Strategy & Projects) → +20 team points
- Admin B connects Gmail & Meetings → +20 team points
- Total team benefit: +40 points from dual admin setup

### Member Contributions

**Members earn points for:**
- Sending messages to Astra
- Creating visualizations
- Generating reports
- Participating in team chats

**Members do NOT earn points for:**
- Connecting data sources (admin-only)
- Inviting team members (admin-only)
- Configuring team settings (admin-only)

---

## Levels & Progression

### Personal Levels

**Level Tiers:**

| Level | Points Range | Title | Description |
|-------|--------------|-------|-------------|
| **1** | 0-99 | Rookie | Just getting started |
| **2** | 100-249 | Explorer | Learning the ropes |
| **3** | 250-499 | Contributor | Regular user |
| **4** | 500-999 | Power User | Advanced capabilities |
| **5** | 1000+ | Master | Elite status |

**Level Benefits:**
- Personal achievement recognition
- Unlock advanced features
- Access to beta features
- Priority support
- Custom badges/titles

### Stage Levels

**Each stage (Fuel, Boosters, Guidance) has 5 levels:**

- **Level 0**: No progress
- **Level 1**: Minimum viable setup (10 points)
- **Level 2**: Basic proficiency (20 points)
- **Level 3**: Intermediate mastery (30 points)
- **Level 4**: Advanced usage (40 points)
- **Level 5**: Complete mastery (50 points)

**Stage Level Unlocks:**

**Fuel Level Progression:**
- L1: Can access Boosters stage
- L2: Enhanced data insights
- L3: Advanced search capabilities
- L4: Premium data features
- L5: Full data mastery

**Boosters Level Progression:**
- L1: Can access Guidance stage
- L2: Visualization features unlocked
- L3: Manual report generation
- L4: Scheduled reports enabled
- L5: AI agent builder access

**Guidance Level Progression:**
- L1: Team settings unlocked
- L2: News preferences available
- L3: Team invites enabled
- L4: AI job roles creation
- L5: Custom guidance documents

### Progression Pace

**Expected Timeline:**

- **Week 1**: Reach minimum launch requirements (~140 points)
- **Month 1**: Achieve Level 3 across all stages (~300 points)
- **Month 3**: Reach Power User status (~500 points)
- **Month 6**: Master tier potential (~1000+ points)

---

## Use Cases & Benefits

### For Individual Users

**Visibility:**
- Track personal growth over time
- See achievement history
- Understand feature usage patterns
- Set personal goals

**Motivation:**
- Gamified progression
- Achievement unlocks
- Level-up celebrations
- Status recognition

**Learning:**
- Discover new features
- Guided exploration
- Feature adoption tracking
- Best practice reinforcement

### For Team Admins

**Team Management:**
- Monitor team engagement
- Identify active vs inactive members
- Track onboarding progress
- Measure feature adoption

**Team Building:**
- Encourage collaboration
- Recognize top contributors
- Foster healthy competition
- Celebrate team milestones

**Insights:**
- Usage analytics
- Engagement patterns
- ROI on platform investment
- Training effectiveness

### For the Platform

**Retention:**
- Increase daily active users (DAU)
- Improve weekly active users (WAU)
- Reduce churn rates
- Extend session duration

**Adoption:**
- Drive feature discovery
- Encourage comprehensive usage
- Reduce time-to-value
- Increase power user conversion

**Feedback:**
- Identify popular features
- Detect engagement drop-offs
- Guide product roadmap
- Validate feature launches

---

## Technical Implementation

### Database Schema

**user_launch_status**
```sql
CREATE TABLE user_launch_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  current_stage text DEFAULT 'fuel',
  total_points integer DEFAULT 0,
  is_launched boolean DEFAULT false,
  is_legacy_user boolean DEFAULT false,
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
  stage text,
  earned_at timestamptz DEFAULT now()
);
```

**launch_preparation_progress**
```sql
CREATE TABLE launch_preparation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  stage text NOT NULL,
  level integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  last_level_up_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### API Hooks

**useLaunchPreparation()**
```typescript
const {
  launchStatus,      // Current user launch status
  stageProgress,     // Progress for all stages
  achievements,      // List of earned achievements
  loading,
  error,
  recordAchievement, // Award points for achievement
  updateProgress,    // Update stage/level progress
  refresh            // Reload all data
} = useLaunchPreparation();
```

**useLaunchActivity()**
```typescript
const {
  recordMessage,          // Track message sends
  recordVisualization,    // Track viz creation
  recordReport,           // Track report generation
  recordScheduledReport,  // Track scheduled report
  recordDriveConnection,  // Track Drive connection
  recordFolderSelection,  // Track folder selection
  recordTeamSettings,     // Track team config
  recordNewsPreferences,  // Track news enable
  recordInvite            // Track member invite
} = useLaunchActivity();
```

### Real-Time Sync

**Point Updates:**
```typescript
// Subscribe to user's point changes
supabase
  .channel('launch_points')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_launch_status',
    filter: `user_id=eq.${userId}`
  }, handlePointUpdate)
  .subscribe();

// Subscribe to team points
supabase
  .channel('team_points')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_launch_status',
    filter: `team_id=eq.${teamId}`
  }, handleTeamPointUpdate)
  .subscribe();
```

### Team Points Aggregation

**Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION sync_user_points_to_team_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate team total points
  UPDATE teams
  SET total_points = (
    SELECT COALESCE(SUM(total_points), 0)
    FROM user_launch_status
    WHERE team_id = NEW.team_id
  )
  WHERE id = NEW.team_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Point Award Logic

```typescript
// Award achievement points
async function awardAchievement(
  userId: string,
  achievementType: string,
  achievementName: string,
  points: number,
  stage?: string
) {
  // 1. Check if already earned (prevent duplicates)
  const { data: existing } = await supabase
    .from('launch_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_type', achievementType)
    .maybeSingle();

  if (existing) return; // Already earned

  // 2. Create achievement record
  await supabase
    .from('launch_achievements')
    .insert({
      user_id: userId,
      achievement_type: achievementType,
      achievement_name: achievementName,
      points_awarded: points,
      stage: stage || null
    });

  // 3. Update user total points
  await supabase.rpc('increment_user_points', {
    user_id: userId,
    points_to_add: points
  });

  // 4. Show toast notification
  showToast(`🎉 ${achievementName} +${points} points!`);
}
```

---

## Best Practices

### For Users

1. **Check Mission Control regularly** to track progress
2. **Set personal goals** based on next milestones
3. **Explore new features** to unlock achievements
4. **Participate in team activities** to boost team points
5. **Review achievement history** to understand usage patterns

### For Admins

1. **Monitor team engagement** via team stats
2. **Encourage member participation** to grow team points
3. **Complete admin-only tasks** early (Drive, invites)
4. **Set team goals** based on point milestones
5. **Celebrate team achievements** to maintain motivation

### For the Platform

1. **Balance point values** to avoid exploitation
2. **Add new achievements** to drive feature adoption
3. **Prevent point gaming** with anti-abuse measures
4. **Track engagement metrics** tied to points
5. **Iterate on level requirements** based on user feedback

---

## Related Documentation

- [Launch Preparation Guide](./LAUNCH_PREPARATION_GUIDE.md)
- [User Onboarding Guide](./USER_ONBOARDING_GUIDE.md)
- [AI Rocket Key Features](./AI_ROCKET_KEY_FEATURES.md)
- [Astra Intelligence Product Overview](./ASTRA_INTELLIGENCE_PRODUCT_OVERVIEW.md)
- [User Metrics Dashboard Guide](./USER_METRICS_DASHBOARD_GUIDE.md)

---

**Mission Control transforms post-launch engagement into a continuous journey of growth, achievement, and collaboration - keeping users motivated and teams thriving on AI Rocket + Astra Intelligence.**
