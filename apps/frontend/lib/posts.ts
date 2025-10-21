// Minimal stub; replace with your real data source
export async function getAllPosts() {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
        const response = await fetch(`${apiUrl}/api/blog/posts`, {
            next: { revalidate: 3600 } // Revalidate every hour
        });

        if (!response.ok) {
            console.warn('Failed to fetch blog posts for sitemap');
            return [];
        }

        const data = await response.json();
        return data.ok ? data.data : [];
    } catch (error) {
        console.warn('Error fetching blog posts for sitemap:', error);
        return [];
    }
}

export async function getPostBySlug(slug: string) {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
        const response = await fetch(`${apiUrl}/api/blog/posts/${slug}`, {
            next: { revalidate: 3600 } // Revalidate every hour
        });

        if (!response.ok) {
            return {
                slug,
                title: 'Post title',
                excerpt: 'Short summary of the post.',
                ogImage: undefined as string | undefined,
                updatedAt: new Date().toISOString(),
            };
        }

        const data = await response.json();
        return data.ok ? data.data : {
            slug,
            title: 'Post title',
            excerpt: 'Short summary of the post.',
            ogImage: undefined as string | undefined,
            updatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.warn('Error fetching blog post:', error);
        return {
            slug,
            title: 'Post title',
            excerpt: 'Short summary of the post.',
            ogImage: undefined as string | undefined,
            updatedAt: new Date().toISOString(),
        };
    }
}
