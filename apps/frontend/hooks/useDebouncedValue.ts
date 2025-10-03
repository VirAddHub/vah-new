// hooks/useDebouncedValue.ts
// Debounce hook for search inputs and other rapid-change values

import { useEffect, useState } from 'react';

/**
 * Debounce a value - useful for search inputs
 * Returns the debounced value after the specified delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [value, delay]);

    return debouncedValue;
}
