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
          By signing up, you agree to the terms below. They explain what we provide, how our service works, and our mutual responsibilities.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">1. What We Provide</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Professional London business address</li>
            <li>Registered Office & Director Service Address</li>
            <li>Mail reception and scanning</li>
            <li>Optional mail forwarding</li>
          </ul>
          <p>Service begins after payment and identity verification.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">2. Permitted Use</h2>
          <h3 className="font-semibold text-foreground">Allowed:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Registered Office</li>
            <li>Director Service Address</li>
            <li>Business correspondence</li>
            <li>Websites, branding, invoicing</li>
          </ul>
          <h3 className="font-semibold text-foreground">Not allowed:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Illegal activity</li>
            <li>High-risk financial services</li>
            <li>Unregulated investments</li>
            <li>Parcels</li>
            <li>Residential use</li>
            <li>Fraud or misleading activity</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">3. Legal Compliance</h2>
          <p>You must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Complete identity verification (KYC)</li>
            <li>Provide accurate information</li>
            <li>Keep details up to date</li>
            <li>Use the service lawfully</li>
          </ul>
          <h3 className="font-semibold text-foreground">Companies House Identity Verification (ECCTA 2023)</h3>
          <p>
            All directors and PSCs must verify their identity with Companies House before using our address. Use of our Registered Office or Director Service Address is <strong>not permitted</strong> until CH verification is completed. Failure to verify may result in suspension or termination.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">4. Service Activation</h2>
          <p>Activation requires:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Direct Debit setup</li>
            <li>First payment</li>
            <li>Completed KYC</li>
            <li>Compliance approval</li>
          </ul>
          <p>If KYC fails after 30 days, we will cancel and refund.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">5. Mail Handling</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Envelopes scanned</li>
            <li>Contents scanned (unless restricted)</li>
            <li>Scans uploaded to your dashboard</li>
            <li>HMRC and Companies House mail prioritised</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">6. Forwarding</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>HMRC/CH letters: free</li>
            <li>Other UK letters: £2</li>
            <li>International mail: quoted on request</li>
          </ul>
          <p>Forwarding fees are added to your monthly invoice.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">7. Parcels</h2>
          <p>Parcels are <strong>not accepted</strong>. Unaccepted items may be returned or securely disposed of.</p>
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
          <p>See our Privacy Policy.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">10. Your Responsibilities</h2>
          <p>You must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Check your scans promptly</li>
            <li>Keep your forwarding address valid</li>
            <li>Keep your login details secure</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">11. Limitations</h2>
          <p>We cannot guarantee:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>No service interruptions</li>
            <li>Royal Mail delivery times</li>
            <li>Uptime of external systems</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">12. Termination</h2>
          <p className="font-semibold text-foreground">You may cancel anytime with 30 days’ notice.</p>
          <p className="font-semibold text-foreground">We may terminate if:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You misuse the service</li>
            <li>Fraud is suspected</li>
            <li>Payments fail</li>
            <li>AML/KYC requirements are not met</li>
          </ul>
          <p>After termination:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must stop using our address</li>
            <li>Mail scanning stops</li>
            <li>Scans are deleted after 30 days</li>
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
            <li>Shell companies</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">14. Updates</h2>
          <p>We may update these terms. The latest version will always be published on our website.</p>
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
          <p>VirtualAddressHub Ltd is a UK company providing virtual business address and mail-handling services. We comply with the UK GDPR, the Data Protection Act 2018, and the Money Laundering Regulations 2017 (as amended).</p>
          <p>We are registered with the Information Commissioner’s Office (ICO) as a data controller and supervised by HM Revenue & Customs (HMRC) for Anti-Money Laundering (AML) as a Trust or Company Service Provider (TCSP).</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">18. AML Supervision</h2>
          <p>
            As part of our AML obligations, we verify the identity of all customers and, where relevant, their directors and persons with significant control (PSCs). We apply enhanced checks in higher-risk situations and maintain full AML policies, records, and monitoring procedures. Where required, we report suspicious activity to the National Crime Agency (NCA) in line with UK law.
          </p>
        </section>
      </main>
    </div>
  );
}
