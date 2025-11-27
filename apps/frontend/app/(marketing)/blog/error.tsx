"use client";

import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[blog/error] Blog page error:", error);

  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full max-w-5xl mx-auto px-4 py-12">
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl mb-6 text-primary">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          We couldn't load the blog just now. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </main>
      <FooterWithNav />
    </div>
  );
}

