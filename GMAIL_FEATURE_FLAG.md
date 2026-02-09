# Gmail Feature Flag

## Current Status
Gmail integration features are **DISABLED** in the UI while being enhanced.

## What's Hidden
- Gmail connection settings in User Settings modal
- Gmail OAuth callback routing
- Automatic Gmail token refresh service
- Gmail sync progress screens
- Email vectorization features

## What's Preserved
All Gmail functionality code remains intact and fully functional:
- ✅ All Gmail components (`GmailSettings`, `GmailCallback`, etc.)
- ✅ All Gmail hooks (`useGmailSync`, `useGmailTokenRefresh`)
- ✅ Gmail OAuth library (`lib/gmail-oauth.ts`)
- ✅ Database tables (`gmail_auth`, `company_emails`, etc.)
- ✅ Edge functions (Gmail OAuth, token refresh, sync worker)
- ✅ All migrations and RLS policies

## How to Re-Enable Gmail

### Single-Line Change
Open `src/config/features.ts` and change:

```typescript
GMAIL_ENABLED: false,  // Change to true
```

to:

```typescript
GMAIL_ENABLED: true,
```

That's it! Save the file and rebuild the project.

### What Happens When Re-Enabled
1. Gmail connection section appears in User Settings with full functionality
2. Users can connect/disconnect Gmail accounts
3. Gmail OAuth callback routing is active
4. Automatic token refresh service runs every 5 minutes
5. Email sync and vectorization features become available

## Architecture Benefits
This feature flag approach provides:
- ✅ Zero code deletion - all functionality preserved
- ✅ Single point of control - one boolean flag
- ✅ No import errors or build issues
- ✅ Professional "Coming Soon" UI when disabled
- ✅ Instant re-enablement without code changes
- ✅ Easy testing (just toggle the flag)

## Testing
To test the disabled state locally:
1. Set `GMAIL_ENABLED: false` in `src/config/features.ts`
2. Run `npm run dev`
3. Verify "Coming Soon" badge appears in User Settings

To test the enabled state:
1. Set `GMAIL_ENABLED: true` in `src/config/features.ts`
2. Run `npm run dev`
3. Verify full Gmail functionality is available

## Related Files
- **Feature Flag**: `src/config/features.ts`
- **User Settings**: `src/components/UserSettingsModal.tsx` (line 411-432)
- **App Routing**: `src/App.tsx` (lines 10, 18, 50-68)
- **Token Refresh**: `src/hooks/useGmailTokenRefresh.ts` (line 11)
