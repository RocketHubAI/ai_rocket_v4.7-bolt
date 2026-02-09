# Google Drive Sync Webhooks Guide

## Overview

The application now uses **two different sync workflows** optimized for different scenarios:

## 1. Incremental Sync (Lightweight)

**Webhook:** `GET https://healthrocket.app.n8n.cloud/webhook/incremental-sync-trigger`

**When to Use:**
- "Sync Now" button in User Settings
- Quick sync of new/modified files only
- Regular user-initiated syncs

**How it Works:**
- No payload required
- Queries database for all active connections
- Only processes files modified since last checkpoint
- Returns immediately with "Workflow got started"
- Processes in background (1-2 minutes)

**Benefits:**
- Very lightweight - only syncs NEW files
- Single webhook call handles all connections
- Prevents execution queue buildup
- Fast and efficient

**Code Location:**
- `src/lib/manual-folder-sync.ts` - `triggerIncrementalSync()`
- `src/components/GoogleDriveSettings.tsx` - "Sync Now" button

---

## 2. Manual Full Sync (Heavy)

**Webhook:** `POST https://healthrocket.app.n8n.cloud/webhook/manual-folder-sync`

**When to Use:**
- Initial Google Drive connection setup
- User reports missing documents
- Full re-sync needed

**How it Works:**
- Requires payload with team_id, user_id, folder_id, folder_type, access_token
- Processes ALL files in the folder
- Called once per folder type (up to 4 calls per user)
- Takes 1-2 minutes per folder

**Required Payload:**
```typescript
{
  team_id: string;
  user_id: string;
  folder_id: string;
  folder_type: 'strategy' | 'meetings' | 'financial' | 'projects';
  access_token: string;
}
```

**Code Location:**
- `src/lib/manual-folder-sync.ts` - `syncAllFolders()`, `triggerManualFolderSync()`
- `src/components/setup-steps/SyncDataStep.tsx` - Initial setup flow

---

## Why This Matters

### Previous Issue:
- "Sync Now" was calling the full sync for each folder (4 calls per user)
- If 5 users clicked sync simultaneously: 5 × 4 = 20 concurrent executions
- Hit n8n's 20 concurrent execution limit
- Syncs would queue and potentially never process

### Current Solution:
- "Sync Now" uses incremental sync (1 call total, handles all connections)
- Only syncs new/modified files since last checkpoint
- Much lighter weight and faster
- Prevents execution queue buildup

---

## Scheduled Sync

**Frequency:** Every 15 minutes (automatic)

**Type:** Incremental Sync

**What it Does:**
- Automatically checks for new/modified files
- Syncs changes across all active connections
- No user interaction needed

---

## Summary

| Scenario | Webhook | Files Processed | Calls |
|----------|---------|-----------------|-------|
| User clicks "Sync Now" | Incremental | New/modified only | 1 |
| Initial setup | Manual Full | All files | 4 per user |
| Automatic (every 15 min) | Incremental | New/modified only | 1 |
| User reports missing docs | Manual Full | All files | 4 per user |
