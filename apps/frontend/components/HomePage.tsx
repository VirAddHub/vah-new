'use client';

import { useState, useMemo, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { usePricing } from "@/hooks/usePlans";
import {
    ArrowRight,
    Mail,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { MailboxPreviewCard } from "./MailboxPreviewCard";
import HowItWorks from "./HowItWorks";
import Preview from "./Preview";

interface HomePageProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
    const handleNavClick = (page: string, data?: any) => onNavigate?.(page, data);
    const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

    // Use the pricing hook to get real-time data
    const {
        monthlyPrice,
        annualPrice,
        monthlySavingsPct,
        loading: pricingLoading,
        error: pricingError,
        hasApiData
    } = usePricing();

    const isAnnual = billing === "annual";

    // Load marketing data (health status)
    useEffect(() => {
        const loadData = async () => {
            try {
                const healthResponse = await apiClient.get('/api/health');
                if (healthResponse.ok) {
                    console.log('Health status:', healthResponse.data);
                }
            } catch (error) {
                console.error('Failed to load health data:', error);
            }
        };

        loadData();
    }, []);

    const priceLabel = isAnnual
        ? `£${annualPrice}`
        : `£${monthlyPrice}`;
    const priceSuffix = isAnnual ? "/year" : "/month";
    const subCopy = isAnnual
        ? "Billed annually · Cancel anytime"
        : "Billed monthly · Cancel anytime";
    const fineCopy = isAnnual
        ? `≈ £${(annualPrice / 12).toFixed(2)}/month · Save ${monthlySavingsPct}%`
        : `Prefer annual? £${annualPrice}/year (≈ £${(annualPrice / 12).toFixed(2)}/mo)`;

    const ctaText = "Get My London Address";

    const scrollTo = (id: string) =>
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

    return (
        <main id="main-content" role="main" className="bg-background text-foreground">
            {/* HERO */}
            <section
                className="relative overflow-hidden bg-[#0d4a3d] text-white"
                aria-label="Hero"
            >
                <div className="safe-pad mx-auto max-w-screen-xl pt-12 sm:pt-16 pb-16">
                    <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
                        {/* Left Section - Text Content */}
                        <div className="order-2 lg:order-1">
                            <h1 className="text-[clamp(2rem,5vw,3.5rem)] lg:text-5xl leading-[1.1] font-bold tracking-tight text-white">
                                A Credible London Business Address Without The Cost Of An Office.
                            </h1>
                            
                            <div className="mt-6 space-y-4 text-base lg:text-lg leading-relaxed text-white/95">
                                <p>
                                    Run your business professionally without exposing your home address.
                                </p>
                                <p>
                                    Use one trusted London address as your Registered Office, Director's Service Address, and professional business address.
                                </p>
                                <p>
                                    Suitable for Companies House, HMRC, and everyday business use.
                                </p>
                                <p>
                                    Everything you need is included in one simple service.
                                </p>
                            </div>

                            <div className="mt-8">
                                <p className="text-2xl lg:text-3xl font-bold text-white mb-1">
                                    £9.97 per month
                                </p>
                                <p className="text-sm lg:text-base text-white/80">
                                    with one clear plan
                                </p>
                            </div>

                            <div className="mt-8">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                    size="lg"
                                    className="bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold rounded-xl px-8 !h-14 text-base shadow-lg transition-all hover:scale-105"
                                >
                                    Get Your London Address
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Right Section - London Image */}
                        <div className="order-1 lg:order-2">
                            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden">
                                <img
                                    src="/images/london_skyline.png"
                                    alt="London architecture and cityscape"
                                    className="w-full h-full object-cover rounded-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section
                id="pricing"
                className="py-8 md:py-12 bg-muted/30"
                aria-label="Pricing"
            >
                <div className="safe-pad mx-auto max-w-4xl">
                    <div className="text-center mb-8">
                        <h2 className="mt-4 text-2xl font-semibold sm:text-3xl tracking-tight">
                            One Simple Plan. No Extras.
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base leading-snug">
                            Everything you need — one price.
                        </p>
                    </div>

                    {/* Billing Toggle */}
                    <div className="mb-6 flex justify-center">
                        <div className="inline-flex items-center rounded-xl border border-border bg-card p-1 shadow-sm overflow-visible relative">
                            <RadioGroup
                                defaultValue={billing}
                                className="grid grid-cols-2"
                                onValueChange={(v) =>
                                    setBilling(
                                        v === "annual" ? "annual" : "monthly",
                                    )
                                }
                            >
                                <div className="has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground rounded-lg transition-all">
                                    <RadioGroupItem
                                        id="billing-monthly"
                                        value="monthly"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="billing-monthly"
                                        className="peer-data-[state=checked]:text-primary-foreground peer-data-[state=unchecked]:text-muted-foreground px-6 py-3 font-semibold text-sm cursor-pointer inline-flex items-center transition-colors"
                                    >
                                        Monthly
                                    </Label>
                                </div>
                                <div className="has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground rounded-lg transition-all relative overflow-visible">
                                    <RadioGroupItem
                                        id="billing-annual"
                                        value="annual"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="billing-annual"
                                        className="peer-data-[state=checked]:text-primary-foreground peer-data-[state=unchecked]:text-muted-foreground px-6 py-3 font-semibold text-sm cursor-pointer inline-flex items-center gap-2 transition-colors"
                                    >
                                        Annual
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Pricing Card */}
                    <div className="relative">
                        {/* Most Popular badge - only show for monthly */}
                        {!isAnnual && (
                            <div className="pointer-events-none absolute -top-4 right-8 z-10">
                                <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
                                    Everything Included
                                </span>
                            </div>
                        )}

                        <div className="rounded-2xl bg-card p-6 shadow-lg border border-border max-w-md mx-auto">
                            <div className="text-center">
                                <h3 className="text-base font-semibold mb-4 tracking-tight">
                                    All-In-One Plan
                                </h3>

                                <div className="mb-4">
                                    <div className="flex items-baseline justify-center gap-2 mb-2">
                                        <span className="tracking-tight text-[28px] sm:text-[32px] font-semibold text-foreground">
                                            {priceLabel}
                                        </span>
                                        <span className="text-body sm:text-body-lg text-muted-foreground">
                                            {priceSuffix}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground mb-1 leading-snug">
                                        {subCopy}
                                    </p>
                                    <p className="text-sm text-muted-foreground leading-snug">
                                        {fineCopy}
                                    </p>
                                </div>

                                {/* Features List - Compact */}
                                <div className="space-y-2 mb-6 text-left">
                                    {[
                                        "Registered Office, Director's Service & Business Address — all in one",
                                        "Unlimited same-day mail scanning on business days",
                                        "Free UK forwarding for HMRC & Companies House letters (on request)",
                                        "Secure digital dashboard to view, download and organise mail",
                                        "UK-based human support during business hours",
                                        "No setup fees, no minimum term, cancel any time"
                                    ].map((feature, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center mt-0.5">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="h-2.5 w-2.5 text-primary"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <span className="text-xs text-foreground leading-relaxed sm:leading-snug">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                    size="lg"
                                    className="w-full tracking-tight text-base font-semibold rounded-lg !h-14"
                                >
                                    {isAnnual ? `Get My London Address – £${annualPrice}/year` : `Get My London Address – £9.97/month`}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>

                                <p className="mt-4 text-xs text-muted-foreground text-center">
                                    Instant signup · No hidden fees
                                </p>

                                <div className="mt-6 pt-4 border-t border-border">
                                    <p className="text-xs font-semibold text-foreground mb-2">How forwarding works:</p>
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                        <p>• HMRC & Companies House mail — forwarding is free within the UK</p>
                                        <p>• Other UK letters — £2 per item (postage + handling)</p>
                                        <p>• Letters only — we don’t accept parcels</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <HowItWorks />

            {/* PREVIEW SECTION */}
            <Preview onNavigate={handleNavClick} />

        </main>
    );
}
