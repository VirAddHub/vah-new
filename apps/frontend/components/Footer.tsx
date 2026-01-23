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
        "block w-full text-left text-xs sm:text-sm md:text-base leading-relaxed font-medium text-white/90 hover:text-white transition-colors";

    const navigation: NavItem[] = [
        { label: "Pricing", page: "pricing" },
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
            <span className={linkBtnClass.replace('hover:text-white', '')}>
                {item.label}
            </span>
        );

    return (
        <footer
            className="bg-[#024E40] text-white"
            style={{
                fontFamily:
                    "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
            }}
        >
            <div className="safe-pad mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-8 sm:py-12 lg:px-16 lg:py-16">
                {/* Mobile/Tablet Footer (< 1024px) */}
                <div className="flex flex-col items-center text-center lg:hidden">
                    <div className="mb-3 sm:mb-4">
                        <VAHLogo
                            onNavigate={onNavigate}
                            size="xl"
                            imgClassName="brightness-0 invert"
                        />
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs sm:gap-x-4 sm:gap-y-2 sm:text-sm">
                        {navigation.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                        {legal.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                    </div>
                    <p className="mt-3 text-[10px] text-white/80 sm:mt-4 sm:text-xs">
                        © 2026 VirtualAddress.UK. All rights reserved.
                    </p>
                </div>

                {/* Desktop Footer (≥ 1024px) */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 xl:gap-12">
                        {/* Company Information */}
                        <div className="lg:col-span-1">
                            <div className="mb-4">
                                <VAHLogo
                                    onNavigate={onNavigate}
                                    size="xl"
                                    imgClassName="brightness-0 invert"
                                />
                            </div>
                            <p className="mb-6 text-sm leading-relaxed text-white/90">
                                Professional virtual address for UK business. Fully compliant.
                            </p>

                            {/* Location */}
                            <div className="mb-6">
                                <h3 className="mb-3 text-sm font-semibold text-white">Location</h3>
                                <p className="text-sm text-white/90">London, UK</p>
                            </div>

                            {/* Regulatory Info */}
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-white">Regulatory Info</h3>
                                <div className="space-y-2 text-xs leading-relaxed text-white/90">
                                    <div>
                                        <span className="font-medium">Company:</span> London Business Address Ltd
                                    </div>
                                    <div>
                                        <span className="font-medium">Company No:</span> 12345678
                                    </div>
                                    <div>
                                        <span className="font-medium">VAT:</span> GB123456789
                                    </div>
                                    <div>
                                        <span className="font-medium">HMRC AML:</span> XRML00000123456
                                    </div>
                                    <div>
                                        <span className="font-medium">ICO:</span> ZA123456
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-white">Navigation</h3>
                            <div className="space-y-2">
                                {navigation.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Legal & Compliance */}
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-white">Legal & Compliance</h3>
                            <div className="space-y-2">
                                {legal.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Contact Us */}
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-white">Contact Us</h3>
                            <div className="space-y-3 text-sm text-white/90">
                                <div>
                                    <p>0808 155 3766</p>
                                </div>
                                <div>
                                    <p>virtualaddress@gmail.com</p>
                                </div>
                            </div>

                            {/* Business Hours */}
                            <div className="mt-6">
                                <h3 className="mb-3 text-sm font-semibold text-white">Business Hours</h3>
                                <p className="text-sm text-white/90">Mon - Fri: 8:00 AM - 6:00 PM</p>
                            </div>
                        </div>
                    </div>

                    {/* Copyright for Desktop */}
                    <div className="mt-8 overflow-hidden rounded-[16px] bg-[#014D3F] py-4">
                        <div className="text-center text-sm text-white/80">
                            © 2026 VirtualAddress.UK. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
