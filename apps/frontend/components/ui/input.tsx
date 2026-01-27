import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

/**
 * Premium Input Component
 * 
 * Design principles from design-system.ts:
 * - Clean, minimal styling
 * - Consistent 48px height (h-12)
 * - Subtle borders (neutral-200)
 * - Clear focus states
 * - Accessible error states
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    // Base styles - premium, clean
                    "flex h-12 w-full rounded-lg border bg-white px-4 text-base",
                    "text-neutral-900 placeholder:text-neutral-400",
                    // Focus state - subtle, clear
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    // Disabled state
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
                    // File input
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    // Error state
                    error 
                        ? "border-red-300 focus-visible:ring-red-500" 
                        : "border-neutral-200 focus-visible:border-primary",
                    // Transition
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
