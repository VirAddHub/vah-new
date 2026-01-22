"use client";

import React from "react";
import { VAHLogo } from "./VAHLogo";

interface FooterProps {
    onNavigate?: (page: string) => void;
}

type NavItem = {
    label: string;
    page?: string;
    href?: string;
    external?: boolean;
};

export function Footer({ onNavigate }: FooterProps) {
    const handleNavClick = (
        page?: string,
        href?: string,
        external?: boolean,
    ) => {
        if (page && onNavigate) {
            onNavigate(page);
            return;
        }
        if (href) {
            if (external)
                window.open(href, "_blank", "noopener,noreferrer");
            else window.location.href = href;
        }
    };

    const linkBtnClass =
        "block w-full text-left text-sm md:text-base leading-relaxed font-medium text-white/90 hover:text-white transition-colors";

    const navigation: NavItem[] = [
        { label: "Price", page: "pricing" },
        { label: "Blog", page: "blog" },
        { label: "Help Center", page: "help" },
    ];

    const legal: NavItem[] = [
        { label: "Privacy Policy", page: "privacy" },
        { label: "Terms & Service", page: "terms" },
        { label: "KYC policy", page: "kyc" },
    ];

    const QuickLink = ({ item }: { item: NavItem }) =>
        item.page || item.href ? (
            <button
                onClick={() =>
                    handleNavClick(item.page, item.href, item.external)
                }
                className={linkBtnClass}
            >
                {item.label}
            </button>
        ) : (
            <span className="block text-sm md:text-base leading-relaxed text-white/90">
                {item.label}
            </span>
        );

    return (
        <footer className="bg-[#0d4a3d] text-white">
            <div className="safe-pad mx-auto max-w-screen-xl py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {/* Company Information */}
                    <div className="lg:col-span-1">
                        <div className="mb-4">
                            <VAHLogo onNavigate={onNavigate} size="lg" />
                        </div>
                        <p className="text-sm md:text-base text-white/90 leading-relaxed mb-6">
                            Professional virtual address for UK business. Fully compliant.
                        </p>
                        
                        {/* Location */}
                        <div className="mb-6">
                            <h3 className="text-sm md:text-base font-semibold text-white mb-3">Location</h3>
                            <p className="text-sm md:text-base text-white/90">London, UK</p>
                        </div>

                        {/* Regulatory Info */}
                        <div>
                            <h3 className="text-sm md:text-base font-semibold text-white mb-3">Regulatory Info</h3>
                            <div className="space-y-2 text-xs md:text-sm text-white/90 leading-relaxed">
                                <div>
                                    <span className="font-medium">Company :</span> London Business Address Ltd
                                </div>
                                <div>
                                    <span className="font-medium">Company No :</span> 12345678
                                </div>
                                <div>
                                    <span className="font-medium">VAT :</span> GB123456789
                                </div>
                                <div>
                                    <span className="font-medium">HMRC AML :</span> XRML00000123456
                                </div>
                                <div>
                                    <span className="font-medium">ICO :</span> ZA123456
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-white mb-4">Navigation</h3>
                        <div className="space-y-2">
                            {navigation.map((item) => (
                                <QuickLink key={item.label} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Legal & Compliance */}
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-white mb-4">Legal & Compliance</h3>
                        <div className="space-y-2">
                            {legal.map((item) => (
                                <QuickLink key={item.label} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Contact Us */}
                    <div>
                        <h3 className="text-sm md:text-base font-semibold text-white mb-4">Contact Us</h3>
                        <div className="space-y-3 text-sm md:text-base text-white/90">
                            <div>
                                <p>(888) 555-3766</p>
                            </div>
                            <div>
                                <p>virtualaddress@gmail.com</p>
                            </div>
                        </div>

                        {/* Business Hours */}
                        <div className="mt-6">
                            <h3 className="text-sm md:text-base font-semibold text-white mb-3">Business Hours</h3>
                            <p className="text-sm md:text-base text-white/90">Mon - Fri : 8:00 AM - 6:00 PM</p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 mt-8 border-t border-white/20">
                    <div className="text-center text-sm text-white/80">
                        © 2026 VirtualAddress.UK. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
