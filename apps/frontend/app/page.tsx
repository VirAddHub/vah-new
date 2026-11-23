import type { Metadata } from 'next';

import { NavigationProvider } from '@/contexts/NavigationContext';
import { App } from '@/components/App';
import { getServerPricing } from '@/lib/pricing.server';

export const metadata: Metadata = {
    alternates: { canonical: '/' },
};

// Trigger Vercel deployment

export default async function Home() {
    const initialPricing = await getServerPricing();
    return (
        <NavigationProvider>
            <App initialPricing={initialPricing} />
        </NavigationProvider>
    );
}
