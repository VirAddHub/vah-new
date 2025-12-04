"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

type KycStatus = "not_started" | "pending" | "approved" | "rejected" | null;

interface KycBannerProps {
    kycStatus: KycStatus;
}

declare global {
    interface Window {
        SNSWebSdk?: any;
    }
}

export function KycBanner({ kycStatus }: KycBannerProps) {
    const [starting, setStarting] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // If approved, don't show banner
    if (kycStatus === "approved") {
        return null;
    }

    const startKyc = async () => {
        setStarting(true);
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
                setToken(data.token);
                setOpen(true);
            } else {
                toast({
                    title: "Error",
                    description: data.message || "Failed to start verification. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("[KycBanner] Error starting KYC:", error);
            toast({
                title: "Error",
                description: "Failed to start verification. Please try again.",
                variant: "destructive",
            });
        } finally {
            setStarting(false);
        }
    };

    // Load Sumsub WebSDK script
    useEffect(() => {
        if (!open || !token) return;

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
                console.error("[KycBanner] Failed to load Sumsub SDK");
                toast({
                    title: "Error",
                    description: "Failed to load verification interface. Please refresh and try again.",
                    variant: "destructive",
                });
            };
            document.body.appendChild(script);

            return () => {
                // Cleanup: remove script if component unmounts
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
                const snsWebSdk = window.SNSWebSdk.init(token, {
                    lang: "en",
                })
                    .withConf({ lang: "en" })
                    .on("onError", (e: any) => {
                        console.error("[KycBanner] Sumsub error:", e);
                        toast({
                            title: "Verification Error",
                            description: e.message || "An error occurred during verification.",
                            variant: "destructive",
                        });
                    })
                    .on("onReady", () => {
                        console.log("[KycBanner] Sumsub ready");
                    })
                    .on("onStepCompleted", () => {
                        console.log("[KycBanner] Step completed");
                    })
                    .on("onApplicantSubmitted", () => {
                        console.log("[KycBanner] Applicant submitted");
                        // Close dialog and show success message
                        setOpen(false);
                        toast({
                            title: "Verification Submitted",
                            description: "Your identity verification has been submitted. We'll review it shortly.",
                        });
                        // Refresh page to update status
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    })
                    .build();

                snsWebSdk.launch("#sumsub-root");
            } catch (error) {
                console.error("[KycBanner] Failed to initialize Sumsub:", error);
                toast({
                    title: "Error",
                    description: "Failed to initialize verification interface. Please try again.",
                    variant: "destructive",
                });
            }
        };

        loadSumsubSDK();
    }, [open, token, toast]);

    const buttonText =
        kycStatus === "pending"
            ? "Continue verification"
            : kycStatus === "rejected"
            ? "Retry verification"
            : "Start verification";

    return (
        <>
            <div className="rounded-xl p-4 border border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400 mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                            Identity Verification Required
                        </div>
                        <div className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                            You must complete identity verification (KYC) to fully activate your London address
                            and access all features. This is required for UK anti-money laundering (AML) compliance.
                            {kycStatus === "rejected" && (
                                <span className="block mt-1 font-medium">
                                    Your previous verification attempt was unsuccessful. Please try again.
                                </span>
                            )}
                        </div>
                        <Button
                            onClick={startKyc}
                            disabled={starting}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {starting ? "Starting..." : buttonText}
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
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

