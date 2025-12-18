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
        <main className="bg-background text-foreground">
            {/* HERO */}
            <section
                className="relative overflow-hidden"
                aria-label="Hero"
            >
                <div className="absolute right-[-8rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-primary/20 to-primary/40 blur-3xl opacity-40" />
                <div className="safe-pad mx-auto max-w-screen-xl pt-12 sm:pt-16 pb-10">
                    {/* Mobile: Clean Text-First Layout */}
                    <div className="lg:hidden">
                        <div className="text-xs font-semibold text-muted-foreground tracking-wide">
                            Privacy-first • London-based
                        </div>
                        <h1 className="mt-3 text-[clamp(2.25rem,9vw,3.25rem)] leading-[1.05] font-bold tracking-tight text-primary">
                            An Affordable, All-Inclusive London Business Address
                        </h1>
                        <p className="mt-3 max-w-[42ch] text-pretty text-sm text-muted-foreground sm:text-base leading-relaxed">
                            Secure a Central London business address for just £9.97/month.
                        </p>
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                            Everything is included — from unlimited same-day mail scanning to free UK forwarding of HMRC and Companies House letters — helping you meet the latest Companies House requirements, protect your privacy, and present a professional image without overpaying.
                        </p>
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                            For one simple monthly price, you get:
                        </p>
                        <ul className="mt-2 space-y-2 pl-5 list-disc text-sm text-muted-foreground leading-relaxed">
                            <li>Registered Office & Director’s Service Address (Companies House & HMRC)</li>
                            <li>Total privacy — keep your home address off the public record</li>
                            <li>Reliable service — unlimited same-day mail scanning and free UK forwarding for HMRC and Companies House letters</li>
                        </ul>
                        <div className="mt-5">
                            <Button
                                onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                size="lg"
                                className="tt-min w-full rounded-xl btn-primary text-primary-foreground tracking-tight !h-12 text-base"
                            >
                                Get My London Address
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <p className="mt-2 text-xs text-muted-foreground text-center">
                                Instant signup · Cancel anytime · Letters only (no parcels)
                            </p>
                        </div>
                    </div>

                    {/* Desktop: Horizontal Layout - Text First */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7">
                            <div className="text-xs font-semibold text-muted-foreground tracking-wide">
                                Privacy-first • London-based
                            </div>
                            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-primary">
                                An Affordable, All-Inclusive London Business Address
                            </h1>
                            <p className="mt-3 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg lg:text-xl">
                                Secure a Central London business address for just £9.97/month.
                            </p>
                            <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
                                Everything is included — from unlimited same-day mail scanning to free UK forwarding of HMRC and Companies House letters — helping you meet the latest Companies House requirements, protect your privacy, and present a professional image without overpaying.
                            </p>
                            <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
                                For one simple monthly price, you get:
                            </p>
                            <ul className="mt-2 space-y-2 text-base text-muted-foreground max-w-2xl">
                                <li>• Registered Office & Director’s Service Address (Companies House & HMRC)</li>
                                <li>• Total privacy — keep your home address off the public record</li>
                                <li>• Reliable service — unlimited same-day mail scanning and free UK forwarding for HMRC and Companies House letters</li>
                            </ul>
                            <div className="mt-6">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                    size="lg"
                                    className="tt-min px-8 rounded-[16px] btn-primary text-primary-foreground tracking-tight !h-14"
                                >
                                    Get My London Address
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Instant signup · Cancel anytime · Letters only (no parcels)
                                </p>
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
                                    {/* Save badge */}
                                    <div className="absolute -top-2 -right-2 z-20">
                                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-1 whitespace-nowrap shadow-md">
                                            Save ~25%
                                        </Badge>
                                    </div>
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
