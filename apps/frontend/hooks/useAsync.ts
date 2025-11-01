/**
 * useAsync hook - eliminates repetitive loading state patterns
 * 
 * Usage:
 * const { run: submitForm, loading, error } = useAsync(async (data) => {
 *   const res = await api.post("/endpoint", data);
 *   if (!res.ok) throw new Error(res.message);
 *   return res.data;
 * });
 * 
 * Then call: submitForm(formData);
 */

import { useCallback, useState } from "react";

export function useAsync<TArgs extends any[], TRes>(
    fn: (...args: TArgs) => Promise<TRes>
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const run = useCallback(
        async (...args: TArgs) => {
            setLoading(true);
            setError(null);
            try {
                return await fn(...args);
            } catch (e: any) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [fn]
    );

    return { run, loading, error, resetError: () => setError(null) };
}

