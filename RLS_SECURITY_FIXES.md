# RLS Security Fixes - February 2026

This document tracks all Row Level Security (RLS) policy fixes applied to the database.
If any fix causes issues, use this reference to identify and revert the specific migration.

---

## Migration: `20260207_comprehensive_rls_security_fixes`

**Date Applied:** 2026-02-07
**Purpose:** Fix critical RLS vulnerabilities identified during security audit

---

### Fix 1: Remove wide-open `{public} FOR ALL` policies with `USING (true)`

**Tables:** `app_config`, `folder_sync_status`, `team_goals`, `team_strategy_config`

**Problem:** These tables had policies named "Service role can access..." but were granted to `{public}` role with `USING (true)`, meaning anyone (including anonymous users) had full read/write access.

**Solution:** Drop the `{public}` policies and replace with `{service_role}` policies so only the backend service role can access these tables directly. The authenticated user policies already exist for `team_goals` and `team_strategy_config`.

**Policies Dropped:**
- `app_config`: "Service role can access app_config"
- `folder_sync_status`: "Service role full access"
- `team_goals`: "Service role can manage goals"
- `team_strategy_config`: "Service role can manage strategy config"

**Policies Created:**
- Each table gets a new `service_role` FOR ALL policy
- `app_config` additionally gets an authenticated SELECT policy (read-only for users)
- `folder_sync_status` additionally gets authenticated SELECT/INSERT/UPDATE for team members

**Rollback:** Re-create the `{public}` FOR ALL policies if edge functions break:
```sql
CREATE POLICY "Service role can access app_config" ON app_config FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON folder_sync_status FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage goals" ON team_goals FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage strategy config" ON team_strategy_config FOR ALL TO public USING (true) WITH CHECK (true);
```

---

### Fix 2: Enable RLS on `scan_queue` table

**Table:** `scan_queue`

**Problem:** RLS was completely disabled on this table. Anyone with the anon key could read/write scan jobs.

**Solution:** Enable RLS and add service_role-only access policy. Users can view their own team's scan queue entries (read-only).

**Rollback:**
```sql
ALTER TABLE scan_queue DISABLE ROW LEVEL SECURITY;
```

---

### Fix 3: Restrict anonymous SELECT on `users`, `teams`, `moonshot_registrations`

**Tables:** `users`, `teams`, `moonshot_registrations`

**Problem:**
- `users` table: Anonymous users could read ALL user data (emails, roles, team IDs, financial access flags)
- `teams` table: Anonymous users could read ALL team data
- `moonshot_registrations` table: Anonymous users could read ALL registrations

**Solution:**
- `users`: Replace anonymous `USING (true)` with a restricted policy that only allows checking if an email exists (needed for registration flow in CustomAuth.tsx). Anonymous can only SELECT `id` and `email` columns -- but since RLS policies cannot restrict columns, we keep the policy but scope it to email-based lookups only.
- `teams`: Replace anonymous `USING (true)` with a policy that only allows looking up team name by specific ID (needed for invite code flow).
- `moonshot_registrations`: Replace anonymous `USING (true)` SELECT with email-scoped lookup only.
- `users` authenticated SELECT: Replace `USING (true)` with team-scoped access (users can see their own team members).

**IMPORTANT - Authenticated users SELECT on `users` table:**
The old policy let every authenticated user see ALL users. The new policy restricts to same-team members plus super admins seeing everyone. This could affect features that display user info across teams. If cross-team user lookups break, the rollback is:
```sql
DROP POLICY IF EXISTS "Authenticated users can view team members" ON users;
CREATE POLICY "Authenticated users can view all users" ON users FOR SELECT TO authenticated USING (true);
```

**Rollback for anonymous:**
```sql
DROP POLICY IF EXISTS "Anonymous can check email existence" ON users;
CREATE POLICY "Anonymous users can check email existence" ON users FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anonymous can lookup team name by id" ON teams;
CREATE POLICY "Anonymous users can view team names for invite checking" ON teams FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anonymous can check registration by email" ON moonshot_registrations;
CREATE POLICY "anon_select_moonshot_by_email" ON moonshot_registrations FOR SELECT TO anon USING (true);
```

