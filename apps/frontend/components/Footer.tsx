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
        "block w-full text-left text-sm leading-tight font-medium text-neutral-700 hover:text-neutral-900 transition-colors";

    // Standardized to "Help Centre" for consistency across all pages
    const navigation: NavItem[] = [
        { label: "Pricing", page: "pricing" },
        { label: "Blog", page: "blog" },
        { label: "Help Centre", page: "help" },
    ];

    const legal: NavItem[] = [
        { label: "Privacy Policy", page: "privacy" },
        { label: "Terms of Service", page: "terms" },
        { label: "KYC Policy", page: "kyc" },
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
            className="pt-8 pb-8 text-neutral-700 lg:pt-16 lg:pb-10"
            style={{
                fontFamily: 'Inter, sans-serif',
            }}
        >
            <div className="mx-auto max-w-7xl px-8">
                {/* Mobile/Tablet Footer (< 1024px) */}
                <div className="flex flex-col items-center text-center lg:hidden">
                    <div className="mb-4">
                        <VAHLogo
                            onNavigate={onNavigate}
                            size="lg"
                        />
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm">
                        {navigation.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                        {legal.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">
                        © 2026 VirtualAddressHub. All rights reserved.
                    </p>
                </div>

                {/* Desktop Footer (≥ 1024px) */}
                <div className="hidden lg:block">
                    {/* Main Footer Grid */}
                    <div className="grid grid-cols-4 gap-6">
                        {/* Company Information - Left Column */}
                        <div>
                            <div className="mb-3">
                                <VAHLogo
                                    onNavigate={onNavigate}
                                    size="lg"
                                />
                            </div>
                            <p className="mb-1 text-sm leading-tight text-neutral-700">
                                Professional virtual address for UK businesses.
                            </p>
                            <p className="text-sm leading-tight text-neutral-700">
                                Central London, UK
                            </p>
                        </div>

                        {/* Navigation */}
                        <div>
                            <h3 className="mb-1.5 text-sm font-semibold text-[#206039]">Navigation</h3>
                            <div className="space-y-0.5">
                                {navigation.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Legal & Compliance */}
                        <div>
                            <h3 className="mb-1.5 text-sm font-semibold text-[#206039]">Legal & Compliance</h3>
                            <div className="space-y-0.5">
                                {legal.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Contact us - heading is the link */}
                        <div>
                            <button
                                type="button"
                                onClick={() => handleNavClick('contact')}
                                className="text-sm font-semibold text-emerald-800 hover:text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 rounded-sm transition-colors"
                            >
                                Contact us
                            </button>
                        </div>
                    </div>

                    {/* Regulatory Info - Secondary Row */}
                    <div className="mt-5 pt-3 border-t border-neutral-200">
                        <div className="text-xs text-neutral-600 leading-tight">
                            <span className="font-medium">HMRC AML:</span> XRML00000123456 • 
                            <span className="font-medium"> ICO:</span> ZA123456
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-3 pt-2 border-t border-neutral-200 text-center text-sm text-neutral-600">
                        © 2026 VirtualAddressHub. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
