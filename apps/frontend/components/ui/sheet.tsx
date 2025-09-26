"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// A minimal Sheet API compatible with shadcn/ui usage.
// Uses `vaul` under the hood for mobile-friendly drawer behavior.

type SheetProps = React.HTMLAttributes<HTMLDivElement> & { 
  children?: React.ReactNode;
  open?: boolean;
};

export const Sheet = React.forwardRef<HTMLDivElement, SheetProps>(function Sheet(
  { open, children, ...rest },
  ref
) {
  return <div ref={ref} data-open={open ? 'true' : 'false'} {...rest}>{children}</div>;
});

export const SheetTrigger = ({ children, ...props }: SheetProps) => <div {...props}>{children}</div>

export const SheetClose = ({ children, ...props }: SheetProps) => <div {...props}>{children}</div>

export const SheetPortal = ({ children, ...props }: SheetProps) => <div {...props}>{children}</div>

export const SheetOverlay = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("fixed inset-0 bg-black/40", className)}
        {...props}
    />
))
SheetOverlay.displayName = "SheetOverlay"

export const SheetContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-lg outline-none",
            "dark:bg-neutral-900",
            className
        )}
        {...props}
    />
))
SheetContent.displayName = "SheetContent"

export const SheetHeader = ({
    className,
    ...props
}: React.ComponentProps<"div">) => (
    <div className={cn("mb-4 space-y-1", className)} {...props} />
)

export const SheetFooter = ({
    className,
    ...props
}: React.ComponentProps<"div">) => (
    <div className={cn("mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end", className)} {...props} />
)

export const SheetTitle = React.forwardRef<
    HTMLHeadingElement,
    React.ComponentProps<"h2">
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-base font-semibold", className)}
        {...props}
    />
))
SheetTitle.displayName = "SheetTitle"

export const SheetDescription = React.forwardRef<
    HTMLParagraphElement,
    React.ComponentProps<"p">
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm text-neutral-600 dark:text-neutral-400", className)}
        {...props}
    />
))
SheetDescription.displayName = "SheetDescription"
