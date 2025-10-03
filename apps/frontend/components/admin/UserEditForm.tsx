"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
    User,
    Mail,
    Building2,
    MapPin,
    Phone,
    Shield,
    Save,
    X,
    AlertTriangle,
    CheckCircle,
    UserCheck,
    UserX,
} from "lucide-react";
import { apiClient, logAdminAction, validateEmail } from "../../lib";
import { getErrorMessage, getErrorStack } from "../../lib/errors";
import { usePlans } from "../../hooks/usePlans";

interface UserEditFormProps {
    user: any;
    onSuccess: (user: any) => void;
    onCancel: () => void;
}

interface UserFormData {
    // Personal Information
    firstName: string;
    lastName: string;
    email: string;
    phone: string;

    // Business Information
    companyName: string;
    businessType: string;
    companyNumber: string;
    vatNumber: string;

    // Address Information
    addressLine1: string;
    addressLine2: string;
    city: string;
    postcode: string;
    country: string;

    // Account Settings
    plan: string;
    role: string;
    isAdmin: boolean;
    status: string;
    kycStatus: string;
}

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
    const [formData, setFormData] = useState<UserFormData>({
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ')[1] || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
        businessType: user.businessType || '',
        companyNumber: user.companyNumber || '',
        vatNumber: user.vatNumber || '',
        addressLine1: user.address?.line1 || '',
        addressLine2: user.address?.line2 || '',
        city: user.address?.city || '',
        postcode: user.address?.postcode || '',
        country: user.address?.country || 'United Kingdom',
        plan: user.plan || 'basic',
        role: user.role || 'user',
        isAdmin: user.is_admin || false,
        status: user.status || 'active',
        kycStatus: user.kyc_status || 'pending'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Use plans hook to get real-time pricing data
    const { plans, loading: plansLoading } = usePlans();

    const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Required fields validation
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.companyName.trim()) errors.companyName = 'Company name is required';
        if (!formData.addressLine1.trim()) errors.addressLine1 = 'Address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.postcode.trim()) errors.postcode = 'Postcode is required';

        // Phone validation (if provided)
        if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
            errors.phone = 'Please enter a valid phone number';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) {
            setError('Please fix the validation errors below');
            return;
        }

        setLoading(true);

        try {
            await logAdminAction('admin_edit_user_started', {
                userId: user.id,
                email: formData.email,
                changes: formData
            });

            const userData = {
                // Personal Information
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),

                // Business Information
                companyName: formData.companyName.trim(),
                businessType: formData.businessType.trim(),
                companyNumber: formData.companyNumber.trim(),
                vatNumber: formData.vatNumber.trim(),

                // Address Information
                address: {
                    line1: formData.addressLine1.trim(),
                    line2: formData.addressLine2.trim(),
                    city: formData.city.trim(),
                    postcode: formData.postcode.trim(),
                    country: formData.country
                },

                // Account Settings
                plan: formData.plan,
                role: formData.role,
                is_admin: formData.isAdmin,
                status: formData.status,
                kyc_status: formData.kycStatus
            };

            const response = await apiClient.put(`/api/admin/users/${user.id}`, userData);

            await logAdminAction('admin_edit_user_success', {
                userId: user.id,
                email: formData.email,
                changes: formData
            });

            setSuccess('User updated successfully!');

            // Call success callback with updated user
            setTimeout(() => {
                onSuccess(response.user);
            }, 1500);

        } catch (error: any) {
            await logAdminAction('admin_edit_user_error', {
                userId: user.id,
                email: formData.email,
                error_message: getErrorMessage(error), stack: getErrorStack(error)
            });

            setError(getErrorMessage(error) || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspendUser = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_suspend_user', { userId: user.id });
            await apiClient.put(`/api/admin/users/${user.id}/suspend`);
            setSuccess('User suspended successfully!');
            setTimeout(() => {
                onSuccess({ ...user, status: 'suspended' });
            }, 1500);
        } catch (error: any) {
            setError(getErrorMessage(error) || 'Failed to suspend user');
        } finally {
            setLoading(false);
        }
    };

    const handleActivateUser = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_activate_user', { userId: user.id });
            await apiClient.put(`/api/admin/users/${user.id}/activate`);
            setSuccess('User activated successfully!');
            setTimeout(() => {
                onSuccess({ ...user, status: 'active' });
            }, 1500);
        } catch (error: any) {
            setError(getErrorMessage(error) || 'Failed to activate user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <User className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold">Edit User: {user.name}</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {error && (
                        <Alert className="mb-4" variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="mb-4">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Tabs defaultValue="personal" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="personal">Personal</TabsTrigger>
                                <TabsTrigger value="business">Business</TabsTrigger>
                                <TabsTrigger value="address">Address</TabsTrigger>
                                <TabsTrigger value="account">Account</TabsTrigger>
                            </TabsList>

                            <TabsContent value="personal" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5" />
                                            Personal Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">First Name *</Label>
                                                <Input
                                                    id="firstName"
                                                    value={formData.firstName}
                                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                    placeholder="John"
                                                    className={validationErrors.firstName ? 'border-red-500' : ''}
                                                />
                                                {validationErrors.firstName && (
                                                    <p className="text-sm text-red-500">{validationErrors.firstName}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Last Name *</Label>
                                                <Input
                                                    id="lastName"
                                                    value={formData.lastName}
                                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                    placeholder="Doe"
                                                    className={validationErrors.lastName ? 'border-red-500' : ''}
                                                />
                                                {validationErrors.lastName && (
                                                    <p className="text-sm text-red-500">{validationErrors.lastName}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                placeholder="john.doe@company.com"
                                                className={validationErrors.email ? 'border-red-500' : ''}
                                            />
                                            {validationErrors.email && (
                                                <p className="text-sm text-red-500">{validationErrors.email}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                placeholder="+44 20 7123 4567"
                                                className={validationErrors.phone ? 'border-red-500' : ''}
                                            />
                                            {validationErrors.phone && (
                                                <p className="text-sm text-red-500">{validationErrors.phone}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="business" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5" />
                                            Business Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="companyName">Company Name *</Label>
                                            <Input
                                                id="companyName"
                                                value={formData.companyName}
                                                onChange={(e) => handleInputChange('companyName', e.target.value)}
                                                placeholder="Acme Corporation Ltd"
                                                className={validationErrors.companyName ? 'border-red-500' : ''}
                                            />
                                            {validationErrors.companyName && (
                                                <p className="text-sm text-red-500">{validationErrors.companyName}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="businessType">Business Type</Label>
                                            <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select business type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="limited_company">Limited Company</SelectItem>
                                                    <SelectItem value="sole_trader">Sole Trader</SelectItem>
                                                    <SelectItem value="partnership">Partnership</SelectItem>
                                                    <SelectItem value="llp">Limited Liability Partnership</SelectItem>
                                                    <SelectItem value="charity">Charity</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="companyNumber">Company Number</Label>
                                                <Input
                                                    id="companyNumber"
                                                    value={formData.companyNumber}
                                                    onChange={(e) => handleInputChange('companyNumber', e.target.value)}
                                                    placeholder="12345678"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="vatNumber">VAT Number</Label>
                                                <Input
                                                    id="vatNumber"
                                                    value={formData.vatNumber}
                                                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                                                    placeholder="GB123456789"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="address" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5" />
                                            Address Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="addressLine1">Address Line 1 *</Label>
                                            <Input
                                                id="addressLine1"
                                                value={formData.addressLine1}
                                                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                                                placeholder="123 Business Street"
                                                className={validationErrors.addressLine1 ? 'border-red-500' : ''}
                                            />
                                            {validationErrors.addressLine1 && (
                                                <p className="text-sm text-red-500">{validationErrors.addressLine1}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="addressLine2">Address Line 2</Label>
                                            <Input
                                                id="addressLine2"
                                                value={formData.addressLine2}
                                                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                                                placeholder="Suite 100"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City *</Label>
                                                <Input
                                                    id="city"
                                                    value={formData.city}
                                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                                    placeholder="London"
                                                    className={validationErrors.city ? 'border-red-500' : ''}
                                                />
                                                {validationErrors.city && (
                                                    <p className="text-sm text-red-500">{validationErrors.city}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="postcode">Postcode *</Label>
                                                <Input
                                                    id="postcode"
                                                    value={formData.postcode}
                                                    onChange={(e) => handleInputChange('postcode', e.target.value)}
                                                    placeholder="SW1A 1AA"
                                                    className={validationErrors.postcode ? 'border-red-500' : ''}
                                                />
                                                {validationErrors.postcode && (
                                                    <p className="text-sm text-red-500">{validationErrors.postcode}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="country">Country</Label>
                                                <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                                        <SelectItem value="United States">United States</SelectItem>
                                                        <SelectItem value="Canada">Canada</SelectItem>
                                                        <SelectItem value="Australia">Australia</SelectItem>
                                                        <SelectItem value="Germany">Germany</SelectItem>
                                                        <SelectItem value="France">France</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="account" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            Account Settings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="plan">Subscription Plan</Label>
                                                <Select value={formData.plan} onValueChange={(value) => handleInputChange('plan', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {plansLoading ? (
                                                            <SelectItem value="" disabled>Loading plans...</SelectItem>
                                                        ) : plans.length === 0 ? (
                                                            <SelectItem value="" disabled>No plans available</SelectItem>
                                                        ) : (
                                                            plans.map((plan) => (
                                                                <SelectItem key={plan.id} value={plan.id}>
                                                                    {plan.name} - {plan.priceFormatted}/{plan.interval}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="role">User Role</Label>
                                                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="status">Account Status</Label>
                                                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="suspended">Suspended</SelectItem>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="kycStatus">KYC Status</Label>
                                                <Select value={formData.kycStatus} onValueChange={(value) => handleInputChange('kycStatus', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="approved">Approved</SelectItem>
                                                        <SelectItem value="rejected">Rejected</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="isAdmin"
                                                    checked={formData.isAdmin}
                                                    onChange={(e) => handleInputChange('isAdmin', e.target.checked)}
                                                    className="rounded"
                                                />
                                                <Label htmlFor="isAdmin">Grant Admin Access</Label>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-between mt-6">
                            <div className="flex gap-2">
                                {formData.status === 'active' ? (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleSuspendUser}
                                        disabled={loading}
                                    >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Suspend User
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleActivateUser}
                                        disabled={loading}
                                    >
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Activate User
                                    </Button>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <div className="h-4 w-4 mr-2 animate-spin border-2 border-gray-300 border-t-blue-600 rounded-full" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Update User
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
