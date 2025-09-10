'use client';
import { useRouter } from 'next/navigation';
import PlanForm from '@/components/admin/PlanForm';

export default function NewPlan() {
    const r = useRouter();
    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4">New Plan</h1>
            <PlanForm onSaved={() => r.push('/admin/plans')} />
        </div>
    );
}
