'use client'
import { useWhoAmI } from '@/app/hooks/useWhoAmI'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useWhoAmI()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) router.replace('/login')
    }, [loading, user, router])

    if (loading) return <div>Loading...</div>
    if (!user) return null

    return <>{children}</>
}
