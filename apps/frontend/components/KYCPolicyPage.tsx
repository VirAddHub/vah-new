'use client';

interface KYCPolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function KYCPolicyPage({ onNavigate }: KYCPolicyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6 text-muted-foreground">
        <h1 className="text-3xl font-bold tracking-tight text-primary">KYC Verification Policy</h1>
        <p className="text-sm italic">Last updated: [INSERT DATE]</p>
        <p>
          VirtualAddressHub is required by UK law to verify the identity of customers before providing any address, mail-handling, or Registered Office services. This policy explains who must verify, how the process works, and what documents are accepted.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">1. Who Must Verify</h2>
          <p>The following individuals must complete identity verification:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The account holder</li>
            <li>All company directors</li>
            <li>Persons with Significant Control (PSCs) / Ultimate Beneficial Owners (UBOs)</li>
            <li>Authorised representatives acting on behalf of a business</li>
          </ul>
          <p>Verification is mandatory before we activate any Registered Office, Director Service Address, or mail-handling service.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">2. How Verification Works</h2>
          <p>The verification process includes:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Create an account</li>
            <li>Verify your email</li>
            <li>Upload identity documents</li>
            <li>Upload proof of address</li>
            <li>Provide company information (if applicable)</li>
            <li>Automated and manual compliance checks</li>
            <li>Once approved, your service is activated</li>
          </ol>
          <p>If verification fails, service cannot be provided.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">3. Accepted Documents</h2>
          <h3 className="font-semibold text-foreground">Identity (must be valid and in-date):</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Passport</li>
            <li>Driving licence</li>
            <li>National identity card</li>
          </ul>
          <h3 className="font-semibold text-foreground">Proof of Address (issued within the last 3 months):</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Bank statement</li>
            <li>Utility bill</li>
            <li>Council tax statement</li>
            <li>Tenancy or mortgage statement</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">4. International Clients</h2>
          <p>
            International clients are supported. Applications from higher-risk jurisdictions may require Enhanced Due Diligence (EDD) in accordance with UK AML regulations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">5. Corporate Clients / KYB</h2>
          <p>For companies, partnerships, or organisations, we may require:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Certificate of incorporation</li>
            <li>Official registry extract</li>
            <li>Organisation chart showing directors and UBOs</li>
            <li>Proof of UBO identity and addresses</li>
            <li>Information on the nature and purpose of the business</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">6. Ongoing Requirements</h2>
          <p>Customers must inform us of:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>New directors</li>
            <li>Any change in ownership or control</li>
            <li>Name or trading name changes</li>
            <li>Forwarding address changes</li>
          </ul>
          <p>Failure to update this information may result in suspension of service.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">7. AML Compliance</h2>
          <p>
            We comply with the Money Laundering Regulations 2017 (as amended). We maintain full AML records, risk assessments, and internal controls. Where required, we may submit Suspicious Activity Reports (SARs) to the National Crime Agency (NCA). We cannot provide service where AML obligations cannot be satisfied.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
          <p>
            For verification questions or support: <strong>support@virtualaddresshub.co.uk</strong>
          </p>
        </section>
      </main>
    </div>
  );
}
