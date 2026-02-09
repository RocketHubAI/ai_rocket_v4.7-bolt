# Team Structure & n8n Workflow Integration Guide

## Overview
Astra Intelligence has been updated with a comprehensive team-based architecture. Users are organized into teams, and data access is controlled through team membership and role-based permissions.

---

## Database Schema Changes

### 1. New `teams` Table
```sql
teams (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz
)
```

**Purpose**: Central table for team management. Each organization/company gets one team record.

---

### 2. Updated `public.users` Table
Added three new columns:
```sql
public.users (
  ...existing columns...,
  team_id uuid REFERENCES teams(id),
  role text CHECK (role IN ('admin', 'member')),
  view_financial boolean DEFAULT true
)
```

**Key Points**:
- `team_id`: Links user to their team
- `role`: Either 'admin' or 'member'
- `view_financial`: Controls access to financial documents (only relevant for members)

---

### 3. Updated `auth.users.raw_user_meta_data`
User metadata is automatically synced from `public.users` and includes:
```json
{
  "team_id": "uuid-value",
  "role": "admin" | "member",
  "view_financial": true | false,
  "full_name": "User Name",
  "team_name": "Team Name"
}
```

**Sync Mechanism**: A database trigger (`sync_user_metadata()`) automatically updates `auth.users.raw_user_meta_data` whenever `public.users` changes.

---

### 4. Document Tables with Team Support
The following tables now have a `team_id` column:
- `document_chunks_financial`
- `document_chunks_strategy`
- `document_chunks_meetings`

**IMPORTANT**: `company_emails` table remains USER-specific (not team-based) because Gmail data is personal to each user's account.

---

## Role & Permission System

### Admin Role
**Capabilities**:
- Invite team members
- Manage team member roles and permissions
- Access all team data (financial, strategy, meetings, emails)
- View all team members
- Update team settings

### Member Role
**Capabilities**:
- Access team data based on permissions
- View team members
- If `view_financial = true`: Can access financial documents
- If `view_financial = false`: Cannot access financial documents

### Permission Matrix

| Data Type | Admin Access | Member (view_financial=true) | Member (view_financial=false) |
|-----------|--------------|------------------------------|-------------------------------|
| Strategy Documents | ✅ Yes | ✅ Yes | ✅ Yes |
| Meeting Documents | ✅ Yes | ✅ Yes | ✅ Yes |
| Financial Documents | ✅ Yes | ✅ Yes | ❌ No |
| Gmail Emails | ✅ Own Only | ✅ Own Only | ✅ Own Only |

---

## Critical Points for n8n Workflow

### 1. Identifying the User's Team
When a user makes a request to the AI, you need to get their `team_id`:

```javascript
// From the authenticated user in the request
const userId = request.user.id; // or however you get the authenticated user

// Query to get user's team information
const { data: userData } = await supabase
  .from('users')
  .select('team_id, role, view_financial')
  .eq('id', userId)
  .single();

const teamId = userData.team_id;
const userRole = userData.role;
const canViewFinancial = userData.view_financial;
```

---

### 2. Querying Team Data

#### For Financial Documents:
```javascript
// Check if user has financial access
if (userRole === 'admin' || canViewFinancial) {
  const { data: financialDocs } = await supabase
    .from('document_chunks_financial')
    .select('*')
    .eq('team_id', teamId); // All team financial documents
}
```

#### For Strategy Documents:
```javascript
// All team members can access strategy documents
const { data: strategyDocs } = await supabase
  .from('document_chunks_strategy')
  .select('*')
  .eq('team_id', teamId);
```

#### For Meeting Documents:
```javascript
// All team members can access meeting documents
const { data: meetingDocs } = await supabase
  .from('document_chunks_meetings')
  .select('*')
  .eq('team_id', teamId);
```

#### For Gmail Emails:
```javascript
// Gmail emails remain USER-specific (NOT team-based)
const { data: emails } = await supabase
  .from('company_emails')
  .select('*')
  .eq('user_id', userId); // Only the user's own emails
```

---

### 3. Getting All Team Members
```javascript
// Get all team members
const { data: teamMembers } = await supabase
  .from('users')
  .select('id, email, name, role, view_financial')
  .eq('team_id', teamId);
```

---

### 4. Context Building for AI Queries

When building context for the AI, you should:

1. **Identify the requesting user**:
   ```javascript
   const requestingUserId = request.user.id;
   ```

2. **Get their team context**:
   ```javascript
   const { data: userContext } = await supabase
     .from('users')
     .select('team_id, role, view_financial, name, email')
     .eq('id', requestingUserId)
     .single();
   ```

3. **Query appropriate team data**:
   ```javascript
   // Strategy and meetings - always accessible
   const strategyDocs = await queryStrategyDocs(userContext.team_id);
   const meetingDocs = await queryMeetingDocs(userContext.team_id);

   // Financial - conditional access
   const financialDocs = (userContext.role === 'admin' || userContext.view_financial)
     ? await queryFinancialDocs(userContext.team_id)
     : [];

   // Emails - always user-specific
   const emailDocs = await queryUserEmails(requestingUserId);
   ```

4. **Build AI context with team awareness**:
   ```javascript
   const context = {
     user: {
       id: requestingUserId,
       name: userContext.name,
       email: userContext.email,
       role: userContext.role,
       team_id: userContext.team_id
     },
     data: {
       strategy: strategyDocs,
       meetings: meetingDocs,
       financial: financialDocs, // May be empty based on permissions
       emails: emailDocs // Always user-specific
     }
   };
   ```

