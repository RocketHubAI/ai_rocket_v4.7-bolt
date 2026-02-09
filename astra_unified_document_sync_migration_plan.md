# Astra Unified Document Sync Migration Plan

## Executive Summary

This document outlines the complete migration plan to transition Astra from a multi-folder, multi-table document sync architecture to a unified single-folder, single-table system with LLM-powered document classification.

### Current State
- **4 separate user folders** required (Strategy, Financials, Meetings, Projects)
- **4 separate database tables** (`document_chunks_strategy`, `document_chunks_financial`, `document_chunks_meetings`, `document_chunks_projects`)
- **4 separate sync workflows** in n8n
- **4 Vector Store nodes** in Astra Intelligence Agent workflow
- **Flat folder sync** (no subfolder traversal)
- **Implicit access control** (skip table if no permission)

### Target State
- **1 user folder** ("Astra Documents" or any user-selected folder)
- **1 unified database table** (`document_chunks`) with `doc_type` and `sensitivity_level` columns
- **1 unified sync workflow** with recursive folder traversal
- **1 Vector Store node** in Astra Intelligence Agent workflow
- **Recursive folder sync** (all subfolders automatically included)
- **Explicit access control** via row-level filtering on `sensitivity_level`
- **LLM-powered classification** during document ingestion

### Benefits
| Benefit | Impact |
|---------|--------|
| Simplified user onboarding | High - "Just select one folder" |
| Unlimited document types | High - No rigid categorization |
| Reduced maintenance | High - 1 workflow vs 4 |
| Improved search relevance | Medium - Semantic + metadata search |
| Better access control | Medium - Explicit, auditable filtering |
| Performance improvement | Medium - Single vector query vs multiple |

---

## Table of Contents

