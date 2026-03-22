import { Metadata } from 'next'
import { generateMetadata, businessSchema } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
    title: 'About VirtualAddressHub - Professional London Business Address Service',
    description: 'Learn about VirtualAddressHub, the leading provider of professional London business addresses, virtual office services, and mail forwarding solutions for UK businesses.',
    keywords: [
        'about virtual address hub',
        'London business address provider',
        'virtual office service company',
        'mail forwarding service provider',
        'UK business address service',
        'professional address solutions'
    ],
    canonical: '/about',
})

/**
 * About Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function AboutPage() {
    return (
        <div className="bg-background">
                <div className="container mx-auto px-4 py-16">
                    <article className="max-w-4xl mx-auto">
                        <header className="text-center mb-12">
                            <h1 className="text-4xl font-bold mb-6">About VirtualAddressHub</h1>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                The modern, compliant alternative to using your home address for business.
                            </p>
                        </header>

                        <div className="prose prose-lg max-w-none">
                            <section className="mb-12">
                                <h2 className="text-3xl font-semibold mb-6">Why We Built This</h2>
                                <p className="text-lg leading-relaxed mb-6">
                                    Before we started VirtualAddressHub, setting up a business in the UK meant making a difficult choice: expose your personal home address on the public Companies House register for anyone to see, or overpay hundreds of pounds a year for an archaic mail forwarding service that took weeks to send you your letters.
                                </p>
                                <p className="text-lg leading-relaxed mb-6">
                                    We believed founders deserved better. We built VirtualAddressHub to provide a perfectly legal, fully compliant Central London address that shields your privacy, combined with modern software that gets your mail onto your screen the same day it arrives at our office. No hidden fees, no outdated portals, and no compromises on compliance.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-3xl font-semibold mb-6">How We Work</h2>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <h3 className="text-xl font-semibold mb-4">Central London Address</h3>
                                        <p className="text-muted-foreground">
                                            A genuine, physical address in London. Use it for your Registered Office, Director's Service Address, and daily business correspondence. We process the physical mail, so you can work from anywhere.
                                        </p>
                                    </div>
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <h3 className="text-xl font-semibold mb-4">Same-Day Digital Processing</h3>
                                        <p className="text-muted-foreground">
                                            When a letter arrives, our on-site team securely scans the envelope and its contents. It lands in your secure digital dashboard typically within hours of the postman dropping it off.
                                        </p>
                                    </div>
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <h3 className="text-xl font-semibold mb-4">Strict Compliance</h3>
                                        <p className="text-muted-foreground">
                                            We don't cut corners. We strictly enforce Know Your Customer (KYC) identity checks to keep bad actors out, ensuring the address remains reputable and trusted by banks and government bodies.
                                        </p>
                                    </div>
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <h3 className="text-xl font-semibold mb-4">Privacy First</h3>
                                        <p className="text-muted-foreground">
                                            We act as a firewall for your privacy. Once documents are processed or physical forwards are dispatched, we securely shred and recycle sensitive physical paper after 30 days.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-3xl font-semibold mb-6">Our Commitment to Trust</h2>
                                <p className="text-lg leading-relaxed mb-6">
                                    Handling official company mail requires absolute security and legal standing. As a regulated Trust and Company Service Provider (TCSP), we operate closely with UK authorities to keep your data safe and our operations secure.
                                </p>
                                <ul className="space-y-4 text-lg">
                                    <li className="flex items-start">
                                        <span className="text-emerald-600 mr-3 mt-1">✓</span>
                                        <span><strong>HMRC AML Supervised:</strong> We are strictly audited and approved for handling official tax and corporate correspondence.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-emerald-600 mr-3 mt-1">✓</span>
                                        <span><strong>ICO Registered (ZC051808):</strong> Fully compliant with UK data protection regulations and the Data Protection Act 2018.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-emerald-600 mr-3 mt-1">✓</span>
                                        <span><strong>Economic Crime Act Ready:</strong> Our address meets the "appropriate address" test under the new UK corporate transparency legislation.</span>
                                    </li>
                                </ul>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-3xl font-semibold mb-6">Get in Touch</h2>
                                <p className="text-lg leading-relaxed mb-6">
                                    If you're unsure whether our service is right for your specific company setup, or if you just have questions about UK compliance, our team is happy to help.
                                </p>
                                <div className="bg-emerald-50/50 p-6 rounded-lg border border-emerald-100">
                                    <p className="text-lg font-semibold mb-2 text-emerald-900">Reach Out</p>
                                    <p className="text-emerald-800/80 mb-4">
                                        We support founders globally setting up in the UK. Contact us for direct guidance on your address requirements.
                                    </p>
                                    <a href="/contact" className="inline-flex font-medium text-emerald-700 hover:text-emerald-600 underline underline-offset-4">
                                        Contact Support
                                    </a>
                                </div>
                            </section>
                        </div>
                    </article>
                </div>

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(businessSchema)
                    }}
                />
        </div>
    )
}