import { CookiePolicyPage } from '@/components/CookiePolicyPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Cookies() {
    const handleNavigate = (page: string) => {
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
                <CookiePolicyPage onNavigate={handleNavigate} />
            </main>
            <Footer />
        </div>
    );
}

