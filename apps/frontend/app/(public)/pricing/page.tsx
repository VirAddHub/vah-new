import type { Metadata } from 'next';
import { getServerPricing } from '@/lib/pricing.server';
import PricingPageClient from './pricing-page-client';

export const metadata: Metadata = {
    title: 'Pricing | VirtualAddressHub',
    description: 'One simple plan for a professional London business address: registered office and director service address, mail scanning and forwarding. Pay monthly or annually.',
    alternates: { canonical: '/pricing' },
    openGraph: { title: 'Pricing | VirtualAddressHub', url: '/pricing' },
};

export const revalidate = 60;

export default async function PricingPage() {
  const initialPricing = await getServerPricing();
  return <PricingPageClient initialPricing={initialPricing} />;
}
