'use client';

import React, { useState } from 'react';
import { usePricing } from '@/hooks/usePlans';
import { formatPrice } from '@/lib/formatPrice';

// ── Design tokens ────────────────────────────────────────────
const T = {
    paper:      '#FFFFFF',
    paperDeep:  'hsl(var(--mist))',
    paperLight: '#FFFFFF',
    ink:        'hsl(var(--ink))',
    ink2:       'hsl(var(--graphite))',
    muted:      'hsl(var(--slate))',
    rule:       'hsl(var(--line))',
    green:      'hsl(var(--ink))',
    accent:     'hsl(var(--brand-green-ink))',
    font:       "'Inter', system-ui, sans-serif",
} as const;

interface PlansPageProps {
    onNavigate: (page: string, data?: any) => void;
}

// ── Checkmark list item ──────────────────────────────────────
function CheckItem({ text }: { text: string }) {
    return (
        <li style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 12 }}>
            <span style={{ color: T.accent, fontStyle: 'normal', fontSize: 18, lineHeight: 1.1, fontWeight: 500 }}>✓</span>
            <span style={{ fontFamily: T.font, fontSize: 15, color: T.ink2, lineHeight: 1.5, fontWeight: 400 }}>{text}</span>
        </li>
    );
}

// ── Section label ────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18,
        }}>
            {children}
        </div>
    );
}

