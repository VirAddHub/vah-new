export type Integration = 'gocardless' | 'sumsub';
const env = (k: string) => process.env[k] || '';

export const integrations = {
    gocardless: {
        accessToken: env('GOCARDLESS_ACCESS_TOKEN'),
        webhookSecret: env('GOCARDLESS_WEBHOOK_SECRET'),
        environment: env('GOCARDLESS_ENV') || 'sandbox',
    },
    sumsub: {
        apiKey: env('SUMSUB_API_KEY'),
        webhookSecret: env('SUMSUB_WEBHOOK_SECRET'),
        baseUrl: env('SUMSUB_BASE_URL') || 'https://api.sumsub.com',
    },
};

export function isConfigured(name: Integration): boolean {
    const cfg = integrations[name];
    if (!cfg) return false;
    if (name === 'gocardless') return !!(cfg.accessToken && cfg.webhookSecret);
    if (name === 'sumsub') return !!(cfg.apiKey && cfg.webhookSecret);
    return false;
}
