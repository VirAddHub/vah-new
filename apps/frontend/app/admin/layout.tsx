// Force dynamic rendering for all admin pages (they require authentication).
// Per-page gating: useVerifiedAdminSession → /api/bff/auth/whoami → backend DB-backed user (not AuthContext.is_admin or vah_user JSON).
// BFF: every /api/bff/admin/* route handler calls requireBffAdmin (same whoami source) before proxying to the API.
export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
