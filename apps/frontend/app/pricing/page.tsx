import { Metadata } from 'next'
import { generateMetadata, serviceSchema } from '@/lib/seo'
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

export const metadata: Metadata = generateMetadata({
  title: 'Pricing - Virtual London Business Address Plans | VirtualAddressHub',
  description: 'Transparent pricing for professional London business address services. Starting from £29.99/month. Includes mail forwarding, digital scanning, and compliance support. No hidden fees.',
  keywords: [
    'London business address pricing',
    'virtual office cost',
    'mail forwarding service price',
    'business address plans',
    'virtual office pricing UK',
    'professional address service cost'
  ],
  canonical: '/pricing',
})

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full bg-background">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl mb-6">Simple, Transparent Pricing</h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
            Professional London business address services with no hidden fees.
            Choose the plan that works for your business.
          </p>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Starter Plan */}
            <div className="bg-card border border-border rounded-lg p-8 relative">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-4">Starter</h2>
                <div className="text-4xl font-bold text-primary mb-2">£29.99</div>
                <div className="text-muted-foreground">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Professional London business address</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Companies House registration</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>HMRC correspondence handling</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Digital mail scanning (up to 50 items)</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Secure online dashboard</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Email notifications</span>
                </li>
              </ul>

              <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-card border-2 border-primary rounded-lg p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-4">Professional</h2>
                <div className="text-4xl font-bold text-primary mb-2">£49.99</div>
                <div className="text-muted-foreground">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Unlimited digital mail scanning</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Free UK forwarding (up to 10 items)</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Compliance guidance</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Document storage (1 year)</span>
                </li>
              </ul>

              <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-card border border-border rounded-lg p-8 relative">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-4">Enterprise</h2>
                <div className="text-4xl font-bold text-primary mb-2">£99.99</div>
                <div className="text-muted-foreground">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Everything in Professional</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Unlimited UK forwarding</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>International forwarding</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-3">✓</span>
                  <span>Extended document storage (3 years)</span>
                </li>
              </ul>

              <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl text-center mb-12">Frequently Asked Questions</h2>
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-base font-semibold mb-4">What's included in the monthly fee?</h3>
                <p className="text-sm text-muted-foreground">
                  Your monthly fee includes your professional London business address, mail scanning,
                  secure digital storage, and access to our online dashboard. Additional services like
                  forwarding may have separate charges depending on your plan.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-base font-semibold mb-4">Can I change my plan anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect
                  immediately, and we'll prorate any differences in your next billing cycle.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-base font-semibold mb-4">Is there a setup fee?</h3>
                <p className="text-sm text-muted-foreground">
                  No setup fees, no hidden costs. You only pay your monthly subscription fee.
                  Some additional services like international forwarding may have separate charges.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-base font-semibold mb-4">How quickly is mail processed?</h3>
                <p className="text-sm text-muted-foreground">
                  Mail is typically scanned and uploaded to your dashboard within 24 hours of receipt.
                  Priority customers may receive same-day processing for urgent items.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-primary/5 p-12 rounded-lg border border-primary/20">
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl mb-6">Ready to Get Started?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base mb-8">
              Join over 1,000 businesses who trust VirtualAddressHub for their professional
              London business address needs.
            </p>
            <button className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors">
              Start Your Free Trial
            </button>
          </section>
        </div>
      </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(serviceSchema)
          }}
        />
      </main>
      <FooterWithNav />
    </div>
  )
}