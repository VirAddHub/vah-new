import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { PricingSection } from '@/components/PricingSection';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/Footer';

async function getPlans() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans`, { cache: 'no-store' });
    const json = await res.json();
    return json?.data ?? [];
  } catch { return []; }
}

export default async function HomePage() {
  const plans = await getPlans();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <PricingSection plans={plans} />
      </main>
      <Footer />
    </div>
  );
}
