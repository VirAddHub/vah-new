// Central config for frontend

// Public API base URL (set in Vercel Project → Environment Variables)
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://vah-api-staging.onrender.com"; // sensible default for staging

// Feature flags for integrations
export const FEATURES = {
  gocardless: process.env.NEXT_PUBLIC_FEATURE_GOCARDLESS === "true",
  sumsub: process.env.NEXT_PUBLIC_FEATURE_SUMSUB === "true",
};

// Helpers
export const IS_BROWSER = typeof window !== "undefined";

// API helper for handling 501 responses
export function isNotImplemented(e: any) {
  return e?.response?.status === 501;
}

// Check if a feature is available
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}