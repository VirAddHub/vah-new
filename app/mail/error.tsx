'use client';
export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Mail</h1>
      <div className="border rounded p-4">
        <p className="text-red-600 text-sm">Error: {error.message}</p>
      </div>
    </main>
  );
}
