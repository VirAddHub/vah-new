export const dynamic = 'force-dynamic';

import { NavigationProvider } from '@/contexts/NavigationContext';
import { App } from '@/components/App';
import { getServerPricing } from '@/lib/pricing.server';

// Trigger Vercel deployment

export default async function Home() {
    const initialPricing = await getServerPricing();
    return (
        <NavigationProvider>
            <App initialPricing={initialPricing} />
        </NavigationProvider>
    );
}
