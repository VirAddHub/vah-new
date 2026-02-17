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
            <div className="min-h-screen bg-[#F6F6F7] py-16 flex items-center justify-center" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <h1 className="text-[54px] font-medium text-[#1A1A1A] mb-4">
                            Message sent — thank you!
                        </h1>
                    <p className="text-[18px] text-[#666666] mb-8">
                        We've received your enquiry. We'll reply within 24 hours.
                    </p>
                    <div className="flex gap-4 justify-center">
                            <Button
                                onClick={() => onNavigate?.("home")}
                            className="bg-[#206039] text-[#024E40] hover:bg-[#206039]/90 rounded-[30px] px-6"
                            >
                                Return Home
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsSubmitted(false)}
                            className="rounded-[30px] px-6"
                            >
                                Send Another Message
                            </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#F6F6F7]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <div className="max-w-[1440px] mx-auto px-[220px] py-[80px]">
                {/* Hero Section */}
                <div className="flex flex-col items-center gap-[16px] mb-[48px]">
                    <h1 className="text-[54px] font-medium text-[#1A1A1A] leading-[1.33] text-center">
                        Get in touch
                    </h1>
                    <p className="text-[18px] font-normal text-[#666666] leading-[1.2] text-center max-w-[1004px]">
                        Have questions about our virtual address service? We're here to help.
                    </p>
                </div>

                {/* Main Content - Form and Contact Cards */}
                <div className="flex gap-[24px] items-start">
                    {/* Left Column - Contact Form */}
                    <div className="flex-1">
                        <div className="bg-[#F9F9F9] rounded-[30px] p-[34px]">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
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
                                <div className="flex flex-col gap-[6px]">
                                    <label htmlFor="name" className="text-[18px] font-medium text-[#1A1A1A] leading-[1.4]">
                                        Name
                                            </label>
                                    <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={handleInputChange}
                                        placeholder="Name"
                                        className="w-full px-[28px] py-[18px] rounded-[30px] bg-white text-[14px] font-normal text-[#979797] leading-[1.4] border-none focus:outline-none focus:ring-2 focus:ring-[#206039]"
                                            />
                                        </div>

                                {/* Email Field */}
                                <div className="flex flex-col gap-[6px]">
                                    <label htmlFor="email" className="text-[16px] font-medium text-[#1A1A1A] leading-[1.4]">
                                        Email
                                            </label>
                                    <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={handleInputChange}
                                        placeholder="Type email"
                                        className="w-full px-[28px] py-[18px] rounded-[30px] bg-white text-[14px] font-normal text-[#979797] leading-[1.4] border-none focus:outline-none focus:ring-2 focus:ring-[#206039]"
                                            />
                                    </div>

                                {/* Company Name Field */}
                                <div className="flex flex-col gap-[6px]">
                                    <label htmlFor="company" className="text-[16px] font-medium text-[#1A1A1A] leading-[1.4] uppercase">
                                                Company name
                                            </label>
                                    <input
                                                id="company"
                                                name="company"
                                                type="text"
                                                value={formData.company}
                                                onChange={handleInputChange}
                                        placeholder="Company name"
                                        className="w-full px-[28px] py-[18px] rounded-[30px] bg-white text-[14px] font-normal text-[#979797] leading-[1.4] border-none focus:outline-none focus:ring-2 focus:ring-[#206039]"
                                    />
                                    </div>

                                {/* Subject Field */}
                                <div className="flex flex-col gap-[6px]">
                                    <label htmlFor="subject" className="text-[16px] font-medium text-[#1A1A1A] leading-[1.4] uppercase">
                                        Subject
                                        </label>
                                    <input
                                            id="subject"
                                            name="subject"
                                            type="text"
                                            required
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                        placeholder="How can we help you"
                                        className="w-full px-[28px] py-[18px] rounded-[30px] bg-white text-[14px] font-normal text-[#979797] leading-[1.4] border-none focus:outline-none focus:ring-2 focus:ring-[#206039]"
                                        />
                                    </div>

                                {/* Inquire Type Dropdown */}
                                <div className="flex flex-col gap-[6px]">
                                    <label htmlFor="inquiryType" className="text-[16px] font-medium text-[#1A1A1A] leading-[1.4] uppercase">
                                        Enquiry type
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="inquiryType"
                                            name="inquiryType"
                                            value={formData.inquiryType}
                                            onChange={handleInputChange}
                                            className="w-full px-[16px] py-[12px] rounded-[30px] bg-white text-[14px] font-normal text-[#979797] leading-[1.4] border-none focus:outline-none focus:ring-2 focus:ring-[#206039] appearance-none pr-[40px]"
                                        >
                                            <option value="general">General enquiry</option>
                                            <option value="pricing">Pricing Question</option>
                                            <option value="technical">Technical Support</option>
                                            <option value="billing">Billing Question</option>
                                        </select>
                                        <ChevronDown className="absolute right-[16px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#979797] pointer-events-none" />
                                    </div>
                                </div>

                                {/* Description/Message Field */}
                                <div className="flex flex-col gap-[6px]">
                                    <label htmlFor="message" className="text-[16px] font-medium text-[#1A1A1A] leading-[1.4]">
                                        Description
                                        </label>
                                    <textarea
                                            id="message"
                                            name="message"
                                            required
                                            rows={6}
                                            value={formData.message}
                                            onChange={handleInputChange}
                                        placeholder="Please describe your enquiry in detail..."
                                        className="w-full px-[20px] py-[18px] rounded-[20px] bg-white text-[14px] font-normal text-[#979797] leading-[1.4] border-none focus:outline-none focus:ring-2 focus:ring-[#206039] resize-none"
                                        />
                                    </div>

                                {/* Submit Button */}
                                <button
                                            type="submit"
                                            disabled={isSubmitting}
                                    className="w-full py-[10px] px-[10px] rounded-[30px] bg-[#206039] text-[#024E40] text-[16px] font-medium leading-[1.4] uppercase hover:bg-[#206039]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                <p className="text-[16px] font-normal text-[#666666] leading-[1.4] text-center">
                                    Your information is private and never shared with third parties.
                                </p>
                            </form>
                        </div>
                    </div>

                    {/* Right Column - Contact Cards */}
                    <div className="w-[488px] flex-shrink-0 flex flex-col gap-[24px]">
                        {/* WhatsApp Support Card */}
                        <div className="bg-[#F9F9F9] rounded-[20px] p-[26px_34px] flex flex-col items-end gap-[38px]">
                            <div className="w-full flex flex-col gap-[14px]">
                                <div className="flex flex-col gap-[7px]">
                                    <h3 className="text-[16px] font-medium text-[#1A1A1A] leading-[1.2]">
                                        WhatsApp Support
                                    </h3>
                                    <p className="text-[16px] font-normal text-[#666666] leading-[1.4]">
                                        Dedicated WhatsApp Business line
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => window.open("https://wa.me/447000000000", "_blank")}
                                className="w-[214px] h-[48px] rounded-[36px] border border-[#206039] bg-transparent text-[#206039] text-[16px] font-medium leading-[1.4] hover:bg-[#206039] hover:text-white transition-colors"
                                        >
                                Chat on WhatsApp
                            </button>
                                    </div>

                        {/* Email Card */}
                        <div className="bg-[#F9F9F9] rounded-[20px] p-[26px_34px] flex flex-col items-end gap-[38px]">
                            <div className="w-full flex flex-col gap-[14px]">
                                <div className="flex flex-col gap-[7px]">
                                    <h3 className="text-[16px] font-medium text-[#1A1A1A] leading-[1.2]">
                                        Email
                                    </h3>
                                    <p className="text-[16px] font-normal text-[#666666] leading-[1.4]">
                                        support@virtualaddresshub.co.uk
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => (window.location.href = "mailto:support@virtualaddresshub.co.uk")}
                                className="w-[214px] h-[48px] rounded-[36px] border border-[#206039] bg-transparent text-[#206039] text-[16px] font-medium leading-[1.4] hover:bg-[#206039] hover:text-white transition-colors"
                            >
                                Send an email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
