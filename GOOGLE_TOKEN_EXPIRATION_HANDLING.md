# Google Token Expiration Handling - Complete Solution

## Problem Summary

Users were experiencing a confusing "No Documents Found" error during the Launch Prep sync flow when their Google Drive tokens had expired. The system had automatic token refresh in place, but when the **refresh token itself became invalid**, users needed to reconnect their Google account.

## Root Cause

Google OAuth refresh tokens can become invalid when:
- User revokes access in their Google Account settings
- Refresh token expires (6 months of inactivity for unverified apps)
- OAuth consent screen configuration changes
- Google detects security issues

When this happens, the automatic cron job (which runs every 30 minutes) attempts to refresh the token, receives an `invalid_grant` error from Google, and correctly marks the connection as:
- `is_active: false`
- `connection_status: 'token_expired'`

However, the sync flow was not detecting this gracefully and showed a confusing error message.

## Solution Implemented

### 1. Token Expiration Detection (manual-folder-sync.ts)

Added logic to detect expired tokens BEFORE attempting to sync:

```typescript
// Check for expired/inactive connection
let { data: expiredConnection } = await supabase
  .from('user_drive_connections')
  .select('connection_status, is_active')
  .eq('user_id', userId)
  .eq('is_active', false)
  .maybeSingle();

// If there's an expired connection, throw specific error
if (expiredConnection?.connection_status === 'token_expired') {
  throw new Error('GOOGLE_TOKEN_EXPIRED');
}
```

This ensures we detect the problem early and throw a specific error code that can be handled gracefully in the UI.

### 2. User-Facing Error Handling (SyncDataStep.tsx)

Updated the Launch Prep sync flow to catch the token expiration error and show the reconnect modal:

```typescript
catch (error) {
  // Check if the error is due to expired Google token
  if (error instanceof Error && error.message === 'GOOGLE_TOKEN_EXPIRED') {
    setSyncing(false);
    setShowTokenExpiredModal(true);
    return;
  }
}
```

The `OAuthReconnectModal` provides clear instructions to the user:
- Explains why they need to reconnect
- Shows what new features require the reconnection
- Provides a one-click reconnect button
- Reassures them that their data is safe

### 3. Settings Page Handling (GoogleDriveSettings.tsx)

Updated the manual sync and folder save flows to show clear error messages:

```typescript
if (error instanceof Error && error.message === 'GOOGLE_TOKEN_EXPIRED') {
  setSyncResult({
    success: false,
    message: 'Your Google Drive connection has expired. Please reconnect your account.',
  });
  loadConnection(); // Refreshes UI to show reconnect button
}
```

## How the System Works Now

### Automatic Token Refresh (Background)

1. **Cron job runs every 30 minutes** via `refresh-google-tokens` edge function
2. Queries for tokens expiring in the next 45 minutes
3. Attempts to refresh them using the `refresh_token`
4. If refresh succeeds: Updates `access_token` and `token_expires_at`
5. If refresh fails with `invalid_grant`: Marks connection as `token_expired` and `is_active: false`

### User-Initiated Sync (Foreground)

1. User triggers a sync (Launch Prep, Settings, etc.)
2. System checks for expired connections FIRST
3. If token is expired: Shows reconnect modal immediately
4. If token is valid: Proceeds with sync
5. If token expires during sync: Shows reconnect modal

### Reconnection Flow

1. User clicks "Reconnect" in modal
2. Initiates Google OAuth with `access_type=offline` and `prompt=consent`
3. Google consent screen appears
4. User approves permissions
5. New tokens (including new `refresh_token`) are stored
6. Connection is reactivated with `is_active: true` and `connection_status: 'connected'`
7. User can immediately retry their sync

## Why Users Must Reconnect

**There is no way around requiring user reconnection when the refresh token is invalid.** This is by design in OAuth 2.0:

- Access tokens expire after ~1 hour
- Refresh tokens are used to get new access tokens
- When a refresh token is invalid, only the user can authorize the app again
- The automatic cron job can ONLY refresh tokens when the refresh token is valid

## What Changed for Users

### Before:
- Token expires → User tries to sync → "No Documents Found" (confusing)
- User doesn't know what went wrong
- User might add files thinking that's the problem

