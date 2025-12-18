"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
    MapPin,
    Search,
    CheckCircle,
    AlertCircle,
    Loader2,
    Building2,
    Home,
    Navigation,
    Map
} from "lucide-react";

import type { AddressSuggestion } from '@/lib/account/addressTypes';

interface AddressCompleterProps {
    onAddressSelect: (address: AddressSuggestion) => void;
    initialAddress?: Partial<AddressSuggestion>;
    placeholder?: string;
    label?: string;
    required?: boolean;
    className?: string;
    disabled?: boolean;
}

export function AddressCompleter({
    onAddressSelect,
    initialAddress,
    placeholder = "Enter postcode to search...",
    label = "Address",
    required = false,
    className = "",
    disabled = false
}: AddressCompleterProps) {
    const [query, setQuery] = useState(initialAddress?.formatted_address || "");
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState<string | null>(null);
    const [isSelected, setIsSelected] = useState(false);
    const [useManualEntry, setUseManualEntry] = useState(false);
    const [manualAddress, setManualAddress] = useState({
        line1: '',
        line2: '',
        line3: '',
        postcode: '',
        city: ''
    });

    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Address completer API - now using BFF proxy
    const searchAddresses = useCallback(async (searchQuery: string) => {
        console.log('[AddressCompleter] Starting search for:', searchQuery);

        // Focus on postcode search - UK postcodes are typically 5-8 characters
        if (!searchQuery || searchQuery.length < 3) {
            console.log('[AddressCompleter] Query too short, clearing suggestions');
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const url = `/api/bff/address?postcode=${encodeURIComponent(searchQuery)}&line1=`;
            console.log('[AddressCompleter] Fetching from:', url);

            const response = await fetch(url, { cache: 'no-store' });

            console.log('[AddressCompleter] Response status:', response.status);
            console.log('[AddressCompleter] Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.log('[AddressCompleter] Response error:', response.status, errorText);
                throw new Error(`Address lookup failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[AddressCompleter] Response data:', data);

            if (!data.ok) {
                console.log('[AddressCompleter] API returned error:', data.error);
                throw new Error(data.error || 'Address lookup failed');
            }

            if (data.data?.addresses && Array.isArray(data.data.addresses)) {
                console.log('[AddressCompleter] Found addresses:', data.data.addresses.length);
                const formattedSuggestions: AddressSuggestion[] = data.data.addresses.map((addr: string, index: number) => ({
                    id: `addr_${index}`,
                    formatted_address: addr,
                    address_line_1: addr.split(',')[0] || '',
                    address_line_2: '',
                    city: addr.split(',').slice(-2, -1)[0]?.trim() || '',
                    postcode: addr.split(',').slice(-1)[0]?.trim() || '',
                    country: 'GB'
                }));

                console.log('[AddressCompleter] Formatted suggestions:', formattedSuggestions);
                setSuggestions(formattedSuggestions);
                setShowSuggestions(true);
                setSelectedIndex(-1);
            } else {
                console.log('[AddressCompleter] No addresses in response');
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (err) {
            console.error("[AddressCompleter] Search error:", err);
            setError("Address search is temporarily unavailable. Please use manual entry below.");
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle manual address entry
    const handleManualAddressChange = (field: keyof typeof manualAddress, value: string) => {
        setManualAddress(prev => ({ ...prev, [field]: value }));

        // Auto-submit when all required fields are filled
        const updated = { ...manualAddress, [field]: value };
        if (updated.line1 && updated.postcode && updated.city) {
            const address: AddressSuggestion = {
                id: 'manual',
                formatted_address: `${updated.line1}, ${updated.line2 ? updated.line2 + ', ' : ''}${updated.line3 ? updated.line3 + ', ' : ''}${updated.city}, ${updated.postcode}`,
                address_line_1: updated.line1,
                address_line_2: updated.line2,
                city: updated.city,
                postcode: updated.postcode,
                country: 'GB'
            };
            onAddressSelect(address);
        }
    };

    // Format postcode to UK standard (AA1 1AA)
    const formatPostcode = (postcode: string): string => {
        // Remove all spaces and convert to uppercase
        const cleaned = postcode.replace(/\s/g, '').toUpperCase();

        // UK postcode patterns: AA1 1AA, AA11 1AA, A1A 1AA, A11A 1AA, AA1A 1AA, AA11A 1AA
        const patterns = [
            /^([A-Z]{2})(\d)([A-Z])(\d)([A-Z]{2})$/, // AA1A1AA
            /^([A-Z]{2})(\d{2})([A-Z])(\d)([A-Z]{2})$/, // AA11A1AA
            /^([A-Z])(\d)([A-Z])(\d)([A-Z]{2})$/, // A1A1AA
            /^([A-Z])(\d{2})([A-Z])(\d)([A-Z]{2})$/, // A11A1AA
            /^([A-Z]{2})(\d)([A-Z]{2})(\d)([A-Z]{2})$/, // AA1AA1AA
            /^([A-Z]{2})(\d{2})([A-Z]{2})(\d)([A-Z]{2})$/, // AA11AA1AA
        ];

        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                const [, part1, part2, part3, part4, part5] = match;
                return `${part1}${part2}${part3} ${part4}${part5}`;
            }
        }

        // If no pattern matches, return cleaned version
        return cleaned;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        // Auto-format postcode as user types
        if (value.length > 2) {
            value = formatPostcode(value);
        }

        setQuery(value);
        setIsSelected(false);
        setError(null);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce search
        debounceRef.current = setTimeout(() => {
            searchAddresses(value);
        }, 300);
    };

    const handleSuggestionClick = (suggestion: AddressSuggestion) => {
        setQuery(suggestion.formatted_address);
        setShowSuggestions(false);
        setIsSelected(true);
        onAddressSelect(suggestion);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                }
                break;
            case "Escape":
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleInputFocus = () => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding suggestions to allow clicks
        setTimeout(() => {
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }, 200);
    };

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const formatSuggestionText = (suggestion: AddressSuggestion) => {
        const parts = [];
        if (suggestion.building_name) parts.push(suggestion.building_name);
        if (suggestion.address_line_1) parts.push(suggestion.address_line_1);
        if (suggestion.address_line_2) parts.push(suggestion.address_line_2);
        if (suggestion.city) parts.push(suggestion.city);
        if (suggestion.postcode) parts.push(suggestion.postcode);

        return parts.join(", ");
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <Label htmlFor="address-search" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {label}
                {required && <span className="text-destructive">*</span>}
            </Label>

            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        id="address-search"
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`pl-10 ${isSelected ? 'border-green-500 bg-green-50' : ''} ${error ? 'border-destructive' : ''}`}
                        autoComplete="off"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {isSelected && !isLoading && (
                        <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <Card className="absolute z-50 w-full mt-1 shadow-lg border">
                        <CardContent className="p-0">
                            <div ref={suggestionsRef} className="max-h-60 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={suggestion.id}
                                        className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${index === selectedIndex
                                            ? 'bg-primary/10 border-primary/20'
                                            : 'hover:bg-muted/50'
                                            }`}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {suggestion.building_name ? (
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Home className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">
                                                    {formatSuggestionText(suggestion)}
                                                </div>
                                                {suggestion.postcode && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {suggestion.postcode}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Manual Entry Option */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Can't find your address?</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUseManualEntry(!useManualEntry)}
                        className="text-xs"
                    >
                        {useManualEntry ? 'Hide Manual Entry' : 'Enter Manually'}
                    </Button>
                </div>

                {useManualEntry && (
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label htmlFor="manual-line1" className="text-sm font-medium">
                                    Address Line 1 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="manual-line1"
                                    value={manualAddress.line1}
                                    onChange={(e) => handleManualAddressChange('line1', e.target.value)}
                                    placeholder="House number and street name"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="manual-line2" className="text-sm font-medium">
                                    Address Line 2
                                </Label>
                                <Input
                                    id="manual-line2"
                                    value={manualAddress.line2}
                                    onChange={(e) => handleManualAddressChange('line2', e.target.value)}
                                    placeholder="Apartment, suite, etc. (optional)"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="manual-line3" className="text-sm font-medium">
                                    Address Line 3
                                </Label>
                                <Input
                                    id="manual-line3"
                                    value={manualAddress.line3}
                                    onChange={(e) => handleManualAddressChange('line3', e.target.value)}
                                    placeholder="Additional info (optional)"
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="manual-city" className="text-sm font-medium">
                                        City <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="manual-city"
                                        value={manualAddress.city}
                                        onChange={(e) => handleManualAddressChange('city', e.target.value)}
                                        placeholder="City"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="manual-postcode" className="text-sm font-medium">
                                        Postcode <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="manual-postcode"
                                        value={manualAddress.postcode}
                                        onChange={(e) => handleManualAddressChange('postcode', e.target.value)}
                                        placeholder="Postcode"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Address Display */}
            {isSelected && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        Address selected successfully
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
