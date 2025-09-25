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
    if (!process.env.OPS_EMAIL) {
        console.log('[notify] Ops email not configured, skipping:', subject);
        return;
    }

    // TODO: Hook into your nodemailer or email provider
    // For now, just log the email that would be sent
    console.log('[notify] Ops email would be sent:', { subject, text });
    
    // Example implementation with nodemailer:
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransporter({
    //     // your email config
    // });
    // await transporter.sendMail({
    //     to: process.env.OPS_EMAIL,
    //     subject,
    //     text
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
