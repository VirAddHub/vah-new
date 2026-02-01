'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, HelpCircle, ArrowRight } from 'lucide-react';

export default function AccountSupportPage() {
    return (
        <div className="w-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-[54px] font-semibold leading-[1.2] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Support
                </h1>
                <p className="text-[18px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Get help and contact our support team
                </p>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Email Support */}
                <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="w-6 h-6 text-[#024E40]" />
                            <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Email Support
                            </h2>
                        </div>
                        <p className="text-[16px] font-normal leading-[1.4] text-[#666666] mb-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Send us an email and we'll get back to you. We usually respond within 24 hours.
                        </p>
                        <div className="space-y-2 mb-6">
                            <p className="text-[14px] font-normal leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                <span className="font-medium text-[#1A1A1A]">Account:</span> support@virtualaddresshub.co.uk
                            </p>
                            <p className="text-[14px] font-normal leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                <span className="font-medium text-[#1A1A1A]">General:</span> virtualaddress@gmail.com
                            </p>
                        </div>
                        <Button
                            onClick={() => window.location.href = 'mailto:support@virtualaddresshub.co.uk'}
                            className="w-full bg-[#206039] text-white hover:bg-[#1a4d2e]"
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        >
                            Send Email
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                {/* WhatsApp Support */}
                <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageCircle className="w-6 h-6 text-[#206039]" />
                            <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                WhatsApp Support
                            </h2>
                        </div>
                        <p className="text-[16px] font-normal leading-[1.4] text-[#666666] mb-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Message us on WhatsApp and our support team will respond as soon as possible
                        </p>
                        <div className="space-y-2 mb-6">
                            <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Available: Mon – Fri, 8:00 AM – 6:00 PM
                            </p>
                        </div>
                        <Button
                            onClick={() => window.open('https://wa.me/447000000000', '_blank', 'noopener,noreferrer')}
                            className="w-full bg-[#206039] text-white hover:bg-[#1a4d2e]"
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        >
                            Chat on WhatsApp
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Help Center */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white">
                <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <HelpCircle className="w-6 h-6 text-[#024E40]" />
                        <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Help Center
                        </h2>
                    </div>
                    <p className="text-[16px] font-normal leading-[1.4] text-[#666666] mb-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                        Browse our help articles and frequently asked questions
                    </p>
                    <Button
                        onClick={() => window.location.href = '/help'}
                        variant="outline"
                        className="border-[#206039] text-[#024E40] hover:bg-[#206039]/10"
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        Visit Help Center
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
