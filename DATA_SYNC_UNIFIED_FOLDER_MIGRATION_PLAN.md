# Data Sync Update Plan: Unified Folder Architecture

## Executive Summary

This plan outlines the migration from category-specific folders (Strategy, Meetings, Financial, Projects) to a unified Master Folder approach with intelligent AI-powered data classification. Users will connect one primary team folder and optionally add up to 6 additional folders for flexibility.

---

## 🎯 Core Changes

### Current System
- Users select specific folder types: Strategy, Meetings, Financial, Projects
- Each folder type is categorized manually by the user
- Sync processes files only within designated folder categories
- Limited to 4 predefined folder types

### New System
- **Master Team Folder (root_folder):** One primary folder syncing all nested content
- **Intelligent Tags:** AI automatically classifies data with categories, topics, entities, keywords
- **Additional Folders (1-6):** Optional extra folders for team members or departments
- **Universal Categories:** No pre-defined limits - AI detects any type of content
- **Automatic Sync Status Tracking:** Real-time progress for documents and Smart Data

---

## 📊 Database Changes

### user_drive_connections Table
**Already Complete ✓**
- `root_folder_id` (text) - Primary team folder ID
- `root_folder_name` (text) - Display name
- `folder_1_id` through `folder_6_id` (text) - Additional folder IDs
- `folder_1_name` through `folder_6_name` (text) - Display names
- `folder_1_enabled` through `folder_6_enabled` (boolean) - Active status

**Legacy Fields (Keep for Migration):**
- `strategy_folder_id`, `meetings_folder_id`, `financial_folder_id`, `projects_folder_id`
- These will be migrated then deprecated

### document_chunks Table
**Already Complete ✓**
- `source_id` (text) - Unique document identifier
- `ai_classification` (jsonb) - Smart Data structure:
  ```json
  {
    "type": "Document Type",
    "model": "gemini-flash-latest",
    "topics": ["Topic1", "Topic2"],
    "summary": "Brief summary",
    "entities": ["Entity1", "Entity2"],
    "reasoning": "Classification reasoning",
    "categories": ["category1", "category2"],
    "confidence": 0.96,
    "classified_at": "2025-12-20T04:16:57.412Z",
    "classified_by": "background_classifier",
    "date_references": ["12-16"],
    "search_keywords": ["keyword1", "keyword2"]
  }
  ```
- `classification_status` (text) - Status: 'pending', 'classified', 'failed'
- `file_name` (text) - Original filename
- `folder_path` (text) - Full folder path
- `parent_folder_name` (text) - Immediate parent folder

---

## 🚀 Updated Fuel Stage Level System

### Level 0: Pre-Launch
**Status:** Not Connected
**Requirements:** None
**Points:** 0
**Description:** Ready to connect Google Drive

### Level 1: Launch Ready
**Status:** Connected
**Requirements:**
- Google Drive connected
- Root folder selected
**Points:** 10
**Description:** Drive connected - ready for data sync

### Level 2: Initial Fuel
**Status:** Data Online
**Requirements:**
- 1 document fully synced (stored + Smart Data complete)
**Points:** 20
**Description:** First document classified and searchable

### Level 3: Growing Dataset
**Status:** Building Momentum
**Requirements:**
- 50 documents fully synced
- 2 unique document categories
**Points:** 30
**Description:** Diverse data foundation established

### Level 4: Mature Database
**Status:** Comprehensive Coverage
**Requirements:**
- 200 documents fully synced
- 4 unique document categories
**Points:** 40
**Description:** Extensive knowledge base powering AI

### Level 5: Maximum Fuel
**Status:** Enterprise Ready
**Requirements:**
- 1000 documents fully synced
- 8 unique document categories
**Points:** 50
**Description:** Advanced AI capabilities unlocked

---

## 🔄 Sync Workflow Architecture

### 1. Initial Sync Workflow
**Webhook URL:** `https://healthrocket.app.n8n.cloud/webhook/astra-data-sync-scanner`

**Trigger Conditions:**
- User selects root folder for first time
- User clicks "Start AI Sync" button