---

### Fix 4: Fix mislabeled service-role policies on `moonshot_rbg_scores`

**Table:** `moonshot_rbg_scores`

**Problem:** Policies named "Service role can insert/update RBG scores" were actually granted to `{authenticated}` with `USING (true)`, meaning any logged-in user could insert or modify any team's scores.

**Solution:** Drop the mislabeled policies and create proper `{service_role}` policies.

**Rollback:**
```sql
DROP POLICY IF EXISTS "Service role manages RBG scores" ON moonshot_rbg_scores;
CREATE POLICY "Service role can insert RBG scores" ON moonshot_rbg_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role can update RBG scores" ON moonshot_rbg_scores FOR UPDATE TO authenticated USING (true);
```

---

### Fix 5: Add ownership checks to INSERT policies

**Tables:** `astra_notifications`, `workshop_registrations`

**Problem:**
- `astra_notifications`: Any authenticated user could create notifications for any other user (WITH CHECK was `true`)
- `workshop_registrations`: Any authenticated user could register on behalf of any other user

**Solution:**
- `astra_notifications`: Replace INSERT policy with ownership check `auth.uid() = user_id`
- `workshop_registrations`: Replace INSERT policy with ownership check `auth.uid() = user_id`

**Rollback:**
```sql
DROP POLICY IF EXISTS "Users create own notifications" ON astra_notifications;
CREATE POLICY "System creates notifications" ON astra_notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users register themselves for workshops" ON workshop_registrations;
CREATE POLICY "Allow insert for new registrations" ON workshop_registrations FOR INSERT TO authenticated WITH CHECK (true);
```

---

### Fix 6: Add validation to anonymous INSERT policies

**Tables:** `moonshot_email_sequence`, `moonshot_invite_codes`, `moonshot_registrations`, `moonshot_survey_responses`, `preview_requests`

**Problem:** Anonymous inserts had `WITH CHECK (true)` -- no validation at all.

**Solution:** Add basic field validation:
- `moonshot_email_sequence`: Require registration_id to not be null
- `moonshot_invite_codes`: Require code to not be null
- `moonshot_registrations`: Require email to not be null/empty
- `moonshot_survey_responses`: Require registration_id to not be null
- `preview_requests`: Require email to not be null/empty

**Rollback:** Replace WITH CHECK with `true` on each policy.

---

### Fix 7: Remove duplicate policies on `gmail_auth`

**Table:** `gmail_auth`

**Problem:** Duplicate policies existed for every operation (SELECT, INSERT, UPDATE, DELETE) -- one using `auth.uid()` directly and one using `(SELECT auth.uid())`. This is redundant and confusing.

**Solution:** Drop the lowercase-named duplicates that use `(SELECT auth.uid())`.

**Policies Dropped:**
- "Users can delete own gmail auth"
- "Users can insert own gmail auth"
- "Users can update own gmail auth"
- "Users can view own gmail auth"

**Rollback:**
```sql
CREATE POLICY "Users can delete own gmail auth" ON gmail_auth FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own gmail auth" ON gmail_auth FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own gmail auth" ON gmail_auth FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can view own gmail auth" ON gmail_auth FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
```

---

### Fix 8: Change `{public}` to `{authenticated}` role

**Tables:** `document_chunks`, `team_members`

**Problem:** Policies were granted to `{public}` role instead of `{authenticated}`. While the USING clauses checked `auth.uid()` (which would be null for anonymous), it's better practice to explicitly restrict to authenticated role.

**Solution:** Drop `{public}` policies and recreate as `{authenticated}`.

**Rollback:**
```sql
-- document_chunks
DROP POLICY IF EXISTS "Team members can access own team documents" ON document_chunks;
CREATE POLICY "Users can access own team documents" ON document_chunks FOR ALL TO public
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

-- team_members
DROP POLICY IF EXISTS "Admins can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Users can view their own team members" ON team_members;
CREATE POLICY "Admins can manage team members" ON team_members FOR ALL TO public
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Users can view their team members" ON team_members FOR SELECT TO public
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));
```

