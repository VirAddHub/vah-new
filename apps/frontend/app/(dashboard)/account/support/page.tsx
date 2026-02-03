'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, HelpCircle, ArrowRight } from 'lucide-react';

export default function AccountSupportPage() {
    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-4xl lg:text-5xl font-semibold leading-tight tracking-tight text-neutral-900 mb-4">
                    Support
                </h1>
                <p className="text-lg text-neutral-600 leading-relaxed">
                    Get help and contact our support team
                </p>
            </div>

            {/* Support Options List */}
            <div className="space-y-4">
                {/* Email Support */}
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-neutral-200 bg-white">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                Email Support
                            </h2>
                        <p className="text-base text-neutral-600 leading-relaxed mb-3">
                            Send us an email and we'll get back to you. We usually respond within 24 hours.
                        </p>
                        <div className="space-y-1 mb-4">
                            <p className="text-sm text-neutral-700">
                                <span className="font-medium">Account:</span> support@virtualaddresshub.co.uk
                            </p>
                            <p className="text-sm text-neutral-700">
                                <span className="font-medium">General:</span> virtualaddress@gmail.com
                            </p>
                        </div>
                        <Button
                            onClick={() => window.location.href = 'mailto:support@virtualaddresshub.co.uk'}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Send Email
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>

                {/* WhatsApp Support */}
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-neutral-200 bg-white">
                    <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                WhatsApp Support
                            </h2>
                        <p className="text-base text-neutral-600 leading-relaxed mb-3">
                            Message us on WhatsApp and our support team will respond as soon as possible
                        </p>
                        <p className="text-sm text-neutral-600 mb-4">
                                Available: Mon – Fri, 8:00 AM – 6:00 PM
                            </p>
                        <Button
                            onClick={() => window.open('https://wa.me/447000000000', '_blank', 'noopener,noreferrer')}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Chat on WhatsApp
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
            </div>

            {/* Help Center */}
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-neutral-200 bg-white">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                            Help Center
                        </h2>
                        <p className="text-base text-neutral-600 leading-relaxed mb-4">
                        Browse our help articles and frequently asked questions
                    </p>
                    <Button
                        onClick={() => window.location.href = '/help'}
                        variant="outline"
                            className="border-primary text-primary hover:bg-primary/10"
                    >
                        Visit Help Center
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
