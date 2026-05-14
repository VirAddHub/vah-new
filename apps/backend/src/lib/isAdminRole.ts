/**
 * Single source of truth for which role strings grant admin access on the backend.
 *
 * Import this wherever you need to check whether a `role` string is admin-level —
 * so adding a new privileged role never requires hunting down scattered string comparisons.
 *
 * Mirrors: apps/frontend/lib/verifiedAdminSession.ts → isAdminRole
 */
export function isAdminRole(role?: string | null): boolean {
  if (typeof role !== 'string') return false;
  const r = role.toLowerCase();
  return r === 'admin' || r === 'owner';
}
