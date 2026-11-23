import type { Metadata } from 'next';
import Link from 'next/link';

const description =
    'VirtualAddressHub offers a professional Central London business address, simple pricing, and online mail management for founders and growing UK businesses.';

export const metadata: Metadata = {
    title: 'About Us | VirtualAddressHub',
    description,
    alternates: { canonical: 'https://virtualaddresshub.co.uk/about' },
    openGraph: {
        title: 'About Us | VirtualAddressHub',
        description,
        url: 'https://virtualaddresshub.co.uk/about',
    },
};

const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About VirtualAddressHub',
    description,
    url: 'https://virtualaddresshub.co.uk/about',
    isPartOf: {
        '@type': 'WebSite',
        name: 'VirtualAddressHub',
        url: 'https://virtualaddresshub.co.uk',
    },
};

const T = {
    paper:      '#FFFFFF',
    paperLight: '#FFFFFF',
    ink:        '#0A0A0A',
    ink2:       '#404040',
    muted:      '#6B6B6B',
    rule:       '#E5E5E5',
    green:      '#0A0A0A',
    font:       "'Inter', system-ui, sans-serif",
} as const;

const paragraphs = [
    'VirtualAddressHub gives modern businesses a simple way to establish a professional Central London presence — without renting office space, and without using a home address publicly.',
    'We created the service for founders and growing businesses who want a reliable business address, straightforward pricing, and an easier way to manage mail online.',
    'Everything we offer is built around what matters most to modern businesses: privacy, professionalism, compliance, and simplicity.',
    'With one clear plan and no confusing tiers or unnecessary extras, VirtualAddressHub is designed to make business mail easier to manage while giving your company a more professional presence.',
];

/**
 * About page — marketing site, shared (public) layout (header + footer).
 */
export default function AboutPage() {
    return (
        <>
            <div style={{ background: T.paper, minWidth: 0, fontFamily: T.font }}>

                {/* ── Page header ── */}
                <div style={{
                    padding: 'clamp(40px, 6vw, 64px) clamp(20px, 5vw, 56px) clamp(20px, 3vw, 32px)',
                }}>
                    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                        <h1 style={{
                            fontFamily: T.font,
                            fontSize: 'clamp(2.25rem, 6vw, 4.5rem)',
                            color: T.ink,
                            margin: 0,
                            letterSpacing: '-0.045em',
                            fontWeight: 600,
                            lineHeight: 1.05,
                        }}>
                            A simpler way to be{' '}
                            <span style={{ color: T.muted, fontWeight: 600 }}>
                                a London business.
                            </span>
                        </h1>
                    </div>
                </div>

                {/* ── Body ── */}
                <section style={{
                    padding: 'clamp(16px, 3vw, 40px) clamp(20px, 5vw, 56px) clamp(48px, 8vw, 80px)',
                }}>
                    <div style={{ maxWidth: 720, margin: '0 auto' }}>

                        {paragraphs.map((p, i) => (
                            <p
                                key={i}
                                style={{
                                    fontFamily: T.font,
                                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                    lineHeight: 1.7,
                                    color: i === 0 ? T.ink : T.ink2,
                                    margin: '0 0 24px',
                                    fontWeight: 400,
                                    overflow: 'hidden',
                                }}
                            >
                                {p}
                            </p>
                        ))}

                        {/* ── CTA strip ── */}
                        <div style={{
                            marginTop: 56,
                            paddingTop: 32,
                            borderTop: `1px solid ${T.rule}`,
                        }}>
                            <p style={{
                                fontFamily: T.font,
                                fontSize: 17,
                                color: T.ink2,
                                fontStyle: 'normal',
                                fontWeight: 400,
                                margin: '0 0 20px',
                            }}>
                                Ready to see pricing or talk to the team?
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                <Link
                                    href="/pricing"
                                    style={{
                                        background: T.green,
                                        color: T.paperLight,
                                        padding: '13px 22px',
                                        fontFamily: T.font,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        borderRadius: 999,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        minHeight: 44,
                                    }}
                                >
                                    View pricing →
                                </Link>
                                <Link
                                    href="/contact"
                                    style={{
                                        border: `1px solid ${T.ink2}`,
                                        color: T.ink,
                                        padding: '13px 22px',
                                        fontFamily: T.font,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        borderRadius: 4,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        minHeight: 44,
                                    }}
                                >
                                    Contact us
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
            />
        </>
    );
}
