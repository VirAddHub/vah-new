"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
import { mutate as globalMutate } from 'swr';
import snsWebSdk from '@sumsub/websdk';

export interface Compliance {
    isKycApproved: boolean;
    isChVerified: boolean;
    canUseRegisteredOfficeAddress: boolean;
}

interface IdentityComplianceCardProps {
    compliance: Compliance;
    kycStatus?: string | null;
}


export function IdentityComplianceCard({
    compliance,
    kycStatus,
}: IdentityComplianceCardProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [startingKyc, setStartingKyc] = useState(false);
    const [kycToken, setKycToken] = useState<string | null>(null);
    const [kycOpen, setKycOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                        You can now use your VirtualAddressHub registered office address.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Start KYC flow
    const startKyc = useCallback(async () => {
        setStartingKyc(true);
        setError(null);
        try {
            const response = await fetch("/api/bff/kyc/start", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error('Failed to start verification');
            }

            const data = await response.json();

            // Support both { token } and { accessToken } shapes
            const token = data.token || data.accessToken;
            if (!token || typeof token !== 'string') {
                throw new Error('Invalid token from KYC start endpoint');
            }

            setKycToken(token);
            setKycOpen(true);
        } catch (error: any) {
            console.error("[IdentityComplianceCard] Error starting KYC:", error);
            const errorMessage = error.message || "Failed to start verification. Please try again.";
            setError(errorMessage);
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setStartingKyc(false);
        }
    }, [toast]);

    // Initialize and launch Sumsub WebSDK when modal is open and we have a token
    useEffect(() => {
        if (!kycOpen || !kycToken) return;

        let sdkInstance: any | null = null;

        const initSdk = () => {
            try {
                sdkInstance = snsWebSdk
                    .init(
                        kycToken,
                        // Token update callback – for sandbox we can just return the same token for now
                        () => Promise.resolve(kycToken)
                    )
                    .withConf({
                        lang: 'en',
                    })
                    .on('idCheck.onError', (error: unknown) => {
                        console.error('[IdentityComplianceCard] Sumsub onError', error);
                        toast({
                            title: "Verification Error",
                            description: (error as any)?.message || "An error occurred during verification.",
                            variant: "destructive",
                        });
                    })
                    .on('idCheck.onReady', () => {
                        console.log('[IdentityComplianceCard] Sumsub ready');
                    })
                    .onMessage((type: string, payload: any) => {
                        console.log('[IdentityComplianceCard] Sumsub onMessage', type, payload);

                        // When review is completed/approved, trigger a profile refresh
                        if (type === 'idCheck.applicantStatus') {
                            const reviewStatus = payload?.reviewStatus;
                            const reviewResult = payload?.reviewResult;

                            if (reviewStatus === 'completed') {
                                setKycOpen(false);
                                toast({
                                    title: "Verification Submitted",
                                    description: "Your identity verification has been submitted. We'll review it shortly.",
                                });
                                // Refresh profile to get updated KYC status
                                setTimeout(() => {
                                    globalMutate('/api/profile');
                                    router.refresh();
                                }, 2000);
                            } else if (reviewStatus === 'approved' || reviewResult === 'green') {
                                setKycOpen(false);
                                toast({
                                    title: "Verification Approved",
                                    description: "Your identity verification has been approved!",
                                });
                                // Refresh profile to get updated KYC status
                                setTimeout(() => {
                                    globalMutate('/api/profile');
                                    router.refresh();
                                }, 1000);
                            }
                        }

                        // Legacy event handler for backward compatibility
                        if (type === 'onApplicantSubmitted') {
                            setKycOpen(false);
                            toast({
                                title: "Verification Submitted",
                                description: "Your identity verification has been submitted. We'll review it shortly.",
                            });
                            setTimeout(() => {
                                globalMutate('/api/profile');
                                router.refresh();
                            }, 2000);
                        }
                    })
                    .build();

                sdkInstance.launch('#sumsub-websdk-container');
            } catch (error) {
                console.error('[IdentityComplianceCard] Failed to initialize Sumsub:', error);
                toast({
                    title: "Error",
                    description: "Failed to initialize verification interface. Please try again.",
                    variant: "destructive",
                });
            }
        };

        initSdk();

        return () => {
            if (sdkInstance && typeof sdkInstance.destroy === 'function') {
                try {
                    sdkInstance.destroy();
                } catch (err) {
                    console.warn('[IdentityComplianceCard] Error destroying SDK instance:', err);
                }
            }
        };
    }, [kycOpen, kycToken, toast, router]);

    const kycButtonText =
        kycStatus === "pending"
            ? "Continue verification"
            : kycStatus === "rejected"
                ? "Retry verification"
                : "Start verification";

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
                        To use your registered office address, you need to complete identity verification (KYC).
                    </p>

                    {/* KYC */}
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
                                Identity Check (KYC)
                            </div>
                            {compliance.isKycApproved ? (
                                <p className="text-sm text-green-700 dark:text-green-300">✓ Completed</p>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Complete identity verification with Sumsub. This is required for UK AML compliance.
                                    </p>
                                    {error && (
                                        <p className="mt-1 mb-2 text-xs text-red-600 dark:text-red-400">
                                            {error}
                                        </p>
                                    )}
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
                </CardContent>
            </Card>

            {/* KYC Dialog */}
            <Dialog open={kycOpen} onOpenChange={setKycOpen}>
                <DialogContent className="max-w-2xl w-full h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Identity Verification</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                        {/* Sumsub will inject its UI into this container */}
                        <div id="sumsub-websdk-container" className="w-full h-full" />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

