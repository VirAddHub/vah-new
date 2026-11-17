import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Status labels. Neutral by default; colour only where it carries meaning (paid/verified, errors),
// and always with words, never colour alone.
const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-5",
    {
        variants: {
            variant: {
                default: "border-line bg-mist text-ink",
                secondary: "border-line bg-paper text-graphite",
                success: "border-success/25 bg-success/[0.06] text-success",
                destructive: "border-destructive/25 bg-destructive/[0.06] text-destructive",
                outline: "border-line bg-paper text-ink",
                solid: "border-ink bg-ink text-paper",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
