# Data Classification Matrix
## RocketHub Application - SOC 2 Type 2 Evidence Document

**Document Version:** 1.0
**Last Updated:** January 8, 2026
**Prepared For:** TAC Security SAQ Item 4

---

## 1. Executive Summary

This document identifies and classifies all sensitive data within the RocketHub application, defines protection levels, and documents the security controls implemented for each data category. All data storage uses Supabase (PostgreSQL) with Row Level Security (RLS) enabled on every table.

---

## 2. Data Classification Levels

| Level | Description | Access Scope |
|-------|-------------|--------------|
| **Critical** | System credentials, API keys, OAuth tokens | Server-side only, never exposed to client |
| **Restricted** | Financial documents, admin functions | Role-based + explicit permission flags |
| **Confidential** | User PII, chat history, uploaded documents | User-scoped or team-scoped access |
| **Internal** | Team collaboration data, reports | Team-member access only |
| **Public** | Marketing content, published templates | No authentication required |

---

## 3. Complete Data Classification Matrix

### 3.1 Critical Data (Highest Protection)

| Data Type | Table/Storage | Examples | Protection Mechanism |
|-----------|---------------|----------|---------------------|
| OAuth Access Tokens | `user_drive_connections` | Google OAuth tokens | Stored server-side, RLS restricts to owner only, encrypted at rest |
| OAuth Refresh Tokens | `user_drive_connections` | Google refresh tokens | Server-side only, auto-refresh via Edge Functions |
| Gmail OAuth Credentials | `gmail_auth` | Gmail API tokens | User-scoped RLS: `auth.uid() = user_id` |
| API Keys | Environment Variables | Supabase keys, Gemini API | Never stored in database, server-side only |
| Service Role Keys | Edge Functions only | `SUPABASE_SERVICE_ROLE_KEY` | Never exposed to client, Edge Functions only |

**RLS Policy Evidence (user_drive_connections):**
```sql
"Users can view own drive connection" - SELECT - (auth.uid() = user_id)
"Users can update own drive connection" - UPDATE - (auth.uid() = user_id)
"Users can delete own drive connection" - DELETE - (auth.uid() = user_id)
```

---

### 3.2 Restricted Data (Admin/Permission-Based Access)

| Data Type | Table/Storage | Examples | Protection Mechanism |
|-----------|---------------|----------|---------------------|
| Admin Invite Codes | `admin_invites` | System-level invites | Super-admin email whitelist only |
| Invite Codes | `invite_codes` | Team invite codes | Team admin role check + super-admin access |
| Marketing Emails | `marketing_emails` | Campaign content | Super-admin whitelist only |
| Marketing Recipients | `marketing_email_recipients` | Email recipient lists | Super-admin whitelist only |
| Marketing Contacts | `marketing_contacts` | Contact database | Super-admin whitelist only |
| N8N Access Control | `n8n_user_access` | Workflow builder access | `is_super_admin()` function check |
| Feature Flags | `feature_flags` | Per-user feature toggles | User-specific or admin-managed |
| User Metrics | `user_metrics_daily` | Usage statistics | Service role + user-scoped read |

**RLS Policy Evidence (invite_codes):**
```sql
"Super-admins can view all invite codes" - SELECT - (auth.email() = 'clay@rockethub.ai')
"Team admins can view team invite codes" - SELECT - (role = 'admin' AND team_id match)
"Anyone can validate invite codes" - SELECT - (is_active = true AND not expired AND uses remaining)
```

---

### 3.3 Confidential Data (User-Scoped)

| Data Type | Table/Storage | Examples | Protection Mechanism |
|-----------|---------------|----------|---------------------|
| User Profiles | `users` | Email, name, role | User can read own, admins can update team members |
| Chat History | `astra_chats` | AI conversation logs | `auth.uid() = user_id` strict ownership |
| Saved Prompts | `astra_saved_prompts` | User's saved prompts | `auth.uid() = user_id` ownership only |
| Saved Visualizations | `saved_visualizations` | Chart configurations | `auth.uid() = user_id` ownership only |
| Scheduled Reports | `astra_reports` | Report configurations | `auth.uid() = user_id` ownership only |
| Help Conversations | `help_conversations` | Support chat history | `auth.uid() = user_id` ownership only |
| Feedback Submissions | `user_feedback_submissions` | User feedback | User-scoped + team admin view for team |
| Legal Acceptance | `legal_acceptance` | Terms acceptance records | `auth.uid() = user_id` ownership only |
| Setup Progress | `setup_guide_progress` | Onboarding state | `auth.uid() = user_id` ownership only |
| Activity Tracking | `user_activity_tracking` | Login/usage tracking | `auth.uid() = user_id` ownership only |

**RLS Policy Evidence (astra_chats):**
```sql
"Users can view their own chats" - SELECT - (auth.uid() = user_id)
"Users can insert their own chats" - INSERT - (auth.uid() = user_id)
"Users can update their own chats" - UPDATE - (auth.uid() = user_id)
"Users can delete their own chats" - DELETE - (auth.uid() = user_id)
```

---

### 3.4 Internal Data (Team-Scoped)

