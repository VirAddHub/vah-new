'use client';

interface PrivacyPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground italic">Last updated: [INSERT DATE]</p>

          <p className="text-muted-foreground">
          At VirtualAddressHub, your privacy matters. We only collect the information required to provide your service securely, legally, and efficiently. This policy explains how we handle your data under the UK GDPR, the Data Protection Act 2018, and HMRC Anti-Money Laundering (AML) regulations.
          </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Who We Are</h2>
          <p className="text-muted-foreground">
            <strong>Business name:</strong> VirtualAddressHub Ltd
            <br />
            <strong>Company number:</strong> [INSERT COMPANY NUMBER]
            <br />
            <strong>ICO registration number:</strong> ZC051808
            <br />
            <strong>HMRC AML supervision number:</strong> [INSERT HMRC AML NUMBER]
            <br />
            <strong>Contact:</strong> support@virtualaddresshub.co.uk
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. What We Collect</h2>
          <p className="text-muted-foreground">We only collect the information needed to run your service:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Name</li>
            <li>Email address and phone number</li>
            <li>Billing and forwarding address</li>
            <li>
              <strong>Identity documents (collected securely by our verification partner, Sumsub; we only store the verification result and required AML data)</strong>
            </li>
            <li>Scanned mail and mail-handling information</li>
            <li>Login and security logs</li>
            <li>Payment/subscription information (via GoCardless)</li>
            <li>Support queries or messages</li>
          </ul>
          <p className="text-muted-foreground">
            Scanned mail is stored securely and never shared unless legally required or with your permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Why We Use Your Data</h2>
          <p className="text-muted-foreground">We use your information to:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Provide your virtual address and mail-handling service</li>
            <li>Verify your identity for AML compliance</li>
            <li>Notify you when mail arrives</li>
            <li>Deliver scans or forward mail when you request it</li>
            <li>Manage subscriptions, billing, and invoicing</li>
            <li>Maintain security and prevent fraud</li>
            <li>Meet legal and regulatory obligations</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Legal Basis</h2>
          <p className="text-muted-foreground">We process data under:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              <strong>Contract</strong> – to deliver your service
            </li>
            <li>
              <strong>Legal obligation</strong> – AML/KYC, record-keeping, taxation
            </li>
            <li>
              <strong>Legitimate interest</strong> – fraud prevention, platform security, service reliability
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Retention</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              <strong>Scanned mail:</strong> deleted <strong>30 days after cancellation</strong>
            </li>
            <li>
              <strong>KYC/AML verification data:</strong> stored <strong>5 years</strong> (required by law)
            </li>
            <li>
              <strong>Billing and tax records:</strong> <strong>7 years</strong>
            </li>
            <li>
              <strong>Support queries and logs:</strong> kept for an appropriate operational period
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Cookies</h2>
          <p className="text-muted-foreground">We use <strong>strictly necessary cookies only</strong>, to:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Keep you securely logged in</li>
            <li>Maintain session integrity</li>
            <li>Protect against fraud and abuse</li>
          </ul>
          <p className="text-muted-foreground">
            We <strong>do not use analytics, advertising, marketing, tracking, or profiling cookies</strong>.
          </p>
          <p className="text-muted-foreground">
            Because our cookies are essential for the service to function, a cookie banner is <strong>not required</strong> under PECR.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. Your Rights</h2>
          <p className="text-muted-foreground">You can request:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Access to your data</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion (where legally allowed)</li>
            <li>Restriction of processing</li>
            <li>Objection to processing</li>
            <li>Data portability</li>
          </ul>
          <p className="text-muted-foreground">
            You may also complain to the ICO if you believe your rights have been breached:{" "}
            <a href="https://ico.org.uk/" className="text-primary underline">
              https://ico.org.uk/
            </a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">8. Security</h2>
          <p className="text-muted-foreground">We use strong administrative, technical, and physical measures to protect your data, including:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Secure UK/EEA data storage locations</li>
            <li>Encryption</li>
            <li>Strict staff access controls</li>
            <li>Multi-factor authentication for internal systems</li>
            <li>Regular compliance checks</li>
          </ul>
          <p className="text-muted-foreground">We never store your full bank details.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">9. Payments</h2>
          <p className="text-muted-foreground">
            Payments are handled by <strong>GoCardless</strong>, a regulated UK payment provider. We only receive confirmation of payment status — never your full banking information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">10. Sharing Your Data</h2>
          <p className="text-muted-foreground">We only share your information with essential service providers who help us deliver your service:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>
              <strong>Sumsub</strong> – identity verification
            </li>
            <li>
              <strong>GoCardless</strong> – payments
            </li>
            <li>
              <strong>Postmark</strong> – email delivery
            </li>
            <li>Postal and courier providers – for forwarding mail when you request it</li>
          </ul>
          <p className="text-muted-foreground">
            We <strong>never sell</strong>, trade, or rent personal data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">11. International Transfers</h2>
          <p className="text-muted-foreground">
            We aim to store data in the UK or EEA. If personal data is transferred outside the UK/EEA, we use legally required safeguards such as <strong>Standard Contractual Clauses (SCCs)</strong> or the <strong>UK Addendum</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">12. External Services</h2>
          <p className="text-muted-foreground">
            If you interact with third-party services through our platform (e.g., identity verification, payment links), their own privacy policies apply.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">13. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this policy: <strong>support@virtualaddresshub.co.uk</strong>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">14. Updates</h2>
          <p className="text-muted-foreground">We may update this privacy policy from time to time. The latest version will always be published on our website.</p>
        </section>
      </main>
    </div>
  );
}
