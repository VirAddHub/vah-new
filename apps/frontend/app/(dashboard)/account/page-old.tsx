'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { User, CreditCard, FileText, MapPin, Settings, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePlans } from '@/hooks/usePlans';

const money = (p?: number) => typeof p === 'number' ? `£${(p / 100).toFixed(2)}` : '—';
const formatDateUK = (v?: number | string | null) => {
    if (v == null) return '—';
    const n = typeof v === 'string' ? Number(v) : v;
    const d = !Number.isNaN(n) && n > 10_000_000_000 ? new Date(n) : new Date(v as any);
    return Number.isNaN(d.getTime()) ? '—' :
        new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(d);
};

export default function AccountPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: overview, error: overviewError } = useSWR('/api/billing/overview', swrFetcher);
    const { data: invoices, error: invoicesError } = useSWR('/api/billing/invoices?page=1&page_size=12', swrFetcher);
    const { data: userData, error: userDataError } = useSWR('/api/auth/whoami', swrFetcher);

    // Get dynamic pricing from plans API
    const { getMonthlyPlan, getAnnualPlan } = usePlans();
    const monthlyPlan = getMonthlyPlan();
    const annualPlan = getAnnualPlan();
    const monthlyPrice = monthlyPlan ? (monthlyPlan.price_pence / 100).toFixed(2) : null;
    const annualPrice = annualPlan ? (annualPlan.price_pence / 100).toFixed(2) : null;

    const [busy, setBusy] = useState<string | null>(null);
    const [setupStatus, setSetupStatus] = useState<'idle' | 'completing' | 'done' | 'error'>('idle');
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        forwarding_address: '',
        marketingOptIn: false,
        addressSearch: '',
        addressSuggestions: [] as any[],
        useManualEntry: false,
        manualAddress: {
            line1: '',
            line2: '',
            city: '',
            postcode: ''
        }
    });
    const [kycStatus, setKycStatus] = useState<string>('');
    const [profileMsg, setProfileMsg] = useState('');

    const o = overview?.data;
    const items = invoices?.data?.items ?? [];
    const user = userData?.data?.user;
    const billingRequestFlowId = searchParams?.get('billing_request_flow_id');

    // Check for unauthenticated state (401 errors or unauthenticated error messages)
    // Axios errors have response.status, and SWR errors may have status directly
    const isUnauthenticated =
        (userDataError && (
            (userDataError as any)?.response?.status === 401 ||
            (userDataError as any)?.status === 401 ||
            (userDataError as any)?.message?.includes('unauthenticated')
        )) ||
        (overviewError && (
            (overviewError as any)?.response?.status === 401 ||
            (overviewError as any)?.status === 401
        )) ||
        (invoicesError && (
            (invoicesError as any)?.response?.status === 401 ||
            (invoicesError as any)?.status === 401
        )) ||
        (userData?.ok === false && userData?.error === 'unauthenticated');

    // If GoCardless sends us back with a billing_request_flow_id, complete the redirect flow here.
    // (Must be above any conditional return to avoid hook-order issues.)
    useEffect(() => {
        const run = async () => {
            if (!billingRequestFlowId) return;
            if (setupStatus !== 'idle') return;

            setSetupStatus('completing');
            try {
                const r = await fetch(
                    `/api/payments/redirect-flows/${encodeURIComponent(billingRequestFlowId)}/complete`,
                    { method: 'POST', credentials: 'include' }
                );
                const j = await r.json().catch(() => null);
                if (!r.ok || j?.ok === false) {
                    throw new Error(j?.error || 'Failed to complete payment setup');
                }

                // Check if we should show welcome message after signup
                const showWelcome = sessionStorage.getItem('show_welcome_after_payment');
                if (showWelcome === 'true') {
                    sessionStorage.removeItem('show_welcome_after_payment');
                    toast({
                        title: 'Welcome to VirtualAddressHub! 🎉',
                        description: 'Your account is set up and payment method connected. Complete identity verification to start using your London address.',
                        duration: 8000,
                    });
                } else {
                    toast({
                        title: 'Payment method connected',
                        description: 'Your Direct Debit mandate is now set up.',
                    });
                }
                setSetupStatus('done');
            } catch (e: any) {
                toast({
                    title: "Couldn't complete payment setup",
                    description: e?.message || 'Please try again.',
                    variant: 'destructive',
                });
                setSetupStatus('error');
            } finally {
                // Clean the URL (remove the query param) regardless of outcome
                router.replace('/account');
            }
        };
        run();
    }, [billingRequestFlowId, router, setupStatus]);

    // Initialize profile form when user data loads
    // (Must be above any conditional return to avoid hook-order issues.)
    useEffect(() => {
        if (!user) return;
        if (isUnauthenticated) return;
        setProfileForm({
            name: user.name || '',
            email: user.email || '',
            forwarding_address: user.forwarding_address || '',
            marketingOptIn: !!user.marketingOptIn
        });
        setKycStatus(user.kyc_status || '');
    }, [user, isUnauthenticated]);

    // Show login prompt if unauthenticated (even if middleware is bypassed)
    if (isUnauthenticated) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Navigation onNavigate={() => { }} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="max-w-xl py-12 px-6">
                        <h1 className="text-xl font-semibold text-foreground">Please log in</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            You need to be signed in to view your account. Log in and we&apos;ll bring you straight back here.
                        </p>
                        <Link
                            href="/login?next=/account"
                            className="mt-4 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
                        >
                            Log in
                        </Link>
                    </div>
                </main>
                <Footer onNavigate={() => { }} />
            </div>
        );
    }

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
            const r = await fetch('/api/billing/change-plan', {
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

    // Address search handler
    const handleAddressSearch = async (query: string) => {
        if (!query || query.length < 3) {
            setProfileForm({ ...profileForm, addressSuggestions: [] });
            return;
        }

        try {
            const url = `/api/bff/address?postcode=${encodeURIComponent(query)}&line1=`;
            const response = await fetch(url, { cache: 'no-store' });

            if (response.ok) {
                const data = await response.json();
                if (data.ok && data.data?.addresses) {
                    // Transform string addresses to objects for display
                    const suggestions = data.data.addresses.map((addr: string, idx: number) => ({
                        id: `addr-${idx}`,
                        formatted_address: addr,
                        address_line_1: addr.split(',')[0] || addr,
                        address_line_2: addr.split(',')[1] || '',
                        city: addr.split(',')[2] || '',
                        postcode: query.toUpperCase().trim()
                    }));
                    setProfileForm({ ...profileForm, addressSuggestions: suggestions });
                } else {
                    setProfileForm({ ...profileForm, addressSuggestions: [] });
                }
            } else {
                setProfileForm({ ...profileForm, addressSuggestions: [] });
            }
        } catch (error) {
            console.error('Address search error:', error);
            setProfileForm({ ...profileForm, addressSuggestions: [] });
        }
    };

    // Address selection handler
    const handleAddressSelect = (address: any) => {
        // Parse address string from API response
        const addressStr = address.formatted_address || address;
        const addressParts = typeof addressStr === 'string'
            ? addressStr.split(',').map((p: string) => p.trim()).filter((p: string) => p)
            : [];

        // Extract components
        const line1 = address.address_line_1 || addressParts[0] || '';
        const line2 = address.address_line_2 || addressParts[1] || '';
        const city = address.city || addressParts[addressParts.length - 2] || '';
        const postcode = address.postcode || addressParts[addressParts.length - 1] || '';

        // Format for forwarding_address (multi-line format)
        const addressLines = [line1, line2, city, postcode].filter(line => line.trim() !== '');
        const formattedAddress = addressLines.join('\n');

        setProfileForm({
            ...profileForm,
            forwarding_address: formattedAddress,
            addressSearch: addressStr,
            addressSuggestions: [],
            useManualEntry: false,
            manualAddress: {
                line1,
                line2,
                city,
                postcode
            }
        });
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg('');

        // If using manual entry, format the address from manual fields
        let finalAddress = profileForm.forwarding_address;
        if (profileForm.useManualEntry && profileForm.manualAddress.line1) {
            const addressLines = [
                profileForm.manualAddress.line1,
                profileForm.manualAddress.line2,
                profileForm.manualAddress.city,
                profileForm.manualAddress.postcode
            ].filter(line => line && line.trim() !== '');
            finalAddress = addressLines.join('\n');
        }

        try {
            const r = await fetch('/api/auth/whoami', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...profileForm,
                    forwarding_address: finalAddress
                })
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
                        <div className="rounded-xl p-4 border border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-400">
                            <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
                                <AlertCircle className="h-5 w-5" />
                                Payment Failed - Grace Period
                            </div>
                            <div className="text-sm mt-1 text-emerald-800 dark:text-emerald-200">
                                Your payment failed, but you have {o.grace_period.days_left} days to update your payment method.
                                This is attempt #{o.grace_period.retry_count + 1}.
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Button
                                    onClick={() => act('/api/billing/reauthorise')}
                                    disabled={busy !== null}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Update Payment Method
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => act('/api/billing/update-bank')}
                                    disabled={busy !== null}
                                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
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
                                    onClick={() => act('/api/billing/reauthorise')}
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
                                                    disabled={kycStatus === 'verified'}
                                                />
                                                {kycStatus === 'verified' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Name cannot be changed after KYC verification
                                                    </p>
                                                )}
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
                                                {o?.cadence === 'monthly'
                                                    ? `£${(o?.current_price_pence || (monthlyPlan?.price_pence || 995)) / 100}`
                                                    : monthlyPrice ? `£${monthlyPrice}` : 'Loading...'}
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
                                                {o?.cadence === 'yearly'
                                                    ? `£${(o?.current_price_pence || (annualPlan?.price_pence || 8999)) / 100}`
                                                    : annualPrice ? `£${annualPrice}` : 'Loading...'}
                                            </div>
                                            <div className="text-sm text-muted-foreground mb-2">per year</div>
                                            <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-4">
                                                Same service, better value
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

                            {/* Payment Setup */}
                            {o && !o.has_mandate && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Payment Setup
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {o.has_redirect_flow && o.redirect_flow_id ? (
                                            <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">
                                                    You have an incomplete payment setup. Click below to resume.
                                                </p>
                                                <Button
                                                    onClick={() => {
                                                        router.push(`/account?billing_request_flow_id=${encodeURIComponent(o.redirect_flow_id)}`);
                                                    }}
                                                    disabled={busy !== null}
                                                >
                                                    Resume Setup
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Set up Direct Debit to activate your subscription.
                                                </p>
                                                <Button
                                                    onClick={async () => {
                                                        setBusy('setup');
                                                        try {
                                                            const planId = user?.plan_id || monthlyPlan?.id;
                                                            if (!planId) {
                                                                toast({
                                                                    title: 'No plan selected',
                                                                    description: 'Please select a plan first.',
                                                                    variant: 'destructive',
                                                                });
                                                                return;
                                                            }
                                                            const resp = await fetch('/api/payments/redirect-flows', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                credentials: 'include',
                                                                body: JSON.stringify({
                                                                    plan_id: planId,
                                                                    billing_period: o.cadence || 'monthly'
                                                                })
                                                            });
                                                            const data = await resp.json();
                                                            if (data.ok) {
                                                                if (data.data?.alreadyLinked) {
                                                                    toast({
                                                                        title: 'Payment method already active',
                                                                        description: 'Your Direct Debit mandate is already set up.',
                                                                    });
                                                                    router.refresh();
                                                                } else if (data.data?.resume && data.data?.redirectFlowId) {
                                                                    router.push(`/account?billing_request_flow_id=${encodeURIComponent(data.data.redirectFlowId)}`);
                                                                } else if (data.data?.redirect_url || data.redirect_url) {
                                                                    window.location.href = data.data?.redirect_url || data.redirect_url;
                                                                }
                                                            } else {
                                                                throw new Error(data.error || 'Failed to start payment setup');
                                                            }
                                                        } catch (e: any) {
                                                            toast({
                                                                title: 'Setup failed',
                                                                description: e?.message || 'Please try again.',
                                                                variant: 'destructive',
                                                            });
                                                        } finally {
                                                            setBusy(null);
                                                        }
                                                    }}
                                                    disabled={busy !== null}
                                                >
                                                    Start GoCardless Setup
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment Status */}
                            {o && o.has_mandate && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            Payment Method
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default" className="bg-green-600">
                                                Direct Debit active
                                            </Badge>
                                            <p className="text-sm text-muted-foreground">
                                                Your Direct Debit mandate is set up and active.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment Actions */}
                            {o && o.has_mandate && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payment Management</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => act('/api/billing/update-bank')}
                                                disabled={busy !== null}
                                            >
                                                Update Bank Details
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => act('/api/billing/reauthorise')}
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
                            )}
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
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="forwarding_address">Forwarding Address</Label>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    This is where we'll forward your mail. Start by searching for your address, or enter it manually below.
                                                </p>
                                            </div>

                                            {/* Address Search with API */}
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                                    <Input
                                                        id="address-search-input"
                                                        type="text"
                                                        placeholder="Start typing your address to search..."
                                                        value={profileForm.addressSearch || ''}
                                                        onChange={(e) => {
                                                            setProfileForm({ ...profileForm, addressSearch: e.target.value });
                                                            handleAddressSearch(e.target.value);
                                                        }}
                                                        className="pl-10 pr-10"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 rounded-full bg-primary hover:bg-primary/90"
                                                        onClick={() => handleAddressSearch(profileForm.addressSearch || '')}
                                                    >
                                                        <Search className="h-4 w-4 text-white" />
                                                    </Button>
                                                </div>
                                                {profileForm.addressSuggestions && profileForm.addressSuggestions.length > 0 && (
                                                    <div className="border rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto z-50">
                                                        {profileForm.addressSuggestions.map((suggestion: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                                                onClick={() => handleAddressSelect(suggestion)}
                                                            >
                                                                <div className="text-sm font-medium">{suggestion.formatted_address || suggestion.address_line_1}</div>
                                                                {suggestion.address_line_2 && (
                                                                    <div className="text-xs text-muted-foreground">{suggestion.address_line_2}</div>
                                                                )}
                                                                <div className="text-xs text-muted-foreground">
                                                                    {suggestion.city} {suggestion.postcode}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Manual Entry Link */}
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <span className="text-sm text-muted-foreground">Can't find your address?</span>
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => setProfileForm({ ...profileForm, useManualEntry: !profileForm.useManualEntry })}
                                                    className="text-primary h-auto p-0"
                                                >
                                                    {profileForm.useManualEntry ? 'Hide Manual Entry' : 'Enter address manually'}
                                                </Button>
                                            </div>

                                            {/* Manual Entry Fields */}
                                            {profileForm.useManualEntry && (
                                                <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <Label htmlFor="manual-address-line1" className="text-sm font-medium">
                                                                Address Line 1 <span className="text-destructive">*</span>
                                                            </Label>
                                                            <Input
                                                                id="manual-address-line1"
                                                                value={profileForm.manualAddress?.line1 || ''}
                                                                onChange={(e) => setProfileForm({
                                                                    ...profileForm,
                                                                    manualAddress: { ...profileForm.manualAddress, line1: e.target.value }
                                                                })}
                                                                placeholder="House number and street name"
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="manual-address-line2" className="text-sm font-medium">
                                                                Address Line 2
                                                            </Label>
                                                            <Input
                                                                id="manual-address-line2"
                                                                value={profileForm.manualAddress?.line2 || ''}
                                                                onChange={(e) => setProfileForm({
                                                                    ...profileForm,
                                                                    manualAddress: { ...profileForm.manualAddress, line2: e.target.value }
                                                                })}
                                                                placeholder="Apartment, suite, etc. (optional)"
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label htmlFor="manual-address-city" className="text-sm font-medium">
                                                                    City <span className="text-destructive">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="manual-address-city"
                                                                    value={profileForm.manualAddress?.city || ''}
                                                                    onChange={(e) => setProfileForm({
                                                                        ...profileForm,
                                                                        manualAddress: { ...profileForm.manualAddress, city: e.target.value }
                                                                    })}
                                                                    placeholder="City"
                                                                    className="mt-1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="manual-address-postcode" className="text-sm font-medium">
                                                                    Postcode <span className="text-destructive">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="manual-address-postcode"
                                                                    value={profileForm.manualAddress?.postcode || ''}
                                                                    onChange={(e) => setProfileForm({
                                                                        ...profileForm,
                                                                        manualAddress: { ...profileForm.manualAddress, postcode: e.target.value }
                                                                    })}
                                                                    placeholder="Postcode"
                                                                    className="mt-1"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

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
