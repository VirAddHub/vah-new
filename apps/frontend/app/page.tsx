export const dynamic = 'force-dynamic';
export const revalidate = false;

import { NavigationProvider } from '@/contexts/NavigationContext';
import { App } from '@/components/App';

export default function Home() {
    return (
        <NavigationProvider>
            <App />
        </NavigationProvider>
    );
}
