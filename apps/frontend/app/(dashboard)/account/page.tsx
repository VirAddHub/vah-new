'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, CreditCard, FileText, MapPin, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const money = (p?: number) => typeof p === 'number' ? `£${(p / 100).toFixed(2)}` : '—';
const formatDateUK = (v?: number | string | null) => {
    if (v == null) return '—';
    const n = typeof v === 'string' ? Number(v) : v;
    const d = !Number.isNaN(n) && n > 10_000_000_000 ? new Date(n) : new Date(v as any);
    return Number.isNaN(d.getTime()) ? '—' :
        new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(d);
};

export default function AccountPage() {
    const { data: overview } = useSWR('/api/bff/billing/overview', swrFetcher);
    const { data: invoices } = useSWR('/api/bff/billing/invoices?page=1&page_size=12', swrFetcher);
    const { data: userData } = useSWR('/api/auth/me', swrFetcher);

    const [busy, setBusy] = useState<string | null>(null);
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        forwarding_address: '',
        marketingOptIn: false
    });
    const [profileMsg, setProfileMsg] = useState('');

    const o = overview?.data;
    const items = invoices?.data?.items ?? [];
    const user = userData?.data?.user;

    // Initialize profile form when user data loads
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
                forwarding_address: user.forwarding_address || '',
                marketingOptIn: !!user.marketingOptIn
            });
        }
    }, [user]);

    const act = async (path: string) => {
        setBusy(path);
        try {
            const r = await fetch(path, { method: 'POST', credentials: 'include' });
            const j = await r.json();
            if (j?.data?.redirect_url) window.location.href = j.data.redirect_url;
        } finally {
            setBusy(null);
        }
    };

    const handlePlanChange = async (cadence: 'monthly' | 'yearly') => {
        setBusy(cadence);
        try {
            const planId = cadence === 'monthly' ? 3 : 2;
            const r = await fetch('/api/bff/billing/change-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ plan_id: planId })
            });

            const j = await r.json();
            if (j.ok) {
                toast({
                    title: "Plan Updated",
                    description: `Successfully changed to ${cadence} billing. Changes will take effect on your next billing cycle.`
                });
                window.location.reload();
            } else {
                toast({
                    title: "Failed to Change Plan",
                    description: j.error || 'Please try again.',
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to change plan. Please try again.",
                variant: "destructive"
            });
        } finally {
            setBusy(null);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg('');
        try {
            const r = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(profileForm)
            });

            if (r.ok) {
                setProfileMsg('Profile updated successfully');
                toast({
                    title: "Profile Updated",
                    description: "Your profile has been saved successfully."
                });
            } else {
                const j = await r.json();
                setProfileMsg(j.error || 'Failed to update profile');
            }
        } catch (error) {
            setProfileMsg('Failed to update profile');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navigation onNavigate={() => { }} />
            <main className="flex-1">
                <div className="max-w-6xl mx-auto p-6 space-y-8">
                    <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">Account</h1>
                    </div>

                    {/* Payment Status Alerts */}
                    {o?.account_status === 'grace_period' && o?.grace_period && (
                        <div className="rounded-xl p-4 border border-amber-500 bg-amber-100 dark:bg-amber-900/20 dark:border-amber-400">
                            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-100">
                                <AlertCircle className="h-5 w-5" />
                                Payment Failed - Grace Period
                            </div>
                            <div className="text-sm mt-1 text-amber-800 dark:text-amber-200">
                                Your payment failed, but you have {o.grace_period.days_left} days to update your payment method.
                                This is attempt #{o.grace_period.retry_count + 1}.
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Button
                                    onClick={() => act('/api/bff/billing/reauthorise')}
                                    disabled={busy !== null}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    Update Payment Method
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => act('/api/bff/billing/update-bank')}
                                    disabled={busy !== null}
                                    className="border-amber-600 text-amber-600 hover:bg-amber-50"
                                >
                                    Update Bank Details
                                </Button>
                            </div>
                        </div>
                    )}

                    {o?.account_status === 'past_due' && (
                        <div className="rounded-xl p-4 border border-red-500 bg-red-100 dark:bg-red-900/20 dark:border-red-400">
                            <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-100">
                                <AlertCircle className="h-5 w-5" />
                                Payment Overdue
                            </div>
                            <div className="text-sm mt-1 text-red-800 dark:text-red-200">
                                Your payment is overdue. Please update your payment method immediately to avoid service interruption.
                            </div>
                            <div className="mt-3">
                                <Button
                                    onClick={() => act('/api/bff/billing/reauthorise')}
                                    disabled={busy !== null}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Update Payment Method
                                </Button>
                            </div>
                        </div>
                    )}

                    {o?.account_status === 'suspended' && (
                        <div className="rounded-xl p-4 border border-red-500 bg-red-100 dark:bg-red-900/20 dark:border-red-400">
                            <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-100">
                                <AlertCircle className="h-5 w-5" />
                                Account Suspended
                            </div>
                            <div className="text-sm mt-1 text-red-800 dark:text-red-200">
                                Your account has been suspended due to payment issues. Please contact support to restore service.
                            </div>
                        </div>
                    )}

                    <Tabs defaultValue="profile" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="profile" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Profile
                            </TabsTrigger>
                            <TabsTrigger value="billing" className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Billing
                            </TabsTrigger>
                            <TabsTrigger value="address" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Address
                            </TabsTrigger>
                            <TabsTrigger value="invoices" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Invoices
                            </TabsTrigger>
                        </TabsList>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Profile Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Full Name</Label>
                                                <Input
                                                    id="name"
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={profileForm.email}
                                                    disabled
                                                    className="bg-muted"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Contact support to change your email address
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="marketing"
                                                checked={profileForm.marketingOptIn}
                                                onChange={(e) => setProfileForm({ ...profileForm, marketingOptIn: e.target.checked })}
                                                className="rounded"
                                            />
                                            <Label htmlFor="marketing" className="text-sm">
                                                I would like to receive marketing communications and updates
                                            </Label>
                                        </div>

                                        <Button type="submit" className="w-full md:w-auto">
                                            Save Profile Changes
                                        </Button>

                                        {profileMsg && (
                                            <p className={`text-sm ${profileMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                                                {profileMsg}
                                            </p>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Billing Tab */}
                        <TabsContent value="billing" className="space-y-6">
                            {/* Current Plan Overview */}
                            <div className="grid md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="text-sm text-muted-foreground font-medium">Current Plan</div>
                                        <div className="text-xl font-bold text-foreground mt-1">{o?.plan ?? 'Digital Mailbox Plan'}</div>
                                        <div className="text-sm text-muted-foreground mt-2">Billing: {o?.cadence ?? 'monthly'}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="text-sm text-muted-foreground font-medium">Next Charge</div>
                                        <div className="text-xl font-bold text-foreground mt-1">{o?.next_charge_at ? formatDateUK(o.next_charge_at) : '—'}</div>
                                        <div className="text-sm text-muted-foreground mt-2">Status: {o?.status ?? '—'}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="text-sm text-muted-foreground font-medium">This Month's Usage</div>
                                        <div className="text-xl font-bold text-foreground mt-1">
                                            {money(o?.usage?.amount_pence)}
                                            <span className="text-sm text-muted-foreground"> ({o?.usage?.qty ?? 0} items)</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Plan Change Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Change Billing Frequency
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Monthly Plan */}
                                        <div className={`rounded-lg border p-6 ${o?.cadence === 'monthly' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-border bg-card'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-semibold text-foreground">Virtual Mailbox - Monthly</h3>
                                                {o?.cadence === 'monthly' && (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-3xl font-bold mb-2 text-foreground">
                                                {o?.cadence === 'monthly' ? `£${(o?.current_price_pence || 995) / 100}` : '£9.95'}
                                            </div>
                                            <div className="text-sm text-muted-foreground mb-4">per month</div>
                                            <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                                                <li>• Professional London business address</li>
                                                <li>• Unlimited digital mail scanning</li>
                                                <li>• HMRC & Companies House forwarding (free)</li>
                                                <li>• Cancel anytime</li>
                                            </ul>
                                            {o?.cadence !== 'monthly' && (
                                                <Button
                                                    className="w-full"
                                                    onClick={() => handlePlanChange('monthly')}
                                                    disabled={busy !== null}
                                                >
                                                    {busy === 'monthly' ? 'Processing...' : 'Choose Monthly Billing'}
                                                </Button>
                                            )}
                                        </div>

                                        {/* Annual Plan */}
                                        <div className={`rounded-lg border p-6 ${o?.cadence === 'yearly' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400' : 'border-border bg-card'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-semibold text-foreground">Virtual Mailbox - Annual</h3>
                                                {o?.cadence === 'yearly' && (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-3xl font-bold mb-2 text-foreground">
                                                {o?.cadence === 'yearly' ? `£${(o?.current_price_pence || 8999) / 100}` : '£89.99'}
                                            </div>
                                            <div className="text-sm text-muted-foreground mb-2">per year</div>
                                            <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-4">
                                                Save 25% (£29.41/year) - Same service, better value
                                            </div>
                                            <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                                                <li>• Professional London business address</li>
                                                <li>• Unlimited digital mail scanning</li>
                                                <li>• HMRC & Companies House forwarding (free)</li>
                                                <li>• Cancel anytime</li>
                                                <li>• <strong>25% savings vs monthly</strong></li>
                                            </ul>
                                            {o?.cadence !== 'yearly' && (
                                                <Button
                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                    onClick={() => handlePlanChange('yearly')}
                                                    disabled={busy !== null}
                                                >
                                                    {busy === 'yearly' ? 'Processing...' : 'Choose Annual Billing'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-6">
                                        Billing frequency changes take effect immediately. You'll be charged the new rate on your next billing cycle.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Payment Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Management</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => act('/api/bff/billing/update-bank')}
                                            disabled={busy !== null}
                                        >
                                            Update Bank Details
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => act('/api/bff/billing/reauthorise')}
                                            disabled={busy !== null}
                                        >
                                            Re-authorise Mandate
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-4">
                                        Secure pages are provided by GoCardless. We'll refresh your mandate and billing automatically.
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Address Tab */}
                        <TabsContent value="address" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Forwarding Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="forwarding_address">Your Forwarding Address</Label>
                                            <Textarea
                                                id="forwarding_address"
                                                value={profileForm.forwarding_address}
                                                onChange={(e) => setProfileForm({ ...profileForm, forwarding_address: e.target.value })}
                                                placeholder="Enter your forwarding address (name, address lines, city, postal code, country)"
                                                className="min-h-[120px]"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                This address will be used automatically when you request mail forwarding.
                                                Make sure to include all necessary details for successful delivery.
                                            </p>
                                        </div>
                                        <Button type="submit" className="w-full md:w-auto">
                                            Save Address
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Invoices Tab */}
                        <TabsContent value="invoices" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Invoices & Receipts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-muted-foreground border-b">
                                                    <th className="py-3 font-medium">Date</th>
                                                    <th className="py-3 font-medium">Amount</th>
                                                    <th className="py-3 font-medium">Status</th>
                                                    <th className="py-3 font-medium">Receipt</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.length === 0 ? (
                                                    <tr>
                                                        <td className="py-8 text-muted-foreground text-center" colSpan={4}>
                                                            No invoices yet.
                                                        </td>
                                                    </tr>
                                                ) : items.map((x: any) => (
                                                    <tr key={x.id} className="border-b">
                                                        <td className="py-3 text-foreground">{formatDateUK(x.date)}</td>
                                                        <td className="py-3 text-foreground font-medium">{money(x.amount_pence)}</td>
                                                        <td className="py-3">
                                                            <Badge
                                                                variant={x.status === 'paid' ? 'default' : x.status === 'pending' ? 'secondary' : 'destructive'}
                                                                className={
                                                                    x.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                                        x.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                                }
                                                            >
                                                                {x.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3">
                                                            {x.pdf_url ? (
                                                                <Button variant="link" size="sm" asChild>
                                                                    <a href={x.pdf_url} target="_blank" rel="noreferrer">
                                                                        Download PDF
                                                                    </a>
                                                                </Button>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer onNavigate={() => { }} />
        </div>
    );
}
