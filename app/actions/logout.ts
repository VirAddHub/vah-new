'use server'

export async function logout() {
    try {
        const csrf = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bff/auth/csrf`, {
            credentials: 'include'
        })
        const { token } = await csrf.json()

        await fetch('/api/bff/auth/logout', {
            method: 'POST',
            headers: { 'x-csrf-token': token },
            credentials: 'include'
        })
    } catch (error) {
        console.error('Logout failed:', error)
    }
}
