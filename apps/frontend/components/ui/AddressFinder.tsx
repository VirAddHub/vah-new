"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Alert, AlertDescription } from "./alert";
import { MapPin, AlertCircle } from "lucide-react";

interface AddressFinderProps {
    onAddressSelect?: (address: any) => void;
    initialAddress?: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
    className?: string;
    disabled?: boolean;
    // Form field IDs for AddressFinder to populate
    outputFields: {
        line_1: string;
        line_2?: string;
        line_3?: string;
        post_town: string;
        postcode: string;
    };
}

export function AddressFinder({
    onAddressSelect,
    initialAddress,
    placeholder = "Start typing your address...",
    label = "Address",
    required = false,
    className = "",
    disabled = false,
    outputFields
}: AddressFinderProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const controllerRef = useRef<any>(null);

    useEffect(() => {
        // Dynamically import Ideal Postcodes AddressFinder
        const loadAddressFinder = async () => {
            try {
                const { AddressFinder } = await import('@ideal-postcodes/address-finder');

                if (!inputRef.current) return;

                // Fetch API key from our backend
                const keyResponse = await fetch('/api/ideal-postcodes-key');
                const keyData = await keyResponse.json();

                if (!keyData.ok) {
                    throw new Error(keyData.error || 'Failed to get API key');
                }

                const apiKey = keyData.apiKey;

                // Setup AddressFinder
                controllerRef.current = AddressFinder.setup({
                    apiKey: apiKey,
                    inputField: inputRef.current,
                    outputFields: outputFields,
                    onCheckFailed: () => {
                        setError("Address finder is temporarily unavailable. Please enter your address manually.");
                    },
                    onAddressSelected: (address: any) => {
                        console.log('[AddressFinder] Address selected:', address);
                        if (onAddressSelect) {
                            onAddressSelect(address);
                        }
                        setError(null);
                    },
                    onError: (error: any) => {
                        console.error('[AddressFinder] Error:', error);
                        setError("Address search failed. Please try again or enter manually.");
                    }
                });

                setIsLoaded(true);
            } catch (err) {
                console.error('[AddressFinder] Failed to load:', err);
                setError("Address finder failed to load. Please enter your address manually.");
            }
        };

        loadAddressFinder();

        // Cleanup on unmount
        return () => {
            if (controllerRef.current) {
                controllerRef.current.destroy();
            }
        };
    }, [outputFields, onAddressSelect]);

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <Label htmlFor="address-finder-input" className="text-sm font-medium">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}

            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    ref={inputRef}
                    id="address-finder-input"
                    type="text"
                    placeholder={placeholder}
                    disabled={disabled || !isLoaded}
                    defaultValue={initialAddress}
                    className="pl-10"
                />
                {!isLoaded && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isLoaded && (
                <p className="text-xs text-gray-500">
                    Start typing your address and select from the suggestions
                </p>
            )}
        </div>
    );
}
