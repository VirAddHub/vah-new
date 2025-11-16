"use client";

import React from "react";

import {
    Mail,
    MessageCircle,
    Clock,
    MapPin,
} from "lucide-react";

interface FooterProps {
    onNavigate?: (page: string) => void;
}

type NavItem = {
    label: string;
    page?: string;
    href?: string;
    external?: boolean;
};

type ContactItem = {
    icon: React.ElementType;
    label: string;
    href: string;
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
        "block w-full text-left text-sm md:text-base leading-relaxed font-medium text-muted-foreground hover:text-primary hover:translate-x-0.5 transition-all p-1 rounded hover:bg-primary/5";

    const navigation: NavItem[] = [
        { label: "Pricing", page: "pricing" },
        { label: "Blog", page: "blog" },
        { label: "Help", page: "help" },
    ];

    const legal: NavItem[] = [
        { label: "Privacy Policy", page: "privacy" },
        { label: "Terms of Service", page: "terms" },
        { label: "KYC Policy", page: "kyc" },
    ];

    const contacts: ContactItem[] = [
        {
            icon: Mail,
            label: "Contact Form",
            href: "#contact-form",
        },
        {
            icon: MessageCircle,
            label: "WhatsApp Support",
            href: "#whatsapp",
        },
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
            <span className="block text-sm md:text-base leading-relaxed text-muted-foreground p-1">
                {item.label}
            </span>
        );

    const ContactTile = ({ c }: { c: ContactItem }) => {
        const Icon = c.icon;

        const handleContactClick = (e: React.MouseEvent) => {
            e.preventDefault();
            if (c.href === "#contact-form") {
                // Navigate to contact form page
                if (onNavigate) {
                    onNavigate("contact");
                }
            } else if (c.href === "#whatsapp") {
                // Open WhatsApp (you can customize this with your WhatsApp number)
                window.open("https://wa.me/447000000000", "_blank", "noopener,noreferrer");
            }
        };

        return (
            <button
                onClick={handleContactClick}
                className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary hover:translate-x-0.5 transition-all p-1 rounded hover:bg-primary/5"
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="truncate leading-tight">{c.label}</span>
                </div>
            </button>
        );
    };

    return (
        <footer className="bg-background border-t border-border/50">
            <div className="mx-auto max-w-7xl px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {/* Company Info */}
                    <div>
                        <button
                            onClick={() => handleNavClick("home")}
                            className="mb-2 text-xl font-semibold text-foreground hover:text-primary transition-colors"
                        >
                            VirtualAddress<span className="text-primary">Hub</span>
                        </button>
                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-prose mb-2">
                            Professional virtual address for UK business. Fully compliant.
                        </p>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                                <span>London, UK</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3 text-primary flex-shrink-0" />
                                <span>Mon–Fri, 9AM–6PM</span>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Support */}
                    <div>
                        <h3 className="mb-2 text-sm lg:text-base leading-tight font-semibold text-primary">
                            Contact & Support
                        </h3>
                        <div className="space-y-0.5">
                            {contacts.map((c) => (
                                <ContactTile key={c.label} c={c} />
                            ))}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h3 className="mb-2 text-sm lg:text-base leading-tight font-semibold text-primary">
                            Navigation
                        </h3>
                        <div className="space-y-0.5">
                            {navigation.map((item) => (
                                <QuickLink key={item.label} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Legal & Compliance */}
                    <div>
                        <h3 className="mb-2 text-sm lg:text-base leading-tight font-semibold text-primary">
                            Legal & Compliance
                        </h3>
                        <div className="space-y-0.5">
                            {legal.map((item) => (
                                <QuickLink key={item.label} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Regulatory Info - Dedicated Section */}
                    <div>
                        <h3 className="mb-2 text-sm lg:text-base leading-tight font-semibold text-primary">
                            Regulatory Info
                        </h3>
                        <div className="space-y-1 text-xs text-muted-foreground leading-tight">
                            <div>
                                <span className="font-medium text-foreground">Company:</span>{" "}
                                <span>VirtualAddress<span className="text-primary">Hub</span> Ltd</span>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Co. No:</span>{" "}
                                <span>[INSERT NUMBER]</span>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">VAT:</span>{" "}
                                <span>[INSERT VAT]</span>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">HMRC AML:</span>{" "}
                                <span>[INSERT AML]</span>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">ICO:</span>{" "}
                                <span>[INSERT ICO]</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-4 mt-4 border-t border-border/50">
                    <div className="flex flex-wrap gap-4 justify-between items-center text-xs text-muted-foreground">
                        <div>
                            &copy; {new Date().getFullYear()}{" "}
                            VirtualAddress<span className="text-primary">Hub</span>. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
