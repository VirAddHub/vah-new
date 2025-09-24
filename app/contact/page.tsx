import ContactPage from '@/components/ContactPage';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function ContactRoute() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <ContactPage />
            </main>
            <Footer />
        </div>
    );
}