### After:
- Token expires → User tries to sync → Clear "Reconnect Google Drive" modal
- User knows exactly what to do
- One-click reconnection process
- Data is preserved, no files lost

## Testing the Flow

To test token expiration handling:

1. Manually set a connection to expired in the database:
```sql
UPDATE user_drive_connections
SET is_active = false, connection_status = 'token_expired'
WHERE user_id = 'USER_ID_HERE';
```

2. Try to sync documents in Launch Prep
3. Should see the OAuthReconnectModal immediately
4. Click reconnect and authorize
5. Sync should work after reconnection

## Monitoring

To check if users are experiencing token expiration issues:

```sql
-- Count expired connections
SELECT COUNT(*)
FROM user_drive_connections
WHERE is_active = false
AND connection_status = 'token_expired';

-- See which users need to reconnect
SELECT user_id, team_id, updated_at
FROM user_drive_connections
WHERE is_active = false
AND connection_status = 'token_expired'
ORDER BY updated_at DESC;
```

## Future Improvements

1. **Proactive Notifications**: Send email/in-app notification when token expires (before user tries to sync)
2. **Token Health Dashboard**: Admin view of token expiration across all users
3. **Automatic Retry**: After reconnection, automatically retry the failed sync operation
4. **Better Logging**: Track token refresh success/failure rates in metrics

## Related Files

- `/src/lib/manual-folder-sync.ts` - Token expiration detection
- `/src/components/setup-steps/SyncDataStep.tsx` - Launch Prep error handling
- `/src/components/GoogleDriveSettings.tsx` - Settings page error handling
- `/supabase/functions/refresh-google-tokens/index.ts` - Automatic refresh cron job
- `/supabase/functions/google-drive-refresh-token/index.ts` - User-initiated refresh
- `/src/components/OAuthReconnectModal.tsx` - Reconnection UI
- `/src/hooks/useOAuthReconnectPrompt.ts` - Reconnection prompt hook

---

## OAuth Scope Upgrade System

When we add new OAuth scopes (like Google Sheets API), existing user tokens don't have the new permissions. The system automatically prompts users to reconnect.

### How It Works

1. **Database Tracking:**
   - `scope_version` column in `user_drive_connections` tracks OAuth version
   - Version 1: Original scopes (Drive, Docs)
   - Version 2: All original scopes + Google Sheets

2. **Automatic Modal:**
   - `useOAuthReconnectPrompt` hook checks if user needs to reconnect
   - Modal shows automatically after 2-second delay for users with `scope_version < 2`
   - Users can dismiss for 24 hours (stored in localStorage)

3. **Settings Page Banner:**
   - Yellow warning banner visible in Google Drive Settings
   - Shows when `needsScopeUpgrade` is true
   - Clear explanation and reconnect button

### Modal Appearance Criteria

```typescript
// Modal shows when ALL conditions are met:
- User has active Google Drive connection
- scope_version < 2 (current required version)
- No dismissal in last 24 hours (or never dismissed)
- User has been logged in for 2 seconds
```

### Adding Future Scopes

1. Update `SCOPES` array in `google-drive-oauth.ts`
2. Increment `required_version` in migration to 3
3. Update `scope_version: 3` in OAuth exchange function
4. Update modal text to explain new features
5. Mark all existing connections as old version

### Monitoring Reconnection Progress

```sql
-- Check how many users need upgrade
SELECT
    COUNT(*) as total_connections,
    SUM(CASE WHEN scope_version < 2 THEN 1 ELSE 0 END) as needs_upgrade,
    SUM(CASE WHEN scope_version >= 2 THEN 1 ELSE 0 END) as upgraded
FROM user_drive_connections
WHERE is_active = true;

-- Track reconnection rate over time
SELECT
    DATE(updated_at) as date,
    COUNT(*) as reconnections
FROM user_drive_connections
WHERE scope_version = 2
  AND updated_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(updated_at)
ORDER BY date DESC;
```

---

## Key Takeaway

The automatic token refresh system IS working correctly. When it detects an invalid refresh token, the ONLY solution is to ask the user to reconnect. The fix ensures this is communicated clearly to users instead of showing a confusing error message.

**Last Updated:** 2024-12-14
