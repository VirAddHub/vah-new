import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Building, MapPin, Eye, EyeOff, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollToTopButton } from '../ScrollToTopButton';
import { AddressFinder } from '../ui/AddressFinder';
import { useSimpleDebouncedSearch } from '../../hooks/useDebouncedSearch';

interface SignupStep2Props {
    onNext: (formData: SignupStep2Data) => void;
    onBack: () => void;
    initialData?: Partial<SignupStep2Data>;
}

export interface SignupStep2Data {
    // Contact Information
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone: string;

    // Company Details
    business_type: string;
    country_of_incorporation: string;
    company_number: string;
    company_name: string;

    // Forwarding Address
    forward_to_first_name: string;
    forward_to_last_name: string;
    address_line1: string;
    address_line2: string;
    city: string;
    postcode: string;
    forward_country: string;
}

export function SignupStep2({ onNext, onBack, initialData }: SignupStep2Props) {
    const [formData, setFormData] = useState<SignupStep2Data>({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        email: initialData?.email || '',
        password: initialData?.password || '',
        phone: initialData?.phone || '',
        business_type: initialData?.business_type || '',
        country_of_incorporation: initialData?.country_of_incorporation || 'GB',
        company_number: initialData?.company_number || '',
        company_name: initialData?.company_name || '',
        forward_to_first_name: initialData?.forward_to_first_name || '',
        forward_to_last_name: initialData?.forward_to_last_name || '',
        address_line1: initialData?.address_line1 || '',
        address_line2: initialData?.address_line2 || '',
        city: initialData?.city || '',
        postcode: initialData?.postcode || '',
        forward_country: initialData?.forward_country || 'GB'
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Companies House search state
    const [companySearchResults, setCompanySearchResults] = useState<any[]>([]);
    const [companySearchLoading, setCompanySearchLoading] = useState(false);
    const [companySearchError, setCompanySearchError] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);

    const { debouncedQuery: debouncedCompanySearch, setQuery: setCompanySearchTerm } = useSimpleDebouncedSearch(500, 2);
    const [isSearching, setIsSearching] = useState(false);

    const businessTypes = [
        { value: 'limited_company', label: 'Private Limited Company' },
        { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
        { value: 'lp', label: 'Limited Partnership (LP)' },
        { value: 'sole_trader', label: 'Sole Trader' },
        { value: 'partnership', label: 'Partnership' },
        { value: 'charity', label: 'Charity' },
        { value: 'other', label: 'Other' }
    ];

    const countries = [
        { value: 'GB', label: 'United Kingdom' },
        { value: 'IE', label: 'Ireland' },
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'AU', label: 'Australia' }
    ];

    const updateFormData = (field: keyof SignupStep2Data, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Contact Information validation
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.password.trim()) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

        // Company Details validation
        if (!formData.business_type) newErrors.business_type = 'Business type is required';
        if (!formData.country_of_incorporation) newErrors.country_of_incorporation = 'Country of incorporation is required';
        if (!formData.company_number.trim()) newErrors.company_number = 'Company number is required';
        if (!formData.company_name.trim()) newErrors.company_name = 'Company name is required';

        // Forwarding Address validation
        if (!formData.forward_to_first_name.trim()) newErrors.forward_to_first_name = 'First name is required';
        if (!formData.forward_to_last_name.trim()) newErrors.forward_to_last_name = 'Last name is required';
        if (!formData.address_line1.trim()) newErrors.address_line1 = 'Address line 1 is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.postcode.trim()) newErrors.postcode = 'Postcode is required';
        if (!formData.forward_country) newErrors.forward_country = 'Country is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onNext(formData);
        }
    };

    // Debounced search for Companies House
    useEffect(() => {
        if (debouncedCompanySearch.length < 2 || isManualEntry) {
            setCompanySearchResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setCompanySearchLoading(true);
                const response = await fetch(
                    `/api/bff/companies/search?q=${encodeURIComponent(debouncedCompanySearch)}`
                );

                if (response.ok) {
                    const result = await response.json();
                    setCompanySearchResults(result.data || []);
                    setShowResults(true);
                } else {
                    console.error('Companies House API error:', response.status);
                    setCompanySearchResults([]);
                }
            } catch (error) {
                console.error('Companies House search failed:', error);
                setCompanySearchResults([]);
            } finally {
                setCompanySearchLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedCompanySearch, isManualEntry]);

    const handleSelectCompany = (company: any) => {
        updateFormData('company_number', company.company_number);
        updateFormData('company_name', company.title);
        setShowResults(false);
        setCompanySearchResults([]);

        // Auto-fill business type based on company type
        if (company.company_type === 'ltd') {
            updateFormData('business_type', 'limited_company');
        } else if (company.company_type === 'llp') {
            updateFormData('business_type', 'llp');
        }
    };

    const handleCompaniesHouseSearch = async () => {
        if (!formData.company_number.trim()) return;

        try {
            setIsSearching(true);
            const response = await fetch(
                `/api/bff/companies/${formData.company_number}`
            );

            if (response.ok) {
                const result = await response.json();
                const company = result.data;
                updateFormData('company_name', company.company_name);

                // Auto-fill business type
                if (company.company_type === 'ltd') {
                    updateFormData('business_type', 'limited_company');
                } else if (company.company_type === 'llp') {
                    updateFormData('business_type', 'llp');
                }

                // Clear any previous errors
                setErrors(prev => ({ ...prev, company_number: '' }));
            } else {
                setErrors(prev => ({ ...prev, company_number: 'Company not found' }));
            }
        } catch (error) {
            console.error('Companies House lookup failed:', error);
            setErrors(prev => ({ ...prev, company_number: 'Failed to lookup company' }));
        } finally {
            setIsSearching(false);
        }
    };

    // Auto-verify company number when manually entered (debounced)
    useEffect(() => {
        if (!isManualEntry || !formData.company_number.trim()) return;

        const timer = setTimeout(async () => {
            // Only auto-verify if company number looks valid (8 digits for UK companies)
            if (formData.company_number.match(/^\d{8}$/)) {
                await handleCompaniesHouseSearch();
            }
        }, 1000); // 1 second delay for manual entry

        return () => clearTimeout(timer);
    }, [formData.company_number, isManualEntry]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {/* Header with progress and back button */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center justify-center border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 rounded-md gap-1.5 px-3 text-sm font-medium transition-all"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </button>

                        {/* Progress indicator */}
                        <div className="flex items-center gap-2" aria-label="Step progress">
                            <div
                                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
                                title="Plan selected"
                            >
                                ✓
                            </div>
                            <div className="w-8 h-1 bg-primary rounded-full"></div>
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                2
                            </div>
                            <div className="w-8 h-1 bg-muted rounded-full"></div>
                            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                                3
                            </div>
                        </div>
                    </div>

                    <h1 className="mb-2">Company & Contact Information</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Tell us about yourself and your company. All fields marked with <span className="text-destructive">*</span> are required.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Contact Information Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Contact Information
                            </h4>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name" className="flex items-center gap-2">
                                        First Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => updateFormData('first_name', e.target.value)}
                                        autoComplete="given-name"
                                        className={errors.first_name ? 'border-destructive' : ''}
                                    />
                                    {errors.first_name && (
                                        <p className="text-sm text-destructive">{errors.first_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name" className="flex items-center gap-2">
                                        Last Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => updateFormData('last_name', e.target.value)}
                                        autoComplete="family-name"
                                        className={errors.last_name ? 'border-destructive' : ''}
                                    />
                                    {errors.last_name && (
                                        <p className="text-sm text-destructive">{errors.last_name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    Email Address <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData('email', e.target.value)}
                                    autoComplete="email"
                                    className={errors.email ? 'border-destructive' : ''}
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="flex items-center gap-2">
                                    Password <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => updateFormData('password', e.target.value)}
                                        autoComplete="new-password"
                                        className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Minimum 8 characters. Use a strong, unique password.
                                </p>
                                {errors.password && (
                                    <p className="text-sm text-destructive">{errors.password}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    Phone Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => updateFormData('phone', e.target.value)}
                                    autoComplete="tel"
                                    placeholder="+44 7700 900123"
                                    pattern="^\+?[0-9\s\-()]{7,}$"
                                    className={errors.phone ? 'border-destructive' : ''}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Include country code (e.g. +44 for UK).
                                </p>
                                {errors.phone && (
                                    <p className="text-sm text-destructive">{errors.phone}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Company Details Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Company Details
                            </h4>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="business_type" className="flex items-center gap-2">
                                        Business Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={formData.business_type} onValueChange={(value) => updateFormData('business_type', value)}>
                                        <SelectTrigger className={errors.business_type ? 'border-destructive' : ''}>
                                            <SelectValue placeholder="Select business type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {businessTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.business_type && (
                                        <p className="text-sm text-destructive">{errors.business_type}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="country_of_incorporation" className="flex items-center gap-2">
                                        Country of Incorporation <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={formData.country_of_incorporation} onValueChange={(value) => updateFormData('country_of_incorporation', value)}>
                                        <SelectTrigger className={errors.country_of_incorporation ? 'border-destructive' : ''}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((country) => (
                                                <SelectItem key={country.value} value={country.value}>
                                                    {country.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.country_of_incorporation && (
                                        <p className="text-sm text-destructive">{errors.country_of_incorporation}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setIsManualEntry(false);
                                            setCompanySearchTerm('');
                                            setShowResults(false);
                                        }}
                                        variant={!isManualEntry ? "default" : "outline"}
                                        className="h-8"
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        Companies House Search
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setIsManualEntry(true);
                                            setShowResults(false);
                                        }}
                                        variant={isManualEntry ? "default" : "outline"}
                                        className="h-8"
                                    >
                                        Enter Manually
                                    </Button>
                                </div>


                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="company_number" className="flex items-center gap-2">
                                            Company Number <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="company_number"
                                                value={formData.company_number}
                                                onChange={(e) => updateFormData('company_number', e.target.value)}
                                                placeholder="12345678"
                                                className={`flex-1 ${errors.company_number ? 'border-destructive' : ''} ${isManualEntry && isSearching ? 'pr-10' : ''}`}
                                                readOnly={!isManualEntry}
                                            />
                                            {isManualEntry && isSearching && (
                                                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {isManualEntry
                                                ? 'Enter an 8-digit company number and we\'ll automatically verify it'
                                                : 'Selected from Companies House. You can edit if needed.'
                                            }
                                        </p>
                                        {errors.company_number && (
                                            <p className="text-sm text-destructive">{errors.company_number}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company_name" className="flex items-center gap-2">
                                            Company Name <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="company_name"
                                                value={formData.company_name}
                                                onChange={(e) => {
                                                    updateFormData('company_name', e.target.value);
                                                    if (!isManualEntry) {
                                                        setCompanySearchTerm(e.target.value);
                                                    }
                                                }}
                                                placeholder="Type company name to search..."
                                                className={`pr-10 ${errors.company_name ? 'border-destructive' : ''}`}
                                            />
                                            {isSearching && (
                                                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                                            )}
                                        </div>

                                        {/* Search Results Dropdown */}
                                        {!isManualEntry && showResults && companySearchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                                                {companySearchResults.map((company, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => handleSelectCompany(company)}
                                                        className="w-full text-left px-4 py-3 hover:bg-accent border-b last:border-b-0 transition-colors"
                                                    >
                                                        <div className="font-medium text-sm">{company.title}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {company.company_number} • {company.company_status}
                                                            {company.address_snippet && ` • ${company.address_snippet}`}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {!isManualEntry && showResults && companySearchResults.length === 0 && !companySearchLoading && debouncedCompanySearch.length >= 2 && (
                                            <p className="text-sm text-muted-foreground">No companies found. Try a different search term.</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {!isManualEntry ? 'Start typing to search Companies House. You can edit if needed.' : 'If the name appears incorrect, you can still edit it later.'}
                                        </p>
                                        {errors.company_name && (
                                            <p className="text-sm text-destructive">{errors.company_name}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Forwarding Address Card */}
                    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border">
                        <div className="px-6 pt-6">
                            <h4 className="leading-none flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Where shall we send the post?
                            </h4>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Letters only.</strong> HMRC & Companies House letters are forwarded free of charge. All other mail is £2 per item and added to your monthly bill.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="forward_to_first_name" className="flex items-center gap-2">
                                        First Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="forward_to_first_name"
                                        value={formData.forward_to_first_name}
                                        onChange={(e) => updateFormData('forward_to_first_name', e.target.value)}
                                        autoComplete="given-name"
                                        className={errors.forward_to_first_name ? 'border-destructive' : ''}
                                    />
                                    {errors.forward_to_first_name && (
                                        <p className="text-sm text-destructive">{errors.forward_to_first_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="forward_to_last_name" className="flex items-center gap-2">
                                        Last Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="forward_to_last_name"
                                        value={formData.forward_to_last_name}
                                        onChange={(e) => updateFormData('forward_to_last_name', e.target.value)}
                                        autoComplete="family-name"
                                        className={errors.forward_to_last_name ? 'border-destructive' : ''}
                                    />
                                    {errors.forward_to_last_name && (
                                        <p className="text-sm text-destructive">{errors.forward_to_last_name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Forwarding Address - Enhanced with Address Completer */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                                    <MapPin className="h-5 w-5" />
                                    Forwarding Address
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    This is where we'll forward your mail. Use our smart address finder to quickly select your address.
                                </p>

                                {/* Address input fields - visible for AddressFinder to populate */}
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="address_line1" className="text-sm font-medium">
                                            Address Line 1 *
                                        </Label>
                                        <Input
                                            id="address_line1"
                                            value={formData.address_line1}
                                            onChange={(e) => updateFormData('address_line1', e.target.value)}
                                            placeholder="Enter your address line 1"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="address_line2" className="text-sm font-medium">
                                            Address Line 2
                                        </Label>
                                        <Input
                                            id="address_line2"
                                            value={formData.address_line2}
                                            onChange={(e) => updateFormData('address_line2', e.target.value)}
                                            placeholder="Enter your address line 2 (optional)"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="city" className="text-sm font-medium">
                                            City/Town *
                                        </Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => updateFormData('city', e.target.value)}
                                            placeholder="Enter your city or town"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="postcode" className="text-sm font-medium">
                                            Postcode *
                                        </Label>
                                        <Input
                                            id="postcode"
                                            value={formData.postcode}
                                            onChange={(e) => updateFormData('postcode', e.target.value)}
                                            placeholder="Enter your postcode"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* AddressFinder for autocomplete */}
                                <AddressFinder
                                    onAddressSelect={(address) => {
                                        console.log('[SignupStep2] Address selected:', address);
                                        // AddressFinder will automatically populate the fields via outputFields
                                    }}
                                    placeholder="Start typing your postcode to find your address..."
                                    label="Quick Address Lookup (Optional)"
                                    required={false}
                                    className="w-full"
                                    outputFields={{
                                        line_1: "#address_line1",
                                        line_2: "#address_line2",
                                        post_town: "#city",
                                        postcode: "#postcode"
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="text-center">
                        <ScrollToTopButton
                            onClick={() => {
                                if (validateForm()) {
                                    onNext(formData);
                                }
                            }}
                            className="h-10 px-6 min-w-48 inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
                        >
                            Continue to Payment
                        </ScrollToTopButton>
                        <p className="text-sm text-muted-foreground mt-4">
                            Your information is encrypted and secure. We&apos;ll create your account in the next step.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
