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

// One button set for the whole product: black pills, outlined pills, quiet text buttons.
const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background-color,color,border-color,opacity] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40 select-none [&_svg]:shrink-0"

const sizes: Record<Size, string> = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-11 px-5 text-[14px]",
    lg: "h-12 px-6 text-[15px]",
    icon: "h-11 w-11",
}

const variants: Record<Variant, string> = {
    primary: "bg-ink text-paper hover:bg-graphite",
    secondary: "bg-ink text-paper hover:bg-graphite",
    outline: "border border-ink/15 bg-paper text-ink hover:border-ink hover:bg-paper",
    ghost: "bg-transparent text-ink hover:bg-mist",
    destructive: "bg-destructive text-paper hover:bg-destructive/90",
    link: "h-auto rounded-none px-0 text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink",
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
