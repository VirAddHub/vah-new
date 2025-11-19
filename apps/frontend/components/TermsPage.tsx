'use client';

import { Button } from "./ui/button";

interface TermsPageProps {
  onNavigate?: (page: string) => void;
}

export function TermsPage({ onNavigate }: TermsPageProps) {
  const go = (page: string) => onNavigate?.(page);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-primary">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Clear, fair terms for using VirtualAddressHub
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            Welcome to VirtualAddressHub. By signing up you agree to the terms below. They explain what we provide, how our service works, and our mutual responsibilities.
          </p>
        </section>

        {/* 1. What We Provide */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            1. What We Provide
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Professional London business address</li>
            <li>Registered office & director service address</li>
            <li>Mail reception & scanning</li>
            <li>Optional forwarding</li>
          </ul>
          <p className="text-muted-foreground">
            Service begins after payment + identity verification.
          </p>
        </section>

        {/* 2. Permitted Use */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            2. Permitted Use
          </h2>
          <p className="text-muted-foreground font-medium">Allowed:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Registered office</li>
            <li>Director service address</li>
            <li>Business correspondence</li>
            <li>Websites, branding, invoicing</li>
          </ul>
          <p className="text-muted-foreground font-medium mt-3">Not allowed:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Illegal activity</li>
            <li>High-risk financial services</li>
            <li>Unregulated investments</li>
            <li>Parcels</li>
            <li>Residential use</li>
            <li>Fraud or misleading activity</li>
          </ul>
        </section>

        {/* 3. Legal Compliance */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            3. Legal Compliance
          </h2>
          <p className="text-muted-foreground">You must:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Complete KYC</li>
            <li>Provide accurate info</li>
            <li>Keep details up to date</li>
            <li>Use the service lawfully</li>
          </ul>
        </section>

        {/* Companies House Verification Clause */}
        <section className="space-y-2 bg-muted/50 p-4 rounded-lg border border-primary/20">
          <h2 className="text-xl font-semibold">
            Companies House Identity Verification (ECCTA 2023)
          </h2>
          <p className="text-muted-foreground">
            All directors and PSCs must verify their identity with Companies House before using our address. Use of our Registered Office or Director Service Address is not permitted until CH verification is completed. Failure to verify may result in immediate suspension or termination.
          </p>
        </section>

        {/* 4. Service Activation */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            4. Service Activation
          </h2>
          <p className="text-muted-foreground">Requires:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Direct Debit</li>
            <li>First payment</li>
            <li>Completed KYC</li>
            <li>Compliance approval</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            If KYC fails after 30 days → refund + cancellation.
          </p>
        </section>

        {/* 5. Mail Handling */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            5. Mail Handling
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Envelope scanned</li>
            <li>Contents scanned (unless restricted)</li>
            <li>Scans uploaded to dashboard</li>
            <li>HMRC/CH prioritised</li>
          </ul>
        </section>

        {/* 6. Forwarding */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            6. Forwarding
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>HMRC/CH: free</li>
            <li>Other UK letters: £2 flat</li>
            <li>International: quoted</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Charges added to monthly invoice.
          </p>
        </section>

        {/* 7. Parcels */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            7. Parcels
          </h2>
          <p className="text-muted-foreground">
            Not accepted.
          </p>
          <p className="text-muted-foreground">
            May be returned or securely disposed.
          </p>
        </section>

        {/* 8. Billing */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            8. Billing
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Monthly £9.99</li>
            <li>Annual £89.99</li>
            <li>30-day cancellation notice</li>
            <li>Failed payments may suspend service</li>
            <li>Annual auto-renews</li>
          </ul>
        </section>

        {/* 9. Privacy */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            9. Privacy
          </h2>
          <p className="text-muted-foreground">
            See Privacy Policy.
          </p>
        </section>

        {/* 10. Responsibilities */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            10. Responsibilities
          </h2>
          <p className="text-muted-foreground">You must:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Check scans</li>
            <li>Keep forwarding address valid</li>
            <li>Secure your login</li>
          </ul>
        </section>

        {/* 11. Limitations */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            11. Limitations
          </h2>
          <p className="text-muted-foreground">We cannot guarantee:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>No service interruptions</li>
            <li>Royal Mail delivery times</li>
            <li>External systems uptime</li>
          </ul>
        </section>

        {/* 12. Termination */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            12. Termination
          </h2>
          <p className="text-muted-foreground">
            You may cancel anytime (30 days' notice).
          </p>
          <p className="text-muted-foreground mt-2">We may terminate for:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Misuse</li>
            <li>Fraud</li>
            <li>Non-payment</li>
            <li>AML/KYC failure</li>
          </ul>
          <p className="text-muted-foreground mt-2 font-medium">After termination:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Address use must stop</li>
            <li>Mail scanning stops</li>
            <li>Scans deleted after 30 days</li>
          </ul>
        </section>

        {/* 13. Restricted Industries */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            13. Restricted Industries
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Crypto exchanges</li>
            <li>Investment schemes</li>
            <li>Adult services</li>
            <li>Gambling</li>
            <li>High-risk jurisdictions</li>
            <li>Shell companies</li>
          </ul>
        </section>

        {/* 14. Updates */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            14. Updates
          </h2>
          <p className="text-muted-foreground">
            Terms may change.
          </p>
        </section>

        {/* 15. Jurisdiction */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            15. Jurisdiction
          </h2>
          <p className="text-muted-foreground">
            England & Wales; courts of England apply.
          </p>
        </section>

        {/* 16. Contact */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            16. Contact
          </h2>
          <p className="text-muted-foreground">
            support@virtualaddresshub.co.uk
          </p>
        </section>
      </main>
    </div>
  );
}
