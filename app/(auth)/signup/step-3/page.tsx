'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function SignupStep3() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleComplete = () => {
        // TODO: Process payment and complete signup
        router.push('/dashboard');
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

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                    <Button onClick={handleComplete} disabled={busy}>
                        {busy ? 'Processing…' : 'Complete Signup'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
