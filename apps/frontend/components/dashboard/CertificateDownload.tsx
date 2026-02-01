'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function CertificateDownload() {
    const [isCertBusy, setIsCertBusy] = useState(false);
    const { toast } = useToast();
    
    // Fetch profile data to check KYC status
    const { data: profileData } = useSWR('/api/bff/profile', swrFetcher);
    const profile = profileData?.data;
    
    // Check if KYC is approved
    const kycStatus = profile?.kyc_status || 'pending';
    const isKycApproved = kycStatus === 'approved' || kycStatus === 'verified';
    
    const handleDownloadCertification = async () => {
        if (isCertBusy || !isKycApproved) return;
        setIsCertBusy(true);

        try {
            const response = await fetch('/api/bff/profile/certificate', {
                method: 'GET',
                credentials: "include",
            });

            if (!response.ok) {
                let errorMessage = "Failed to prepare certificate";
                try {
                    const errorData = await response.json();
                    errorMessage = errorData?.error || errorData?.message || errorMessage;
                } catch {
                    // Not JSON, use default message
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
        <div className="px-4 pb-6 pt-4 border-t border-[#E5E7EB] mt-auto">
            <div className="flex flex-col gap-2">
                {isKycApproved ? (
                    <>
                        <Button
                            onClick={handleDownloadCertification}
                            disabled={isCertBusy}
                            className="w-full bg-[#206039] text-white hover:bg-[#206039]/90 text-sm font-medium py-2.5"
                        >
                            {isCertBusy ? (
                                <>
                                    <Download className="w-4 h-4 mr-2 animate-pulse" />
                                    Preparing...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Download Certificate
                                </>
                            )}
                        </Button>
                        <p className="text-[10px] text-[#666666] leading-relaxed text-center">
                            Letter of Certification (PDF)
                        </p>
                    </>
                ) : (
                    <div className="rounded-[8px] bg-[#FEF3C7] border border-[#FCD34D] p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-[#92400E] mt-0.5 flex-shrink-0" />
                            <div className="flex flex-col gap-1">
                                <p className="text-[11px] font-medium text-[#92400E] leading-tight">
                                    Verification Required
                                </p>
                                <p className="text-[10px] text-[#92400E]/80 leading-tight">
                                    Complete identity verification to download your certificate.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
