# Mission Control Page Redesign Plan

## Overview

This document outlines the complete redesign of the Mission Control system from a modal to a full-page experience that serves as the primary landing page for launched users. This includes a new dynamic tab system, feature reorganization, and improved user experience.

---

## Current State Analysis

### Current Navigation
- 3 fixed tabs: Reports, Private Chat, Team Chat
- Navigation managed via `ChatMode` type in MainContainer.tsx
- Mission Control is a modal opened from rocket icon in header
- Features Menu (+) provides access to: Build Agents, Admin Dashboard, Tour, What's New, Quick Start Guide

### Current Mission Control Modal
- Shows Fuel/Boosters/Guidance stages with levels
- Displays Team Launch Points
- Contains sync progress and document counts
- Opens from rocket icon in header (only after launch)

---

## Proposed Changes

### 1. New Tab System Architecture

#### Tab Types
```typescript
type CoreTab = 'mission-control' | 'private' | 'reports';
type FeatureTab = 'team' | 'visualizations' | 'ai-specialists' | 'team-agents' | 'team-guidance';
type TabType = CoreTab | FeatureTab;

interface TabConfig {
  id: TabType;
  label: string;
  icon: string; // Lucide icon name
  isCore: boolean;
  isComingSoon: boolean;
  order: number;
}
```

#### Tab Configuration
| Tab ID | Label | Icon | Core | Coming Soon |
|--------|-------|------|------|-------------|
| mission-control | Mission Control | Rocket | Yes | No |
| private | Private Chat | MessageSquare | Yes | No |
| reports | Reports | FileBarChart | Yes | No |
| team | Team Chat | Users | No | No |
| visualizations | Visualizations | BarChart3 | No | No |
| ai-specialists | AI Specialists | Brain | No | Yes |
| team-agents | Team Agents | Bot | No | Yes |
| team-guidance | Team SOPs | Compass | No | Yes |

#### Tab Behavior
- Core tabs (first 3) always visible, cannot be closed
- Feature tabs can be opened from Mission Control page
- Feature tabs show X close button
- Tabs wrap to second row when exceeding screen width
- Open tabs persist across sessions (database storage)

### 2. Database Schema Changes

#### New Table: `user_open_tabs`
```sql
CREATE TABLE user_open_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab_id text NOT NULL,
  display_order integer NOT NULL,
  opened_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tab_id)
);
```

#### Feature Flag Entry
```sql
INSERT INTO feature_flags (email, feature_name, enabled)
VALUES ('clay@rockethub.ai', 'new_mission_control_page', true);
```

### 3. New Components

#### A. MissionControlPage.tsx (New Page Component)
Replace modal with full page containing:

**Section 1: Status Overview**
- Team Launch Points (prominent display)
- Stage Status Cards (Fuel, Boosters, Guidance)
  - Current level with icon
  - Progress bar
  - Points earned
  - Click to expand details

**Section 2: Team Statistics**
- Documents Synced (total, by category)
- Team Members count
- Total Chats count
- Reports Generated count
- Visualizations Saved count

**Section 3: Admin Settings (Expandable, Admins Only)**
- Connected Folders & Data Sync
- Invite & Manage Team Members
- Team Member Roles & Visibility
- Team Configuration
- News Preferences

**Section 4: AI Rocket Features**
Grid of feature cards with:
- Icon
- Feature Name
- Brief Description
- Info (i) icon for detailed explanation
- Action button (Open Tab / Coming Soon)

Features to display:
- Private Chat (Opens tab)
- Reports (Opens tab)
- Team Chat (Opens tab)
- Visualizations (Opens tab)
- AI Specialists (Coming Soon modal)
- Team Agents (Coming Soon modal)
- Team SOPs (Coming Soon modal)

**Section 5: Team Dashboard (Coming Soon)**
- Placeholder section with "Coming Soon" badge
- Brief description of what will be here

#### B. DynamicTabBar.tsx (New Component)
- Renders all open tabs
- Shows icons with labels
- Handles tab switching
- Shows close button on non-core tabs
- Wraps to second row when needed
- Handles tab reordering (future enhancement)

#### C. ComingSoonModal.tsx (New Component)
Generic modal for coming soon features:
- Feature icon and name
- Description of what the feature will do
- Expected availability (if known)
- "Notify Me" option (future enhancement)
- Close button

#### D. FeatureInfoModal.tsx (New Component)
Info modal for feature explanations:
- Feature icon and name
- Detailed description
- Use case examples
- Tips for getting started

### 4. Component Modifications

#### Header.tsx Changes
- Remove Mission Control rocket icon button
- Remove FeaturesMenu component import and usage
- Keep: Logo, NotificationBell, SupportMenu, User Profile

#### MainContainer.tsx Changes
- Replace ChatModeToggle with DynamicTabBar
- Update state management from `chatMode` to `activeTab`
- Add logic for opening/closing feature tabs
- Add tab persistence (save/load from database)
- Add feature flag check for new vs old navigation

#### UserSettingsModal.tsx Changes
- Add "Admin Dashboard" option (super admins only)
- Add "Build Agents" option (super admins only)
- These options navigate to their respective pages

#### FeaturesMenu.tsx
- Component will be deprecated/removed
- Its functionality moves to Mission Control page

### 5. New Hooks

