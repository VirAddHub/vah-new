'use client';

import { useEffect, useState } from 'react';
import { getWhoAmI, getPlans } from '@/lib/api';
import { ApiError } from '@/lib/apiFetch';

export default function DevApiCheckPage() {
    const [whoamiData, setWhoamiData] = useState<any>(null);
    const [plansData, setPlansData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                // Fetch both endpoints
                const [whoami, plans] = await Promise.allSettled([
                    getWhoAmI(),
                    getPlans(),
                ]);

                if (whoami.status === 'fulfilled') {
                    setWhoamiData(whoami.value);
                } else {
                    const err = whoami.reason;
                    if (err instanceof ApiError) {
                        setWhoamiData({
                            error: {
                                code: err.code,
                                message: err.message,
                                status: err.status,
                            },
                        });
                    } else {
                        setWhoamiData({ error: String(err) });
                    }
                }

                if (plans.status === 'fulfilled') {
                    setPlansData(plans.value);
                } else {
                    const err = plans.reason;
                    if (err instanceof ApiError) {
                        setPlansData({
                            error: {
                                code: err.code,
                                message: err.message,
                                status: err.status,
                            },
                        });
                    } else {
                        setPlansData({ error: String(err) });
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">API Response Shape Check</h1>
                <p className="text-muted-foreground mb-6">
                    This page validates that backend endpoints return standardized{' '}
                    <code className="bg-muted px-1 rounded">{'{ ok, data }'}</code> format.
                </p>

                {loading && <p>Loading...</p>}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded mb-4">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">GET /api/auth/whoami</h2>
                        <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                            {JSON.stringify(whoamiData, null, 2)}
                        </pre>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-2">GET /api/plans</h2>
                        <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                            {JSON.stringify(plansData, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
