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
    "inline-flex items-center justify-center whitespace-nowrap rounded-[3px] font-normal transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none ring-offset-background"

const sizes: Record<Size, string> = {
    sm: "h-7 px-2.5 text-[12px]",
    md: "h-8 px-3 text-[13px]",
    lg: "h-10 px-5 text-[13px]",
    icon: "h-8 w-8",
}

const variants: Record<Variant, string> = {
    primary:
        "bg-[#1a6b3c] !text-white hover:bg-[#155a32] hover:!text-white focus-visible:ring-[#1a6b3c] [&_svg]:!text-white",
    secondary:
        "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-900",
    ghost:
        "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-300",
    outline:
        "bg-transparent text-neutral-700 border border-[0.5px] border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:ring-neutral-300",
    destructive:
        "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    link:
        "bg-transparent text-[#1a6b3c] underline-offset-4 hover:underline focus-visible:ring-[#1a6b3c]",
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
                {asChild ? (
                    children
                ) : (
                    <>
                        {loading ? (
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
                        ) : null}
                        {children}
                    </>
                )}
            </Comp>
        )
    }
)
Button.displayName = "Button"
