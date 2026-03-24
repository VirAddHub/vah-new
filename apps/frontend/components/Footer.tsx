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
        "block w-full text-left text-body-sm leading-tight font-medium text-foreground hover:text-foreground transition-colors";

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
            <span className={linkBtnClass.replace('hover:text-primary-foreground', '')}>
                {item.label}
            </span>
        );

    return (
        <footer
            className="pt-8 pb-8 text-foreground lg:pt-16 lg:pb-10"
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
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-body-sm">
                        {navigation.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                        {legal.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                    </div>
                    <p className="mt-2 text-body-sm text-muted-foreground">
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
                            <p className="mb-1 text-body-sm leading-tight text-foreground">
                                Professional virtual address for UK businesses.
                            </p>
                            <p className="text-body-sm leading-tight text-foreground">
                                Central London, UK
                            </p>
                        </div>

                        {/* Navigation */}
                        <div>
                            <h3 className="mb-1.5 text-body-sm font-semibold text-primary">Navigation</h3>
                            <div className="space-y-0.5">
                                {navigation.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Legal & Compliance */}
                        <div>
                            <h3 className="mb-1.5 text-body-sm font-semibold text-primary">Legal & Compliance</h3>
                            <div className="space-y-0.5">
                                {legal.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Contact us - CTA block */}
                        <div className="space-y-3">
                            <p className="text-body-sm font-semibold text-primary">Contact us</p>
                            <p className="text-body-sm text-muted-foreground">
                                Need help or have a question? We&apos;re here.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleNavClick('contact')}
                                    className="inline-flex w-fit items-center justify-center rounded-xl bg-primary px-4 py-2 text-body-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    Contact support
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNavClick('help')}
                                    className="inline-flex w-fit text-left text-body-sm font-medium text-foreground underline-offset-4 hover:underline"
                                >
                                    Visit Help Centre
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Regulatory Info - Secondary Row */}
                    <div className="mt-5 pt-3 border-t border-border">
                        <div className="text-caption text-muted-foreground leading-tight">
                            <span className="font-medium">HMRC AML:</span> XRML00000123456 • 
                            <span className="font-medium"> ICO:</span> ZA123456
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-3 pt-2 border-t border-border text-center text-body-sm text-muted-foreground">
                        © 2026 VirtualAddressHub. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
