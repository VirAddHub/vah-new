# Password Reset Fix

## Issue

The password reset endpoint was returning HTTP 200, but emails were not being sent. The problem was:

1. **Hardcoded template alias**: The code was using the string literal `'password-reset-email'` instead of the `Templates.PasswordReset` enum value
2. **Silent error handling**: Errors were being caught but not logged with sufficient detail
3. **Multiple implementations**: There were 3 different implementations of the reset password endpoint

## Fix Applied

### 1. Updated All Reset Password Routes

Fixed the following files to use the `Templates` enum:

- `apps/backend/src/server/routes/profile/reset-password-request.ts`
- `apps/backend/src/server/routes/profile/password-reset.ts`
- `apps/backend/src/server/routes/profile.password-reset.ts`

**Changes:**
- Added `import { Templates } from '../../../lib/postmark-templates';`
- Changed `templateAlias: 'password-reset-email'` to `templateAlias: Templates.PasswordReset`
- Enhanced error logging to include full error details

### 2. Enhanced Error Logging

Previously, errors were silently caught:
```typescript
catch (e) { console.error('[reset] email', e.message); }
```

Now logs include full context:
```typescript
catch (e) {
  console.error('[reset] email send failed:', {
    message: e.message,
    stack: e.stack,
    email: user.email,
    templateAlias: Templates.PasswordReset,
  });
}
```

## Root Cause

The endpoint uses a **fire-and-forget** pattern:
1. Returns HTTP 200 immediately (to prevent user enumeration)
2. Processes email sending asynchronously in `queueMicrotask`
3. Errors are caught silently to avoid leaking information

However, if the Postmark template alias doesn't match exactly, the email will fail silently. The fix ensures:
- Type-safe template references using the `Templates` enum
- Better error logging for debugging
- Consistent implementation across all routes

## Testing

After deploying, check Render logs for:
- `[reset] email send failed:` - indicates email sending issues
- `Failed to send template email password-reset-email:` - Postmark API errors
- Successful email sends should appear in Postmark webhook logs

## Verification

1. Request a password reset
2. Check Render logs for email send errors
3. Verify Postmark template exists with alias `password-reset-email`
4. Check Postmark delivery logs for the email

## Next Steps

If emails still fail after this fix:
1. Verify `POSTMARK_TOKEN` is set in Render environment
2. Verify `password-reset-email` template exists in Postmark
3. Check Postmark API logs for specific error messages
4. Verify `APP_BASE_URL` is set correctly for reset links

