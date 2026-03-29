'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { useDashboardBootstrap } from '@/hooks/useDashboardData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
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
import { getOwnerStatusMeta } from '@/lib/verification-state';

const SumsubKycWidget = dynamic(() => import('../SumsubKycWidget').then(mod => ({ default: mod.SumsubKycWidget })), { ssr: false });

/** Match `AccountBillingCard` / Billing page. */
const BILLING_LIKE_CARD =
    'w-full min-w-0 max-w-full flex-shrink-0 rounded-xl border-border/80 bg-card shadow-sm sm:max-w-xl sm:rounded-2xl';

const BILLING_LIKE_CARD_WIDE =
    'w-full min-w-0 max-w-full flex-shrink-0 rounded-xl border-border/80 bg-card shadow-sm sm:max-w-2xl sm:rounded-2xl';

type VerificationUiKind = 'approved' | 'pending_review' | 'action_required' | 'rejected';

const VERIFICATION_STATUS_COPY: Record<
    VerificationUiKind,
    { title: string; body: string }
> = {
    approved: {
        title: 'Verification approved',
        body: 'Your identity check has been completed successfully. You can now use your VirtualAddressHub address and access the relevant account features.',
    },
    pending_review: {
        title: 'Verification in progress',
        body: 'We are reviewing your identity check. You will be able to use all relevant account features once verification is complete.',
    },
    action_required: {
        title: 'Action required',
        body: 'We need a bit more information to complete your identity check. Please return to verification and follow the next steps.',
    },
    rejected: {
        title: 'Verification unsuccessful',
        body: 'We could not complete your identity check. Please review the details provided and try again or contact support.',
    },
};

