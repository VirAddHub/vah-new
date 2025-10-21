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

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-16">
                <article className="max-w-4xl mx-auto">
                    <header className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-6">About VirtualAddressHub</h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Your trusted partner for professional London business addresses and virtual office solutions
                        </p>
                    </header>

                    <div className="prose prose-lg max-w-none">
                        <section className="mb-12">
                            <h2 className="text-3xl font-semibold mb-6">Who We Are</h2>
                            <p className="text-lg leading-relaxed mb-6">
                                VirtualAddressHub is a leading provider of professional business address services in London,
                                specializing in virtual office solutions, mail forwarding, and compliance support for UK businesses.
                                Founded in 2024, we have quickly become the trusted choice for over 1,000 businesses seeking
                                a prestigious London address for their operations.
                            </p>
                            <p className="text-lg leading-relaxed mb-6">
                                Our mission is to provide businesses with the tools they need to establish a professional
                                presence in London without the overhead of a physical office. We understand the complexities
                                of UK business compliance and have designed our services to meet the highest standards of
                                regulatory requirements.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-3xl font-semibold mb-6">Our Services</h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <h3 className="text-xl font-semibold mb-4">Virtual Business Address</h3>
                                    <p className="text-muted-foreground">
                                        A prestigious London address for company registration, HMRC correspondence,
                                        and professional business communications. Perfect for Companies House registration
                                        and maintaining compliance with UK regulations.
                                    </p>
                                </div>
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <h3 className="text-xl font-semibold mb-4">Mail Forwarding Service</h3>
                                    <p className="text-muted-foreground">
                                        Secure digital mail scanning with same-day processing. Receive your mail
                                        digitally through our secure dashboard and request physical forwarding
                                        when needed. Free forwarding for official HMRC and Companies House documents.
                                    </p>
                                </div>
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <h3 className="text-xl font-semibold mb-4">Compliance Support</h3>
                                    <p className="text-muted-foreground">
                                        Expert guidance on UK business compliance requirements, including HMRC
                                        regulations, Companies House filings, and director service address requirements.
                                    </p>
                                </div>
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <h3 className="text-xl font-semibold mb-4">Virtual Office Solutions</h3>
                                    <p className="text-muted-foreground">
                                        Complete virtual office package including business address, mail handling,
                                        and professional support services. Everything you need to run your business
                                        from anywhere in the world.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-3xl font-semibold mb-6">Why Choose VirtualAddressHub?</h2>
                            <ul className="space-y-4 text-lg">
                                <li className="flex items-start">
                                    <span className="text-primary mr-3">✓</span>
                                    <span><strong>ICO Registered:</strong> Fully compliant with UK data protection regulations</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-3">✓</span>
                                    <span><strong>HMRC AML Supervised:</strong> Approved for handling official tax correspondence</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-3">✓</span>
                                    <span><strong>GDPR Aligned:</strong> Your data privacy and security is our top priority</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-3">✓</span>
                                    <span><strong>Same-Day Processing:</strong> Mail scanned and available within 24 hours</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-3">✓</span>
                                    <span><strong>Secure Platform:</strong> Bank-level encryption and secure data handling</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-3">✓</span>
                                    <span><strong>Expert Support:</strong> Dedicated customer service team with UK business expertise</span>
                                </li>
                            </ul>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-3xl font-semibold mb-6">Our Commitment</h2>
                            <p className="text-lg leading-relaxed mb-6">
                                At VirtualAddressHub, we are committed to providing exceptional service and maintaining
                                the highest standards of security and compliance. Our team of experts understands the
                                unique challenges faced by modern businesses and has designed our services to address
                                these needs effectively.
                            </p>
                            <p className="text-lg leading-relaxed mb-6">
                                We believe that every business deserves access to professional services that enable
                                growth and compliance, regardless of their size or location. Our transparent pricing
                                and comprehensive service offerings make it easy for businesses to establish and
                                maintain their professional presence in London.
                            </p>
                        </section>

                        <section className="mb-12">
                            <h2 className="text-3xl font-semibold mb-6">Contact Us</h2>
                            <p className="text-lg leading-relaxed mb-6">
                                Ready to establish your professional London presence? Our team is here to help you
                                get started with the perfect virtual office solution for your business needs.
                            </p>
                            <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                                <p className="text-lg font-semibold mb-2">Get Started Today</p>
                                <p className="text-muted-foreground">
                                    Contact our team to learn more about our services and find the perfect solution for your business.
                                </p>
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