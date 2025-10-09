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

interface AddressSuggestion {
    id: string;
    formatted_address: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    postcode: string;
    country: string;
    latitude?: number;
    longitude?: number;
    building_name?: string;
    premise?: string;
    thoroughfare?: string;
    dependent_locality?: string;
    administrative_area?: string;
}

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
    placeholder = "Start typing your address...",
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

    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Your address completer API key
    const API_KEY = process.env.NEXT_PUBLIC_ADDRESS_API_KEY || "HDYIptgdlUCG92rU8XhD_g47737";
    const API_URL = "https://api.getaddress.io/find";

    const searchAddresses = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_URL}/${encodeURIComponent(searchQuery)}?api-key=${API_KEY}&format=true&sort=true`
            );

            if (!response.ok) {
                throw new Error(`Address lookup failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.addresses && Array.isArray(data.addresses)) {
                const formattedSuggestions: AddressSuggestion[] = data.addresses.map((addr: any, index: number) => ({
                    id: `${addr.id || index}`,
                    formatted_address: addr.formatted_address || addr.formattedAddress,
                    address_line_1: addr.line_1 || addr.line1 || addr.address_line_1,
                    address_line_2: addr.line_2 || addr.line2 || addr.address_line_2,
                    city: addr.town_or_city || addr.city || addr.town,
                    postcode: addr.postcode || addr.postal_code,
                    country: addr.country || "GB",
                    latitude: addr.latitude,
                    longitude: addr.longitude,
                    building_name: addr.building_name,
                    premise: addr.premise,
                    thoroughfare: addr.thoroughfare,
                    dependent_locality: addr.dependent_locality,
                    administrative_area: addr.administrative_area
                }));

                setSuggestions(formattedSuggestions);
                setShowSuggestions(true);
                setSelectedIndex(-1);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (err) {
            console.error("Address search error:", err);
            setError("Failed to search addresses. Please try again.");
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
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
