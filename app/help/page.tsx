import { HelpPage } from '@/components/HelpPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Help() {
    const handleNavigate = (page: string) => {
        // Handle navigation - in a real app this would use Next.js router
        console.log('Navigate to:', page);
    };

    const handleGoBack = () => {
        // Handle back navigation - in a real app this would use Next.js router
        window.history.back();
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <HelpPage onNavigate={handleNavigate} onGoBack={handleGoBack} />
            </main>
            <Footer />
        </div>
    );
}
