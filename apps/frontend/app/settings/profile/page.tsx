// apps/frontend/app/settings/profile/page.tsx
"use client";

export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { getMe, patchMe } from "@/lib/api";

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        name: "",
        avatarUrl: "",
        marketingOptIn: false,
        forwarding_address: ""
    });
    const [kycStatus, setKycStatus] = useState<string>("");
    const [forwardingAddress, setForwardingAddress] = useState({
        name: "",
        address1: "",
        address2: "",
        city: "",
        postal: "",
        country: "United Kingdom"
    });
    const [msg, setMsg] = useState("");

    useEffect(() => {
        getMe()
            .then(r => {
                const u = r.data.user ?? {};
                setForm({
                    name: u.name ?? "",
                    avatarUrl: u.avatarUrl ?? "",
                    marketingOptIn: !!u.marketingOptIn,
                    forwarding_address: u.forwarding_address ?? ""
                });
                setKycStatus(u.kyc_status ?? "");

                // Parse existing forwarding address into separate fields
                if (u.forwarding_address) {
                    const lines = u.forwarding_address.split('\n').filter((line: string) => line.trim() !== '');
                    setForwardingAddress({
                        name: lines[0] || "",
                        address1: lines[1] || "",
                        address2: lines[2] || "",
                        city: lines[lines.length - 2]?.split(',')[0]?.trim() || "",
                        postal: lines[lines.length - 2]?.split(',')[1]?.trim() || "",
                        country: lines[lines.length - 1] || "United Kingdom"
                    });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg("");
        try {
            // Combine forwarding address fields into the expected format
            const combinedAddress = [
                forwardingAddress.name,
                forwardingAddress.address1,
                forwardingAddress.address2,
                `${forwardingAddress.city}, ${forwardingAddress.postal}`,
                forwardingAddress.country
            ].filter(line => line.trim() !== '').join('\n');

            console.log('Saving profile with address:', combinedAddress);

            const result = await patchMe({
                ...form,
                forwarding_address: combinedAddress
            });

            console.log('Profile save result:', result);
            setMsg("Saved");
        } catch (e: any) {
            console.error('Profile save error:', e);
            setMsg(e?.message || e?.payload?.error?.message || "Failed to save");
        }
    }

    if (loading) return <p className="p-6">Loading…</p>;

    return (
        <main className="p-6 max-w-xl">
            <h1 className="text-xl font-semibold mb-4">Profile</h1>
            <form onSubmit={onSubmit} className="grid gap-4">
                <label className="grid gap-1">
                    <span>Name</span>
                    <input
                        className="border rounded p-2"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        disabled={kycStatus === 'verified'}
                    />
                    {kycStatus === 'verified' && (
                        <p className="text-xs text-muted-foreground">
                            Name cannot be changed after KYC verification
                        </p>
                    )}
                </label>
                <label className="grid gap-1">
                    <span>Avatar URL</span>
                    <input className="border rounded p-2" value={form.avatarUrl}
                        onChange={e => setForm({ ...form, avatarUrl: e.target.value })} />
                </label>
                <div className="grid gap-4">
                    <h3 className="text-lg font-medium">Forwarding Address</h3>
                    <div className="grid gap-3">
                        <label className="grid gap-1">
                            <span>Full Name *</span>
                            <input
                                className="border rounded p-2"
                                value={forwardingAddress.name}
                                onChange={e => setForwardingAddress({ ...forwardingAddress, name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </label>
                        <label className="grid gap-1">
                            <span>Address Line 1 *</span>
                            <input
                                className="border rounded p-2"
                                value={forwardingAddress.address1}
                                onChange={e => setForwardingAddress({ ...forwardingAddress, address1: e.target.value })}
                                placeholder="123 Main Street"
                            />
                        </label>
                        <label className="grid gap-1">
                            <span>Address Line 2</span>
                            <input
                                className="border rounded p-2"
                                value={forwardingAddress.address2}
                                onChange={e => setForwardingAddress({ ...forwardingAddress, address2: e.target.value })}
                                placeholder="Apartment 4B (optional)"
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="grid gap-1">
                                <span>City *</span>
                                <input
                                    className="border rounded p-2"
                                    value={forwardingAddress.city}
                                    onChange={e => setForwardingAddress({ ...forwardingAddress, city: e.target.value })}
                                    placeholder="London"
                                />
                            </label>
                            <label className="grid gap-1">
                                <span>Postal Code *</span>
                                <input
                                    className="border rounded p-2"
                                    value={forwardingAddress.postal}
                                    onChange={e => setForwardingAddress({ ...forwardingAddress, postal: e.target.value })}
                                    placeholder="SW1A 1AA"
                                />
                            </label>
                        </div>
                        <label className="grid gap-1">
                            <span>Country *</span>
                            <input
                                className="border rounded p-2"
                                value={forwardingAddress.country}
                                onChange={e => setForwardingAddress({ ...forwardingAddress, country: e.target.value })}
                                placeholder="United Kingdom"
                            />
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This address will be used automatically when you request mail forwarding.
                    </p>
                </div>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.marketingOptIn}
                        onChange={e => setForm({ ...form, marketingOptIn: e.target.checked })} />
                    <span className="text-foreground">Marketing opt-in</span>
                </label>
                <button className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
                {msg && <p className="text-sm">{msg}</p>}
            </form>
        </main>
    );
}
