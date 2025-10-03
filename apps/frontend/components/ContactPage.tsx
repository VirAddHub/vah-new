'use client';

import { useState, useEffect } from "react";
import {
    Mail,
    Phone,
    Clock,
    Send,
    CheckCircle,
    Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";

import { Badge } from "./ui/badge";
import { contactApi, supportApi } from "@/lib/apiClient";
import { isOk } from "@/types/api";

interface ContactPageProps {
    onNavigate?: (page: string) => void;
}

type InquiryType =
    | "general"
    | "pricing"
    | "technical"
    | "billing";

// For development/demo purposes, we'll use a mock endpoint
// In production, replace with your actual API endpoint
const API_BASE = ""; // e.g. https://api.virtualaddresshub.co.uk
const CONTACT_ENDPOINT = API_BASE
    ? `${API_BASE}/api/contact`
    : "/api/contact";

export default function ContactPage({ onNavigate }: ContactPageProps) {
    // Support information state
    const [supportInfo, setSupportInfo] = useState<any>(null);
    const [loadingSupport, setLoadingSupport] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
        inquiryType: "general" as InquiryType,
        website: "", // honeypot: must stay empty
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Load support information
    useEffect(() => {
        const loadSupportInfo = async () => {
            try {
                setLoadingSupport(true);
                const res = await supportApi.get();
                if (isOk(res)) {
                    setSupportInfo(res.data);
                } else {
                    setErrorMsg(res.error || 'Unable to load support info.');
                }
            } catch (err: any) {
                setErrorMsg(
                    err?.response?.data?.error ??
                    (err as Error)?.message ??
                    'Unable to load support info.'
                );
            } finally {
                setLoadingSupport(false);
            }
        };

        loadSupportInfo();
    }, []);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg(null);

        // basic client-side validation
        if (!formData.name.trim())
            return setErrorMsg("Please enter your name");
        if (
            !formData.email.trim() ||
            !emailRegex.test(formData.email)
        )
            return setErrorMsg("Please enter a valid email address");
        if (!formData.subject.trim())
            return setErrorMsg("Please enter a subject");
        if (!formData.message.trim())
            return setErrorMsg("Please enter your message");

        setIsSubmitting(true);
        try {
            // Call the contact API using the unified client
            const response = await contactApi.send(formData);

            if (isOk(response)) {
                setIsSubmitted(true);
                setFormData({
                    name: "",
                    email: "",
                    company: "",
                    subject: "",
                    message: "",
                    inquiryType: "general",
                    website: "",
                });
            } else {
                // unified ApiErr shape: { ok:false, error, code? }
                // fallback in case legacy API still returns { message }
                // @ts-expect-error – tolerate legacy shape briefly
                const legacyMsg = (response as any)?.message as string | undefined;
                setErrorMsg(response.error || legacyMsg || "Unable to send message. Please try again.");
            }
        } catch (err: unknown) {
            // prefer server error payload if available
            const msg =
              // axios style: response.data.error
              (err as any)?.response?.data?.error
              // fetch style: message
              ?? (err as Error)?.message
              ?? "Something went wrong. Please try again in a moment.";
            setErrorMsg(msg);
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleInputChange(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Success screen
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <CheckCircle className="h-16 w-16 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold mb-3 text-primary">
                            Message sent — thank you!
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            We've received your enquiry.
                        </p>

                        {/* Response time indicator */}
                        <div className="mt-4 flex justify-center">
                            <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
                                <Clock className="h-3.5 w-3.5" />
                                We'll reply within 24 hours
                            </Badge>
                        </div>

                        <div className="mt-8">
                            <Button
                                onClick={() => onNavigate?.("home")}
                                className="mr-4"
                            >
                                Return Home
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsSubmitted(false)}
                            >
                                Send Another Message
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4 text-primary">
                        Get in touch
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Have questions about our virtual address service?
                        We're here to help.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Information */}
                    <div className="lg:col-span-1">
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle className="text-primary">
                                    Contact options
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium mb-1">
                                            Business hours
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            Monday–Friday
                                            <br />
                                            9:00–18:00 UK time
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium mb-1 text-primary">
                                            WhatsApp support
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            Dedicated WhatsApp Business line
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() =>
                                                window.open(
                                                    "https://wa.me/447000000000",
                                                    "_blank",
                                                )
                                            }
                                        >
                                            Chat on WhatsApp
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium mb-1 text-primary">
                                            Email
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            support@virtualaddresshub.co.uk
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="px-0"
                                            onClick={() =>
                                            (window.location.href =
                                                "mailto:support@virtualaddresshub.co.uk")
                                            }
                                        >
                                            Send an email →
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-primary">
                                    Send us a message
                                </CardTitle>
                                {/* ⬇️ UPDATED: align copy with "as soon as possible" promise */}
                                <p className="text-muted-foreground">
                                    Fill out the form and we'll reply as soon as
                                    possible.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                    noValidate
                                >
                                    {errorMsg && (
                                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                            {errorMsg}
                                        </div>
                                    )}

                                    {/* Honeypot (hidden) */}
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        autoComplete="off"
                                        tabIndex={-1}
                                        className="hidden"
                                        aria-hidden="true"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                htmlFor="name"
                                                className="block text-sm font-medium mb-2"
                                            >
                                                Full name *
                                            </label>
                                            <Input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="John Smith"
                                                autoComplete="name"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="email"
                                                className="block text-sm font-medium mb-2"
                                            >
                                                Email address *
                                            </label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="john@company.com"
                                                autoComplete="email"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                htmlFor="company"
                                                className="block text-sm font-medium mb-2"
                                            >
                                                Company name
                                            </label>
                                            <Input
                                                id="company"
                                                name="company"
                                                type="text"
                                                value={formData.company}
                                                onChange={handleInputChange}
                                                placeholder="Your Company Ltd"
                                                autoComplete="organization"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="inquiryType"
                                                className="block text-sm font-medium mb-2"
                                            >
                                                Inquiry type
                                            </label>
                                            <select
                                                id="inquiryType"
                                                name="inquiryType"
                                                value={formData.inquiryType}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                            >
                                                <option value="general">
                                                    General inquiry
                                                </option>
                                                <option value="pricing">
                                                    Pricing question
                                                </option>
                                                <option value="technical">
                                                    Technical support
                                                </option>
                                                <option value="billing">
                                                    Billing question
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="subject"
                                            className="block text-sm font-medium mb-2"
                                        >
                                            Subject *
                                        </label>
                                        <Input
                                            id="subject"
                                            name="subject"
                                            type="text"
                                            required
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            placeholder="How can we help you?"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="message"
                                            className="block text-sm font-medium mb-2"
                                        >
                                            Message *
                                        </label>
                                        <Textarea
                                            id="message"
                                            name="message"
                                            required
                                            rows={6}
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            placeholder="Please describe your inquiry in detail..."
                                            className="resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex items-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Sending…
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" />
                                                    Send message
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => onNavigate?.("home")}
                                        >
                                            Back to Home
                                        </Button>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        * Required fields. Your information is
                                        private and never shared with third parties.
                                    </p>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}