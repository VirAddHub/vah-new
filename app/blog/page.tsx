import Link from 'next/link';

export const metadata = {
  title: 'Blog | VirtualAddressHub',
  description: 'Weekly posts on UK company compliance and virtual addresses.',
};

const posts = [
  // We'll add your first post below; add a new entry each week.
  { slug: 'registered-office-address', title: 'What Is a Registered Office Address (and Why You Need One)?', date: '2025-09-09' },
];

export default function BlogIndex() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Blog</h1>
      <ul className="space-y-4">
        {posts.map(p => (
          <li key={p.slug} className="border-b pb-4">
            <h2 className="text-xl font-medium">
              <Link className="underline" href={`/blog/${p.slug}`}>{p.title}</Link>
            </h2>
            <p className="text-gray-500 text-sm">{p.date}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
