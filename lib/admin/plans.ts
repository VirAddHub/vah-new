export type { Plan } from "@/types/plan";

export async function adminFetch(path: string, init?: RequestInit) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
