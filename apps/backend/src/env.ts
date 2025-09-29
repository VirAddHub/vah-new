// apps/backend/src/env.ts
export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "production",
  APP_BASE_URL: process.env.APP_BASE_URL ?? "https://virtualaddresshub.co.uk",
  POSTMARK_TOKEN: process.env.POSTMARK_TOKEN ?? "",
  EMAIL_FROM: process.env.POSTMARK_FROM ?? "hello@virtualaddresshub.co.uk",
  EMAIL_FROM_NAME: process.env.POSTMARK_FROM_NAME ?? "VirtualAddressHub",
  EMAIL_REPLY_TO: process.env.POSTMARK_REPLY_TO ?? "support@virtualaddresshub.co.uk",
  POSTMARK_STREAM: process.env.POSTMARK_STREAM ?? "outbound",

  // Feature flags / guards
  EMAIL_ONBOARDING: process.env.EMAIL_ONBOARDING ?? "1",
  EMAIL_BILLING: process.env.EMAIL_BILLING ?? "1",
  EMAIL_KYC: process.env.EMAIL_KYC ?? "1",
  EMAIL_MAIL: process.env.EMAIL_MAIL ?? "1",
  EMAIL_SUPPORT: process.env.EMAIL_SUPPORT ?? "1",
  EMAIL_SECURITY: process.env.EMAIL_SECURITY ?? "1",
};

export const emailGuard = (flag?: string) => {
  const v = (flag ?? "").toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};
