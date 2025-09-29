// apps/backend/src/env.ts
export const ENV = {
  APP_BASE_URL: process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || "https://vah.app",
  EMAIL_BILLING: process.env.EMAIL_BILLING, // "1" to enable
  EMAIL_KYC: process.env.EMAIL_KYC,         // "1" to enable
  EMAIL_MAIL: process.env.EMAIL_MAIL,       // "1" to enable
  // ...existing envs
};

export const emailGuard = (flag?: string) => flag === "1" || flag?.toLowerCase() === "true";
