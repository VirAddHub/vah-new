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
            <div className="min-w-0 overflow-x-clip bg-zinc-50 pt-20 lg:pt-0 min-h-screen py-16 flex items-center justify-center" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                <div className="max-w-2xl mx-auto w-full px-4 text-center">
                    <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl lg:text-4xl mb-4">
                        Message sent — thank you!
                    </h1>
                    <p className="text-base text-zinc-600 mb-8">
                        We've received your enquiry. We'll reply within 24 hours.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Button
                            onClick={() => onNavigate?.("home")}
                            className="bg-emerald-800 text-white hover:bg-emerald-900 rounded-full px-6"
                        >
                            Return Home
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsSubmitted(false)}
                            className="rounded-full px-6"
                        >
                            Send Another Message
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-w-0 w-full overflow-x-clip bg-zinc-50 pt-20 lg:pt-0" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                {/* Hero Section */}
                <div className="max-w-2xl">
                    <h1 className="text-3xl leading-tight font-semibold text-zinc-900 sm:text-4xl lg:text-[44px]">
                        Get in touch
                    </h1>
                    <p className="mt-3 text-base leading-7 text-zinc-600">
                        Have questions about our virtual address service? We're here to help.
                    </p>
                </div>

                {/* Main Content - Form and Contact Cards */}
                <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    {/* Left Column - Contact Form */}
                    <div className="min-w-0 lg:col-span-2">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5">
                                    {errorMsg && (
                                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
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
                                    <label htmlFor="name" className="text-sm font-medium text-zinc-900">Name</label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Name"
                                        className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                                    />
                                </div>

                                {/* Email Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-sm font-medium text-zinc-900">Email</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Type email"
                                        className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                                    />
                                </div>

                                {/* Company Name Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="company" className="text-sm font-medium text-zinc-900">Company name</label>
                                    <input
                                        id="company"
                                        name="company"
                                        type="text"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        placeholder="Company name"
                                        className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                                    />
                                </div>

                                {/* Subject Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="subject" className="text-sm font-medium text-zinc-900">Subject</label>
                                    <input
                                        id="subject"
                                        name="subject"
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        placeholder="How can we help you"
                                        className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                                    />
                                </div>

                                {/* Enquiry Type Dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="inquiryType" className="text-sm font-medium text-zinc-900">Enquiry type</label>
                                    <div className="relative">
                                        <select
                                            id="inquiryType"
                                            name="inquiryType"
                                            value={formData.inquiryType}
                                            onChange={handleInputChange}
                                            className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-10 text-base text-zinc-900 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                                        >
                                            <option value="general">General enquiry</option>
                                            <option value="pricing">Pricing Question</option>
                                            <option value="technical">Technical Support</option>
                                            <option value="billing">Billing Question</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                    </div>
                                </div>

                                {/* Description/Message Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="message" className="text-sm font-medium text-zinc-900">Description</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        placeholder="Please describe your enquiry in detail..."
                                        className="min-h-[140px] w-full min-w-0 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-6 py-3.5 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 disabled:opacity-60 disabled:text-white"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send enquiry'
                                    )}
                                </button>

                                {/* Privacy Text */}
                                <p className="mt-4 text-sm leading-6 text-zinc-500">
                                    Your information is private and never shared with third parties.
                                </p>
                            </form>
                        </div>
                    </div>

                    {/* Right Column - Support Cards (stack on mobile) */}
                    <div className="min-w-0 space-y-4 lg:col-span-1">
                        {/* WhatsApp Support Card */}
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-base font-semibold text-zinc-900">WhatsApp Support</h3>
                                <p className="text-sm leading-6 text-zinc-600 break-words">
                                    Dedicated WhatsApp Business line
                                </p>
                                <button
                                    type="button"
                                    onClick={() => window.open("https://wa.me/447000000000", "_blank")}
                                    className="inline-flex w-full max-w-[214px] items-center justify-center rounded-full border border-emerald-800 bg-transparent px-4 py-3 text-base font-medium text-emerald-800 hover:bg-emerald-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                                >
                                    Chat on WhatsApp
                                </button>
                            </div>
                        </div>

                        {/* Email Card */}
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-base font-semibold text-zinc-900">Email</h3>
                                <p className="break-words text-sm leading-6 text-zinc-600">
                                    support@virtualaddresshub.co.uk
                                </p>
                                <button
                                    type="button"
                                    onClick={() => (window.location.href = "mailto:support@virtualaddresshub.co.uk")}
                                    className="inline-flex w-full max-w-[214px] items-center justify-center rounded-full border border-emerald-800 bg-transparent px-4 py-3 text-base font-medium text-emerald-800 hover:bg-emerald-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
                                >
                                    Send an email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
