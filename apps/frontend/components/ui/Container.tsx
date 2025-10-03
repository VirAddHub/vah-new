// components/ui/Container.tsx
// Responsive container component for consistent mobile-first layouts

import React from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export default function Container({ children, className, ...props }: ContainerProps) {
    return (
        <div
            className={cn(
                'container mx-auto max-w-7xl px-3 sm:px-4 md:px-6',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// Narrow content container for readable text
export function ContentContainer({ children, className, ...props }: ContainerProps) {
    return (
        <div
            className={cn(
                'mx-auto max-w-content px-3 sm:px-4',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
