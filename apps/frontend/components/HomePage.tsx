'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";
import { usePricing } from "@/hooks/usePlans";
import { Button } from "./ui/button";
import HowItWorks from "./HowItWorks";

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

    return (
        <main
            id="main-content"
            role="main"
            className="bg-background text-foreground"
        >
            {/* HERO - Premium, calm, spacious with subtle depth */}
            <section className="relative bg-gradient-to-b from-white to-neutral-50 border-b border-neutral-200">
                <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Content */}
                        <div className="max-w-xl">
                            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight text-neutral-900 tracking-tight">
                                Your <span className="relative inline-block">
                                    Central London
                                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-full" aria-hidden="true"></span>
                                </span> Address
                            </h1>

                            <p className="mt-6 text-lg lg:text-xl text-neutral-600/90 leading-relaxed">
                                A compliant alternative to a physical office.
                            </p>

                            <p className="mt-4 text-base text-neutral-600 leading-relaxed">
                                Use a trusted Central London address as your Registered Office, Director's Service Address, and official business address — without using your home address.
                            </p>

                            {/* Pricing - No Box */}
                            <div className="mt-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-semibold text-neutral-900">£9.99</span>
                                    <span className="text-lg text-neutral-500">/ month</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Everything included</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="mt-8">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    size="lg"
                                    className="h-12 px-8 rounded-xl text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Get Started
                                </Button>
                                <p className="mt-4 text-sm text-neutral-500/80">
                                    Fully compliant with UK Companies House and HMRC requirements
                                </p>
                            </div>
                        </div>

                        {/* Image */}
                        <div className="relative flex items-center justify-center lg:justify-end">
                            <Image
                                    src="/figma/hero-photo.png"
                                alt=""
                                width={520}
                                height={400}
                                priority
                                className="w-full max-w-[520px] h-auto rounded-2xl"
                                />
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT'S INCLUDED - Clean, spacious, premium */}
            <section className="bg-neutral-50 py-16 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Illustration */}
                        <div className="order-2 lg:order-1">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt=""
                                aria-hidden="true"
                                className="w-full max-w-[600px] mx-auto"
                            />
                        </div>

                        {/* Content */}
                        <div className="order-1 lg:order-2">
                            <h2 className="text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight">
                                What's Included
                            </h2>

                            <ul className="mt-8 space-y-6">
                                    {[
                                        {
                                            title: "Registered Office And Director's Service Address",
                                            description: "Use our Central London address for Companies House and HMRC filings.",
                                        },
                                        {
                                            title: "Professional Business Address",
                                        description: "Use the same address on invoices, websites, contracts, and correspondence.",
                                        },
                                        {
                                            title: "Same Day Mail Scanning And Instant Alerts",
                                        description: "Letters are scanned the day they arrive and uploaded to your secure dashboard.",
                                        },
                                        {
                                            title: "Secure Online Dashboard",
                                        description: "View, download, and organise your mail in one place with full control.",
                                        },
                                    {
                                        title: "UK Based Support",
                                        description: "Support provided during standard business hours.",
                                    },
                                    {
                                        title: "Privacy Protection",
                                        description: "Keep your home address off public records and business documents.",
                                    },
                                    ].map((item) => (
                                        <li key={item.title} className="flex items-start gap-3">
                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                            <div>
                                            <p className="font-medium text-neutral-900 leading-snug">
                                                {item.title}
                                            </p>
                                            <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
                                                {item.description}
                                            </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section
                id="pricing"
                className="bg-background py-8 lg:py-10"
                aria-label="Pricing"
            >
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-medium leading-[1.1] text-foreground sm:text-3xl md:text-4xl lg:text-4xl">One Simple Plan</h2>
                        <p className="mt-1.5 text-sm leading-[1.4] text-muted-foreground sm:mt-2 sm:text-base md:text-lg lg:mt-3 lg:text-base">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    {/* Toggle for Monthly/Annual */}
                    <div className="mt-4 flex justify-center mb-6">
                        <div className="inline-flex rounded-full bg-muted p-1 border border-border">
                            <Button
                                onClick={() => setBilling("monthly")}
                                variant="ghost"
                                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${billing === "monthly"
                                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Monthly
                            </Button>
                            <Button
                                onClick={() => setBilling("annual")}
                                variant="ghost"
                                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${billing === "annual"
                                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Annual
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        {/* Single card that switches based on toggle */}
                        {billing === "monthly" ? (
                            <div className="w-full max-w-[420px] rounded-3xl bg-primary p-5 lg:p-6 shadow-[0px_2px_20px_rgba(0,0,0,0.2)] flex flex-col">
                                <div className="text-2xl font-semibold leading-[1.2] text-primary-foreground sm:text-3xl lg:text-4xl">
                                    £{Number(monthlyPrice).toFixed(2)} <span className="text-base sm:text-lg lg:text-xl text-primary-foreground/70">/ month</span>
                                </div>

                                <div className="mt-4">
                                    <div className="text-xs font-normal text-primary-foreground/70 sm:text-sm">Include with every plan</div>
                                    <div className="mt-1.5 space-y-1.5">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-2">
                                                <img
                                                    src="/figma/check-16.svg"
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="h-3 w-3 flex-shrink-0"
                                                />
                                                <div className="text-xs leading-[1.3] text-primary-foreground/80 sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-4 h-px w-full bg-primary-foreground/20" />

                                <div>
                                    <div className="text-xs font-normal text-primary-foreground/70 sm:text-sm">Mail Forwarding rules</div>
                                    <div className="mt-1.5 space-y-1.5">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-2">
                                                <img
                                                    src="/figma/check-16.svg"
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="h-3 w-3 flex-shrink-0 mt-0.5"
                                                />
                                                <div className="text-xs leading-[1.3] text-primary-foreground/80 sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[44px] w-full rounded-[30px] bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-sm font-medium"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[420px] rounded-3xl bg-card p-5 lg:p-6 shadow-[0px_2px_20px_rgba(0,0,0,0.1)] flex flex-col border border-border">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-semibold leading-[1.2] text-foreground sm:text-3xl lg:text-4xl">
                                        £{Number(annualPrice).toFixed(2)} <span className="text-base sm:text-lg lg:text-xl text-muted-foreground">/ year</span>
                                    </div>
                                    <div className="text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-1 rounded-full">20% Save</div>
                                </div>

                                <div className="mt-4">
                                    <div className="text-xs font-normal text-muted-foreground sm:text-sm">Include with every plan</div>
                                    <div className="mt-1.5 space-y-1.5">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-2">
                                                <img
                                                    src="/figma/check-16.svg"
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="h-3 w-3 flex-shrink-0"
                                                />
                                                <div className="text-xs leading-[1.3] text-muted-foreground sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-4 h-px w-full bg-border" />

                                <div>
                                    <div className="text-xs font-normal text-muted-foreground sm:text-sm">Mail Forwarding rules</div>
                                    <div className="mt-1.5 space-y-1.5">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-2">
                                                <img
                                                    src="/figma/check-16.svg"
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="h-3 w-3 flex-shrink-0 mt-0.5"
                                                />
                                                <div className="text-xs leading-[1.3] text-muted-foreground sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        variant="primary"
                                        className="h-[44px] w-full rounded-[30px] text-sm font-medium"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <HowItWorks />

            {/* BUILT FOR MODERN UK BUSINESSES */}
            <section className="w-full bg-background py-24">
                <div className="safe-pad mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-12">
                    <div className="flex flex-col items-center gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-stretch lg:gap-[120px]">
                        <div className="w-full lg:w-[433px]">
                            <h2 className="text-2xl font-medium leading-[1.1] text-foreground sm:text-3xl md:text-4xl lg:text-4xl">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-3 text-xs leading-[1.4] text-muted-foreground sm:mt-4 sm:text-sm md:text-base lg:mt-5 lg:text-base">
                                Designed for founders who want a professional Central London presence without renting office space or publishing their home address.
                            </p>
                        </div>

                        <div className="hidden w-px self-stretch bg-border lg:block" />

                        <div className="w-full space-y-1.5 sm:space-y-2 lg:w-[433px]">
                            {[
                                { t: "One clear service.", icon: "/figma/builtfor-icon-1.svg" },
                                { t: "One predictable price.", icon: "/figma/builtfor-icon-2.svg" },
                                { t: "Secure mail handling you can rely on.", icon: "/figma/builtfor-icon-3.svg" },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="flex min-h-[56px] items-center gap-2 rounded-[10px] bg-muted px-4 sm:min-h-[64px] sm:gap-3 sm:px-5 lg:min-h-[72px] lg:gap-[14px] lg:px-[24px]"
                                >
                                    <img src={x.icon} alt="" aria-hidden="true" className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6" />
                                    <div className="text-xs font-normal leading-[1.1] text-muted-foreground sm:text-sm md:text-base lg:text-base">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA - Premium, restrained, clear */}
            <section className="py-16 lg:py-24 bg-white">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-2xl bg-primary p-12 lg:p-16">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl lg:text-4xl font-semibold text-white leading-tight tracking-tight">
                                        Get your London Business Address Today
                                    </h2>
                            <p className="mt-4 text-lg text-white/90">
                                Everything included for £9.99 per month.
                                    </p>
                            <div className="mt-8">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    size="lg"
                                    className="h-12 px-8 rounded-lg text-base font-medium bg-white text-primary hover:bg-white/95"
                                >
                                    Get Started
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
