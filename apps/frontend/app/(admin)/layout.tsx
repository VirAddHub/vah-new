// Force dynamic rendering for all pages in (admin) route group
// These pages require authentication and cannot be statically generated
export const dynamic = 'force-dynamic';

export default function AdminRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
