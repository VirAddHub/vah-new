'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Shield, Users, Mail, Check, MessageCircle, Phone, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { apiClient } from '@/lib/api-client';

// Client-safe utilities
const logClientEvent = async (event: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/client-event', {
            event,
            data,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
            url: typeof window !== 'undefined' ? window.location.href : 'server'
        });
    } catch (error) {
        console.error('Failed to log client event:', error);
    }
};

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export function AboutPage() {
    const router = useRouter();
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        company: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

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

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setErrorMessage('');

        // Validate email
        if (!validateEmail(contactForm.email)) {
            setErrorMessage('Please enter a valid email address');
            setIsSubmitting(false);
            return;
        }

        // Validate required fields
        if (!contactForm.name.trim() || !contactForm.message.trim()) {
            setErrorMessage('Please fill in all required fields');
            setIsSubmitting(false);
            return;
        }

        try {
            await apiClient.post('/api/contact', {
                name: contactForm.name,
                email: contactForm.email,
                company: contactForm.company || '',
                subject: 'About Page Inquiry',
                message: contactForm.message,
                inquiryType: 'about_page'
            });

            // Log the contact form submission
            await logClientEvent('about_page_contact_submit', {
                email: contactForm.email,
                company: contactForm.company,
                source: 'about_page'
            });

            setSubmitStatus('success');
            setContactForm({ name: '', email: '', company: '', message: '' });
        } catch (error: any) {
            console.error('Contact form error:', error);
            setSubmitStatus('error');
            setErrorMessage(error instanceof Error ? error.message : String(error) || 'Failed to send message. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setContactForm(prev => ({ ...prev, [field]: value }));
        if (submitStatus === 'error') {
            setSubmitStatus('idle');
            setErrorMessage('');
        }
    };

    const handleGetStarted = () => {
        logClientEvent('about_page_get_started_click');
        router.push('/signup');
    };

    const handleViewPlans = () => {
        logClientEvent('about_page_view_plans_click');
        router.push('/pricing');
    };

    const handleWhatsAppClick = () => {
        logClientEvent('about_page_whatsapp_click');
        // WhatsApp link will open in new tab
    };

    const handleEmailClick = () => {
        logClientEvent('about_page_email_click');
        // Email link will open default email client
    };

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

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                        <Button
                            onClick={handleGetStarted}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold rounded-lg flex items-center gap-2"
                        >
                            Get Started Today
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={handleViewPlans}
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-lg font-semibold rounded-lg"
                        >
                            View Our Plans
                        </Button>
                    </div>
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

                {/* Contact Section */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-primary mb-6">
                        Got Questions? Speak to Our UK Team.
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                        We're not a call centre; we're a small, dedicated UK
                        team who understands what it's like to run lean,
                        modern businesses. Need help or want to chat before
                        signing up? We're here to help.
                    </p>

                    {/* Contact Form */}
                    <Card className="max-w-2xl mx-auto mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-primary">
                                <MessageCircle className="h-6 w-6 text-primary" />
                                Send Us a Message
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                                            Name *
                                        </label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={contactForm.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Your full name"
                                            required
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                            Email *
                                        </label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={contactForm.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder="your@email.com"
                                            required
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                                        Company (Optional)
                                    </label>
                                    <Input
                                        id="company"
                                        type="text"
                                        value={contactForm.company}
                                        onChange={(e) => handleInputChange('company', e.target.value)}
                                        placeholder="Your company name"
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                                        Message *
                                    </label>
                                    <Textarea
                                        id="message"
                                        value={contactForm.message}
                                        onChange={(e) => handleInputChange('message', e.target.value)}
                                        placeholder="Tell us how we can help you..."
                                        rows={4}
                                        required
                                        className="w-full"
                                    />
                                </div>

                                {/* Status Messages */}
                                {submitStatus === 'success' && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-800 font-medium">
                                            ✓ Message sent successfully! We'll get back to you within 24 hours.
                                        </p>
                                    </div>
                                )}

                                {submitStatus === 'error' && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-800 font-medium">
                                            {errorMessage}
                                        </p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg font-semibold rounded-lg flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Sending Message...
                                        </>
                                    ) : (
                                        <>
                                            Send Message
                                            <ArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Direct Contact Options */}
                    <div className="max-w-md mx-auto space-y-4">
                        {/* Email Support */}
                        <Card className="bg-card border border-border">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <Phone className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="text-lg font-semibold text-primary">
                                        Email Support
                                    </div>
                                </div>
                                <div className="text-base text-muted-foreground">
                                    <a
                                        href="mailto:support@virtualaddresshub.co.uk"
                                        onClick={handleEmailClick}
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
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <MessageCircle className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="text-lg font-semibold text-primary">
                                        WhatsApp Support
                                    </div>
                                </div>
                                <p className="text-base text-muted-foreground mb-3">
                                    We use WhatsApp Business to offer fast,
                                    secure, and confidential support. Your chats
                                    are never linked to a personal number — only
                                    our dedicated business line with end-to-end
                                    encryption.
                                </p>
                                <div>
                                    <a
                                        href="https://wa.me/YOURWHATSAPPNUMBER"
                                        onClick={handleWhatsAppClick}
                                        className="inline-flex items-center rounded-md bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white"
                                    >
                                        <MessageCircle className="h-4 w-4 mr-2" />
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
