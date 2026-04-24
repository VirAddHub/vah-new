'use client';

import { useState, useEffect } from "react";
import { Receipt, Check, Mail } from "lucide-react";
import { usePricing } from "@/hooks/usePlans";
import { formatMonthly, formatAnnual } from "@/lib/formatPrice";
import { Button } from "./ui/button";
import HowItWorks from "./HowItWorks";
import { BillingToggle } from "./ui/BillingToggle";
import {
    AmbientHero,
    AmbientPricing,
    AmbientWhatsIncluded,
} from "./homepage/HomepageAtmosphere";

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
    } = usePricing();

    // Backend reachability — must use same-origin BFF (apiClient would call API_BASE cross-origin and CORS-fail in the browser).
    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            try {
                const res = await fetch('/api/bff/health', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (res.ok && data?.ok) {
                    // health check passed
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load health data:', error);
                }
            }
        };
        void loadData();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main
            id="main-content"
            role="main"
            className="bg-background text-foreground font-poppins font-normal not-italic"
        >
            {/* HERO — crisp white surface, light separation only */}
            <section className="relative overflow-hidden border-b border-border/80 bg-background">
                <AmbientHero />
                <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 py-20 lg:py-28">
                    <div className="flex flex-col items-center">
                        {/* Centred copy + pricing + CTA — max-width keeps line length refined */}
                        <div className="w-full max-w-3xl mx-auto text-center flex flex-col items-center">
                            <div className="w-full">
                                <h1 className="font-poppins text-[clamp(1.875rem,4vw+1rem,3rem)] font-normal leading-[0.95] tracking-[-0.04em] text-foreground text-balance">
                                    Your{' '}
                                    <span className="relative inline-block">
                                        <span className="font-poppins font-normal text-primary">Central London</span>
                                        <span className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-full" aria-hidden="true"></span>
                                    </span>{' '}
                                    Address
                                </h1>

                                <p className="mt-6 font-poppins text-[clamp(1rem,1.25vw+0.75rem,1.25rem)] font-normal leading-[1.4] tracking-[-0.01em] text-foreground text-pretty">
                                    A compliant alternative to a physical office.
                                </p>

                                <p className="mt-4 font-poppins text-[clamp(1rem,1.25vw+0.75rem,1.25rem)] font-normal leading-[1.4] tracking-[-0.01em] text-pretty text-foreground">
                                    Use one trusted address for <strong className="font-poppins font-semibold text-foreground">Companies House</strong>, <strong className="font-poppins font-semibold text-foreground">HMRC</strong>, and <strong className="font-poppins font-semibold text-foreground">official business mail</strong> without using your home address.
                                </p>
                            </div>

                            <div className="mt-10 flex flex-col items-center gap-4">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                    size="lg"
                                    className="h-12 px-8 text-body font-poppins !font-normal bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Get Started
                                </Button>
                                <p className="text-body-sm font-poppins font-normal text-muted-foreground tabular-nums">
                                    From {formatMonthly(monthlyPrice)} · Cancel anytime
                                </p>
                            </div>
                        </div>

                        {/* Dashboard visual — below text on all breakpoints */}
                        <div className="w-full max-w-4xl mx-auto mt-12 lg:mt-16 select-none overflow-hidden">
                            <div className="relative w-full aspect-[4/3] rounded-2xl border border-border/80 bg-card shadow-xl shadow-black/[0.06] flex flex-col overflow-hidden ring-1 ring-border/40">
                                {/* Header */}
                                <div className="h-12 border-b border-border flex items-center px-4 gap-4 bg-muted/60">
                                    <div className="flex gap-1.5 opacity-80">
                                        <div className="w-3 h-3 rounded-full bg-destructive" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                    </div>
                                    <div className="h-6 w-32 md:w-48 bg-card border border-border rounded-md ml-4 shadow-sm" />
                                </div>
                                {/* Body */}
                                <div className="flex flex-1 overflow-hidden bg-muted/50">
                                    {/* Sidebar */}
                                    <div className="w-20 md:w-48 border-r border-border bg-card p-4 flex flex-col gap-3">
                                        <div className="h-5 w-full bg-primary/10 rounded-md border border-primary/20" />
                                        <div className="h-4 w-3/4 bg-muted/50 rounded-md" />
                                        <div className="h-4 w-5/6 bg-muted/50 rounded-md" />
                                    </div>
                                    {/* Content Area */}
                                    <div className="flex-1 p-5 md:p-8 flex flex-col gap-6 bg-muted/30">
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

            {/* HOW IT WORKS */}
            <HowItWorks />

            {/* WHAT'S INCLUDED */}
            <section className="relative overflow-hidden border-t border-border/70 bg-muted/60 py-16 sm:py-20 lg:py-24">
                <AmbientWhatsIncluded />
                <div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="text-center mb-10 sm:mb-14">
                        <h2 className="text-h1 lg:text-display font-poppins !font-normal text-foreground tracking-tight">
                            What's included
                        </h2>
                        <p className="mt-3 text-body font-poppins font-normal text-muted-foreground">
                            Everything in one plan — no tiers, no add-ons, no surprises.
                        </p>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                        {[
                            {
                                title: "Registered Office address",
                                description: "Use our London address as your official registered office with Companies House.",
                            },
                            {
                                title: "Director's Service Address",
                                description: "Keep your personal address off the public register — use ours instead.",
                            },
                            {
                                title: "Professional business address",
                                description: "A credible London address for your website, invoices, and client communications.",
                            },
                            {
                                title: "Same day mail scanning",
                                description: "Your post is scanned and available in your dashboard the same day it arrives.",
                            },
                            {
                                title: "Secure online dashboard",
                                description: "View, download, and organise your mail in one place, from anywhere.",
                            },
                            {
                                title: "Privacy protection",
                                description: "Separate your home address from your business presence for peace of mind.",
                            },
                        ].map((item) => (
                            <li key={item.title} className="flex items-start gap-3">
                                <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="font-poppins font-medium text-foreground leading-snug">
                                        {item.title}
                                    </p>
                                    <p className="mt-1 text-body-sm font-poppins font-normal text-muted-foreground leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* PRICING — bright band between tinted sections */}
            <section
                id="pricing"
                className="relative overflow-hidden border-t border-border/70 bg-background py-16 sm:py-20 lg:py-24"
                aria-label="Pricing"
            >
                <AmbientPricing />
                <div className="relative z-10 mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-h2 font-poppins !font-normal text-foreground sm:text-h1 md:text-display lg:text-display">Simple pricing</h2>
                        <p className="mt-1.5 text-body-sm font-poppins font-normal text-muted-foreground sm:mt-2 sm:text-body lg:mt-3 lg:text-body">
                            One monthly plan covering your core address and digital mail handling, with no hidden extras.
                        </p>
                    </div>

                    {/* Toggle for Monthly/Annual */}
                    <BillingToggle billing={billing} onChange={setBilling} />

                    <div className="flex justify-center">
                        {/* Single card that switches based on toggle */}
                        {billing === "monthly" ? (
                            <div className="w-full max-w-[420px] rounded-3xl border-2 border-border bg-card p-5 shadow-2xl shadow-black/[0.08] ring-1 ring-border/40 sm:p-6 flex flex-col text-foreground">
                                <div className="text-h2 font-poppins !font-normal tabular-nums min-w-[110px] sm:text-h1 lg:text-display">
                                    {formatMonthly(monthlyPrice)}
                                </div>

                                <div className="mt-5">
                                    <p className="text-body font-poppins font-normal text-foreground sm:text-body-lg">
                                        Everything below is included
                                    </p>
                                    <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5" aria-label="Included features">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Same day mail scanning & instant alerts",
                                            "Secure online dashboard",
                                            "UK based support",
                                            "Privacy protection",
                                        ].map((t) => (
                                            <li key={t} className="flex items-center gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm font-poppins font-normal leading-[1.4] text-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="my-5 h-px w-full bg-border sm:my-6" />

                                <div>
                                    <p className="text-body-sm font-poppins font-normal text-foreground sm:text-body">
                                        Mail forwarding rules
                                    </p>
                                    <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5" aria-label="Mail forwarding rules">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <li key={t} className="flex items-start gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm font-poppins font-normal leading-[1.4] text-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                                        variant="primary"
                                        className="h-11 w-full text-body-sm font-poppins !font-normal"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[420px] rounded-3xl border-2 border-border bg-card p-5 shadow-2xl shadow-black/[0.08] ring-1 ring-border/40 sm:p-6 flex flex-col text-foreground">
                                <div className="flex flex-col items-start gap-2">
                                    <div className="text-h2 font-poppins !font-normal text-foreground tabular-nums sm:text-h1 lg:text-display">
                                        {formatAnnual(annualPrice)}
                                    </div>
                                    <span className="text-caption font-poppins font-normal text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 px-2.5 py-1 rounded-full sm:text-body-sm">Save {monthlySavingsPct ?? 20}%</span>
                                </div>

                                <div className="mt-5">
                                    <p className="text-body font-poppins font-normal text-foreground sm:text-body-lg">
                                        Everything below is included
                                    </p>
                                    <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5" aria-label="Included features">
                                        {[
                                            "Registered Office address",
                                            "Director's Service Address",
                                            "Professional business address",
                                            "Same day mail scanning & instant alerts",
                                            "Secure online dashboard",
                                            "UK based support",
                                            "Privacy protection",
                                        ].map((t) => (
                                            <li key={t} className="flex items-center gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm font-poppins font-normal leading-[1.4] text-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="my-5 h-px w-full bg-border sm:my-6" />

                                <div>
                                    <p className="text-body-sm font-poppins font-normal text-foreground sm:text-body">
                                        Mail forwarding rules
                                    </p>
                                    <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5" aria-label="Mail forwarding rules">
                                        {[
                                            "HMRC and Companies House letters forwarded free within the UK on request.",
                                            "Other UK letters forwarded at £2 per item.",
                                        ].map((t) => (
                                            <li key={t} className="flex items-start gap-2">
                                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 sm:h-4 sm:w-4 text-primary" strokeWidth={3} />
                                                <span className="text-body-sm font-poppins font-normal leading-[1.4] text-foreground sm:text-body">{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6">
                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: "annual" })}
                                        variant="primary"
                                        className="h-11 w-full text-body-sm font-poppins !font-normal"
                                    >
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="border-t border-border/70 bg-background py-16 sm:py-20 lg:py-24">
                <div className="mx-auto max-w-2xl px-6 text-center">
                    <h2 className="font-poppins !font-normal text-h2 sm:text-h1 lg:text-display text-foreground tracking-tight leading-tight">
                        Get your Central London address today
                    </h2>
                    <p className="mt-4 text-body sm:text-body-lg font-poppins font-normal text-muted-foreground">
                        UK Companies House &amp; HMRC compliant. Everything included, no surprises.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <Button
                            onClick={() => handleNavClick?.("signup", { initialBilling: "monthly" })}
                            size="lg"
                            className="h-12 px-8 bg-primary text-primary-foreground font-poppins !font-normal hover:bg-primary/90 text-body"
                        >
                            Get Started
                        </Button>
                        <p className="text-body-sm font-poppins font-normal text-muted-foreground tabular-nums">
                            {formatMonthly(monthlyPrice)} · Cancel anytime
                        </p>
                    </div>
                </div>
            </section>

        </main>
    );
}
