// apps/frontend/app/plans/page.tsx
import { API_BASE } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
    const res = await fetch(`${API_BASE}/api/plans`, { cache: "no-store" });
    const data = await res.json().catch(() => ({ ok: false, data: [] }));
    const plans = data?.data ?? [];

    return (
        <main className="p-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.length === 0 ? (
                <p>No plans.</p>
            ) : plans.map((p: any) => (
                <div key={p.id} className="rounded-2xl shadow p-5">
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <p className="text-2xl mt-2">{p.priceFormatted ?? p.price ?? ""}</p>
                    <ul className="mt-3 list-disc pl-5 text-sm">
                        {(p.features ?? []).map((f: string) => <li key={f}>{f}</li>)}
                    </ul>
                </div>
            ))}
        </main>
    );
}
