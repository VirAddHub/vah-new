// scripts/seed_users_only.ts
// Run with: npx tsx scripts/seed_users_only.ts
const API_BASE = process.env.API_BASE ?? "https://vah-api-staging.onrender.com";
const ORIGIN = process.env.ORIGIN ?? "https://vah-frontend-final.vercel.app";
const COUNT = Number(process.env.COUNT ?? 50);

type Resp =
    | { user?: { id: number | string } }
    | { ok: true; data?: { user?: { id: number | string }, id?: number | string } }
    | { ok: false; error: string }
    | Record<string, unknown>;

async function createUser(i: number) {
    const email = `seeduser${String(i).padStart(2, "0")}@example.com`;
    const body = {
        email,
        password: "Password123!",
        first_name: `Seed${i}`,
        last_name: `User${i}`,
        is_admin: false,
    };

    const r = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        body: JSON.stringify(body),
    });

    const txt = await r.text();
    let json: Resp = {};
    try { json = JSON.parse(txt); } catch { }

    if (r.ok) {
        const id =
            (json as any)?.user?.id ??
            (json as any)?.data?.user?.id ??
            (json as any)?.data?.id ??
            (json as any)?.id;
        console.log(`✔ created ${email} (id=${id ?? "unknown"})`);
    } else {
        if (r.status === 409 || (txt.toLowerCase().includes("exists"))) {
            console.log(`• already exists: ${email}`);
        } else {
            console.warn(`✖ failed ${email}: [${r.status}] ${txt}`);
        }
    }
}

(async () => {
    console.log(`🌱 Creating ${COUNT} test users...`);
    console.log(`API: ${API_BASE}`);
    console.log(`Origin: ${ORIGIN}`);
    console.log('---');

    for (let i = 1; i <= COUNT; i++) {
        await createUser(i);
        // tiny delay to be polite to the API
        await new Promise(res => setTimeout(res, 100));
    }

    console.log('---');
    console.log('✅ Done! Users created successfully.');
})();
