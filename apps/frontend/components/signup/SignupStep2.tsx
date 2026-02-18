'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Building, MapPin, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { ScrollToTopButton } from '../ScrollToTopButton';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Plus, X } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

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

    // Controllers Declaration (required in UI, optional in type for progressive completion)
    isSoleController?: boolean;
    additionalControllersCount?: number | null;
    
    // Business Owners
    additionalOwners?: Array<{ fullName: string; email: string }>;
    ownersPendingInfo?: boolean;
}

type CompanySearchResult = {
    title: string;
    regNumber: string;
    identifier: string;
    status?: string;
    addressSnippet?: string;
};

/** Reusable section card for Step 2: distinct header, accent bar, optional helper. */
function SectionCard({
    title,
    icon: Icon,
    helper,
    children,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    helper?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-visible">
            <div className="border-l-4 border-l-primary">
                <div className="px-4 pt-5 pb-2 md:px-6 md:pt-6 md:pb-2">
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 flex-shrink-0 text-neutral-600" />
                        <h4 className="leading-none font-semibold text-neutral-900">{title}</h4>
                    </div>
                    {helper && (
                        <p className="text-sm text-muted-foreground mt-1.5">{helper}</p>
                    )}
                </div>
            </div>
            <div className="px-4 pb-5 md:px-6 md:pb-6 space-y-4">
                {children}
            </div>
        </div>
    );
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
        forward_country: initialData?.forward_country || 'GB',
        isSoleController: initialData?.isSoleController ?? undefined, // Will be required, start as undefined
        additionalControllersCount: initialData?.additionalControllersCount ?? null,
        additionalOwners: initialData?.additionalOwners || [],
        ownersPendingInfo: initialData?.ownersPendingInfo ?? false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [companyMode, setCompanyMode] = useState<'registered' | 'not_registered'>('registered');
    const [showOptionalWorkingName, setShowOptionalWorkingName] = useState(false);

    // Companies House search state
    const [companySearchResults, setCompanySearchResults] = useState<CompanySearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearchingName, setIsSearchingName] = useState(false);

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
        } else if (!/[a-z]/.test(formData.password)) {
            newErrors.password = 'Password must include a lowercase letter';
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = 'Password must include an uppercase letter';
        } else if (!/\d/.test(formData.password)) {
            newErrors.password = 'Password must include a number';
        }
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

        // Company Details — registered: optional; not_registered: zero required fields

        // Forwarding Address — names auto-filled from contact; only address fields validated
        if (!formData.address_line1.trim()) newErrors.address_line1 = 'Address line 1 is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.postcode.trim()) newErrors.postcode = 'Postcode is required';
        if (!formData.forward_country) newErrors.forward_country = 'Country is required';

        // Controller declaration validation (REQUIRED)
        if (formData.isSoleController === undefined) {
            newErrors.isSoleController = 'Please indicate if you are the sole controller';
        } else if (formData.isSoleController === false) {
            // If not sole controller, must either have owners OR pending info
            if (!formData.ownersPendingInfo) {
                if (!formData.additionalOwners || formData.additionalOwners.length === 0) {
                    newErrors.additionalOwners = 'Please add at least one business owner or indicate you don\'t have their emails yet';
                } else {
                    // Validate each owner
                    formData.additionalOwners.forEach((owner, index) => {
                        if (!owner.fullName.trim()) {
                            newErrors[`owner_${index}_name`] = 'Full name is required';
                        }
                        if (!owner.email.trim()) {
                            newErrors[`owner_${index}_email`] = 'Email is required';
                        } else if (!/\S+@\S+\.\S+/.test(owner.email)) {
                            newErrors[`owner_${index}_email`] = 'Please enter a valid email address';
                        }
                    });
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildPayload = (): SignupStep2Data => {
        const base = {
            ...formData,
            forward_to_first_name: formData.first_name,
            forward_to_last_name: formData.last_name,
            business_type: formData.business_type || 'other',
            country_of_incorporation: formData.country_of_incorporation || 'GB',
        };
        if (companyMode === 'registered') {
            return {
                ...base,
                company_number: formData.company_number?.trim() || '',
                company_name: formData.company_name?.trim() || '',
            };
        }
        // not_registered: only send company_name if they entered a working name; no company_number
        return {
            ...base,
            company_number: '',
            company_name: formData.company_name?.trim() || '',
        };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onNext(buildPayload());
        }
    };

    // Debounced Companies House search via BFF endpoint (only when "registered" mode)
    useEffect(() => {
        if (companyMode !== 'registered') {
            setCompanySearchResults([]);
            setShowResults(false);
            return;
        }
        const query = formData.company_name.trim();
        if (query.length < 2) {
            setCompanySearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearchingName(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/bff/company-search?query=${encodeURIComponent(query)}`);
                if (!res.ok) {
                    setCompanySearchResults([]);
                    setShowResults(false);
                    return;
                }
                const json = await res.json();
                if (!json?.ok || !Array.isArray(json.businesses)) {
                    setCompanySearchResults([]);
                    setShowResults(false);
                    return;
                }
                const mapped: CompanySearchResult[] = json.businesses.map((b: any) => ({
                    title: b.title,
                    regNumber: b.regNumber,
                    identifier: b.identifier,
                    status: b.status,
                    addressSnippet: b.addressSnippet,
                }));
                setCompanySearchResults(mapped);
                setShowResults(mapped.length > 0);
            } catch (err) {
                setCompanySearchResults([]);
                setShowResults(false);
            } finally {
                setIsSearchingName(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [formData.company_name, companyMode]);

    const handleSelectCompany = async (company: CompanySearchResult) => {
        setFormData(prev => ({
            ...prev,
            company_name: company.title,
            company_number: company.regNumber,
        }));
        setShowResults(false);
        setCompanySearchResults([]);

        try {
            const res = await fetch(`/api/bff/company-details?identifier=${encodeURIComponent(company.identifier)}`);
            if (!res.ok) return;
            const json = await res.json();
            if (!json?.ok) return;
            const type = (json.type as string | undefined) ?? null;
            const businessType = type === 'ltd' ? 'limited_company' : type === 'llp' ? 'llp' : 'other';
            const country = (json.country_of_incorporation as string) || 'GB';
            setFormData(prev => ({
                ...prev,
                business_type: businessType,
                country_of_incorporation: country,
            }));
        } catch (err) {
            setFormData(prev => ({
                ...prev,
                business_type: prev.business_type || 'other',
                country_of_incorporation: prev.country_of_incorporation || 'GB',
            }));
        }
    };

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
                        Tell us about yourself and your company. We use these details to set up your account and to meet our UK
                        anti-money laundering (AML) and Companies House compliance obligations. All fields marked with{" "}
                        <span className="text-destructive">*</span> are required.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-neutral-50 rounded-2xl p-4 md:p-6">
                    <div className="space-y-6 md:space-y-8">
                    {/* Contact Information */}
                    <SectionCard title="Contact Information" icon={User} helper="We use these to set up your account and for UK AML compliance.">
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
                    </SectionCard>

                    {/* Company Details — toggle: registered (search) vs not registered (manual name) */}
                    <SectionCard title="Company Details" icon={Building}>
                            <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setCompanyMode('registered')}
                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${companyMode === 'registered' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                                >
                                    Registered company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCompanyMode('not_registered');
                                        setShowOptionalWorkingName(false);
                                        setErrors(prev => ({ ...prev, company_name: '' }));
                                    }}
                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${companyMode === 'not_registered' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                                >
                                    Not registered yet
                                </button>
                            </div>

                            {companyMode === 'registered' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="company_name">Find your company (Companies House)</Label>
                                    <div className="relative">
                                        <Input
                                            id="company_name"
                                            value={formData.company_name}
                                            onChange={(e) => updateFormData('company_name', e.target.value)}
                                            placeholder="Start typing your company name…"
                                            className={`pr-10 ${errors.company_name ? 'border-destructive' : ''}`}
                                        />
                                        {isSearchingName && (
                                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                        {showResults && companySearchResults.length > 0 && (
                                            <div
                                                className="absolute left-0 right-0 top-full z-[100] mt-2 rounded-xl border border-neutral-200 bg-white shadow-lg max-h-72 overflow-auto"
                                                role="listbox"
                                            >
                                                {companySearchResults.map((company, index) => (
                                                    <button
                                                        key={company.identifier ?? index}
                                                        type="button"
                                                        role="option"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => handleSelectCompany(company)}
                                                        className="w-full text-left px-4 py-3 hover:bg-accent border-b border-neutral-100 last:border-b-0 transition-colors"
                                                    >
                                                        <div className="font-medium text-sm">{company.title}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {company.regNumber}
                                                            {company.status && ` • ${company.status}`}
                                                            {company.addressSnippet && ` • ${company.addressSnippet}`}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        We&apos;ll fill your company name automatically.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        No company number yet? Add it later in Verification.
                                    </p>
                                    {!isSearchingName && formData.company_name.trim().length >= 2 && companySearchResults.length === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            No companies found. Try a different search term or continue with the name you entered.
                                        </p>
                                    )}
                                    {errors.company_name && (
                                        <p className="text-sm text-destructive">{errors.company_name}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="font-medium text-neutral-900">You can add your company details later</p>
                                    <p className="text-sm text-muted-foreground">
                                        Once your company is registered, add your Companies House details in Verification.
                                    </p>
                                    {!showOptionalWorkingName ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowOptionalWorkingName(true)}
                                            className="text-sm text-primary hover:text-primary/90 font-medium"
                                        >
                                            Add a working name (optional)
                                        </button>
                                    ) : (
                                        <div className="space-y-2 pt-1">
                                            <Label htmlFor="company_name_manual">Working name (optional)</Label>
                                            <Input
                                                id="company_name_manual"
                                                value={formData.company_name}
                                                onChange={(e) => updateFormData('company_name', e.target.value)}
                                                placeholder="e.g. VirtualAddressHub (can be changed later)"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                    </SectionCard>

                    {/* Forwarding Address — manual only; name auto-filled from contact */}
                    <SectionCard title="Where shall we send the post?" icon={MapPin}>
                            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm text-muted-foreground">
                                <span className="font-medium text-neutral-700">Letters only.</span> HMRC & Companies House letters are forwarded free within the UK. Other letters are £2 per item and added to your monthly invoice.
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address_line1" className="flex items-center gap-2">
                                        Address Line 1 <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="address_line1"
                                        value={formData.address_line1}
                                        onChange={(e) => updateFormData('address_line1', e.target.value)}
                                        placeholder="Street address"
                                        className={errors.address_line1 ? 'border-destructive' : ''}
                                    />
                                    {errors.address_line1 && (
                                        <p className="text-sm text-destructive">{errors.address_line1}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address_line2">Address Line 2 (optional)</Label>
                                    <Input
                                        id="address_line2"
                                        value={formData.address_line2}
                                        onChange={(e) => updateFormData('address_line2', e.target.value)}
                                        placeholder="Flat, building, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="flex items-center gap-2">
                                        City / Town <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => updateFormData('city', e.target.value)}
                                        placeholder="City or town"
                                        className={errors.city ? 'border-destructive' : ''}
                                    />
                                    {errors.city && (
                                        <p className="text-sm text-destructive">{errors.city}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postcode" className="flex items-center gap-2">
                                        Postcode <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="postcode"
                                        value={formData.postcode}
                                        onChange={(e) => updateFormData('postcode', e.target.value)}
                                        placeholder="Postcode"
                                        className={errors.postcode ? 'border-destructive' : ''}
                                    />
                                    {errors.postcode && (
                                        <p className="text-sm text-destructive">{errors.postcode}</p>
                                    )}
                                </div>
                            </div>
                    </SectionCard>

                    {/* Company Control */}
                    <SectionCard title="Company Control" icon={Building} helper="We ask this for compliance. Additional owners will need to complete identity verification.">
                            <div className="space-y-3">
                                <Label className="text-base font-medium">
                                    Are you the only director/controller of this company?
                                </Label>
                                <RadioGroup
                                    value={formData.isSoleController === true ? 'yes' : formData.isSoleController === false ? 'no' : ''}
                                    onValueChange={(value) => {
                                        if (value === 'yes') {
                                            setFormData(prev => ({
                                                ...prev,
                                                isSoleController: true,
                                                additionalControllersCount: null
                                            }));
                                        } else if (value === 'no') {
                                            setFormData(prev => ({
                                                ...prev,
                                                isSoleController: false,
                                                additionalControllersCount: prev.additionalControllersCount ?? null
                                            }));
                                        }
                                    }}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="sole_controller_yes" />
                                        <Label htmlFor="sole_controller_yes" className="font-normal cursor-pointer">
                                            Yes — I'm the only director/controller
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="sole_controller_no" />
                                        <Label htmlFor="sole_controller_no" className="font-normal cursor-pointer">
                                            No — there are other directors/controllers
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {formData.isSoleController === false && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">
                                            Add other directors/owners/controllers
                                        </Label>
                                        
                                        {!formData.ownersPendingInfo && (
                                            <div className="space-y-3">
                                                {(formData.additionalOwners || []).map((owner, index) => (
                                                    <div key={index} className="flex gap-2 items-start">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            <Input
                                                                placeholder="Full name"
                                                                value={owner.fullName}
                                                                onChange={(e) => {
                                                                    const newOwners = [...(formData.additionalOwners || [])];
                                                                    newOwners[index] = { ...owner, fullName: e.target.value };
                                                                    setFormData(prev => ({ ...prev, additionalOwners: newOwners }));
                                                                }}
                                                            />
                                                            <Input
                                                                type="email"
                                                                placeholder="Email address"
                                                                value={owner.email}
                                                                onChange={(e) => {
                                                                    const newOwners = [...(formData.additionalOwners || [])];
                                                                    newOwners[index] = { ...owner, email: e.target.value };
                                                                    setFormData(prev => ({ ...prev, additionalOwners: newOwners }));
                                                                }}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const newOwners = (formData.additionalOwners || []).filter((_, i) => i !== index);
                                                                setFormData(prev => ({ ...prev, additionalOwners: newOwners }));
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            additionalOwners: [...(prev.additionalOwners || []), { fullName: '', email: '' }]
                                                        }));
                                                    }}
                                                    className="w-full"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add another owner
                                                </Button>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center space-x-2 pt-2">
                                            <Checkbox
                                                id="owners_pending_info"
                                                checked={formData.ownersPendingInfo}
                                                onCheckedChange={(checked) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        ownersPendingInfo: checked === true,
                                                        additionalOwners: checked === true ? [] : prev.additionalOwners
                                                    }));
                                                }}
                                            />
                                            <Label htmlFor="owners_pending_info" className="text-sm font-normal cursor-pointer">
                                                I don't have their email addresses right now
                                            </Label>
                                        </div>
                                        
                                        {formData.ownersPendingInfo && (
                                            <p className="text-xs text-muted-foreground">
                                                You can add them later from your dashboard.
                                            </p>
                                        )}
                                        
                                        {!formData.ownersPendingInfo && formData.isSoleController === false && formData.additionalOwners && formData.additionalOwners.length > 0 && (
                                            <div className="space-y-2">
                                                {formData.additionalOwners.map((owner, index) => {
                                                    const nameError = errors[`owner_${index}_name`];
                                                    const emailError = errors[`owner_${index}_email`];
                                                    return (nameError || emailError) ? (
                                                        <div key={index} className="text-xs text-destructive">
                                                            {nameError && <p>Owner {index + 1} name: {nameError}</p>}
                                                            {emailError && <p>Owner {index + 1} email: {emailError}</p>}
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm text-muted-foreground">
                                We ask this for compliance and account security. Additional owners will need to complete identity verification.
                            </div>
                    </SectionCard>

                    </div>

                    {/* Submit Button */}
                    <div className="text-center">
                        <ScrollToTopButton
                            onClick={() => {
                                if (validateForm()) {
                                    onNext(buildPayload());
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
