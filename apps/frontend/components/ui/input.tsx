import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-md border border-ink/15 bg-paper px-3.5 text-[15px]",
                    "text-ink placeholder:text-slate",
                    "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    error
                        ? "border-destructive focus-visible:ring-destructive"
                        : "hover:border-ink/30",
                    "transition-colors",
                    className
                )}
                ref={ref}
                aria-invalid={error || undefined}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
