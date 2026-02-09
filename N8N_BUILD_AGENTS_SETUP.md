# N8N Build Agents Feature Setup Guide

This guide explains how to set up and use the new "Build Agents" feature that allows users to create and manage N8N workflow automations directly from the Astra Intelligence app.

## Overview

The Build Agents feature integrates N8N (an open-source workflow automation tool) into Astra Intelligence, allowing authorized users to:
- Create new N8N workflows
- View and manage existing workflows
- Activate/deactivate workflows
- Edit workflows directly in N8N
- Delete workflows

## Architecture

The integration consists of:

1. **Frontend Components**: Build Agents page with workflow management UI
2. **Edge Function**: Secure N8N API proxy (`n8n-proxy`)
3. **Database Tables**: User access control and workflow metadata tracking
4. **Navigation**: Accessible from the Help menu for authorized users

## Setup Instructions

### 1. N8N Instance Setup

You'll need access to an N8N instance. According to your configuration:
- **Current Instance**: `https://healthrocket.app.n8n.cloud/`
- **New Instance**: Will be migrated to Hostinger soon

#### Generate N8N API Key

1. Log in to your N8N instance
2. Go to **Settings** → **API**
3. Click **Create API Key**
4. Copy the generated API key
5. Store it securely

### 2. Environment Variables

Update the following environment variable in your `.env` file:

```bash
# N8N Integration for Build Agents Feature (URL only - for browser links)
VITE_N8N_URL=https://healthrocket.app.n8n.cloud
```

**Security Note**: The N8N API key is stored securely as a server-side secret in Supabase Edge Functions, NOT in client-side code.

### 3. Supabase Edge Function Secrets

The `n8n-proxy` edge function needs access to your N8N credentials. Set these as secrets in the Supabase Dashboard under Edge Functions > Secrets:

```bash
N8N_URL=https://healthrocket.app.n8n.cloud
N8N_API_KEY=your_actual_n8n_api_key_here
```

**Important**: The API key is ONLY accessible server-side via the Edge Function proxy. All N8N API calls from the frontend go through the secure `n8n-proxy` edge function.

### 4. Database Migration

The database migration has already been applied, creating:

**Tables Created**:
- `n8n_user_access` - Controls which users can access the Build Agents feature
- `n8n_workflows` - Stores metadata about N8N workflows created through the app

**Initial Access**: Your user (`clay@rockethub.ai`) has been automatically granted full access.

### 5. Grant Access to Additional Users

To give other users access to Build Agents:

```sql
-- Grant access to a user
INSERT INTO n8n_user_access (user_id, is_enabled, access_level)
SELECT id, true, 'full'
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (user_id) DO UPDATE
SET is_enabled = true, access_level = 'full', updated_at = now();
```

**Access Levels**:
- `full` - Complete access to all Build Agents features
- `restricted` - Limited access (for future use)

### 6. Update N8N URL When Migrating to Hostinger

When you migrate to Hostinger:

1. Update `.env` file:
   ```bash
   VITE_N8N_URL=https://your-new-hostinger-n8n-url.com
   ```

2. Update Supabase secrets (if needed via Supabase Dashboard or CLI)

3. Redeploy the `n8n-proxy` edge function (if necessary)

## Using Build Agents

### Accessing the Feature

1. Log in to Astra Intelligence
2. Click the **Help** button (with sparkles) in the top right
3. If you have access, you'll see **"Build Agents"** at the top of the menu
4. Click to navigate to `/build-agents`

### Creating a Workflow

1. Click **"Create Workflow"**
2. Enter a workflow name (required)
3. Add a description (optional)
4. Click **"Create Workflow"**
5. The workflow will be created in your N8N instance
6. Click **"Edit"** to open it in N8N's visual editor

### Managing Workflows

**View Workflows**: All your workflows are displayed as cards showing:
- Workflow name and description
- Active status (green dot = active, gray = inactive)
- Number of nodes
- Last updated timestamp

**Edit in N8N**: Click the **"Edit"** button to open the workflow in N8N's editor

**Activate/Deactivate**: Click the Play/Pause button to toggle workflow status

**Delete**: Click the trash icon to permanently delete a workflow

### Security Features

- Only authorized users can access the Build Agents page
- All N8N API calls go through a secure edge function
- Your N8N API key is never exposed to the frontend
- Row-level security ensures users only see their own workflows
- Super admins can access all workflows

## Troubleshooting

### "Access Required" Message

If you see this message, your user doesn't have N8N access. Contact a super admin to grant access.

### "N8N not configured" Error

This means the N8N environment variables are not set in the edge function. Check Supabase Edge Function configuration.

### Workflows Not Loading

1. Verify your N8N API key is correct
2. Check that your N8N instance is accessible
3. Verify the `n8n-proxy` edge function is deployed
4. Check browser console for specific error messages

### Can't Create Workflows

1. Ensure you have `is_enabled = true` in `n8n_user_access` table
2. Verify your N8N instance is running
3. Check that you have permissions in N8N

## API Reference

### Edge Function: `n8n-proxy`

**Endpoint**: `https://your-supabase-url.supabase.co/functions/v1/n8n-proxy`

**Query Parameters**:
- `path` - The N8N API endpoint path (e.g., `/workflows`, `/workflows/{id}`)

**Authentication**: Requires valid Supabase JWT token

**Examples**:
```javascript
// Get all workflows
GET /functions/v1/n8n-proxy?path=/workflows

// Create workflow
POST /functions/v1/n8n-proxy?path=/workflows
Body: { name, nodes, connections, active }

// Update workflow
PUT /functions/v1/n8n-proxy?path=/workflows/{id}
Body: { active: true }

// Delete workflow
DELETE /functions/v1/n8n-proxy?path=/workflows/{id}
```

## Future Enhancements

Potential features for future development:
- Workflow templates
- AI-assisted workflow creation
- Workflow execution history
- Workflow sharing within teams
- Webhook endpoint management
- Scheduled workflow execution
- Workflow analytics and monitoring

## Support

For issues or questions:
- Check the FAQ in Astra's Help Center
- Submit a support request through the Support menu
- Contact: support@rockethub.ai

---

**Last Updated**: November 12, 2025
**Feature Version**: 1.0.0
