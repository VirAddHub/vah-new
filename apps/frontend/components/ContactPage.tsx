'use client';

import { useState } from "react";
import Link from "next/link";
import { isEmail, validateRequired } from "@/lib/validators";
import { useAsync } from "@/hooks/useAsync";

// ── Design tokens ────────────────────────────────────────────
const T = {
    paper:      '#FFFFFF',
    paperDeep:  '#F5F5F5',
    paperLight: '#FFFFFF',
    ink:        '#0A0A0A',
    ink2:       '#404040',
    muted:      '#6B6B6B',
    rule:       '#E5E5E5',
    green:      '#0A0A0A',
    font:       "'Inter', system-ui, sans-serif",
} as const;

interface ContactPageProps {
    onNavigate?: (page: string) => void;
}

type InquiryType = "general" | "pricing" | "technical" | "billing" | "compliance";

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

    // Wire to BFF route → backend /api/contact
    const { run: submitForm, loading: isSubmitting } = useAsync(async (data: typeof formData) => {
        const res = await fetch("/api/bff/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: data.name,
                email: data.email,
                subject: data.subject,
                message: data.message,
                inquiryType: data.inquiryType,
                website: data.website,
            }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json.error || "Failed to send message");
        return json;
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

    // ── Shared field/label styles ──────────────────────────────
    const fieldStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 16px',
        border: `1px solid ${T.rule}`,
        background: T.paperLight,
        fontFamily: T.font,
        fontSize: 15,
        fontWeight: 400,
        color: T.ink,
        outline: 'none',
        borderRadius: 0,
        transition: 'border-color .15s',
    };
    const labelStyle: React.CSSProperties = {
        fontFamily: T.font,
        fontSize: 11,
        color: T.muted,
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 8,
        display: 'block',
    };
    // ── Success screen ─────────────────────────────────────────
    if (isSubmitted) {
        return (
            <div style={{
                background: T.paper, minHeight: '60vh', fontFamily: T.font,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 56px)',
            }}>
                <div style={{ maxWidth: 560, textAlign: 'center' }}>
                    <h1 style={{
                        fontFamily: T.font, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                        color: T.ink, fontWeight: 600, letterSpacing: '-0.045em',
                        margin: '0 0 16px',
                    }}>
                        Message sent —{' '}
                        <span style={{ color: T.muted, fontWeight: 600 }}>thank you!</span>
                    </h1>
                    <p style={{ fontFamily: T.font, fontSize: 16, color: T.ink2, fontWeight: 400, margin: '0 0 32px', lineHeight: 1.6 }}>
                        We've received your enquiry. A real human in London will reply same working day.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                        <Link href="/" style={{
                            background: T.green, color: T.paperLight,
                            padding: '13px 22px', fontFamily: T.font, fontSize: 14,
                            fontWeight: 500, borderRadius: 999, textDecoration: 'none',
                            display: 'inline-flex', alignItems: 'center', minHeight: 44,
                        }}>
                            Return home
                        </Link>
                        <button
                            onClick={() => setIsSubmitted(false)}
                            style={{
                                border: `1px solid ${T.ink2}`, color: T.ink,
                                padding: '13px 22px', fontFamily: T.font, fontSize: 14,
                                fontWeight: 500, borderRadius: 4, background: 'transparent',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', minHeight: 44,
                            }}
                        >
                            Send another message
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: T.paper, minWidth: 0, fontFamily: T.font }}>

            {/* ── Responsive styles ── */}
            <style>{`
                .contact-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 32px;
                }
                @media (min-width: 1024px) {
                    .contact-grid { grid-template-columns: 1.6fr 1fr; gap: 48px; }
                }
                .contact-name-row {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                @media (min-width: 540px) {
                    .contact-name-row { grid-template-columns: 1fr 1fr; }
                }
                .contact-input::placeholder { color: #B0A998; }
                .contact-input:focus { border-color: ${T.green} !important; outline: none; }
                .contact-email-btn:hover { background: ${T.paperDeep} !important; }
                .contact-email-btn:active { background: ${T.rule} !important; opacity: 0.8; }
            `}</style>

            {/* ── Page header ── */}
            <div style={{ padding: 'clamp(40px, 6vw, 64px) clamp(20px, 5vw, 56px) clamp(20px, 3vw, 32px)' }}>
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    <h1 style={{
                        fontFamily: T.font,
                        fontSize: 'clamp(2.25rem, 6vw, 4.5rem)',
                        color: T.ink, margin: 0,
                        letterSpacing: '-0.045em', fontWeight: 600, lineHeight: 1.05,
                    }}>
                        Get in{' '}
                        <span style={{ color: T.muted, fontWeight: 600 }}>touch.</span>
                    </h1>
                    <p style={{
                        fontFamily: T.font,
                        fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
                        color: T.ink2, fontWeight: 400,
                        margin: '16px 0 0', maxWidth: 620, lineHeight: 1.65,
                    }}>
                        Questions about the service, your account, compliance, billing — anything. A real human in London writes back, same working day.
                    </p>
                </div>
            </div>

            {/* ── Form + side cards ── */}
            <section style={{ padding: 'clamp(16px, 3vw, 40px) clamp(20px, 5vw, 56px) clamp(48px, 8vw, 110px)' }}>
                <div className="contact-grid" style={{ maxWidth: 1080, margin: '0 auto' }}>

                    {/* ── Form ── */}
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            background: T.paperDeep,
                            padding: 'clamp(24px, 4vw, 36px)',
                            border: `1px solid ${T.rule}`,
                        }}
                    >
                        {/* Honeypot */}
                        <input
                            type="text"
                            name="website"
                            value={formData.website}
                            onChange={handleInputChange}
                            autoComplete="off"
                            tabIndex={-1}
                            style={{ display: 'none' }}
                            aria-hidden="true"
                        />

                        {/* Error */}
                        {errorMsg && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fca5a5',
                                borderRadius: 4, padding: '12px 16px', marginBottom: 20,
                                fontFamily: T.font, fontSize: 13, color: '#991b1b', fontWeight: 400,
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        {/* Name + Email row */}
                        <div className="contact-name-row">
                            <div>
                                <label htmlFor="name" style={labelStyle}>Name</label>
                                <input
                                    className="contact-input"
                                    id="name" name="name" type="text" required
                                    value={formData.name} onChange={handleInputChange}
                                    placeholder="Your name"
                                    style={fieldStyle}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" style={labelStyle}>Email</label>
                                <input
                                    className="contact-input"
                                    id="email" name="email" type="email" required
                                    value={formData.email} onChange={handleInputChange}
                                    placeholder="you@example.com"
                                    style={fieldStyle}
                                />
                            </div>
                        </div>

                        {/* Company */}
                        <div style={{ marginTop: 20 }}>
                            <label htmlFor="company" style={labelStyle}>Company name</label>
                            <input
                                className="contact-input"
                                id="company" name="company" type="text"
                                value={formData.company} onChange={handleInputChange}
                                placeholder="(optional)"
                                style={fieldStyle}
                            />
                        </div>

                        {/* Subject */}
                        <div style={{ marginTop: 20 }}>
                            <label htmlFor="subject" style={labelStyle}>Subject</label>
                            <input
                                className="contact-input"
                                id="subject" name="subject" type="text" required
                                value={formData.subject} onChange={handleInputChange}
                                placeholder="How can we help you?"
                                style={fieldStyle}
                            />
                        </div>

                        {/* Enquiry type */}
                        <div style={{ marginTop: 20 }}>
                            <label htmlFor="inquiryType" style={labelStyle}>Enquiry type</label>
                            <select
                                className="contact-input"
                                id="inquiryType" name="inquiryType"
                                value={formData.inquiryType} onChange={handleInputChange}
                                style={{
                                    ...fieldStyle,
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A6F5E' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 16px center',
                                    paddingRight: 40,
                                } as React.CSSProperties}
                            >
                                <option value="general">General enquiry</option>
                                <option value="pricing">Pricing question</option>
                                <option value="technical">Technical support</option>
                                <option value="billing">Billing question</option>
                                <option value="compliance">Compliance / AML</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div style={{ marginTop: 20 }}>
                            <label htmlFor="message" style={labelStyle}>Description</label>
                            <textarea
                                className="contact-input"
                                id="message" name="message" required rows={5}
                                value={formData.message} onChange={handleInputChange}
                                placeholder="Tell us a bit more…"
                                style={{ ...fieldStyle, resize: 'vertical', minHeight: 130 }}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                marginTop: 28, width: '100%',
                                background: isSubmitting ? T.muted : T.green,
                                color: T.paper, padding: '16px',
                                fontFamily: T.font, fontSize: 15, fontWeight: 500,
                                border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                borderRadius: 4, minHeight: 48,
                                transition: 'background 0.15s',
                            }}
                        >
                            {isSubmitting ? 'Sending…' : 'Send enquiry →'}
                        </button>

                        <p style={{
                            fontFamily: T.font, fontSize: 13, color: T.muted,
                            fontWeight: 400, marginTop: 14, fontStyle: 'normal',
                        }}>
                            Your information stays with us — never shared with third parties.
                        </p>
                    </form>

                    {/* ── Side cards ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Email */}
                        <div style={{
                            background: T.paperLight, padding: 28,
                            border: `1px solid ${T.rule}`,
                        }}>
                            <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                Email
                            </div>
                            <div style={{
                                fontFamily: T.font, fontSize: 18, fontWeight: 400,
                                color: T.ink, margin: '10px 0 6px', wordBreak: 'break-all', lineHeight: 1.3,
                            }}>
                                support@virtualaddresshub.co.uk
                            </div>
                            <p style={{ fontFamily: T.font, fontSize: 14, color: T.muted, fontWeight: 400, margin: '0 0 14px', fontStyle: 'normal' }}>
                                Same-day reply, Mon–Fri.
                            </p>
                            <a
                                href="mailto:support@virtualaddresshub.co.uk"
                                className="contact-email-btn"
                                style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    border: `1px solid ${T.ink2}`, color: T.ink,
                                    padding: '9px 16px', fontFamily: T.font, fontSize: 13,
                                    fontWeight: 500, borderRadius: 4, textDecoration: 'none',
                                    minHeight: 40, transition: 'opacity 0.1s, background 0.1s',
                                    cursor: 'pointer',
                                }}
                            >
                                Send an email
                            </a>
                        </div>

                        {/* WhatsApp */}
                        <div style={{
                            background: T.paperLight, padding: 28,
                            border: `1px solid ${T.rule}`,
                        }}>
                            <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                WhatsApp
                            </div>
                            <div style={{
                                fontFamily: T.font, fontSize: 18, fontWeight: 400,
                                color: T.ink, margin: '10px 0 16px',
                            }}>
                                Dedicated business line
                            </div>
                            <a
                                href="https://wa.me/447000000000"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    background: T.green, color: T.paper,
                                    padding: '10px 18px', fontFamily: T.font, fontSize: 13,
                                    fontWeight: 500, textDecoration: 'none', borderRadius: 999, minHeight: 40,
                                }}
                            >
                                Chat on WhatsApp →
                            </a>
                        </div>

                        {/* Service address — green card, no real address before signup */}
                        <div style={{ background: T.green, color: T.paper, padding: 28 }}>
                            <div style={{ fontFamily: T.font, fontSize: 11, fontWeight: 500, opacity: 0.8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                Service address
                            </div>
                            <div style={{
                                fontFamily: T.font, fontSize: 20, fontWeight: 400,
                                margin: '10px 0 6px', lineHeight: 1.35,
                            }}>
                                A trusted<br />
                                <span style={{ fontStyle: 'normal', fontWeight: 400 }}>Central London</span><br />
                                business address.
                            </div>
                            <p style={{
                                fontFamily: T.font, fontSize: 13, fontWeight: 400,
                                opacity: 0.85, margin: '12px 0 0', lineHeight: 1.6,
                            }}>
                                The full postal address is shared after signup, payment and successful identity verification.
                            </p>
                            <p style={{
                                fontFamily: T.font, fontSize: 13, fontWeight: 400,
                                opacity: 0.7, margin: '14px 0 0', fontStyle: 'normal',
                            }}>
                                Support hours · Mon–Fri 9am–6pm GMT
                            </p>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}
