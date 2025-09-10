'use client';
import { useState } from 'react';
import type { Plan } from '@/types/plan';
import { adminFetch } from '@/lib/admin/plans';

export default function PlanForm({ initial, onSaved }: { initial?: Partial<Plan>, onSaved: () => void }) {
    const [form, setForm] = useState<Partial<Plan>>({
        name: '', slug: '', description: '',
        price_pence: 999, interval: 'month', currency: 'GBP',
        features: [], sort: 0, ...initial
    });
    const [feat, setFeat] = useState('');
    const up = <K extends keyof Plan>(k: K, v: any) => setForm(f => ({ ...f, [k]: v }));
    const addFeature = () => { if (!feat) return; up('features', [...(form.features || []), feat]); setFeat(''); };
    const removeFeature = (i: number) => up('features', (form.features || []).filter((_, idx) => idx !== i));

    async function save() {
        const body = JSON.stringify({ ...form, features: form.features || [] });
        if (form.id) await adminFetch(`/api/admin/plans/${form.id}`, { method: 'PATCH', body });
        else await adminFetch(`/api/admin/plans`, { method: 'POST', body });
        onSaved();
    }

    return (
        <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                <input className="input" placeholder="Name" value={form.name || ''} onChange={e => up('name', e.target.value)} />
                <input className="input" placeholder="Slug" value={form.slug || ''} onChange={e => up('slug', e.target.value)} />
                <input className="input" placeholder="Price (pence)" type="number" value={form.price_pence || 0} onChange={e => up('price_pence', +e.target.value)} />
                <select className="input" value={form.interval || 'month'} onChange={e => up('interval', e.target.value as any)}>
                    <option value="month">month</option><option value="year">year</option>
                </select>
                <input className="input" placeholder="Sort" type="number" value={form.sort ?? 0} onChange={e => up('sort', +e.target.value)} />
            </div>
            <textarea className="input" placeholder="Description" value={form.description || ''} onChange={e => up('description', e.target.value)} />
            <div>
                <div className="flex gap-2">
                    <input className="input flex-1" placeholder="Add feature…" value={feat} onChange={e => setFeat(e.target.value)} />
                    <button className="btn" type="button" onClick={addFeature}>Add</button>
                </div>
                <ul className="mt-2 text-sm list-disc pl-5 opacity-80">
                    {(form.features || []).map((f, i) => (
                        <li key={i} className="flex items-center justify-between">
                            <span>{f}</span>
                            <button className="text-xs opacity-70 hover:opacity-100 underline" type="button" onClick={() => removeFeature(i)}>remove</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex gap-2">
                <button className="btn-primary" type="button" onClick={save}>Save</button>
            </div>
            <style jsx>{`
        .input{border:1px solid #2a2a2a;background:#0f1115;border-radius:8px;padding:10px}
        .btn{border:1px solid #2a2a2a;border-radius:8px;padding:10px 14px}
        .btn-primary{background:#16a34a;border-radius:8px;padding:10px 14px}
      `}</style>
        </div>
    );
}
