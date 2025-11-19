'use client';

import { Button } from "./ui/button";

interface PrivacyPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function PrivacyPolicyPage({
  onNavigate,
}: PrivacyPolicyPageProps) {
  const go = (page: string) => onNavigate?.(page);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-primary">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Your privacy matters to us
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            At VirtualAddressHub, your privacy matters. We only collect the information required to deliver your service securely, legally, and efficiently. This policy explains how we handle your data in accordance with the UK GDPR, the Data Protection Act 2018, and HMRC AML regulations.
          </p>
        </section>

        {/* 1. Who We Are */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            1. Who We Are
          </h2>
          <div className="text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">
                Business name:
              </span>{" "}
              VirtualAddressHub Ltd
            </p>
            <p>
              <span className="font-medium text-foreground">
                Company number:
              </span>{" "}
              [INSERT COMPANY NUMBER]
            </p>
            <p>
              <span className="font-medium text-foreground">
                ICO registration number:
              </span>{" "}
              [INSERT ICO NUMBER]
            </p>
            <p>
              <span className="font-medium text-foreground">
                HMRC AML supervision number:
              </span>{" "}
              [INSERT HMRC AML NUMBER]
            </p>
            <p>
              <span className="font-medium text-foreground">
                Contact:
              </span>{" "}
              support@virtualaddresshub.co.uk
            </p>
          </div>
        </section>

        {/* 2. What We Collect */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            2. What We Collect
          </h2>
          <p className="text-muted-foreground">
            We may collect the following depending on your usage:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Name</li>
            <li>Email and phone</li>
            <li>Billing and forwarding address</li>
            <li>Scanned mail data</li>
            <li>Identity documents</li>
            <li>Login and security logs</li>
            <li>Payment/subscription data (from GoCardless)</li>
            <li>Essential cookie information</li>
            <li>Support interactions</li>
            <li>Operational logs</li>
          </ul>
          <p className="text-muted-foreground">
            Scanned mail is stored securely on Microsoft OneDrive for Business.
          </p>
        </section>

        {/* 3. Why We Use Your Data */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            3. Why We Use Your Data
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>To provide your virtual address service</li>
            <li>To verify identity under AML rules</li>
            <li>To notify you when mail arrives</li>
            <li>To deliver scans to your dashboard</li>
            <li>To forward mail when requested</li>
            <li>To provide billing and invoicing</li>
            <li>To prevent fraud and maintain security</li>
            <li>To meet legal obligations</li>
          </ul>
        </section>

        {/* 4. Legal Grounds */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            4. Legal Grounds
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Contract (Art 6(1)(b))</li>
            <li>Legal obligation (AML/KYC, taxation)</li>
            <li>Legitimate interest (fraud prevention, platform security)</li>
          </ul>
        </section>

        {/* 5. Retention */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            5. Retention
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Scanned mail: deleted 30 days after cancellation</li>
            <li>KYC/AML docs: stored 5 years (mandatory)</li>
            <li>Billing records: 7 years</li>
            <li>Support logs: reasonable period</li>
          </ul>
        </section>

        {/* 6. Cookie Policy */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            6. Cookie Policy
          </h2>
          <p className="text-muted-foreground">
            We only use strictly necessary cookies for login, security, and session management.
          </p>
          <p className="text-muted-foreground">
            No analytics, tracking, or marketing cookies.
          </p>
          <p className="text-muted-foreground">
            No cookie banner required under PECR.
          </p>
        </section>

        {/* 7. Your Rights */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            7. Your Rights
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Access</li>
            <li>Rectification</li>
            <li>Deletion (where legally allowed)</li>
            <li>Restriction</li>
            <li>Objection</li>
            <li>Portability</li>
            <li>ICO complaint</li>
          </ul>
        </section>

        {/* 8. Security */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            8. Security
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>UK/EEA hosting</li>
            <li>Encryption</li>
            <li>MFA for staff</li>
            <li>Access control</li>
            <li>Secure file delivery</li>
            <li>Regular compliance audits</li>
          </ul>
        </section>

        {/* 9. Payments */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            9. Payments
          </h2>
          <p className="text-muted-foreground">
            Handled by GoCardless.
          </p>
          <p className="text-muted-foreground">
            We never store your full bank details.
          </p>
        </section>

        {/* 10. Sharing */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            10. Sharing
          </h2>
          <p className="text-muted-foreground">
            We share data only with regulated partners:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Sumsub (identity verification)</li>
            <li>GoCardless (billing)</li>
            <li>Postmark</li>
            <li>OneDrive</li>
            <li>Cloud hosting</li>
            <li>Postal carriers</li>
          </ul>
          <p className="text-muted-foreground">
            We never sell personal data.
          </p>
        </section>

        {/* 11. International Transfers */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            11. International Transfers
          </h2>
          <p className="text-muted-foreground">
            UK/EEA by default; SCCs/UK Addendum when required.
          </p>
        </section>

        {/* 12. External Services */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            12. External Services
          </h2>
          <p className="text-muted-foreground">
            Third parties have their own privacy policies.
          </p>
        </section>

        {/* 13. Contact */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            13. Contact
          </h2>
          <p className="text-muted-foreground">
            support@virtualaddresshub.co.uk
          </p>
        </section>

        {/* 14. Updates */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            14. Updates
          </h2>
          <p className="text-muted-foreground">
            We may update this policy at any time.
          </p>
        </section>
      </main>
    </div>
  );
}
