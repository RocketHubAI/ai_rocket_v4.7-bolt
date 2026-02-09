# Gmail Workspace Integration Setup

This guide explains how to set up Gmail Workspace integration for Astra Intelligence.

## Prerequisites

- A Google Cloud Project
- Astra application deployed with Supabase
- Access to Supabase Edge Functions configuration

## Step 1: Create Google Cloud Project OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Configure the OAuth consent screen if prompted:
     - Add app name: "Astra Intelligence"
     - Add support email
     - Add authorized domains (your deployed domain)
     - Add scopes:
       - `https://www.googleapis.com/auth/gmail.readonly`
       - `https://www.googleapis.com/auth/gmail.compose`
       - `https://www.googleapis.com/auth/gmail.send`
       - `https://www.googleapis.com/auth/gmail.modify`

5. Configure Authorized Redirect URIs:
   - Add: `http://localhost:5173/auth/gmail/callback` (for local development)
   - Add: `https://yourdomain.com/auth/gmail/callback` (for production)

6. Save and copy your:
   - **Client ID**
   - **Client Secret**

## Step 2: Configure Environment Variables

### Frontend (.env file)

```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Backend (Supabase Edge Functions)

Set these in your Supabase project settings under Edge Functions > Secrets:

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GMAIL_REDIRECT_URI=https://yourdomain.com/auth/gmail/callback
```

You can set these using the Supabase CLI:

```bash
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id_here
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret_here
supabase secrets set GMAIL_REDIRECT_URI=https://yourdomain.com/auth/gmail/callback
```

## Step 3: Apply Database Migration

Apply the Gmail authentication table migration:

```bash
# Using Supabase CLI
supabase db push

# Or run the migration manually in Supabase SQL Editor
# File: supabase/migrations/20251017000001_create_gmail_auth_table.sql
```

## Step 4: Deploy Edge Functions

Deploy the Gmail OAuth edge functions:

```bash
# Deploy the token exchange function
supabase functions deploy gmail-oauth-exchange

# Deploy the token refresh function
supabase functions deploy gmail-refresh-token
```

## Step 5: Add Gmail Settings to Your UI

The `GmailSettings` component is already created. You need to add it to your settings page or sidebar:

```typescript
import { GmailSettings } from './components/GmailSettings';

// Add this component to your settings page/modal
<GmailSettings />
```

## Usage Flow

1. User clicks "Connect Gmail Account" button
2. User is redirected to Google OAuth consent screen
3. User grants permissions to Astra
4. Google redirects back to `/auth/gmail/callback`
5. Backend exchanges authorization code for access/refresh tokens
6. Tokens are stored securely in the `gmail_auth` table
7. User is redirected back to the main app

## Token Management

- **Access tokens** expire after 1 hour
- **Refresh tokens** are used to automatically get new access tokens
- The system automatically checks token expiration before Gmail API calls
- Users can manually refresh tokens or disconnect their account anytime

## Security Notes

- Tokens are stored in the database with Row Level Security (RLS) enabled
- Only the authenticated user can access their own Gmail tokens
- Client secret is never exposed to the frontend
- All OAuth flows use state parameter for CSRF protection
- Refresh tokens allow seamless token renewal without re-authorization

## Testing Locally

1. Ensure your `.env` file has `VITE_GOOGLE_CLIENT_ID` set
2. Start your dev server: `npm run dev`
3. Navigate to Gmail settings
4. Click "Connect Gmail Account"
5. Complete OAuth flow
6. Verify connection appears in settings

## Troubleshooting

### "Invalid redirect URI" error
- Ensure the redirect URI in Google Cloud Console exactly matches your app's URL
- Include both http://localhost:5173 (dev) and your production domain

### "Missing Google OAuth configuration" error
- Check that Edge Function secrets are set correctly
- Verify secret names match exactly (case-sensitive)

### Token expiration issues
- Tokens automatically refresh when expired
- If refresh fails, user needs to reconnect their account
- Check that `GOOGLE_CLIENT_SECRET` is correctly set in Edge Functions

### Connection shows as inactive
- Token may have expired - try refreshing
- Refresh token may be invalid - reconnect account
- Check Edge Function logs for detailed error messages

## API Integration

Once connected, you can use the Gmail tokens to make API calls:

```typescript
import { getGmailAuth, isGmailTokenExpired, refreshGmailToken } from './lib/gmail-oauth';

// Get current auth data
const auth = await getGmailAuth();

if (auth) {
  // Check if token needs refresh
  if (isGmailTokenExpired(auth.expires_at)) {
    await refreshGmailToken();
    // Fetch updated auth
    auth = await getGmailAuth();
  }

  // Use access token to make Gmail API calls
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages', {
    headers: {
      'Authorization': `Bearer ${auth.access_token}`
    }
  });
}
```

## Future Enhancements

- Automatic background token refresh
- Gmail sync scheduler
- Email templates and automation
- Smart inbox categorization with AI
- Email drafting assistance from Astra
