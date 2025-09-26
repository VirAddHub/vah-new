import { PlansPage } from '@/components/PlansPage';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Pricing() {
    const handleNavigate = (page: string) => {
        // Handle navigation - in a real app this would use Next.js router
        console.log('Navigate to:', page);
    };

    return <PlansPage onNavigate={handleNavigate} />;
}
