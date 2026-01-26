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
            {/* HERO */}
            <section
                className="relative overflow-hidden bg-primary text-primary-foreground py-11 lg:py-8"
                aria-label="Hero"
            >
                <div className="mx-auto max-w-7xl px-8 lg:px-12 lg:pt-4 lg:pb-2">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-12 items-center">
                        <div className="max-w-[540px]">
                            <h1 className="text-4xl lg:text-[44px] font-bold leading-[1.1] lg:leading-[1.08] text-primary-foreground">
                                Your Central London Address
                            </h1>

                            <h2 className="mt-2 lg:mt-1 text-2xl lg:text-3xl font-medium text-primary-foreground/95">
                                A compliant alternative to a physical office
                            </h2>

                            <div className="mt-4 lg:mt-2">
                                <p className="text-base lg:text-lg leading-[1.6] font-medium text-primary-foreground">
                                    Use a trusted Central London address as your Registered Office, Director&apos;s Service Address, and official business address without using your home address.
                                </p>
                            </div>

                            <div className="mt-4 lg:mt-2.5">
                                <p className="text-base lg:text-lg leading-[1.6] font-medium text-primary-foreground">
                                    Suitable for Companies House, HMRC, and everyday business correspondence.
                                </p>
                            </div>

                            <div className="mt-4 lg:mt-2.5">
                                <p className="text-sm lg:text-base text-primary-foreground/90 mb-2">
                                    Simple pricing. No surprises.
                                </p>
                                <p className="text-sm lg:text-base text-primary-foreground/90">
                                    Fully compliant with UK Companies House and HMRC requirements.
                                </p>
                            </div>

                            <div className="mt-4 lg:mt-2.5">
                                <div className="text-2xl lg:text-3xl font-bold text-primary-foreground">£9.99 per month</div>
                                <div className="mt-1 text-sm lg:text-base text-primary-foreground/90">One address. One plan.</div>
                            </div>

                            <div className="mt-5 lg:mt-3">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[48px] w-full rounded-[33px] bg-primary-foreground px-4 text-base font-medium text-primary hover:bg-primary-foreground/90 sm:w-[85%] lg:h-[57px] lg:w-[294px]"
                                >
                                    Get Started - £9.99/month
                                </Button>
                            </div>
                        </div>

                        <div className="w-full flex items-center">
                            <div className="relative w-full max-w-[520px] mx-auto lg:mx-0">
                                <Image
                                    src="/figma/hero-photo.png"
                                    alt="Central London street scene"
                                    width={520}
                                    height={400}
                                    className="w-full h-auto max-h-[360px] lg:max-h-[400px] rounded-3xl object-cover"
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT'S INCLUDED */}
            <section
                className="w-full bg-background py-24"
                aria-label="What's Included"
            >
                <div className="safe-pad mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-12">
                    <div className="flex flex-col items-start gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-center lg:gap-[62px]">
                        <div className="w-full lg:w-[650px]">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt=""
                                aria-hidden="true"
                                className="w-full max-h-[500px] object-contain"
                            />
                        </div>

                        <div className="w-full lg:w-[528px]">
                            <h2 className="text-2xl font-medium leading-[1.136] text-foreground sm:text-3xl md:text-4xl lg:text-4xl">What&apos;s Included</h2>

                            <div className="mt-4 sm:mt-6 lg:mt-10">
                                <ul className="space-y-4 max-w-xl">
                                    {[
                                        {
                                            title: "Registered Office And Director's Service Address",
                                            description: "Use our Central London address for Companies House and HMRC filings.",
                                        },
                                        {
                                            title: "Professional Business Address",
                                            description: "Use the same address on invoices, websites, contracts, and correspondence with clients and professional contacts.",
                                        },
                                        {
                                            title: "Same Day Mail Scanning And Instant Alerts",
                                            description: "Letters are scanned the day they arrive and uploaded to your secure online dashboard.",
                                        },
                                        {
                                            title: "Secure Online Dashboard",
                                            description: "View, download, and organise your mail in one place with full visibility and control.",
                                        },
                                        { title: "UK Based Support", description: "Support provided during standard business hours." },
                                        { title: "Privacy Protection", description: "Keep your home address off public records and business documents." },
                                    ].map((item) => (
                                        <li key={item.title} className="flex items-start gap-3">
                                            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary" />
                                            <div>
                                                <p className="font-medium leading-snug text-foreground">{item.title}</p>
                                                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
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
                                        className="h-[44px] w-full rounded-[30px] bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-medium"
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

            {/* FINAL CTA IMAGE SECTION */}
            <section className="py-24 bg-background">
                <div className="mx-auto max-w-7xl px-8">
                    <div className="relative overflow-hidden rounded-[30px] bg-background p-12 md:p-16 lg:p-20">
                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-[40px]">
                            {/* London landmarks illustration on left */}
                            <div className="relative w-full md:w-auto flex items-center justify-center flex-shrink-0">
                                <Image
                                    src="/figma/cta-illustration.png"
                                    alt=""
                                    width={857}
                                    height={600}
                                    className="w-full max-w-[857px] h-auto object-contain"
                                />
                            </div>
                            {/* Content on right */}
                            <div className="flex flex-col gap-6 w-full md:w-auto md:max-w-[409px]">
                                <div className="flex flex-col gap-3">
                                    <h2 className="text-3xl md:text-[44px] font-medium text-foreground leading-[1.2]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                        Get your London Business Address Today
                                    </h2>
                                    <p className="text-base text-foreground leading-[1.4]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                        Everything included for <span className="text-primary">£9.99</span> per month.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        variant="primary"
                                        className="rounded-[30px] w-[268px] h-[48px] text-base font-medium uppercase tracking-wide"
                                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', lineHeight: '1.2' }}
                                    >
                                        Get My London Address
                                    </Button>
                                    <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                        ICO registered · HMRC AML supervised · Cancel anytime
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
