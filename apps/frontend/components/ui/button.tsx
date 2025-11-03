import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive" | "link"
type Size = "sm" | "md" | "lg" | "icon"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: Variant
    size?: Size
    loading?: boolean
    fullWidth?: boolean
}

const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none ring-offset-background"

const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-14 px-7 text-base", // ~56px tall for premium CTA presence
    icon: "h-11 w-11",
}

const variants: Record<Variant, string> = {
    primary:
        "bg-[#20603A] text-white hover:bg-[#1a5230] focus-visible:ring-[#20603A]",
    secondary:
        "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-900",
    ghost:
        "bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-400",
    outline:
        "bg-transparent text-neutral-900 border border-neutral-200 hover:bg-neutral-50 focus-visible:ring-neutral-400",
    destructive:
        "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    link:
        "bg-transparent text-[#20603A] underline-offset-4 hover:underline focus-visible:ring-[#20603A]",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            asChild,
            className,
            variant = "primary",
            size = "md",
            loading,
            fullWidth,
            children,
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                ref={ref}
                className={cn(
                    base,
                    sizes[size],
                    variants[variant],
                    fullWidth && "w-full",
                    loading && "cursor-wait",
                    className
                )}
                aria-busy={loading || undefined}
                {...props}
            >
                {loading && (
                    <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                    </svg>
                )}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"
