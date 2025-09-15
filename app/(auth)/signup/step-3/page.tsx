'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

function SignupStep3Content() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [busy, setBusy] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('professional');

    // Handle return from GoCardless
    useEffect(() => {
        const success = searchParams.get('success');
        const sessionId = searchParams.get('session_id');

        if (success === '1' && sessionId) {
            handlePaymentConfirm(sessionId);
        }
    }, [searchParams]);

    const handlePaymentConfirm = async (sessionId: string) => {
        setBusy(true);
        try {
            const response = await fetch('/api/bff/gocardless/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });

            if (response.ok) {
                router.push('/dashboard');
            } else {
                alert('Payment confirmation failed');
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert('Payment confirmation failed');
        } finally {
            setBusy(false);
        }
    };

    const handleSetUpPayment = async () => {
        setBusy(true);
        try {
            const response = await fetch('/api/bff/gocardless/create', {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok && data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                alert('Failed to set up payment');
            }
        } catch (error) {
            console.error('Error setting up payment:', error);
            alert('Failed to set up payment');
        } finally {
            setBusy(false);
        }
    };

    const handleBack = () => {
        router.push('/signup/step-2');
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <h1 className="text-2xl font-semibold mb-6">Choose your plan</h1>

            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h2 className="text-xl font-medium mb-4">Virtual Address Plans</h2>
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                            <h3 className="font-medium">Basic Plan - £9.99/month</h3>
                            <p className="text-sm text-gray-600">Perfect for small businesses</p>
                            <ul className="text-sm text-gray-600 mt-2 space-y-1">
                                <li>• Virtual business address</li>
                                <li>• Mail forwarding (5 items/month)</li>
                                <li>• Basic support</li>
                            </ul>
                        </div>
                        <div className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-medium">Professional Plan - £19.99/month</h3>
                            <p className="text-sm text-gray-600">Most popular choice</p>
                            <ul className="text-sm text-gray-600 mt-2 space-y-1">
                                <li>• Virtual business address</li>
                                <li>• Mail forwarding (20 items/month)</li>
                                <li>• Priority support</li>
                                <li>• Document scanning</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium text-yellow-800">Free HMRC/Companies House Forwarding</h3>
                    <p className="text-sm text-yellow-700">
                        All plans include free forwarding of official HMRC and Companies House correspondence.
                    </p>
                </div>

                {/* Payment Setup */}
                <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Set up Direct Debit</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Complete your signup by setting up secure Direct Debit payments.
                        You can cancel or change your plan at any time.
                    </p>
                    <Button onClick={handleSetUpPayment} disabled={busy} className="w-full">
                        {busy ? 'Setting up…' : 'Set up Direct Debit'}
                    </Button>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                    <div className="text-sm text-gray-500">
                        Complete payment to finish signup
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupStep3() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupStep3Content />
        </Suspense>
    );
}
