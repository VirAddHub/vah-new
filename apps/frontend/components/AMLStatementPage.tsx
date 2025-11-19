'use client';

interface AMLStatementPageProps {
  onNavigate?: (page: string) => void;
}

export function AMLStatementPage({ onNavigate }: AMLStatementPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-primary">
            AML & Compliance Statement
          </h1>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            VirtualAddressHub is supervised by HMRC as a Trust or Company Service Provider (TCSP).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            We:
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Verify all customers</li>
            <li>Perform ongoing monitoring</li>
            <li>Apply EDD when needed</li>
            <li>Retain AML documentation for 5 years</li>
            <li>Report suspicious activity to the NCA</li>
            <li>Never tip off customers</li>
          </ul>
        </section>

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

