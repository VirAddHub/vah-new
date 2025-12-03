// src/lib/notify.ts - Notification helpers for admin actions

export async function postSlack(text: string): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
        console.log('[notify] Slack webhook not configured, skipping:', text);
        return;
    }

    try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        console.log('[notify] Slack notification sent:', text);
    } catch (error) {
        console.error('[notify] Failed to send Slack notification:', error);
    }
}

export async function sendOpsEmail({ subject, text }: { subject: string; text: string }): Promise<void> {
    // Note: This function is currently not implemented (just logs)
    // If implemented, it should use SUPPORT_EMAIL, not ops@
    // ops@virtualaddresshub.co.uk is for private admin logins, not email notifications
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.OPS_ALERT_EMAIL || 'support@virtualaddresshub.co.uk';
    
    if (!supportEmail) {
        console.log('[notify] Support email not configured, skipping:', subject);
        return;
    }

    // TODO: Hook into your Postmark mailer (use sendSimpleEmail from services/mailer)
    // For now, just log the email that would be sent
    console.log('[notify] Support email would be sent:', { to: supportEmail, subject, text });

    // Example implementation with Postmark mailer:
    // import { sendSimpleEmail } from '../services/mailer';
    // await sendSimpleEmail({
    //     to: supportEmail,
    //     subject,
    //     textBody: text,
    //     from: ENV.EMAIL_FROM,
    //     replyTo: ENV.EMAIL_REPLY_TO,
    // });
}

export async function notifyUserDeleted(adminId: string, targetUserId: string, targetEmail: string): Promise<void> {
    const slackMessage = `🗑️ Admin deleted user ${targetEmail} (id ${targetUserId})`;
    const emailSubject = `User deleted: ${targetEmail} (id ${targetUserId})`;
    const emailText = `Admin ${adminId} deleted user ${targetEmail} (id ${targetUserId}).`;

    // Send notifications in parallel (fire-and-forget)
    Promise.all([
        postSlack(slackMessage),
        sendOpsEmail({ subject: emailSubject, text: emailText })
    ]).catch(error => {
        console.error('[notify] Failed to send user deletion notifications:', error);
    });
}
