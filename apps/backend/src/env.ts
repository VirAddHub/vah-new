// apps/backend/src/env.ts
export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  POSTMARK_TOKEN: process.env.POSTMARK_TOKEN ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "no-reply@example.com",
  // Feature flags / guards (stringy booleans: "1" | "true" → enabled)
  EMAIL_BILLING: process.env.EMAIL_BILLING ?? "1",
  EMAIL_KYC: process.env.EMAIL_KYC ?? "1",
  EMAIL_MAIL: process.env.EMAIL_MAIL ?? "1",
};

export const emailGuard = (flag?: string) => {
  const v = (flag ?? "").toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};
