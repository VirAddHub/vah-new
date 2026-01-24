'use client';

import MailInboxPage from './mail/page-content';

// Force dynamic rendering - this page uses client components and context
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    return <MailInboxPage />;
}
