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

            {/* WHAT'S INCLUDED */}
            <section
                className="w-full py-12 md:py-16 bg-white"
                aria-label="What's Included"
            >
                <div className="safe-pad mx-auto max-w-screen-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left Section - Big Ben Illustration */}
                        <div className="order-2 lg:order-1 flex items-center justify-center">
                            <div className="relative w-full max-w-md">
                                <img
                                    src="/images/whats-included.png"
                                    alt="Big Ben illustration"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>

                        {/* Right Section - What's Included List */}
                        <div className="order-1 lg:order-2">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
                                What's Included
                            </h2>
                            
                            <div className="space-y-6">
                                {[
                                    {
                                        title: "Registered Office And Director's Service Address",
                                        description: "Use our Central London address for Companies House and HMRC filings."
                                    },
                                    {
                                        title: "Professional Business Address",
                                        description: "Use the same address on invoices, websites, contracts, and correspondence with clients and professional contacts."
                                    },
                                    {
                                        title: "Same Day Mail Scanning And Instant Alerts",
                                        description: "Letters are scanned the day they arrive and uploaded to your secure online dashboard."
                                    },
                                    {
                                        title: "Secure Online Dashboard",
                                        description: "View, download, and organise your mail in one place with full visibility and control."
                                    },
                                    {
                                        title: "UK Based Support",
                                        description: "Support provided during standard business hours."
                                    },
                                    {
                                        title: "Privacy Protection",
                                        description: "Keep your home address off public records and business documents."
                                    }
                                ].map((item, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-[#0d4a3d]"></div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-foreground text-base md:text-lg mb-1">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section
                id="pricing"
                className="py-12 md:py-16 bg-white"
                aria-label="Pricing"
            >
                <div className="safe-pad mx-auto max-w-6xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                            One Simple Plan
                        </h2>
                        <p className="text-base md:text-lg text-muted-foreground">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    {/* Two Pricing Cards Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {/* Monthly Plan Card */}
                        <div className="relative rounded-2xl bg-[#0d4a3d] p-8 text-white">
                            {/* Monthly Tag */}
                            <div className="absolute top-6 right-6">
                                <span className="inline-flex items-center rounded-full bg-[#0d4a3d] border-2 border-white/30 px-4 py-1.5 text-sm font-semibold text-white">
                                    Monthly
                                </span>
                            </div>

                            {/* Price */}
                            <div className="mb-8 mt-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl md:text-6xl font-bold">£{monthlyPrice}</span>
                                    <span className="text-xl md:text-2xl text-white/90">/month</span>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-4">Include with every plan</h3>
                                <div className="space-y-3">
                                    {[
                                        "Registered Office address",
                                        "Director's Service Address",
                                        "Professional business address",
                                        "Unlimited same day mail scanning",
                                        "Secure online dashboard",
                                        "UK based support"
                                    ].map((feature, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center mt-0.5">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="h-3 w-3 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                >
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <span className="text-sm md:text-base text-white/95">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mail Forwarding Rules */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold mb-4">Mail Forwarding rules</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center mt-0.5">
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-3 w-3 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            >
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                        <span className="text-sm md:text-base text-white/95">
                                            HMRC and Companies House letters forwarded free within the UK on request.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center mt-0.5">
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-3 w-3 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            >
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                        <span className="text-sm md:text-base text-white/95">
                                            Other UK letters forwarded at £2 per item.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <Button
                                onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                className="w-full bg-[#34D399] hover:bg-[#10b981] text-white font-bold rounded-xl py-6 text-base md:text-lg !h-auto"
                            >
                                Sign Up
                            </Button>
                        </div>

                        {/* Annual Plan Card */}
                        <div className="relative rounded-2xl bg-white border-2 border-[#0d4a3d] p-8 text-foreground">
                            {/* Annual Tag */}
                            <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                                <span className="inline-flex items-center rounded-full bg-[#0d4a3d] px-4 py-1.5 text-sm font-semibold text-white">
                                    Annual
                                </span>
                                <span className="text-sm font-semibold text-orange-500">
                                    20% Save
                                </span>
                            </div>

                            {/* Price */}
                            <div className="mb-8 mt-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl md:text-6xl font-bold text-foreground">£{annualPrice}</span>
                                    <span className="text-xl md:text-2xl text-muted-foreground">/year</span>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-4 text-foreground">Include with every plan</h3>
                                <div className="space-y-3">
                                    {[
                                        "Registered Office address",
                                        "Director's Service Address",
                                        "Professional business address",
                                        "Unlimited same day mail scanning",
                                        "Secure online dashboard",
                                        "UK based support"
                                    ].map((feature, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center mt-0.5">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="h-3 w-3 text-white"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                >
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <span className="text-sm md:text-base text-foreground">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mail Forwarding Rules */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold mb-4 text-foreground">Mail Forwarding rules</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center mt-0.5">
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-3 w-3 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            >
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                        <span className="text-sm md:text-base text-foreground">
                                            HMRC and Companies House letters forwarded free within the UK on request.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center mt-0.5">
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-3 w-3 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            >
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                        <span className="text-sm md:text-base text-foreground">
                                            Other UK letters forwarded at £2 per item.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <Button
                                onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                variant="outline"
                                className="w-full bg-white border-2 border-[#0d4a3d] text-[#0d4a3d] hover:bg-[#0d4a3d] hover:text-white font-bold rounded-xl py-6 text-base md:text-lg !h-auto"
                            >
                                Sign Up
                            </Button>
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
