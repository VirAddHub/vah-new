'use client';

import { useState, useEffect } from "react";
import { Send, Loader2, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { apiClient } from "@/lib/apiClient";
import { isEmail, validateRequired } from "@/lib/validators";
import { useAsync } from "@/hooks/useAsync";

interface ContactPageProps {
    onNavigate?: (page: string) => void;
}

type InquiryType =
    | "general"
    | "pricing"
    | "technical"
    | "billing";

export default function ContactPage({ onNavigate }: ContactPageProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
        inquiryType: "general" as InquiryType,
        website: "", // honeypot: must stay empty
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Use async hook for form submission
    const { run: submitForm, loading: isSubmitting, error: submitError } = useAsync(async (data: typeof formData) => {
        const res = await apiClient.post("/api/contact", {
            name: data.name,
            email: data.email,
            subject: data.subject,
            message: data.message,
            inquiryType: data.inquiryType,
            website: data.website,
        });
        if (!res.ok) throw new Error(res.error || "Failed to send message");
        return res.data;
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg(null);

        // Client-side validation
        try {
            validateRequired("Name", formData.name);
            validateRequired("Email", formData.email);
            if (!isEmail(formData.email)) {
                throw new Error("Please enter a valid email address");
            }
            validateRequired("Subject", formData.subject);
            validateRequired("Message", formData.message);
        } catch (validationError: any) {
            setErrorMsg(validationError.message);
            return;
        }

        try {
            await submitForm(formData);
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
        } catch (err: unknown) {
            const msg = (err as Error)?.message ?? "Something went wrong. Please try again in a moment.";
            setErrorMsg(msg);
        }
    }

    function handleInputChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    const inquiryTypeLabels: Record<InquiryType, string> = {
        general: "General enquiry",
        pricing: "Pricing Question",
        technical: "Technical Support",
        billing: "Billing Question",
    };

    // Success screen
    if (isSubmitted) {
        return (
            <div className="min-h-screen min-w-0 overflow-x-clip bg-muted pt-8 pb-16 lg:pt-0 flex items-center justify-center">
                <div className="max-w-2xl mx-auto w-full px-4 text-center">
                    <h1 className="text-h2 sm:text-h1 lg:text-display text-foreground mb-4">
                        Message sent — thank you!
                    </h1>
                    <p className="text-body text-muted-foreground mb-8">
                        We've received your enquiry. We'll reply within 24 hours.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Button
                            onClick={() => onNavigate?.("home")}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                        >
                            Return Home
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsSubmitted(false)}
                            className="px-6"
                        >
                            Send Another Message
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-w-0 w-full overflow-x-clip bg-muted pt-8 lg:pt-0">
            <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:py-16">
                {/* Hero Section */}
                <div className="max-w-2xl">
                    <h1 className="text-h1 lg:text-display text-foreground">
                        Get in touch
                    </h1>
                    <p className="mt-3 text-body text-muted-foreground">
                        Have questions about our virtual address service? We're here to help.
                    </p>
                </div>

                {/* Main Content - Form and Contact Cards */}
                <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    {/* Left Column - Contact Form */}
                    <div className="min-w-0 lg:col-span-2">
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5">
                                    {errorMsg && (
                                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-body-sm text-red-600">
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

                                {/* Name Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="name" className="text-label text-foreground">Name</label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Name"
                                        className="w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>

                                {/* Email Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-label text-foreground">Email</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Type email"
                                        className="w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>

                                {/* Company Name Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="company" className="text-label text-foreground">Company name</label>
                                    <input
                                        id="company"
                                        name="company"
                                        type="text"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        placeholder="Company name"
                                        className="w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>

                                {/* Subject Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="subject" className="text-label text-foreground">Subject</label>
                                    <input
                                        id="subject"
                                        name="subject"
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        placeholder="How can we help you"
                                        className="w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>

                                {/* Enquiry Type Dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="inquiryType" className="text-label text-foreground">Enquiry type</label>
                                    <div className="relative">
                                        <select
                                            id="inquiryType"
                                            name="inquiryType"
                                            value={formData.inquiryType}
                                            onChange={handleInputChange}
                                            className="w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 pr-10 text-body text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                        >
                                            <option value="general">General enquiry</option>
                                            <option value="pricing">Pricing Question</option>
                                            <option value="technical">Technical Support</option>
                                            <option value="billing">Billing Question</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Description/Message Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="message" className="text-label text-foreground">Description</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        placeholder="Please describe your enquiry in detail..."
                                        className="min-h-[140px] w-full min-w-0 resize-none rounded-xl border border-input bg-background px-4 py-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="mt-2 w-full"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send enquiry'
                                    )}
                                </Button>

                                {/* Privacy Text */}
                                <p className="mt-4 text-body-sm text-muted-foreground">
                                    Your information is private and never shared with third parties.
                                </p>
                            </form>
                        </div>
                    </div>

                    {/* Right Column - Support Cards (stack on mobile) */}
                    <div className="min-w-0 space-y-4 lg:col-span-1">
                        {/* WhatsApp Support Card */}
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-body font-semibold text-foreground">WhatsApp Support</h3>
                                <p className="text-body-sm text-muted-foreground break-words">
                                    Dedicated WhatsApp Business line
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className=""
                                    onClick={() => window.open("https://wa.me/447000000000", "_blank")}
                                >
                                    Chat on WhatsApp
                                </Button>
                            </div>
                        </div>

                        {/* Email Card */}
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-body font-semibold text-foreground">Email</h3>
                                <p className="break-words text-body-sm text-muted-foreground">
                                    support@virtualaddresshub.co.uk
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className=""
                                    onClick={() => (window.location.href = "mailto:support@virtualaddresshub.co.uk")}
                                >
                                    Send an email
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
