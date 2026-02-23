'use client';

interface TermsPageProps {
  onNavigate?: (page: string) => void;
}

export function TermsPage({ onNavigate }: TermsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6 text-muted-foreground">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Terms of Service</h1>
        <p className="text-sm italic">Last updated: [INSERT DATE]</p>
        <p>Clear, fair terms for using VirtualAddressHub.</p>
        <p>
          By creating an account, you agree to the terms below. They explain what we provide, how the service works, and our mutual responsibilities.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">1. What We Provide</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Professional London business address</li>
            <li>Registered Office & Director Service Address</li>
            <li>Mail reception and scanning</li>
            <li>Optional mail forwarding</li>
          </ul>
          <p>Service begins once payment is taken and identity verification is approved.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">2. Permitted Use</h2>
          <h3 className="font-semibold text-foreground">Allowed</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Registered Office</li>
            <li>Director Service Address</li>
            <li>Business correspondence</li>
            <li>Websites, branding, invoicing</li>
          </ul>
          <h3 className="font-semibold text-foreground">Not allowed</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Illegal or fraudulent activity</li>
            <li>High-risk financial services</li>
            <li>Unregulated investments</li>
            <li>Parcels or bulky items</li>
            <li>Residential or personal mail</li>
            <li>Misleading business activity</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">3. Legal Compliance</h2>
          <p>You must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Complete identity verification (KYC)</li>
            <li>Provide accurate information</li>
            <li>Keep your details up to date</li>
            <li>Use the service lawfully</li>
          </ul>
          <h3 className="font-semibold text-foreground">Jurisdiction Eligibility</h3>
          <p>
            <strong>We only accept customers from low-risk jurisdictions. Applications from high-risk or restricted countries may be declined.</strong>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">4. Service Activation</h2>
          <p>Activation requires:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Payment setup via Stripe</li>
            <li>First payment collected</li>
            <li>Completed KYC</li>
            <li>Compliance approval</li>
          </ul>
          <p>If KYC is not successfully completed within 30 days, the account will be cancelled and refunded.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">5. Mail Handling</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Envelopes scanned on arrival</li>
            <li>Contents scanned unless restricted</li>
            <li>Scans uploaded to your dashboard</li>
            <li>HMRC and Companies House mail prioritised</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">6. Forwarding</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>HMRC/Companies House mail: free</li>
            <li>Other UK letters: £2 per item</li>
            <li>International forwarding: quoted on request</li>
          </ul>
          <p>Forwarding fees are added to your monthly invoice.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">7. Parcels</h2>
          <p>Parcels or bulky items are not accepted. Unaccepted items may be returned or securely disposed of.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">8. Billing</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Monthly plan: £9.99</li>
            <li>Annual plan: £89.99</li>
            <li>30-day cancellation notice</li>
            <li>Failed payments may suspend service</li>
            <li>Annual subscriptions auto-renew</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">9. Privacy</h2>
          <p>See our Privacy Policy for full details on how we handle your information.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">10. Your Responsibilities</h2>
          <p>You must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Check your scans promptly</li>
            <li>Keep your forwarding address valid</li>
            <li>Secure your login and account access</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">11. Limitations</h2>
          <p>We cannot guarantee:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>No interruptions to service</li>
            <li>Royal Mail delivery times</li>
            <li>Uptime of external systems or networks</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">12. Termination</h2>
          <p className="font-semibold text-foreground">You may cancel at any time with 30 days' notice.</p>
          <p className="font-semibold text-foreground">We may terminate if:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You misuse the service</li>
            <li>Fraud is suspected</li>
            <li>Payments fail</li>
            <li>AML/KYC requirements are not met</li>
          </ul>
          <p className="font-semibold text-foreground">After termination:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must immediately stop using our address</li>
            <li>Mail scanning stops</li>
            <li>Scans remain available for 30 days before deletion</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">13. Restricted Industries</h2>
          <p>We do not support:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Crypto exchanges</li>
            <li>Investment schemes</li>
            <li>Adult services</li>
            <li>Gambling</li>
            <li>High-risk jurisdictions</li>
            <li>Shell or opaque corporate structures</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">14. Updates</h2>
          <p>We may update these terms from time to time. The newest version will always be available on our website.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">15. Jurisdiction</h2>
          <p>These terms are governed by the laws of England & Wales. Any disputes will be handled by the courts of England & Wales.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">16. Contact</h2>
          <p>support@virtualaddresshub.co.uk</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">17. Regulatory Information</h2>
          <p>
            VirtualAddressHub Ltd is a UK company providing virtual business address and mail-handling services. We comply with the UK GDPR, the Data Protection Act 2018, and the Money Laundering Regulations 2017 (as amended).
          </p>
          <p>
            We are registered with the Information Commissioner's Office (ICO) as a data controller and supervised by HM Revenue & Customs (HMRC) for Anti-Money Laundering (AML) as a Trust or Company Service Provider (TCSP).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">18. AML Supervision</h2>
          <p>
            We verify the identity of all customers and, where relevant, their directors and PSCs. We apply enhanced checks in higher-risk situations and maintain AML records, monitoring, and controls. Where required, we report suspicious activity to the National Crime Agency (NCA) in line with UK law.
          </p>
        </section>
      </main>
    </div>
  );
}
