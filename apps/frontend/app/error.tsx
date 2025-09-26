'use client';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body className="p-6">
        <h2 className="text-xl mb-2">Something went wrong</h2>
        <pre className="text-sm opacity-80">{error?.message}</pre>
        <div className="mt-4">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
