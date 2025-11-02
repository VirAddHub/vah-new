"use client";

import { useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// --- Analytics Logging (for development only) ---
const logClientEvent = (eventName: string, data: any) => {
    if (process.env.NODE_ENV === "development") {
        console.log(`[VAH Analytics] ${eventName}:`, data);
    }
};

// --- CVA for robust size variants ---
const logoVariants = cva(
    "inline-flex items-center gap-2 group transition-colors duration-200 ease-in-out",
    {
        variants: {
            size: {
                sm: "text-xs",
                md: "text-sm",
                lg: "text-base",
                xl: "text-lg",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
);

interface VAHLogoProps extends VariantProps<typeof logoVariants> {
    href?: string;
    showText?: boolean;
    initials?: string;
    fullName?: string;
    className?: string;
    onNavigate?: (page: string) => void;
}

export function VAHLogo({
    size,
    href = "/",
    showText = true,
    initials = "VAH",
    fullName = "VirtualAddressHub",
    className,
    onNavigate,
}: VAHLogoProps) {
    useEffect(() => {
        logClientEvent("vah_logo_view", {
            size,
            showText,
            timestamp: new Date().toISOString(),
        });
    }, [size, showText]);

    const handleClick = (e: React.MouseEvent) => {
        logClientEvent("vah_logo_click", {
            size,
            showText,
            source: "vah_logo",
        });

        // If onNavigate is provided, use custom navigation instead of href
        if (onNavigate) {
            e.preventDefault();
            onNavigate('home');
        }
    };

    // Use button if onNavigate is provided, otherwise use Link
    const LogoElement = onNavigate ? 'button' : Link;
    const logoProps = onNavigate
        ? {
            onClick: handleClick,
            className: cn(logoVariants({ size }), className),
            'aria-label': `${fullName} homepage`,
            type: 'button' as const
        }
        : {
            href,
            onClick: handleClick,
            className: cn(logoVariants({ size }), className),
            'aria-label': `${fullName} homepage`
        };

    return (
        <LogoElement {...logoProps}>
            {/* Logo Square */}
            <div
                className={cn(
                    "bg-[#20603A] rounded-lg flex items-center justify-center font-bold",
                    "transform transition-transform duration-200 ease-in-out group-hover:scale-105 group-active:scale-95",
                    // Dynamic sizing for the square based on `size` prop
                    size === "sm" && "w-6 h-6 text-xs",
                    size === "md" && "w-8 h-8 text-sm",
                    size === "lg" && "w-10 h-10 text-base",
                    size === "xl" && "w-12 h-12 text-lg"
                )}
            >
                <span className="text-white">{initials}</span>
            </div>

            {/* Full Name Text */}
            {showText && (
                <span className="font-semibold text-foreground group-hover:text-[#20603A] transition-colors duration-200">
                    {fullName}
                </span>
            )}
        </LogoElement>
    );
}
