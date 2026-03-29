/**
 * Canonical SWR keys for session-backed data. Use the same key everywhere
 * (fetch + mutate) so cache invalidation matches the dashboard.
 */
/** Single bundle: whoami + profile + compliance + billing overview (session-sensitive). */
export const DASHBOARD_BOOTSTRAP_KEY = '/api/bff/dashboard/bootstrap';

/** @deprecated Prefer mutating DASHBOARD_BOOTSTRAP_KEY after profile-changing actions. */
export const PROFILE_SWR_KEY = '/api/bff/profile';
