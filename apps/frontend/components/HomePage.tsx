'use client';

import { useState, useEffect } from "react";
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
            className="bg-white text-[#1A1A1A]"
            style={{ fontFamily: "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}
        >
            {/* HERO */}
            <section
                className="relative overflow-hidden bg-[#024E40] text-white py-16 lg:py-16"
                aria-label="Hero"
            >
                <div className="mx-auto max-w-7xl px-8 lg:px-12">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div className="max-w-[540px]">
                            <h1 className="text-5xl lg:text-[50px] font-medium leading-[1.15] lg:leading-[1.12] text-white">
                                <span className="block">A Credible Central London</span>
                                <span className="block">Business Address</span>
                                <span className="block">Without The Cost Of</span>
                                <span className="block">An Office.</span>
                            </h1>

                            <div className="mt-6 lg:mt-5 text-sm leading-[1.7] text-white/90 sm:text-base">
                                <p>Run your business professionally without exposing your home address.</p>
                                <p className="mt-2">Use one trusted Central London address as your Registered Office, Director&apos;s Service Address, and professional business address.</p>
                                <p className="mt-2">Suitable for Companies House, HMRC, and everyday business use.</p>
                                <p className="mt-2">Everything you need is included in one simple service.</p>
                            </div>

                            <div className="mt-6 lg:mt-5">
                                <div className="text-lg font-medium text-white">£9.99 per month</div>
                                <div className="text-sm text-white/80">with one clear plan</div>
                            </div>

                            <div className="mt-8 lg:mt-6">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[48px] w-full rounded-[33px] bg-[#40C46C] px-4 text-base font-medium text-[#024E40] hover:bg-[#40C46C]/90 sm:w-[85%] lg:h-[57px] lg:w-[294px]"
                                >
                                    Get your Central London Address
                                </Button>
                            </div>
                        </div>

                        <div className="w-full flex items-center">
                            <div className="relative w-full max-w-[520px] mx-auto lg:mx-0">
                                <img
                                    src="/figma/hero-photo.png"
                                    alt="Central London street scene"
                                    className="w-full h-auto max-h-[400px] lg:max-h-[440px] rounded-3xl object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT'S INCLUDED */}
            <section
                className="w-full bg-white py-24"
                aria-label="What's Included"
            >
                <div className="safe-pad mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-12">
                    <div className="flex flex-col items-start gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-center lg:gap-[62px]">
                        <div className="w-full lg:w-[650px]">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt="What's included illustration"
                                className="w-full max-h-[500px] object-contain"
                            />
                        </div>

                        <div className="w-full lg:w-[528px]">
                            <h2 className="text-2xl font-medium leading-[1.136] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-4xl">What&apos;s Included</h2>

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
                                            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-700" />
                                            <div>
                                                <p className="font-medium leading-snug text-gray-900">{item.title}</p>
                                                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
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
                className="bg-white py-12 lg:py-14"
                aria-label="Pricing"
            >
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-4xl">One Simple Plan</h2>
                        <p className="mt-2 text-sm leading-[1.4] text-[#666666] sm:mt-3 sm:text-base md:text-lg lg:mt-4 lg:text-base">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    {/* Toggle for Monthly/Annual */}
                    <div className="mt-6 flex justify-center mb-8">
                        <div className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200">
                            <button
                                onClick={() => setBilling("monthly")}
                                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${billing === "monthly"
                                    ? "bg-[#014D3F] text-white"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBilling("annual")}
                                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${billing === "annual"
                                    ? "bg-[#014D3F] text-white"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                Annual
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        {/* Single card that switches based on toggle */}
                        {billing === "monthly" ? (
                            <div className="w-full max-w-[420px] rounded-3xl bg-[#014D3F] p-6 lg:p-7 shadow-[0px_2px_20px_rgba(0,0,0,0.2)] flex flex-col">
                                <div className="text-2xl font-semibold leading-[1.2] text-white sm:text-3xl lg:text-4xl">
                                    £{Number(monthlyPrice).toFixed(2)} <span className="text-base sm:text-lg lg:text-xl text-white/70">/ month</span>
                                </div>

                                <div className="mt-5">
                                    <div className="text-xs font-normal text-white/70 sm:text-sm">Include with every plan</div>
                                    <div className="mt-2 space-y-2">
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
                                                <div className="text-xs leading-[1.3] text-white/80 sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-5 h-px w-full bg-[#40C46C]" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-xs font-normal text-white/70 sm:text-sm">Mail Forwarding rules</div>
                                    <div className="mt-2 space-y-2">
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
                                                <div className="text-xs leading-[1.3] text-white/80 sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[44px] w-full rounded-[30px] bg-[#40C46C] text-sm font-medium text-[#014D3F] hover:bg-[#40C46C]/90"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 lg:p-7 shadow-[0px_2px_20px_rgba(0,0,0,0.1)] flex flex-col border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-semibold leading-[1.2] text-[#1A1A1A] sm:text-3xl lg:text-4xl">
                                        £{Number(annualPrice).toFixed(2)} <span className="text-base sm:text-lg lg:text-xl text-gray-500">/ year</span>
                                    </div>
                                    <div className="text-xs font-medium text-[#FF6900] bg-[#FF6900]/10 px-2 py-1 rounded-full">20% Save</div>
                                </div>

                                <div className="mt-5">
                                    <div className="text-xs font-normal text-gray-500 sm:text-sm">Include with every plan</div>
                                    <div className="mt-2 space-y-2">
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
                                                <div className="text-xs leading-[1.3] text-[#666666] sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-5 h-px w-full bg-[#E5E7EB]" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-xs font-normal text-gray-500 sm:text-sm">Mail Forwarding rules</div>
                                    <div className="mt-2 space-y-2">
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
                                                <div className="text-xs leading-[1.3] text-[#666666] sm:text-sm lg:text-base">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        className="h-[44px] w-full rounded-[30px] bg-[#40C46C] text-sm font-medium text-[#014D3F] hover:bg-[#40C46C]/90"
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
            <section className="w-full bg-white py-24">
                <div className="safe-pad mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-12">
                    <div className="flex flex-col items-center gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-stretch lg:gap-[120px]">
                        <div className="w-full lg:w-[433px]">
                            <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-4xl">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-3 text-xs leading-[1.4] text-[#666666] sm:mt-4 sm:text-sm md:text-base lg:mt-5 lg:text-base">
                                Designed for founders who want a professional Central London presence without renting office space or publishing their home address.
                            </p>
                        </div>

                        <div className="hidden w-px self-stretch bg-[#E5E7EB] lg:block" />

                        <div className="w-full space-y-1.5 sm:space-y-2 lg:w-[433px]">
                            {[
                                { t: "One clear service.", icon: "/figma/builtfor-icon-1.svg" },
                                { t: "One predictable price.", icon: "/figma/builtfor-icon-2.svg" },
                                { t: "Secure mail handling you can rely on.", icon: "/figma/builtfor-icon-3.svg" },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="flex min-h-[56px] items-center gap-2 rounded-[10px] bg-[#F9F9F9] px-4 sm:min-h-[64px] sm:gap-3 sm:px-5 lg:min-h-[72px] lg:gap-[14px] lg:px-[24px]"
                                >
                                    <img src={x.icon} alt="" aria-hidden="true" className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6" />
                                    <div className="text-xs font-normal leading-[1.1] text-[#666666] sm:text-sm md:text-base lg:text-base">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA IMAGE SECTION */}
            <section className="py-24 bg-white">
                <div className="mx-auto max-w-7xl px-8">
                    <div className="relative overflow-hidden rounded-3xl bg-[#0b4d3c] p-12 md:p-20">
                        {/* London landmarks illustration on left */}
                        <div className="absolute inset-y-0 left-0 w-[50%] opacity-20 pointer-events-none">
                            <img
                                src="/figma/cta-illustration.png"
                                alt=""
                                className="h-full w-full max-h-[500px] object-cover object-left"
                            />
                        </div>
                        {/* Content on right */}
                        <div className="relative flex items-center justify-end">
                            <div className="w-full md:w-[50%] md:pl-12">
                                <h2 className="text-4xl md:text-5xl font-semibold text-white leading-tight">
                                    <span className="block">Get your Central London</span>
                                    <span className="block text-5xl md:text-6xl font-bold">Business Address</span>
                                    <span className="block">Today</span>
                                </h2>
                                <p className="mt-4 text-white/90 text-lg">
                                    Everything included for <span className="font-semibold">£9.99</span> per month.
                                </p>
                                <button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="mt-8 rounded-full bg-[#40C46C] px-8 py-4 font-medium text-white hover:bg-[#40C46C]/90 transition-colors"
                                >
                                    Schedule Central London Address
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
