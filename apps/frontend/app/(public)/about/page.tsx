import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const description =
    'VirtualAddressHub offers a professional Central London business address, simple pricing, and online mail management for founders and growing UK businesses.';

export const metadata: Metadata = {
    title: 'About Us | VirtualAddressHub',
    description,
    robots: { index: true, follow: true },
    alternates: {
        canonical: 'https://virtualaddresshub.com/about',
    },
    openGraph: {
        title: 'About Us | VirtualAddressHub',
        description,
        url: 'https://virtualaddresshub.com/about',
    },
};

const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About VirtualAddressHub',
    description,
    url: 'https://virtualaddresshub.com/about',
    isPartOf: {
        '@type': 'WebSite',
        name: 'VirtualAddressHub',
        url: 'https://virtualaddresshub.com',
    },
};

/**
 * About page — marketing site, shared (public) layout (header + footer).
 */
export default function AboutPage() {
    return (
        <div className="min-w-0 w-full overflow-x-clip bg-muted pt-8 lg:pt-0">
            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:py-16">
                <article className="max-w-2xl">
                    <header className="mb-10 sm:mb-12">
                        <h1 className="text-h2 font-semibold tracking-tight text-foreground sm:text-h1">
                            About VirtualAddressHub
                        </h1>
                    </header>

                    <div className="space-y-6 text-body-lg leading-relaxed text-foreground">
                        <p>
                            VirtualAddressHub gives modern businesses a simple way
                            to establish a professional Central London presence
                            without renting office space or using a home address
                            publicly.
                        </p>
                        <p>
                            We created the service for founders and growing
                            businesses who want a reliable business address,
                            straightforward pricing, and an easier way to manage
                            mail online.
                        </p>
                        <p>
                            Everything we offer is built around what matters most
                            to modern businesses: privacy, professionalism,
                            compliance, and simplicity.
                        </p>
                        <p>
                            With one clear plan and no confusing tiers or
                            unnecessary extras, VirtualAddressHub is designed to
                            make business mail easier to manage while giving your
                            company a more professional presence.
                        </p>
                    </div>

                    <footer className="mt-12 border-t border-border pt-10">
                        <p className="text-body text-muted-foreground">
                            Ready to see pricing or talk to the team?
                        </p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <Button
                                asChild
                                className="h-10 rounded-lg px-5 text-body-sm font-medium"
                            >
                                <Link href="/pricing">View pricing</Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="h-10 rounded-lg px-5 text-body-sm font-medium"
                            >
                                <Link href="/contact">Contact us</Link>
                            </Button>
                        </div>
                    </footer>
                </article>
            </div>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(aboutPageJsonLd),
                }}
            />
        </div>
    );
}
