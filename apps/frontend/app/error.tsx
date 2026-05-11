'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the full error server-side-safe in the browser console for debugging.
  // This does NOT expose the message to the rendered UI in production.
  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-h3 mb-2 font-semibold text-foreground">Something went wrong</h2>
      <p className="whitespace-pre-wrap break-words text-body-sm text-muted-foreground">
        {isDev
          ? (error?.message ?? 'An unexpected error occurred.')
          : 'Something went wrong. Please try again.'}
      </p>
      {isDev && error?.digest && (
        <p className="mt-1 text-caption text-muted-foreground font-mono">digest: {error.digest}</p>
      )}
      <div className="mt-4">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
