// Feature flags for integrations
export const FEATURES = {
  gocardless: process.env.NEXT_PUBLIC_FEATURE_GOCARDLESS === "true",
  sumsub: process.env.NEXT_PUBLIC_FEATURE_SUMSUB === "true",
};

// API helper for handling 501 responses
export function isNotImplemented(e: any) {
  return e?.response?.status === 501;
}

// Check if a feature is available
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}