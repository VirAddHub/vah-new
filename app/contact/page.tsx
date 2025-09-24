import { ContactPage } from '@/components/ContactPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Contact() {
    const handleNavigate = (page: string) => {
        // Handle navigation - in a real app this would use Next.js router
        console.log('Navigate to:', page);
        if (page === 'home') {
            window.location.href = '/';
        } else {
            window.location.href = `/${page}`;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <ContactPage onNavigate={handleNavigate} />
            </main>
            <Footer />
        </div>
    );
}
