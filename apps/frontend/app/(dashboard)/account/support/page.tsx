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

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Email Support */}
                <Card className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold text-neutral-900">
                                Email Support
                            </h2>
                        </div>
                        <p className="text-base text-neutral-600 leading-relaxed mb-4">
                            Send us an email and we'll get back to you. We usually respond within 24 hours.
                        </p>
                        <div className="space-y-2 mb-4">
                            <p className="text-sm text-neutral-700">
                                <span className="font-medium">Account:</span> support@virtualaddresshub.co.uk
                            </p>
                            <p className="text-sm text-neutral-700">
                                <span className="font-medium">General:</span> virtualaddress@gmail.com
                            </p>
                        </div>
                        <Button
                            onClick={() => window.location.href = 'mailto:support@virtualaddresshub.co.uk'}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Send Email
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                {/* WhatsApp Support */}
                <Card className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold text-neutral-900">
                                WhatsApp Support
                            </h2>
                        </div>
                        <p className="text-base text-neutral-600 leading-relaxed mb-4">
                            Message us on WhatsApp and our support team will respond as soon as possible
                        </p>
                        <div className="space-y-2 mb-4">
                            <p className="text-sm text-neutral-600">
                                Available: Mon – Fri, 8:00 AM – 6:00 PM
                            </p>
                        </div>
                        <Button
                            onClick={() => window.open('https://wa.me/447000000000', '_blank', 'noopener,noreferrer')}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Chat on WhatsApp
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Help Center */}
            <Card className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold text-neutral-900">
                            Help Center
                        </h2>
                    </div>
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
                </CardContent>
            </Card>
        </div>
    );
}
