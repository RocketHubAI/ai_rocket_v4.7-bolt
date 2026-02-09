# Google Token Auto-Refresh System

## Overview
This system automatically refreshes Google OAuth tokens (Gmail and Drive) **every 30 minutes**, ensuring that n8n workflows always have valid access tokens even when users are not actively using the application.

---

## Architecture

### 1. Database Tables
- **`gmail_auth`** - Stores Gmail OAuth credentials
  - `access_token` - Current access token
  - `refresh_token` - Refresh token (never expires)
  - `expires_at` - Token expiration timestamp
  - `is_active` - Connection status

- **`user_drive_connections`** - Stores Google Drive OAuth credentials
  - `access_token` - Current access token
  - `refresh_token` - Refresh token (never expires)
  - `token_expires_at` - Token expiration timestamp
  - `is_active` - Connection status
  - `connection_status` - 'connected', 'token_expired', etc.

### 2. Edge Function: `refresh-google-tokens`
**Location:** `supabase/functions/refresh-google-tokens/`

**Purpose:** Batch refresh all expiring tokens

**Process:**
1. Query for tokens expiring in the next 45 minutes
2. Use `refresh_token` to get new `access_token` from Google
3. Update database with new tokens and expiry times
4. Mark connections as inactive if refresh fails

**Triggers:**
- pg_cron job every 30 minutes
- Can be manually triggered if needed

### 3. pg_cron Job
**Name:** `refresh-google-tokens-every-30min`

**Schedule:** `*/30 * * * *` (every 30 minutes)

**Action:** Calls the `refresh-google-tokens` edge function via HTTP POST

---

## How It Works

### Timeline Example:
```
00:00 - Token created (expires at 01:00)
00:15 - Cron job runs (token still valid, no action)
00:30 - Cron job runs (token expires in 30 min, REFRESHES)
00:30 - New token created (expires at 01:30)
01:00 - Cron job runs (token still valid, no action)
01:15 - Cron job runs (token expires in 15 min, REFRESHES)
01:15 - New token created (expires at 02:15)
```

**Key Points:**
- Tokens are refreshed **before** they expire (45-minute threshold)
- Multiple safety windows ensure tokens never expire during workflows
- Failed refreshes mark connections as inactive (user must reconnect)

---

## For n8n Workflows

### ✅ SIMPLIFIED APPROACH

**Node 1: Get Google Connections from Database**
```sql
-- For Gmail
SELECT user_id, access_token, expires_at, email
FROM gmail_auth
WHERE is_active = true;

-- For Google Drive
SELECT user_id, access_token, token_expires_at, google_account_email
FROM user_drive_connections
WHERE is_active = true AND connection_status = 'connected';
```

**Node 2: Use Access Token Directly**
- No need to call refresh endpoint
- Token from database is always fresh (refreshed every 30 min)
- Use in HTTP Request headers: `Authorization: Bearer {{ access_token }}`

### ❌ NO LONGER NEEDED
- ~~Manual token refresh nodes in workflows~~
- ~~Token expiry checking in n8n~~
- ~~Complex refresh logic~~

---

## Benefits

1. **Always Fresh Tokens** - Refreshed every 30 minutes automatically
2. **No User Action Required** - Works even when users are offline
3. **Simplified Workflows** - n8n just reads from database
4. **Error Handling** - Failed refreshes marked automatically
5. **Multi-Service** - Handles both Gmail and Drive in one system

---

## Monitoring

### Check Token Status:
```sql
-- Gmail tokens
SELECT
  user_id,
  email,
  expires_at,
  is_active,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 AS minutes_until_expiry
FROM gmail_auth
ORDER BY expires_at;

-- Drive tokens
SELECT
  user_id,
  google_account_email,
  token_expires_at,
  is_active,
  connection_status,
  EXTRACT(EPOCH FROM (token_expires_at - NOW())) / 60 AS minutes_until_expiry
FROM user_drive_connections
ORDER BY token_expires_at;
```

