import type { Metadata } from 'next';

import { NavigationProvider } from '@/contexts/NavigationContext';
import { App } from '@/components/App';
import { getServerPricing } from '@/lib/pricing.server';

export const metadata: Metadata = {
    title: 'London Virtual Office & Business Address | VirtualAddressHub',
    description: 'One London address for your business, registered office and director correspondence, with digital mail management. Explore monthly and annual plans.',
    alternates: { canonical: '/' },
};

// Trigger Vercel deployment

export default async function Home() {
    const initialPricing = await getServerPricing();
    return (
        <NavigationProvider>
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:'VirtualAddressHub',url:'https://virtualaddresshub.co.uk'}).replace(/</g,'\\u003c')}}/>
            <App initialPricing={initialPricing} />
        </NavigationProvider>
    );
}
