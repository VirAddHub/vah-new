import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    text?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
};

export function LoadingSpinner({
    size = 'md',
    className,
    text
}: LoadingSpinnerProps) {
    return (
        <div className={cn('flex items-center justify-center', className)}>
            <div className="flex flex-col items-center space-y-2">
                <div
                    className={cn(
                        'animate-spin rounded-full border-2 border-muted border-t-primary',
                        sizeClasses[size]
                    )}
                />
                {text && (
                    <p className="text-sm text-muted-foreground">{text}</p>
                )}
            </div>
        </div>
    );
}

// Full page loading component
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
            <LoadingSpinner size="lg" text={text} />
        </div>
    );
}

// Inline loading component
export function InlineLoading({ text }: { text?: string }) {
    return (
        <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            {text && <span className="text-sm text-muted-foreground">{text}</span>}
        </div>
    );
}

// Button loading state
export function ButtonLoading({
    isLoading,
    children,
    loadingText = 'Loading...',
    ...props
}: {
    isLoading: boolean;
    children: React.ReactNode;
    loadingText?: string;
    [key: string]: any;
}) {
    return (
        <button {...props} disabled={isLoading}>
            {isLoading ? (
                <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>{loadingText}</span>
                </div>
            ) : (
                children
            )}
        </button>
    );
}