### Check Cron Job Status:
```sql
SELECT * FROM cron.job WHERE jobname = 'refresh-google-tokens-every-30min';
```

### View Cron Job History:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-google-tokens-every-30min')
ORDER BY start_time DESC
LIMIT 10;
```

---

## Manual Refresh (If Needed)

You can manually trigger the refresh function:

```bash
curl -X POST \
  https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/refresh-google-tokens \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Troubleshooting

### Token Still Expired?
1. Check if cron job is running: `SELECT * FROM cron.job WHERE jobname = 'refresh-google-tokens-every-30min';`
2. Check job run history for errors
3. Manually trigger the edge function
4. Verify Google OAuth credentials are correct

### Connection Marked Inactive?
- User's refresh token is invalid or revoked
- User must reconnect their Google account through the app

### Edge Function Failing?
- Check Supabase logs for the `refresh-google-tokens` function
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Ensure Google API quotas are not exceeded

---

## Related Files

- **Edge Function:** `supabase/functions/refresh-google-tokens/index.ts`
- **Migration:** `supabase/migrations/*_setup_google_token_auto_refresh.sql`
- **Gmail Table:** Created in `20251017000001_create_gmail_auth_table.sql`
- **Drive Table:** Created in `20251104120223_create_user_drive_connections_table.sql`

---

## Token Refresh Failures & Solutions

### Why Refresh Tokens Become Invalid

Refresh tokens themselves can become invalid, and when this happens, the only solution is to ask the user to reconnect. Common causes:

#### User-Controlled (Cannot Prevent)

1. **User Revokes Access** (~90% of cases)
   - User removes app from Google Account > Security > Third-party apps
   - IT admins enforce security policies
   - Users see unfamiliar app name and remove it

2. **Google Security Measures**
   - Suspicious activity detected on user's account
   - Account compromise suspected
   - Automated security systems trigger revocation

#### Partially Preventable

3. **Maximum Token Limit (50 per user per OAuth client)**
   - When a user generates their 51st refresh token, Google revokes the oldest one
   - Solution: Delete old connection before creating new one during reconnect

4. **OAuth Configuration Changes**
   - Modifying requested scopes, consent screen settings, or client configuration may invalidate existing tokens
   - Solution: Use separate OAuth clients for dev/staging/production

#### Should Not Happen

5. **6-Month Inactivity Expiration**
   - Refresh tokens expire after 6 months of no use for unverified apps
   - Our cron job prevents this by refreshing every 30 minutes

### Token Health Monitoring

We track every refresh attempt in the `token_refresh_logs` table:

```sql
-- Check token health summary
SELECT * FROM get_token_health_summary();

-- See recent failures
SELECT
  user_id,
  error_code,
  error_message,
  refresh_attempt_at
FROM token_refresh_logs
WHERE success = false
AND refresh_attempt_at > now() - interval '7 days'
ORDER BY refresh_attempt_at DESC;

-- Identify users who need to reconnect
SELECT
  u.email,
  udc.google_account_email,
  udc.connection_status,
  udc.updated_at as last_attempt
FROM user_drive_connections udc
JOIN users u ON u.id = udc.user_id
WHERE udc.is_active = false
AND udc.connection_status = 'token_expired'
ORDER BY udc.updated_at DESC;
```

### What We've Implemented

1. **Clear User Communication** - Reconnect modal instead of confusing errors
2. **Token Health Monitoring** - `token_refresh_logs` table tracks all attempts
3. **Automatic Detection** - Cron job marks expired tokens immediately
4. **Proactive User Notification** - Banner and modal prompt reconnection

### Expected Expiration Rates

- **Beta/testing:** 30-50% (lots of reconnections, users testing)
- **Stable production:** 5-10% (mainly user revocations)
- **Enterprise environments:** 10-20% (IT security policies)

---

**Status:** Active and Running

**Last Updated:** 2024-12-14
