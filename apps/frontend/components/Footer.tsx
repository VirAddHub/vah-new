"use client";

import React from "react";

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
        "block w-full text-left text-xs sm:text-sm leading-relaxed font-medium text-white/90 hover:text-white transition-colors";

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
            className="bg-[#0b4d3c] py-6 text-white"
            style={{
                fontFamily:
                    "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
            }}
        >
            <div className="mx-auto max-w-7xl px-8">
                {/* Mobile/Tablet Footer (< 1024px) */}
                <div className="flex flex-col items-center text-center lg:hidden">
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs sm:gap-x-4 sm:gap-y-1.5 sm:text-sm">
                        {navigation.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                        {legal.map((item) => (
                            <QuickLink key={item.label} item={item} />
                        ))}
                    </div>
                    <p className="mt-2 text-[10px] text-white/80 sm:mt-2 sm:text-xs">
                        © 2026 VirtualAddress.UK. All rights reserved.
                    </p>
                </div>

                {/* Desktop Footer (≥ 1024px) */}
                <div className="hidden lg:block">
                    <div className="grid gap-6 md:grid-cols-4">
                        {/* Company Information */}
                        <div className="lg:col-span-1">
                            <p className="mb-2 text-xs leading-relaxed text-white/90">
                                Professional virtual address for UK business. Fully compliant.
                            </p>

                            {/* Location */}
                            <div className="mb-2">
                                <h3 className="mb-1 text-xs font-semibold text-white">Location</h3>
                                <p className="text-xs text-white/90">London, UK</p>
                            </div>

                            {/* Regulatory Info */}
                            <div>
                                <h3 className="mb-1 text-xs font-semibold text-white">Regulatory Info</h3>
                                <div className="space-y-0.5 text-xs leading-snug text-white/85">
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
                            <h3 className="mb-1.5 text-xs font-semibold text-white">Navigation</h3>
                            <div className="space-y-0.5">
                                {navigation.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Legal & Compliance */}
                        <div>
                            <h3 className="mb-1.5 text-xs font-semibold text-white">Legal & Compliance</h3>
                            <div className="space-y-0.5">
                                {legal.map((item) => (
                                    <QuickLink key={item.label} item={item} />
                                ))}
                            </div>
                        </div>

                        {/* Contact Us */}
                        <div>
                            <h3 className="mb-1.5 text-xs font-semibold text-white">Contact Us</h3>
                            <div className="space-y-2">
                                {/* WhatsApp Support Button */}
                                <button
                                    onClick={() => window.open("https://wa.me/447000000000", "_blank", "noopener,noreferrer")}
                                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md bg-[#40C46C] text-white text-xs font-medium hover:bg-[#40C46C]/90 transition-colors"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    WhatsApp Support
                                </button>
                                
                                {/* Contact Us Link */}
                                <button
                                    onClick={() => handleNavClick('contact')}
                                    className="block w-full text-left text-xs font-medium text-white/90 hover:text-white transition-colors"
                                >
                                    Contact us
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Copyright for Desktop */}
                    <div className="mt-3 border-t border-white/10 pt-2 text-center text-xs text-white/60">
                        <div>
                            © 2026 VirtualAddress.UK. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
