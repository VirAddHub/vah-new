import { BlogPostPage } from '@/components/BlogPostPage';
import { Metadata } from 'next';
import { getPostBySlug } from '@/lib/posts';

interface BlogPostProps {
    params: {
        slug: string;
    };
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
    const post = await getPostBySlug(params.slug)
    const base = 'https://virtualaddresshub.co.uk'
    const title = `${post.title} | VirtualAddressHub`
    const description =
        post.excerpt ||
        'Your official London business address with same-day mail scanning and full compliance.'

    // Make OG image absolute (social scrapers need full URL)
    const og = post.ogImage?.startsWith('http')
        ? post.ogImage
        : `${base}${post.ogImage || '/images/og-image.jpg'}`

    return {
        title,
        description,
        alternates: { canonical: `${base}/blog/${post.slug}` },
        openGraph: {
            type: 'article',
            url: `${base}/blog/${post.slug}`,
            title: post.title,
            description,
            images: [
                {
                    url: og,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description,
            images: [og],
        },
    }
}

// Helper function to get post data (you can replace this with your actual data source)
function getPostData(slug: string) {
    const posts: Record<string, any> = {
        'what-is-a-registered-office-address': {
            title: 'What is a Registered Office Address and Why Your UK Company Needs One',
            excerpt: 'Every UK company must have a registered office address. Learn what it is, why it\'s required, and how to choose the right one for your business.',
            category: 'Company Formation',
            publishedTime: '2024-01-15T00:00:00Z'
        },
        'uk-company-formation-complete-guide': {
            title: 'UK Company Formation: A Complete Guide for 2024',
            excerpt: 'Step-by-step guide to forming a UK company, including required documents, costs, and timeline. Everything you need to know to get started.',
            category: 'Business Setup',
            publishedTime: '2024-01-10T00:00:00Z'
        },
        'virtual-address-vs-postal-address': {
            title: 'Virtual Address vs Postal Address: What\'s the Difference?',
            excerpt: 'Understanding the key differences between virtual addresses and traditional postal addresses for your business needs.',
            category: 'Virtual Addresses',
            publishedTime: '2024-01-05T00:00:00Z'
        }
    };

    return posts[slug] || {
        title: 'Blog Post',
        excerpt: 'Read our latest insights on virtual business addresses and UK compliance.',
        category: 'Business',
        publishedTime: new Date().toISOString()
    };
}

export default function BlogPost({ params }: BlogPostProps) {
    const handleNavigate = (page: string, data?: any) => {
        // Handle navigation - you can enhance this with Next.js router later
        if (page === 'home') {
            window.location.href = '/';
        } else if (page === 'blog-post' && data?.slug) {
            window.location.href = `/blog/${data.slug}`;
        } else {
            window.location.href = `/${page}`;
        }
    };

    const handleBack = () => {
        window.location.href = '/blog';
    };

    return (
        <div>
            <BlogPostPage
                slug={params.slug}
                onNavigate={handleNavigate}
                onBack={handleBack}
            />

            {/* Related Posts Section */}
            <section className="mt-12 border-t pt-6 max-w-4xl mx-auto px-4">
                <h2 className="font-semibold mb-3 text-foreground">You might also like</h2>
                <ul className="space-y-2">
                    {/* This will be populated by the BlogPostPage component */}
                    <li>
                        <a href="/blog" className="hover:underline text-primary">
                            View all blog posts
                        </a>
                    </li>
                </ul>
            </section>

            {/* Article + Breadcrumb JSON-LD Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        "datePublished": new Date().toISOString(),
                        "dateModified": new Date().toISOString(),
                        "author": { "@type": "Organization", "name": "VirtualAddressHub" },
                        "publisher": { "@type": "Organization", "name": "VirtualAddressHub" },
                        "image": [`https://virtualaddresshub.co.uk/images/og-image.jpg`],
                        "mainEntityOfPage": `https://virtualaddresshub.co.uk/blog/${params.slug}`
                    })
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            { "@type": "ListItem", "position": 1, "name": "Blog", "item": "https://virtualaddresshub.co.uk/blog" },
                            { "@type": "ListItem", "position": 2, "name": params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), "item": `https://virtualaddresshub.co.uk/blog/${params.slug}` }
                        ]
                    })
                }}
            />
        </div>
    );
}