**Process:**
1. Scan all files in root_folder_id recursively
2. Extract metadata: filename, path, parent folder, mime type, size, modified date
3. Store documents in `document_chunks` table with:
   - `source_id` = Google file ID
   - `classification_status` = 'pending'
   - `ai_classification.classified_by` = 'pending'
4. Return: Total files discovered, processing batch ID

**UI Response:**
- Award Level 1 achievement
- Navigate to Sync Progress Screen
- Show document discovery count updating in real-time

### 2. Incremental Sync Workflow
**Webhook URL:** `https://healthrocket.app.n8n.cloud/webhook/astra-data-sync-incremental`

**Trigger Conditions:**
- User clicks "Sync Now" button in UI
- Automatic 15-minute interval (n8n workflow handles this)

**Process:**
1. Check for new/modified files since `last_sync_at`
2. Compare `source_modified_time` in database
3. Add new files, update modified files
4. Mark deleted files (optional)

### 3. Smart Data Classification Workflow
**Webhook URL:** `https://healthrocket.app.n8n.cloud/webhook/astra-smart-data-classifier` (existing/to be confirmed)

**Trigger Conditions:**
- 2 minutes after Initial Sync starts (UI triggers)
- 2 minutes after user clicks "Sync Now" (UI triggers)
- Automatic 15-minute interval (n8n handles)

**Process:**
1. Query `document_chunks` where `classification_status = 'pending'`
2. Process in batches (e.g., 50 documents at a time)
3. Use Gemini Flash to analyze content
4. Update records with complete `ai_classification` object
5. Set `classification_status = 'classified'`
6. Set `classified_at` timestamp

**Smart Data Fields:**
- **Categories:** Business categories (financial, sales, legal, marketing, HR, operations, etc.)
- **Topics:** Key themes discussed in document
- **Entities:** People, companies, products mentioned
- **Keywords:** Search-optimized terms
- **Summary:** Brief content description
- **Date References:** Dates mentioned in content

---

## 🎨 UI/UX Changes

### A. Welcome/Onboarding Screen Updates

**Current Message:**
"Connect your Strategy folder first, then add Meetings, Financial, and Projects folders."

**New Message:**
```
Connect Your Team's Knowledge Hub

Syncing your company data is as easy as connecting one folder!

✨ How It Works:
1. Connect your Google Drive
2. Select your Master Team Folder (or create "Astra Team Folder")
3. All files and subfolders sync automatically
4. Astra adds Smart Data tags to every document

📁 What Can You Sync?
- Mission statements & company policies
- Meeting notes & transcripts
- Sales reports & CRM data
- Financial documents & budgets
- Marketing campaigns & strategies
- Project plans & documentation
- Customer data & contracts
- The list is endless!

🤖 Intelligent Classification:
No folder organization needed - Astra automatically tags your data with:
- Categories (Sales, Marketing, Finance, Legal, HR, etc.)
- Topics (Customer retention, Q4 planning, budget review)
- Entities (People, companies, products mentioned)
- Keywords (For powerful search)

🎯 One Folder to Rule Them All:
Instead of organizing files into specific folders, simply move everything
you want Astra to know into your Master Team Folder. Astra intelligently
categorizes it all.
```

**Visual Elements:**
- Graphic showing folder structure with various file types
- Animation of AI classification tags being added
- Example Smart Data visualization

### B. Fuel Stage Page Updates

#### Top Section: Connection Status
```
┌─────────────────────────────────────────────────────┐
│ 🔗 Master Team Folder                               │
│ Connected: "Health Rocket Team Drive"               │
│ Last Synced: 5 minutes ago                          │
│                                           [Sync Now]│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📊 Data Sync Status                                 │
│                                                      │
│ Documents Synced: 127 / 150                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░ 85%                           │
│                                                      │
│ Smart Data Processing: 98 / 127                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 77%                           │
│                                                      │
│ 🎯 Categories Detected: 6                           │
│ Financial • Sales • Marketing • Legal • HR • Ops    │
│                                      [View Details] │
└─────────────────────────────────────────────────────┘
```

#### Middle Section: Level Progress
```
┌─────────────────────────────────────────────────────┐
│ 🔥 Current Level: Level 3 (Growing Dataset)         │
│ ▓▓▓▓▓▓░░░░░░░░░░░░ 127 / 200 documents            │
│ Categories: 6 / 4 ✓                                 │
│                                                      │
│ Next: Level 4 - Mature Database (+40 points)       │
│ • 73 more documents needed                          │
│ • Categories requirement met ✓                      │
└─────────────────────────────────────────────────────┘
```

