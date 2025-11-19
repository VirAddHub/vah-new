'use client';

import { Button } from "./ui/button";

interface KYCPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function KYCPolicyPage({ onNavigate }: KYCPolicyPageProps) {
  const go = (page: string) => onNavigate?.(page);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-primary">
            KYC Policy
          </h1>
          <p className="text-muted-foreground">
            Identity verification for VirtualAddressHub
          </p>
        </header>

        {/* Who Must Verify */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Who Must Verify
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Account holder</li>
            <li>All directors</li>
            <li>PSCs / UBOs</li>
            <li>Authorised reps</li>
          </ul>
        </section>

        {/* How Verification Works */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            How Verification Works
          </h2>
          <ol className="list-decimal pl-6 text-muted-foreground space-y-1">
            <li>Create account</li>
            <li>Verify email</li>
            <li>Upload ID</li>
            <li>Upload proof of address</li>
            <li>Provide company details</li>
            <li>Automated + manual checks</li>
            <li>Approval → service activated</li>
          </ol>
        </section>

        {/* Accepted Documents */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Accepted Documents
          </h2>
          <p className="text-muted-foreground font-medium">Identity: passport, driving licence, national ID</p>
          <p className="text-muted-foreground font-medium mt-2">Proof of address (3 months): bank statement, utility bill, council tax, tenancy/mortgage</p>
        </section>

        {/* International Clients */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            International Clients
          </h2>
          <p className="text-muted-foreground">
            Supported; high-risk jurisdictions → EDD.
          </p>
        </section>

        {/* Corporate / KYB */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Corporate / KYB
          </h2>
          <p className="text-muted-foreground">May require:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Incorporation docs</li>
            <li>Registry extracts</li>
            <li>Organisation chart</li>
            <li>UBO proof</li>
          </ul>
        </section>

        {/* Ongoing Requirements */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Ongoing Requirements
          </h2>
          <p className="text-muted-foreground">Inform us of:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>New directors</li>
            <li>Ownership changes</li>
            <li>Name/brand changes</li>
            <li>Forwarding address changes</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Contact
          </h2>
          <p className="text-muted-foreground">
            support@virtualaddresshub.co.uk
          </p>
        </section>
      </main>
    </div>
  );
}
