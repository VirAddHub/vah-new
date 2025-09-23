import React from 'react';

interface VAHLogoProps {
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    className?: string;
}

export function VAHLogo({ size = 'md', showText = true, className = '' }: VAHLogoProps) {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl'
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`${sizeClasses[size]} bg-primary rounded-lg flex items-center justify-center`}>
                <span className="text-primary-foreground font-bold text-xs">VAH</span>
            </div>
            {showText && (
                <span className={`font-bold text-primary ${textSizeClasses[size]}`}>
                    VirtualAddressHub
                </span>
            )}
        </div>
    );
}
