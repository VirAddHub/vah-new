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
                <div className="safe-pad mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 md:px-12 md:py-10 lg:px-20">
                    <div className="flex flex-col items-center gap-6 sm:gap-8 lg:flex-row lg:items-center lg:gap-[98px]">
                        <div className="w-full lg:w-[600px]">
                            <h1 className="text-2xl font-medium leading-[1.1] text-white sm:text-3xl md:text-4xl lg:text-[54px]">
                                A credible London business address without the cost of an office.
                            </h1>

                            <div className="mt-3 space-y-1.5 text-xs leading-[1.6] text-white/90 sm:mt-4 sm:space-y-2 sm:text-sm md:text-base lg:mt-5">
                                <p>Run your business professionally without exposing your home address.</p>
                                <p>Use one trusted London address as your Registered Office, Director&apos;s Service Address, and professional business address.</p>
                                <p>Suitable for Companies House, HMRC, and everyday business use.</p>
                                <p>Everything you need is included in one simple service.</p>
                            </div>

                            <div className="mt-4 sm:mt-5 lg:mt-6">
                                <div className="text-base font-medium text-white sm:text-lg lg:text-[18px]">£9.99 per month</div>
                                <div className="text-xs text-white/80 sm:text-sm lg:text-[14px]">with one clear plan</div>
                            </div>

                            <div className="mt-4 sm:mt-5">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[44px] w-full rounded-[33px] bg-[#40C46C] px-4 text-sm font-medium text-[#024E40] hover:bg-[#40C46C]/90 sm:h-[48px] sm:w-[85%] sm:text-base md:w-[75%] lg:h-[57px] lg:w-[294px] lg:text-[16px]"
                                >
                                    Get Your London Address
                                </Button>
                            </div>
                        </div>

                        <div className="h-[250px] w-full overflow-hidden rounded-[20px] sm:h-[350px] md:h-[450px] lg:h-[540px] lg:w-[582px] lg:rounded-[30px]">
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
                className="w-full bg-white py-8 sm:py-12 md:py-16 lg:py-[100px]"
                aria-label="What's Included"
            >
                <div className="safe-pad mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 lg:px-[100px]">
                    <div className="flex flex-col items-start gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-end lg:gap-[62px]">
                        <div className="h-auto w-full lg:h-[721px] lg:w-[650px]">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt="What's included illustration"
                                className="h-full w-full object-contain lg:object-cover"
                            />
                        </div>

                        <div className="w-full lg:w-[528px]">
                            <h2 className="text-2xl font-medium leading-[1.136] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-[44px]">What&apos;s Included</h2>

                            <div className="mt-4 flex gap-2 sm:mt-6 sm:gap-3 lg:mt-10 lg:gap-[17px]">
                                {/* left rail (dots + line) */}
                                <div className="relative w-[12px] sm:w-[15px] lg:w-[20px]">
                                    <div className="absolute left-[5px] top-[5px] h-[480px] w-px bg-[#024E40]/40 sm:left-[6px] sm:h-[520px] lg:left-[9px] lg:top-[6px] lg:h-[559px]" />
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="absolute left-[2px] h-[8px] w-[8px] rounded-full bg-[#024E40] sm:left-[3px] sm:h-[10px] sm:w-[10px] lg:left-[4px] lg:h-[12px] lg:w-[12px]"
                                            style={{ top: 6 + i * 85 }}
                                        />
                                    ))}
                                </div>

                                <div className="flex-1 space-y-3 sm:space-y-4 lg:w-[490px] lg:space-y-6">
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
                                            <div className="text-sm font-medium text-[#1A1A1A] sm:text-base md:text-lg lg:text-[18px]">{item.title}</div>
                                            <div className="mt-0.5 text-xs leading-[1.4] text-[#666666] sm:mt-1 sm:text-sm md:text-base lg:text-[16px]">{item.description}</div>
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
                className="bg-white py-8 sm:py-12 md:py-16 lg:py-[100px]"
                aria-label="Pricing"
            >
                <div className="safe-pad mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-12 lg:px-[182px]">
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
                                    £{Number(monthlyPrice).toFixed(2)}/month
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
                                        £{Number(annualPrice).toFixed(2)}/year
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
            <section className="w-full bg-white py-8 sm:py-12 md:py-16 lg:py-20">
                <div className="safe-pad mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-12 lg:px-20">
                    <div className="flex flex-col items-center gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-center lg:gap-[207px]">
                        <div className="w-full lg:h-[186px] lg:w-[433px]">
                            <h2 className="text-2xl font-medium leading-[1.1] text-[#1A1A1A] sm:text-3xl md:text-4xl lg:text-[44px]">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-3 text-xs leading-[1.4] text-[#666666] sm:mt-4 sm:text-sm md:text-base lg:mt-5 lg:text-[16px]">
                                Designed for founders who want a professional London presence without renting office space or publishing their home address.
                            </p>
                        </div>

                        <div className="hidden h-[212px] w-px bg-[#E5E7EB] lg:block" />

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
            <section className="w-full bg-white pb-6 sm:pb-8 md:pb-12 lg:pb-20">
                <div className="safe-pad mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 lg:px-20">
                    {/* Container with responsive height */}
                    <div className="relative overflow-hidden rounded-[20px] bg-[#014D3F] lg:h-[589px] lg:rounded-[30px]">
                        {/* Content frame */}
                        <div className="relative flex flex-col items-center gap-4 p-5 sm:gap-6 sm:p-6 md:p-8 lg:absolute lg:-left-[77px] lg:-top-[114px] lg:flex-row lg:gap-10 lg:p-0">
                            {/* Illustration (hidden on mobile/tablet) */}
                            <div className="hidden lg:block lg:h-[817px] lg:w-[857px]">
                                <img
                                    src="/figma/cta-illustration.png"
                                    alt="London illustration"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            {/* Text content */}
                            <div className="w-full lg:w-[409px]">
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
