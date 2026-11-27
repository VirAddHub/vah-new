// apps/backend/src/config/integrations.ts
import { identityProviderStatus } from '../server/services/identityVerification';

export function getIntegrationStatus() {
    return {
        stripe: { configured: Boolean((process.env.STRIPE_SECRET_KEY || '').trim() && (process.env.STRIPE_WEBHOOK_SECRET || '').trim()) },
        identity_verification: { configured: identityProviderStatus().connected },
        companies_house: { configured: Boolean((process.env.COMPANIES_HOUSE_API_KEY || '').trim()) },
    };
}
