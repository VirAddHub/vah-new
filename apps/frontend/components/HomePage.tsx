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
                className="relative overflow-hidden bg-[#024E40] text-white pt-36 pb-28 md:pt-44"
                aria-label="Hero"
            >
                <div className="mx-auto max-w-7xl px-8 lg:px-12">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="max-w-xl">
                            <h1 className="text-5xl lg:text-6xl font-semibold leading-tight text-white">
                                <span className="block">A Credible London</span>
                                <span className="block">Business Address</span>
                                <span className="block">Without The Cost Of</span>
                                <span className="block">An Office.</span>
                            </h1>

                            <div className="mt-4 space-y-2 text-sm leading-[1.6] text-white/90 sm:text-base">
                                <p>Run your business professionally without exposing your home address.</p>
                                <p>Use one trusted London address as your Registered Office, Director&apos;s Service Address, and professional business address.</p>
                                <p>Suitable for Companies House, HMRC, and everyday business use.</p>
                                <p>Everything you need is included in one simple service.</p>
                            </div>

                            <div className="mt-6">
                                <div className="text-lg font-medium text-white">£9.99 per month</div>
                                <div className="text-sm text-white/80">with one clear plan</div>
                            </div>

                            <div className="mt-6">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[48px] w-full rounded-[33px] bg-[#40C46C] px-4 text-base font-medium text-[#024E40] hover:bg-[#40C46C]/90 sm:w-[85%] lg:h-[57px] lg:w-[294px]"
                                >
                                    Get your London Address
                                </Button>
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="relative max-w-[520px] mx-auto lg:mx-0">
                                <img
                                    src="/figma/hero-photo.png"
                                    alt="London street scene"
                                    className="w-full h-auto rounded-3xl object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT'S INCLUDED */}
            <section
                className="w-full bg-white py-16 sm:py-20 lg:py-28"
                aria-label="What's Included"
            >
                <div className="safe-pad mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-12">
                    <div className="flex flex-col items-start gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-end lg:gap-[62px]">
                        <div className="h-auto w-full lg:h-[721px] lg:w-[650px]">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt="What's included illustration"
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <div className="w-full lg:w-[528px]">
                            <h2 className="text-2xl font-medium leading-[1.136] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-4xl">What&apos;s Included</h2>

                            <div className="mt-4 sm:mt-6 lg:mt-10">
                                <ul className="space-y-6 max-w-xl">
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
                className="bg-white py-32"
                aria-label="Pricing"
            >
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-4xl">One Simple Plan</h2>
                        <p className="mt-2 text-sm leading-[1.4] text-[#666666] sm:mt-3 sm:text-base md:text-lg lg:mt-4 lg:text-base">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    {/* Mobile/Tablet: Toggle between plans */}
                    <div className="mt-4 flex justify-center sm:mt-6 lg:hidden">
                        <div className="inline-flex rounded-full bg-gray-100 p-1">
                            <button
                                onClick={() => setBilling("monthly")}
                                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${billing === "monthly"
                                    ? "bg-[#014D3F] text-white"
                                    : "text-gray-600"
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBilling("annual")}
                                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${billing === "annual"
                                    ? "bg-[#014D3F] text-white"
                                    : "text-gray-600"
                                    }`}
                            >
                                Annual
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-12 md:grid-cols-2">
                        {/* Monthly card */}
                        <div className={`w-full rounded-3xl bg-[#014D3F] p-10 shadow-[0px_2px_20px_rgba(0,0,0,0.2)] ${billing !== "monthly" ? "hidden md:flex" : "flex"} flex-col h-full`}>
                            <div className="flex items-center justify-end">
                                <div className="rounded-[44px] bg-[#075748] px-3 py-1 text-xs font-semibold text-white sm:px-4 sm:text-sm lg:px-6 lg:py-2 lg:text-base">
                                    Monthly
                                </div>
                            </div>

                            <div className="mt-6 mb-6 text-2xl font-semibold leading-[1.2] text-white sm:text-3xl lg:text-4xl">
                                £{Number(monthlyPrice).toFixed(2)} / month
                            </div>

                            <div>
                                <div className="text-sm font-medium text-white sm:text-base lg:text-lg">Include with every plan</div>
                                <div className="mt-4 space-y-4">
                                    {[
                                        "Registered Office address",
                                        "Director's Service Address",
                                        "Professional business address",
                                        "Unlimited same day mail scanning",
                                        "Secure online dashboard",
                                        "UK based support",
                                    ].map((t) => (
                                        <div key={t} className="flex items-center gap-3">
                                            <img
                                                src="/figma/check-16.svg"
                                                alt=""
                                                aria-hidden="true"
                                                className="h-4 w-4 flex-shrink-0"
                                            />
                                            <div className="text-xs leading-[1.2] text-white/80 sm:text-sm lg:text-base">{t}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="my-8 h-px w-full bg-[#40C46C]" style={{ opacity: 0.86 }} />

                            <div>
                                <div className="text-sm font-medium text-white sm:text-base lg:text-lg">Mail Forwarding rules</div>
                                <div className="mt-4 space-y-4">
                                    {[
                                        "HMRC and Companies House letters forwarded free within the UK on request.",
                                        "Other UK letters forwarded at £2 per item.",
                                    ].map((t) => (
                                        <div key={t} className="flex items-start gap-3">
                                            <img
                                                src="/figma/check-16.svg"
                                                alt=""
                                                aria-hidden="true"
                                                className="h-4 w-4 flex-shrink-0"
                                            />
                                            <div className="text-xs leading-[1.4] text-white/80 sm:text-sm lg:text-base">{t}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-auto pt-6">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[40px] w-full rounded-[30px] bg-[#40C46C] text-xs font-medium text-[#014D3F] hover:bg-[#40C46C]/90 sm:h-[44px] sm:text-sm lg:h-[48px] lg:text-base"
                                >
                                    Sign Up
                                </Button>
                            </div>
                        </div>

                        {/* Annual card */}
                        <div className={`w-full rounded-3xl bg-white p-10 shadow-[0px_2px_20px_rgba(0,0,0,0.1)] ${billing !== "annual" ? "hidden md:flex" : "flex"} flex-col h-full`}>
                            <div className="flex items-center justify-end">
                                <div className="rounded-[44px] bg-[#075748] px-3 py-1 text-xs font-semibold text-white sm:px-4 sm:text-sm lg:px-6 lg:py-2 lg:text-base">
                                    Annual
                                </div>
                            </div>

                            <div className="mt-6 mb-6 flex items-center justify-between">
                                <div className="text-2xl font-semibold leading-[1.2] text-[#1A1A1A] sm:text-3xl lg:text-4xl">
                                    £{Number(annualPrice).toFixed(2)} / year
                                </div>
                                <div className="text-xs font-medium text-[#FF6900] sm:text-sm lg:text-base">20% Save</div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-[#1A1A1A] sm:text-base lg:text-lg">Include with every plan</div>
                                <div className="mt-4 space-y-4">
                                    {[
                                        "Registered Office address",
                                        "Director's Service Address",
                                        "Professional business address",
                                        "Unlimited same day mail scanning",
                                        "Secure online dashboard",
                                        "UK based support",
                                    ].map((t) => (
                                        <div key={t} className="flex items-center gap-3">
                                            <img
                                                src="/figma/check-16.svg"
                                                alt=""
                                                aria-hidden="true"
                                                className="h-4 w-4 flex-shrink-0"
                                            />
                                            <div className="text-xs leading-[1.2] text-[#666666] sm:text-sm lg:text-base">{t}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="my-8 h-px w-full bg-[#E5E7EB]" style={{ opacity: 0.86 }} />

                            <div>
                                <div className="text-sm font-medium text-[#1A1A1A] sm:text-base lg:text-lg">Mail Forwarding rules</div>
                                <div className="mt-4 space-y-4">
                                    {[
                                        "HMRC and Companies House letters forwarded free within the UK on request.",
                                        "Other UK letters forwarded at £2 per item.",
                                    ].map((t) => (
                                        <div key={t} className="flex items-start gap-3">
                                            <img
                                                src="/figma/check-16.svg"
                                                alt=""
                                                aria-hidden="true"
                                                className="h-4 w-4 flex-shrink-0"
                                            />
                                            <div className="text-xs leading-[1.4] text-[#666666] sm:text-sm lg:text-base">{t}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-auto pt-6">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                    variant="outline"
                                    className="h-[40px] w-full rounded-[30px] border border-[#014D3F] bg-white text-xs font-medium text-[#014D3F] hover:bg-[#014D3F] hover:text-white sm:h-[44px] sm:text-sm lg:h-[48px] lg:text-base"
                                >
                                    Sign Up
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <HowItWorks />

            {/* BUILT FOR MODERN UK BUSINESSES */}
            <section className="w-full bg-white py-16 sm:py-20 lg:py-28">
                <div className="safe-pad mx-auto w-full max-w-[1240px] px-6 sm:px-8 lg:px-12">
                    <div className="flex flex-col items-center gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-stretch lg:gap-[120px]">
                        <div className="w-full lg:h-[186px] lg:w-[433px]">
                            <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-4xl">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-3 text-xs leading-[1.4] text-[#666666] sm:mt-4 sm:text-sm md:text-base lg:mt-5 lg:text-base">
                                Designed for founders who want a professional London presence without renting office space or publishing their home address.
                            </p>
                        </div>

                        <div className="hidden w-px self-stretch bg-[#E5E7EB] lg:block" />

                        <div className="w-full space-y-2 sm:space-y-[10px] lg:w-[433px]">
                            {[
                                { t: "One clear service.", icon: "/figma/builtfor-icon-1.svg" },
                                { t: "One predictable price.", icon: "/figma/builtfor-icon-2.svg" },
                                { t: "Secure mail handling you can rely on.", icon: "/figma/builtfor-icon-3.svg" },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="flex h-[56px] items-center gap-2 rounded-[10px] bg-[#F9F9F9] px-4 sm:h-[64px] sm:gap-3 sm:px-5 lg:h-[72px] lg:gap-[14px] lg:px-[24px]"
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
            <section className="py-32 bg-white">
                <div className="mx-auto max-w-7xl px-8">
                    <div className="relative overflow-hidden rounded-3xl bg-[#0b4d3c] p-12 md:p-20">
                        {/* London landmarks illustration on left */}
                        <div className="absolute inset-y-0 left-0 w-[50%] opacity-20 pointer-events-none">
                            <img
                                src="/figma/cta-illustration.png"
                                alt=""
                                className="h-full w-full object-cover object-left"
                            />
                        </div>
                        {/* Content on right */}
                        <div className="relative flex items-center justify-end min-h-[400px]">
                            <div className="w-full md:w-[50%] md:pl-12">
                                <h2 className="text-4xl md:text-5xl font-semibold text-white leading-tight">
                                    <span className="block">Get your London</span>
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
                                    Schedule London Address
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
