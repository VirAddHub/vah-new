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
                sm: "text-caption",
                md: "text-body-sm",
                lg: "text-body",
                xl: "text-h3",
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

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        logClientEvent("vah_logo_click", {
            size,
            showText,
            source: "vah_logo",
        });

        // Custom navigation (SPA / scroll) — keep real href for semantics & middle-click to /
        if (onNavigate) {
            e.preventDefault();
            onNavigate("home");
        }
    };

    // Dynamic logo sizing (matches ~26671fb1: public header uses lg = 200x50)
    const logoDimensions = {
        sm: { width: 120, height: 30 },
        md: { width: 160, height: 40 },
        lg: { width: 200, height: 50 },
        xl: { width: 240, height: 60 },
    }[size || "md"];

    // Default caps so the SVG scales down on small screens; imgClassName can override via cn merge.
    const sizeImgMaxClass = {
        sm: "max-h-[26px] w-auto max-w-full sm:max-h-[30px]",
        md: "max-h-8 w-auto max-w-full sm:max-h-10",
        lg: "max-h-9 w-auto max-w-full sm:max-h-[50px]",
        xl: "max-h-12 w-auto max-w-full sm:max-h-[60px] min-h-[50px] min-w-[200px]",
    }[size || "md"];

    const inner = (
        <span className="inline-flex min-h-0 min-w-0 shrink-0 items-center" data-vah-logo>
            {imgFailed ? (
                <span className="font-semibold text-foreground text-body tracking-tight">{fullName}</span>
            ) : (
                <img
                    src="/images/logo.svg"
                    alt={fullName}
                    width={logoDimensions.width}
                    height={logoDimensions.height}
                    className={cn(
                        "block object-contain object-left transition-opacity duration-200 group-hover:opacity-90",
                        sizeImgMaxClass,
                        imgClassName
                    )}
                    style={
                        size === "xl"
                            ? { minWidth: 200, minHeight: 50 }
                            : undefined
                    }
                    onError={() => setImgFailed(true)}
                    fetchPriority="high"
                />
            )}
        </span>
    );

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
