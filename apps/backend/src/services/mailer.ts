const postmark = require("postmark");

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

