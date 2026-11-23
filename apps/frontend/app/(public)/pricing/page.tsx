import { getServerPricing } from '@/lib/pricing.server';
import PricingPageClient from './pricing-page-client';

export const revalidate = 60;

export default async function PricingPage() {
  const initialPricing = await getServerPricing();
  return <PricingPageClient initialPricing={initialPricing} />;
}
