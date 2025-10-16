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
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
                const keyResponse = await fetch(`${API_BASE}/api/ideal-postcodes-key`, {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('vah_jwt')}`
                    }
                });
                const keyData = await keyResponse.json();

                if (!keyData.ok) {
                    throw new Error(keyData.error || 'Failed to get API key');
                }

                const apiKey = keyData.apiKey;

                // Setup AddressFinder
                const controller = AddressFinder.setup({
                    apiKey: apiKey,
                    inputField: inputRef.current,
                    outputFields: outputFields
                });

                console.log('[AddressFinder] Controller created:', controller);
                controllerRef.current = controller;

                setIsLoaded(true);
            } catch (err) {
                console.error('[AddressFinder] Failed to load:', err);
                setError("Address finder failed to load. Please enter your address manually.");
                // Don't show error overlay - let user continue typing
            }
        };

        loadAddressFinder();

        // Cleanup on unmount
        return () => {
            if (controllerRef.current && isLoaded) {
                console.log('[AddressFinder] Cleaning up controller:', controllerRef.current);
                if (typeof controllerRef.current.destroy === 'function') {
                    try {
                        controllerRef.current.destroy();
                        console.log('[AddressFinder] Controller destroyed successfully');
                    } catch (error) {
                        console.warn('[AddressFinder] Error during cleanup:', error);
                    }
                } else {
                    console.warn('[AddressFinder] Controller does not have destroy method:', controllerRef.current);
                }
                controllerRef.current = null;
            }
        };
    }, [outputFields, onAddressSelect, isLoaded]);

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
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {error}
                </div>
            )}

            {isLoaded && (
                <p className="text-xs text-gray-500">
                    Start typing your address and select from the suggestions
                </p>
            )}
        </div>
    );
}
