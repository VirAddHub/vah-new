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
            <section className="relative bg-gradient-to-b from-background to-muted border-b border-border">
                <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-16 lg:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* LEFT COLUMN - Content */}
                        <div className="lg:col-span-6 xl:col-span-6 lg:pr-10 text-left">
                            <h1 className="text-h1 lg:text-display font-semibold leading-tight text-foreground tracking-tight">
                                Your <span className="relative inline-block">
                                    <span className="font-accent italic">Central London</span>
                                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-full" aria-hidden="true"></span>
                                </span> Address
                            </h1>

                            <p className="mt-6 text-body-lg lg:text-h4 text-foreground leading-relaxed">
                                A compliant alternative to a physical office.
                            </p>

                            <p className="mt-4 text-body text-foreground leading-relaxed">
                                Use one trusted address for <strong className="font-semibold text-foreground">Companies House</strong>, <strong className="font-semibold text-foreground">HMRC</strong>, and <strong className="font-semibold text-foreground">official business mail</strong> without using your home address.
                            </p>

                            {/* Pricing - No Box */}
                            <div className="mt-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-display font-semibold text-foreground tabular-nums min-w-[110px] inline-block">{formatMonthly(monthlyPrice)}</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>One plan</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Everything included</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
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
                                    className="h-12 px-8 rounded-xl text-body font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Get Started
                                </Button>
                                <p className="mt-4 text-body-sm text-muted-foreground">
                                    UK Companies House & HMRC compliant.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Dashboard visual */}
                        <div className="lg:col-span-6 xl:col-span-6 lg:pl-2 hidden lg:block select-none overflow-hidden">
                            <div className="relative w-full aspect-[4/3] rounded-2xl border border-border/60 bg-card shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
                                {/* Header */}
                                <div className="h-12 border-b border-border flex items-center px-4 gap-4 bg-muted/50/70">
                                    <div className="flex gap-1.5 opacity-80">
                                        <div className="w-3 h-3 rounded-full bg-destructive" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                    </div>
                                    <div className="h-6 w-32 md:w-48 bg-card border border-border rounded-md ml-4 shadow-sm" />
                                </div>
                                {/* Body */}
                                <div className="flex flex-1 overflow-hidden bg-muted/50/50">
                                    {/* Sidebar */}
                                    <div className="w-20 md:w-48 border-r border-border bg-card p-4 flex flex-col gap-3">
                                        <div className="h-5 w-full bg-primary/10 rounded-md border border-primary/20" />
                                        <div className="h-4 w-3/4 bg-muted/50 rounded-md" />
                                        <div className="h-4 w-5/6 bg-muted/50 rounded-md" />
                                    </div>
                                    {/* Content Area */}
                                    <div className="flex-1 p-5 md:p-8 flex flex-col gap-6 bg-muted/50/30">
                                         {/* Top Bar */}
                                         <div className="flex justify-between items-center w-full pb-4 border-b border-border">
                                             <div className="h-7 w-32 bg-muted rounded-lg shadow-sm" />
                                             <div className="h-8 w-24 bg-primary rounded-lg shadow-sm" />
                                         </div>
                                         {/* Mail Items */}
                                         <div className="flex flex-col gap-3">
                                             <div className="h-16 w-full bg-card border border-border/80 rounded-xl shadow-sm flex items-center px-4 gap-4 hover:border-primary/30 transition-colors">
                                                 <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                                     <Mail className="w-4 h-4 text-primary" strokeWidth={2.5} />
                                                 </div>
                                                 <div className="flex flex-col gap-1.5 flex-1">
                                                     <div className="h-3.5 w-32 md:w-48 bg-muted rounded shadow-sm opacity-90" />
                                                     <div className="h-2.5 w-20 md:w-24 bg-muted rounded" />
                                                 </div>
                                                 <div className="h-6 w-16 bg-muted rounded-md hidden md:block" />
                                             </div>
                                             <div className="h-16 w-full bg-card border border-border/80 rounded-xl shadow-sm flex items-center px-4 gap-4 opacity-75">
                                                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                                                     <Receipt className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                                                  </div>
                                                  <div className="flex flex-col gap-1.5 flex-1">
                                                     <div className="h-3.5 w-40 md:w-56 bg-muted rounded shadow-sm opacity-90" />
                                                     <div className="h-2.5 w-24 md:w-32 bg-muted rounded" />
                                                 </div>
                                                 <div className="h-6 w-16 bg-muted rounded-md hidden md:block" />
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
            <section className="bg-muted py-16 lg:py-24">
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
                            <h2 className="text-h1 lg:text-display text-foreground tracking-tight">
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
                                            <p className="font-medium text-foreground leading-snug">
                                                {item.title}
                                            </p>
                                            <p className="mt-1 text-body-sm text-muted-foreground leading-relaxed">
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
                        <h2 className="text-h2 text-foreground sm:text-h1 md:text-display lg:text-display">Simple pricing</h2>
                        <p className="mt-1.5 text-body-sm text-muted-foreground sm:mt-2 sm:text-body lg:mt-3 lg:text-body">
                            One monthly plan covering your core address and digital mail handling, with no hidden extras.
                        </p>
                    </div>

                    {/* Toggle for Monthly/Annual */}
                    <BillingToggle billing={billing} onChange={setBilling} />

                    <div className="flex justify-center">
                        {/* Single card that switches based on toggle */}
                        {billing === "monthly" ? (
                            <div className="w-full max-w-[420px] rounded-3xl border border-primary/20 bg-gradient-to-b from-secondary to-secondary/90 p-5 shadow-lg sm:p-6 flex flex-col text-foreground">
                                <div className="text-h2 font-semibold tabular-nums min-w-[110px] sm:text-h1 lg:text-display">
                                    {formatMonthly(monthlyPrice)}
                                </div>

                                <div className="mt-5">
                                    <p className="text-body font-semibold text-foreground sm:text-body-lg">
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
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm leading-[1.4] text-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="my-5 h-px w-full bg-background/20 sm:my-6" />

                                <div>
                                    <p className="text-body-sm font-semibold text-foreground sm:text-body">
                                        Mail Forwarding rules
                                    </p>
                                    <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5" aria-label="Mail forwarding rules">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <li key={t} className="flex items-start gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm leading-[1.4] text-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        className="h-11 w-full rounded-full bg-card text-primary hover:bg-background/95 text-body-sm font-medium focus-visible:ring-white/50"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[420px] rounded-3xl bg-card p-5 shadow-md sm:p-6 flex flex-col border border-border">
                                <div className="flex items-center justify-between">
                                    <div className="text-h2 font-semibold text-foreground tabular-nums min-w-[110px] sm:text-h1 lg:text-display">
                                        {formatAnnual(annualPrice)}
                                    </div>
                                    <span className="text-caption font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 px-2.5 py-1 rounded-full sm:text-body-sm">20% Save</span>
                                </div>

                                <div className="mt-5">
                                    <p className="text-body font-semibold text-foreground sm:text-body-lg">
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
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm leading-[1.4] text-muted-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="my-5 h-px w-full bg-border sm:my-6" />

                                <div>
                                    <p className="text-body-sm font-semibold text-foreground sm:text-body">
                                        Mail Forwarding rules
                                    </p>
                                    <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5" aria-label="Mail forwarding rules">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <li key={t} className="flex items-start gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm leading-[1.4] text-muted-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        variant="primary"
                                        className="h-11 w-full rounded-full text-body-sm font-medium"
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
                            <h2 id="core-value-heading" className="text-h2 font-semibold leading-tight tracking-tight text-foreground sm:text-h1 md:text-display lg:text-display">
                                Keep Your Home Address Private
                            </h2>
                            <p className="mt-3 text-body text-muted-foreground sm:mt-4 sm:text-body-lg lg:mt-5 lg:text-h4">
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
                                    className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs sm:px-5 sm:py-4 lg:min-h-[72px] lg:gap-3.5 lg:px-6"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted" aria-hidden="true">
                                        <x.Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" strokeWidth={2} />
                                    </span>
                                    <div className="text-body font-medium text-muted-foreground">{x.t}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA — signup + pricing */}
            <section className="py-12 lg:py-20 bg-background">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-secondary to-secondary/90 text-foreground shadow-lg">
                        <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
                            <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                            <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-background/10 blur-2xl" />

                            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                                {/* Left: headline + supporting text + trust pills */}
                                <div className="lg:max-w-3xl">
                                    <h2 className="text-h2 font-semibold leading-tight tracking-tight text-foreground sm:text-h1 lg:text-display">
                                        Your <span className="font-accent italic">Central London</span> business address
                                    </h2>
                                    <p className="mt-4 text-body text-foreground sm:text-body-lg">
                                        Use one trusted address for company registration, business mail, and everyday correspondence.
                                    </p>
                                    <div className="mt-5 flex flex-wrap gap-2.5 lg:mt-6">
                                        <span className="inline-flex items-center rounded-full border border-white/20 bg-background/10 px-3 py-1.5 text-body-sm text-foreground">ICO Registration: ZA123456</span>
                                        <span className="inline-flex items-center rounded-full border border-white/20 bg-background/10 px-3 py-1.5 text-body-sm text-foreground">HMRC AML Supervised</span>
                                        <span className="inline-flex items-center rounded-full border border-white/20 bg-background/10 px-3 py-1.5 text-body-sm text-foreground tabular-nums">{formatMonthly(monthlyPrice)} · Cancel anytime</span>
                                    </div>
                                </div>

                                {/* Right: CTAs + microcopy */}
                                <div className="lg:ml-8 lg:shrink-0">
                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col lg:min-w-[220px]">
                                        <Button
                                            onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                            className="w-full bg-card text-primary hover:bg-background/95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
                                        >
                                            Get started now
                                        </Button>
                                        <Button
                                            onClick={() => handleNavClick?.("pricing")}
                                            variant="outline"
                                            className="w-full border-white/40 text-foreground hover:bg-background/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
                                        >
                                            View pricing
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
