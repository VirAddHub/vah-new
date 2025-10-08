"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function UsersDebugTest() {
    const { user, getToken } = useAuth();
    const [usersData, setUsersData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken?.();
            console.log('[UsersDebugTest] Token:', token ? 'Present' : 'Missing');
            
            const response = await fetch('/api/admin/users?page=1&pageSize=50', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            console.log('[UsersDebugTest] Response status:', response.status);
            console.log('[UsersDebugTest] Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[UsersDebugTest] Response data:', data);
            setUsersData(data);
        } catch (err: any) {
            console.error('[UsersDebugTest] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && getToken) {
            fetchUsers();
        }
    }, [user, getToken]);

    return (
        <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Users Debug Test</h3>
            <div className="space-y-2">
                <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
                <p><strong>Token:</strong> {getToken ? 'Available' : 'Not available'}</p>
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {error || 'None'}</p>
                <p><strong>Users Data:</strong></p>
                <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(usersData, null, 2)}
                </pre>
                <button 
                    onClick={fetchUsers}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>
        </div>
    );
}
