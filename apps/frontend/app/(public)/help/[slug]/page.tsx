import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { helpArticles, helpCategories } from '@/lib/help-content';
import { SITE_URL } from '@/lib/site';
import m from '@/components/marketing/Marketing.module.css';
import s from '@/components/marketing/HelpCentre.module.css';
export const dynamicParams = false;
export function generateStaticParams() {
  return helpArticles.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = helpArticles.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.title} | VirtualAddressHub Help`,
    description: a.summary,
    alternates: { canonical: `/help/${slug}` },
    openGraph: { title: a.title, description: a.summary, url: `/help/${slug}`, type: 'article' },
  };
}
export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = helpArticles.find((x) => x.slug === slug);
  if (!a) notFound();
  const category = helpCategories.find((c) => c.id === a.category)!;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Help Centre', item: `${SITE_URL}/help` },
      { '@type': 'ListItem', position: 3, name: a.title, item: `${SITE_URL}/help/${a.slug}` },
    ],
  };
  return (
    <article className={`${m.site} ${s.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }}
      />
      <header className={s.articleHero}>
        <div className={m.wrap}>
          <nav aria-label="Breadcrumb" className={s.breadcrumb}>
            <Link href="/">Home</Link> / <Link href="/help">Help Centre</Link> /{' '}
            <Link href={`/help#${a.category}`}>{category.title}</Link>
          </nav>
          <p className={m.kicker}>{category.title}</p>
          <h1>{a.title}</h1>
          <p className={m.lead}>{a.summary}</p>
        </div>
      </header>
      <div className={`${m.wrap} ${s.articleLayout}`}>
        <div className={s.body}>
          {a.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {a.steps.length > 0 && (
            <>
              <h2>What to do</h2>
              <ol>
                {a.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          )}
          <Link href={`/help#${a.category}`} className={`${m.textlink} ${s.articleBack}`}>
            ← Back to {category.title.toLowerCase()}
          </Link>
        </div>
        <aside className={s.related} aria-label="Useful links">
          <h2>Useful next steps</h2>
          {a.links.map((l) => (
            <Link href={l.href} key={l.href}>
              {l.label} →
            </Link>
          ))}
          <Link href="/help">Browse all help →</Link>
        </aside>
      </div>
    </article>
  );
}
