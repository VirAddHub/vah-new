'use client';

import { useState, useMemo, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
    ArrowRight,
    Mail,
    ShieldCheck,
    Building2,
    ScanLine,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface HomePageProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
    const handleNavClick = (page: string, data?: any) => onNavigate?.(page, data);
    const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
    const [loading, setLoading] = useState(true);

    const isAnnual = billing === "annual";
    const monthlyPrice = 9.99;
    const annualPrice = 89.99;
    const monthlySavingsPct = useMemo(() => {
        const saved = monthlyPrice * 12 - annualPrice;
        const pct = (saved / (monthlyPrice * 12)) * 100;
        return Math.round(pct);
    }, []);

    // Load marketing data (plans and health status)
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [plansResponse, healthResponse] = await Promise.all([
                    apiClient.get('/api/plans'),
                    apiClient.get('/api/health')
                ]);

                if (plansResponse.ok) {
                    // Store plans data for potential use
                    console.log('Plans loaded:', plansResponse.data);
                }

                if (healthResponse.ok) {
                    // Store health data for potential use
                    console.log('Health status:', healthResponse.data);
                }
            } catch (error) {
                console.error('Failed to load marketing data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const priceLabel = isAnnual
        ? `£${annualPrice}`
        : `£${monthlyPrice}`;
    const priceSuffix = isAnnual ? "/year" : "/month";
    const subCopy = isAnnual
        ? "Billed annually · Cancel anytime"
        : "Billed monthly · Cancel anytime";
    const fineCopy = isAnnual
        ? `≈ £${(annualPrice / 12).toFixed(2)}/month · Save ${monthlySavingsPct}%`
        : `Prefer annual? £${annualPrice}/year (≈ £${(annualPrice / 12).toFixed(2)}/mo)`;

    const ctaText = isAnnual
        ? `Choose Annual — £${annualPrice}/year`
        : "Secure My London Address Now";

    const scrollTo = (id: string) =>
        document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

    return (
        <main className="bg-background text-foreground">
            {/* HERO */}
            <section
                className="relative overflow-hidden"
                aria-label="Hero"
            >
                <div className="absolute right-[-8rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-primary/20 to-primary/40 blur-3xl opacity-40" />
                <div className="mx-auto max-w-7xl px-6 pt-20 pb-12 grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7">
                        <h1
                            className="text-[56px] md:text-[72px] lg:text-[80px] font-bold leading-[0.9] tracking-tight"
                            style={{ fontFamily: "Playfair Display, serif" }}
                        >
                            Your Official London Business Address.
                            <span className="block text-primary">
                                Compliant. Private. Seamless.
                            </span>
                        </h1>
                        <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                            Establish your professional London presence and
                            ensure full UK compliance. A prestigious business
                            address for HMRC, Companies House and the
                            Director's Service Address — with unlimited
                            same-day scanning to your secure online dashboard
                            and free UK forwarding for official HMRC &
                            Companies House mail. Flat £9.99/month — one plan,
                            no tiers or surprises.
                        </p>

                        <div className="mt-10">
                            <Button
                                onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                size="lg"
                                className="h-12 px-8 rounded-[16px] bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                Secure My London Address — Start Today
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-sm">
                                ICO — Registered
                            </Badge>
                            <Badge variant="secondary" className="text-sm">
                                HMRC — AML Supervised
                            </Badge>
                            <Badge variant="secondary" className="text-sm">
                                GDPR — Aligned
                            </Badge>
                        </div>
                    </div>
                    <div className="lg:col-span-5">
                        <div className="rounded-[24px] bg-card p-4 shadow-md border border-border">
                            <div className="aspect-[4/3] w-full rounded-[16px] bg-gradient-to-br from-primary/20 via-primary/40 to-primary/60" />
                            <div className="p-4 text-sm text-muted-foreground">
                                Same-Day Scans • Secure Dashboard • UK
                                Forwarding On Request
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS — above pricing */}
            <section
                id="how-it-works"
                className="py-12 bg-primary/5 border-t border-border"
                aria-label="How It Works"
            >
                <div className="mx-auto max-w-6xl px-6">
                    <header className="text-center mb-10">
                        <h2
                            className="text-4xl md:text-5xl font-bold tracking-tight text-primary"
                            style={{ fontFamily: "Playfair Display, serif" }}
                        >
                            How It Works — Clear, Compliant, No Surprises
                        </h2>
                        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Understand the process before you pay.
                            Verification first, address issued next, then
                            professional mail handling.
                        </p>
                    </header>

                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Step 1 */}
                        <article className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition hover:border-primary/40">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mb-4">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h3
                                className="text-xl font-semibold mb-2 text-primary"
                                style={{
                                    fontFamily: "Playfair Display, serif",
                                }}
                            >
                                1) Verify Your Account
                            </h3>
                            <ul className="text-muted-foreground space-y-2 text-sm">
                                <li>
                                    • Create your account and upload ID and proof
                                    of address (KYC/AML).
                                </li>
                                <li>
                                    • We review the documents and notify you when
                                    approved.
                                </li>
                                <li>
                                    • Your official{" "}
                                    <strong>Central London</strong> address
                                    appears in your dashboard once approved.
                                </li>
                            </ul>
                        </article>

                        {/* Step 2 */}
                        <article className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition hover:border-primary/40">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mb-4">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <h3
                                className="text-xl font-semibold mb-2 text-primary"
                                style={{
                                    fontFamily: "Playfair Display, serif",
                                }}
                            >
                                2) Use Your Address Everywhere
                            </h3>
                            <ul className="text-muted-foreground space-y-2 text-sm">
                                <li>
                                    • Update Companies House (Registered Office &
                                    Director's Service Address).
                                </li>
                                <li>
                                    • Use with HMRC, banks, suppliers, and
                                    clients.
                                </li>
                                <li>
                                    • Real, physical address — never a P.O. Box.
                                </li>
                            </ul>
                        </article>

                        {/* Step 3 */}
                        <article className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition hover:border-primary/40">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary mb-4">
                                <ScanLine className="h-5 w-5" />
                            </div>
                            <h3
                                className="text-xl font-semibold mb-2 text-primary"
                                style={{
                                    fontFamily: "Playfair Display, serif",
                                }}
                            >
                                3) We Handle Your Mail
                            </h3>
                            <ul className="text-muted-foreground space-y-2 text-sm">
                                <li>
                                    • Same-day letter scanning on business days to
                                    your secure dashboard.
                                </li>
                                <li>
                                    • <strong>Free UK forwarding</strong> for HMRC
                                    & Companies House letters (on request).
                                </li>
                                <li>
                                    • Other letters can be forwarded for{" "}
                                    <strong>£2 per item</strong> (plus postage).
                                </li>
                                <li>
                                    • Letters only — parcels are not accepted.
                                </li>
                            </ul>
                        </article>
                    </div>

                    {/* Expectation strip */}
                    <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/10 p-6">
                        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div>
                                🔓 Activation happens after verification —
                                you're in control throughout.
                            </div>
                            <div>
                                📬 Nothing is auto-forwarded without your
                                request.
                            </div>
                            <div>
                                🔒 UK GDPR aligned — access limited to trained,
                                vetted staff.
                            </div>
                        </div>
                        <div className="mt-5 text-center">
                            <Button
                                variant="outline"
                                onClick={() => handleNavClick?.("help")}
                                className="rounded-[12px] border-primary/30 text-primary hover:bg-primary/10"
                            >
                                Need more detail? Visit the Help Centre
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section
                id="pricing"
                className="py-12 md:py-14 bg-primary/5 border-y border-border"
                aria-label="Pricing"
            >
                <div className="mx-auto max-w-7xl px-6">
                    <div className="text-center mb-8">
                        <h2
                            className="text-4xl md:text-5xl font-bold text-primary"
                            style={{ fontFamily: "Playfair Display, serif" }}
                        >
                            Simple Pricing, Everything Included
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            No hidden fees. Cancel anytime.
                        </p>
                    </div>

                    {/* Billing Toggle */}
                    <div className="mb-8 flex justify-center">
                        <div className="inline-flex items-center rounded-xl border border-border bg-muted p-1">
                            <RadioGroup
                                defaultValue={billing}
                                className="grid grid-cols-2"
                                onValueChange={(v) =>
                                    setBilling(
                                        v === "annual" ? "annual" : "monthly",
                                    )
                                }
                            >
                                <div className="has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground rounded-lg transition-all">
                                    <RadioGroupItem
                                        id="billing-monthly"
                                        value="monthly"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="billing-monthly"
                                        className="peer-data-[state=checked]:text-primary-foreground peer-data-[state=unchecked]:text-muted-foreground px-4 py-2 font-semibold text-sm cursor-pointer inline-flex items-center transition-colors"
                                    >
                                        Monthly
                                    </Label>
                                </div>
                                <div className="has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground rounded-lg transition-all">
                                    <RadioGroupItem
                                        id="billing-annual"
                                        value="annual"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="billing-annual"
                                        className="peer-data-[state=checked]:text-primary-foreground peer-data-[state=unchecked]:text-muted-foreground px-4 py-2 font-semibold text-sm cursor-pointer inline-flex items-center gap-2 transition-colors"
                                    >
                                        Annual
                                        <Badge
                                            variant="secondary"
                                            className="hidden sm:inline-flex"
                                        >
                                            Save {monthlySavingsPct}%
                                        </Badge>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                        {/* Benefits */}
                        <div className="lg:col-span-7">
                            <div className="grid sm:grid-cols-2 gap-5">
                                {[
                                    "Instantly Establish Credibility with a Prime Central London Address",
                                    "Guaranteed Compliance: Fully Approved for Companies House & HMRC",
                                    "Unlimited, Free Mail Scanning (Same-Day)",
                                    "Total Control: Manage All Mail & Forwarding Online",
                                    "Free Forwarding for All Official Government Mail",
                                    "Dedicated, UK-Based Support (We're Here for You)",
                                    "Go Live Today: Address Ready Minutes After ID Verification",
                                    "Zero Risk: No Lock-In Contracts, Cancel Anytime",
                                ].map((bullet) => (
                                    <div
                                        key={bullet}
                                        className="flex items-start gap-3 rounded-2xl bg-card border border-border p-5 hover:border-primary/20 transition"
                                    >
                                        <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-3.5 w-3.5 text-primary"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </span>
                                        <span className="leading-relaxed">
                                            {bullet}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pricing Card */}
                        <div className="lg:col-span-5">
                            <div className="relative">
                                {/* Most Popular badge only for Monthly */}
                                {!isAnnual && (
                                    <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2">
                                        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="rounded-[20px] bg-card p-8 shadow-sm border border-border text-center">
                                    <h3
                                        className="mb-4 text-2xl font-semibold"
                                        style={{
                                            fontFamily: "Playfair Display, serif",
                                        }}
                                    >
                                        All-In-One Plan
                                    </h3>

                                    <div className="mb-6">
                                        <div className="flex items-baseline justify-center gap-2">
                                            <span className="text-5xl font-extrabold tracking-tight text-primary">
                                                {priceLabel}
                                            </span>
                                            <span className="text-base font-medium text-muted-foreground">
                                                {priceSuffix}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {subCopy}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {fineCopy}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                        className="w-full h-11 rounded-[14px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                                    >
                                        {ctaText}
                                    </Button>

                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span>
                                            HMRC & Companies House mail forwarding is
                                            free in the UK.{" "}
                                            <strong>Other letters</strong> can be
                                            forwarded for <strong>£2 per item</strong>{" "}
                                            (covering postage & handling).
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Built for Modern UK Businesses */}
            <section className="py-14 md:py-16 bg-primary/5 border-t border-border">
                <div className="mx-auto max-w-3xl px-6">
                    <h2
                        className="text-3xl md:text-4xl font-bold mb-3 text-center text-primary"
                        style={{ fontFamily: "Playfair Display, serif" }}
                    >
                        🏢 Built for Modern UK Businesses
                    </h2>

                    <p className="text-center text-base text-muted-foreground font-medium mb-6">
                        <strong>
                            From solo founders to established teams — we
                            support all kinds of companies.
                        </strong>
                    </p>

                    <p className="text-sm text-muted-foreground mb-4">
                        Whether you're a remote freelancer, a fast-growing
                        startup, or an international firm entering the UK
                        market, VirtualAddressHub gives you the London
                        presence and legal compliance you need — without the
                        admin headache.
                    </p>

                    <p className="text-sm text-muted-foreground">
                        We're a fully compliant digital mailroom, designed
                        to streamline your back-office operations so you can
                        focus on running your business.
                    </p>

                    <ul className="mt-6 space-y-2 text-sm">
                        <li>
                            ✅ Registered Office, Director & Business
                            Address
                        </li>
                        <li>✅ Unlimited Same-Day Mail Scanning</li>
                        <li>
                            ✅ Free Forwarding for HMRC & Companies House
                            Mail
                        </li>
                        <li>
                            ✅ Trusted by Founders, Agencies, Consultancies,
                            and Global Brands
                        </li>
                    </ul>

                    <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border border-primary/20 bg-card p-3 text-center">
                            <strong>📍 Central London Presence</strong>
                        </div>
                        <div className="rounded-lg border border-primary/20 bg-card p-3 text-center">
                            <strong>🔒 Fully AML Compliant & HMRC Supervised</strong>
                        </div>
                        <div className="rounded-lg border border-primary/20 bg-card p-3 text-center">
                            <strong>
                                Professional-Grade Mail Handling Only (No Parcels)
                            </strong>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <Button
                            onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                            className="h-11 rounded-[14px] bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                        >
                            Get Started — Secure My London Address
                        </Button>
                    </div>
                </div>
            </section>

            {/* CONTACT SECTION */}
            <section id="contact" className="py-14 bg-primary/5 border-t border-border">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="text-3xl font-bold text-primary">
                        Questions? We've Got Answers.
                    </h2>
                    <p className="mt-3 text-muted-foreground">
                        From scanning speed to forwarding and billing —
                        see our most asked questions.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => handleNavClick?.("help")}
                            className="inline-block text-primary font-medium hover:text-primary/80 transition-colors"
                        >
                            Visit Help Centre ↗
                        </button>
                        <button
                            onClick={() => handleNavClick?.("contact")}
                            className="inline-block text-primary font-medium hover:text-primary/80 transition-colors"
                        >
                            Contact Us Directly ↗
                        </button>
                    </div>
                </div>
            </section>

            {/* WHAT YOU GET STRIP */}
            <section className="py-6 bg-primary text-primary-foreground text-center text-sm">
                <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-4">
                    <span>Registered Office + Director Address</span>
                    <span>Business Mailing Address</span>
                    <span>Unlimited Mail Scanning</span>
                    <span>Free HMRC/Companies House Forwarding</span>
                    <span>Cancel Anytime</span>
                </div>
            </section>
        </main>
    );
}
