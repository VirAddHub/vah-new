"use client";

import React from "react";
import Link from "next/link";
import { VAHLogo } from "./VAHLogo";
import { AmbientFooter } from "@/components/homepage/HomepageAtmosphere";

interface FooterProps {
    onNavigate?: (page: string) => void;
}

type NavItem = {
    label: string;
    page?: string;
    href?: string;
    external?: boolean;
};

/** Marketing routes — single source of truth so Navigation always matches product. */
const PRIMARY_NAV_LINKS: { href: string; label: string }[] = [
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About us" },
    { href: "/blog", label: "Blog" },
    { href: "/help", label: "Help Centre" },
    { href: "/contact", label: "Contact us" },
];

export function Footer({ onNavigate }: FooterProps) {
    const linkBtnClass =
        "block w-full text-left text-body-sm leading-tight font-medium text-foreground hover:text-foreground transition-colors";
    /** Inline row on small screens (wrap); avoid `w-full` so links sit on one line where space allows */
    const linkInlineClass =
        "text-body-sm font-medium text-foreground hover:text-foreground transition-colors";

    function hrefForPage(page: string): string {
        if (page === "home") return "/";
        if (page === "kyc") return "/kyc";
        return `/${page}`;
    }

    const legal: NavItem[] = [
        { label: "Privacy Policy", page: "privacy" },
        { label: "Terms of Service", page: "terms" },
        { label: "KYC Policy", page: "kyc" },
    ];

    const LegalLink = ({ item }: { item: NavItem }) => {
        if (item.page) {
            return (
                <Link href={hrefForPage(item.page)} className={linkBtnClass}>
                    {item.label}
                </Link>
            );
        }
        if (item.href) {
            return (
                <button
                    type="button"
                    onClick={() => {
                        if (item.external) {
                            window.open(
                                item.href!,
                                "_blank",
                                "noopener,noreferrer",
                            );
                        } else {
                            window.location.href = item.href!;
                        }
                    }}
                    className={linkBtnClass}
                >
                    {item.label}
                </button>
            );
        }
        return (
            <span
                className={linkBtnClass.replace(
                    "hover:text-primary-foreground",
                    "",
                )}
            >
                {item.label}
            </span>
        );
    };

    return (
        <footer className="relative overflow-hidden border-t border-border/80 bg-muted/90 pt-8 pb-8 text-foreground lg:pt-16 lg:pb-10">
            <AmbientFooter />
            <div className="relative z-10 mx-auto max-w-7xl px-8">
                {/* Mobile/Tablet Footer (< 1024px) */}
                <div className="flex flex-col items-center text-center lg:hidden">
                    <div className="mb-4">
                        <VAHLogo
                            onNavigate={onNavigate}
                            size="lg"
                        />
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-body-sm">
                        {PRIMARY_NAV_LINKS.map(({ href, label }) => (
                            <Link key={href} href={href} className={linkInlineClass}>
                                {label}
                            </Link>
                        ))}
                        {legal.map((item) =>
                            item.page ? (
                                <Link
                                    key={item.label}
                                    href={hrefForPage(item.page)}
                                    className={linkInlineClass}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <LegalLink key={item.label} item={item} />
                            ),
                        )}
                    </div>
                    <p className="mt-2 text-body-sm text-muted-foreground">
                        © 2026 VirtualAddressHub. All rights reserved.
                    </p>
                </div>

                {/* Desktop Footer (≥ 1024px) */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-4 gap-6">
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

                        <div>
                            <h3 className="mb-1.5 text-body-sm font-semibold text-primary">Navigation</h3>
                            <nav aria-label="Site pages" className="space-y-0.5">
                                {PRIMARY_NAV_LINKS.map(({ href, label }) => (
                                    <Link key={href} href={href} className={linkBtnClass}>
                                        {label}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        <div>
                            <h3 className="mb-1.5 text-body-sm font-semibold text-primary">Legal & Compliance</h3>
                            <div className="space-y-0.5">
                                {legal.map((item) => (
                                    <LegalLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-body-sm font-semibold text-primary">Contact us</p>
                            <p className="text-body-sm text-muted-foreground">
                                Need help or have a question? We&apos;re here.
                            </p>
                            <Link
                                href="/contact"
                                className="inline-flex w-fit items-center justify-center rounded-xl bg-primary px-4 py-2 text-body-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                Contact support
                            </Link>
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border">
                        <div className="text-caption text-muted-foreground leading-tight">
                            <span className="font-medium">HMRC AML:</span> XRML00000123456 • 
                            <span className="font-medium"> ICO:</span> ZA123456
                        </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border text-center text-body-sm text-muted-foreground">
                        © 2026 VirtualAddressHub. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
