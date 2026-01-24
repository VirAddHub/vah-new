export const dynamic = 'force-dynamic';

import { NavigationProvider } from '@/contexts/NavigationContext';
import { App } from '@/components/App';

// Trigger Vercel deployment

export default function Home() {
    return (
        <NavigationProvider>
            <App />
        </NavigationProvider>
    );
}