1. [OAuth Scope Configuration](#1-oauth-scope-configuration)
2. [Database Schema Changes](#2-database-schema-changes)
3. [Database Functions](#3-database-functions)
4. [Frontend Code Changes](#4-frontend-code-changes)
5. [n8n Workflow Changes - Data Sync](#5-n8n-workflow-changes---data-sync)
6. [n8n Workflow Changes - Astra Intelligence Agent](#6-n8n-workflow-changes---astra-intelligence-agent)
7. [LLM Classification System](#7-llm-classification-system)
8. [Data Migration Strategy](#8-data-migration-strategy)
9. [Testing Plan](#9-testing-plan)
10. [Rollback Plan](#10-rollback-plan)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. OAuth Scope Configuration

### Selected Scope

```
https://www.googleapis.com/auth/drive
```

**Scope:** Full Google Drive access
**Rationale:** Required for recursive folder traversal, reading all file types, and creating output files in user's Drive.

### Capabilities Enabled

| Capability | Enabled |
|------------|---------|
| List all folders | Yes |
| Traverse subfolders recursively | Yes |
| Read all file types (PDF, DOCX, Sheets, etc.) | Yes |
| Download file contents | Yes |
| Create new files (reports, exports) | Yes |
| Edit app-created files | Yes |

### User-Facing Permission Explanation

```
Astra needs access to your Google Drive to:

• Sync documents from your selected folder and all subfolders
• Read and analyze your business documents
• Create reports and exports in your Drive

You can revoke access anytime from your Google Account settings.
```

### Implementation Notes

- Update OAuth consent screen in Google Cloud Console
- Update frontend OAuth flow to request `drive` scope
- Handle scope upgrade for existing users (re-authentication required)

---

## 2. Database Schema Changes

### 2.1 New Unified Table: `document_chunks`

```sql
-- Drop existing type if it exists (for clean migration)
DROP TYPE IF EXISTS doc_category CASCADE;
DROP TYPE IF EXISTS sensitivity_level CASCADE;

-- Create document category enum (broad categories)
CREATE TYPE doc_category AS ENUM (
    'strategy',      -- Vision, plans, competitive analysis, roadmaps
    'financial',     -- Budgets, statements, invoices, P&L, forecasts
    'operational',   -- Meetings, projects, processes, procedures
    'people',        -- HR, personnel, org charts, reviews, compensation
    'customer',      -- Sales, CRM, support tickets, feedback, contracts
    'external',      -- Market research, industry reports, competitor analysis
    'reference',     -- Policies, handbooks, templates, guidelines
    'other'          -- Catch-all for unclassified documents
);

-- Create sensitivity level enum (access control)
CREATE TYPE sensitivity_level AS ENUM (
    'general',       -- Anyone on team can access
    'financial',     -- Requires view_financial permission
    'hr_sensitive',  -- Requires view_hr permission (future)
    'confidential'   -- Requires elevated access (future)
);

-- Create unified document_chunks table
CREATE TABLE document_chunks (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,  -- Groups chunks from same document
    chunk_index INTEGER NOT NULL,

    -- Content and embedding
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- OpenAI text-embedding-3-small

    -- Document classification
    doc_category doc_category NOT NULL DEFAULT 'other',
    doc_type TEXT,  -- Flexible: 'budget_proposal', 'meeting_minutes', 'sales_report', etc.
    sensitivity_level sensitivity_level NOT NULL DEFAULT 'general',

    -- LLM classification metadata
    ai_classification JSONB DEFAULT '{}',
    /*
    Example ai_classification structure:
    {
        "category": "financial",
        "type": "budget_proposal",
        "sensitivity": "financial",
        "confidence": 0.94,
        "topics": ["2025 planning", "capital expenditure", "staffing"],
        "entities": ["City Church Georgetown", "Wells Fargo"],
        "date_references": ["2025", "Q1 2025"],
        "summary": "2025 annual budget proposal with staffing expansion plans",
        "search_keywords": ["budget", "giving", "tithe", "expenses"],
        "reasoning": "Document contains detailed financial figures and budget allocations"
    }
    */

    -- File metadata
    file_name TEXT NOT NULL,
    file_path TEXT,  -- Google Drive path: '/Financials/2024/'
    folder_path TEXT,  -- Parent folder path for context
    parent_folder_name TEXT,  -- Immediate parent folder name
    google_file_id TEXT,  -- Google Drive file ID
    mime_type TEXT,
    file_size BIGINT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    file_modified_at TIMESTAMPTZ,  -- From Google Drive

    -- Classification audit trail
    classified_at TIMESTAMPTZ,
    classified_by TEXT,  -- 'auto_llm', 'user_override', 'rule_based', 'folder_inferred'
    classification_model TEXT,  -- 'gpt-4o-mini', 'claude-3-haiku', etc.
    classification_confidence FLOAT,

    -- Sync metadata
    sync_status TEXT DEFAULT 'active',  -- 'active', 'deleted', 'archived'
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    content_hash TEXT,  -- For detecting changes

    -- Constraints
    CONSTRAINT unique_chunk UNIQUE (team_id, document_id, chunk_index)
);

-- Create indexes for performance
CREATE INDEX idx_document_chunks_team_id ON document_chunks(team_id);
CREATE INDEX idx_document_chunks_team_category ON document_chunks(team_id, doc_category);
CREATE INDEX idx_document_chunks_team_sensitivity ON document_chunks(team_id, sensitivity_level);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_google_file_id ON document_chunks(google_file_id);
CREATE INDEX idx_document_chunks_folder_path ON document_chunks(team_id, folder_path);
CREATE INDEX idx_document_chunks_file_name ON document_chunks(team_id, file_name);
CREATE INDEX idx_document_chunks_sync_status ON document_chunks(team_id, sync_status);

-- Vector similarity search index (IVFFlat for performance)
CREATE INDEX idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search index on content
CREATE INDEX idx_document_chunks_content_fts ON document_chunks
USING gin(to_tsvector('english', content));

-- JSONB index for AI classification queries
CREATE INDEX idx_document_chunks_ai_classification ON document_chunks
USING gin(ai_classification);

-- Enable Row Level Security
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their team's documents
CREATE POLICY "Users can access own team documents" ON document_chunks
    FOR ALL
    USING (team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ));
```

### 2.2 Team Settings Schema Update

```sql
-- Add new sync settings column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sync_settings JSONB DEFAULT '{}';

/*
New sync_settings structure:
{
    "root_folder_id": "google_drive_folder_id",
    "root_folder_name": "Company Documents",
    "recursive": true,
    "max_depth": 10,
    "exclude_folders": ["Archive", "Old", "Trash", ".hidden"],
    "exclude_patterns": ["*.tmp", "~*", ".DS_Store"],
    "last_full_sync": "2025-01-15T10:30:00Z",
    "last_incremental_sync": "2025-01-15T14:22:00Z",
    "sync_status": "active",
    "total_files_synced": 245,
    "total_folders_scanned": 32
}

Old structure (to be deprecated):
{
    "strategy_folder_id": "abc123",
    "financial_folder_id": "def456",
    "meetings_folder_id": "ghi789",
    "projects_folder_id": "jkl012"
}
*/

-- Migration: Convert old folder settings to new format (run once)
UPDATE teams
SET sync_settings = jsonb_build_object(
    'legacy_folders', sync_settings,
    'migrated_at', NOW(),
    'migration_status', 'pending_user_action'
)
WHERE sync_settings ? 'strategy_folder_id'
   OR sync_settings ? 'financial_folder_id'
   OR sync_settings ? 'meetings_folder_id'
   OR sync_settings ? 'projects_folder_id';
```

### 2.3 Documents Master Table (Optional - for document-level metadata)

```sql
-- Optional: Track documents separately from chunks
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Google Drive metadata
    google_file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT,
    folder_path TEXT,
    mime_type TEXT,
    file_size BIGINT,

    -- Classification (document-level)
    doc_category doc_category NOT NULL DEFAULT 'other',
    doc_type TEXT,
    sensitivity_level sensitivity_level NOT NULL DEFAULT 'general',
    ai_classification JSONB DEFAULT '{}',

    -- Processing status
    processing_status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
    chunk_count INTEGER DEFAULT 0,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    file_modified_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,

    -- Audit
    classified_at TIMESTAMPTZ,
    classified_by TEXT,
    classification_model TEXT,

    CONSTRAINT unique_team_file UNIQUE (team_id, google_file_id)
);

CREATE INDEX idx_documents_team_id ON documents(team_id);
CREATE INDEX idx_documents_google_file_id ON documents(google_file_id);
CREATE INDEX idx_documents_processing_status ON documents(team_id, processing_status);
```

---

## 3. Database Functions

### 3.1 Primary Search Function

```sql
CREATE OR REPLACE FUNCTION search_documents(
    p_team_id UUID,
    p_query_embedding VECTOR(1536),
    p_query_text TEXT DEFAULT NULL,
    p_doc_categories doc_category[] DEFAULT NULL,
    p_doc_types TEXT[] DEFAULT NULL,
    p_topics TEXT[] DEFAULT NULL,
    p_folder_path TEXT DEFAULT NULL,
    p_top_k INTEGER DEFAULT 100,
    p_view_financial BOOLEAN DEFAULT FALSE,
    p_view_hr BOOLEAN DEFAULT FALSE,
    p_view_confidential BOOLEAN DEFAULT FALSE,
    p_min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    doc_category doc_category,
    doc_type TEXT,
    sensitivity_level sensitivity_level,
    file_name TEXT,
    file_path TEXT,
    folder_path TEXT,
    similarity FLOAT,
    relevance_score FLOAT,
    ai_summary TEXT,
    ai_topics TEXT[],
    ai_classification JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH base_search AS (
        SELECT
            dc.id,
            dc.document_id,
            dc.content,
            dc.doc_category,
            dc.doc_type,
            dc.sensitivity_level,
            dc.file_name,
            dc.file_path,
            dc.folder_path,
            dc.ai_classification,
            1 - (dc.embedding <=> p_query_embedding) AS vector_similarity
        FROM document_chunks dc
        WHERE dc.team_id = p_team_id
          AND dc.sync_status = 'active'
          -- Access control enforcement
          AND (
              dc.sensitivity_level = 'general'
              OR (dc.sensitivity_level = 'financial' AND p_view_financial = TRUE)
              OR (dc.sensitivity_level = 'hr_sensitive' AND p_view_hr = TRUE)
              OR (dc.sensitivity_level = 'confidential' AND p_view_confidential = TRUE)
          )
          -- Optional category filter
          AND (p_doc_categories IS NULL OR dc.doc_category = ANY(p_doc_categories))
          -- Optional type filter
          AND (p_doc_types IS NULL OR dc.doc_type = ANY(p_doc_types))
          -- Optional folder path filter
          AND (p_folder_path IS NULL OR dc.folder_path LIKE p_folder_path || '%')
          -- Minimum similarity threshold
          AND (1 - (dc.embedding <=> p_query_embedding)) >= p_min_similarity
    )
    SELECT
        bs.id,
        bs.document_id,
        bs.content,
        bs.doc_category,
        bs.doc_type,
        bs.sensitivity_level,
        bs.file_name,
        bs.file_path,
        bs.folder_path,
        bs.vector_similarity AS similarity,
        -- Calculate relevance score with metadata boosting
        (
            bs.vector_similarity * 0.70  -- Base vector similarity (70%)
            + CASE
                WHEN p_topics IS NOT NULL
                     AND bs.ai_classification->'topics' ?| p_topics
                THEN 0.15
                ELSE 0
              END  -- Topic match boost (15%)
            + CASE
                WHEN p_query_text IS NOT NULL
                     AND bs.ai_classification->>'summary' ILIKE '%' || p_query_text || '%'
                THEN 0.10
                ELSE 0
              END  -- Summary keyword boost (10%)
            + CASE
                WHEN p_query_text IS NOT NULL
                     AND bs.ai_classification->'search_keywords' ?| string_to_array(lower(p_query_text), ' ')
                THEN 0.05
                ELSE 0
              END  -- Keyword match boost (5%)
        ) AS relevance_score,
        bs.ai_classification->>'summary' AS ai_summary,
        ARRAY(SELECT jsonb_array_elements_text(bs.ai_classification->'topics')) AS ai_topics,
        bs.ai_classification
    FROM base_search bs
    ORDER BY relevance_score DESC, bs.vector_similarity DESC
    LIMIT p_top_k;
END;
$$;
```

### 3.2 Simplified Search Function (for Supabase Vector Store node)

```sql
-- Simplified function matching Supabase Vector Store node requirements
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count INTEGER DEFAULT 100,
    filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_id UUID;
    v_view_financial BOOLEAN;
    v_view_hr BOOLEAN;
    v_doc_categories TEXT[];
    v_doc_types TEXT[];
    v_folder_path TEXT;
BEGIN
    -- Extract filter parameters
    v_team_id := (filter->>'team_id')::UUID;
    v_view_financial := COALESCE((filter->>'view_financial')::BOOLEAN, FALSE);
    v_view_hr := COALESCE((filter->>'view_hr')::BOOLEAN, FALSE);
    v_doc_categories := CASE
        WHEN filter->'doc_categories' IS NOT NULL
        THEN ARRAY(SELECT jsonb_array_elements_text(filter->'doc_categories'))
        ELSE NULL
    END;
    v_doc_types := CASE
        WHEN filter->'doc_types' IS NOT NULL
        THEN ARRAY(SELECT jsonb_array_elements_text(filter->'doc_types'))
        ELSE NULL
    END;
    v_folder_path := filter->>'folder_path';

    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        jsonb_build_object(
            'document_id', dc.document_id,
            'doc_category', dc.doc_category,
            'doc_type', dc.doc_type,
            'sensitivity_level', dc.sensitivity_level,
            'file_name', dc.file_name,
            'file_path', dc.file_path,
            'folder_path', dc.folder_path,
            'ai_summary', dc.ai_classification->>'summary',
            'ai_topics', dc.ai_classification->'topics',
            'created_at', dc.created_at
        ) AS metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.team_id = v_team_id
      AND dc.sync_status = 'active'
      -- Access control
      AND (
          dc.sensitivity_level = 'general'
          OR (dc.sensitivity_level = 'financial' AND v_view_financial = TRUE)
          OR (dc.sensitivity_level = 'hr_sensitive' AND v_view_hr = TRUE)
      )
      -- Optional filters
      AND (v_doc_categories IS NULL OR dc.doc_category::TEXT = ANY(v_doc_categories))
      AND (v_doc_types IS NULL OR dc.doc_type = ANY(v_doc_types))
      AND (v_folder_path IS NULL OR dc.folder_path LIKE v_folder_path || '%')
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

### 3.3 Document Statistics Function

```sql
CREATE OR REPLACE FUNCTION get_document_stats(p_team_id UUID)
RETURNS TABLE (
    total_documents BIGINT,
    total_chunks BIGINT,
    by_category JSONB,
    by_sensitivity JSONB,
    by_folder JSONB,
    last_sync TIMESTAMPTZ,
    storage_estimate_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT dc.document_id) AS total_documents,
        COUNT(*) AS total_chunks,
        (
            SELECT jsonb_object_agg(doc_category, cnt)
            FROM (
                SELECT doc_category::TEXT, COUNT(*) as cnt
                FROM document_chunks
                WHERE team_id = p_team_id AND sync_status = 'active'
                GROUP BY doc_category
            ) cat_counts
        ) AS by_category,
        (
            SELECT jsonb_object_agg(sensitivity_level, cnt)
            FROM (
                SELECT sensitivity_level::TEXT, COUNT(*) as cnt
                FROM document_chunks
                WHERE team_id = p_team_id AND sync_status = 'active'
                GROUP BY sensitivity_level
            ) sens_counts
        ) AS by_sensitivity,
        (
            SELECT jsonb_object_agg(COALESCE(folder_path, '/'), cnt)
            FROM (
                SELECT folder_path, COUNT(*) as cnt
                FROM document_chunks
                WHERE team_id = p_team_id AND sync_status = 'active'
                GROUP BY folder_path
                ORDER BY cnt DESC
                LIMIT 20
            ) folder_counts
        ) AS by_folder,
        MAX(dc.last_synced_at) AS last_sync,
        ROUND(SUM(LENGTH(dc.content))::NUMERIC / 1024 / 1024, 2) AS storage_estimate_mb
    FROM document_chunks dc
    WHERE dc.team_id = p_team_id
      AND dc.sync_status = 'active';
END;
$$;
```

### 3.4 Cleanup Function for Deleted Files

```sql
CREATE OR REPLACE FUNCTION mark_deleted_documents(
    p_team_id UUID,
    p_active_google_file_ids TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Mark documents as deleted if their Google file ID is not in the active list
    UPDATE document_chunks
    SET
        sync_status = 'deleted',
        updated_at = NOW()
    WHERE team_id = p_team_id
      AND sync_status = 'active'
      AND google_file_id IS NOT NULL
      AND google_file_id != ALL(p_active_google_file_ids);

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;
```

---

## 4. Frontend Code Changes

### 4.1 OAuth Flow Update

```typescript
// Update Google OAuth configuration
// File: src/lib/auth/google-oauth.ts

export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/drive',  // Full drive access
    'openid',
    'email',
    'profile'
  ],
  // Remove old scopes:
  // 'https://www.googleapis.com/auth/drive.file',
  // 'https://www.googleapis.com/auth/drive.readonly',
};

// Handle scope upgrade for existing users
export async function checkAndUpgradeScopes(accessToken: string): Promise<boolean> {
  const tokenInfo = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
  ).then(r => r.json());

  const currentScopes = tokenInfo.scope?.split(' ') || [];
  const hasFullDrive = currentScopes.includes('https://www.googleapis.com/auth/drive');

  if (!hasFullDrive) {
    // Trigger re-authentication with new scope
    return false;
  }

  return true;
}
```

### 4.2 Folder Selection Component

```typescript
// File: src/components/settings/FolderSelector.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FolderIcon, RefreshCw, Check } from 'lucide-react';

interface FolderSelectorProps {
  teamId: string;
  currentFolder?: {
    id: string;
    name: string;
  };
  onFolderSelect: (folder: { id: string; name: string; path: string }) => void;
}

export function FolderSelector({ teamId, currentFolder, onFolderSelect }: FolderSelectorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openGooglePicker = async () => {
    setIsLoading(true);

    try {
      // Load Google Picker API
      await loadGooglePickerApi();

      const picker = new google.picker.PickerBuilder()
        .setTitle('Select folder to sync with Astra')
        .addView(
          new google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setMimeTypes('application/vnd.google-apps.folder')
        )
        .setOAuthToken(await getAccessToken())
        .setCallback((data) => {
          if (data.action === google.picker.Action.PICKED) {
            const folder = data.docs[0];
            onFolderSelect({
              id: folder.id,
              name: folder.name,
              path: folder.parentId ? `/${folder.name}/` : '/'
            });
          }
          setIsPickerOpen(false);
        })
        .build();

      picker.setVisible(true);
      setIsPickerOpen(true);
    } catch (error) {
      console.error('Error opening picker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <FolderIcon className="h-8 w-8 text-blue-500" />
          <div>
            <p className="font-medium">
              {currentFolder?.name || 'No folder selected'}
            </p>
            <p className="text-sm text-gray-500">
              {currentFolder
                ? 'All files and subfolders will be synced'
                : 'Select a folder to start syncing'}
            </p>
          </div>
        </div>

        <Button
          onClick={openGooglePicker}
          disabled={isLoading}
          variant={currentFolder ? 'outline' : 'default'}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : currentFolder ? (
            <Check className="h-4 w-4 mr-2" />
          ) : null}
          {currentFolder ? 'Change Folder' : 'Select Folder'}
        </Button>
      </div>

      {currentFolder && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">What will be synced:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>All files in "{currentFolder.name}"</li>
            <li>All files in subfolders (recursive)</li>
            <li>New files added to the folder</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 4.3 Sync Settings Page Update

```typescript
// File: src/pages/settings/sync.tsx

import { useState, useEffect } from 'react';
import { FolderSelector } from '@/components/settings/FolderSelector';
import { SyncStatus } from '@/components/settings/SyncStatus';
import { DocumentStats } from '@/components/settings/DocumentStats';
import { supabase } from '@/lib/supabase';

interface SyncSettings {
  root_folder_id: string | null;
  root_folder_name: string | null;
  recursive: boolean;
  max_depth: number;
  exclude_folders: string[];
  exclude_patterns: string[];
  last_full_sync: string | null;
  sync_status: 'active' | 'paused' | 'error';
  total_files_synced: number;
  total_folders_scanned: number;
}

export default function SyncSettingsPage() {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const teamId = useTeamId();

  useEffect(() => {
    loadSettings();
  }, [teamId]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('sync_settings')
      .eq('id', teamId)
      .single();

    if (data) {
      setSettings(data.sync_settings || getDefaultSettings());
    }
    setIsLoading(false);
  };

  const handleFolderSelect = async (folder: { id: string; name: string }) => {
    setIsSaving(true);

    const newSettings: SyncSettings = {
      ...settings,
      root_folder_id: folder.id,
      root_folder_name: folder.name,
      recursive: true,
      max_depth: 10,
      sync_status: 'active'
    };

    const { error } = await supabase
      .from('teams')
      .update({ sync_settings: newSettings })
      .eq('id', teamId);

    if (!error) {
      setSettings(newSettings);
      // Trigger initial sync
      await triggerSync(teamId, folder.id);
    }

    setIsSaving(false);
  };

  const handleExclusionUpdate = async (excludeFolders: string[]) => {
    const newSettings = { ...settings, exclude_folders: excludeFolders };

    await supabase
      .from('teams')
      .update({ sync_settings: newSettings })
      .eq('id', teamId);

    setSettings(newSettings);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Document Sync Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure which Google Drive folder Astra syncs with
        </p>
      </div>

      {/* Folder Selection */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sync Folder</h2>
        <FolderSelector
          teamId={teamId}
          currentFolder={
            settings?.root_folder_id
              ? { id: settings.root_folder_id, name: settings.root_folder_name }
              : undefined
          }
          onFolderSelect={handleFolderSelect}
        />
      </section>

      {/* Sync Status */}
      {settings?.root_folder_id && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sync Status</h2>
          <SyncStatus
            status={settings.sync_status}
            lastSync={settings.last_full_sync}
            filesCount={settings.total_files_synced}
            foldersCount={settings.total_folders_scanned}
          />
        </section>
      )}

      {/* Document Statistics */}
      {settings?.root_folder_id && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Document Overview</h2>
          <DocumentStats teamId={teamId} />
        </section>
      )}

      {/* Exclusion Settings */}
      {settings?.root_folder_id && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Excluded Folders</h2>
          <ExclusionManager
            excludedFolders={settings.exclude_folders || []}
            onUpdate={handleExclusionUpdate}
          />
          <p className="text-sm text-gray-500">
            Folders matching these names will be skipped during sync
          </p>
        </section>
      )}

      {/* Migration Notice for Existing Users */}
      {settings?.legacy_folders && (
        <MigrationNotice
          legacyFolders={settings.legacy_folders}
          onMigrate={() => handleMigration()}
        />
      )}
    </div>
  );
}

function getDefaultSettings(): SyncSettings {
  return {
    root_folder_id: null,
    root_folder_name: null,
    recursive: true,
    max_depth: 10,
    exclude_folders: ['Archive', 'Old', 'Trash', '.hidden'],
    exclude_patterns: ['*.tmp', '~*', '.DS_Store'],
    last_full_sync: null,
    sync_status: 'active',
    total_files_synced: 0,
    total_folders_scanned: 0
  };
}
```

### 4.4 Document Statistics Component

```typescript
// File: src/components/settings/DocumentStats.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DocumentStats {
  total_documents: number;
  total_chunks: number;
  by_category: Record<string, number>;
  by_sensitivity: Record<string, number>;
  by_folder: Record<string, number>;
  last_sync: string;
  storage_estimate_mb: number;
}

const CATEGORY_COLORS = {
  strategy: '#3B82F6',
  financial: '#10B981',
  operational: '#F59E0B',
  people: '#8B5CF6',
  customer: '#EC4899',
  external: '#6366F1',
  reference: '#64748B',
  other: '#94A3B8'
};

export function DocumentStats({ teamId }: { teamId: string }) {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [teamId]);

  const loadStats = async () => {
    const { data, error } = await supabase
      .rpc('get_document_stats', { p_team_id: teamId });

    if (data && data.length > 0) {
      setStats(data[0]);
    }
    setIsLoading(false);
  };

  if (isLoading) return <div>Loading statistics...</div>;
  if (!stats) return <div>No documents synced yet</div>;

  const categoryData = Object.entries(stats.by_category || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CATEGORY_COLORS[name] || '#94A3B8'
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Summary Stats */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Total Documents</span>
            <span className="font-semibold">{stats.total_documents}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Chunks</span>
            <span className="font-semibold">{stats.total_chunks}</span>
          </div>
          <div className="flex justify-between">
            <span>Storage Used</span>
            <span className="font-semibold">{stats.storage_estimate_mb} MB</span>
          </div>
          <div className="flex justify-between">
            <span>Last Sync</span>
            <span className="font-semibold">
              {stats.last_sync
                ? new Date(stats.last_sync).toLocaleString()
                : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-500 mb-4">By Category</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensitivity Breakdown */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-500 mb-4">By Access Level</h3>
        <div className="space-y-2">
          {Object.entries(stats.by_sensitivity || {}).map(([level, count]) => (
            <div key={level} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  level === 'general' ? 'bg-green-500' :
                  level === 'financial' ? 'bg-yellow-500' :
                  level === 'hr_sensitive' ? 'bg-orange-500' :
                  'bg-red-500'
                }`} />
                <span className="capitalize">{level.replace('_', ' ')}</span>
              </div>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Folders */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Top Folders</h3>
        <div className="space-y-2">
          {Object.entries(stats.by_folder || {})
            .slice(0, 5)
            .map(([folder, count]) => (
              <div key={folder} className="flex justify-between">
                <span className="truncate max-w-[200px]" title={folder}>
                  {folder || '/'}
                </span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. n8n Workflow Changes - Data Sync

### 5.1 Unified Document Sync Workflow Overview

**Workflow Name:** `Astra - Unified Document Sync`

**Triggers:**
- Scheduled (every 15 minutes for incremental sync)
- Webhook (for manual trigger or Google Drive push notifications)
- On team settings update (new folder selected)

**High-Level Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│  1. Trigger (Scheduled/Webhook)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Fetch teams with active sync settings                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. For each team: Recursive folder traversal                   │
│     - Start with root_folder_id                                 │
│     - Discover all files in all subfolders                      │
│     - Respect exclude_folders and max_depth                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Filter: Only process new/modified files                     │
│     - Compare file modifiedTime vs last_synced_at               │
│     - Skip unchanged files                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. For each file: Extract content                              │
│     - PDF extraction                                            │
│     - Google Docs/Sheets export                                 │
│     - Text file reading                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. LLM Classification (GPT-4o-mini)                            │
│     - Classify document category                                │
│     - Determine sensitivity level                               │
│     - Extract topics, entities, summary                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Chunking                                                    │
│     - Split document into chunks                                │
│     - Maintain overlap for context                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. Embedding (OpenAI text-embedding-3-small)                   │
│     - Generate embeddings for each chunk                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. Store in Supabase                                           │
│     - Upsert chunks with classification metadata                │
│     - Update team sync statistics                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. Cleanup: Mark deleted files                                │
│      - Compare against active file list                         │
│      - Mark missing files as sync_status = 'deleted'            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Node-by-Node Implementation

#### Node 1: Schedule Trigger
```json
{
  "name": "Schedule Trigger",
  "type": "n8n-nodes-base.scheduleTrigger",
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "minutes",
          "minutesInterval": 15
        }
      ]
    }
  }
}
```

#### Node 2: Fetch Active Teams
```json
{
  "name": "Fetch Active Teams",
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "getAll",
    "tableId": "teams",
    "filters": {
      "conditions": [
        {
          "keyName": "sync_settings->>'root_folder_id'",
          "condition": "is not null"
        },
        {
          "keyName": "sync_settings->>'sync_status'",
          "condition": "eq",
          "keyValue": "active"
        }
      ]
    },
    "returnAll": true
  }
}
```

#### Node 3: Initialize Folder Queue (Code Node)
```javascript
// Code Node: Initialize Recursive Traversal
const teams = $input.all();
const results = [];

for (const team of teams) {
  const syncSettings = team.json.sync_settings || {};

  if (!syncSettings.root_folder_id) continue;

  results.push({
    json: {
      team_id: team.json.id,
      team_name: team.json.name,
      root_folder_id: syncSettings.root_folder_id,
      root_folder_name: syncSettings.root_folder_name,
      max_depth: syncSettings.max_depth || 10,
      exclude_folders: syncSettings.exclude_folders || ['Archive', 'Old', 'Trash'],
      exclude_patterns: syncSettings.exclude_patterns || ['*.tmp', '~*'],
      last_sync: syncSettings.last_full_sync,

      // Initialize traversal state
      foldersToProcess: [{
        id: syncSettings.root_folder_id,
        name: syncSettings.root_folder_name,
        path: '/',
        depth: 0
      }],
      discoveredFiles: [],
      processedFolders: [],
      currentDepth: 0
    }
  });
}

return results;
```

#### Node 4: Loop - Process Folder Queue
```javascript
// Code Node: Process Next Folder in Queue
const state = $input.first().json;
const foldersToProcess = state.foldersToProcess || [];
const discoveredFiles = state.discoveredFiles || [];
const processedFolders = state.processedFolders || [];

// Check if we're done
if (foldersToProcess.length === 0) {
  return {
    json: {
      ...state,
      done: true,
      files: discoveredFiles,
      totalFiles: discoveredFiles.length,
      foldersScanned: processedFolders.length
    }
  };
}

// Get next folder
const currentFolder = foldersToProcess.shift();

return {
  json: {
    ...state,
    done: false,
    currentFolder: currentFolder,
    foldersToProcess: foldersToProcess,
    discoveredFiles: discoveredFiles,
    processedFolders: [...processedFolders, currentFolder]
  }
};
```

#### Node 5: IF - Continue Loop?
```json
{
  "name": "IF Continue Loop",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.done }}",
          "value2": false
        }
      ]
    }
  }
}
```

#### Node 6: Google Drive - List Folder Contents
```json
{
  "name": "List Folder Contents",
  "type": "n8n-nodes-base.googleDrive",
  "parameters": {
    "operation": "list",
    "folderId": "={{ $json.currentFolder.id }}",
    "queryString": "trashed = false",
    "returnAll": true,
    "options": {
      "fields": "id, name, mimeType, modifiedTime, size, parents"
    }
  },
  "credentials": {
    "googleDriveOAuth2Api": {
      "id": "CREDENTIAL_ID",
      "name": "Google Drive OAuth"
    }
  }
}
```

#### Node 7: Categorize Results (Code Node)
```javascript
// Code Node: Split Files and Folders
const items = $input.all();
const state = $('Process Next Folder').first().json;
const currentFolder = state.currentFolder;
const excludeFolders = state.exclude_folders || [];
const maxDepth = state.max_depth || 10;

const newFiles = [];
const newFolders = [];

for (const item of items) {
  const data = item.json;
  const itemPath = currentFolder.path + data.name + '/';

  if (data.mimeType === 'application/vnd.google-apps.folder') {
    // It's a folder - check exclusions and depth
    const shouldExclude = excludeFolders.some(pattern =>
      data.name.toLowerCase() === pattern.toLowerCase() ||
      data.name.startsWith('.')
    );

    const atMaxDepth = currentFolder.depth >= maxDepth;

    if (!shouldExclude && !atMaxDepth) {
      newFolders.push({
        id: data.id,
        name: data.name,
        path: itemPath,
        depth: currentFolder.depth + 1
      });
    }
  } else {
    // It's a file - check patterns
    const shouldExclude = state.exclude_patterns?.some(pattern => {
      if (pattern.startsWith('*')) {
        return data.name.endsWith(pattern.slice(1));
      }
      if (pattern.endsWith('*')) {
        return data.name.startsWith(pattern.slice(0, -1));
      }
      return data.name === pattern;
    });

    if (!shouldExclude) {
      newFiles.push({
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        modifiedTime: data.modifiedTime,
        size: data.size,
        path: currentFolder.path,
        fullPath: currentFolder.path + data.name,
        parentFolderName: currentFolder.name,
        folderPath: currentFolder.path
      });
    }
  }
}

// Update state
return {
  json: {
    ...state,
    foldersToProcess: [...state.foldersToProcess, ...newFolders],
    discoveredFiles: [...state.discoveredFiles, ...newFiles],
    newFilesThisBatch: newFiles.length,
    newFoldersThisBatch: newFolders.length
  }
};
```

#### Node 8: Loop Back
Connect back to "Process Next Folder" node to continue iteration.

#### Node 9: Filter Changed Files (Code Node)
```javascript
// Code Node: Filter to Only New/Modified Files
const state = $input.first().json;
const files = state.files || [];
const lastSync = state.last_sync ? new Date(state.last_sync) : new Date(0);

const filesToProcess = files.filter(file => {
  const fileModified = new Date(file.modifiedTime);
  return fileModified > lastSync;
});

return {
  json: {
    ...state,
    filesToProcess: filesToProcess,
    totalFilesToProcess: filesToProcess.length,
    skippedUnchanged: files.length - filesToProcess.length
  }
};
```

#### Node 10: Split Into Batches
```json
{
  "name": "Split Into Batches",
  "type": "n8n-nodes-base.splitInBatches",
  "parameters": {
    "batchSize": 10,
    "options": {}
  }
}
```

#### Node 11: Download File Content
```javascript
// Code Node: Prepare File Download
const file = $input.first().json;

// Determine how to fetch content based on mimeType
let exportMimeType = null;
let operation = 'download';

switch (file.mimeType) {
  case 'application/vnd.google-apps.document':
    exportMimeType = 'text/plain';
    operation = 'export';
    break;
  case 'application/vnd.google-apps.spreadsheet':
    exportMimeType = 'text/csv';
    operation = 'export';
    break;
  case 'application/vnd.google-apps.presentation':
    exportMimeType = 'text/plain';
    operation = 'export';
    break;
  case 'application/pdf':
  case 'text/plain':
  case 'text/markdown':
  case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
  default:
    operation = 'download';
    break;
}

return {
  json: {
    ...file,
    downloadOperation: operation,
    exportMimeType: exportMimeType
  }
};
```

#### Node 12: Google Drive Download/Export
```json
{
  "name": "Download File",
  "type": "n8n-nodes-base.googleDrive",
  "parameters": {
    "operation": "={{ $json.downloadOperation }}",
    "fileId": "={{ $json.id }}",
    "options": {
      "googleFileConversion": {
        "docsToFormat": "text/plain",
        "sheetsToFormat": "text/csv",
        "slidesToFormat": "text/plain"
      }
    }
  }
}
```

#### Node 13: Extract Text (Code Node)
```javascript
// Code Node: Extract Text Content
const file = $input.first().json;
const binaryData = $input.first().binary?.data;

let textContent = '';

if (binaryData) {
  // Handle binary content (PDF, DOCX, etc.)
  const buffer = Buffer.from(binaryData.data, 'base64');
  textContent = buffer.toString('utf-8');

  // For PDFs, you may need additional processing
  // Consider using a PDF extraction service or node
}

// Clean up text
textContent = textContent
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

return {
  json: {
    ...file,
    extractedText: textContent,
    textLength: textContent.length
  }
};
```

#### Node 14: LLM Classification
```json
{
  "name": "LLM Classification",
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "parameters": {
    "model": "gpt-4o-mini",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "You are a document classifier for a business intelligence system. Analyze documents and provide structured classification in JSON format."
        },
        {
          "role": "user",
          "content": "={{ $json.classificationPrompt }}"
        }
      ]
    },
    "options": {
      "temperature": 0.1,
      "responseFormat": "json_object"
    }
  }
}
```

#### Node 15: Prepare Classification Prompt (Code Node)
```javascript
// Code Node: Build Classification Prompt
const file = $input.first().json;
const content = file.extractedText || '';
const contentSample = content.substring(0, 4000);

const prompt = `
Analyze this document and provide classification.

FOLDER PATH: ${file.folderPath}
PARENT FOLDER: ${file.parentFolderName}
FILENAME: ${file.name}
FILE TYPE: ${file.mimeType}

CONTENT (first 4000 characters):
${contentSample}

Respond with a JSON object:
{
  "category": "strategy|financial|operational|people|customer|external|reference|other",
  "type": "specific_document_type",
  "sensitivity": "general|financial|hr_sensitive|confidential",
  "confidence": 0.0-1.0,
  "topics": ["array", "of", "key", "topics"],
  "entities": ["organizations", "people", "products"],
  "date_references": ["dates", "or", "time", "periods"],
  "summary": "One sentence summary",
  "search_keywords": ["additional", "search", "keywords"],
  "reasoning": "Brief explanation"
}

CLASSIFICATION RULES:
- "financial" sensitivity: Revenue, expenses, salaries, bank accounts, budgets, P&L
- "hr_sensitive": Employee reviews, compensation, disciplinary, personal info
- "confidential": Board materials, M&A, legal matters, unreleased strategies
- "general": Everything else

FOLDER HINTS (use as guidance, verify with content):
- /Financials/, /Finance/, /Budget/ → likely financial
- /HR/, /People/, /Team/ → likely people
- /Sales/, /Customers/, /CRM/ → likely customer
- /Meetings/, /Minutes/ → likely operational
- /Strategy/, /Planning/ → likely strategy
- /Projects/ → likely operational
`;

return {
  json: {
    ...file,
    classificationPrompt: prompt
  }
};
```

#### Node 16: Parse Classification (Code Node)
```javascript
// Code Node: Parse and Validate Classification
const file = $input.first().json;
const llmResponse = $('LLM Classification').first().json.message?.content;

let classification;
try {
  classification = JSON.parse(llmResponse);
} catch (e) {
  classification = {
    category: 'other',
    type: 'unclassified',
    sensitivity: 'general',
    confidence: 0.5,
    topics: [],
    entities: [],
    date_references: [],
    summary: 'Classification failed',
    search_keywords: [],
    reasoning: 'Failed to parse LLM response'
  };
}

// Validate and normalize
const validCategories = ['strategy', 'financial', 'operational', 'people', 'customer', 'external', 'reference', 'other'];
const validSensitivity = ['general', 'financial', 'hr_sensitive', 'confidential'];

const normalizedClassification = {
  category: validCategories.includes(classification.category) ? classification.category : 'other',
  type: classification.type || 'unclassified',
  sensitivity: validSensitivity.includes(classification.sensitivity) ? classification.sensitivity : 'general',
  confidence: Math.min(1, Math.max(0, classification.confidence || 0.5)),
  topics: Array.isArray(classification.topics) ? classification.topics.slice(0, 10) : [],
  entities: Array.isArray(classification.entities) ? classification.entities.slice(0, 10) : [],
  date_references: Array.isArray(classification.date_references) ? classification.date_references : [],
  summary: (classification.summary || '').substring(0, 500),
  search_keywords: Array.isArray(classification.search_keywords) ? classification.search_keywords.slice(0, 20) : [],
  reasoning: classification.reasoning || '',
  classified_at: new Date().toISOString(),
  classified_by: 'auto_llm',
  model: 'gpt-4o-mini'
};

return {
  json: {
    ...file,
    ai_classification: normalizedClassification,
    doc_category: normalizedClassification.category,
    doc_type: normalizedClassification.type,
    sensitivity_level: normalizedClassification.sensitivity
  }
};
```

#### Node 17: Chunk Document (Code Node)
```javascript
// Code Node: Split Document into Chunks
const file = $input.first().json;
const content = file.extractedText || '';

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

const chunks = [];
let startIndex = 0;
let chunkIndex = 0;

while (startIndex < content.length) {
  let endIndex = startIndex + CHUNK_SIZE;

  // Try to break at sentence boundary
  if (endIndex < content.length) {
    const lastPeriod = content.lastIndexOf('.', endIndex);
    const lastNewline = content.lastIndexOf('\n', endIndex);
    const breakPoint = Math.max(lastPeriod, lastNewline);

    if (breakPoint > startIndex + CHUNK_SIZE / 2) {
      endIndex = breakPoint + 1;
    }
  }

  const chunkContent = content.substring(startIndex, endIndex).trim();

  if (chunkContent.length > 0) {
    chunks.push({
      ...file,
      chunk_index: chunkIndex,
      content: chunkContent,
      chunk_start: startIndex,
      chunk_end: endIndex
    });
    chunkIndex++;
  }

  startIndex = endIndex - CHUNK_OVERLAP;
}

return chunks.map(chunk => ({ json: chunk }));
```

#### Node 18: Generate Embeddings
```json
{
  "name": "Generate Embeddings",
  "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
  "parameters": {
    "model": "text-embedding-3-small",
    "options": {}
  }
}
```

#### Node 19: Store in Supabase
```json
{
  "name": "Store Chunks",
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "upsert",
    "tableId": "document_chunks",
    "conflictTarget": "team_id,document_id,chunk_index",
    "fieldsToSend": {
      "team_id": "={{ $json.team_id }}",
      "document_id": "={{ $json.document_id }}",
      "chunk_index": "={{ $json.chunk_index }}",
      "content": "={{ $json.content }}",
      "embedding": "={{ $json.embedding }}",
      "doc_category": "={{ $json.doc_category }}",
      "doc_type": "={{ $json.doc_type }}",
      "sensitivity_level": "={{ $json.sensitivity_level }}",
      "ai_classification": "={{ $json.ai_classification }}",
      "file_name": "={{ $json.name }}",
      "file_path": "={{ $json.fullPath }}",
      "folder_path": "={{ $json.folderPath }}",
      "parent_folder_name": "={{ $json.parentFolderName }}",
      "google_file_id": "={{ $json.id }}",
      "mime_type": "={{ $json.mimeType }}",
      "file_size": "={{ $json.size }}",
      "file_modified_at": "={{ $json.modifiedTime }}",
      "classified_at": "={{ $json.ai_classification.classified_at }}",
      "classified_by": "={{ $json.ai_classification.classified_by }}",
      "classification_model": "={{ $json.ai_classification.model }}",
      "classification_confidence": "={{ $json.ai_classification.confidence }}",
      "sync_status": "active",
      "last_synced_at": "={{ new Date().toISOString() }}"
    }
  }
}
```

#### Node 20: Update Team Sync Stats
```json
{
  "name": "Update Sync Stats",
  "type": "n8n-nodes-base.supabase",
  "parameters": {
    "operation": "update",
    "tableId": "teams",
    "matchColumn": "id",
    "matchValue": "={{ $json.team_id }}",
    "fieldsToSend": {
      "sync_settings": "={{ JSON.stringify({ ...$json.sync_settings, last_full_sync: new Date().toISOString(), total_files_synced: $json.totalFiles, total_folders_scanned: $json.foldersScanned }) }}"
    }
  }
}
```

### 5.3 Deprecating Old Sync Workflows

After the unified workflow is tested and deployed:

1. **Disable** (don't delete) the old workflows:
   - `Astra - Strategy Document Sync`
   - `Astra - Financial Document Sync`
   - `Astra - Meeting Document Sync`
   - `Astra - Project Document Sync`

2. **Keep for 30 days** for potential rollback

3. **Archive/Delete** after successful migration validation

---

## 6. n8n Workflow Changes - Astra Intelligence Agent

### 6.1 Changes Overview

| Component | Current | Updated |
|-----------|---------|---------|
| Vector Store Nodes | 4 (Strategy, Financial, Meetings, Projects) | 1 (Unified) |
| OpenAI Embedding Nodes | 4 | 1 |
| Prompt Translator Output | Routes to multiple stores | Outputs `doc_categories[]` filter |
| Query Preprocessor | Sets topK per store | Sets single topK + filters |
| Access Control | Skip financial node | Pass `view_financial` to filter |

### 6.2 Updated Prompt Translator (Code Node)

```javascript
// Code Node: Enhanced Prompt Translator
const input = $input.first().json;
const chatInput = input.chatInput || '';
const viewFinancial = input.view_financial || false;
const viewHr = input.view_hr || false;

// Analyze query to determine relevant document categories
const categoryPatterns = {
  strategy: /\b(strategy|strategic|vision|roadmap|plan|competitive|market position|growth)\b/i,
  financial: /\b(financ|budget|revenue|expense|cost|p&l|profit|loss|income|balance sheet|cash flow|forecast)\b/i,
  operational: /\b(meeting|minutes|project|task|process|procedure|operational|operations)\b/i,
  people: /\b(hr|human resource|employee|staff|personnel|hiring|compensation|review|performance)\b/i,
  customer: /\b(customer|client|sales|crm|deal|pipeline|support|feedback|contract)\b/i,
  external: /\b(market research|industry|competitor|external|benchmark|trend)\b/i,
  reference: /\b(policy|handbook|template|guideline|standard|procedure)\b/i
};

const detectedCategories = [];
for (const [category, pattern] of Object.entries(categoryPatterns)) {
  if (pattern.test(chatInput)) {
    detectedCategories.push(category);
  }
}

// If no specific categories detected, search all
const categoriesToSearch = detectedCategories.length > 0 ? detectedCategories : null;

// Determine appropriate topK based on query complexity
let topK = 100;
if (chatInput.length > 200 || /\b(all|every|comprehensive|complete|full)\b/i.test(chatInput)) {
  topK = 200;
}
if (detectedCategories.length === 1) {
  topK = 150; // More results for focused queries
}

// Build filter object for Supabase Vector Store
const vectorFilter = {
  team_id: input.team_id,
  view_financial: viewFinancial,
  view_hr: viewHr,
  doc_categories: categoriesToSearch,
  // Can add doc_types, folder_path, etc. based on query analysis
};

return {
  json: {
    ...input,
    vectorFilter: vectorFilter,
    topK: topK,
    detectedCategories: detectedCategories,
    searchAllCategories: categoriesToSearch === null,
    translationAnalysis: {
      originalPrompt: chatInput,
      detectedCategories: detectedCategories,
      topK: topK,
      viewFinancial: viewFinancial,
      filterApplied: vectorFilter
    }
  }
};
```

### 6.3 Updated Supabase Vector Store Node

**Replace 4 Vector Store nodes with 1:**

```json
{
  "name": "Supabase Vector Store - Unified",
  "type": "@n8n/n8n-nodes-langchain.vectorStoreSupabase",
  "parameters": {
    "mode": "retrieve",
    "tableName": "document_chunks",
    "queryName": "match_documents",
    "topK": "={{ $json.topK }}",
    "filter": "={{ JSON.stringify($json.vectorFilter) }}"
  }
}
```

### 6.4 Updated Query Preprocessor (Code Node)

```javascript
// Code Node: Enhanced Query Preprocessor
const input = $input.first().json;

// Simplified preprocessing - no longer need to route to multiple stores
const preprocessed = {
  ...input,

  // Single unified query configuration
  queryConfig: {
    topK: input.topK || 100,
    filter: input.vectorFilter,
    minSimilarity: 0.3
  },

  // Query analysis flags
  queryFlags: {
    isFinancialQuery: input.detectedCategories?.includes('financial') || false,
    isHrQuery: input.detectedCategories?.includes('people') || false,
    isStrategyQuery: input.detectedCategories?.includes('strategy') || false,
    isMeetingQuery: input.detectedCategories?.includes('operational') || false,
    requiresWebSearch: /\b(current|latest|news|today|recent)\b/i.test(input.chatInput)
  },

  // Access control (passed through to vector store)
  accessControl: {
    view_financial: input.view_financial || false,
    view_hr: input.view_hr || false,
    view_confidential: input.view_confidential || false
  }
};

return { json: preprocessed };
```

### 6.5 Updated AI Agent System Prompt

```javascript
// Code Node: Build System Prompt
const input = $input.first().json;

const systemPrompt = `
You are Astra, an intelligent business analyst assistant for ${input.team_name}.

## Available Data Sources
You have access to a unified document store containing:
- Strategy documents (plans, roadmaps, competitive analysis)
- Financial documents (budgets, reports, forecasts) ${input.view_financial ? '✓ Access granted' : '✗ Access restricted'}
- Operational documents (meeting notes, project docs, processes)
- People/HR documents ${input.view_hr ? '✓ Access granted' : '✗ Access restricted'}
- Customer documents (sales, CRM, support)
- External research (market analysis, industry reports)
- Reference materials (policies, handbooks, templates)

## Query Context
- Categories searched: ${input.detectedCategories?.join(', ') || 'All categories'}
- Results limit: ${input.topK} chunks
- Financial access: ${input.view_financial ? 'Yes' : 'No'}

## Document Classification
Each document chunk includes AI-generated metadata:
- Category and type classification
- Topic tags for relevance matching
- Summary for quick context
- Entities mentioned (people, organizations, products)

## Response Guidelines
1. Cite specific documents by name and date when referencing information
2. If asked about financial data without access, explain the restriction
3. Use document summaries and topics to provide comprehensive answers
4. Cross-reference related documents across categories when relevant
5. Indicate confidence based on document relevance scores

## Current Date
${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;

return {
  json: {
    ...input,
    systemPrompt: systemPrompt
  }
};
```

### 6.6 Simplified Tool Configuration

Instead of 4 Vector Store tools, configure 1:

```javascript
// AI Agent Tool Configuration
const tools = [
  {
    name: "search_documents",
    description: "Search all team documents including strategy, financial, operational, people, customer, and reference documents. Results are filtered based on user access permissions. Use this tool to find relevant information from the team's document library.",
    type: "vectorStore",
    vectorStore: "Supabase Vector Store - Unified"
  },
  {
    name: "conversational_memory",
    description: "Retrieve context from recent conversations with this user.",
    type: "vectorStore",
    vectorStore: "Conversational Memory"
  }
  // ... other tools (web search, etc.)
];
```

---

## 7. LLM Classification System

### 7.1 Classification Prompt Template

```markdown
# Document Classification Prompt

You are a document classifier for a business intelligence system. Analyze the following document and provide structured classification.

## Input Context
- **Folder Path:** {{ folder_path }}
- **Parent Folder:** {{ parent_folder_name }}
- **Filename:** {{ file_name }}
- **File Type:** {{ mime_type }}
- **File Size:** {{ file_size }} bytes

## Document Content (first 4000 characters)
```
{{ content_sample }}
```

## Classification Requirements

Respond with a valid JSON object containing:

```json
{
  "category": "<category>",
  "type": "<specific_type>",
  "sensitivity": "<sensitivity_level>",
  "confidence": <0.0-1.0>,
  "topics": ["topic1", "topic2", "..."],
  "entities": ["entity1", "entity2", "..."],
  "date_references": ["date1", "date2", "..."],
  "summary": "<one_sentence_summary>",
  "search_keywords": ["keyword1", "keyword2", "..."],
  "reasoning": "<brief_explanation>"
}
```

## Category Definitions

| Category | Description | Examples |
|----------|-------------|----------|
| `strategy` | Vision, planning, competitive analysis | Strategic plans, roadmaps, SWOT analysis, market positioning |
| `financial` | Money, budgets, financial reports | Budgets, P&L statements, invoices, forecasts, tax documents |
| `operational` | Day-to-day operations | Meeting minutes, project docs, SOPs, process documentation |
| `people` | Human resources, personnel | Org charts, job descriptions, reviews, compensation, policies |
| `customer` | Customer-related | Sales reports, CRM exports, contracts, support tickets |
| `external` | External research | Market research, competitor analysis, industry reports |
| `reference` | Reference materials | Policies, handbooks, templates, guidelines |
| `other` | Doesn't fit above | Miscellaneous documents |

## Sensitivity Definitions

| Level | Description | Trigger Content |
|-------|-------------|-----------------|
| `general` | Anyone on team can view | No sensitive information |
| `financial` | Requires financial permission | Revenue, expenses, salaries, bank info, budgets |
| `hr_sensitive` | Requires HR permission | Employee reviews, compensation details, disciplinary |
| `confidential` | Restricted access | Board materials, M&A, legal, unreleased strategies |

## Folder Path Hints

Use folder names as classification hints, but verify with content:

| Folder Pattern | Suggested Category |
|----------------|-------------------|
| /Finance/, /Budget/, /Accounting/ | financial |
| /HR/, /People/, /Team/, /Personnel/ | people |
| /Sales/, /Customers/, /CRM/ | customer |
| /Meetings/, /Minutes/, /Notes/ | operational |
| /Strategy/, /Planning/, /Vision/ | strategy |
| /Projects/, /Initiatives/ | operational |
| /Research/, /Analysis/, /Market/ | external |
| /Policies/, /Handbook/, /Templates/ | reference |

## Important Rules

1. **Be conservative with sensitivity** - When uncertain, choose higher sensitivity
2. **Verify folder hints with content** - A file in /Finance/ about meeting agenda is `operational`, not `financial`
3. **Extract meaningful topics** - Focus on specific subjects, not generic terms
4. **Identify named entities** - Organizations, people, products, locations
5. **Note date references** - Explicit dates, quarters, years, relative dates
6. **Write actionable summaries** - What is this document about and why does it matter?
7. **Include search keywords** - Terms users might search for to find this document
```

### 7.2 Classification Model Selection

| Model | Cost per 1K tokens | Speed | Quality | Recommendation |
|-------|-------------------|-------|---------|----------------|
| GPT-4o-mini | $0.00015 / $0.0006 | Fast | Good | **Recommended** |
| Claude 3 Haiku | $0.00025 / $0.00125 | Fast | Good | Alternative |
| GPT-4o | $0.005 / $0.015 | Medium | Excellent | Overkill for classification |

**Estimated cost per document:** $0.001 - $0.003 (using GPT-4o-mini)

### 7.3 Classification Validation Rules

```javascript
// Classification validation and normalization
function validateClassification(classification) {
  const VALID_CATEGORIES = [
    'strategy', 'financial', 'operational', 'people',
    'customer', 'external', 'reference', 'other'
  ];

  const VALID_SENSITIVITY = [
    'general', 'financial', 'hr_sensitive', 'confidential'
  ];

  // Normalize category
  let category = (classification.category || '').toLowerCase();
  if (!VALID_CATEGORIES.includes(category)) {
    category = 'other';
  }

  // Normalize sensitivity
  let sensitivity = (classification.sensitivity || '').toLowerCase();
  if (!VALID_SENSITIVITY.includes(sensitivity)) {
    sensitivity = 'general';
  }

  // Auto-escalate sensitivity based on category
  if (category === 'financial' && sensitivity === 'general') {
    sensitivity = 'financial'; // Financial docs default to financial sensitivity
  }
  if (category === 'people' && sensitivity === 'general') {
    // Check for sensitive HR content
    const sensitivePatterns = /\b(salary|compensation|review|disciplinary|termination)\b/i;
    if (sensitivePatterns.test(classification.summary || '')) {
      sensitivity = 'hr_sensitive';
    }
  }

  return {
    category,
    type: (classification.type || 'unclassified').toLowerCase().replace(/\s+/g, '_'),
    sensitivity,
    confidence: Math.min(1, Math.max(0, parseFloat(classification.confidence) || 0.5)),
    topics: Array.isArray(classification.topics) ? classification.topics.slice(0, 10) : [],
    entities: Array.isArray(classification.entities) ? classification.entities.slice(0, 10) : [],
    date_references: Array.isArray(classification.date_references) ? classification.date_references : [],
    summary: String(classification.summary || '').substring(0, 500),
    search_keywords: Array.isArray(classification.search_keywords) ? classification.search_keywords.slice(0, 20) : [],
    reasoning: String(classification.reasoning || '').substring(0, 200)
  };
}
```

---

## 8. Data Migration Strategy

### 8.1 Migration Phases

```
Phase 1: Preparation (Week 1)
├── Deploy new database schema
├── Create new database functions
├── Test with empty data
└── Prepare migration scripts

Phase 2: Parallel Operation (Week 2-3)
├── Deploy unified sync workflow (disabled)
├── Enable for new teams only
├── Monitor and validate
└── Old workflows continue for existing teams

Phase 3: Data Migration (Week 3-4)
├── Migrate existing team data to new table
├── Re-classify documents with LLM
├── Validate data integrity
└── Update team settings

Phase 4: Cutover (Week 4-5)
├── Enable unified workflow for all teams
├── Disable old sync workflows
├── Update Astra Intelligence Agent
├── Monitor for issues

Phase 5: Cleanup (Week 6+)
├── Archive old workflows
├── Drop old tables (after 30-day retention)
├── Update documentation
└── Close migration project
```

### 8.2 Data Migration Script

```sql
-- Migration Script: Copy data from old tables to new unified table
-- Run this for each team after new schema is deployed

-- Step 1: Create a migration function
CREATE OR REPLACE FUNCTION migrate_team_documents(p_team_id UUID)
RETURNS TABLE (
    source_table TEXT,
    rows_migrated INTEGER,
    rows_failed INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_strategy_count INTEGER := 0;
    v_financial_count INTEGER := 0;
    v_meetings_count INTEGER := 0;
    v_projects_count INTEGER := 0;
BEGIN
    -- Migrate strategy documents
    INSERT INTO document_chunks (
        team_id, document_id, chunk_index, content, embedding,
        doc_category, doc_type, sensitivity_level,
        file_name, google_file_id, created_at, last_synced_at,
        ai_classification, classified_by
    )
    SELECT
        team_id, document_id, chunk_index, content, embedding,
        'strategy'::doc_category, 'migrated_strategy', 'general'::sensitivity_level,
        file_name, google_file_id, created_at, NOW(),
        jsonb_build_object(
            'category', 'strategy',
            'type', 'migrated_strategy',
            'sensitivity', 'general',
            'confidence', 0.5,
            'summary', 'Migrated from document_chunks_strategy',
            'migration_source', 'document_chunks_strategy',
            'requires_reclassification', true
        ),
        'migration_script'
    FROM document_chunks_strategy
    WHERE team_id = p_team_id
    ON CONFLICT (team_id, document_id, chunk_index) DO NOTHING;

    GET DIAGNOSTICS v_strategy_count = ROW_COUNT;

    -- Migrate financial documents
    INSERT INTO document_chunks (
        team_id, document_id, chunk_index, content, embedding,
        doc_category, doc_type, sensitivity_level,
        file_name, google_file_id, created_at, last_synced_at,
        ai_classification, classified_by
    )
    SELECT
        team_id, document_id, chunk_index, content, embedding,
        'financial'::doc_category, 'migrated_financial', 'financial'::sensitivity_level,
        file_name, google_file_id, created_at, NOW(),
        jsonb_build_object(
            'category', 'financial',
            'type', 'migrated_financial',
            'sensitivity', 'financial',
            'confidence', 0.5,
            'summary', 'Migrated from document_chunks_financial',
            'migration_source', 'document_chunks_financial',
            'requires_reclassification', true
        ),
        'migration_script'
    FROM document_chunks_financial
    WHERE team_id = p_team_id
    ON CONFLICT (team_id, document_id, chunk_index) DO NOTHING;

    GET DIAGNOSTICS v_financial_count = ROW_COUNT;

    -- Migrate meeting documents
    INSERT INTO document_chunks (
        team_id, document_id, chunk_index, content, embedding,
        doc_category, doc_type, sensitivity_level,
        file_name, google_file_id, created_at, last_synced_at,
        ai_classification, classified_by
    )
    SELECT
        team_id, document_id, chunk_index, content, embedding,
        'operational'::doc_category, 'migrated_meeting', 'general'::sensitivity_level,
        file_name, google_file_id, created_at, NOW(),
        jsonb_build_object(
            'category', 'operational',
            'type', 'migrated_meeting',
            'sensitivity', 'general',
            'confidence', 0.5,
            'summary', 'Migrated from document_chunks_meetings',
            'migration_source', 'document_chunks_meetings',
            'requires_reclassification', true
        ),
        'migration_script'
    FROM document_chunks_meetings
    WHERE team_id = p_team_id
    ON CONFLICT (team_id, document_id, chunk_index) DO NOTHING;

    GET DIAGNOSTICS v_meetings_count = ROW_COUNT;

    -- Migrate project documents
    INSERT INTO document_chunks (
        team_id, document_id, chunk_index, content, embedding,
        doc_category, doc_type, sensitivity_level,
        file_name, google_file_id, created_at, last_synced_at,
        ai_classification, classified_by
    )
    SELECT
        team_id, document_id, chunk_index, content, embedding,
        'operational'::doc_category, 'migrated_project', 'general'::sensitivity_level,
        file_name, google_file_id, created_at, NOW(),
        jsonb_build_object(
            'category', 'operational',
            'type', 'migrated_project',
            'sensitivity', 'general',
            'confidence', 0.5,
            'summary', 'Migrated from document_chunks_projects',
            'migration_source', 'document_chunks_projects',
            'requires_reclassification', true
        ),
        'migration_script'
    FROM document_chunks_projects
    WHERE team_id = p_team_id
    ON CONFLICT (team_id, document_id, chunk_index) DO NOTHING;

    GET DIAGNOSTICS v_projects_count = ROW_COUNT;

    -- Return results
    RETURN QUERY
    SELECT 'document_chunks_strategy'::TEXT, v_strategy_count, 0
    UNION ALL
    SELECT 'document_chunks_financial'::TEXT, v_financial_count, 0
    UNION ALL
    SELECT 'document_chunks_meetings'::TEXT, v_meetings_count, 0
    UNION ALL
    SELECT 'document_chunks_projects'::TEXT, v_projects_count, 0;
END;
$$;

-- Step 2: Run migration for all teams
DO $$
DECLARE
    team_record RECORD;
BEGIN
    FOR team_record IN SELECT id, name FROM teams LOOP
        RAISE NOTICE 'Migrating team: % (%)', team_record.name, team_record.id;
        PERFORM migrate_team_documents(team_record.id);
    END LOOP;
END;
$$;
```

### 8.3 Post-Migration Re-classification Workflow

Create a separate n8n workflow to re-classify migrated documents:

```javascript
// Workflow: Re-classify Migrated Documents
// Trigger: Manual or scheduled
// Purpose: Add proper LLM classification to migrated documents

// Step 1: Fetch documents needing reclassification
const query = `
  SELECT DISTINCT ON (document_id)
    id, document_id, team_id, content, file_name, folder_path
  FROM document_chunks
  WHERE ai_classification->>'requires_reclassification' = 'true'
  LIMIT 100
`;

// Step 2: For each document, run LLM classification
// Step 3: Update all chunks for that document with new classification
// Step 4: Remove 'requires_reclassification' flag
```

---

## 9. Testing Plan

### 9.1 Unit Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Folder traversal - depth 1 | Sync folder with no subfolders | All files discovered |
| Folder traversal - depth 5 | Sync folder with nested subfolders | All files in all subfolders discovered |
| Folder traversal - max depth | Sync folder exceeding max_depth | Stops at configured depth |
| Folder exclusion | Sync folder with excluded subfolder | Excluded folder skipped |
| File filtering | Sync folder with .tmp files | Temp files excluded |
| LLM classification - financial | Classify budget document | Category: financial, Sensitivity: financial |
| LLM classification - strategy | Classify roadmap document | Category: strategy, Sensitivity: general |
| Access control - denied | Query with view_financial=false | No financial docs returned |
| Access control - granted | Query with view_financial=true | Financial docs included |
| Vector search - single category | Search strategy only | Only strategy docs returned |
| Vector search - all categories | Search without filter | All accessible docs returned |

### 9.2 Integration Tests

| Test Case | Components | Expected Result |
|-----------|------------|-----------------|
| End-to-end sync | Drive → Sync Workflow → Supabase | Documents stored with classification |
| End-to-end query | User Query → Astra Agent → Response | Relevant documents cited |
| Incremental sync | Modified file → Sync | Only changed file processed |
| Deleted file handling | Delete from Drive → Sync | Document marked as deleted |
| Permission change | Grant financial access → Query | Financial docs now visible |

### 9.3 Performance Tests

| Test Case | Metric | Target |
|-----------|--------|--------|
| Folder traversal (100 files) | Time to discover | < 10 seconds |
| Folder traversal (1000 files) | Time to discover | < 60 seconds |
| Document classification | Time per document | < 3 seconds |
| Vector search (100K chunks) | Query latency | < 500ms |
| Full sync (100 documents) | Total time | < 10 minutes |

---

## 10. Rollback Plan

### 10.1 Rollback Triggers

- Migration causes data loss
- Search quality significantly degraded
- Sync failures exceed 10% of documents
- Performance degradation > 2x baseline
- Critical bugs in production

### 10.2 Rollback Steps

```
Step 1: Immediate (< 1 hour)
├── Disable unified sync workflow
├── Re-enable old sync workflows
├── Revert Astra Agent to use old vector stores
└── Notify affected users

Step 2: Data Recovery (1-4 hours)
├── Verify old tables still have data
├── If data loss: Restore from backup
├── Validate data integrity
└── Resume old sync workflows

Step 3: Post-Mortem (24-48 hours)
├── Identify root cause
├── Document lessons learned
├── Plan corrective actions
└── Schedule retry with fixes
```

### 10.3 Data Preservation

```sql
-- Before migration, create backup tables
CREATE TABLE document_chunks_strategy_backup AS
SELECT * FROM document_chunks_strategy;

CREATE TABLE document_chunks_financial_backup AS
SELECT * FROM document_chunks_financial;

CREATE TABLE document_chunks_meetings_backup AS
SELECT * FROM document_chunks_meetings;

CREATE TABLE document_chunks_projects_backup AS
SELECT * FROM document_chunks_projects;

-- Keep backup tables for 30 days after migration
-- Set reminder to drop after validation period
```

---

## 11. Implementation Phases

### Phase 1: Database Foundation (Days 1-3)

**Tasks:**
- [ ] Create new `document_chunks` table with full schema
- [ ] Create `doc_category` and `sensitivity_level` enums
- [ ] Create `match_documents` function for vector search
- [ ] Create `search_documents` function for advanced search
- [ ] Create `get_document_stats` function
- [ ] Create `mark_deleted_documents` function
- [ ] Add indexes for performance
- [ ] Enable Row Level Security
- [ ] Test functions with sample data

**Deliverables:**
- SQL migration script
- Function test results
- Performance baseline

### Phase 2: Sync Workflow Development (Days 4-8)

**Tasks:**
- [ ] Create unified sync workflow skeleton
- [ ] Implement recursive folder traversal logic
- [ ] Implement file filtering (exclusions, patterns)
- [ ] Implement incremental sync (changed files only)
- [ ] Integrate Google Drive API calls
- [ ] Implement document extraction (PDF, Docs, etc.)
- [ ] Integrate LLM classification node
- [ ] Implement chunking logic
- [ ] Integrate embedding generation
- [ ] Implement Supabase upsert
- [ ] Add error handling and logging
- [ ] Test with sample folder

**Deliverables:**
- Working unified sync workflow
- Test results with sample data
- Documentation of workflow nodes

### Phase 3: Astra Agent Updates (Days 9-11)

**Tasks:**
- [ ] Update Prompt Translator for unified store
- [ ] Remove 3 Vector Store nodes, keep 1
- [ ] Update vector filter configuration
- [ ] Update Query Preprocessor
- [ ] Update AI Agent system prompt
- [ ] Update tool descriptions
- [ ] Test search quality
- [ ] Test access control

**Deliverables:**
- Updated Astra Intelligence Agent workflow
- Search quality comparison report
- Access control test results

### Phase 4: Frontend Updates (Days 12-15)

**Tasks:**
- [ ] Update OAuth flow for `drive` scope
- [ ] Implement folder picker component
- [ ] Update sync settings page
- [ ] Implement document statistics component
- [ ] Add migration notice for existing users
- [ ] Update team settings API
- [ ] Test folder selection flow
- [ ] Test sync status display

**Deliverables:**
- Updated frontend components
- User flow documentation
- UI test results

### Phase 5: Migration & Testing (Days 16-20)

**Tasks:**
- [ ] Create data migration scripts
- [ ] Run migration on test environment
- [ ] Validate migrated data
- [ ] Run full integration tests
- [ ] Run performance tests
- [ ] Create re-classification workflow
- [ ] Document rollback procedures
- [ ] Prepare user communication

**Deliverables:**
- Migration scripts
- Test reports
- Rollback documentation
- User communication drafts

### Phase 6: Production Deployment (Days 21-25)

**Tasks:**
- [ ] Deploy database changes to production
- [ ] Deploy sync workflow (disabled)
- [ ] Enable for beta users
- [ ] Monitor and validate
- [ ] Migrate existing team data
- [ ] Enable for all users
- [ ] Disable old workflows
- [ ] Monitor for 72 hours

**Deliverables:**
- Production deployment checklist
- Monitoring dashboard
- Incident response plan

### Phase 7: Cleanup & Documentation (Days 26-30)

**Tasks:**
- [ ] Archive old workflows
- [ ] Schedule old table deletion
- [ ] Update user documentation
- [ ] Update developer documentation
- [ ] Conduct team knowledge transfer
- [ ] Close migration project

**Deliverables:**
- Updated documentation
- Knowledge transfer sessions
- Project closure report

---

## Appendix A: File Type Support

| File Type | MIME Type | Extraction Method |
|-----------|-----------|-------------------|
| Google Docs | application/vnd.google-apps.document | Export as text/plain |
| Google Sheets | application/vnd.google-apps.spreadsheet | Export as text/csv |
| Google Slides | application/vnd.google-apps.presentation | Export as text/plain |
| PDF | application/pdf | PDF extraction library |
| Word (.docx) | application/vnd.openxmlformats-officedocument.wordprocessingml.document | DOCX parser |
| Excel (.xlsx) | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | XLSX parser |
| Plain Text | text/plain | Direct read |
| Markdown | text/markdown | Direct read |
| CSV | text/csv | Direct read |

## Appendix B: Classification Examples

| Document | Expected Classification |
|----------|------------------------|
| "2024 Annual Budget.xlsx" | category: financial, type: annual_budget, sensitivity: financial |
| "Q1 Sales Report.pdf" | category: customer, type: sales_report, sensitivity: general |
| "Employee Handbook.docx" | category: reference, type: employee_handbook, sensitivity: general |
| "Board Meeting Minutes.docx" | category: operational, type: board_minutes, sensitivity: confidential |
| "Compensation Review - John.xlsx" | category: people, type: compensation_review, sensitivity: hr_sensitive |
| "Market Analysis 2025.pdf" | category: external, type: market_research, sensitivity: general |
| "Strategic Plan 2025-2027.docx" | category: strategy, type: strategic_plan, sensitivity: general |

## Appendix C: Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| SYNC_001 | Google Drive authentication failed | Re-authenticate OAuth |
| SYNC_002 | Folder not found | Verify folder ID in settings |
| SYNC_003 | Rate limit exceeded | Wait and retry |
| SYNC_004 | File extraction failed | Check file format support |
| SYNC_005 | Classification failed | Use default classification |
| SYNC_006 | Embedding generation failed | Retry with backoff |
| SYNC_007 | Database write failed | Check connection, retry |
| QUERY_001 | Vector search timeout | Reduce topK, add filters |
| QUERY_002 | Access denied | Check user permissions |

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | December 14, 2025 |
| Author | Astra Development Team |
| Status | Draft |
| Last Updated | December 14, 2025 |

---

*End of Migration Plan Document*
