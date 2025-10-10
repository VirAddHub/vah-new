import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-[transform,box-shadow,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
    {
        variants: {
            variant: {
                default:
                    // VAH amber
                    "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border border-[color-mix(in_oklab,hsl(var(--primary))_85%,hsl(var(--border)))] shadow-[var(--shadow-sm)] hover:bg-[hsl(var(--primary-hover))] hover:shadow-[var(--shadow-md)]",
                secondary:
                    "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--accent-hover))]",
                outline:
                    "bg-transparent text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]",
                ghost:
                    "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]",
                link:
                    "bg-transparent underline-offset-4 hover:underline text-[hsl(var(--primary))]",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3",
                lg: "h-10 px-6",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(
                    buttonVariants({ variant, size }),
                    // unified focus ring
                    "focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
