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

    // Dynamic logo sizing based on `size` prop
    const logoDimensions = {
        // Use the horizontal logo asset; make it a bit larger by default
        sm: { width: 140, height: 38 },
        md: { width: 190, height: 52 },
        lg: { width: 240, height: 66 },
        xl: { width: 290, height: 80 },
    }[size || "md"];

    return (
        <LogoElement {...logoProps}>
            <div className="flex items-center">
                {/* Use img tag for SVG since Next.js Image doesn't optimize SVGs well */}
                <img
                    src="/images/logo-horizontal.svg"
                    alt={fullName}
                    width={logoDimensions.width}
                    height={logoDimensions.height}
                    className="h-auto transition-opacity duration-200 group-hover:opacity-90"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />
            </div>
        </LogoElement>
    );
}
