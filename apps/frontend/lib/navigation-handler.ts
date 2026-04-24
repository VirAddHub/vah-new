/**
 * Shared navigation handler for marketing pages
 * Used by HeaderWithNav, FooterWithNav, and /blog (BlogPage post clicks).
 */

export function createNavigationHandler(router: { push: (path: string) => void }) {
    return (page: string, data?: unknown) => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }

        switch (page) {
            case 'home':
                router.push('/');
                break;
            case 'pricing':
                router.push('/pricing');
                break;
            case 'blog':
                router.push('/blog');
                break;
            case 'blog-post': {
                const slug =
                    data &&
                    typeof data === 'object' &&
                    data !== null &&
                    'slug' in data &&
                    typeof (data as { slug: unknown }).slug === 'string'
                        ? (data as { slug: string }).slug.trim()
                        : '';
                if (slug) {
                    router.push(`/blog/${encodeURIComponent(slug)}`);
                } else {
                    router.push('/blog');
                }
                break;
            }
            case 'signup': {
                const billing =
                    data &&
                    typeof data === 'object' &&
                    data !== null &&
                    'initialBilling' in data &&
                    typeof (data as { initialBilling: unknown }).initialBilling === 'string'
                        ? (data as { initialBilling: string }).initialBilling
                        : 'monthly';
                router.push(`/signup?billing=${billing}`);
                break;
            }
            case 'login':
                router.push('/login');
                break;
            case 'help':
                router.push('/help');
                break;
            case 'contact':
                router.push('/contact');
                break;
            case 'privacy':
                router.push('/privacy');
                break;
            case 'terms':
                router.push('/terms');
                break;
            case 'about':
                router.push('/about');
                break;
            case 'kyc':
            case 'kyc-policy':
                router.push('/kyc');
                break;
            default:
                router.push(`/${page}`);
        }
    };
}

