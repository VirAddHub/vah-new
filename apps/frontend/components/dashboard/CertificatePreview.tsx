'use client';

import { useMemo } from 'react';

interface CertificatePreviewProps {
    /**
     * Company name (e.g., "Virtual Address Hub Ltd")
     */
    companyName?: string;
    /**
     * Date of issue (e.g., "5 February 2026")
     * If not provided, will use current date formatted
     */
    dateOfIssue?: string;
}

/**
 * Certificate Preview Component
 * Displays the Business Address Confirmation certificate in a professional format
 * Matches the design spec exactly while keeping all wording/content unchanged
 */
export function CertificatePreview({ 
    companyName = 'Virtual Address Hub Ltd',
    dateOfIssue 
}: CertificatePreviewProps) {
    // Format date if not provided
    const formattedDate = useMemo(() => {
        if (dateOfIssue) return dateOfIssue;
        const date = new Date();
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }, [dateOfIssue]);

    const registeredOfficeAddress = 'Second Floor, Tanner Place, 54–58 Tanner Street, London SE1 3PH, United Kingdom';

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 md:p-8">
            {/* Letter card - max width 896px (max-w-4xl) */}
            <div className="w-full max-w-4xl bg-white shadow-lg flex flex-col">
                {/* Header row - 2px solid black bottom border */}
                <div className="px-12 py-8 border-b-2 border-black">
                    <div className="flex items-center justify-between">
                        {/* Logo placeholder - height 32px */}
                        <div className="h-8 w-auto">
                            {/* You can replace this with actual logo image */}
                            <div className="h-8 w-32 bg-neutral-200 rounded flex items-center justify-center">
                                <span className="text-xs text-neutral-500 font-medium">VAH Logo</span>
                            </div>
                        </div>
                        {/* Date - right aligned */}
                        <div className="text-sm text-[#4b5563] text-right">
                            Date: {formattedDate}
                        </div>
                    </div>
                </div>

                {/* Main content block - flex-grow */}
                <div className="flex-grow px-12 py-10">
                    {/* Title area */}
                    <div className="mb-10">
                        <h1 className="text-2xl font-semibold text-[#111827] tracking-tight mb-0">
                            Business Address Confirmation
                        </h1>
                        <p className="text-sm text-[#6b7280] mt-1">
                            Verified details
                        </p>
                    </div>

                    {/* Verified details section: desktop 2-col (label | value), mobile stacked */}
                    <div className="space-y-4 pb-8 mb-10 border-b border-[#e5e7eb]">
                        <div className="flex flex-col md:flex-row md:items-baseline gap-y-1 md:gap-x-8">
                            <div className="md:w-[200px] md:shrink-0 text-sm font-semibold text-[#374151] leading-snug">
                                Registered Office Address
                            </div>
                            <div className="text-sm text-[#111827] leading-relaxed min-w-0 break-words">
                                {registeredOfficeAddress}
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-baseline gap-y-1 md:gap-x-8">
                            <div className="md:w-[200px] md:shrink-0 text-sm font-semibold text-[#374151] leading-snug">
                                Authorised Company
                            </div>
                            <div className="text-sm text-[#111827] leading-relaxed min-w-0">
                                {companyName}
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-baseline gap-y-1 md:gap-x-8">
                            <div className="md:w-[200px] md:shrink-0 text-sm font-semibold text-[#374151] leading-snug">
                                Date of issue
                            </div>
                            <div className="text-sm text-[#111827] leading-relaxed min-w-0">
                                {formattedDate}
                            </div>
                        </div>
                    </div>

                    {/* Body paragraph section - exact wording */}
                    <p className="text-sm leading-7 text-[#1f2937] mb-12">
                        This letter confirms that the above-named company is authorised to use the address stated above
                        as its Registered Office Address for Companies House and for the receipt of official
                        correspondence from HM Revenue & Customs (HMRC). The address may also be used as the
                        company's business address. This authorisation does not imply physical occupation of the
                        premises.
                    </p>

                    {/* Signature block */}
                    <div className="pt-8">
                        <p className="text-sm mb-6 text-[#111827]">
                            Sincerely
                        </p>
                        <p className="text-base font-semibold text-[#111827]">
                            VirtualAddressHub Customer Support
                        </p>
                    </div>
                </div>

                {/* Footer - mt-auto, background #f9fafb */}
                <div className="mt-auto bg-[#f9fafb] border-t border-[#e5e7eb] px-12 py-6 text-center text-xs text-[#4b5563] leading-relaxed">
                    <div>VirtualAddressHub Ltd</div>
                    <div className="mt-1">{registeredOfficeAddress}</div>
                    <div className="mt-1">support@virtualaddresshub.co.uk · www.virtualaddresshub.co.uk</div>
                    <div className="mt-1">Registered in England</div>
                </div>
            </div>
        </div>
    );
}
