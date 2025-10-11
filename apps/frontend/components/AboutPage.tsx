'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Shield, Users, Mail, Check, Send, Loader2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function AboutPage() {
    // API Data State
    const [healthData, setHealthData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Contact Form State
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        company: '',
        inquiryType: 'general'
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formSuccess, setFormSuccess] = useState(false);
    const [formError, setFormError] = useState('');

    // Load health data for company stats
    useEffect(() => {
        const loadHealthData = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/api/health');
                if (response.ok) {
                    setHealthData(response.data);
                }
            } catch (error) {
                console.error('Failed to load health data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadHealthData();
    }, []);

    // Contact form submission
    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');
        setFormSuccess(false);

        try {
            await apiClient.post('/api/contact', contactForm);
            setFormSuccess(true);
            setContactForm({ name: '', email: '', subject: '', message: '', company: '', inquiryType: 'general' });
        } catch (error) {
            setFormError('Failed to send message. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

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
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-6">
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
                        <CardTitle className="flex items-center gap-3 text-3xl font-semibold text-gray-900">
                            <div className="w-8 h-8 bg-gray-100 rounded-[12px] flex items-center justify-center">
                                <Mail className="h-5 w-5 text-gray-600" />
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
                                    <Check className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
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
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">
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
                                    <Check className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
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
                        <CardTitle className="flex items-center gap-3 text-3xl font-semibold text-gray-900">
                            <div className="w-8 h-8 bg-gray-100 rounded-[12px] flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-600" />
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
                                    <Check className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
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
                        <CardTitle className="flex items-center gap-2 text-3xl font-semibold text-ink">
                            <Shield className="h-5 w-5 text-gray-600" />
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
                                    <Check className="h-4 w-4 mt-1 text-gray-600 flex-shrink-0" />
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
                                className="text-gray-600 hover:underline"
                            >
                                Privacy Policy
                            </a>
                            ,{" "}
                            <a
                                href="/terms"
                                className="text-gray-600 hover:underline"
                            >
                                Terms of Service
                            </a>
                            , and{" "}
                            <a
                                href="/kyc-policy"
                                className="text-gray-600 hover:underline"
                            >
                                KYC Policy
                            </a>{" "}
                            any time.
                        </p>
                    </CardContent>
                </Card>

                {/* Company Stats */}
                {healthData && (
                    <Card className="mb-12 bg-gray-50 border border-line">
                        <CardContent className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                                Our Performance
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">
                                        {healthData.uptime ? `${Math.round(healthData.uptime)}%` : '99.9%'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Uptime</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">
                                        1000+
                                    </div>
                                    <div className="text-sm text-muted-foreground">Active Users</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">
                                        50,000+
                                    </div>
                                    <div className="text-sm text-muted-foreground">Mail Processed</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Contact Form */}
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">
                        Got Questions? Speak to Our UK Team.
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                        We're not a call centre; we're a small, dedicated UK
                        team who understands what it's like to run lean,
                        modern businesses. Need help or want to chat before
                        signing up? We're here to help.
                    </p>

                    <Card className="max-w-2xl mx-auto">
                        <CardContent className="p-6">
                            {formSuccess ? (
                                <div className="text-center py-8">
                                    <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Message Sent Successfully!
                                    </h3>
                                    <p className="text-muted-foreground">
                                        We'll get back to you within 24 hours.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name">Name *</Label>
                                            <Input
                                                id="name"
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                                                required
                                                placeholder="Your full name"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                                                required
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="company">Company (Optional)</Label>
                                        <Input
                                            id="company"
                                            value={contactForm.company}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                                            placeholder="Your company name"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="subject">Subject *</Label>
                                        <Input
                                            id="subject"
                                            value={contactForm.subject}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                                            required
                                            placeholder="What's this about?"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="message">Message *</Label>
                                        <Textarea
                                            id="message"
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                                            required
                                            placeholder="Tell us how we can help..."
                                            rows={4}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="text-red-500 text-sm text-center">
                                            {formError}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={formLoading}
                                        className="w-full"
                                    >
                                        {formLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* Alternative Contact Methods */}
                    <div className="mt-8 max-w-md mx-auto space-y-4">
                        <Card className="bg-card border border-border">
                            <CardContent className="p-4">
                                <div className="text-lg font-semibold mb-1 text-gray-900">
                                    Email Support
                                </div>
                                <div className="text-base text-muted-foreground">
                                    <a
                                        href="mailto:support@virtualaddresshub.co.uk"
                                        className="text-gray-600 hover:underline break-all"
                                    >
                                        support@virtualaddresshub.co.uk
                                    </a>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border border-border">
                            <CardContent className="p-4">
                                <div className="text-lg font-semibold mb-1 text-gray-900">
                                    WhatsApp Support
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Fast, secure, and confidential support with end-to-end encryption.
                                </p>
                                <a
                                    href="https://wa.me/YOURWHATSAPPNUMBER"
                                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Message on WhatsApp
                                </a>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
