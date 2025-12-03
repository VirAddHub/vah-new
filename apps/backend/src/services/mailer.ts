const postmark = require("postmark");
import { ENV } from "../env";

const PM_TOKEN = process.env.POSTMARK_TOKEN || "";
const DEV_EMAIL_OVERRIDE = process.env.DEV_EMAIL_OVERRIDE || ""; // optional
const DEFAULT_STREAM = "outbound";

export enum Templates {
    QuizDay0 = "quiz-day0",
}

// Shared singleton client
let _client: any | null = null;
function getClient(): any | null {
    if (!_client && PM_TOKEN) {
        try {
            _client = new postmark.ServerClient(PM_TOKEN);
        } catch (err) {
            console.warn("[mailer] Failed to initialize Postmark client:", err);
            return null;
        }
    }
    return _client;
}

type SendTemplateArgs = {
    to: string;
    alias?: Templates | string;     // prefer alias
    templateIdFallback?: number;    // numeric TemplateId fallback
    model: Record<string, unknown>;
    stream?: string;
    from?: string;
    replyTo?: string;
};

type SendSimpleArgs = {
    to: string;
    subject: string;
    htmlBody?: string;
    textBody?: string;
    stream?: string;
    from?: string;
    replyTo?: string;
};

function resolveRecipient(to: string): string {
    // Route to override in non-production to protect real users
    if (process.env.NODE_ENV !== "production" && DEV_EMAIL_OVERRIDE) {
        return DEV_EMAIL_OVERRIDE;
    }
    return to;
}

export async function sendTemplateEmail({
    to,
    alias,
    templateIdFallback,
    model,
    stream = DEFAULT_STREAM,
    from = "hello@virtualaddresshub.co.uk",
    replyTo = "support@virtualaddresshub.co.uk",
}: SendTemplateArgs): Promise<"template" | "templateId" | "fallback"> {
    const recipient = resolveRecipient(to);
    const client = getClient();
    if (!client) {
        console.warn("[mailer] Postmark client not initialized, using fallback");
        // Still send plain fallback even if client is missing
        const subject = `Your Business Address Compliance Score: ${model?.["score"] ?? ""}`;
        const text =
            `Hi ${model?.["name"] ?? "there"},\n\n` +
            `Thanks for completing the Business Address Compliance Check.\n` +
            `Your Compliance Score: ${model?.["score"] ?? "—"} / 100\n` +
            `Category: ${model?.["segment_label"] ?? "—"}\n\n` +
            `${model?.["intro_text"] ?? ""}\n\n` +
            `Next step: ${model?.["cta_label"] ?? "View details"} → ${model?.["cta_url"] ?? "https://virtualaddresshub.co.uk/pricing"}\n\n` +
            (model?.["has_booking"] ? `Prefer to talk? Book here: ${model?.["booking_url"]}\n\n` : "") +
            `— VirtualAddressHub\nhttps://virtualaddresshub.co.uk\n`;
        console.info("[mailer] plain fallback (no client)", { recipient, mode: "fallback" });
        return "fallback";
    }

    // Try alias first
    if (alias) {
        try {
            await client.sendEmailWithTemplate({
                From: from,
                To: recipient,
                TemplateAlias: String(alias),
                TemplateModel: model,
                MessageStream: stream,
                ReplyTo: replyTo,
                TrackOpens: true,
                TrackLinks: "HtmlAndText",
            });
            console.info("[mailer] sent via template alias", { alias, recipient, mode: "template" });
            return "template";
        } catch (err: any) {
            console.warn("[mailer] alias send failed, will try TemplateId fallback", {
                alias,
                err: err?.message || String(err),
            });
        }
    }

    // Then numeric TemplateId (your saved ID)
    if (templateIdFallback) {
        try {
            await client.sendEmailWithTemplate({
                From: from,
                To: recipient,
                TemplateId: templateIdFallback,
                TemplateModel: model,
                MessageStream: stream,
                ReplyTo: replyTo,
                TrackOpens: true,
                TrackLinks: "HtmlAndText",
            });
            console.info("[mailer] sent via template id", { templateIdFallback, recipient, mode: "templateId" });
            return "templateId";
        } catch (err: any) {
            console.warn("[mailer] TemplateId send failed, will use plain fallback", {
                templateIdFallback,
                err: err?.message || String(err),
            });
        }
    }

    // Final plain-text fallback to never block the flow
    const subject = `Your Business Address Compliance Score: ${model?.["score"] ?? ""}`;
    const text =
        `Hi ${model?.["name"] ?? "there"},\n\n` +
        `Thanks for completing the Business Address Compliance Check.\n` +
        `Your Compliance Score: ${model?.["score"] ?? "—"} / 100\n` +
        `Category: ${model?.["segment_label"] ?? "—"}\n\n` +
        `${model?.["intro_text"] ?? ""}\n\n` +
        `Next step: ${model?.["cta_label"] ?? "View details"} → ${model?.["cta_url"] ?? "https://virtualaddresshub.co.uk/pricing"}\n\n` +
        (model?.["has_booking"] ? `Prefer to talk? Book here: ${model?.["booking_url"]}\n\n` : "") +
        `— VirtualAddressHub\nhttps://virtualaddresshub.co.uk\n`;

    await sendSimpleEmail({
        to: recipient,
        subject,
        textBody: text,
        stream,
        from,
        replyTo,
    });
    console.info("[mailer] sent via plain fallback", { recipient, mode: "fallback" });
    return "fallback";
}

