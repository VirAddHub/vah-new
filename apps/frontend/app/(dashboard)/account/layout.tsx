'use client';

// Account layout now uses the global dashboard layout
// No need for separate navigation - it's in the global sidebar
export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