---

### 5. Inserting New Documents
When the AI processes new documents, they must be tagged with `team_id`:

```javascript
// For financial documents
await supabase
  .from('document_chunks_financial')
  .insert({
    team_id: userContext.team_id, // REQUIRED
    content: documentContent,
    embedding: embeddingVector,
    // ... other fields
  });

// For strategy documents
await supabase
  .from('document_chunks_strategy')
  .insert({
    team_id: userContext.team_id, // REQUIRED
    content: documentContent,
    embedding: embeddingVector,
    // ... other fields
  });

// For meeting documents
await supabase
  .from('document_chunks_meetings')
  .insert({
    team_id: userContext.team_id, // REQUIRED
    content: documentContent,
    embedding: embeddingVector,
    // ... other fields
  });

// For Gmail emails (use user_id, NOT team_id)
await supabase
  .from('company_emails')
  .insert({
    user_id: userId, // Use user_id, NOT team_id
    subject: emailSubject,
    content: emailContent,
    embedding: embeddingVector,
    // ... other fields
  });
```

---

### 6. Vector Search Queries
When performing vector similarity searches, scope by `team_id`:

```javascript
// Search financial documents (check permissions first)
if (userRole === 'admin' || canViewFinancial) {
  const { data: results } = await supabase.rpc('match_financial_documents', {
    query_embedding: embeddingVector,
    match_threshold: 0.7,
    match_count: 10,
    filter: { team_id: teamId } // Filter by team
  });
}

// Search emails (always user-specific)
const { data: emailResults } = await supabase.rpc('search_company_emails', {
  query_embedding: embeddingVector,
  p_user_id: userId, // User-specific, not team-based
  p_limit: 10
});
```

---

## Row Level Security (RLS) Policies

The database has RLS policies that automatically enforce team-based access:

### Document Chunks (Financial, Strategy, Meetings)
- **SELECT**: Users can only see documents where `team_id` matches their team
- **Financial SELECT**: Additionally requires `view_financial = true` for members
- **INSERT**: Users can only insert documents with their own `team_id`

### Company Emails
- **SELECT/INSERT/UPDATE/DELETE**: Users can only access their own emails (`user_id = auth.uid()`)

### Teams Table
- **SELECT**: Users can only see their own team
- **UPDATE**: Only admins can update their team
- **INSERT**: Any authenticated user can create a team (for onboarding)

**Important**: The n8n workflow should respect these policies even though it may use a service role key. Always filter by `team_id` and check permissions explicitly.

---

## Workflow Pseudocode Example

```javascript
// 1. Authenticate and get user context
const userId = authenticatedUserId;
const { data: user } = await supabase
  .from('users')
  .select('team_id, role, view_financial')
  .eq('id', userId)
  .single();

// 2. Determine what data this user can access
const canAccessFinancial = user.role === 'admin' || user.view_financial;

// 3. Build context for AI query
const contextData = {
  strategy: await getStrategyDocuments(user.team_id),
  meetings: await getMeetingDocuments(user.team_id),
  financial: canAccessFinancial ? await getFinancialDocuments(user.team_id) : [],
  emails: await getUserEmails(userId) // Note: user_id, not team_id
};

// 4. Add metadata about data access
const contextMetadata = {
  team_id: user.team_id,
  user_role: user.role,
  has_financial_access: canAccessFinancial,
  data_sources: {
    strategy: contextData.strategy.length > 0,
    meetings: contextData.meetings.length > 0,
    financial: contextData.financial.length > 0,
    emails: contextData.emails.length > 0
  }
};

// 5. Send to AI with context
const aiResponse = await callAI({
  user_query: userQuery,
  context: contextData,
  metadata: contextMetadata
});

// 6. Return response to user
return aiResponse;
```

---

## Key Migration Notes

### Existing Data
- All existing users have been assigned to the "RocketHub" team
- Original users (clay@rockethub.ai, clay@healthrocket.life) are admins
- All other existing users are members with `view_financial = true`
- All existing documents have been tagged with the RocketHub team_id

### New Users
- Join via invite codes that specify: `team_id`, `role`, `view_financial`
- Automatically inherit their team_id from the invite code
- Cannot see data from other teams

---

## Testing Checklist for n8n Workflow

- [ ] User query retrieves only their team's strategy documents
- [ ] User query retrieves only their team's meeting documents
- [ ] Admin can access financial documents
- [ ] Member with `view_financial=true` can access financial documents
- [ ] Member with `view_financial=false` cannot access financial documents
- [ ] Gmail emails are always user-specific (never shared across team)
- [ ] New documents are inserted with correct `team_id`
- [ ] New emails are inserted with correct `user_id` (not team_id)
- [ ] Users from different teams cannot see each other's data

---

## Common Pitfalls to Avoid

1. **Don't use `user_id` for team data**: Document chunks use `team_id`, not `user_id`
2. **Don't use `team_id` for emails**: Emails use `user_id`, not `team_id`
3. **Don't skip permission checks**: Always verify `view_financial` for financial data
4. **Don't hardcode team IDs**: Always derive from the authenticated user
5. **Don't forget to sync**: When inserting new documents, always include the `team_id`
6. **Don't assume admin**: Check role explicitly for admin-only operations

---

## Questions for Implementation?

If you need clarification on:
- How to handle edge cases
- Specific query patterns
- Performance optimization
- Additional permission scenarios

Please refer back to the migration files or ask for specific examples.
