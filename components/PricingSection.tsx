'use client';
import { useMemo, useState } from "react";
import { PricingCard } from "@/components/PricingCard";
import type { Plan } from "@/types/plan";
import { centsToGBP } from "@/lib/money";
import Head from "next/head";

interface PricingSectionProps { plans: Plan[] }

function toLabel(v: string) {
    const s = (v || '').toString();
    if (!s) return 'Other';
    return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
}

export function PricingSection({ plans }: PricingSectionProps) {
    // Distinct intervals from data (e.g., month, year, quarter…)
    const intervals = useMemo(
        () => Array.from(new Set(plans.map(p => (p.interval || '').toLowerCase()).filter(Boolean))),
        [plans]
    );

    // Filter: "all" by default; can switch to any interval present
    const [filter, setFilter] = useState<string>('all');
    const visible = useMemo(() => {
        if (filter === 'all') return plans;
        return plans.filter(p => (p.interval || '').toLowerCase() === filter);
    }, [plans, filter]);

    // Layout: single plan centers; multi -> grid
    const single = visible.length === 1 ? visible[0] : null;

    return (
        <section className="py-20">
            <div className="max-w-6xl mx-auto px-4">
                {/* SEO: Product/Offer JSON-LD for visible plans */}
                <Head>
                    <script
                        type="application/ld+json"
                        // Basic product offers (GBP) for all visible plans
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "ItemList",
                                itemListElement: visible.map((p, i) => ({
                                    "@type": "Product",
                                    position: i + 1,
                                    name: p.name,
                                    description: p.description || "Virtual address plan",
                                    offers: {
                                        "@type": "Offer",
                                        priceCurrency: "GBP",
                                        price: (p.price_pence || 0) / 100,
                                        availability: "https://schema.org/InStock",
                                    },
                                })),
                            }),
                        }}
                    />
                </Head>
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold mb-3">
                        {plans.length === 1 ? "One simple plan" : "Simple, Transparent Pricing"}
                    </h2>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {plans.length === 1
                            ? "No hidden fees. Upgrade options can be added anytime."
                            : "Choose the plan that fits your needs. No hidden fees, no surprises."}
                    </p>
                </div>

                {/* Dynamic interval chips (All + any intervals found) */}
                {intervals.length > 0 && (
                    <div className="flex items-center justify-center flex-wrap gap-2 mb-8">
                        {['all', ...intervals].map(v => (
                            <button
                                key={v}
                                onClick={() => setFilter(v)}
                                className={`px-4 py-2 rounded-lg border text-sm transition ${filter === v ? "bg-green-600 text-white border-green-600" : "border-white/20 hover:border-white/40"
                                    }`}
                            >
                                {v === 'all' ? 'All' : toLabel(v)}
                            </button>
                        ))}
                    </div>
                )}

                {visible.length === 0 ? (
                    <div className="max-w-md mx-auto text-center text-gray-400">
                        <p className="mb-3">No plans are available right now.</p>
                        <p className="text-sm">Please check back soon.</p>
                    </div>
                ) : single ? (
                    <div className="max-w-md mx-auto">
                        <PricingCard
                            key={single.id}
                            name={single.name}
                            price={centsToGBP(single.price_pence)}
                            period={single.interval}
                            description={single.description || ""}
                            features={single.features || []}
                            popular
                            cta="Start Free Trial"
                            href="/(auth)/signup"
                        />
                    </div>
                ) : (
                    <div className={`grid gap-8 ${visible.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-5xl'} mx-auto`}>
                        {visible.map((plan, idx) => (
                            <PricingCard
                                key={plan.id}
                                name={plan.name}
                                price={centsToGBP(plan.price_pence)}
                                period={plan.interval}
                                description={plan.description || ""}
                                features={plan.features || []}
                                popular={idx === 1}
                                cta="Start Free Trial"
                                href="/(auth)/signup"
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