#### useOpenTabs.ts
```typescript
interface UseOpenTabs {
  openTabs: TabConfig[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  openTab: (tab: TabType) => void;
  closeTab: (tab: TabType) => void;
  loading: boolean;
}
```

### 6. Feature Flag Implementation

The entire new system will be behind a feature flag:
- Flag name: `new_mission_control_page`
- Initially enabled only for: `clay@rockethub.ai`

#### Code Implementation
```typescript
const hasNewMissionControl = useFeatureFlag('new_mission_control_page');

if (hasNewMissionControl) {
  // Render new DynamicTabBar + MissionControlPage
} else {
  // Render old ChatModeToggle + existing modal system
}
```

---

## UI/UX Design Specifications

### Tab Bar Design
- Height: 48px
- Background: Dark slate (slate-800)
- Active tab: Highlighted background (slate-700), accent border
- Inactive tab: Subtle hover effect
- Tab icon + label
- Close button on hover (non-core tabs only)
- Smooth transitions between states

### Tab Wrapping Behavior
- First row: Up to N tabs that fit screen width
- Overflow tabs wrap to second row
- Consistent spacing maintained
- Mobile: Horizontal scroll within rows if needed

### Mission Control Page Layout
```
+--------------------------------------------------+
|  [Status Overview - Full Width Banner]            |
|  Team Points | Fuel | Boosters | Guidance        |
+--------------------------------------------------+
|                                                  |
|  [Team Statistics Grid - 5 cards]                |
|  Docs | Members | Chats | Reports | Visualizations
|                                                  |
+--------------------------------------------------+
|  [Admin Settings - Expandable Accordion]         |
|  > Connected Folders & Data Sync                 |
|  > Team Members & Invites                        |
|  > Roles & Visibility                            |
|  > Team Configuration                            |
|  > News Preferences                              |
+--------------------------------------------------+
|  [AI Rocket Features - 2x4 Grid]                 |
|  Private Chat | Reports | Team Chat | Viz       |
|  AI Spec*     | Agents* | Guidance* | [empty]    |
|  (* = Coming Soon)                               |
+--------------------------------------------------+
|  [Team Dashboard - Coming Soon Placeholder]      |
+--------------------------------------------------+
```

### Coming Soon Modal
- Centered modal with backdrop
- Feature icon large at top
- Feature name as heading
- 2-3 paragraph description
- "Coming Soon" badge
- Close button

---

## Implementation Phases

### Phase 1: Database & Infrastructure
1. Create `user_open_tabs` table migration
2. Add feature flag for `clay@rockethub.ai`
3. Create `useOpenTabs` hook

### Phase 2: Tab System
1. Create `DynamicTabBar` component
2. Update `MainContainer` with conditional rendering
3. Implement tab persistence logic
4. Test tab open/close/switch behavior

### Phase 3: Mission Control Page
1. Create `MissionControlPage` component
2. Build Status Overview section
3. Build Team Statistics section
4. Build Admin Settings section (expandable)
5. Build AI Rocket Features section
6. Build Team Dashboard placeholder

### Phase 4: Supporting Components
1. Create `ComingSoonModal` component
2. Create `FeatureInfoModal` component
3. Update `UserSettingsModal` for super admin options

### Phase 5: Cleanup
1. Conditionally remove Mission Control icon from header
2. Conditionally remove FeaturesMenu
3. Remove "Take Tour Again" button
4. Test all navigation paths

### Phase 6: Testing & Refinement
1. Test as clay@rockethub.ai user
2. Verify old system still works for other users
3. Fix any edge cases
4. Performance optimization

---

## Files to Create
- `src/components/MissionControlPage.tsx`
- `src/components/DynamicTabBar.tsx`
- `src/components/ComingSoonModal.tsx`
- `src/components/FeatureInfoModal.tsx`
- `src/hooks/useOpenTabs.ts`
- `supabase/migrations/XXXXXX_create_user_open_tabs_table.sql`
- `supabase/migrations/XXXXXX_add_new_mission_control_feature_flag.sql`

## Files to Modify
- `src/components/MainContainer.tsx`
- `src/components/Header.tsx`
- `src/components/UserSettingsModal.tsx`
- `src/types/index.ts`

## Files to Eventually Remove/Deprecate
- `src/components/FeaturesMenu.tsx` (after full rollout)
- `src/components/MissionControl.tsx` (rename or deprecate after full rollout)

---

## Questions to Resolve

1. **Tab Icon Size**: Should tab icons be 16px, 18px, or 20px?
2. **Mobile Behavior**: On very small screens, should tabs become a dropdown or stay as wrapping rows?
3. **Notification Badges**: Should notification badges (unread messages) show on tabs in the tab bar?
4. **Team Dashboard**: Any early ideas on what will go in the Team Dashboard section?
5. **Feature Descriptions**: Do you have specific descriptions for each AI Rocket Feature for the info modals?

---

## Rollout Plan

1. **Phase A**: Enable for clay@rockethub.ai only (testing)
2. **Phase B**: Enable for all super admins (internal testing)
3. **Phase C**: Enable for select beta users
4. **Phase D**: Full rollout to all users
5. **Phase E**: Remove feature flag and old code

---

## Success Metrics

- Reduced time to access features
- Increased feature discovery (track which features users open)
- Positive feedback on navigation simplicity
- No increase in support requests related to navigation