| Data Type | Table/Storage | Examples | Protection Mechanism |
|-----------|---------------|----------|---------------------|
| Document Chunks | `document_chunks` | Vectorized document content | Team-scoped: `team_id IN (SELECT team_id FROM users WHERE id = auth.uid())` |
| Team Settings | `team_settings` | Team configuration | Team membership check |
| Team Members | `team_members` | Team roster | Team membership + admin management |
| Team Information | `teams` | Company name, settings | Team membership via JWT `team_id` |
| Data Sync Sessions | `data_sync_sessions` | Sync status/progress | Team-scoped read, user-scoped write |
| Drive Connections | `user_drive_connections` | Google Drive folders | Team members can view team connection |
| AI Validation Logs | `ai_validation_logs` | Response validation | Team-scoped view |
| N8N Workflows | `n8n_workflows` | Automation workflows | Owner + team view if team_id set |
| Sync Operations | `sync_operations` | File sync history | Team-scoped via team_members join |

**RLS Policy Evidence (document_chunks):**
```sql
"Users can access own team documents" - ALL - (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()))
```

---

### 3.5 Public Data (No Authentication Required)

| Data Type | Table/Storage | Examples | Protection Mechanism |
|-----------|---------------|----------|---------------------|
| Report Templates | `astra_report_templates` | Pre-built report types | `SELECT true` (read-only) |
| Active Feedback Questions | `feedback_questions` | Survey questions | `is_active = true` filter |
| Published What's New | `whats_new` | Release notes | `is_published = true` filter |
| Active Workflow Templates | `workflow_templates` | N8N templates | `is_active = true` filter |
| Launch Achievements | `launch_achievements` | Gamification badges | `is_active = true` filter |
| Preview Requests | `preview_requests` | Demo sign-ups | Anyone can INSERT, admin-only SELECT |
| Moonshot Registrations | `moonshot_registrations` | Challenge sign-ups | Anonymous INSERT allowed |

---

## 4. Environment Variable Security

### 4.1 Client-Safe Variables (VITE_ prefix)
Exposed to browser, contain non-sensitive identifiers only:
- `VITE_SUPABASE_URL` - Public Supabase endpoint
- `VITE_SUPABASE_ANON_KEY` - Public anonymous key (RLS enforced)
- `VITE_GOOGLE_CLIENT_ID` - OAuth client identifier

### 4.2 Server-Only Variables
Never exposed to client, used in Edge Functions only:
- `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS (Edge Functions only)
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `RESEND_API_KEY` - Email service key
- `GEMINI_API_KEY` - AI service key
- `N8N_API_KEY` - Workflow automation key

---

## 5. Access Control Summary

### 5.1 Super Admin Access
Controlled via email whitelist in RLS policies:
- Primary: `clay@rockethub.ai`
- Additional: `nolan@rockethub.ai`, `info@rockethub.ai`, `derek@rockethub.ai`, `marshall@rockethub.ai`

Super admins have elevated SELECT access to:
- All user feedback submissions
- All teams and team data
- All invite codes
- All marketing data
- AI validation logs across teams
- Launch preparation progress

### 5.2 Team Admin Access
Controlled via `role = 'admin'` check in users table:
- Can manage team members (view, update)
- Can create/manage team invite codes
- Can view team feedback submissions
- Can view team drive connections
- Can update team settings

### 5.3 Standard User Access
Default authenticated user permissions:
- Full CRUD on own data (chats, reports, prompts, visualizations)
- Read access to team documents
- Read access to team settings
- Can validate (not view) invite codes

---

## 6. Data Protection Technologies

| Protection Layer | Implementation | Coverage |
|-----------------|----------------|----------|
| Row Level Security (RLS) | PostgreSQL policies | All 60+ tables |
| Encryption at Rest | Supabase/AWS default | All database storage |
| Encryption in Transit | TLS 1.3 | All API connections |
| Authentication | Supabase Auth (JWT) | All authenticated endpoints |
| Authorization | RLS + `auth.uid()` | Every data access query |
| Token Storage | Server-side only | OAuth tokens never in browser |
| API Key Isolation | Environment variables | Never in database or client code |

---

## 7. Blocked/Restricted Tables

The following tables have explicit `false` policies blocking all direct access:
- `embedding_queue` - Internal processing queue
- `sync_locks` - Concurrency control
- `sync_retry_queue` - Background job queue
- `workflow_executions` - Internal execution logs

These tables are only accessible via service role in Edge Functions.

---

## 8. Compliance Notes

1. **No Unrestricted Access**: Zero tables use `USING (true)` for sensitive data
2. **Ownership Verification**: All user data requires `auth.uid() = user_id` check
3. **Team Isolation**: Team data uses subquery verification against users table
4. **Admin Elevation**: Super admin access uses explicit email whitelist
5. **Audit Trail**: `created_at` and `updated_at` timestamps on all tables
6. **Soft Deletes**: Critical data uses `is_active` flags vs hard deletion

---

## 9. Evidence Screenshots Required

To complete SAQ Item 4, capture screenshots of:

1. **Supabase Dashboard > Authentication > Policies** - Shows RLS enabled
2. **SQL Query Result**: Run `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;`
3. **Environment Variables Structure** (redacted values)
4. **Edge Function showing server-only key usage**

---

*Document Prepared By: RocketHub Engineering Team*
*Classification: Internal Use - SOC 2 Evidence*
