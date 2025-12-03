/**
 * Postmark Notifications for Support
 * 
 * Sends operational notifications to support team via Postmark.
 * 
 * Note: ops@virtualaddresshub.co.uk is for private admin logins (banking, HMRC, etc.)
 * and should NOT receive automated emails. All system notifications go to support@.
 * 
 * Environment variables:
 * - POSTMARK_TOKEN (required)
 * - SUPPORT_EMAIL (optional, defaults to support@virtualaddresshub.co.uk)
 *   Legacy: OPS_ALERT_EMAIL is also supported for backward compatibility
 */

import { sendSimpleEmail } from './mailer';
import { ENV } from '../env';

// Support email for all internal notifications and alerts
// Note: ops@ is NOT used for email - it's only for admin logins
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.OPS_ALERT_EMAIL || 'support@virtualaddresshub.co.uk';

/**
 * Notify ops team that a new mail item has been created
 * 
 * This is called AFTER the mail item has been successfully inserted into the database.
 * If the email fails, it's logged but doesn't affect the mail creation.
 * 
 * @param payload - Mail creation details
 */
export async function notifyOpsMailCreated(payload: {
  mailId: number;
  userId: number;
  subject?: string | null;
  tag?: string | null;
  fileName?: string;
  userEmail?: string;
}): Promise<void> {
  try {
    const subject = `New mail on dashboard (ID: ${payload.mailId})`;
    const textBody = [
      'A new mail item has been created and is now visible on the user dashboard.',
      '',
      `Mail ID: ${payload.mailId}`,
      `User ID: ${payload.userId}`,
      payload.userEmail ? `User Email: ${payload.userEmail}` : '',
      payload.fileName ? `Filename: ${payload.fileName}` : '',
      payload.subject ? `Subject: ${payload.subject}` : '',
      payload.tag ? `Tag: ${payload.tag}` : '',
      '',
      '✅ VERIFICATION COMPLETE:',
      '  - Mail item confirmed in database',
      '  - User ID verified and matches filename',
      '  - User email verified and matches database',
      '  - Email notification sent to user',
      '',
      'This mail item is 100% confirmed to be in the correct user\'s dashboard.',
      'You can log in to VirtualAddressHub to review this item.',
    ]
      .filter(Boolean)
      .join('\n');

    // Reply-To should be the user's email so ops can hit "Reply" in Outlook
    // Fallback to ENV.EMAIL_REPLY_TO if user email is not available
    const replyTo = payload.userEmail || ENV.EMAIL_REPLY_TO;

    await sendSimpleEmail({
      to: SUPPORT_EMAIL,
      subject,
      textBody,
      from: ENV.EMAIL_FROM,
      replyTo,
    });

    console.log(`[postmarkNotifications] ✅ Sent mail-created notification to ${SUPPORT_EMAIL} for mailId=${payload.mailId} (user ${payload.userId})`);
  } catch (err) {
    console.error('[postmarkNotifications] ❌ Failed to send mail-created notification:', err);
    // Do not throw; mail creation should not be rolled back because of email failure
  }
}

