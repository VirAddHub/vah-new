import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Shield, Users, Mail, Check } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function AboutPage() {
    const whatWeDoPoints = [
        "Registered Office & Director's Address: Use our central London address with Companies House and HMRC.",
        "Business Address for Everyday Use: Ideal for banks, websites, invoicing, and formal correspondence.",
        "Same-Day Mail Scanning: All incoming post is scanned and uploaded to your dashboard the same day it arrives.",
        "Secure Digital Access: View, download, tag, or delete your scanned letters – anytime, anywhere.",
        "Optional Mail Forwarding: HMRC and Companies House letters are forwarded free. All other mail can be forwarded for just £2 per item (covering postage & handling).",
        "Built-In Compliance: Fully GDPR-compliant and AML-supervised – your data is protected, always.",
        "No Lock-In, No Nonsense: Cancel anytime. No hidden charges, no long-term contracts.",
    ];

    const whyWeExistPoints = [
        "Fully compliant: With all UK laws, including new Companies House rules.",
        "Fairly priced: No surprises, no mark-ups.",
        "Fast to set up: With secure ID checks and instant dashboard access.",
        "Made for modern businesses: Designed for remote-first operations and digital convenience.",
    ];

    const whoWeSupport = [
        "UK start-ups and growing companies",
        "Remote founders, freelancers & consultants",
        "International entrepreneurs expanding to the UK",
        "Agencies, tradespeople, digital nomads, and side hustlers",
        "Anyone needing a legitimate, compliant UK business address – minus the office overhead.",
    ];

    const compliancePoints = [
        "Supervised by HMRC for Anti-Money Laundering (AML).",
        "Registered with the ICO (UK GDPR compliance).",
        "Run by a UK private limited company.",
        "Based in London, with a real, staffed mail-handling location.",
    ];

    return (
        <div className="py-12 bg-background">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-6">
                        About Us
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
                        We empower UK businesses with a secure, compliant
                        London presence – without the traditional office.
                        Whether you're launching a start-up, working from
                        home, or operating from abroad, we simplify
                        compliance, protect your privacy, and manage your
                        official post professionally.
                    </p>
                </div>

                {/* What We Do */}
                <Card className="mb-12 bg-card shadow-sm border border-border rounded-[16px]">
                    <CardHeader className="p-6">
                        <CardTitle className="flex items-center gap-3 text-3xl font-semibold text-primary">
                            <div className="w-8 h-8 bg-primary/10 rounded-[12px] flex items-center justify-center">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            What We Do
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-4">
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            VirtualAddressHub provides a London-based virtual
                            address service built on legal compliance, digital
                            convenience, and total transparency. Every
                            subscription includes:
                        </p>
                        <ul className="space-y-4">
                            {whatWeDoPoints.map((point) => (
                                <li
                                    key={point}
                                    className="flex items-start gap-4"
                                >
                                    <Check className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                    <span className="text-base text-foreground leading-relaxed">
                                        {point}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Why We Exist */}
                <div className="mb-12 text-center">
                    <h2 className="text-4xl font-bold text-primary mb-6">
                        Why We Exist
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6 leading-relaxed">
                        Too many founders face risks – fines, exposure, or
                        legal complications – by using their home address,
                        or by overpaying for outdated services. We created
                        VirtualAddressHub as a modern, no-fuss alternative:
                    </p>
                    <div className="max-w-3xl mx-auto">
                        <ul className="space-y-4">
                            {whyWeExistPoints.map((point) => (
                                <li
                                    key={point}
                                    className="flex items-start gap-4 text-left"
                                >
                                    <Check className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                    <span className="text-base text-foreground leading-relaxed">
                                        {point}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Who We Support */}
                <Card className="mb-12 bg-card shadow-sm border border-border rounded-[16px]">
                    <CardHeader className="p-6">
                        <CardTitle className="flex items-center gap-3 text-3xl font-semibold text-primary">
                            <div className="w-8 h-8 bg-primary/10 rounded-[12px] flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            Who We Support
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {whoWeSupport.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-4"
                                >
                                    <Check className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                    <span className="text-base text-foreground leading-relaxed">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Compliance */}
                <Card className="mb-12">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-3xl font-semibold text-primary">
                            <Shield className="h-5 w-5 text-primary" />
                            Our Compliance Promise
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-lg text-muted-foreground">
                            We take your privacy, security, and legal standing
                            seriously. That's why VirtualAddressHub is:
                        </p>
                        <ul className="space-y-3">
                            {compliancePoints.map((point) => (
                                <li
                                    key={point}
                                    className="flex items-start gap-3"
                                >
                                    <Check className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                    <span className="text-base text-foreground leading-relaxed">
                                        {point}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-base text-muted-foreground">
                            You can review our full{" "}
                            <a
                                href="/privacy"
                                className="text-primary hover:underline"
                            >
                                Privacy Policy
                            </a>
                            ,{" "}
                            <a
                                href="/terms"
                                className="text-primary hover:underline"
                            >
                                Terms of Service
                            </a>
                            , and{" "}
                            <a
                                href="/kyc-policy"
                                className="text-primary hover:underline"
                            >
                                KYC Policy
                            </a>{" "}
                            any time.
                        </p>
                    </CardContent>
                </Card>

                {/* Contact */}
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-primary mb-6">
                        Got Questions? Speak to Our UK Team.
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
                        We're not a call centre; we're a small, dedicated UK
                        team who understands what it's like to run lean,
                        modern businesses. Need help or want to chat before
                        signing up? We're here to help.
                    </p>

                    <div className="max-w-md mx-auto space-y-4">
                        {/* Email Support */}
                        <Card className="bg-card border border-border">
                            <CardContent className="p-5">
                                <div className="text-lg font-semibold mb-1 text-primary">
                                    Email Support
                                </div>
                                <div className="text-base text-muted-foreground">
                                    <a
                                        href="mailto:support@virtualaddresshub.co.uk"
                                        className="text-primary hover:underline break-all"
                                    >
                                        support@virtualaddresshub.co.uk
                                    </a>
                                </div>
                            </CardContent>
                        </Card>

                        {/* WhatsApp Support */}
                        <Card className="bg-card border border-border">
                            <CardContent className="p-5">
                                <div className="text-lg font-semibold mb-1 text-primary">
                                    WhatsApp Support
                                </div>
                                <p className="text-base text-muted-foreground">
                                    We use WhatsApp Business to offer fast,
                                    secure, and confidential support. Your chats
                                    are never linked to a personal number — only
                                    our dedicated business line with end-to-end
                                    encryption.
                                </p>
                                <div className="mt-3">
                                    <a
                                        href="https://wa.me/YOURWHATSAPPNUMBER"
                                        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                        Message on WhatsApp
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
