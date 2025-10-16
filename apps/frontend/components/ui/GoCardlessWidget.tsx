'use client';

import { useEffect, useRef, useState } from 'react';
import { FEATURES } from '../../lib/config';

interface GoCardlessWidgetProps {
    redirectFlowId?: string;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    className?: string;
}

export function GoCardlessWidget({
    redirectFlowId,
    onSuccess,
    onError,
    className = ""
}: GoCardlessWidgetProps) {
    const widgetRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Safe cleanup function
    const safeDestroy = (ref: React.MutableRefObject<any>) => {
        const inst = ref?.current;
        if (inst && typeof inst.destroy === 'function') {
            try {
                inst.destroy();
                console.log('[GoCardlessWidget] Widget destroyed successfully');
            } catch (error) {
                console.warn('[GoCardlessWidget] Error during cleanup:', error);
            }
        } else if (inst) {
            console.warn('[GoCardlessWidget] Widget does not have destroy method:', inst);
        }
        ref.current = null;
    };

    useEffect(() => {
        // Don't initialize if payments are disabled
        if (!FEATURES.payments) {
            console.log('[GoCardlessWidget] Payments disabled, skipping widget initialization');
            return;
        }

        // Don't initialize without redirect flow ID
        if (!redirectFlowId) {
            console.log('[GoCardlessWidget] No redirect flow ID, skipping widget initialization');
            return;
        }

        const loadGoCardlessWidget = async () => {
            try {
                // Dynamically import GoCardless (if using embedded widget)
                // Note: Current implementation uses redirect flow, not embedded widget
                // This is a placeholder for future embedded widget implementation

                console.log('[GoCardlessWidget] GoCardless widget would be initialized here');
                console.log('[GoCardlessWidget] Redirect Flow ID:', redirectFlowId);

                // For now, we'll just simulate the widget being loaded
                setIsLoaded(true);

                // In a real implementation, you would:
                // 1. Import GoCardless SDK
                // 2. Initialize the widget with redirectFlowId
                // 3. Set up event handlers for success/error
                // 4. Store the widget instance in widgetRef.current

            } catch (error) {
                console.error('[GoCardlessWidget] Failed to load GoCardless widget:', error);
                setError('Failed to load payment widget');
                onError?.(error);
            }
        };

        loadGoCardlessWidget();

        // Cleanup on unmount
        return () => {
            if (widgetRef.current && isLoaded) {
                console.log('[GoCardlessWidget] Cleaning up widget:', widgetRef.current);
                safeDestroy(widgetRef);
            }
        };
    }, [redirectFlowId, onSuccess, onError, isLoaded]);

    // Don't render if payments are disabled
    if (!FEATURES.payments) {
        return (
            <div className={`p-4 text-center text-muted-foreground ${className}`}>
                <p>Payments are disabled on this environment.</p>
            </div>
        );
    }

    // Don't render if no redirect flow ID
    if (!redirectFlowId) {
        return (
            <div className={`p-4 text-center text-muted-foreground ${className}`}>
                <p>Payment setup not available.</p>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className={`p-4 text-center text-red-600 ${className}`}>
                <p>Error: {error}</p>
            </div>
        );
    }

    // Show loading state
    if (!isLoaded) {
        return (
            <div className={`p-4 text-center text-muted-foreground ${className}`}>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2">Loading payment widget...</p>
            </div>
        );
    }

    // Render the widget container
    return (
        <div className={`go-cardless-widget ${className}`}>
            <div className="p-4 text-center text-muted-foreground">
                <p>GoCardless payment widget would be rendered here.</p>
                <p className="text-sm">Redirect Flow ID: {redirectFlowId}</p>
            </div>
        </div>
    );
}
