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

    // (keeping usePricing for live values, but layout is fixed to Figma)

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
                <div className="mx-auto w-full max-w-[1280px] px-20 py-10">
                    {/* Top row is handled by Navigation component; hero content below */}
                    <div className="flex items-center gap-[98px]">
                        <div className="w-[600px]">
                            <h1 className="text-[54px] leading-[1.1] font-medium text-white">
                                A credible London business address without the cost of an office.
                            </h1>

                            <div className="mt-5 space-y-2 text-[14px] leading-[1.6] text-white/90">
                                <p>Run your business professionally without exposing your home address.</p>
                                <p>Use one trusted London address as your Registered Office, Director&apos;s Service Address, and professional business address.</p>
                                <p>Suitable for Companies House, HMRC, and everyday business use.</p>
                                <p>Everything you need is included in one simple service.</p>
                            </div>

                            <div className="mt-6">
                                <div className="text-[18px] font-medium text-white">£9.99 per month</div>
                                <div className="text-[14px] text-white/80">with one clear plan</div>
                            </div>

                            <div className="mt-5">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    className="h-[57px] w-[294px] rounded-[33px] bg-[#40C46C] px-4 text-[16px] font-medium text-[#024E40] hover:bg-[#40C46C]/90"
                                >
                                    Get Your London Address
                                </Button>
                            </div>
                        </div>

                        <div className="h-[540px] w-[582px] overflow-hidden rounded-[30px]">
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
                className="w-full bg-white py-[100px]"
                aria-label="What's Included"
            >
                <div className="mx-auto w-full max-w-[1280px] px-[100px]">
                    <div className="flex items-end gap-[62px]">
                        <div className="h-[721px] w-[650px]">
                            <img
                                src="/figma/whats-included-illustration.png"
                                alt="What's included illustration"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="w-[528px]">
                            <h2 className="text-[44px] font-medium leading-[1.136] text-[#1A1A1A]">What&apos;s Included</h2>

                            <div className="mt-10 flex gap-[17px]">
                                {/* left rail (dots + line) - simplified to match spacing */}
                                <div className="relative w-[20px]">
                                    <div className="absolute left-[9px] top-[6px] h-[559px] w-px bg-[#024E40]/40" />
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="absolute left-[4px] h-[12px] w-[12px] rounded-full bg-[#024E40]"
                                            style={{ top: 10 + i * 104 }}
                                        />
                                    ))}
                                </div>

                                <div className="w-[490px] space-y-6">
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
                                            <div className="text-[18px] font-medium text-[#1A1A1A]">{item.title}</div>
                                            <div className="mt-1 text-[16px] leading-[1.4] text-[#666666]">{item.description}</div>
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
                className="bg-white py-[100px]"
                aria-label="Pricing"
            >
                <div className="mx-auto w-full max-w-[1440px] px-[182px]">
                    <div className="text-center">
                        <h2 className="text-[44px] font-medium leading-[1.1] text-[#1A1A1A]">One Simple Plan</h2>
                        <p className="mt-4 text-[18px] leading-[1.4] text-[#666666]">
                            One simple plan with everything included. Switch billing frequency anytime.
                        </p>
                    </div>

                    <div className="mt-12 flex items-center gap-[32px]">
                        {/* Monthly card (Figma: dark) */}
                        <div className="h-[748px] w-[522px] rounded-[30px] bg-[#014D3F] p-[34px] shadow-[0px_2px_20px_rgba(0,0,0,0.2)]">
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-end">
                                    <div className="rounded-[44px] bg-[#075748] px-6 py-2 text-[16px] font-semibold text-white">
                                        Monthly
                                    </div>
                                </div>

                                <div className="mt-6 text-[38px] font-semibold leading-[1.2] text-white">
                                    £{Number(monthlyPrice).toFixed(2)}/month
                                </div>

                                <div className="mt-8">
                                    <div className="text-[18px] font-medium text-white">Include with every plan</div>
                                    <div className="mt-4 space-y-2">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-3">
                                                <img src="/figma/check-16.svg" alt="" aria-hidden="true" className="h-4 w-4" />
                                                <div className="text-[16px] leading-[1.2] text-white/80">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-6 h-px w-full bg-[#40C46C]" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-[18px] font-medium text-white">Mail Forwarding rules</div>
                                    <div className="mt-3 space-y-2">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-3">
                                                <img src="/figma/check-20.svg" alt="" aria-hidden="true" className="mt-[2px] h-5 w-5" />
                                                <div className="text-[16px] leading-[1.4] text-white/80">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="mt-8 h-[48px] w-full rounded-[30px] bg-[#40C46C] text-[16px] font-medium text-[#014D3F] hover:bg-[#40C46C]/90"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Annual card (Figma: light) */}
                        <div className="h-[748px] w-[522px] rounded-[30px] bg-white p-[34px] shadow-[0px_2px_20px_rgba(0,0,0,0.1)]">
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-end">
                                    <div className="rounded-[44px] bg-[#075748] px-6 py-2 text-[16px] font-semibold text-white">
                                        Annual
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    <div className="text-[38px] font-semibold leading-[1.2] text-[#1A1A1A]">
                                        £{Number(annualPrice).toFixed(2)}/year
                                    </div>
                                    <div className="text-[16px] font-medium text-[#FF6900]">20% Save</div>
                                </div>

                                <div className="mt-8">
                                    <div className="text-[18px] font-medium text-[#1A1A1A]">Include with every plan</div>
                                    <div className="mt-4 space-y-2">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <div key={t} className="flex items-center gap-3">
                                                <img src="/figma/check-16.svg" alt="" aria-hidden="true" className="h-4 w-4" />
                                                <div className="text-[16px] leading-[1.2] text-[#666666]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-6 h-px w-full bg-[#E5E7EB]" style={{ opacity: 0.86 }} />

                                <div>
                                    <div className="text-[18px] font-medium text-[#1A1A1A]">Mail Forwarding rules</div>
                                    <div className="mt-3 space-y-2">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <div key={t} className="flex items-start gap-3">
                                                <img src="/figma/check-20.svg" alt="" aria-hidden="true" className="mt-[2px] h-5 w-5" />
                                                <div className="text-[16px] leading-[1.4] text-[#666666]">{t}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        variant="outline"
                                        className="mt-8 h-[48px] w-full rounded-[30px] border border-[#014D3F] bg-white text-[16px] font-medium text-[#014D3F] hover:bg-[#014D3F] hover:text-white"
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

            {/* BUILT FOR MODERN UK BUSINESSES (black section) */}
            <section className="w-full bg-black">
                <div className="mx-auto w-full max-w-[1440px] px-[80px] py-[80px]">
                    <div className="flex items-center gap-[207px]">
                        <div className="h-[186px] w-[433px]">
                            <h2 className="text-[44px] font-medium leading-[1.1] text-[#1A1A1A]">
                                Built for Modern UK Businesses
                            </h2>
                            <p className="mt-5 text-[16px] leading-[1.4] text-[#666666]">
                                Designed for founders who want a professional London presence without renting office space or publishing their home address.
                            </p>
                        </div>

                        <div className="h-[212px] w-px bg-[#E5E7EB]" />

                        <div className="w-[433px] space-y-[10px]">
                            {[
                                { t: "One clear service.", icon: "/figma/builtfor-icon-1.svg" },
                                { t: "One predictable price.", icon: "/figma/builtfor-icon-2.svg" },
                                { t: "Secure mail handling you can rely on.", icon: "/figma/builtfor-icon-3.svg" },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="flex h-[72px] items-center gap-[14px] rounded-[10px] bg-[#F9F9F9] px-[24px]"
                                >
                                    <img src={x.icon} alt="" aria-hidden="true" className="h-6 w-6" />
                                    <div className="text-[16px] font-normal leading-[1.1] text-[#666666]">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA IMAGE SECTION */}
            <section className="w-full bg-white">
                <div className="mx-auto w-full max-w-[1280px] px-20 pb-20">
                    <div className="overflow-hidden rounded-[30px] bg-[#014D3F]">
                        <div className="flex items-center gap-10">
                            <div className="w-[857px]">
                                <img
                                    src="/figma/cta-illustration.png"
                                    alt="London illustration"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="w-[409px] pr-10">
                                <h2 className="text-[44px] font-medium leading-[1.2] text-white">
                                    Get your London Business Address Today
                                </h2>
                                <p className="mt-3 text-[16px] leading-[1.4] text-white/80">
                                    Everything included for £9.99 per month.
                                </p>
                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[48px] w-[268px] rounded-[30px] bg-[#40C46C] text-[16px] font-medium text-[#024E40] hover:bg-[#40C46C]/90"
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
