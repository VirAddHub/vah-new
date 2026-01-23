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
                className="relative overflow-hidden bg-[#024E40] text-white"
                aria-label="Hero"
            >
                <div className="safe-pad mx-auto w-full max-w-7xl px-8 pt-32 pb-24 md:pt-40 md:pb-28 lg:px-12">
                    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                        <div className="max-w-xl">
                            <h1 className="text-5xl font-semibold leading-[1.05] text-white lg:text-6xl">
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
                            <div className="relative mx-auto max-w-[520px] overflow-hidden rounded-3xl aspect-[582/540] lg:mx-0">
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
                            <h2 className="text-2xl font-medium leading-[1.136] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-[44px]">What&apos;s Included</h2>

                            <div className="mt-4 sm:mt-6 lg:mt-10">
                                <div className="relative pl-[26px] sm:pl-[30px] lg:pl-[36px]">
                                    <div className="pointer-events-none absolute left-[7px] top-[6px] bottom-[6px] w-px bg-[#024E40]/30 sm:left-[8px] lg:left-[10px]" />
                                    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
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
                                            <div key={item.title} className="relative">
                                                <span className="absolute left-[3px] top-[6px] h-[8px] w-[8px] rounded-full bg-[#024E40] sm:left-[3px] sm:h-[10px] sm:w-[10px] lg:left-[4px] lg:top-[7px] lg:h-[12px] lg:w-[12px]" />
                                                <div className="text-sm font-medium text-[#1A1A1A] sm:text-base md:text-lg lg:text-[18px]">{item.title}</div>
                                                <div className="mt-0.5 text-xs leading-[1.4] text-[#666666] sm:mt-1 sm:text-sm md:text-base lg:text-[16px]">{item.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section
                id="pricing"
                className="bg-white py-16 sm:py-20 lg:py-28"
                aria-label="Pricing"
            >
                <div className="safe-pad mx-auto w-full max-w-[1360px] px-6 sm:px-8 lg:px-16">
                    <div className="text-center">
                        <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-[44px]">One Simple Plan</h2>
                        <p className="mt-2 text-sm leading-[1.4] text-[#666666] sm:mt-3 sm:text-base md:text-lg lg:mt-4 lg:text-[18px]">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    {/* Mobile/Tablet: Toggle between plans */}
                    <div className="mt-4 flex justify-center sm:mt-6 lg:hidden">
                        <div className="inline-flex rounded-full bg-gray-100 p-1">
                            <button
                                onClick={() => setBilling("monthly")}
                                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${
                                    billing === "monthly"
                                        ? "bg-[#014D3F] text-white"
                                        : "text-gray-600"
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBilling("annual")}
                                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors sm:px-6 sm:text-sm ${
                                    billing === "annual"
                                        ? "bg-[#014D3F] text-white"
                                        : "text-gray-600"
                                }`}
                            >
                                Annual
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-4 sm:mt-8 sm:gap-6 lg:mt-12 lg:flex-row lg:gap-[32px]">
                        {/* Monthly card */}
                        <div className={`w-full max-w-md rounded-[20px] bg-[#014D3F] p-5 shadow-[0px_2px_20px_rgba(0,0,0,0.2)] sm:p-6 lg:h-[748px] lg:max-w-none lg:rounded-[30px] lg:p-[34px] ${billing !== "monthly" ? "hidden lg:flex lg:w-[522px]" : "lg:w-[522px]"}`}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-end">
                                    <div className="rounded-[44px] bg-[#075748] px-3 py-1 text-xs font-semibold text-white sm:px-4 sm:text-sm lg:px-6 lg:py-2 lg:text-[16px]">
                                        Monthly
                                    </div>
                                </div>

                                <div className="mt-3 text-2xl font-semibold leading-[1.2] text-white sm:mt-4 sm:text-3xl lg:mt-6 lg:text-[38px]">
                                    £{Number(monthlyPrice).toFixed(2)} / month
                                </div>

                                <div className="mt-4 sm:mt-6 lg:mt-8">
                                    <div className="text-sm font-medium text-white sm:text-base lg:text-[18px]">Include with every plan</div>
                                    <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2 lg:mt-4">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-2 lg:gap-3">
                                                <img src="/figma/check-16.svg" alt="" aria-hidden="true" className="h-3 w-3 sm:h-4 sm:w-4" />
                                                <div className="text-xs leading-[1.2] text-white/80 sm:text-sm lg:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-3 h-px w-full bg-[#40C46C] sm:my-4 lg:my-6" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-sm font-medium text-white sm:text-base lg:text-[18px]">Mail Forwarding rules</div>
                                    <div className="mt-1.5 space-y-1.5 sm:mt-2 sm:space-y-2 lg:mt-3">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-2 lg:gap-3">
                                                <img src="/figma/check-20.svg" alt="" aria-hidden="true" className="mt-[2px] h-4 w-4 sm:h-5 sm:w-5" />
                                                <div className="text-xs leading-[1.4] text-white/80 sm:text-sm lg:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 sm:pt-6 lg:pt-8">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[40px] w-full rounded-[30px] bg-[#40C46C] text-xs font-medium text-[#014D3F] hover:bg-[#40C46C]/90 sm:h-[44px] sm:text-sm lg:h-[48px] lg:text-[16px]"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Annual card */}
                        <div className={`w-full max-w-md rounded-[20px] bg-white p-5 shadow-[0px_2px_20px_rgba(0,0,0,0.1)] sm:p-6 lg:h-[748px] lg:max-w-none lg:rounded-[30px] lg:p-[34px] ${billing !== "annual" ? "hidden lg:flex lg:w-[522px]" : "lg:w-[522px]"}`}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-end">
                                    <div className="rounded-[44px] bg-[#075748] px-3 py-1 text-xs font-semibold text-white sm:px-4 sm:text-sm lg:px-6 lg:py-2 lg:text-[16px]">
                                        Annual
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between sm:mt-4 lg:mt-6">
                                    <div className="text-2xl font-semibold leading-[1.2] text-[#1A1A1A] sm:text-3xl lg:text-[38px]">
                                        £{Number(annualPrice).toFixed(2)} / year
                                    </div>
                                    <div className="text-xs font-medium text-[#FF6900] sm:text-sm lg:text-[16px]">20% Save</div>
                                </div>

                                <div className="mt-4 sm:mt-6 lg:mt-8">
                                    <div className="text-sm font-medium text-[#1A1A1A] sm:text-base lg:text-[18px]">Include with every plan</div>
                                    <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2 lg:mt-4">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-2 lg:gap-3">
                                                <img src="/figma/check-16.svg" alt="" aria-hidden="true" className="h-3 w-3 sm:h-4 sm:w-4" />
                                                <div className="text-xs leading-[1.2] text-[#666666] sm:text-sm lg:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-3 h-px w-full bg-[#E5E7EB] sm:my-4 lg:my-6" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-sm font-medium text-[#1A1A1A] sm:text-base lg:text-[18px]">Mail Forwarding rules</div>
                                    <div className="mt-1.5 space-y-1.5 sm:mt-2 sm:space-y-2 lg:mt-3">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-2 lg:gap-3">
                                                <img src="/figma/check-20.svg" alt="" aria-hidden="true" className="mt-[2px] h-4 w-4 sm:h-5 sm:w-5" />
                                                <div className="text-xs leading-[1.4] text-[#666666] sm:text-sm lg:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 sm:pt-6 lg:pt-8">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        variant="outline"
                                        className="h-[40px] w-full rounded-[30px] border border-[#014D3F] bg-white text-xs font-medium text-[#014D3F] hover:bg-[#014D3F] hover:text-white sm:h-[44px] sm:text-sm lg:h-[48px] lg:text-[16px]"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
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
                            <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-[44px]">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-3 text-xs leading-[1.4] text-[#666666] sm:mt-4 sm:text-sm md:text-base lg:mt-5 lg:text-[16px]">
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
                                    <div className="text-xs font-normal leading-[1.1] text-[#666666] sm:text-sm md:text-base lg:text-[16px]">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA IMAGE SECTION */}
            <section className="w-full bg-white py-16 sm:py-20 lg:py-28">
                <div className="safe-pad mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-16">
                    {/* Container with responsive height */}
                    <div className="overflow-hidden rounded-[20px] bg-[#014D3F] shadow-[0px_16px_36px_rgba(0,0,0,0.18)] lg:rounded-[30px]">
                        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-12 lg:px-16 lg:py-12">
                            <div className="relative h-[220px] overflow-hidden sm:h-[280px] lg:h-[360px]">
                                <img
                                    src="/figma/cta-illustration.png"
                                    alt="London illustration"
                                    className="absolute inset-0 h-full w-[120%] max-w-none object-cover object-left"
                                />
                            </div>
                            <div className="flex w-full flex-col justify-center">
                                <h2 className="text-xl font-medium leading-[1.2] text-white sm:text-2xl md:text-3xl lg:text-[44px]">
                                    Get your London Business Address Today
                                </h2>
                                <p className="mt-2 text-xs leading-[1.4] text-white/80 sm:text-sm md:text-base lg:mt-3 lg:text-[16px]">
                                    Everything included for £9.99 per month.
                                </p>
                                <div className="mt-3 sm:mt-4 lg:mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[40px] w-full rounded-[30px] bg-[#40C46C] text-xs font-medium text-[#024E40] hover:bg-[#40C46C]/90 sm:h-[44px] sm:text-sm lg:h-[48px] lg:w-[268px] lg:text-[16px]"
                                    >
                                        Schedule London Address
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
