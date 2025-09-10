'use client';
import { useEffect, useState } from 'react';
import type { Plan } from '@/types/plan';
import { adminFetch } from '@/lib/admin/plans';
import PlanForm from '@/components/admin/PlanForm';

export default function EditPlan({ params }: { params: { id: string } }) {
    const [plan, setPlan] = useState<Plan | null>(null);
    useEffect(() => { (async () => { const r = await adminFetch(`/api/admin/plans/${params.id}`); setPlan(r.data); })(); }, [params.id]);
    if (!plan) return <div className="p-6">Loading…</div>;
    async function publish(active: boolean) {
        await adminFetch(`/api/admin/plans/${plan.id}/publish`, { method: 'POST', body: JSON.stringify({ active }) });
        location.reload();
    }
    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4">Edit Plan</h1>
            <div className="mb-4 flex gap-2">
                <button className="btn" onClick={() => publish(true)}>Publish</button>
                <button className="btn" onClick={() => publish(false)}>Unpublish</button>
            </div>
            <PlanForm initial={plan} onSaved={() => location.reload()} />
            <style jsx>{`.btn{border:1px solid #2a2a2a;border-radius:8px;padding:8px 12px}`}</style>
        </div>
    );
}
