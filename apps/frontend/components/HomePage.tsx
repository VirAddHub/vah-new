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

    const ctaText = isAnnual
        ? `Choose Annual — £${annualPrice}/year`
        : "Secure My London Address Now";

    const scrollTo = (id: string) =>
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

    return (
        <main className="bg-background text-foreground">
            {/* HERO */}
            <section
                className="relative overflow-hidden"
                aria-label="Hero"
            >
                <div className="absolute right-[-8rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-primary/20 to-primary/40 blur-3xl opacity-40" />
                <div className="safe-pad mx-auto max-w-screen-xl pt-20 pb-12">
                    {/* Mobile: Clean Text-First Layout */}
                    <div className="lg:hidden">
                        <h1
                            className="font-bold tracking-tight leading-[1.1] text-[clamp(1.5rem,4vw,2.5rem)]"
                        >
                            Professional London Business Address Service.
                            <span className="block text-gray-900">
                                Compliant. Private. Seamless.
                            </span>
                        </h1>
                        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                            One London address for every official use.
                            Use it for your Registered Office, Director's Service, and Business Correspondence — all included in one simple plan.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                                ICO — Registered
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                HMRC — AML Supervised
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                GDPR — Aligned
                            </Badge>
                        </div>

                        <div className="mt-6">
                            <Button
                                onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                size="lg"
                                className="tt-min w-full h-12 px-6 rounded-[16px] btn-primary text-primary-foreground"
                            >
                                Secure My London Address — Start Today
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Desktop: Horizontal Layout - Text First */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7">
                            <h1
                                className="font-bold tracking-tight leading-[1.1] text-[clamp(1.75rem,4.5vw,3.5rem)]"
                            >
                                Professional London Business Address Service.
                                <span className="block text-gray-900">
                                    Compliant. Private. Seamless.
                                </span>
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                                One London address for every official use.
                                Use it for your Registered Office, Director's Service, and Business Correspondence — all included in one simple plan.
                            </p>

                            <div className="mt-10">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                    size="lg"
                                    className="tt-min h-12 px-8 rounded-[16px] btn-primary text-primary-foreground"
                                >
                                    Secure My London Address — Start Today
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                            <div className="mt-8 flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-sm">
                                    ICO — Registered
                                </Badge>
                                <Badge variant="secondary" className="text-sm">
                                    HMRC — AML Supervised
                                </Badge>
                                <Badge variant="secondary" className="text-sm">
                                    GDPR — Aligned
                                </Badge>
                            </div>
                        </div>
                        <div className="lg:col-span-5">
                            <MailboxPreviewCard
                                showPriceBadge={true}
                                price={`${priceLabel}${priceSuffix}`}
                            />
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
                        <h2
                            className="font-bold leading-tight text-[clamp(1.75rem,4.5vw,3rem)] text-primary mb-4"
                        >
                            Simple, All-Inclusive Pricing
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            No hidden fees. Cancel anytime.
                        </p>
                    </div>

                    {/* Billing Toggle */}
                    <div className="mb-6 flex justify-center">
                        <div className="inline-flex items-center rounded-xl border border-border bg-card p-1 shadow-sm">
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
                                <div className="has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground rounded-lg transition-all relative">
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
                                    {/* Save badge */}
                                    <div className="absolute -top-2 -right-2">
                                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-1">
                                            Save {monthlySavingsPct}%
                                        </Badge>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Pricing Card */}
                    <div className="relative">
                        {/* Most Popular badge */}
                        <div className="pointer-events-none absolute -top-4 right-8 z-10">
                            <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
                                Most Popular
                            </span>
                        </div>

                        <div className="rounded-2xl bg-card p-6 shadow-lg border border-border max-w-md mx-auto">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-primary mb-4">
                                    All-In-One Plan
                                </h3>

                                <div className="mb-4">
                                    <div className="flex items-baseline justify-center gap-2 mb-2">
                                        <span className="text-3xl font-bold text-black">
                                            {priceLabel}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {priceSuffix}
                                        </span>
                                    </div>
                                    <p className="text-sm text-black mb-1">
                                        {subCopy}
                                    </p>
                                    <p className="text-sm text-black font-medium">
                                        {fineCopy}
                                    </p>
                                </div>

                                {/* Features List - Compact */}
                                <div className="space-y-2 mb-6 text-left">
                                    {[
                                        "Registered Office, Director & Business Address",
                                        "Unlimited Same-Day Mail Scanning",
                                        "Free Forwarding for Official Mail",
                                        "Secure Digital Dashboard",
                                        "UK-Based Support",
                                        "Cancel Anytime"
                                    ].map((feature, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="h-2.5 w-2.5 text-gray-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <span className="text-xs text-black leading-relaxed">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                    size="lg"
                                    className="w-full h-12 text-base font-semibold rounded-lg"
                                >
                                    {isAnnual ? `Choose Annual — ${priceLabel}${priceSuffix}` : `Secure My London Address Now`}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>

                                <p className="mt-4 text-xs text-black">
                                    HMRC & Companies House mail forwarding is free in the UK. Other letters can be forwarded for £2 per item (covering postage & handling).
                                </p>
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
