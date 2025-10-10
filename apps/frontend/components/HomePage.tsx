'use client';

import { useState, useMemo, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { usePricing } from "@/hooks/usePlans";
import {
    ArrowRight,
    Mail,
    ShieldCheck,
    Building2,
    ScanLine,
    CheckCircle,
    Star,
    Users,
    Clock,
    Globe,
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
                className="relative overflow-hidden section-padding"
                aria-label="Hero"
            >
                <div className="absolute right-[-8rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl opacity-40 animate-pulse" />
                <div className="container-modern grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7 animate-fade-in-up">
                        <h1
                            className="font-bold tracking-tight leading-[1.05] text-[clamp(2rem,6vw,5rem)] text-balance"
                        >
                            Professional London Business Address Service.
                            <span className="block text-gradient">
                                Compliant. Private. Seamless.
                            </span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed text-balance">
                            Get a prestigious London business address for your company registration, HMRC compliance, and professional correspondence. Our virtual office service includes unlimited same-day mail scanning, secure digital dashboard, and free forwarding for official documents. Trusted by 1000+ businesses across the UK.
                        </p>

                        <div className="mt-10">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                                    className="btn-primary text-lg px-8 py-4 h-auto"
                                >
                                    {ctaText}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleNavClick?.("about")}
                                    className="btn-outline text-lg px-8 py-4 h-auto"
                                >
                                    Learn More
                                </Button>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                {subCopy}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {fineCopy}
                            </p>
                        </div>
                        
                        <div className="mt-8 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-sm">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                ICO — Registered
                            </Badge>
                            <Badge variant="secondary" className="text-sm">
                                <Building2 className="w-3 h-3 mr-1" />
                                HMRC — AML Supervised
                            </Badge>
                            <Badge variant="secondary" className="text-sm">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                GDPR — Aligned
                            </Badge>
                        </div>
                    </div>
                    <div className="lg:col-span-5 animate-slide-in-left">
                        <div className="relative">
                            <div className="card-modern p-8 shadow-modern-lg">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                        <Building2 className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Premium London Address</h3>
                                    <p className="text-muted-foreground mb-4">Professional business address in the heart of London</p>
                                    <div className="text-3xl font-bold text-gradient mb-2">{priceLabel}</div>
                                    <div className="text-sm text-muted-foreground">{priceSuffix}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section
                id="how-it-works"
                className="section-padding bg-gradient-to-b from-background to-muted/30"
                aria-label="How It Works"
            >
                <div className="container-modern">
                    <header className="text-center mb-16">
                        <h2 className="font-bold leading-tight text-[clamp(1.75rem,4.5vw,3rem)] text-balance">
                            How It Works — <span className="text-gradient">Clear, Compliant, No Surprises</span>
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed text-muted-foreground max-w-prose mx-auto text-balance">
                            Understand the process before you pay. Verification first, address issued next, then professional mail handling.
                        </p>
                    </header>

                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Step 1 */}
                        <article className="card-modern p-8 hover:scale-105 transition-all duration-300">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary mb-6">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gradient">
                                1) Verify Your Account
                            </h3>
                            <ul className="text-muted-foreground space-y-3 text-base leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span>Create your account and upload ID and proof of address (KYC/AML).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span>We review the documents and notify you when approved.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span>Your official <strong>Central London</strong> address appears in your dashboard once approved.</span>
                                </li>
                            </ul>
                        </article>

                        {/* Step 2 */}
                        <article className="card-modern p-8 hover:scale-105 transition-all duration-300">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 text-secondary mb-6">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gradient">
                                2) Use Your Address Everywhere
                            </h3>
                            <ul className="text-muted-foreground space-y-3 text-base leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                                    <span>Update Companies House (Registered Office & Director's Service Address).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                                    <span>Use with HMRC, banks, suppliers, and clients.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                                    <span>Real, physical address — never a P.O. Box.</span>
                                </li>
                            </ul>
                        </article>

                        {/* Step 3 */}
                        <article className="card-modern p-8 hover:scale-105 transition-all duration-300">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary mb-6">
                                <ScanLine className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gradient">
                                3) We Handle Your Mail
                            </h3>
                            <ul className="text-muted-foreground space-y-3 text-base leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span>Same-day letter scanning on business days to your secure dashboard.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span><strong>Free UK forwarding</strong> for HMRC & Companies House letters (on request).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span>Other letters can be forwarded for a small fee.</span>
                                </li>
                            </ul>
                        </article>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="section-padding" aria-label="Features">
                <div className="container-modern">
                    <header className="text-center mb-16">
                        <h2 className="font-bold leading-tight text-[clamp(1.75rem,4.5vw,3rem)] text-balance">
                            Why Choose <span className="text-gradient">VirtualAddressHub</span>?
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed text-muted-foreground max-w-prose mx-auto text-balance">
                            More than just an address. We provide comprehensive business solutions with unmatched service quality.
                        </p>
                    </header>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Clock className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Same-Day Scanning</h3>
                            <p className="text-muted-foreground">Get digital copies of your mail within hours, not days.</p>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/90 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Fully Compliant</h3>
                            <p className="text-muted-foreground">Meets all UK regulations including ECCT Act 2023.</p>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">1000+ Businesses</h3>
                            <p className="text-muted-foreground">Trusted by companies across the UK and beyond.</p>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Globe className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Global Access</h3>
                            <p className="text-muted-foreground">Manage your UK business from anywhere in the world.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="section-padding bg-gradient-to-b from-muted/30 to-background" aria-label="Testimonials">
                <div className="container-modern">
                    <header className="text-center mb-16">
                        <h2 className="font-bold leading-tight text-[clamp(1.75rem,4.5vw,3rem)] text-balance">
                            What Our <span className="text-gradient">Customers Say</span>
                        </h2>
                    </header>

                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="card-modern p-8">
                            <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            <p className="text-muted-foreground mb-4 italic">
                                "VirtualAddressHub made setting up my UK company so much easier. The same-day scanning is incredible - I never miss important documents."
                            </p>
                            <div className="font-semibold">Sarah M.</div>
                            <div className="text-sm text-muted-foreground">Tech Startup Founder</div>
                        </div>
                        
                        <div className="card-modern p-8">
                            <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            <p className="text-muted-foreground mb-4 italic">
                                "Professional service with excellent customer support. My business looks established with a prestigious London address."
                            </p>
                            <div className="font-semibold">James R.</div>
                            <div className="text-sm text-muted-foreground">Consulting Firm</div>
                        </div>
                        
                        <div className="card-modern p-8">
                            <div className="flex items-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            <p className="text-muted-foreground mb-4 italic">
                                "The compliance aspect was crucial for us. VirtualAddressHub handles everything perfectly and keeps us in good standing."
                            </p>
                            <div className="font-semibold">Maria L.</div>
                            <div className="text-sm text-muted-foreground">E-commerce Business</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section-padding gradient-hero text-white" aria-label="Call to Action">
                <div className="container-modern text-center">
                    <h2 className="font-bold leading-tight text-[clamp(1.75rem,4.5vw,3rem)] text-balance mb-6">
                        Ready to Get Your Professional London Address?
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 text-balance">
                        Join 1000+ businesses who trust VirtualAddressHub for their UK business address needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            onClick={() => handleNavClick?.("signup", { initialBilling: billing })}
                            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4 h-auto font-semibold"
                        >
                            Get Started Today
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleNavClick?.("pricing")}
                            className="border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4 h-auto font-semibold"
                        >
                            View Pricing
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}