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

    const inner = (
        <span className="inline-flex min-h-[2rem] min-w-[80px] shrink-0 items-center" data-vah-logo>
            {imgFailed ? (
                <span className="font-semibold text-foreground text-body tracking-tight">{fullName}</span>
            ) : (
                <img
                    src="/images/logo.svg"
                    alt={fullName}
                    width={logoDimensions.width}
                    height={logoDimensions.height}
                    className={cn(
                        "block object-contain transition-opacity duration-200 group-hover:opacity-90",
                        size === "xl" && "min-h-[50px] min-w-[200px]",
                        imgClassName
                    )}
                    style={{
                        height: "auto",
                        maxHeight: "100%",
                        ...(size === "xl" && { minWidth: 200, minHeight: 50 }),
                    }}
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
