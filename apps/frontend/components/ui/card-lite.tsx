import * as React from "react";
import { cn } from "@/lib/utils";

export function CardLite({
    as: As = "div",
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div"> & { as?: any }) {
    return (
        <As
            className={cn(
                "card p-5 md:p-6 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]",
                "hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] transition",
                className
            )}
            {...props}
        />
    );
}
