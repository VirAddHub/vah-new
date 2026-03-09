'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, AlertCircle, Lock, Mail, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ActiveBusinessContextBanner } from '@/components/account/ActiveBusinessContextBanner';

const SumsubKycWidget = dynamic(() => import('../SumsubKycWidget').then(mod => ({ default: mod.SumsubKycWidget })), { ssr: false });

interface BusinessOwner {
    id: string | number;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    requiresVerification?: boolean;
    requires_verification?: boolean;
    status: 'verified' | 'pending' | 'not_started' | 'rejected';
}

interface CompanySearchResult {
    title: string;
    regNumber: string;
    identifier: string;
}

export default function AccountVerificationPage() {
    const router = useRouter();
    
    // Fetch profile data for KYC status and Companies House
    const { data: profileData, mutate: mutateProfile } = useSWR('/api/bff/profile', swrFetcher);
    const { data: userData } = useSWR('/api/bff/auth/whoami', swrFetcher);
    const { data: ownersData, mutate: mutateOwners } = useSWR('/api/bff/business-owners', swrFetcher);

    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;
    const owners: BusinessOwner[] = ownersData?.data?.owners || [];
    const companyNumberOnFile = (profile?.companies_house_number || profile?.company_number || '').trim();
    const companyNameOnFile = (profile?.company_name || '').trim();

    // Get primary user KYC status
    const primaryKycStatus = useMemo(() => {
        const status = profile?.kyc_status || user?.kyc_status || 'pending';
        return status === 'approved' || status === 'verified' ? 'verified' : 'pending';
    }, [profile, user]);

    // Check if there are other owners requiring verification
    const pendingOwners = useMemo(() => {
        return owners.filter(owner => 
            (owner.requiresVerification || owner.requires_verification) && 
            owner.status !== 'verified'
        );
    }, [owners]);

    // Determine overall verification state
    const verificationState = useMemo(() => {
        if (primaryKycStatus === 'verified' && pendingOwners.length === 0) {
            return 'verified';
        } else if (primaryKycStatus === 'verified' && pendingOwners.length > 0) {
            return 'pending_others';
        } else {
            return 'action_required';
        }
    }, [primaryKycStatus, pendingOwners]);

    // Handle resend verification email
    const handleResend = async (ownerId: string | number) => {
        try {
            const response = await fetch(`/api/bff/business-owners/${ownerId}/resend`, {
                method: 'POST',
            });
            
            if (response.ok) {
                alert('Verification email resent successfully');
            } else {
                alert('Failed to resend verification email');
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            alert('An error occurred');
        }
    };

    // Companies House: format 8 digits OR 2 letters + 6 digits (match backend)
    const CH_NUMBER_RE = /^([0-9]{8}|[A-Za-z]{2}[0-9]{6})$/;

    // Companies House modal
    const { toast } = useToast();
    const [companyModalOpen, setCompanyModalOpen] = useState(false);
    const [companyNumberInput, setCompanyNumberInput] = useState('');
    const [companyNameInput, setCompanyNameInput] = useState('');
    const [companySaveBusy, setCompanySaveBusy] = useState(false);
    // Search by name
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
    const [searchBusy, setSearchBusy] = useState(false);

    const handleOpenCompanyModal = () => {
        setCompanyNumberInput(companyNumberOnFile);
        setCompanyNameInput(companyNameOnFile);
        setSearchQuery('');
        setSearchResults([]);
        setCompanyModalOpen(true);
    };

    // Debounced search by company name (Companies House)
    useEffect(() => {
        const q = searchQuery.trim();
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchBusy(true);
            try {
                const res = await fetch(`/api/bff/company-search?query=${encodeURIComponent(q)}`, { credentials: 'include' });
                const json = await res.json().catch(() => ({}));
                if (json?.ok && Array.isArray(json.businesses)) {
                    setSearchResults(json.businesses.map((b: any) => ({
                        title: b.title ?? '',
                        regNumber: b.regNumber ?? b.identifier ?? '',
                        identifier: b.identifier ?? b.regNumber ?? '',
                    })));
                } else {
                    setSearchResults([]);
                }
            } catch {
                setSearchResults([]);
            } finally {
                setSearchBusy(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectCompany = useCallback((company: CompanySearchResult) => {
        setCompanyNameInput(company.title);
        setCompanyNumberInput(company.regNumber);
        setSearchResults([]);
        setSearchQuery('');
    }, []);

    const clearSelection = useCallback(() => {
        setCompanyNumberInput('');
        setCompanyNameInput('');
        setSearchQuery('');
        setSearchResults([]);
    }, []);

    const handleSaveCompanyDetails = async () => {
        const num = companyNumberInput.trim();
        if (!num) {
            toast({ title: 'Company number required', description: 'Please enter your Companies House number.', variant: 'destructive' });
            return;
        }
        if (!CH_NUMBER_RE.test(num)) {
            toast({ title: 'Invalid number', description: 'Use 8 digits or 2 letters followed by 6 digits (e.g. 12345678 or SC123456).', variant: 'destructive' });
            return;
        }
        setCompanySaveBusy(true);
        try {
            const res = await fetch('/api/bff/profile/company-details', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    company_number: num,
                    ...(companyNameInput.trim() ? { company_name: companyNameInput.trim() } : {}),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data?.error?.message || data?.message || 'Failed to save. Please try again.';
                toast({ title: 'Could not save', description: msg, variant: 'destructive' });
                return;
            }
            toast({ title: 'Companies House details saved', description: 'Your company number and name have been saved.' });
            mutateProfile();
            setCompanyModalOpen(false);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setCompanySaveBusy(false);
        }
    };

    return (
        <div className="w-full max-w-3xl">
            <ActiveBusinessContextBanner />
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-semibold text-neutral-900 mb-2 leading-tight tracking-tight">
                    Identity Verification
                </h1>
                <p className="text-base text-neutral-600 leading-relaxed">
                    {verificationState === 'verified' 
                        ? 'Your identity check has been approved'
                        : verificationState === 'pending_others'
                        ? 'Waiting for other directors to complete verification'
                        : 'Complete verification to fully activate your account and compliance features'
                    }
                </p>
            </div>

            {/* Companies House details card — top of Verification */}
            <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-neutral-600" strokeWidth={2} />
                        </div>
                        <div className="flex-1 space-y-2 md:space-y-3 min-w-0">
                            <h2 className="text-lg font-semibold text-neutral-900">
                                Companies House details
                            </h2>
                            {companyNumberOnFile ? (
                                <>
                                    <div className="space-y-1.5 text-sm">
                                        <p className="flex flex-wrap gap-x-2 gap-y-0.5">
                                            <span className="text-neutral-500">Company number</span>
                                            <span className="font-medium text-neutral-900">{companyNumberOnFile}</span>
                                        </p>
                                        {companyNameOnFile && (
                                            <p className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                <span className="text-neutral-500">Company name</span>
                                                <span className="font-medium text-neutral-900">{companyNameOnFile}</span>
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-neutral-600 leading-relaxed">
                                        Not incorporated yet? That&apos;s fine — add your company number once available.
                                    </p>
                                    <Button
                                        onClick={handleOpenCompanyModal}
                                        className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
                                    >
                                        Add Companies House number
                                    </Button>
                                    <p className="text-xs text-neutral-500 leading-relaxed">
                                        Required before issuing proof of address certificates.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* STATE: VERIFIED */}
            {verificationState === 'verified' && (
                <Card className="rounded-2xl border border-neutral-200 bg-white">
                <CardContent className="p-8">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-green-700" strokeWidth={2} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                    Identity verification complete
                                </h2>
                                <p className="text-base text-neutral-600 leading-relaxed mb-6">
                                    Your identity check (ID verification) has been approved. You have full access to your business address and all account features.
                                </p>
                                <Button
                                    onClick={() => router.push('/account/overview')}
                                    variant="outline"
                                    size="sm"
                                >
                                    View Account
                                </Button>
                            </div>
                        </div>
                </CardContent>
            </Card>
            )}

            {/* STATE: PENDING - OTHER DIRECTORS/PSCs */}
            {verificationState === 'pending_others' && (
                <>
                    {/* Primary User Verified */}
                    <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-8">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-green-700" strokeWidth={2} />
                                </div>
                        <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                        Your Verification Complete
                                    </h2>
                                    <p className="text-base text-neutral-600 leading-relaxed">
                                        You are verified. Waiting for other directors to complete their verification.
                                    </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

                    {/* Pending Owners */}
                    <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-8">
                            <div className="flex items-start gap-6 mb-6">
                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-6 h-6 text-yellow-700" strokeWidth={2} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                        Pending Verification
                                    </h2>
                                    <p className="text-base text-neutral-600 leading-relaxed mb-6">
                                        The following individuals must complete verification before we can issue proof of address certificates and fully activate your account.
                                    </p>
                                    
                                    {/* Owners List */}
                                    <div className="space-y-3">
                                        {pendingOwners.map((owner) => (
                                            <div 
                                                key={owner.id}
                                                className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-neutral-900">
                                                        {owner.fullName || owner.firstName || owner.first_name} {owner.lastName || owner.last_name || ''}
                                                    </p>
                                                    {owner.email && (
                                                        <p className="text-sm text-neutral-600 mt-1">
                                                            {owner.email}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-yellow-100 text-yellow-800 border-0">
                                                        {owner.status === 'pending' ? 'Pending' : 'Not Started'}
                                                    </Badge>
                                                    {owner.email && (
                                                        <Button
                                                            onClick={() => handleResend(owner.id)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-primary hover:text-primary/80"
                                                        >
                                                            <Mail className="w-4 h-4 mr-2" strokeWidth={2} />
                                                            Resend
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </>
            )}

            {/* STATE: ACTION REQUIRED */}
            {verificationState === 'action_required' && (
                <>
                    {/* Verification Required Card */}
                    <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                        <CardContent className="p-8">
                            <div className="flex items-start gap-6 mb-6">
                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck className="w-6 h-6 text-yellow-700" strokeWidth={2} />
                        </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                        Verification Required
                                    </h2>
                                    <p className="text-base text-neutral-600 leading-relaxed mb-6">
                                        Complete identity verification to fully activate your account (including proof of address certificates). This typically takes 5-10 minutes.
                                    </p>
                                    
                                    {/* Sumsub Widget */}
                                    <SumsubKycWidget />
                        </div>
                    </div>
                </CardContent>
            </Card>

                </>
            )}

            {/* Add Companies House number modal */}
            <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Companies House details</DialogTitle>
                        <DialogDescription>
                            Search by your company name to find and select your UK company.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        {/* Search by name (primary) */}
                        <div className="space-y-2">
                            <Label htmlFor="company-search">Search by company name</Label>
                            <Input
                                id="company-search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="e.g. Virtual Address Hub"
                                className="w-full"
                                autoComplete="off"
                            />
                            {searchBusy && (
                                <p className="text-xs text-neutral-500">Searching Companies House…</p>
                            )}
                            {!searchBusy && searchResults.length > 0 && (
                                <ul className="border border-neutral-200 rounded-md divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                                    {searchResults.map((company, i) => (
                                        <li key={`${company.identifier}-${i}`}>
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none"
                                                onClick={() => handleSelectCompany(company)}
                                            >
                                                <span className="font-medium text-neutral-900">{company.title}</span>
                                                <span className="text-neutral-500 ml-2">({company.regNumber})</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {!searchBusy && searchQuery.trim().length >= 2 && searchResults.length === 0 && searchQuery.trim() && (
                                <p className="text-xs text-neutral-500">No companies found. Try a different name.</p>
                            )}
                        </div>

                        {/* Selected company */}
                        <div className="space-y-3 border-t border-neutral-100 pt-4">
                            {companyNumberInput || companyNameInput ? (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-neutral-700">Selected company</p>
                                        <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="text-primary">
                                            Change
                                        </Button>
                                    </div>
                                    <div className="rounded-md bg-neutral-50 px-3 py-2.5 text-sm">
                                        <p className="font-medium text-neutral-900">{companyNameInput || '—'}</p>
                                        <p className="text-neutral-500">Company number: {companyNumberInput || '—'}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-neutral-500">Search above to find and select your company.</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setCompanyModalOpen(false)} disabled={companySaveBusy}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSaveCompanyDetails} disabled={companySaveBusy || !companyNumberInput.trim()}>
                            {companySaveBusy ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
