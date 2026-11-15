// apps/backend/src/config/integrations.ts
import { isSumsubApiConfigured, isSumsubWebhookConfigured, resolveSumsubApiConfig } from '../lib/sumsubConfig';

export type SumsubConfig = {
    apiKey?: string;
    webhookSecret?: string;
    baseUrl?: string;
};

export const integrations = {
    sumsub: {
        apiKey: process.env.SUMSUB_API_KEY,
        webhookSecret: process.env.SUMSUB_WEBHOOK_SECRET,
        get baseUrl() {
            return resolveSumsubApiConfig()?.baseUrl ?? (process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com');
        },
    } as SumsubConfig,
};

export const isConfigured = {
    sumsub: () => Boolean(isSumsubApiConfigured() && isSumsubWebhookConfigured()),
};

export function getIntegrationStatus() {
    return {
        stripe: { configured: Boolean((process.env.STRIPE_SECRET_KEY || '').trim() && (process.env.STRIPE_WEBHOOK_SECRET || '').trim()) },
        sumsub: { configured: isConfigured.sumsub() },
    };
}
