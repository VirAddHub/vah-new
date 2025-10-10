import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 hover:shadow-lg",
    {
        variants: {
            variant: {
                default: "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground hover:shadow-primary/25",
                destructive:
                    "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:shadow-destructive/25",
                outline:
                    "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground hover:shadow-primary/25",
                secondary:
                    "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:shadow-secondary/25",
                ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105",
                link: "text-primary underline-offset-4 hover:underline hover:scale-105",
                success: "bg-gradient-to-r from-success to-success/90 text-success-foreground hover:shadow-success/25",
                warning: "bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:shadow-warning/25",
            },
            size: {
                default: "h-10 px-6 py-2",
                sm: "h-9 rounded-lg px-4 text-xs",
                lg: "h-12 rounded-xl px-8 text-base",
                xl: "h-14 rounded-2xl px-10 text-lg",
                icon: "h-10 w-10 rounded-xl",
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
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }