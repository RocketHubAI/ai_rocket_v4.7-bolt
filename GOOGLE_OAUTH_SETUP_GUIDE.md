# Google OAuth Setup Guide
## Complete Step-by-Step Instructions for Gmail + Google Drive Integration

---

## 📋 Overview

This guide will help you set up Google OAuth for both Gmail and Google Drive integrations in your Astra Intelligence application.

**✨ Key Feature:** The **same OAuth client and token** are used for both services! When a user connects Gmail, they automatically get Google Drive access too. One OAuth flow connects everything. 🎯

---

## 🎯 What You'll Need

- Google account with access to Google Cloud Console
- Your application's domain (production) or localhost (development)
- Access to your Supabase project environment variables

---

## 🚀 Part 1: Google Cloud Console Setup

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project

**Option A: Create New Project**
1. Click the project dropdown at the top
2. Click "New Project"
3. Enter project name: `Astra Intelligence` (or your preferred name)
4. Click "Create"
5. Wait for project creation to complete
6. Select your new project from the dropdown

**Option B: Use Existing Project**
1. Click the project dropdown at the top
2. Select your existing project

### Step 3: Enable Required APIs

1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. Search for and enable the following APIs:

   **For Gmail Integration:**
   - Search: "Gmail API"
   - Click on it
   - Click "Enable"
   - Wait for it to enable

   **For Google Drive Integration:**
   - Search: "Google Drive API"
   - Click on it
   - Click "Enable"
   - Wait for it to enable

   **For User Profile (Required for both):**
   - Search: "Google People API" (may already be enabled)
   - Click "Enable" if not already enabled

### Step 4: Configure OAuth Consent Screen

1. Go to **"APIs & Services" → "OAuth consent screen"**

2. **Choose User Type:**
   - **Internal** (if you have a Google Workspace and only want organization users)
   - **External** (for general use - recommended for most cases)
   - Click "Create"

3. **Configure App Information:**

   **App Information:**
   - **App name:** `Astra Intelligence` (or your app name)
   - **User support email:** Select your email
   - **App logo:** (Optional) Upload your logo

   **App Domain (Optional but recommended):**
   - **Application home page:** `https://yourdomain.com`
   - **Privacy policy:** `https://yourdomain.com/privacy`
   - **Terms of service:** `https://yourdomain.com/terms`

   **Authorized domains:**
   - Add your domain: `yourdomain.com` (without https://)
   - For development: You don't need to add localhost here

   **Developer contact information:**
   - Add your email address

   Click "Save and Continue"

4. **Configure Scopes:**

   Click "Add or Remove Scopes"

   **Search and add these scopes:**

   For Gmail:
   - ✅ `.../auth/userinfo.email` - See your primary Google Account email
   - ✅ `.../auth/gmail.readonly` - Read your email messages and settings
   - ✅ `.../auth/gmail.compose` - Manage drafts
   - ✅ `.../auth/gmail.send` - Send email on your behalf
   - ✅ `.../auth/gmail.modify` - View and modify but not delete your email

   For Google Drive:
   - ✅ `.../auth/drive.readonly` - See and download all your Google Drive files
   - ✅ `.../auth/drive.metadata.readonly` - View metadata for files in your Drive

   **How to find them:**
   - Use the search box to find each scope by typing "gmail" or "drive"
   - Check the box next to each scope listed above
   - Click "Update" when done

   Click "Save and Continue"

5. **Test Users (Only if using External mode during development):**

   If your app is not verified yet, add test users:
   - Click "Add Users"
   - Enter email addresses of users who should be able to test
   - Click "Save and Continue"

6. **Summary:**
   - Review your settings
   - Click "Back to Dashboard"

### Step 5: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"**

2. Click **"+ Create Credentials"** at the top

3. Select **"OAuth 2.0 Client ID"**

4. **Configure Application Type:**
   - **Application type:** Select "Web application"
   - **Name:** `Astra Intelligence Web Client` (or your preferred name)

5. **Configure Authorized JavaScript Origins:**

   Click "+ Add URI" under "Authorized JavaScript origins"

   **For Production:**
   ```
   https://yourdomain.com
   ```

   **For Development (add both):**
   ```
   http://localhost:5173
   http://localhost:3000
   ```

   **For Netlify/Other Hosting:**
   ```
   https://your-app.netlify.app
   ```

6. **Configure Authorized Redirect URIs:**

   Click "+ Add URI" under "Authorized redirect URIs"

   **Important: Add ALL of the following URIs:**

   **For Gmail (Production):**
   ```
   https://yourdomain.com/auth/gmail/callback
   ```

   **For Google Drive (Production):**
   ```
   https://yourdomain.com/auth/google-drive/callback
   ```

   **For Gmail (Development):**
   ```
   http://localhost:5173/auth/gmail/callback
   ```

   **For Google Drive (Development):**
   ```
   http://localhost:5173/auth/google-drive/callback
   ```

   **For Netlify/Other Hosting:**
   ```
   https://your-app.netlify.app/auth/gmail/callback
   https://your-app.netlify.app/auth/google-drive/callback
   ```

   💡 **Pro Tip:** Add both production and development URIs now to avoid having to come back later!

7. Click **"Create"**

8. **Save Your Credentials:**

   A modal will appear with your credentials:
   - ✅ **Client ID** - Copy this (looks like: `123456789-abc.apps.googleusercontent.com`)
   - ✅ **Client Secret** - Copy this (looks like: `GOCSPX-abc123...`)

   ⚠️ **Important:** Save these somewhere safe! You'll need them in the next steps.

   Click "OK"

---

## 🔧 Part 2: Configure Your Application

### Step 1: Update Your Local Environment Variables

1. Open your project's `.env` file (create if it doesn't exist)

2. Add the following variables:

```bash
# Get these from Google Cloud Console (Step 5.8 above)
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com

# These will be set in Supabase Edge Functions (not in your local .env)
# GOOGLE_CLIENT_SECRET=your-secret-here
# GMAIL_REDIRECT_URI=https://yourdomain.com/auth/gmail/callback
# GOOGLE_DRIVE_REDIRECT_URI=https://yourdomain.com/auth/google-drive/callback
```

3. Replace `your-client-id-here` with the **Client ID** you copied

4. Save the file

### Step 2: Configure Supabase Edge Function Environment Variables

The `GOOGLE_CLIENT_SECRET` and redirect URIs need to be set in Supabase (not in your local `.env`):

**Method 1: Using Supabase Dashboard (Recommended)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **"Project Settings" → "Edge Functions"**
4. Scroll down to **"Environment Variables"**
5. Add the following variables:

   | Name | Value |
   |------|-------|
   | `GOOGLE_CLIENT_SECRET` | Your Client Secret from Step 5.8 |
   | `GMAIL_REDIRECT_URI` | `https://yourdomain.com/auth/gmail/callback` |
   | `GOOGLE_DRIVE_REDIRECT_URI` | `https://yourdomain.com/auth/google-drive/callback` |

6. Click "Save"

**Method 2: Using Supabase CLI**

```bash
# Set production environment variables
supabase secrets set GOOGLE_CLIENT_SECRET=your-secret-here
supabase secrets set GMAIL_REDIRECT_URI=https://yourdomain.com/auth/gmail/callback
supabase secrets set GOOGLE_DRIVE_REDIRECT_URI=https://yourdomain.com/auth/google-drive/callback
```

**For Development (Local Supabase):**

If running Supabase locally, create `.env` in your functions directory:
```bash
# supabase/functions/.env
GOOGLE_CLIENT_SECRET=your-secret-here
GMAIL_REDIRECT_URI=http://localhost:5173/auth/gmail/callback
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:5173/auth/google-drive/callback
```

---

## ✅ Part 3: Verification Checklist

Before testing, verify you've completed:

### Google Cloud Console
- ✅ Project created/selected
- ✅ Gmail API enabled
- ✅ Google Drive API enabled
- ✅ OAuth consent screen configured
- ✅ Scopes added (email, gmail.*, drive.readonly, drive.metadata.readonly)
- ✅ OAuth 2.0 Client ID created
- ✅ Authorized JavaScript origins added
- ✅ Authorized redirect URIs added (Gmail + Google Drive, Production + Development)
- ✅ Client ID and Client Secret saved

### Application Configuration
- ✅ `VITE_GOOGLE_CLIENT_ID` set in local `.env`
- ✅ `GOOGLE_CLIENT_SECRET` set in Supabase Edge Functions
- ✅ `GMAIL_REDIRECT_URI` set in Supabase Edge Functions
- ✅ `GOOGLE_DRIVE_REDIRECT_URI` set in Supabase Edge Functions

---

## 🧪 Part 4: Testing the Integration

### Enable the Feature

1. Open `src/config/features.ts`
2. Change:
   ```typescript
   GOOGLE_DRIVE_SYNC_ENABLED: true,  // ← Change from false
   ```
3. Save the file
4. Rebuild: `npm run build`
5. Restart your dev server: `npm run dev`

### Test Gmail Integration (if enabled)

1. Log into your app
2. Go to Settings
3. Find "Gmail Integration" section
4. Click "Connect Gmail"
5. You should be redirected to Google
6. Authorize the app
7. You should be redirected back with success message
8. Connection status should show "Connected"

### Test Google Drive Integration

1. Log into your app
2. Go to Settings
3. Find "Google Drive Sync" section
4. Click "Connect Google Drive"
5. You should be redirected to Google
6. Authorize the app
7. You should be redirected back with success message
8. Connection status should show "Connected"
9. Click "Select Folders"
10. Choose your folders from the dropdown
11. Click "Save Configuration"
12. Folders should be saved successfully

---

## 🔍 Troubleshooting Common Issues

### Issue 1: "redirect_uri_mismatch" Error

