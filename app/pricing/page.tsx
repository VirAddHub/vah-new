import { Card } from '@/components/ui/card';
import { PricingSection } from '@/components/PricingSection';
import { GovtFreeForwardingNote, GovtFreeForwardingFootnote } from '@/app/components/PricingExtras';

async function getPlans() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans`, { cache: 'no-store' });
        const json = await res.json();
        return json?.data ?? [];
    } catch { return []; }
}

export default async function PricingPage() {
    const plans = await getPlans();
    return (
        <>
            <PricingSection plans={plans} />
            <div className="py-20 max-w-6xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Compare Features</h2>
                <Card className="p-8 bg-white/5 border-white/10">
                    <div className="text-center text-gray-400">
                        Feature comparison table here…
                    </div>
                </Card>

                {/* Service note */}
                <div className="mt-12 text-center">
                    <GovtFreeForwardingNote />
                    <GovtFreeForwardingFootnote />
                    <p className="text-sm text-gray-500 mt-4">
                        All plans include secure mail handling and GDPR compliance.
                    </p>
                </div>
            </div>
        </>
    );
}
