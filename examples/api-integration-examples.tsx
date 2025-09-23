// examples/api-integration-examples.tsx
// Practical examples of how to integrate your APIs with frontend components

import React, { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { apiGet, apiPostCSRF } from '@/lib/api';

// ============================================================================
// EXAMPLE 1: Mail Dashboard Component
// ============================================================================

interface MailItem {
    id: string;
    subject: string;
    sender: string;
    receivedAt: string;
    isRead: boolean;
}

export function MailDashboard() {
    const [mailItems, setMailItems] = useState<MailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMail = async () => {
            try {
                setLoading(true);
                // Using the BFF route - no CORS issues!
                const items = await apiClient.get<MailItem[]>('/api/bff/mail');
                setMailItems(items);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch mail');
            } finally {
                setLoading(false);
            }
        };

        fetchMail();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await apiPostCSRF('/api/bff/mail/mark-read', { id });
            setMailItems(prev =>
                prev.map(item =>
                    item.id === id ? { ...item, isRead: true } : item
                )
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    if (loading) return <div>Loading mail...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Mail Dashboard</h2>
            {mailItems.map(item => (
                <div key={item.id} className="border p-4 rounded">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold">{item.subject}</h3>
                            <p className="text-sm text-gray-600">From: {item.sender}</p>
                            <p className="text-xs text-gray-500">{item.receivedAt}</p>
                        </div>
                        {!item.isRead && (
                            <button
                                onClick={() => markAsRead(item.id)}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                            >
                                Mark Read
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// EXAMPLE 2: Address Search Component
// ============================================================================

interface Address {
    line1: string;
    line2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
}

export function AddressSearch() {
    const [postcode, setPostcode] = useState('');
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(false);

    const searchAddresses = async () => {
        if (!postcode.trim()) return;

        try {
            setLoading(true);
            const result = await apiClient.get<{ addresses: Address[] }>(
                `/api/bff/address/search?postcode=${encodeURIComponent(postcode)}`
            );
            setAddresses(result.addresses);
        } catch (err) {
            console.error('Address search failed:', err);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Address Search</h2>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="Enter postcode (e.g., SW1A 1AA)"
                    className="flex-1 px-3 py-2 border rounded"
                />
                <button
                    onClick={searchAddresses}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {addresses.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold">Found {addresses.length} addresses:</h3>
                    {addresses.map((addr, index) => (
                        <div key={index} className="border p-3 rounded bg-gray-50">
                            <p className="font-medium">{addr.line1}</p>
                            {addr.line2 && <p>{addr.line2}</p>}
                            <p>{addr.city}, {addr.county}</p>
                            <p className="font-mono">{addr.postcode}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EXAMPLE 3: User Profile Component
// ============================================================================

interface UserProfile {
    id: string;
    name: string;
    email: string;
    company: string;
    address: Address;
}

export function UserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userProfile = await apiClient.get<UserProfile>('/api/bff/profile');
                setProfile(userProfile);
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const updateProfile = async (updatedData: Partial<UserProfile>) => {
        try {
            const updated = await apiPostCSRF('/api/bff/profile', updatedData);
            setProfile(updated);
            setEditing(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
        }
    };

    if (loading) return <div>Loading profile...</div>;
    if (!profile) return <div>No profile found</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">User Profile</h2>
                <button
                    onClick={() => setEditing(!editing)}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    {editing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            <div className="border p-4 rounded">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Name</label>
                        {editing ? (
                            <input
                                type="text"
                                defaultValue={profile.name}
                                className="w-full px-3 py-2 border rounded"
                            />
                        ) : (
                            <p>{profile.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <p>{profile.email}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Company</label>
                        {editing ? (
                            <input
                                type="text"
                                defaultValue={profile.company}
                                className="w-full px-3 py-2 border rounded"
                            />
                        ) : (
                            <p>{profile.company}</p>
                        )}
                    </div>
                </div>

                {editing && (
                    <div className="mt-4">
                        <button
                            onClick={() => updateProfile({ name: 'Updated Name' })}
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// EXAMPLE 4: Company Search Component
// ============================================================================

interface Company {
    company_name: string;
    company_number: string;
    company_status: string;
    date_of_creation: string;
    address: Address;
}

export function CompanySearch() {
    const [query, setQuery] = useState('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);

    const searchCompanies = async () => {
        if (!query.trim()) return;

        try {
            setLoading(true);
            const result = await apiClient.get<Company[]>(
                `/api/bff/companies/search?q=${encodeURIComponent(query)}`
            );
            setCompanies(result);
        } catch (err) {
            console.error('Company search failed:', err);
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Company Search</h2>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for companies..."
                    className="flex-1 px-3 py-2 border rounded"
                />
                <button
                    onClick={searchCompanies}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {companies.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold">Found {companies.length} companies:</h3>
                    {companies.map((company, index) => (
                        <div key={index} className="border p-3 rounded bg-gray-50">
                            <h4 className="font-semibold">{company.company_name}</h4>
                            <p className="text-sm text-gray-600">Company Number: {company.company_number}</p>
                            <p className="text-sm text-gray-600">Status: {company.company_status}</p>
                            <p className="text-sm text-gray-600">Created: {company.date_of_creation}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EXAMPLE 5: Authentication Hook
// ============================================================================

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await apiClient.get('/api/bff/auth/whoami');
                setUser(currentUser);
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const result = await apiPostCSRF('/api/bff/auth/login', { email, password });
            setUser(result.user);
            return result;
        } catch (err) {
            throw new Error('Login failed');
        }
    };

    const logout = async () => {
        try {
            await apiPostCSRF('/api/bff/auth/logout');
            setUser(null);
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return { user, loading, login, logout };
}