---

### Fix 9: Centralize admin email management

**Problem:** Admin emails are hardcoded across dozens of RLS policies with inconsistent lists. Some policies reference `@rockethub.ai`, others `@astraintelligence.io`, others `@rockethub.co`, etc.

**Solution:** Update the existing `is_super_admin()` function to include all admin emails from across the codebase, so future policies can use `is_super_admin()` instead of inline email arrays. This is a non-breaking change -- existing inline policies continue to work but new policies should use the function.

**Current admin emails found across policies:**
- clay@rockethub.ai
- nick@rockethub.ai
- derek@rockethub.ai
- marshall@rockethub.ai
- hello@rockethub.ai
- tj@rockethub.ai
- mike@rockethub.ai
- clay.rumbaugh@gmail.com
- clay@healthrocket.life
- hydramaxxclean@gmail.com
- clay@allective.com
- allective@gmail.com
- trent@allective.com
- stephen@allective.com
- luke@astraintelligence.io
- connor@astraintelligence.io
- clay@astraintelligence.io

**Rollback:**
```sql
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  RETURN user_email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## Edge Function: `auth-preflight-check`

**Purpose:** Replaces direct anonymous database queries in the registration flow with a secure server-side function that uses service_role.

**Actions supported:**
- `check-email` - Check if a user exists by email (replaces anonymous SELECT on users)
- `lookup-team-name` - Get team name by ID (replaces anonymous SELECT on teams)
- `check-moonshot-registration` - Check if a moonshot registration exists by email
- `check-moonshot-team-registered` - Check if a team is registered for moonshot

**Frontend files updated:**
- `src/components/CustomAuth.tsx` - Uses edge function for email existence check and team name lookup
- `src/components/MoonshotRegistrationPage.tsx` - Uses edge function for registration lookup when anonymous

**JWT Verification:** Disabled (public endpoint needed for pre-auth flows)

**Rollback:** Revert the anonymous RLS policies to allow direct queries again (see Fix 3 rollback above), then remove the edge function calls from CustomAuth.tsx and MoonshotRegistrationPage.tsx.

---

## Migration: `add_moonshot_registration_anon_update_policy`

**Purpose:** The moonshot registration flow allows anonymous users to update their existing registration (e.g., re-register with updated info). After blocking anonymous SELECT, the update flow still needs to work.

**Policy Added:** "Anonymous can update own registration by email" on moonshot_registrations FOR UPDATE TO anon

**Rollback:**
```sql
DROP POLICY IF EXISTS "Anonymous can update own registration by email" ON moonshot_registrations;
```

---

## Risk Assessment

| Fix | Risk Level | Could Break | Mitigation |
|-----|-----------|-------------|------------|
| Fix 1 | MEDIUM | Edge functions using service_role key should work. Frontend reads of app_config could break. | Added authenticated SELECT for app_config. |
| Fix 2 | LOW | Only affects direct scan_queue access. n8n/edge functions use service_role. | Service role policy added. |
| Fix 3 | HIGH | Registration flow needs anonymous email check. Cross-team user lookups may break. | Created `auth-preflight-check` edge function. Anonymous policies now block direct access. Monitor auth flow. |
| Fix 4 | LOW | Only edge functions should write RBG scores. | Service role policy covers edge functions. |
| Fix 5 | MEDIUM | If system/edge functions create notifications for users, they use service_role and are unaffected. | Service role bypasses RLS. |
| Fix 6 | LOW | Registration forms already provide required fields. | Only adds null checks. |
| Fix 7 | LOW | Removes redundant duplicates only. | Original policies remain. |
| Fix 8 | LOW | Policies already check auth.uid() internally. | Functionally equivalent. |
| Fix 9 | LOW | Only updates the helper function. | Non-breaking, additive change. |
