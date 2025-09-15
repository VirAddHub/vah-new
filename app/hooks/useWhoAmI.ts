'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json() : Promise.reject(r))

export function useWhoAmI() {
    const { data, error, isLoading, mutate } = useSWR('/api/bff/auth/whoami', fetcher, { shouldRetryOnError: false })
    return { user: data?.user ?? null, loading: isLoading, error, refresh: mutate }
}
