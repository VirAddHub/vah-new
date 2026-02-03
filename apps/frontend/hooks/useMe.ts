import useSWR from 'swr';
import type { User } from '@/types/user';

interface UseMeResponse {
    user: User | null;
    loading: boolean;
    error: Error | null;
    mutate: () => void;
}

/**
 * Hook to fetch the current authenticated user via httpOnly cookies.
 * Replaces localStorage-based user retrieval.
 * 
 * @returns {UseMeResponse} Current user, loading state, error, and mutate function
 */
export function useMe(): UseMeResponse {
    const { data, error, isLoading, mutate } = useSWR<{ ok: boolean; data: User }>(
        '/api/bff/account',
        async (url: string) => {
            const res = await fetch(url, {
                credentials: 'include', // Send httpOnly cookies
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!res.ok) {
                // If unauthorized, return null user (not an error)
                if (res.status === 401 || res.status === 403) {
                    return { ok: false, data: null as any };
                }
                throw new Error(`Failed to fetch user: ${res.statusText}`);
            }

            return res.json();
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
        }
    );

    return {
        user: data?.data || null,
        loading: isLoading,
        error: error || null,
        mutate,
    };
}
