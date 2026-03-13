"use client";

/**
 * Logo for header/nav. When used in DashboardNavigation, parent constrains size
 * (e.g. h-8, max-w-[180px]); pass imgClassName for object-contain so the logo
 * keeps aspect ratio and does not shift layout.
 */
import { useEffect, useState } from "react";
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
                xl: "text-xl",
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
    imgClassName?: string;
    onNavigate?: (page: string) => void;
}

export function VAHLogo({
    size,
    href = "/",
    showText = true,
    initials = "VAH",
    fullName = "VirtualAddressHub",
    className,
    imgClassName,
    onNavigate,
}: VAHLogoProps) {
    const [imgFailed, setImgFailed] = useState(false);
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

    // Dynamic logo sizing (xl = fill header height on public pages, ~64px)
    const logoDimensions = {
        sm: { width: 120, height: 30 },
        md: { width: 160, height: 40 },
        lg: { width: 220, height: 44 },
        xl: { width: 320, height: 64 },
    }[size || "md"];

    const inner = (
        <span
            className={cn(
                "inline-flex items-center shrink-0",
                (size === "xl" || size === "lg") ? "min-h-[3rem] min-w-[120px]" : "min-h-[2rem] min-w-[80px]"
            )}
            data-vah-logo
        >
            {imgFailed ? (
                <span className="font-semibold text-neutral-800 text-base tracking-tight">{fullName}</span>
            ) : (
                    <img
                        src="/images/logo.svg"
                        alt={fullName}
                        width={logoDimensions.width}
                        height={logoDimensions.height}
                        className={cn(
                            "block object-contain transition-opacity duration-200 group-hover:opacity-90",
                            size === "xl" ? "h-14 w-[280px] min-h-[3.5rem] sm:h-16 sm:w-[320px] sm:min-h-16" : "w-auto max-w-full",
                            imgClassName
                        )}
                        style={size === "xl" ? undefined : { height: "auto", maxHeight: "100%" }}
                        onError={() => setImgFailed(true)}
                        fetchPriority="high"
                    />
            )}
        </span>
    );

    if (onNavigate) {
        return (
            <button
                onClick={handleClick}
                className={cn(logoVariants({ size }), className)}
                aria-label={`${fullName} homepage`}
                type="button"
            >
                {inner}
            </button>
        );
    }

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={cn(logoVariants({ size }), className)}
            aria-label={`${fullName} homepage`}
        >
            {inner}
        </Link>
    );
}
