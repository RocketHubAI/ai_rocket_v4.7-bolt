# Gmail Email Vectorization Setup Guide

## Overview
This feature allows Astra to sync and vectorize Gmail emails for AI-powered search and insights.

## Key Features

- **Automatic Token Refresh**: Gmail OAuth tokens are refreshed automatically in the background every 5 minutes, ensuring n8n workflows always have valid credentials
- **User-Friendly UI**: Clean consent and progress screens guide users through email sync
- **Real-Time Updates**: Settings page updates automatically when tokens are refreshed
- **Background Processing**: Email sync happens via n8n webhook, allowing users to continue using the app

## Prerequisites

1. **Gmail OAuth Setup** (already configured)
   - Google OAuth client ID and secret
   - OAuth redirect URI configured
   - Gmail API scopes enabled

2. **n8n Webhook Endpoint**
   - Webhook URL: `https://healthrocket.app.n8n.cloud/webhook/gmail-full-sync`
   - Backend workflow handles email fetching, vectorization, and storage
   - Automatic sync runs every 15 minutes

3. **Database Tables**
   - `gmail_auth` - OAuth tokens and connection status
   - `company_emails` - Vectorized emails with embeddings

4. **Automatic Token Refresh Service**
   - Runs globally when user is logged in
   - Checks token expiration every 5 minutes
   - Automatically refreshes expired tokens
   - No user interaction required

## Environment Variables

Add to your `.env` file:

```bash
# Gmail Email Vectorization
VITE_N8N_GMAIL_SYNC_WEBHOOK=https://healthrocket.app.n8n.cloud/webhook/gmail-full-sync
```

## Webhook Response Format

The n8n webhook should return a JSON response with the following structure:

### For Async/Background Processing with Batch Details (Recommended)
```json
{
  "success": true,
  "status": "partial_success",
  "message": "Email sync started with 86/168 batches triggered successfully.",
  "sync_details": {
    "user_id": "user-uuid",
    "sync_type": "initial_full_sync",
    "total_batches": 168,
    "batches_triggered": 86,
    "batches_failed": 82,
    "estimated_completion_minutes": 70
  },
  "next_steps": {
    "info": "Email processing is happening in the background. Your emails will be available soon.",
    "estimated_completion": "Approximately 70 minutes"
  }
}
```

### For Simple Background Processing
```json
{
  "success": true,
  "status": "processing",
  "message": "Email sync has started. Processing emails in the background."
}
```

### For Immediate Completion (Legacy)
```json
{
  "success": true,
  "status": "complete",
  "metrics": {
    "emails_processed": 150,
    "emails_stored": 150,
    "sync_duration_ms": 45000
  }
}
```

### For Errors
```json
{
  "success": false,
  "error": "Failed to fetch emails: Invalid token"
}
```

**UI Behavior:**
- **partial_success/processing status**: Shows "Email Sync Started!" screen with batch details and estimated completion time, user can immediately dismiss
- **Complete status**: Shows "Email Sync Complete!" with email count, auto-dismisses after 3 seconds
- **Error**: Shows error message with retry option

**Technical Details:**
- Webhook timeout: 5 minutes (extended from default 2 minutes)
- Long-running operations will not cause UI errors
- User can check Settings → Gmail Integration for real-time progress

## User Flow

### 1. OAuth Connection
- User clicks "Connect Gmail" in Settings
- Redirected to Google OAuth consent screen
- After authorization, redirected back to app

### 2. Post-OAuth Consent Screen
- **Automatic**: Shows immediately after successful OAuth
- Explains what will happen (full email sync)
- Two options:
  - "Proceed with Sync" - starts initial sync
  - "Skip for Now" - saves connection, user can sync later

### 3. Initial Sync Process
- Shows progress screen with animated loading state
- Displays "Status: In Progress" (no estimated time)
- Calls n8n webhook with user ID
- User can immediately dismiss and continue using app
- Background process:
  - Fetches all emails from Gmail
  - Generates embeddings using OpenAI
  - Stores in `company_emails` table
- **In-app notification when sync completes** (>= 10 emails synced)
  - Notification appears in bell icon
  - Clicking notification opens Settings page to view sync status
  - Shows total email count in notification

### 4. Ongoing Sync
- Automatic sync every 15 minutes (n8n workflow)
- Only syncs new emails since last sync
- No user interaction needed

## Features Implemented

### Components

#### `GmailSyncConsentModal`
- Full-screen modal after OAuth success
- Clear explanation of sync process
- Privacy and security messaging
- Proceed or skip options

