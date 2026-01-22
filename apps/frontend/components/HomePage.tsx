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
                <div className="safe-pad mx-auto w-full max-w-[1280px] px-5 py-8 md:px-20 md:py-10">
                    <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-[98px]">
                        <div className="w-full md:w-[600px]">
                            <h1 className="text-3xl font-medium leading-[1.1] text-white md:text-[54px]">
                                A credible London business address without the cost of an office.
                            </h1>

                            <div className="mt-4 space-y-2 text-sm leading-[1.6] text-white/90 md:mt-5 md:text-[14px]">
                                <p>Run your business professionally without exposing your home address.</p>
                                <p>Use one trusted London address as your Registered Office, Director&apos;s Service Address, and professional business address.</p>
                                <p>Suitable for Companies House, HMRC, and everyday business use.</p>
                                <p>Everything you need is included in one simple service.</p>
                            </div>

                            <div className="mt-5 md:mt-6">
                                <div className="text-base font-medium text-white md:text-[18px]">£9.99 per month</div>
                                <div className="text-sm text-white/80 md:text-[14px]">with one clear plan</div>
                            </div>

                            <div className="mt-4 md:mt-5">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[48px] w-[90%] rounded-[33px] bg-[#40C46C] px-4 text-sm font-medium text-[#024E40] hover:bg-[#40C46C]/90 md:h-[57px] md:w-[294px] md:text-[16px]"
                                >
                                    Get Your London Address
                                </Button>
                            </div>
                        </div>

                        <div className="h-[300px] w-full overflow-hidden rounded-[20px] md:h-[540px] md:w-[582px] md:rounded-[30px]">
                            <img
                                src="/figma/hero-photo.png"
                                alt="London street scene"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT'S INCLUDED */}
            <section
                className="w-full bg-white py-12 md:py-[100px]"
                aria-label="What's Included"
            >
                <div className="safe-pad mx-auto w-full max-w-[1280px] px-5 md:px-[100px]">
                    <div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:gap-[62px]">
                        <div className="h-auto w-full md:h-[721px] md:w-[650px]">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt="What's included illustration"
                                className="h-full w-full object-contain md:object-cover"
                            />
                        </div>

                        <div className="w-full md:w-[528px]">
                            <h2 className="text-3xl font-medium leading-[1.136] text-[#1A1A1A] md:text-[44px]">What&apos;s Included</h2>

                            <div className="mt-6 flex gap-3 md:mt-10 md:gap-[17px]">
                                {/* left rail (dots + line) */}
                                <div className="relative w-[15px] md:w-[20px]">
                                    <div className="absolute left-[6px] top-[6px] h-[530px] w-px bg-[#024E40]/40 md:left-[9px] md:h-[559px]" />
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="absolute left-[3px] h-[10px] w-[10px] rounded-full bg-[#024E40] md:left-[4px] md:h-[12px] md:w-[12px]"
                                            style={{ top: 8 + i * 95 }}
                                        />
                                    ))}
                                </div>

                                <div className="flex-1 space-y-4 md:w-[490px] md:space-y-6">
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
                                        <div key={item.title}>
                                            <div className="text-base font-medium text-[#1A1A1A] md:text-[18px]">{item.title}</div>
                                            <div className="mt-1 text-sm leading-[1.4] text-[#666666] md:text-[16px]">{item.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section
                id="pricing"
                className="bg-white py-12 md:py-[100px]"
                aria-label="Pricing"
            >
                <div className="safe-pad mx-auto w-full max-w-[1440px] px-5 md:px-[182px]">
                    <div className="text-center">
                        <h2 className="text-3xl font-medium leading-[1.1] text-[#1A1A1A] md:text-[44px]">One Simple Plan</h2>
                        <p className="mt-3 text-base leading-[1.4] text-[#666666] md:mt-4 md:text-[18px]">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    {/* Mobile: Toggle between plans */}
                    <div className="mt-6 flex justify-center md:hidden">
                        <div className="inline-flex rounded-full bg-gray-100 p-1">
                            <button
                                onClick={() => setBilling("monthly")}
                                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                                    billing === "monthly"
                                        ? "bg-[#014D3F] text-white"
                                        : "text-gray-600"
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBilling("annual")}
                                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                                    billing === "annual"
                                        ? "bg-[#014D3F] text-white"
                                        : "text-gray-600"
                                }`}
                            >
                                Annual
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-6 md:mt-12 md:flex-row md:gap-[32px]">
                        {/* Monthly card (Figma: dark) */}
                        <div className={`w-full rounded-[20px] bg-[#014D3F] p-6 shadow-[0px_2px_20px_rgba(0,0,0,0.2)] md:h-[748px] md:w-[522px] md:rounded-[30px] md:p-[34px] ${billing !== "monthly" ? "hidden md:flex" : ""}`}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-end">
                                    <div className="rounded-[44px] bg-[#075748] px-4 py-1 text-sm font-semibold text-white md:px-6 md:py-2 md:text-[16px]">
                                        Monthly
                                    </div>
                                </div>

                                <div className="mt-4 text-3xl font-semibold leading-[1.2] text-white md:mt-6 md:text-[38px]">
                                    £{Number(monthlyPrice).toFixed(2)}/month
                                </div>

                                <div className="mt-6 md:mt-8">
                                    <div className="text-base font-medium text-white md:text-[18px]">Include with every plan</div>
                                    <div className="mt-3 space-y-2 md:mt-4">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-2 md:gap-3">
                                                <img src="/figma/check-16.svg" alt="" aria-hidden="true" className="h-4 w-4" />
                                                <div className="text-sm leading-[1.2] text-white/80 md:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-4 h-px w-full bg-[#40C46C] md:my-6" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-base font-medium text-white md:text-[18px]">Mail Forwarding rules</div>
                                    <div className="mt-2 space-y-2 md:mt-3">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-2 md:gap-3">
                                                <img src="/figma/check-20.svg" alt="" aria-hidden="true" className="mt-[2px] h-5 w-5" />
                                                <div className="text-sm leading-[1.4] text-white/80 md:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 md:pt-8">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[44px] w-full rounded-[30px] bg-[#40C46C] text-sm font-medium text-[#014D3F] hover:bg-[#40C46C]/90 md:h-[48px] md:text-[16px]"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Annual card (Figma: light) */}
                        <div className={`w-full rounded-[20px] bg-white p-6 shadow-[0px_2px_20px_rgba(0,0,0,0.1)] md:h-[748px] md:w-[522px] md:rounded-[30px] md:p-[34px] ${billing !== "annual" ? "hidden md:flex" : ""}`}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-end">
                                    <div className="rounded-[44px] bg-[#075748] px-4 py-1 text-sm font-semibold text-white md:px-6 md:py-2 md:text-[16px]">
                                        Annual
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between md:mt-6">
                                    <div className="text-3xl font-semibold leading-[1.2] text-[#1A1A1A] md:text-[38px]">
                                        £{Number(annualPrice).toFixed(2)}/year
                                    </div>
                                    <div className="text-sm font-medium text-[#FF6900] md:text-[16px]">20% Save</div>
                                </div>

                                <div className="mt-6 md:mt-8">
                                    <div className="text-base font-medium text-[#1A1A1A] md:text-[18px]">Include with every plan</div>
                                    <div className="mt-3 space-y-2 md:mt-4">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-2 md:gap-3">
                                                <img src="/figma/check-16.svg" alt="" aria-hidden="true" className="h-4 w-4" />
                                                <div className="text-sm leading-[1.2] text-[#666666] md:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-4 h-px w-full bg-[#E5E7EB] md:my-6" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-base font-medium text-[#1A1A1A] md:text-[18px]">Mail Forwarding rules</div>
                                    <div className="mt-2 space-y-2 md:mt-3">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-2 md:gap-3">
                                                <img src="/figma/check-20.svg" alt="" aria-hidden="true" className="mt-[2px] h-5 w-5" />
                                                <div className="text-sm leading-[1.4] text-[#666666] md:text-[16px]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 md:pt-8">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        variant="outline"
                                        className="h-[44px] w-full rounded-[30px] border border-[#014D3F] bg-white text-sm font-medium text-[#014D3F] hover:bg-[#014D3F] hover:text-white md:h-[48px] md:text-[16px]"
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

            {/* BUILT FOR MODERN UK BUSINESSES - WHITE BACKGROUND */}
            <section className="w-full bg-white py-12 md:py-20">
                <div className="safe-pad mx-auto w-full max-w-[1440px] px-5 md:px-20">
                    <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-[207px]">
                        <div className="w-full md:h-[186px] md:w-[433px]">
                            <h2 className="text-3xl font-medium leading-[1.1] text-[#1A1A1A] md:text-[44px]">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-4 text-sm leading-[1.4] text-[#666666] md:mt-5 md:text-[16px]">
                                Designed for founders who want a professional London presence without renting office space or publishing their home address.
                            </p>
                        </div>

                        <div className="hidden h-[212px] w-px bg-[#E5E7EB] md:block" />

                        <div className="w-full space-y-[10px] md:w-[433px]">
                            {[
                                { t: "One clear service.", icon: "/figma/builtfor-icon-1.svg" },
                                { t: "One predictable price.", icon: "/figma/builtfor-icon-2.svg" },
                                { t: "Secure mail handling you can rely on.", icon: "/figma/builtfor-icon-3.svg" },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="flex h-[64px] items-center gap-3 rounded-[10px] bg-[#F9F9F9] px-5 md:h-[72px] md:gap-[14px] md:px-[24px]"
                                >
                                    <img src={x.icon} alt="" aria-hidden="true" className="h-6 w-6 flex-shrink-0" />
                                    <div className="text-sm font-normal leading-[1.1] text-[#666666] md:text-[16px]">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA IMAGE SECTION */}
            <section className="w-full bg-white pb-8 md:pb-20">
                <div className="safe-pad mx-auto w-full max-w-[1280px] px-5 md:px-20">
                    {/* Desktop: 1280x589 container with overflow hidden */}
                    <div className="relative overflow-hidden rounded-[20px] bg-[#014D3F] md:h-[589px] md:rounded-[30px]">
                        {/* Content frame positioned to allow illustration to bleed */}
                        <div className="relative flex flex-col items-center gap-6 p-6 md:absolute md:-left-[77px] md:-top-[114px] md:flex-row md:gap-10 md:p-0">
                            {/* Illustration (857x817 on desktop, hidden on mobile) */}
                            <div className="hidden md:block md:h-[817px] md:w-[857px]">
                                <img
                                    src="/figma/cta-illustration.png"
                                    alt="London illustration"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            {/* Text content (409px wide on desktop) */}
                            <div className="w-full md:w-[409px]">
                                <h2 className="text-2xl font-medium leading-[1.2] text-white md:text-[44px]">
                                    Get your London Business Address Today
                                </h2>
                                <p className="mt-2 text-sm leading-[1.4] text-white/80 md:mt-3 md:text-[16px]">
                                    Everything included for £9.99 per month.
                                </p>
                                <div className="mt-4 md:mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[44px] w-full rounded-[30px] bg-[#40C46C] text-sm font-medium text-[#024E40] hover:bg-[#40C46C]/90 md:h-[48px] md:w-[268px] md:text-[16px]"
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