**Problem:** OAuth fails with "redirect URI mismatch"

**Solution:**
1. Check that redirect URI in Google Cloud Console **exactly matches** what your app is using
2. Common mistakes:
   - Missing trailing slash: `/callback` vs `/callback/`
   - HTTP vs HTTPS mismatch
   - Port number mismatch (e.g., `:5173` vs `:3000`)
3. Double-check you added URIs for **both** Gmail and Google Drive
4. Wait 5-10 minutes after adding URIs (changes can take time to propagate)

### Issue 2: "Access Blocked: This app's request is invalid"

**Problem:** Google blocks the OAuth request

**Solution:**
1. Check that APIs are enabled (Gmail API, Google Drive API)
2. Verify OAuth consent screen is fully configured
3. If using "External" mode and app not verified, add your email as a test user
4. Check authorized domains are correct

### Issue 3: "Missing Client ID" Error

**Problem:** App shows "Google Client ID is not configured"

**Solution:**
1. Verify `VITE_GOOGLE_CLIENT_ID` is in your `.env` file
2. Restart your development server after adding the variable
3. Check for typos in the environment variable name

### Issue 4: "Failed to Exchange Code for Tokens"

**Problem:** OAuth callback fails during token exchange

**Solution:**
1. Check that `GOOGLE_CLIENT_SECRET` is set in Supabase Edge Functions
2. Verify `GOOGLE_DRIVE_REDIRECT_URI` is set in Supabase
3. Check Edge Function logs in Supabase Dashboard for detailed error
4. Ensure redirect URI in request matches one in Google Cloud Console

### Issue 5: "Folders Not Loading"

**Problem:** Folder picker shows no folders or fails to load

**Solution:**
1. Verify you have folders in your Google Drive
2. Check access token is valid (connection status should be "Connected")
3. Look at browser console for API errors
4. Ensure Google Drive API is enabled
5. Check OAuth scopes include `drive.readonly` and `drive.metadata.readonly`

### Issue 6: Testing with External Users

**Problem:** Other users can't test the OAuth flow

**Solution:**
1. If your app is in "External" mode but not verified:
   - Add their email addresses as "Test Users" in OAuth consent screen
   - They must use the exact email address you added
2. For production use, you'll need to verify your app with Google

---

## 📊 Viewing Logs and Debugging

### Supabase Edge Function Logs

1. Go to Supabase Dashboard
2. Select your project
3. Go to **"Edge Functions"**
4. Click on function name (e.g., `google-drive-oauth-exchange`)
5. View "Logs" tab for real-time debugging

Look for:
- 📁 Log entries with emoji indicators
- ✅ Success messages
- ❌ Error details
- Token expiration information

### Browser Console

Open browser DevTools (F12) and check:
- Network tab for failed requests
- Console tab for JavaScript errors
- Look for messages starting with `📁` (Google Drive) or `📧` (Gmail)

---

## 🚀 Production Deployment Checklist

When deploying to production:

1. **Update Environment Variables:**
   - Change redirect URIs from localhost to production domain
   - Update `GMAIL_REDIRECT_URI` in Supabase
   - Update `GOOGLE_DRIVE_REDIRECT_URI` in Supabase

2. **Update Google Cloud Console:**
   - Add production redirect URIs
   - Add production authorized JavaScript origins
   - Update authorized domains

3. **App Verification (Optional but Recommended):**
   - For production use with many users, consider verifying your app
   - Removes "This app isn't verified" warning
   - Go to OAuth consent screen → "Submit for Verification"

4. **Test in Production:**
   - Test OAuth flow in production environment
   - Verify tokens refresh correctly
   - Check folder selection works

---

## 📚 Quick Reference

### Redirect URIs Format

```
Gmail Callback:
https://{your-domain}/auth/gmail/callback

Google Drive Callback:
https://{your-domain}/auth/google-drive/callback
```

### Required OAuth Scopes

```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.metadata.readonly
```

### Environment Variables Summary

**Local (.env):**
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Supabase Edge Functions:**
```bash
GOOGLE_CLIENT_SECRET=your-secret
GMAIL_REDIRECT_URI=https://yourdomain.com/auth/gmail/callback
GOOGLE_DRIVE_REDIRECT_URI=https://yourdomain.com/auth/google-drive/callback
```

---

## 🎉 Success!

If you've followed all steps and can successfully:
- ✅ Connect Gmail (if enabled)
- ✅ Connect Google Drive
- ✅ Select folders from your Drive
- ✅ See "Connected" status

Then your Google OAuth is fully configured! 🎊

---

## 💡 Need Help?

If you're still having issues:

1. Check the troubleshooting section above
2. Review Supabase Edge Function logs
3. Check browser console for errors
4. Verify all environment variables are set correctly
5. Ensure redirect URIs match exactly

Common issues are usually:
- Typos in redirect URIs
- Missing environment variables
- APIs not enabled
- Redirect URI not added for both Gmail AND Google Drive
