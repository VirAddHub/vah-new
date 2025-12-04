// apps/backend/src/config/auth.ts
// Session configuration for JWT-based authentication

export const SESSION_IDLE_TIMEOUT_MINUTES = 60;
export const SESSION_IDLE_TIMEOUT_SECONDS = SESSION_IDLE_TIMEOUT_MINUTES * 60;

// Refresh threshold: refresh token if less than this many seconds remain
export const SESSION_REFRESH_THRESHOLD_SECONDS = 15 * 60; // 15 minutes

