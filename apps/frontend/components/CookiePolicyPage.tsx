'use client';

interface CookiePolicyPageProps {
  onNavigate?: (page: string) => void;
}

export function CookiePolicyPage({ onNavigate }: CookiePolicyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-primary">
            Cookie Policy
          </h1>
        </header>

        <section className="space-y-3">
          <p className="text-muted-foreground">
            We only use strictly necessary cookies needed for core functionality:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Login</li>
            <li>Session management</li>
            <li>CSRF and fraud protection</li>
            <li>Dashboard features</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            No analytics, tracking, or ads cookies.
          </p>
          <p className="text-muted-foreground">
            Under PECR, no cookie banner is required.
          </p>
        </section>
      </main>
    </div>
  );
}

