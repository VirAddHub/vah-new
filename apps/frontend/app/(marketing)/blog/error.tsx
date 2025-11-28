"use client";

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Enhanced error logging to help diagnose the issue
  console.error("[blog/error] Blog page error:", {
    message: error.message,
    stack: error.stack,
    digest: error.digest,
    name: error.name,
    fullError: error,
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4 text-primary">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        We couldn&apos;t load the blog just now. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 max-w-2xl w-full">
          <summary className="cursor-pointer text-xs text-muted-foreground mb-2">
            Error details (dev only)
          </summary>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </main>
  );
}

