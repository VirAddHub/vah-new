// apps/backend/src/lib/postmark.ts
import { sendTemplateEmail } from './mailer';
import { logger } from './logger';

export interface PostmarkEmailOptions {
    to: string;
    template: string;
    data: Record<string, any>;
}

export async function sendPostmarkEmail(options: PostmarkEmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
        await sendTemplateEmail({
            to: options.to,
            templateAlias: options.template as any,
            model: options.data
        });
        return { success: true };
    } catch (error: any) {
        logger.error('[postmark] Email send failed:', error);
        return { success: false, error: error.message };
    }
}