#### `GmailSyncProgressScreen`
- Loading animation during sync
- Shows "Status: In Progress" without time estimates
- Success/error handling
- "Continue Using App" button (sync continues in background)
- Informs user they'll receive a notification when complete

#### Updated `GmailCallback`
- Shows consent modal after OAuth
- Manages sync flow
- Handles errors gracefully

#### Updated `GmailSettings`
- Connection status card
- Email count and last sync date
- "Sync Emails" button (manual trigger)
- "Disconnect" button with confirmation
- Auto-sync notification (15 minutes)

### Custom Hooks

#### `useGmailSync`
- Manages Gmail sync state
- Provides `triggerSync()` function
- Tracks email count and last sync
- **Detects sync completion** and creates in-app notification
  - Triggers when email count reaches >= 10 emails
  - Creates notification in `astra_notifications` table
  - Only notifies once per user using localStorage
  - Notification action opens Settings modal
- Error handling and state management

#### `useGmailTokenRefresh`
- **NEW**: Automatic token refresh service
- Runs globally in App.tsx when user is logged in
- Checks token expiration every 5 minutes
- Automatically refreshes expired tokens without user interaction
- Ensures n8n workflows always have valid credentials
- Logs all refresh operations to console for debugging

### Token Refresh Behavior

**How it works:**
1. Service starts when user logs in (runs in `App.tsx`)
2. Checks Gmail token expiration every 5 minutes
3. If token is expired or will expire within 5 minutes, automatically refreshes
4. Updates `gmail_auth` table with new token and expiration time
5. Settings page receives real-time update via Supabase subscription
6. No user interaction or page visit required

**Benefits:**
- n8n workflows never fail due to expired tokens
- Users don't need to visit Settings page to keep token active
- Seamless background operation
- Real-time UI updates when tokens change

## Database Schema

### `company_emails` Table
```sql
- id (uuid)
- user_id (uuid, references auth.users)
- subject (text)
- sender_email (text)
- sender_name (text)
- email_date (timestamptz)
- email_category (text)
- gmail_labels (text[])
- content (text)
- thread_id (text)
- message_id (text, unique per user)
- has_attachments (boolean)
- attachment_names (text[])
- embedding (vector(1536))
- created_at, updated_at
```

### Security
- Row Level Security (RLS) enabled
- Users can only access their own emails
- Policies for SELECT, INSERT, UPDATE, DELETE

### Semantic Search Function
```sql
search_company_emails(
  query_embedding vector(1536),
  p_user_id uuid,
  p_limit int DEFAULT 10
)
```

## n8n Webhook Expected Payload

```json
{
  "user_id": "uuid",
  "timestamp": "ISO 8601 timestamp"
}
```

## n8n Webhook Expected Response

```json
{
  "success": true,
  "metrics": {
    "emails_processed": 150,
    "emails_stored": 150,
    "sync_duration_ms": 45000
  }
}
```

## Error Handling

### Common Errors
1. **Webhook not configured**: Check `VITE_N8N_GMAIL_SYNC_WEBHOOK`
2. **OAuth expired**: "Refresh Token" button appears automatically
3. **Sync failed**: Shows error message with retry option
4. **No emails found**: Still counts as successful sync

### User Notifications
- Success: Toast notification with email count
- Error: Alert with actionable message
- Progress: Real-time loading states

## Testing Checklist

- [ ] OAuth redirect shows consent modal
- [ ] "Proceed with Sync" triggers webhook successfully
- [ ] "Skip for Now" closes modal without syncing
- [ ] Sync progress screen shows during sync
- [ ] Success notification appears after sync
- [ ] Email count displays in Settings
- [ ] "Sync Emails" button works for manual sync
- [ ] "Disconnect" shows confirmation dialog
- [ ] Auto-sync indicator displays correctly
- [ ] Mobile responsive design works

## Future Enhancements

1. **Email Search UI**: Dedicated search interface
2. **Astra Integration**: Show email sources in chat responses
3. **Category Filtering**: Filter by email category
4. **Date Range Filters**: Search within date ranges
5. **Sync History**: Log of all sync operations
6. **Email Preview**: Modal to view full email content
7. **Analytics Dashboard**: Email volume charts, top senders

## Privacy & Security

- All emails are private to each user (RLS enforced)
- OAuth tokens encrypted in database
- Embeddings generated securely via n8n
- User can disconnect and delete data anytime
- No data shared between users

## Support

For issues or questions:
1. Check n8n webhook logs
2. Verify environment variables
3. Check Supabase RLS policies
4. Review browser console for errors

---

**Last Updated**: 2025-10-21
**Version**: 1.0.0
