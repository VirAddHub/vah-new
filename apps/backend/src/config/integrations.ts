// apps/backend/src/config/integrations.ts
export type GoCardlessConfig = {
    accessToken?: string;
    webhookSecret?: string;
    environment?: string; // "sandbox" | "live"
};

export type SumsubConfig = {
    apiKey?: string;
    webhookSecret?: string;
    baseUrl?: string;
};

export const integrations = {
    gocardless: {
        accessToken: process.env.GOCARDLESS_ACCESS_TOKEN,
        webhookSecret: process.env.GOCARDLESS_WEBHOOK_SECRET,
        environment: process.env.GOCARDLESS_ENV || "sandbox",
    } as GoCardlessConfig,

    sumsub: {
        apiKey: process.env.SUMSUB_API_KEY,
        webhookSecret: process.env.SUMSUB_WEBHOOK_SECRET,
        baseUrl: process.env.SUMSUB_BASE_URL || "https://api.sumsub.com",
    } as SumsubConfig,
};

export const isConfigured = {
    gocardless: () =>
        Boolean(integrations.gocardless.accessToken && integrations.gocardless.webhookSecret),

    sumsub: () =>
        Boolean(integrations.sumsub.apiKey && integrations.sumsub.webhookSecret),
};

export function getIntegrationStatus() {
    return {
        gocardless: { configured: isConfigured.gocardless() },
        sumsub: { configured: isConfigured.sumsub() },
    };
}
