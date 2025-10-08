"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { X, CreditCard, Calendar, CheckCircle, Truck } from "lucide-react";

interface ForwardingConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    mailItem: any;
    userProfile: any;
    onConfirm: (paymentMethod: 'monthly' | 'gocardless') => Promise<void>;
}

export function ForwardingConfirmationModal({
    isOpen,
    onClose,
    mailItem,
    userProfile,
    onConfirm
}: ForwardingConfirmationModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'monthly' | 'gocardless' | null>(null);
    const [userPlan, setUserPlan] = useState<any>(null);

    // Determine user's plan type
    useEffect(() => {
        if (userProfile) {
            // Check if user has a yearly plan (no monthly billing)
            const hasYearlyPlan = userProfile.plan_type === 'yearly' || userProfile.billing_frequency === 'yearly';
            setUserPlan({
                type: hasYearlyPlan ? 'yearly' : 'monthly',
                name: userProfile.plan_name || 'Standard Plan'
            });

            // Auto-select payment method based on plan
            setSelectedPaymentMethod(hasYearlyPlan ? 'gocardless' : 'monthly');
        }
    }, [userProfile]);

    const handleConfirm = async () => {
        if (!selectedPaymentMethod) return;

        setIsProcessing(true);
        try {
            await onConfirm(selectedPaymentMethod);
            onClose();
        } catch (error) {
            console.error('Error processing forwarding request:', error);
            alert('Failed to process forwarding request. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const isGovernmentMail = mailItem?.sender_name?.toLowerCase().includes('hmrc') ||
        mailItem?.sender_name?.toLowerCase().includes('companies house') ||
        mailItem?.subject?.toLowerCase().includes('hmrc') ||
        mailItem?.subject?.toLowerCase().includes('companies house');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Confirm Mail Forwarding
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Mail Item Details */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Mail Item Details</h4>
                        <div className="space-y-1 text-sm">
                            <p><strong>Subject:</strong> {mailItem?.subject || mailItem?.description || "No subject"}</p>
                            <p><strong>From:</strong> {mailItem?.sender_name || "Unknown sender"}</p>
                            <p><strong>Received:</strong> {mailItem?.created_at ? new Date(Number(mailItem.created_at)).toLocaleDateString() : "Unknown date"}</p>
                            {isGovernmentMail && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">
                                    Official Mail - Free Forwarding
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Forwarding Address */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-sm text-blue-700 mb-2">Forwarding Address</h4>
                        <pre className="text-sm text-blue-800 whitespace-pre-line">
                            {userProfile?.forwarding_address || "No forwarding address configured"}
                        </pre>
                        <p className="text-xs text-blue-600 mt-2">
                            This address will be used for forwarding. Update it in your Profile if needed.
                        </p>
                    </div>

                    {/* Pricing Information */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm">Pricing & Payment</h4>

                        {isGovernmentMail ? (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Free Forwarding:</strong> This appears to be official mail (HMRC, Companies House, etc.) and will be forwarded at no charge.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">Forwarding Fee</span>
                                        <span className="text-lg font-bold">£2.00</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        This fee covers processing, packaging, and postage for your mail item.
                                    </p>
                                </div>

                                {/* Payment Method Selection */}
                                <div className="space-y-3">
                                    <h5 className="font-medium text-sm">Payment Method</h5>

                                    {userPlan?.type === 'monthly' ? (
                                        <div className="space-y-2">
                                            <div
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaymentMethod === 'monthly'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                onClick={() => setSelectedPaymentMethod('monthly')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${selectedPaymentMethod === 'monthly'
                                                            ? 'border-primary bg-primary'
                                                            : 'border-gray-300'
                                                        }`}>
                                                        {selectedPaymentMethod === 'monthly' && (
                                                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            <span className="font-medium">Add to Monthly Bill</span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            £2.00 will be added to your next monthly invoice
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPaymentMethod === 'gocardless'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                onClick={() => setSelectedPaymentMethod('gocardless')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${selectedPaymentMethod === 'gocardless'
                                                            ? 'border-primary bg-primary'
                                                            : 'border-gray-300'
                                                        }`}>
                                                        {selectedPaymentMethod === 'gocardless' && (
                                                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4" />
                                                            <span className="font-medium">Pay Now with GoCardless</span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            £2.00 will be charged immediately via direct debit
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Plan Information */}
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <strong>Your Plan:</strong> {userPlan?.name} ({userPlan?.type === 'yearly' ? 'Yearly' : 'Monthly'})
                                    </p>
                                    {userPlan?.type === 'yearly' && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Since you're on a yearly plan, payment will be processed immediately via GoCardless.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!selectedPaymentMethod || isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Truck className="h-4 w-4 mr-2" />
                                    {isGovernmentMail ? 'Request Free Forwarding' : 'Confirm & Pay £2.00'}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
