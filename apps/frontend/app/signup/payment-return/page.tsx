import type { Metadata } from 'next';
import { PaymentReturnClient } from './PaymentReturnClient';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

export const metadata: Metadata = {
    title: 'Payment Complete | VirtualAddressHub',
    description: 'Your payment is being processed.',
};

export const dynamic = 'force-dynamic';

export default function PaymentReturnPage() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
                <PaymentReturnClient />
            </main>
            <FooterWithNav />
        </div>
    );
}
