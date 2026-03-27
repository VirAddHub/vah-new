/**
 * lib/logout.ts
 *
 * Shared logout utility — single implementation used by:
 *  - DashboardNavigation
 *  - DashboardSidebar
 *
 * Centralising here means any change to the logout flow (new cookies,
 * new storage keys, new toast copy, etc.) only needs to happen once.
 */

import { clearToken } from '@/lib/token-manager';
import { toast } from '@/hooks/use-toast';

const COOKIE_EXPIRY = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure';
const COOKIES_TO_CLEAR = [
    'vah_session',
    'vah_csrf_token',
    'vah_role',
    'vah_user',
    'vah_jwt',
];
const LOCALSTORAGE_KEYS = ['vah_jwt', 'vah_user'];

/** Guard to prevent concurrent logout calls */
let _isLoggingOut = false;

/**
 * performLogout
 *
 * Calls the BFF logout endpoint, clears all client-side tokens and cookies,
 * then redirects to the homepage after a short delay so the toast is visible.
 *
 * @param onBeforeRedirect  Optional side-effect to run before the redirect
 *                          (e.g. closing a mobile drawer).
 */
export async function performLogout(onBeforeRedirect?: () => void): Promise<void> {
    if (_isLoggingOut) return;
    _isLoggingOut = true;

    if (onBeforeRedirect) {
        onBeforeRedirect();
    }

    try {
        await fetch('/api/bff/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[logout] API call failed:', error);
    } finally {
        // Clear localStorage
        LOCALSTORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

        // Clear token from token-manager
        clearToken();

        // Expire all auth cookies client-side
        COOKIES_TO_CLEAR.forEach((name) => {
            document.cookie = `${name}=; ${COOKIE_EXPIRY}`;
        });

        window.stop();

        // Show toast — redirect always runs even if this throws
        try {
            toast({ title: "You've been signed out", duration: 2000 });
        } catch (_) {
            // Ignore — redirect below is the critical path
        }

        setTimeout(() => {
            _isLoggingOut = false;
            window.location.href = '/';
        }, 300);
    }
}
