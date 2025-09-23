const API = process.env.NEXT_PUBLIC_API_BASE ?? '';

export async function pingContact() {
    const res = await fetch(`${API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Ping',
            email: 'ping@example.com',
            subject: 'Ping',
            message: 'Ping',
            website: ''
        })
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function pingAuth() {
    const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com' })
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function pingForwarding() {
    const res = await fetch(`${API}/api/forwarding/requests`, {
        method: 'GET',
        credentials: 'include'
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
}
