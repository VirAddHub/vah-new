// apps/backend/src/lib/email-flags.ts
export const EMAIL_ONBOARDING = process.env.EMAIL_ONBOARDING !== "0";
export const EMAIL_BILLING = process.env.EMAIL_BILLING !== "0";
export const EMAIL_KYC = process.env.EMAIL_KYC !== "0";
export const EMAIL_MAIL = process.env.EMAIL_MAIL !== "0";
export const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT !== "0";
export const EMAIL_SECURITY = process.env.EMAIL_SECURITY !== "0";
