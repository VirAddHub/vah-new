export default function Loading() {
  return (
    <main className="p-6 space-y-4">
      <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="h-9 w-full md:w-80 bg-gray-200 rounded animate-pulse" />
      <div className="border rounded">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 border-b animate-pulse" />
        ))}
      </div>
    </main>
  );
}
