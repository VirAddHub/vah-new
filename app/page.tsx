import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-4xl font-semibold mb-4">Welcome to VirtualAddressHub</h1>
      <p className="opacity-80 mb-8">Secure mail scanning, forwarding & proof of address.</p>
      <div className="flex gap-3 justify-center">
        <Link className="px-4 py-2 rounded bg-white/10 hover:bg-white/20" href="/(auth)/login">Log in</Link>
        <Link className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white" href="/(auth)/signup">Create account</Link>
      </div>
    </section>
  );
}