// ── Main component ───────────────────────────────────────────
export function PlansPage({ onNavigate }: PlansPageProps) {
    const [isAnnual, setIsAnnual] = useState(false);

    const {
        monthlyPrice,
        annualPrice,
        monthlySavingsPct,
        loading,
        error,
        hasApiData,
    } = usePricing();

    const handleSelectPlan = () => {
        onNavigate('signup', { initialBilling: isAnnual ? 'annual' : 'monthly' });
    };

    // No made-up figures: with no price from the server, say so and don't offer checkout.
    const selectedPrice = isAnnual ? annualPrice : monthlyPrice;
    const displayPrice = selectedPrice === null
        ? 'Pricing unavailable'
        : formatPrice(selectedPrice, { interval: isAnnual ? 'year' : 'month' });

    const explanatoryFeatures = [
        'Unlimited same-day digital mail scanning',
        'HMRC & Companies House forwarding free (UK)',
        'Other UK mail forwarded at £2 per item',
        'International forwarding available on request',
    ];

    const trustFeatures = [
        'Central London address (never a PO Box)',
        'Companies House compliant',
        'ICO registered · HMRC AML supervised',
        'Digital delivery same business day',
    ];

    return (
        <div className="plans-page" style={{ background: T.paper, minWidth: 0 }}>

            {/* ── Responsive styles ── */}
            <style>{`
                .plans-page { font-family: ${T.font}; }

                /* Page header */
                .plans-header {
                    padding: 48px 20px 28px;
                }
                @media (min-width: 640px) {
                    .plans-header { padding: 56px 40px 32px; }
                }
                @media (min-width: 1024px) {
                    .plans-header { padding: 64px 56px 32px; }
                }

                /* Card outer section */
                .plans-section {
                    padding: 24px 16px 64px;
                }
                @media (min-width: 640px) {
                    .plans-section { padding: 32px 40px 80px; }
                }
                @media (min-width: 1024px) {
                    .plans-section { padding: 40px 56px 110px; }
                }

                /* Card inner grid */
                .plans-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 40px;
                }
                @media (min-width: 1024px) {
                    .plans-grid {
                        grid-template-columns: 1fr 1px 1.3fr;
                        gap: 56px;
                        align-items: start;
                    }
                }

                /* Hairline divider — only visible on desktop */
                .plans-divider {
                    display: none;
                    background: ${T.rule};
                    width: 1px;
                    align-self: stretch;
                    min-height: 400px;
                }
                @media (min-width: 1024px) {
                    .plans-divider { display: block; }
                }

                /* Horizontal rule between price and features on mobile */
                .plans-mobile-rule {
                    display: block;
                    border: none;
                    border-top: 1px solid ${T.rule};
                    margin: 8px 0 32px;
                }
                @media (min-width: 1024px) {
                    .plans-mobile-rule { display: none; }
                }

                /* Toggle — full-width on mobile */
                .plans-toggle {
                    display: flex;
                    width: 100%;
                    background: ${T.paperDeep};
                    border: none;
                    border-radius: 999px;
                    padding: 4px;
                }
                @media (min-width: 480px) {
                    .plans-toggle { width: auto; display: inline-flex; }
                }

                .plans-toggle button {
                    flex: 1;
                    padding: 12px 18px;
                    border: none;
                    cursor: pointer;
                    font-family: ${T.font};
                    font-size: 14px;
                    font-weight: 600;
                    border-radius: 999px;
                    transition: all 0.2s;
                    min-height: 44px;
                    white-space: nowrap;
                }

                /* CTA — full width always */
                .plans-cta {
                    display: block;
                    width: 100%;
                    text-align: center;
                    background: ${T.green};
                    color: ${T.paper};
                    padding: 15px 28px;
                    font-family: ${T.font};
                    font-size: 15px;
                    font-weight: 500;
                    border: none;
                    border-radius: 999px;
                    cursor: pointer;
                    min-height: 48px;
                    transition: opacity 0.15s;
                }
                .plans-cta:hover { opacity: 0.88; }
                .plans-cta:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Price skeleton loader */
                .plans-skeleton {
                    display: inline-block;
                    background: ${T.rule};
                    border-radius: 4px;
                    animation: plans-pulse 1.4s ease-in-out infinite;
                }
                @keyframes plans-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>

            {/* ── Page header ── */}
            <div className="plans-header">
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    <h1 style={{
                        fontFamily: T.font,
                        fontSize: 'clamp(2.25rem, 5vw, 4rem)',
                        color: T.ink,
                        margin: 0,
                        letterSpacing: '-0.045em',
                        fontWeight: 600,
                        lineHeight: 1.05,
                    }}>
                        One plan.{' '}
                        <span style={{ color: T.muted, fontWeight: 600 }}>
                            Everything in it.
                        </span>
                    </h1>
                    <p style={{
                        fontFamily: T.font,
                        fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)',
                        color: T.ink2,
                        fontWeight: 400,
                        margin: '16px 0 0',
                        maxWidth: 560,
                        lineHeight: 1.65,
                    }}>
                        No tiers, no unnecessary add-ons, no surprise charges. The whole service is the whole service.
                    </p>
                </div>
            </div>

            {/* ── Pricing card ── */}
            <section className="plans-section">
                <div style={{
                    maxWidth: 1080,
                    margin: '0 auto',
                    background: T.paperLight,
                    border: `1px solid ${T.rule}`,
                    borderRadius: 24,
                    boxShadow: '0 50px 100px -40px rgba(10, 37, 64, .35)',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: 'clamp(24px, 4vw, 48px) clamp(20px, 5vw, 56px)',
                }}>
                    <div className="plans-grid">

                        {/* ── Left: price + CTA ── */}
                        <div>
                            <div style={{
                                fontFamily: T.font, fontSize: 11, color: T.muted,
                                fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
                            }}>
                                Virtual mailbox · London
                            </div>

                            <h2 style={{
                                fontFamily: T.font,
                                fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
                                color: T.ink, margin: '12px 0 24px',
                                fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1.2,
                            }}>
                                Everything you need,<br />
                                <span style={{ color: T.muted, fontWeight: 600 }}>
                                    one honest price.
                                </span>
                            </h2>

                            {/* Toggle */}
                            <div className="plans-toggle" role="group" aria-label="Billing period">
                                <button
                                    onClick={() => setIsAnnual(false)}
                                    style={{
                                        background: !isAnnual ? T.green : 'transparent',
                                        color: !isAnnual ? T.paper : T.ink2,
                                    }}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setIsAnnual(true)}
                                    style={{
                                        background: isAnnual ? T.green : 'transparent',
                                        color: isAnnual ? T.paper : T.ink2,
                                    }}
                                >
                                    Annual{monthlySavingsPct > 0 ? ` · save ${monthlySavingsPct}%` : ''}
                                </button>
                            </div>

                            {/* Error */}
                            {error && (
                                <p style={{
                                    fontFamily: T.font, fontSize: 13, color: T.muted,
                                    margin: '16px 0 0',
                                }}>
                                    Pricing temporarily unavailable. Please refresh.
                                </p>
                            )}

                            {/* Price */}
                            <div style={{ margin: '28px 0 6px', minHeight: 80, display: 'flex', alignItems: 'baseline' }}>
                                {loading ? (
                                    <span className="plans-skeleton" style={{ width: 160, height: 72 }} />
                                ) : (
                                    <span style={{
                                        fontFamily: T.font,
                                        fontSize: 'clamp(3rem, 10vw, 5rem)',
                                        color: T.ink,
                                        lineHeight: 1,
                                        letterSpacing: '-0.04em',
                                        fontWeight: 600,
                                    }}>
                                        {displayPrice}
                                    </span>
                                )}
                            </div>
                            <div style={{
                                fontFamily: T.font, fontSize: 12, color: T.muted,
                                fontWeight: 400, letterSpacing: '0.05em', marginBottom: 28,
                            }}>
                                {isAnnual ? 'per year, billed once' : 'per month, billed monthly'}
                            </div>

                            {/* CTA */}
                            <button
                                className="plans-cta"
                                onClick={handleSelectPlan}
                                disabled={loading || selectedPrice === null}
                            >
                                Get started →
                            </button>
                            <div style={{
                                fontFamily: T.font, fontSize: 11, color: T.muted,
                                fontWeight: 400, marginTop: 12, textAlign: 'center',
                                letterSpacing: '0.05em',
                            }}>
                                {selectedPrice === null ? null : isAnnual
                                    ? `Equivalent to ${formatPrice(selectedPrice / 12, { interval: 'month' })}`
                                    : monthlySavingsPct > 0 ? `Switch to annual anytime · save ${monthlySavingsPct}%` : 'Annual billing also available'
                                }
                            </div>
                        </div>

                        {/* ── Hairline divider (desktop only) ── */}
                        <div className="plans-divider" />

                        {/* ── Horizontal rule (mobile only) ── */}
                        <hr className="plans-mobile-rule" style={{ display: 'none' }} />

                        {/* ── Right: features + trust ── */}
                        <div>
                            <SectionLabel>What's included</SectionLabel>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {explanatoryFeatures.map((item) => <CheckItem key={item} text={item} />)}
                            </ul>
                            <p style={{
                                fontFamily: T.font, fontStyle: 'normal', fontSize: 13,
                                color: T.muted, fontWeight: 400,
                                margin: '14px 0 0', paddingLeft: 32, maxWidth: 380,
                            }}>
                                You only pay for physical forwarding when you actually need it.
                            </p>

                            <div style={{ marginTop: 32 }}>
                                <SectionLabel>Compliance & trust</SectionLabel>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {trustFeatures.map((item) => <CheckItem key={item} text={item} />)}
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}
