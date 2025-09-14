'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from '@/app/components/AddressAutocomplete';
import CompanySearchInput from '@/app/components/CompanySearchInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignupStep2() {
    const router = useRouter();
    const [form, setForm] = useState({
        business_name: '',
        company_number: '',
        address_line1: '',
        address_line2: '',
        address_line3: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom',
    });
    const [busy, setBusy] = useState(false);

    const handleCompanySelected = (profile: any) => {
        setForm((f) => ({
            ...f,
            business_name: profile.company_name ?? f.business_name,
            company_number: profile.company_number ?? '',
            address_line1: profile.registered_office_address?.address_line_1 ?? '',
            address_line2: profile.registered_office_address?.address_line_2 ?? '',
            city: profile.registered_office_address?.locality ?? '',
            county: profile.registered_office_address?.region ?? '',
            postcode: profile.registered_office_address?.postal_code ?? '',
            country: 'United Kingdom',
        }));
    };

    const handleAddressSelected = (addr: any) => {
        setForm((f) => ({
            ...f,
            address_line1: addr.line1,
            address_line2: addr.line2 || '',
            address_line3: addr.line3 || '',
            city: addr.city,
            county: addr.county || '',
            postcode: addr.postcode,
            country: addr.country || 'United Kingdom',
        }));
    };

    const handleNext = async () => {
        if (!form.business_name || !form.address_line1 || !form.city || !form.postcode) {
            return;
        }

        setBusy(true);
        try {
            const response = await fetch('/api/bff/signup/step-2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_name: form.business_name,
                    trading_name: form.trading_name || '',
                    companies_house_number: form.company_number || '',
                    address_line1: form.address_line1,
                    address_line2: form.address_line2 || '',
                    city: form.city,
                    postcode: form.postcode,
                    phone: '', // TODO: Add phone field to form
                    email: '' // TODO: Get from user context
                })
            });

            if (response.ok) {
                router.push('/signup/step-3');
            } else {
                alert('Failed to save business details');
            }
        } catch (error) {
            console.error('Error saving business details:', error);
            alert('Failed to save business details');
        } finally {
            setBusy(false);
        }
    };

    const handleBack = () => {
        router.push('/signup');
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <h1 className="text-2xl font-semibold mb-6">Your business details</h1>

            <div className="space-y-6">
                {/* Business Name */}
                <div>
                    <label className="block text-sm font-medium mb-2">Business name *</label>
                    <Input
                        value={form.business_name}
                        onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                        placeholder="e.g. Monzo Bank Ltd"
                        required
                    />
                </div>

                {/* Company Search */}
                <div>
                    <label className="block text-sm font-medium mb-2">Search Companies House (optional)</label>
                    <CompanySearchInput
                        onCompanySelected={handleCompanySelected}
                        placeholder="Search for your company..."
                    />
                </div>

                {/* Address Search */}
                <div>
                    <AddressAutocomplete
                        onSelected={handleAddressSelected}
                        placeholder="Start typing your address…"
                        label="Business address *"
                    />
                </div>

                {/* Address Fields for Review/Edit */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Address details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Address line 1 *</label>
                            <Input
                                value={form.address_line1}
                                onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
                                placeholder="Street address"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address line 2</label>
                            <Input
                                value={form.address_line2}
                                onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))}
                                placeholder="Apartment, suite, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address line 3</label>
                            <Input
                                value={form.address_line3}
                                onChange={(e) => setForm((f) => ({ ...f, address_line3: e.target.value }))}
                                placeholder="Additional address info"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Town/City *</label>
                            <Input
                                value={form.city}
                                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                                placeholder="City"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">County</label>
                            <Input
                                value={form.county}
                                onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))}
                                placeholder="County"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Postcode *</label>
                            <Input
                                value={form.postcode}
                                onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value.toUpperCase() }))}
                                placeholder="Postcode"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Country *</label>
                            <Input
                                value={form.country}
                                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                                placeholder="Country"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                    <Button onClick={handleNext} disabled={busy || !form.business_name || !form.address_line1 || !form.city || !form.postcode}>
                        {busy ? 'Saving…' : 'Continue to Payment'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
