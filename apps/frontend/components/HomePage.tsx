'use client';

import { useState, useEffect } from "react";
import { ArrowRight, Receipt, Check, ShieldCheck, Mail } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { usePricing } from "@/hooks/usePlans";
import { formatMonthly, formatAnnual } from "@/lib/formatPrice";
import { Button } from "./ui/button";
import HowItWorks from "./HowItWorks";
import { BillingToggle } from "./ui/BillingToggle";

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
                <div className="mx-auto max-w-[1200px] px-6 lg:px-8 py-16 lg:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* LEFT COLUMN - Content */}
                        <div className="lg:col-span-6 xl:col-span-6 lg:pr-10 text-left">
                            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight text-neutral-900 tracking-tight">
                                Your <span className="relative inline-block">
                                    Central London
                                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-full" aria-hidden="true"></span>
                                </span> Address
                            </h1>

                            <p className="mt-6 text-lg lg:text-xl text-neutral-600/90 leading-relaxed">
                                A compliant alternative to a physical office.
                            </p>

                            <p className="mt-4 text-base text-neutral-700 leading-relaxed">
                                Use one trusted address for <strong className="font-semibold text-neutral-900">Companies House</strong>, <strong className="font-semibold text-neutral-900">HMRC</strong>, and <strong className="font-semibold text-neutral-900">official business mail</strong> without using your home address.
                            </p>

                            {/* Pricing - No Box */}
                            <div className="mt-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-semibold text-neutral-900 tabular-nums min-w-[110px] inline-block">{formatMonthly(monthlyPrice)}</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>One plan</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Everything included</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>No surprises</span>
                                    </div>
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
                                    UK Companies House & HMRC compliant.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Dashboard visual */}
                        <div className="lg:col-span-6 xl:col-span-6 lg:pl-2 hidden lg:block select-none overflow-hidden">
                            <div className="relative w-full aspect-[4/3] rounded-2xl border border-neutral-200/60 bg-white shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
                                {/* Header */}
                                <div className="h-12 border-b border-neutral-100 flex items-center px-4 gap-4 bg-neutral-50/70">
                                    <div className="flex gap-1.5 opacity-80">
                                        <div className="w-3 h-3 rounded-full bg-rose-400" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="h-6 w-32 md:w-48 bg-white border border-neutral-200 rounded-md ml-4 shadow-sm" />
                                </div>
                                {/* Body */}
                                <div className="flex flex-1 overflow-hidden bg-neutral-50/50">
                                    {/* Sidebar */}
                                    <div className="w-20 md:w-48 border-r border-neutral-100 bg-white p-4 flex flex-col gap-3">
                                        <div className="h-5 w-full bg-emerald-50 rounded-md border border-emerald-100/50" />
                                        <div className="h-4 w-3/4 bg-neutral-50 rounded-md" />
                                        <div className="h-4 w-5/6 bg-neutral-50 rounded-md" />
                                    </div>
                                    {/* Content Area */}
                                    <div className="flex-1 p-5 md:p-8 flex flex-col gap-6 bg-neutral-50/30">
                                         {/* Top Bar */}
                                         <div className="flex justify-between items-center w-full pb-4 border-b border-neutral-100">
                                             <div className="h-7 w-32 bg-neutral-800 rounded-lg shadow-sm" />
                                             <div className="h-8 w-24 bg-emerald-600 rounded-lg shadow-sm" />
                                         </div>
                                         {/* Mail Items */}
                                         <div className="flex flex-col gap-3">
                                             <div className="h-16 w-full bg-white border border-neutral-200/80 rounded-xl shadow-sm flex items-center px-4 gap-4 hover:border-emerald-200/80 transition-colors">
                                                 <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shrink-0">
                                                     <Mail className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                                                 </div>
                                                 <div className="flex flex-col gap-1.5 flex-1">
                                                     <div className="h-3.5 w-32 md:w-48 bg-neutral-800 rounded shadow-sm opacity-90" />
                                                     <div className="h-2.5 w-20 md:w-24 bg-neutral-300 rounded" />
                                                 </div>
                                                 <div className="h-6 w-16 bg-neutral-100 rounded-md hidden md:block" />
                                             </div>
                                             <div className="h-16 w-full bg-white border border-neutral-200/80 rounded-xl shadow-sm flex items-center px-4 gap-4 opacity-75">
                                                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                                                     <Receipt className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                                                  </div>
                                                  <div className="flex flex-col gap-1.5 flex-1">
                                                     <div className="h-3.5 w-40 md:w-56 bg-neutral-800 rounded shadow-sm opacity-90" />
                                                     <div className="h-2.5 w-24 md:w-32 bg-neutral-300 rounded" />
                                                 </div>
                                                 <div className="h-6 w-16 bg-neutral-100 rounded-md hidden md:block" />
                                             </div>
                                         </div>
                                    </div>
                                </div>
                            </div>
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
                                src="/images/whats-included.png"
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
                                        description: "Use our address for your registered office and director's service address requirements.",
                                    },
                                    {
                                        title: "Professional Business Address",
                                        description: "Present a more established business image across your website, invoices, contracts, and client communications.",
                                    },
                                    {
                                        title: "Same Day Mail Scanning And Instant Alerts",
                                        description: "Your post is processed promptly and uploaded to your dashboard so you can review it online without delay.",
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
                                        description: "Separate your personal address from your business presence for greater privacy and peace of mind.",
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
                        <h2 className="text-2xl font-medium leading-[1.1] text-foreground sm:text-3xl md:text-4xl lg:text-4xl">Simple pricing</h2>
                        <p className="mt-1.5 text-sm leading-[1.4] text-muted-foreground sm:mt-2 sm:text-base md:text-lg lg:mt-3 lg:text-base">
                            One monthly plan covering your core address and digital mail handling, with no hidden extras.
                        </p>
                    </div>

                    {/* Toggle for Monthly/Annual */}
                    <BillingToggle billing={billing} onChange={setBilling} />

                    <div className="flex justify-center">
                        {/* Single card that switches based on toggle */}
                        {billing === "monthly" ? (
                            <div className="w-full max-w-[420px] rounded-3xl border border-emerald-200/60 bg-gradient-to-b from-emerald-900 to-emerald-800 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:p-6 flex flex-col text-white">
                                <div className="text-2xl font-semibold leading-[1.2] tabular-nums min-w-[110px] sm:text-3xl lg:text-4xl">
                                    {formatMonthly(monthlyPrice)}
                                </div>

                                <div className="mt-5">
                                    <p className="text-base font-semibold text-white sm:text-lg">
                                        Everything below is included
                                    </p>
                                    <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5" aria-label="Included features">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <li key={t} className="flex items-center gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 text-emerald-400" strokeWidth={3} />
                                                <span className="text-sm leading-[1.4] text-white/90 sm:text-base">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="my-5 h-px w-full bg-white/20 sm:my-6" />

                                <div>
                                    <p className="text-sm font-semibold text-white sm:text-base">
                                        Mail Forwarding rules
                                    </p>
                                    <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5" aria-label="Mail forwarding rules">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <li key={t} className="flex items-start gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:h-4 sm:w-4 text-emerald-400" strokeWidth={3} />
                                                <span className="text-sm leading-[1.4] text-white/90 sm:text-base">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-[44px] w-full rounded-[30px] bg-white text-emerald-900 hover:bg-white/95 text-sm font-medium focus-visible:ring-white/50"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[420px] rounded-3xl bg-card p-5 shadow-[0px_2px_20px_rgba(0,0,0,0.1)] sm:p-6 flex flex-col border border-border">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-semibold leading-[1.2] text-neutral-900 tabular-nums min-w-[110px] sm:text-3xl lg:text-4xl">
                                        {formatAnnual(annualPrice)}
                                    </div>
                                    <span className="text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 px-2.5 py-1 rounded-full sm:text-sm">20% Save</span>
                                </div>

                                <div className="mt-5">
                                    <p className="text-base font-semibold text-neutral-900 sm:text-lg">
                                        Everything below is included
                                    </p>
                                    <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5" aria-label="Included features">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Unlimited same day mail scanning",
                                            "Secure online dashboard",
                                            "UK based support",
                                        ].map((t) => (
                                            <li key={t} className="flex items-center gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 text-emerald-600" strokeWidth={3} />
                                                <span className="text-sm leading-[1.4] text-neutral-700 dark:text-neutral-300 sm:text-base">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="my-5 h-px w-full bg-border sm:my-6" />

                                <div>
                                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 sm:text-base">
                                        Mail Forwarding rules
                                    </p>
                                    <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5" aria-label="Mail forwarding rules">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <li key={t} className="flex items-start gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:h-4 sm:w-4 text-emerald-600" strokeWidth={3} />
                                                <span className="text-sm leading-[1.4] text-neutral-700 dark:text-neutral-300 sm:text-base">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6">
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

            {/* CORE VALUE PROP */}
            <section className="w-full bg-background pt-14 pb-10 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-24" aria-labelledby="core-value-heading">
                <div className="mx-auto w-full max-w-none px-4 sm:px-6 lg:max-w-7xl lg:px-12">
                    <div className="flex flex-col items-center gap-6 sm:gap-8 md:gap-12 lg:flex-row lg:items-stretch lg:gap-[120px]">
                        <div className="w-full max-w-md lg:max-w-none lg:w-1/2">
                            <h2 id="core-value-heading" className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-3xl md:text-4xl lg:text-5xl lg:leading-[1.1] lg:tracking-[-0.02em]">
                                Keep Your Home Address Private
                            </h2>
                            <p className="mt-3 text-base leading-7 text-zinc-600 sm:mt-4 sm:text-lg lg:mt-5 lg:text-xl">
                                Stay fully compliant with Companies House and HMRC regulations without making your residential address public.
                            </p>
                        </div>

                        <div className="hidden w-px self-stretch bg-border lg:block" />

                        <div className="w-full max-w-md mt-6 space-y-3 sm:mt-8 sm:space-y-4 lg:mt-0 lg:max-w-none lg:w-1/2">
                            {[
                                { t: "Professional by default.", Icon: ShieldCheck },
                                { t: "Straightforward pricing.", Icon: Receipt },
                                { t: "Secure digital mail management.", Icon: Mail },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white/90 px-4 py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:px-5 sm:py-4 lg:min-h-[72px] lg:gap-[14px] lg:px-[24px]"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50" aria-hidden="true">
                                        <x.Icon className="h-4 w-4 text-zinc-600" aria-hidden="true" strokeWidth={2} />
                                    </span>
                                    <div className="text-[17px] font-medium leading-6 text-zinc-700 lg:text-base">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA — signup + pricing */}
            <section className="py-12 lg:py-20 bg-white">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-emerald-900 to-emerald-800 text-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                        <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
                            <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
                            <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                                {/* Left: headline + supporting text + trust pills */}
                                <div className="lg:max-w-3xl">
                                    <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                                        Your Central London business address
                                    </h2>
                                    <p className="mt-4 text-base leading-7 text-emerald-50/95 sm:text-lg">
                                        Use one trusted address for company registration, business mail, and everyday correspondence.
                                    </p>
                                    <div className="mt-5 flex flex-wrap gap-2.5 lg:mt-6">
                                        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/95">ICO Registration: ZA123456</span>
                                        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/95">HMRC AML Supervised</span>
                                        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/95 tabular-nums">{formatMonthly(monthlyPrice)} · Cancel anytime</span>
                                    </div>
                                </div>

                                {/* Right: CTAs + microcopy */}
                                <div className="lg:ml-8 lg:shrink-0">
                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col lg:min-w-[220px]">
                                        <Button
                                            onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                            className="w-full bg-white text-emerald-900 hover:bg-white/95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-800"
                                        >
                                            Get started now
                                        </Button>
                                        <Button
                                            onClick={() => handleNavClick?.("pricing")}
                                            variant="outline"
                                            className="w-full border-white/40 text-white hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-800"
                                        >
                                            View pricing
                                        </Button>
                                    </div>
                                    <p className="mt-3 text-sm text-emerald-100/90">
                                        Setup takes a few minutes.
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
