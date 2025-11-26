/**
 * Postmark Notifications for Ops
 * 
 * Sends operational notifications to ops team via Postmark.
 * 
 * Environment variables:
 * - POSTMARK_TOKEN (required)
 * - OPS_ALERT_EMAIL (optional, defaults to ops@virtualaddresshub.co.uk)
 */

import { sendSimpleEmail } from './mailer';

const OPS_EMAIL = process.env.OPS_ALERT_EMAIL || 'ops@virtualaddresshub.co.uk';

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
}): Promise<void> {
  try {
    const subject = `New mail on dashboard (ID: ${payload.mailId})`;
    const textBody = [
      'A new mail item has been created and is now visible on the user dashboard.',
      '',
      `Mail ID: ${payload.mailId}`,
      `User ID: ${payload.userId}`,
      payload.subject ? `Subject: ${payload.subject}` : '',
      payload.tag ? `Tag: ${payload.tag}` : '',
      '',
      '✅ This mail item is confirmed to be in the database and visible on the user dashboard.',
      'You can log in to VirtualAddressHub to review this item.',
    ]
      .filter(Boolean)
      .join('\n');

    await sendSimpleEmail({
      to: OPS_EMAIL,
      subject,
      textBody,
      from: 'hello@virtualaddresshub.co.uk',
      replyTo: 'support@virtualaddresshub.co.uk',
    });

    console.log(`[postmarkNotifications] ✅ Sent mail-created notification to ${OPS_EMAIL} for mailId=${payload.mailId} (user ${payload.userId})`);
  } catch (err) {
    console.error('[postmarkNotifications] ❌ Failed to send mail-created notification:', err);
    // Do not throw; mail creation should not be rolled back because of email failure
  }
}

