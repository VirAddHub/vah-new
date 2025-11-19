'use client';

interface RegulatoryInformationPageProps {
  onNavigate?: (page: string) => void;
}

export function RegulatoryInformationPage({ onNavigate }: RegulatoryInformationPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-primary">
            Regulatory Information
          </h1>
        </header>

        <section className="space-y-3">
          <div className="text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">VirtualAddressHub Ltd</span>
            </p>
            <p>
              <span className="font-medium text-foreground">Address:</span> [INSERT OFFICE ADDRESS]
            </p>
            <p>
              <span className="font-medium text-foreground">Company No:</span> [INSERT]
            </p>
            <p>
              <span className="font-medium text-foreground">VAT No:</span> [INSERT]
            </p>
            <p>
              <span className="font-medium text-foreground">ICO:</span> [INSERT]
            </p>
            <p>
              <span className="font-medium text-foreground">HMRC AML Supervision:</span> [INSERT]
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Compliant With
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>UK GDPR</li>
            <li>Data Protection Act 2018</li>
            <li>AML Regulations 2017</li>
            <li>ECCTA 2023/2024</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            Mail Handling
          </h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Secure storage</li>
            <li>30-day retention</li>
            <li>Destruction after expiry</li>
            <li>HMRC/CH prioritised</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

