"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Loader2, Upload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher } from '@/services/http';

export interface Compliance {
    isKycApproved: boolean;
    isChVerified: boolean;
    canUseRegisteredOfficeAddress: boolean;
}

interface IdentityComplianceCardProps {
    compliance: Compliance;
    kycStatus?: string | null;
    chVerificationStatus?: string | null;
}

declare global {
    interface Window {
        SNSWebSdk?: any;
    }
}

export function IdentityComplianceCard({ 
    compliance, 
    kycStatus,
    chVerificationStatus 
}: IdentityComplianceCardProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [startingKyc, setStartingKyc] = useState(false);
    const [kycToken, setKycToken] = useState<string | null>(null);
    const [kycOpen, setKycOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // Fetch CH verification status if not provided
    const { data: chData, mutate: refreshCh } = useSWR('/api/bff/ch-verification', swrFetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000,
    });

    // If fully compliant, show success card
    if (compliance.canUseRegisteredOfficeAddress) {
        return (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Identity Checks Complete
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-green-800 dark:text-green-200">
                        You can now use your VirtualAddressHub registered office address with Companies House and HMRC.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Start KYC flow
    const startKyc = async () => {
        setStartingKyc(true);
        try {
            const response = await fetch("/api/bff/kyc/start", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.ok && data.token) {
                setKycToken(data.token);
                setKycOpen(true);
            } else {
                toast({
                    title: "Error",
                    description: data.message || "Failed to start verification. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("[IdentityComplianceCard] Error starting KYC:", error);
            toast({
                title: "Error",
                description: "Failed to start verification. Please try again.",
                variant: "destructive",
            });
        } finally {
            setStartingKyc(false);
        }
    };

    // Handle CH file upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
            if (!validTypes.includes(selectedFile.type)) {
                toast({
                    title: 'Invalid file type',
                    description: 'Please upload an image (JPG, PNG, GIF, WEBP) or PDF file.',
                    variant: 'destructive',
                });
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Please upload a file smaller than 10MB.',
                    variant: 'destructive',
                });
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleChUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast({
                title: 'No file selected',
                description: 'Please select a file to upload.',
                variant: 'destructive',
            });
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/bff/ch-verification', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            const json = await res.json();

            if (!res.ok || !json.ok) {
                throw new Error(json.message || json.error || 'Upload failed');
            }

            toast({
                title: 'Verification proof uploaded',
                description: 'Thanks! Our team will review your submission shortly.',
            });

            // Refresh CH verification status and profile
            await refreshCh();
            await globalMutate('/api/profile');
            setFile(null);
            const fileInput = document.getElementById('ch-verification-file') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (err: any) {
            toast({
                title: 'Upload failed',
                description: err.message || 'Failed to upload verification proof. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    // Load Sumsub WebSDK for KYC
    useEffect(() => {
        if (!kycOpen || !kycToken) return;

        const loadSumsubSDK = () => {
            if (window.SNSWebSdk) {
                initializeSumsub();
                return;
            }

            const script = document.createElement("script");
            script.src = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
            script.async = true;
            script.onload = () => {
                if (window.SNSWebSdk) {
                    initializeSumsub();
                }
            };
            script.onerror = () => {
                console.error("[IdentityComplianceCard] Failed to load Sumsub SDK");
                toast({
                    title: "Error",
                    description: "Failed to load verification interface. Please refresh and try again.",
                    variant: "destructive",
                });
            };
            document.body.appendChild(script);

            return () => {
                const existingScript = document.querySelector(
                    'script[src="https://static.sumsub.com/idensic/static/sns-websdk-builder.js"]'
                );
                if (existingScript) {
                    document.body.removeChild(existingScript);
                }
            };
        };

        const initializeSumsub = () => {
            try {
                const snsWebSdk = window.SNSWebSdk.init(kycToken, {
                    lang: "en",
                })
                    .withConf({ lang: "en" })
                    .on("onError", (e: any) => {
                        console.error("[IdentityComplianceCard] Sumsub error:", e);
                        toast({
                            title: "Verification Error",
                            description: e.message || "An error occurred during verification.",
                            variant: "destructive",
                        });
                    })
                    .on("onReady", () => {
                        console.log("[IdentityComplianceCard] Sumsub ready");
                    })
                    .on("onApplicantSubmitted", () => {
                        console.log("[IdentityComplianceCard] Applicant submitted");
                        setKycOpen(false);
                        toast({
                            title: "Verification Submitted",
                            description: "Your identity verification has been submitted. We'll review it shortly.",
                        });
                        setTimeout(() => {
                            router.refresh();
                        }, 2000);
                    })
                    .build();

                snsWebSdk.launch("#sumsub-root");
            } catch (error) {
                console.error("[IdentityComplianceCard] Failed to initialize Sumsub:", error);
                toast({
                    title: "Error",
                    description: "Failed to initialize verification interface. Please try again.",
                    variant: "destructive",
                });
            }
        };

        loadSumsubSDK();
    }, [kycOpen, kycToken, toast, router]);

    const kycButtonText =
        kycStatus === "pending"
            ? "Continue verification"
            : kycStatus === "rejected"
            ? "Retry verification"
            : "Start verification";

    const chStatus = chVerificationStatus || chData?.data?.ch_verification_status || 'not_submitted';
    const isChSubmitted = chStatus === 'submitted';
    const isChRejected = chStatus === 'rejected';

    return (
        <>
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        Complete Your Identity Checks
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        To use your registered office address with Companies House and HMRC, you need to complete both steps below.
                    </p>

                    {/* Step 1: KYC */}
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="flex-shrink-0 mt-0.5">
                            {compliance.isKycApproved ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-amber-600 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-amber-600">1</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground mb-1">
                                Step 1: Identity Check (KYC)
                            </div>
                            {compliance.isKycApproved ? (
                                <p className="text-sm text-green-700 dark:text-green-300">✓ Completed</p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Complete identity verification with Sumsub. This is required for UK AML compliance.
                                    </p>
                                    <Button
                                        onClick={startKyc}
                                        disabled={startingKyc}
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        {startingKyc ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Starting...
                                            </>
                                        ) : (
                                            kycButtonText
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Companies House */}
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="flex-shrink-0 mt-0.5">
                            {compliance.isChVerified ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-amber-600 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-amber-600">2</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground mb-1">
                                Step 2: Companies House Verification
                            </div>
                            {compliance.isChVerified ? (
                                <p className="text-sm text-green-700 dark:text-green-300">✓ Verified by our team</p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Verify your identity for Companies House using GOV.UK One Login, then upload the confirmation screenshot.
                                    </p>
                                    {isChSubmitted && (
                                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                                            ✓ Proof received — we're reviewing it now
                                        </p>
                                    )}
                                    {isChRejected && (
                                        <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                            ⚠ Your previous upload needs attention. Please upload a clearer screenshot.
                                        </p>
                                    )}
                                    <form onSubmit={handleChUpload} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <label
                                                htmlFor="ch-verification-file"
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-amber-300 rounded-md cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {file ? file.name : "Choose file"}
                                            </label>
                                            <input
                                                id="ch-verification-file"
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={!file || uploading}
                                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    "Upload"
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Upload a screenshot or PDF of your Companies House verification confirmation (max 10MB)
                                        </p>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KYC Dialog */}
            <Dialog open={kycOpen} onOpenChange={setKycOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Identity Verification</DialogTitle>
                    </DialogHeader>
                    <div id="sumsub-root" className="min-h-[600px] w-full" />
                </DialogContent>
            </Dialog>
        </>
    );
}