#### Bottom Section: Folder Management
```
┌─────────────────────────────────────────────────────┐
│ 📁 Connected Folders                                │
│                                                      │
│ ✓ Master Team Folder: "Health Rocket Team Drive"   │
│   127 documents • 6 categories                      │
│                                                      │
│ ✓ Additional Folder 1: "Mark's Sales Resources"    │
│   23 documents • 2 categories                       │
│                                                      │
│ [+ Add Another Folder] (5 remaining)                │
└─────────────────────────────────────────────────────┘
```

### C. Sync Progress Screen (New)

**Location:** Dedicated page accessible from Fuel Stage
**URL:** `/launch-prep/fuel/sync-progress`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│          🚀 AI Data Sync in Progress                │
│                                                      │
│  [========================================>    ] 85% │
│                                                      │
│  Documents Discovered: 150                          │
│  Documents Stored: 127                              │
│  Smart Data Complete: 98                            │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  Currently Processing:                       │   │
│  │  📄 "Q4 2024 Sales Report.xlsx"             │   │
│  │     Categories: Financial, Sales             │   │
│  │     Topics: Revenue, Growth, Projections     │   │
│  │     Keywords: Q4, sales, targets, pipeline   │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│      [Information Carousel - See Below]             │
│                                                      │
│  ⓘ You can leave this page - sync continues in      │
│     background. Progress shown in Fuel Stage.       │
│                                                      │
│              [Back to Fuel Stage]                   │
└─────────────────────────────────────────────────────┘
```

**Information Carousel (Auto-rotating every 5 seconds):**

Slide 1: Smart Data Overview
```
🧠 Astra's Smart Data Classification

Astra uses Gemini AI to analyze every document and add:
• Categories - Business function (Sales, Finance, Legal, etc.)
• Topics - Key themes and discussion points
• Entities - People, companies, products mentioned
• Keywords - Optimized search terms
• Summary - Quick content overview
• Date References - Important dates extracted
```

Slide 2: Category Examples
```
📂 Automatic Category Detection

One meeting about budget AND sales? No problem!

Example: "Q4 Planning Meeting Notes"
Categories: [Financial, Sales, Marketing]
Topics: [Budget Planning, Sales Targets, Campaign Strategy]
Entities: [Mark Schwaiger, Sarah Johnson, Acme Corp]
Keywords: [Q4, budget, revenue, campaign, targets]
```

Slide 3: Search Power
```
🔍 Powerful Multi-Dimensional Search

Your documents are now searchable by:
✓ Content (traditional full-text search)
✓ Category (all financial documents)
✓ Topics (everything about "customer retention")
✓ Entities (all docs mentioning "Acme Corp")
✓ Keywords (AI-optimized search terms)
✓ Date ranges (Q4 2024 documents)
```

Slide 4: No Organization Needed
```
📁 Throw It All In - We'll Sort It

No need to organize files into specific folders!

❌ Old Way: Manually categorize every file
✓ New Way: Drop files anywhere, Astra categorizes

Your "Team Folder" can contain:
- Meeting notes mixed with budgets
- Sales reports next to legal contracts
- Everything in one place - Astra figures it out!
```

Slide 5: Use Case Examples
```
💼 Real-World Use Cases

Marketing Director: "Show me all campaign data from Q3"
→ Searches: Categories:[marketing], Date:[Q3], Keywords:[campaign]

Sales Manager: "Find meetings discussing the Acme Corp deal"
→ Searches: Entities:[Acme Corp], Categories:[sales, meetings]

