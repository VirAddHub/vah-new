import { PlansPage } from '@/components/PlansPage';

export default function Pricing() {
    const handleNavigate = (page: string) => {
        // Handle navigation - you can enhance this with Next.js router later
        if (page === 'home') {
            window.location.href = '/';
        } else {
            window.location.href = `/${page}`;
        }
    };

    return <PlansPage onNavigate={handleNavigate} />;
}
