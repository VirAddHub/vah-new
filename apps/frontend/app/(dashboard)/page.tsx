'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import dynamic from 'next/dynamic';

// Dynamically import the page components with proper SSR disabled
const MailInboxPage = dynamic(() => import('./mail/page-content'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40C46C]"></div></div>
});

const ForwardingPage = dynamic(() => import('./forwarding/page-content'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40C46C]"></div></div>
});

const AccountOverviewPage = dynamic(() => import('./account/overview/page'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40C46C]"></div></div>
});

export default function DashboardPage() {
    const { activeView, setActiveView } = useDashboardView();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check URL params to set initial view
        const view = searchParams.get('view');
        if (view === 'mail' || view === 'forwarding') {
            setActiveView(view);
        } else if (!view) {
            // Default to mail if no view specified
            setActiveView('mail');
        }
    }, [searchParams, setActiveView]);

    // Render based on active view
    if (activeView === 'mail') {
        return <MailInboxPage />;
    } else if (activeView === 'forwarding') {
        return <ForwardingPage />;
    } else {
        // Default to account overview if no view is set
        return <AccountOverviewPage />;
    }
}