CFO: "All financial documents mentioning budget cuts"
→ Searches: Categories:[financial], Keywords:[budget, cuts]
```

### D. User Settings - Data Sync Tab (Updated)

**New Section Layout:**
```
┌─────────────────────────────────────────────────────┐
│ 📊 Data Sync Overview                               │
│                                                      │
│ Total Documents: 127                                │
│ Fully Synced: 98                                    │
│ Processing: 29                                      │
│ Categories Detected: 6                              │
│                                                      │
│ Last Sync: 5 minutes ago                            │
│ Next Auto-Sync: 10 minutes                          │
│                                       [Sync Now]    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📁 Connected Folders                                │
│                                                      │
│ Master Team Folder                                  │
│ • Name: Health Rocket Team Drive                    │
│ • Documents: 127                                    │
│ • Last Synced: 5 minutes ago                        │
│ • Status: ✓ Active                                  │
│                          [Disconnect] [Change Folder]│
│                                                      │
│ Additional Folder 1                                 │
│ • Name: Mark's Sales Resources                      │
│ • Documents: 23                                     │
│ • Last Synced: 5 minutes ago                        │
│ • Status: ✓ Active                                  │
│                          [Disconnect] [Change Folder]│
│                                                      │
│ [+ Add Another Folder] (5 remaining)                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📄 Document Library                   🔍 [Search]   │
│                                                      │
│ Filter by Category: [All ▼]                         │
│ Filter by Status: [All ▼] [Synced] [Processing]    │
│                                                      │
│ ┌───────────────────────────────────────────────┐  │
│ │ 📄 Q4 2024 Sales Report.xlsx                  │  │
│ │    Categories: Financial, Sales                │  │
│ │    Synced: Dec 20, 2025 • Smart Data: ✓       │  │
│ │                               [View] [Delete]  │  │
│ ├───────────────────────────────────────────────┤  │
│ │ 📄 Board Meeting Notes - Dec 15.doc           │  │
│ │    Categories: Leadership, Strategy            │  │
│ │    Synced: Dec 20, 2025 • Smart Data: ⏳      │  │
│ │                               [View] [Delete]  │  │
│ └───────────────────────────────────────────────┘  │
│                                                      │
│ Showing 20 of 127 documents          [Load More]    │
└─────────────────────────────────────────────────────┘
```

### E. Mission Control Dashboard Updates

**Add Fuel Status Widget:**
```
┌─────────────────────────────────────┐
│ 🔥 Fuel Status                      │
│                                     │
│ Level 3: Growing Dataset            │
│ 127 documents • 6 categories        │
│                                     │
│ [View Details]                      │
└─────────────────────────────────────┘
```

---

## 🛠️ Technical Implementation Tasks

### Phase 1: Database & Backend Updates

#### 1.1 Create Sync Status Tracking Table
```sql
CREATE TABLE IF NOT EXISTS data_sync_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type text NOT NULL, -- 'initial', 'incremental', 'manual'
  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'

  -- Progress tracking
  total_files_discovered integer DEFAULT 0,
  files_stored integer DEFAULT 0,
  files_classified integer DEFAULT 0,

  -- Folder info
  root_folder_id text,
  additional_folders jsonb, -- Array of folder IDs processed

  -- Metadata
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE data_sync_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own team sync sessions"
  ON data_sync_sessions FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_sync_sessions_team ON data_sync_sessions(team_id);
