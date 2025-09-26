import { PrivacyPolicyPage } from '@/components/PrivacyPolicyPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Privacy() {
    const handleNavigate = (page: string) => {
        // Handle navigation - in a real app this would use Next.js router
        console.log('Navigate to:', page);
        if (page === 'contact') {
            window.location.href = '/contact';
        } else if (page === 'home') {
            window.location.href = '/';
        } else {
            window.location.href = `/${page}`;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <PrivacyPolicyPage onNavigate={handleNavigate} />
            </main>
            <Footer />
        </div>
    );
}
