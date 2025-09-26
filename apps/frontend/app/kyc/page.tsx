import { KYCPolicyPage } from '@/components/KYCPolicyPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function KYC() {
    const handleNavigate = (page: string) => {
        // Handle navigation - in a real app this would use Next.js router
        console.log('Navigate to:', page);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <KYCPolicyPage onNavigate={handleNavigate} />
            </main>
            <Footer />
        </div>
    );
}
