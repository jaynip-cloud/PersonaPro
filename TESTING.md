# Testing Authentication

## Sign Up & Sign In Flow

### Testing Sign Up

1. Navigate to `http://localhost:5173` (will redirect to `/auth/signin`)
2. Click "Sign up for free" link
3. Enter email and password (6+ characters)
4. Click "Create Account"

**Expected behavior:**
- Console logs will show the sign-up process
- If successful: Green success message → Auto-redirect to `/onboarding`
- If error: Red error message with details

### Common Issues

#### Email Confirmation Enabled
If Supabase has email confirmation enabled:
- User account is created but NO session is returned
- User must check email and click confirmation link
- After confirmation, user can sign in normally

**To disable email confirmation (for testing):**
1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Toggle "Enable email confirmations" to OFF
4. Save changes

#### Database RLS Policies
The following must succeed:
1. Insert into `organizations` table ✓
2. Insert into `memberships` table ✓
3. Insert into `org_onboarding_state` table ✓

**Check console logs:**
- `authService.signUp called with email: ...`
- `User created: [uuid] Session exists: true/false`
- `Creating placeholder organization...`
- `Placeholder org created: [uuid]`

### Troubleshooting

**Check browser console** for detailed logs:
```javascript
// Expected console output on successful sign-up:
Starting sign up process...
authService.signUp called with email: test@example.com
Supabase signUp response: { data: {...}, error: null }
User created: abc-123 Session exists: true
Creating placeholder organization...
Placeholder org created: def-456
Sign up successful, redirecting to onboarding...
```

**If sign-up fails:**
1. Check console for error messages
2. Verify Supabase connection (check .env file)
3. Check if email confirmation is required
4. Verify RLS policies allow inserts
5. Check for existing account with same email

### Manual Testing via Supabase

You can also create users directly in Supabase:

1. Go to Supabase Dashboard
2. Authentication → Users
3. Click "Add User"
4. Enter email and password
5. Save

Then sign in normally via the app.

## Current Setup

- **SSO**: Disabled (email/password only)
- **Email Confirmation**: Check Supabase settings
- **RLS**: Enabled on all tables
- **Auto-redirect**: Sign-up → Onboarding → Dashboard
