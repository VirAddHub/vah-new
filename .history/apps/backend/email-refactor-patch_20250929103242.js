// Email Refactor Patch - Shows how to update sendTemplateEmail calls
// This demonstrates the pattern for updating all email calls in server.js.bak

// OLD PATTERN (hardcoded URLs):
/*
await sendTemplateEmail('password-reset-email', user.email, {
    first_name: user.first_name || '',
    reset_url: `${APP_URL}/reset-password?token=${token}`,
    expires_in_hours: 1,
});
*/

// NEW PATTERN (using cta_path):
/*
await sendTemplateEmail({
    to: user.email,
    templateAlias: Templates.PasswordReset,
    model: {
        first_name: user.first_name || '',
        expires_in_hours: 1,
    },
    cta_path: `/reset-password?token=${token}`
});
*/

// ===== SPECIFIC REFACTOR MAPPINGS =====

// 1. Password Reset (line 640)
// OLD: reset_url: `${APP_URL}/reset-password?token=${token}`
// NEW: cta_path: `/reset-password?token=${token}`

// 2. Password Changed (lines 669, 692)
// OLD: security_tips_url: `${APP_URL}/security`
// NEW: cta_path: `/profile#security`

// 3. Welcome Email (line 755)
// OLD: dashboard_url: APP_URL
// NEW: cta_path: `/dashboard`

// 4. Plan Cancelled (line 1198)
// OLD: reactivate_url: `${APP_URL}/billing`
// NEW: cta_path: `/billing#plan`

// 5. KYC Submitted (line 1215)
// OLD: help_url: `${APP_URL}/kyc`
// NEW: cta_path: `/profile`

// 6. Support Request Received (line 1256)
// OLD: view_url: `${APP_URL}/support/tickets/${info.lastInsertRowid}`
// NEW: cta_path: `/support`

// 7. Support Request Closed (line 1284)
// OLD: satisfaction_url: `${APP_URL}/support/feedback/${id}`
// NEW: cta_path: `/support`

// 8. KYC Approved (lines 1355, 1668)
// OLD: dashboard_url: APP_URL
// NEW: cta_path: `/dashboard`

// 9. KYC Rejected (lines 1361, 1674)
// OLD: retry_url: `${APP_URL}/kyc`
// NEW: cta_path: `/profile`

// 10. Mail After Cancellation (line 1443)
// OLD: options_url: `${APP_URL}/billing`
// NEW: cta_path: `/billing#plan`

// 11. Mail Scanned (line 1505)
// OLD: view_url: `${APP_URL}/mail/${id}`
// NEW: cta_path: `/mail`

// 12. Mail Forwarded (line 1565)
// OLD: help_url: APP_URL
// NEW: cta_path: `/forwarding`

// 13. Invoice Sent (line 1621)
// OLD: invoice_url: p.invoice_url || `${APP_URL}/billing`
// NEW: cta_path: `/billing#invoices`

// 14. Payment Failed (line 1633)
// OLD: fix_url: `${APP_URL}/billing`
// NEW: cta_path: `/billing#payment`

module.exports = {
    // This file shows the refactoring pattern
    // The actual implementation would update server.js.bak
};
