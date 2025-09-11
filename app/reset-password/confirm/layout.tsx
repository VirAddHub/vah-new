// app/reset-password/confirm/layout.tsx
import { Suspense } from 'react';

export default function ResetPasswordConfirmLayout({ children }: { children: React.ReactNode }) {
    // Suspense boundary required when a child uses useSearchParams/usePathname
    return <Suspense fallback={null}>{children}</Suspense>;
}