function resolveVerificationUiKind(
    verificationState: 'verified' | 'pending_others' | 'action_required',
    rawKycLower: string
): VerificationUiKind {
    const k = rawKycLower;
    if (k === 'rejected' || k === 'failed' || k === 'declined') {
        return 'rejected';
    }
    if (verificationState === 'verified' || verificationState === 'pending_others') {
        return 'approved';
    }
    if (k === 'pending') {
        return 'pending_review';
    }
    return 'action_required';
}

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
    const {
        data: boot,
        mutate: mutateBootstrap,
        isLoading: bootLoading,
        error: bootError,
    } = useDashboardBootstrap();
    const { data: ownersData, mutate: mutateOwners } = useSWR('/api/bff/business-owners', swrFetcher);

    const user =
        boot?.ok && boot.data?.whoami && typeof boot.data.whoami === 'object'
            ? ((boot.data.whoami as { user?: unknown }).user as Record<string, unknown> | null | undefined) ??
              null
            : null;
    const profile = boot?.ok ? (boot.data.profile as any) : undefined;
    const compliance = boot?.ok ? (boot.data.compliance as any) : undefined;
    const owners: BusinessOwner[] = ownersData?.data?.owners || [];
    const companyNumberOnFile = (profile?.companies_house_number || profile?.company_number || '').trim();
    const companyNameOnFile = (profile?.company_name || '').trim();

    /** Raw KYC from profile / whoami (lowercase) for copy + state derivation. */
    const rawKycLower = useMemo(() => {
        if (!boot || boot.ok !== true) return '';
        const p = boot.data.profile as Record<string, unknown> | undefined;
        const who = boot.data.whoami as { user?: Record<string, unknown> } | undefined;
        const u = who?.user;
        return String(p?.kyc_status ?? u?.kyc_status ?? '')
            .trim()
            .toLowerCase();
    }, [boot]);

    /** Only derive after bootstrap succeeded — avoids defaulting to "pending" / action_required before data exists. */
    const primaryKycStatus = useMemo(() => {
        if (!boot || boot.ok !== true) return null;
        const status = rawKycLower || 'pending';
        return status === 'approved' || status === 'verified' ? 'verified' : 'pending';
    }, [boot, rawKycLower]);

    const pendingOwners = useMemo(() => {
        return owners.filter(owner =>
            (owner.requiresVerification || owner.requires_verification) &&
            owner.status !== 'verified'
        );
    }, [owners]);

    const verificationState = useMemo(() => {
        if (!boot || boot.ok !== true) return null;
        const c = boot.data.compliance as { verificationState?: string } | undefined;
        if (c?.verificationState) {
            return c.verificationState as 'verified' | 'pending_others' | 'action_required';
        }
        if (primaryKycStatus === 'verified' && pendingOwners.length === 0) return 'verified';
        if (primaryKycStatus === 'verified' && pendingOwners.length > 0) return 'pending_others';
        return 'action_required';
    }, [boot, primaryKycStatus, pendingOwners]);

    const [resendingId, setResendingId] = useState<string | number | null>(null);
    const handleResend = async (ownerId: string | number) => {
        if (resendingId !== null) return;
        setResendingId(ownerId);
        try {
            const response = await fetch(`/api/bff/business-owners/${ownerId}/resend`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                if (data?.data?.alreadyVerified) {
                    toast({
                        title: 'Already verified',
                        description: 'This director has already completed verification.',
                        variant: 'default',
                    });
                } else {
                    toast({
                        title: 'Verification email sent',
                        description: 'A new verification link has been sent to their email address.',
                    });
                }
                mutateOwners();
            } else {
                const msg = data?.data?.message || data?.error?.message || 'Failed to resend verification email.';
                toast({ title: 'Could not resend', description: msg, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' });
        } finally {
            setResendingId(null);
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
            mutateBootstrap();
            setCompanyModalOpen(false);
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setCompanySaveBusy(false);
        }
    };

    if (bootLoading && boot === undefined) {
        return (
            <div className="w-full space-y-6" aria-busy="true" aria-label="Loading verification">
                <div className="mb-5 sm:mb-6 md:mb-8 space-y-2">
                    <div className="h-9 w-72 max-w-full animate-pulse rounded-md bg-muted" />
                    <div className="h-5 w-full max-w-lg animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="h-52 max-w-xl animate-pulse rounded-xl bg-muted/40" />
                <div className="h-52 max-w-xl animate-pulse rounded-xl bg-muted/40" />
            </div>
        );
    }

    if (bootError || (boot && boot.ok !== true)) {
        return (
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
                <p className="mb-4 text-body text-muted-foreground">
                    We couldn&apos;t load your account data. Please try again.
                </p>
                <Button type="button" onClick={() => void mutateBootstrap()}>
                    Retry
                </Button>
            </div>
        );
    }

    if (verificationState === null) {
        return null;
    }

    const uiKind = resolveVerificationUiKind(verificationState, rawKycLower);
    const statusCopy = VERIFICATION_STATUS_COPY[uiKind];

    return (
        <div className="w-full">
            <div className="mb-5 sm:mb-6 md:mb-8">
                <h1 className="mb-2 text-h1 text-foreground sm:mb-4">Identity Verification</h1>
                <p className="text-body-sm text-muted-foreground sm:text-body">
                    Check your verification status and any required next steps.
                </p>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-8 sm:gap-10">
                {/* Companies House details */}
                <Card className={BILLING_LIKE_CARD}>
                    <CardContent className="flex h-full flex-col p-5 sm:p-8">
                        <div className="flex flex-1 flex-col gap-4 sm:gap-5">
                            <div>
                                <h3 className="text-h4 text-foreground sm:text-h3">Companies House details</h3>
                                <p className="mt-1 text-caption text-muted-foreground sm:text-body-sm">
                                    Your company details on file.
                                </p>
                            </div>
                            {companyNumberOnFile ? (
                                <>
                                    <div className="flex min-w-0 items-start justify-between gap-4">
                                        <span className="shrink-0 text-caption text-muted-foreground">
                                            Company number
                                        </span>
                                        <span className="min-w-0 text-right text-body-sm font-medium tabular-nums text-foreground sm:text-body">
                                            {companyNumberOnFile}
                                        </span>
                                    </div>
                                    {companyNameOnFile ? (
                                        <>
                                            <div className="h-px w-full bg-border" />
                                            <div className="flex min-w-0 items-start justify-between gap-4">
                                                <span className="shrink-0 text-caption text-muted-foreground">
                                                    Company name
                                                </span>
                                                <span className="min-w-0 max-w-[min(100%,16rem)] text-right text-body-sm font-medium leading-snug text-foreground sm:max-w-[20rem] sm:text-body">
                                                    {companyNameOnFile}
                                                </span>
                                            </div>
                                        </>
                                    ) : null}
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-body text-muted-foreground leading-relaxed">
                                        Not incorporated yet? Add your company number when it is available.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={handleOpenCompanyModal}
                                        className="h-12 w-full touch-manipulation sm:h-11 sm:w-auto"
                                        size="lg"
                                    >
                                        Add Companies House number
                                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                                    </Button>
                                    <p className="text-caption text-muted-foreground leading-snug">
                                        Required before issuing proof of address certificates.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {(verificationState === 'verified' || verificationState === 'pending_others') && (
                    <Card className={BILLING_LIKE_CARD}>
                        <CardContent className="flex h-full flex-col p-5 sm:p-8">
                            <div className="flex flex-1 flex-col gap-4 sm:gap-5">
                                <h3 className="text-h4 text-foreground sm:text-h3">{statusCopy.title}</h3>
                                <p className="text-body text-muted-foreground leading-relaxed">{statusCopy.body}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {verificationState === 'pending_others' && (
                    <Card className={BILLING_LIKE_CARD}>
                        <CardContent className="flex h-full flex-col p-5 sm:p-8">
                            <div className="flex flex-1 flex-col gap-4 sm:gap-5">
                                <div>
                                    <h3 className="text-h4 text-foreground sm:text-h3">Pending verification</h3>
                                    <p className="mt-1 text-caption text-muted-foreground sm:text-body-sm">
                                        Directors or PSCs who still need to verify.
                                    </p>
                                </div>
                                <p className="text-body text-muted-foreground leading-relaxed">
                                    The following individuals must complete verification before we can issue proof of
                                    address certificates. Your address can still be used for incorporation and Companies
                                    House setup.
                                </p>
                                <ul className="space-y-3" aria-label="Pending verifications">
                                    {pendingOwners.map((owner) => (
                                        <li
                                            key={owner.id}
                                            className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-body-sm font-medium text-foreground">
                                                    {owner.fullName || owner.firstName || owner.first_name}{' '}
                                                    {owner.lastName || owner.last_name || ''}
                                                </p>
                                                {owner.email ? (
                                                    <p className="mt-0.5 text-body-sm text-muted-foreground">
                                                        {owner.email}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                                                <Badge
                                                    variant="outline"
                                                    className="border-border bg-background font-medium normal-case tracking-normal text-muted-foreground"
                                                >
                                                    {getOwnerStatusMeta(owner.status).label}
                                                </Badge>
                                                {owner.email ? (
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleResend(owner.id)}
                                                        disabled={resendingId === owner.id}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 text-foreground/90 hover:bg-muted/60 hover:text-foreground"
                                                    >
                                                        <Mail className="mr-2 h-4 w-4" strokeWidth={1.75} aria-hidden />
                                                        {resendingId === owner.id ? 'Sending…' : 'Resend verification'}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {verificationState === 'action_required' && (
                    <Card className={BILLING_LIKE_CARD_WIDE}>
                        <CardContent className="flex h-full flex-col p-5 sm:p-8">
                            <div className="flex flex-1 flex-col gap-4 sm:gap-5">
                                <h3 className="text-h4 text-foreground sm:text-h3">{statusCopy.title}</h3>
                                <p className="text-body text-muted-foreground leading-relaxed">{statusCopy.body}</p>
                                <SumsubKycWidget hideIntro />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

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
                                <p className="text-caption text-muted-foreground">Searching Companies House…</p>
                            )}
                            {!searchBusy && searchResults.length > 0 && (
                                <ul className="border border-border rounded-md divide-y divide-border max-h-48 overflow-y-auto">
                                    {searchResults.map((company, i) => (
                                        <li key={`${company.identifier}-${i}`}>
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-2.5 text-body-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                                                onClick={() => handleSelectCompany(company)}
                                            >
                                                <span className="font-medium text-foreground">{company.title}</span>
                                                <span className="text-muted-foreground ml-2">({company.regNumber})</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {!searchBusy && searchQuery.trim().length >= 2 && searchResults.length === 0 && searchQuery.trim() && (
                                <p className="text-caption text-muted-foreground">No companies found. Try a different name.</p>
                            )}
                        </div>

                        {/* Selected company */}
                        <div className="space-y-3 border-t border-border pt-4">
                            {companyNumberInput || companyNameInput ? (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-body-sm font-medium text-foreground">Selected company</p>
                                        <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="text-primary">
                                            Change
                                        </Button>
                                    </div>
                                    <div className="rounded-md bg-muted/50 px-3 py-2.5 text-body-sm">
                                        <p className="font-medium text-foreground">{companyNameInput || '—'}</p>
                                        <p className="text-muted-foreground">Company number: {companyNumberInput || '—'}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-body-sm text-muted-foreground">Search above to find and select your company.</p>
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