CREATE INDEX idx_sync_sessions_status ON data_sync_sessions(status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE data_sync_sessions;
```

#### 1.2 Create Document Sync Stats View
```sql
CREATE OR REPLACE VIEW document_sync_stats AS
SELECT
  team_id,
  COUNT(DISTINCT source_id) as total_documents,
  COUNT(DISTINCT source_id) FILTER (
    WHERE ai_classification->>'classified_by' != 'pending'
  ) as fully_synced_documents,
  COUNT(DISTINCT source_id) FILTER (
    WHERE ai_classification->>'classified_by' = 'pending'
  ) as pending_classification,
  COUNT(DISTINCT category) as total_categories
FROM document_chunks
CROSS JOIN LATERAL jsonb_array_elements_text(
  COALESCE(ai_classification->'categories', '[]'::jsonb)
) AS category
WHERE ai_classification->>'classified_by' != 'pending'
GROUP BY team_id;
```

#### 1.3 Update Fuel Level Calculation Function
```sql
CREATE OR REPLACE FUNCTION calculate_fuel_level(p_team_id uuid)
RETURNS TABLE (
  level integer,
  total_docs integer,
  synced_docs integer,
  pending_docs integer,
  total_categories integer,
  level_met boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH doc_stats AS (
    SELECT
      COUNT(DISTINCT source_id) as total,
      COUNT(DISTINCT source_id) FILTER (
        WHERE ai_classification->>'classified_by' != 'pending'
      ) as synced,
      COUNT(DISTINCT source_id) FILTER (
        WHERE ai_classification->>'classified_by' = 'pending'
      ) as pending
    FROM document_chunks
    WHERE team_id = p_team_id
  ),
  category_stats AS (
    SELECT COUNT(DISTINCT category) as categories
    FROM document_chunks
    CROSS JOIN LATERAL jsonb_array_elements_text(
      COALESCE(ai_classification->'categories', '[]'::jsonb)
    ) AS category
    WHERE team_id = p_team_id
      AND ai_classification->>'classified_by' != 'pending'
  )
  SELECT
    CASE
      WHEN synced >= 1000 AND categories >= 8 THEN 5
      WHEN synced >= 200 AND categories >= 4 THEN 4
      WHEN synced >= 50 AND categories >= 2 THEN 3
      WHEN synced >= 1 THEN 2
      ELSE 1
    END as level,
    total as total_docs,
    synced as synced_docs,
    pending as pending_docs,
    categories as total_categories,
    CASE
      WHEN synced >= 1000 AND categories >= 8 THEN true
      WHEN synced >= 200 AND categories >= 4 THEN true
      WHEN synced >= 50 AND categories >= 2 THEN true
      WHEN synced >= 1 THEN true
      ELSE false
    END as level_met
  FROM doc_stats, category_stats;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Frontend Components

#### 2.1 Create DataSyncProgressScreen Component
**File:** `src/components/DataSyncProgressScreen.tsx`

**Features:**
- Real-time progress updates via Supabase realtime subscription
- Information carousel with auto-rotation
- Document processing visualization
- Category detection display
- "Back to Fuel Stage" navigation with sync continuing in background

#### 2.2 Create SyncStatusWidget Component
**File:** `src/components/SyncStatusWidget.tsx`

**Features:**
- Compact progress bars for Documents and Smart Data
- Category badges
- Mini progress view for Fuel Stage page
- Expandable detail view

#### 2.3 Create FolderSelectionModal Component (Updated)
**File:** `src/components/setup-steps/SelectMasterFolderStep.tsx`

**Features:**
- Google Picker API integration for folder selection
- "Create Astra Team Folder" option with explanation
- Visual preview of folder contents
- Educational content about Master Folder approach

#### 2.4 Create AdditionalFoldersManager Component
**File:** `src/components/AdditionalFoldersManager.tsx`

**Features:**
- Add up to 6 additional folders
- Show folder name, document count, last sync time
- Enable/disable toggle for each folder
- Remove folder option

#### 2.5 Update FuelStage Component
**File:** `src/components/launch-stages/FuelStage.tsx`

**Major Changes:**
- Replace category-specific folder flow with Master Folder flow
- Update Level 1 achievement: Drive connected (not document-based)
- Add mini sync status widget
- Show categories detected dynamically
- Link to full sync progress screen

#### 2.6 Create DocumentLibrary Component
**File:** `src/components/DocumentLibrary.tsx`

**Features:**
- Searchable list of all synced documents
- Filter by category, status, date
- Show Smart Data preview for each document
- Delete document option
- Pagination for large datasets

### Phase 3: Hooks & Utilities

#### 3.1 Create useDataSync Hook
**File:** `src/hooks/useDataSync.ts`

**Functions:**
- `startInitialSync(folderId)` - Triggers initial sync webhook
- `startIncrementalSync()` - Triggers incremental sync webhook
- `triggerSmartDataClassification()` - Triggers classification webhook (2min delay)
- `getCurrentSyncSession()` - Get active sync session data
- `subscribeSyncProgress()` - Realtime updates for sync progress

#### 3.2 Update useDocumentCounts Hook
**File:** `src/hooks/useDocumentCounts.ts`

**Changes:**
- Count documents by `source_id` (unique documents)
- Separate "total" vs "fully synced" counts
- Extract unique categories from `ai_classification.categories`
- Update `calculateFuelLevel()` for new level system
- Add `getUniqueCategories()` function

#### 3.3 Create useSyncProgress Hook
**File:** `src/hooks/useSyncProgress.ts`

**Functions:**
- `getSyncStats()` - Get current sync statistics
- `subscribeToSyncUpdates()` - Real-time sync progress
- `getCurrentDocument()` - Currently processing document info
- `estimateTimeRemaining()` - Estimate based on processing rate

#### 3.4 Update launch-preparation-utils
**File:** `src/lib/launch-preparation-utils.ts`

**Changes:**
- Update `FUEL_LEVELS` array with new level definitions
- Level 1: Drive connected (10 points)
- Level 2: 1 synced doc (20 points)
- Level 3: 50 docs + 2 categories (30 points)
- Level 4: 200 docs + 4 categories (40 points)
- Level 5: 1000 docs + 8 categories (50 points)

### Phase 4: API Integration

#### 4.1 Create Sync Webhook Trigger Service
**File:** `src/lib/data-sync-service.ts`

```typescript
interface SyncResponse {
  success: boolean;
  sessionId: string;
  filesDiscovered?: number;
  message?: string;
}

export async function triggerInitialSync(
  teamId: string,
  folderId: string
): Promise<SyncResponse> {
  // Call n8n webhook
  // Create sync session record
  // Return session ID
}

export async function triggerIncrementalSync(
  teamId: string
): Promise<SyncResponse> {
  // Call incremental sync webhook
  // Update last_sync_at
}

export async function triggerSmartDataClassification(
  teamId: string,
  delay: number = 120000 // 2 minutes
): Promise<void> {
  // Wait delay milliseconds
  // Call classification webhook
}
```

#### 4.2 Create Edge Function: trigger-sync-workflow
**File:** `supabase/functions/trigger-sync-workflow/index.ts`

**Purpose:** Orchestrate sync workflow triggers from client

**Functions:**
- Validate user permissions
- Call n8n webhooks with proper authentication
- Create/update sync session records
- Handle webhook response errors
- Trigger delayed Smart Data classification

### Phase 5: Migration Support

#### 5.1 Create Migration Script for Existing Users
**File:** `supabase/migrations/YYYYMMDDHHMMSS_migrate_folders_to_unified_system.sql`

**Actions:**
1. Move `strategy_folder_id` → `root_folder_id` (for all existing users)
2. Move `meetings_folder_id` → `folder_1_id` (if exists)
3. Move `financial_folder_id` → `folder_2_id` (if exists)
4. Move `projects_folder_id` → `folder_3_id` (if exists)
5. Set `folder_X_enabled = true` for migrated folders
6. Update `user_drive_connections.updated_at`
7. Log migration in new `folder_migrations` table

#### 5.2 Create Data Re-sync Job
**Purpose:** Re-sync existing documents with new Smart Data classification

**Process:**
1. Mark all existing documents with `classification_status = 'pending'`
2. Trigger Smart Data classification workflow
3. Monitor progress via admin dashboard
4. Report completion to super admins

---

## 📝 Content & Messaging Updates

### Onboarding Flow

**Welcome Screen:**
- Title: "Welcome to Your AI-Powered Knowledge Hub"
- Subtitle: "Connect once, sync everything, search intelligently"

**Folder Selection Screen:**
- Title: "Select Your Master Team Folder"
- Description: "Choose one folder to sync all your team's data. Astra will automatically categorize everything inside."
- Options:
  - "Select Existing Folder" (Google Picker)
  - "Create New 'Astra Team Folder'" (Auto-creates in Drive)

**Pre-Sync Education Screen:**
- Title: "Ready to Power Up Astra?"
- Content:
  ```
  Here's what happens next:

  1. 📂 Document Discovery
     Astra scans your Master Folder and finds all files

  2. ☁️ Secure Sync
     Documents are securely stored and encrypted

  3. 🧠 Smart Data Classification
     AI analyzes content and adds intelligent tags:
     • Categories (Finance, Sales, Marketing, etc.)
     • Topics (Key themes discussed)
     • Entities (People, companies, products)
     • Keywords (Optimized search terms)

  4. 🚀 Ready to Launch
     Ask Astra anything about your data!

  ⏱️ This may take a few minutes depending on folder size.
  You can explore Launch Prep while this completes.
  ```

### Help & FAQ Updates

**New FAQ Entries:**

Q: What is a Master Team Folder?
A: Your Master Team Folder is the primary folder Astra syncs. All files and subfolders inside are automatically synced and classified. You can choose an existing folder or create a new "Astra Team Folder."

Q: Do I need to organize files into specific categories?
A: No! That's the magic of Astra. Simply put all your files in the Master Folder (or subfolders within it), and Astra's AI automatically categorizes them by content type, topics, and more.

Q: What are Additional Folders for?
A: Team members can add their own personal folders (up to 6 total) for data they want to include but might not be in the main team folder. For example, a Sales Director might sync their personal "Sales Resources" folder.

Q: What if a document covers multiple topics?
A: Perfect! Astra's Smart Data tags documents with ALL relevant categories. A meeting about budget AND sales gets tagged with both "Financial" and "Sales" categories, plus specific topics discussed.

Q: What is Smart Data?
A: Smart Data is AI-powered classification added to every document. It includes categories, topics, entities (people/companies mentioned), keywords, summaries, and date references. This makes your data searchable in powerful new ways.

Q: How long does sync take?
A: Initial sync time depends on folder size. Small folders (100 documents) might take 5-10 minutes. Larger folders (1000+ documents) could take 30-60 minutes. Documents are usable once Smart Data classification completes.

---

## 🎯 Success Metrics

### User Experience Metrics
- Time to complete folder connection (target: < 2 minutes)
- Sync progress screen abandonment rate (target: < 20%)
- Level progression rate (target: 50% reach Level 2 within 7 days)
- Additional folder adoption (target: 30% add at least 1 additional folder)

### Technical Metrics
- Average documents per sync session
- Smart Data classification accuracy (reviewed by super admin)
- Sync failure rate (target: < 5%)
- Average time to fully sync document (stored + classified)
- Category diversity per team (target average: 4-6 categories)

### Business Metrics
- User activation rate (connected drive + 1 synced doc)
- 7-day retention for users who reach Level 2
- Feature engagement (visualizations, reports) by Fuel Level

---

## 🚧 Implementation Phases & Timeline

### Phase 1: Database & Core Infrastructure (Week 1)
- [ ] Create `data_sync_sessions` table
- [ ] Create `document_sync_stats` view
- [ ] Create `calculate_fuel_level()` function
- [ ] Update RLS policies for new tables
- [ ] Enable realtime subscriptions

### Phase 2: Backend Services & Edge Functions (Week 1-2)
- [ ] Create `data-sync-service.ts` utility
- [ ] Create `trigger-sync-workflow` edge function
- [ ] Update `useDocumentCounts` hook
- [ ] Create `useDataSync` hook
- [ ] Create `useSyncProgress` hook

### Phase 3: UI Components - Sync Flow (Week 2)
- [ ] Create `SelectMasterFolderStep` component
- [ ] Create `DataSyncProgressScreen` component
- [ ] Create `SyncStatusWidget` component
- [ ] Create information carousel component
- [ ] Update onboarding welcome screen

### Phase 4: UI Components - Fuel Stage (Week 2-3)
- [ ] Update `FuelStage` component with new level system
- [ ] Update level achievement logic
- [ ] Add mini sync status widget to Fuel Stage
- [ ] Create category badges display
- [ ] Add "View Sync Progress" link

### Phase 5: UI Components - Settings & Management (Week 3)
- [ ] Create `AdditionalFoldersManager` component
- [ ] Create `DocumentLibrary` component
- [ ] Update User Settings Data Sync tab
- [ ] Add folder management interface
- [ ] Create document search/filter interface

### Phase 6: Mission Control Updates (Week 3)
- [ ] Add Fuel Status widget to dashboard
- [ ] Update navigation to Fuel Stage
- [ ] Add sync status indicators

### Phase 7: Testing & Refinement (Week 4)
- [ ] End-to-end sync flow testing
- [ ] Realtime updates testing
- [ ] Error handling & edge cases
- [ ] Performance testing with large folders
- [ ] Mobile responsiveness testing

### Phase 8: Migration Preparation (Week 4)
- [ ] Create migration script for existing users
- [ ] Test migration on staging environment
- [ ] Create admin dashboard for monitoring migration
- [ ] Document rollback procedure

### Phase 9: Launch (Week 5)
- [ ] Deploy to production
- [ ] Monitor initial sync sessions
- [ ] Collect user feedback
- [ ] Address any critical issues

---

## 🔐 Security & Privacy Considerations

### Data Protection
- All OAuth tokens remain encrypted in database
- Google Drive files are never permanently stored - only metadata and extracted text
- Users can delete individual documents from sync
- Disconnecting folder removes all associated documents
- Team data isolation via RLS policies

### Access Control
- Only team members can view synced documents
- Admin role required to manage additional folders
- User who connected Drive can modify folder selections
- Super admin can view sync sessions for support

### Compliance
- GDPR: Users can delete all synced data via UI
- Data retention: Documents deleted in Drive can be auto-removed (if configured)
- Audit logging: All sync sessions tracked with timestamps
- Right to be forgotten: Full account deletion removes all synced data

---

## 📞 Support & Documentation

### User Documentation Needed
1. Master Folder Setup Guide
2. Understanding Smart Data Classification
3. Category System Overview
4. Searching with Smart Data
5. Adding Additional Folders
6. Managing Synced Documents
7. Troubleshooting Sync Issues

### Admin Documentation Needed
1. Monitoring Sync Sessions
2. Migration Guide for Existing Users
3. Webhook Configuration
4. Database Schema Reference
5. Performance Optimization

### In-App Help
- Contextual tooltips on Fuel Stage
- "How to Setup Folders" guide button
- Sync progress explanation during first sync
- FAQ integration in Help Center

---

## ❓ Open Questions for Resolution

### Technical Decisions
1. **Webhook Authentication:** Should we use Supabase service role key or JWT tokens for n8n webhook calls?
2. **Rate Limiting:** Should we limit sync frequency per team to prevent abuse?
3. **File Size Limits:** Maximum file size for sync and classification?
4. **Batch Processing:** How many documents should Smart Data classification process per batch?

### UX Decisions
1. **Auto-Refresh:** Should sync progress screen auto-refresh or require manual refresh?
2. **Notifications:** Should we send browser notifications when sync completes?
3. **Error Recovery:** How should we handle partial sync failures?

### Business Logic
1. **Level Decay:** If user deletes documents, should their level decrease?
2. **Folder Limits:** Should additional folder limit (6) apply per user or per team?
3. **Classification Re-runs:** Should we re-classify old documents when AI model improves?

---

## 🎉 Expected User Benefits

1. **Simplified Setup:** One folder vs. four separate categories
2. **Unlimited Categories:** Not restricted to predefined types
3. **Intelligent Search:** Multi-dimensional search capabilities
4. **Time Savings:** No manual categorization required
5. **Comprehensive Coverage:** All business data in one place
6. **Automatic Organization:** AI handles categorization
7. **Flexible Structure:** Add personal folders as needed
8. **Real-Time Insights:** See classification as it happens

---

## 📋 Definition of Done

### Technical Completion
- ✅ All database migrations deployed
- ✅ All edge functions tested and deployed
- ✅ All frontend components implemented
- ✅ Real-time subscriptions working
- ✅ Error handling implemented
- ✅ Mobile responsive design verified
- ✅ Performance benchmarks met

### User Experience Completion
- ✅ Onboarding flow tested with 10+ users
- ✅ Sync progress clear and informative
- ✅ Help documentation published
- ✅ FAQ updated with new content
- ✅ Support team trained

### Business Completion
- ✅ Migration plan approved
- ✅ Existing user migration tested
- ✅ Monitoring dashboard deployed
- ✅ Success metrics tracking implemented
- ✅ Rollback procedure documented

---

## 🚀 Ready to Launch!

This comprehensive plan transforms the data sync experience from rigid category-based folders to an intelligent, flexible Master Folder system. Users can now connect their entire knowledge base in one place while Astra's AI automatically organizes and enriches every document with Smart Data.

**Key Innovation:** Moving from manual categorization to AI-powered intelligence, making the platform infinitely more flexible and powerful while dramatically simplifying the user experience.

**Next Steps:** Confirm plan details, prioritize implementation phases, and begin Phase 1 database work.
