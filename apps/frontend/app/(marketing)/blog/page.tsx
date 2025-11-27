"use client";

export default function BlogPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Blog debug page</h1>
        <p className="text-sm text-neutral-600">
          If you can see this without an error, the problem is in the real blog
          UI (header/footer/posts), not the route or backend.
        </p>
      </div>
    </main>
  );
}
