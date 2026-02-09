# Admin User Invite System

## Overview

Admin users can create new user accounts directly from the User Settings modal. This system is designed for controlled user onboarding where the admin sets the initial credentials.

## Admin Access

**Admin User:** `clay@rockethub.ai`

Only this user can see and use the invite functionality.

## How to Invite a User

### Step 1: Access Settings
1. Log in as `clay@rockethub.ai`
2. Click your profile icon in the header
3. Select "Settings"

### Step 2: Invite New User
1. Scroll down to the "Admin: Invite New User" section
2. Enter the user's email address
3. Set a temporary password (minimum 6 characters recommended)
4. Click "Create User Account"

### Step 3: User Logs In
1. New user navigates to the login page
2. Uses the email and password you provided
3. Can immediately access the application
4. Should change their password after first login

## Technical Details

### Database Structure

**Table:** `admin_invites`
- Tracks all invite activity
- Stores invite status (pending, accepted, expired)
- Records who created the invite and when

### Edge Function

**Function:** `invite-user`
- URL: `${SUPABASE_URL}/functions/v1/invite-user`
- Method: POST
- Auth: Requires JWT token from admin user
- Creates user account via Supabase Admin API
- Automatically confirms email (no verification needed)

### Security

1. **Admin-Only Access:**
   - Only `clay@rockethub.ai` can create invites
   - RLS policies enforce this at database level
   - Edge function validates admin status

2. **User Creation:**
   - Uses Supabase Admin API with service role key
   - Email is auto-confirmed
   - Password requirements follow Supabase defaults

3. **Invite Tracking:**
   - All invites logged in `admin_invites` table
   - Status changes from 'pending' to 'accepted'
   - Prevents duplicate invites

## Example: Creating the First User

To create `clay@healthrocket.life`:

1. Log in as `clay@rockethub.ai`
2. Open Settings
3. In the Admin section:
   - Email: `clay@healthrocket.life`
   - Password: `[set secure password]`
4. Click "Create User Account"
5. Success message appears
6. New user can now log in immediately

## User Experience

### Admin View
- Green "Admin: Invite New User" section in Settings
- Simple form with email and password fields
- Clear success/error messages
- Loading state during account creation

### New User View
- Receives email and password from admin (out-of-band)
- Goes to login page
- Enters credentials
- Immediately gains access
- Should change password in Settings

## Error Handling

The system handles:
- Invalid email format
- Duplicate emails (user already exists)
- Duplicate pending invites
- Network errors
- Authentication errors

All errors display user-friendly messages in the UI.

## Migration Required

Before using this system, run the migration:
```
supabase/migrations/20251024000000_create_admin_invites_table.sql
```

This creates:
- `admin_invites` table
- RLS policies for admin access
- Helper function to expire old invites

## Future Enhancements

Potential improvements:
- Invite expiration for pending invites
- Bulk user import
- Email invitation templates
- Self-service signup with invite codes
- Multiple admin users
