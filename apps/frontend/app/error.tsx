'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-h3 mb-2 font-semibold text-foreground">Something went wrong</h2>
      <pre className="whitespace-pre-wrap break-words text-body-sm text-muted-foreground">{error?.message}</pre>
      <div className="mt-4">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
