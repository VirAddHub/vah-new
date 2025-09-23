import * as React from "react";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
    icon?: React.ReactNode;
};

export function StatusPill({ className = "", icon, children, ...props }: Props) {
    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium
                  bg-white/60 backdrop-blur border-black/10 text-black/80 ${className}`}
            {...props}
        >
            {icon ? <span className="inline-flex">{icon}</span> : null}
            <span>{children}</span>
        </span>
    );
}
