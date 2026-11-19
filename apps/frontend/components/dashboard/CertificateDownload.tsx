'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAccess } from '@/hooks/useAccess';
import { sidebarStatusFor } from '@/components/account/AccessNotice';
import { useToast } from '@/components/ui/use-toast';
import {
  getCertificateBlockMeta,
  getCertificateBlockReasonFromCompliance,
  getCertificateBlockReasonFromError,
} from '@/lib/verification-state';

/** Compliance from GET /api/bff/profile/compliance (or profile.compliance) */
interface ComplianceSnapshot {
    isPrimaryUserVerified?: boolean;
    allRequiredOwnersVerified?: boolean;
    hasCompanyNumber?: boolean;
    canDownloadProofOfAddressCertificate?: boolean;
}

interface CertificateDownloadProps {
    /**
     * `quiet` — de-emphasise on dense pages (e.g. Support) so sidebar CTAs do not compete.
     */
    variant?: 'default' | 'quiet';
    /**
     * Profile data containing KYC status and company number.
     * If not provided, component will show disabled state.
     */
    profile?: {
        kyc_status?: string;
        companies_house_number?: string;
        company_number?: string;
        [key: string]: unknown;
    } | null;
    /**
     * Optional compliance from backend. When provided, used for eligibility and 403 reason messaging.
     */
    compliance?: ComplianceSnapshot | null;
}

export function CertificateDownload({
    profile,
    compliance,
    variant = 'default',
}: CertificateDownloadProps) {
    const quiet = variant === 'quiet';
    const [isCertBusy, setIsCertBusy] = useState(false);
    const { toast } = useToast();
    const { access } = useAccess();
    const setupStatus = access && !access.isAdmin ? sidebarStatusFor(access) : null;

    const userProfile = profile && typeof profile === 'object' && 'data' in profile && profile.data != null
        ? (profile as { data: Record<string, unknown> }).data
        : profile;
    const kycStatus = (userProfile as Record<string, unknown>)?.kyc_status ?? (userProfile as Record<string, unknown>)?.kycStatus ?? 'pending';
    const isKycApproved = kycStatus === 'approved' || kycStatus === 'verified';
    const companyNumber = (
        (userProfile as Record<string, unknown>)?.companies_house_number ??
        (userProfile as Record<string, unknown>)?.companiesHouseNumber ??
        (userProfile as Record<string, unknown>)?.company_number ??
        ''
    );
    const hasCompanyNumber = String(companyNumber ?? '').trim().length > 0;

    const canDownload = !setupStatus && (compliance
        ? Boolean(compliance.canDownloadProofOfAddressCertificate)
        : (isKycApproved && hasCompanyNumber));

    const handleDownloadCertification = async () => {
        if (isCertBusy || !canDownload) return;
        setIsCertBusy(true);

        try {
            const response = await fetch('/api/bff/profile/certificate', {
                method: 'GET',
                credentials: "include",
            });

            if (!response.ok) {
                let errorMessage = "Failed to prepare certificate";
                if (response.headers.get('content-type')?.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = (errorData?.message as string) || errorMessage;
                        if (response.status === 403 && errorData?.error) {
                            const reason = getCertificateBlockReasonFromError(errorData.error as string);
                            const meta = getCertificateBlockMeta(reason);
                            errorMessage = meta.description;
                        }
                    } catch {
                        // use default
                    }
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "letter-of-certification.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();

            // Cleanup blob URL shortly after triggering download
            window.setTimeout(() => {
                try {
                    URL.revokeObjectURL(url);
                } catch { }
            }, 5000);
            
            toast({
                title: "Certificate downloaded",
                description: "Your letter of certification has been downloaded successfully.",
            });
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Sorry — we couldn't generate your letter. Please try again.";
            toast({
                title: "Download failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsCertBusy(false);
        }
    };

    return (
        <div
            className={
                quiet
                    ? 'border-t border-border/50 bg-transparent px-3 py-2.5 sm:px-3 sm:pb-3 sm:pt-2.5'
                    : 'border-t border-border px-3 pb-4 pt-3 sm:px-4 sm:pb-6 sm:pt-4'
            }
        >
            <div className={quiet ? 'flex flex-col gap-2' : 'flex flex-col gap-3'}>
                {canDownload ? (
                    <>
                        <Button
                            type="button"
                            onClick={handleDownloadCertification}
                            disabled={isCertBusy}
                            variant={quiet ? 'outline' : 'primary'}
                            size={quiet ? 'sm' : 'md'}
                            fullWidth
                            className={
                                quiet
                                    ? 'touch-manipulation border-border font-normal text-body-sm text-muted-foreground hover:text-foreground'
                                    : 'touch-manipulation text-body font-semibold'
                            }
                        >
                            {isCertBusy ? 'Preparing…' : 'Download certificate'}
                        </Button>
                    </>
                ) : setupStatus ? (
                    <Link
                        href={setupStatus.href}
                        className="block rounded-xl border border-border bg-muted/40 p-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
                    >
                        <p className="text-caption font-semibold leading-tight text-foreground">{setupStatus.title}</p>
                        <p className="mt-0.5 text-caption leading-tight text-muted-foreground">{setupStatus.detail}</p>
                    </Link>
                ) : (() => {
                    const reason = compliance
                        ? getCertificateBlockReasonFromCompliance(compliance)
                        : (!isKycApproved ? 'primary' : 'company');
                    const meta = getCertificateBlockMeta(reason);
                    return (
                        <div
                            className={
                                quiet
                                    ? 'rounded-md border border-line/70 bg-mist/80 p-2.5'
                                    : 'rounded-md border border-line bg-mist p-3'
                            }
                        >
                            <div className="flex items-start gap-2">
                                <AlertCircle
                                    className={`mt-0.5 flex-shrink-0 text-ink ${quiet ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
                                />
                                <div className="flex flex-col gap-0.5">
                                    <p
                                        className={`font-medium leading-tight text-ink ${quiet ? 'text-[0.6875rem]' : 'text-caption'}`}
                                    >
                                        {meta.title}
                                    </p>
                                    <p
                                        className={`leading-tight text-ink/80 ${quiet ? 'text-[0.6875rem]' : 'text-caption'}`}
                                    >
                                        {meta.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
