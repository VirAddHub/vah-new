// Force dynamic rendering for all API routes
// API routes should never be statically generated as they need request context
export const dynamic = 'force-dynamic';

export default function APILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
