/**
 * Shared navigation handler for marketing pages
 * Used by HeaderWithNav and FooterWithNav wrappers
 */

export function createNavigationHandler(router: any) {
    return (page: string) => {
        // Scroll to top before navigation
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        
        // Handle navigation based on page
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
            case 'signup':
                router.push('/signup');
                break;
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

