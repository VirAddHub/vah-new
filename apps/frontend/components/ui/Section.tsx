import type { PropsWithChildren, HTMLAttributes } from "react";
import clsx from "clsx";

export default function Section({
    className,
    children,
    ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
    return (
        <section
            className={clsx(
                "safe-pad mx-auto w-full max-w-screen-xl",
                "py-8 sm:py-10 md:py-12",
                className
            )}
            {...props}
        >
            {children}
        </section>
    );
}