export async function sendSimpleEmail({
    to,
    subject,
    htmlBody,
    textBody,
    stream = DEFAULT_STREAM,
    from = "hello@virtualaddresshub.co.uk",
    replyTo = "support@virtualaddresshub.co.uk",
}: SendSimpleArgs): Promise<void> {
    const recipient = resolveRecipient(to);
    const client = getClient();
    if (!client) {
        console.warn("[mailer] Postmark client not initialized, skipping email");
        return;
    }
    await client.sendEmail({
        From: from,
        To: recipient,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: stream,
        ReplyTo: replyTo,
        TrackOpens: true,
        TrackLinks: "HtmlAndText",
    });
}

// Mailroom expiry reminder email
export interface MailroomExpiryMailItem {
    id: number;
    user_id: number;
    user_name: string | null;
    user_email: string | null;
    company_name: string | null;
    received_at_ms: number;
    tag: string | null;
    sender_name: string | null;
    subject: string | null;
    file_name: string | null;
}

export async function sendMailroomExpiryReminder(
    item: MailroomExpiryMailItem
): Promise<void> {
    const receivedDate = new Date(item.received_at_ms).toISOString().slice(0, 10);

    // Format company name: use "N/A" if empty (option D from user request)
    const companyName = item.company_name?.trim() || "N/A";

    // Build email body using exact template provided
    const textBody = [
        "A mail item has now reached the end of its 30-day secure retention period",
        "and must be removed from physical storage.",
        "",
        `Mail ID: ${item.id}`,
        `User ID: ${item.user_id}`,
        `User Name: ${item.user_name ?? "Unknown"}`,
        `Company Name: ${companyName}`,
        `User Email: ${item.user_email ?? "Unknown"}`,
        "",
        `Filename: ${item.file_name ?? item.subject ?? "N/A"}`,
        `Subject: ${item.subject ?? "N/A"}`,
        `Tag: ${item.tag ?? "N/A"}`,
        `Received Date: ${receivedDate}`,
        "",
        "⚠️ ACTION REQUIRED – SECURE DESTRUCTION",
        " - Locate this physical mail item in storage for the above user/company",
        " - Confirm the user has the scanned digital copy (uploaded to dashboard)",
        " - Destroy the envelope securely using cross-cut shredder (SOP)",
        " - Log destruction in admin system (if applicable)",
        "",
        "🛡️ COMPLIANCE NOTES:",
        " - 30-day GDPR retention limit reached",
        " - Mail no longer eligible for forwarding",
        " - Digital scan remains accessible to the user in their dashboard",
        "",
        "This message is generated automatically by the mail expiry system.",
    ].join("\n");

    await sendSimpleEmail({
        to: ENV.MAILROOM_EMAIL,
        from: ENV.EMAIL_FROM,
        replyTo: ENV.EMAIL_REPLY_TO,
        subject: `⚠️ Mail Expiry – Secure Destruction Required (Mail ID ${item.id})`,
        textBody,
    });
}

