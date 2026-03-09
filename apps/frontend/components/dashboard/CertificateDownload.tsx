'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle } from 'lucide-react';
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

export function CertificateDownload({ profile, compliance }: CertificateDownloadProps) {
    const [isCertBusy, setIsCertBusy] = useState(false);
    const { toast } = useToast();

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

    const canDownload = compliance
        ? Boolean(compliance.canDownloadProofOfAddressCertificate)
        : (isKycApproved && hasCompanyNumber);

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
        <div className="px-4 pb-6 pt-4 border-t border-[#E5E7EB]">
            <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-[#374151]">
                    Letter of Certification
                </p>
                {canDownload ? (
                    <>
                        <Button
                            onClick={handleDownloadCertification}
                            disabled={isCertBusy}
                            className="w-full bg-[#206039] text-white hover:bg-[#206039]/90 text-sm font-medium py-2.5"
                        >
                            {isCertBusy ? (
                                <>
                                    <Download className="w-4 h-4 mr-2 animate-pulse" />
                                    Preparing…
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Download PDF
                                </>
                            )}
                        </Button>
                        <p className="text-[10px] text-[#6b7280] leading-relaxed">
                            Use for banks, payment providers and professional contacts.
                        </p>
                    </>
                ) : (() => {
                    const reason = compliance
                        ? getCertificateBlockReasonFromCompliance(compliance)
                        : (!isKycApproved ? 'primary' : 'company');
                    const meta = getCertificateBlockMeta(reason);
                    return (
                        <div className="rounded-[8px] bg-[#FEF3C7] border border-[#FCD34D] p-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-[#92400E] mt-0.5 flex-shrink-0" />
                                <div className="flex flex-col gap-1">
                                    <p className="text-[11px] font-medium text-[#92400E] leading-tight">
                                        {meta.title}
                                    </p>
                                    <p className="text-[10px] text-[#92400E]/80 leading-tight">
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
