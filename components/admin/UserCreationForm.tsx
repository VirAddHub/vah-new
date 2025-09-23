"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
    User,
    Mail,
    Building2,
    MapPin,
    Phone,
    CreditCard,
    Shield,
    Save,
    X,
    AlertTriangle,
    CheckCircle,
    Eye,
    EyeOff,
    UserPlus,
    Building,
} from "lucide-react";
import { apiClient, logAdminAction, validateEmail, validatePassword } from "../../lib";

interface UserCreationFormProps {
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
    sendWelcomeEmail: boolean;

    // Password
    password: string;
    confirmPassword: string;
}

export function UserCreationForm({ onSuccess, onCancel }: UserCreationFormProps) {
    const [formData, setFormData] = useState<UserFormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        businessType: '',
        companyNumber: '',
        vatNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        plan: 'basic',
        role: 'user',
        isAdmin: false,
        sendWelcomeEmail: true,
        password: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else {
            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.valid) {
                errors.password = passwordValidation.errors[0];
            }
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

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
            await logAdminAction('admin_create_user_started', {
                email: formData.email,
                companyName: formData.companyName,
                plan: formData.plan,
                isAdmin: formData.isAdmin
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
                send_welcome_email: formData.sendWelcomeEmail,

                // Password
                password: formData.password
            };

            const response = await apiClient.post('/api/admin/users/create', userData);

            await logAdminAction('admin_create_user_success', {
                userId: response.user.id,
                email: formData.email,
                companyName: formData.companyName
            });

            setSuccess('User created successfully!');

            // Call success callback with created user
            setTimeout(() => {
                onSuccess(response.user);
            }, 1500);

        } catch (error: any) {
            await logAdminAction('admin_create_user_error', {
                email: formData.email,
                error: error.message
            });

            setError(error.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({
            ...prev,
            password,
            confirmPassword: password
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <UserPlus className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold">Create New User</h2>
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
                                                        <SelectItem value="basic">Basic - £19.99/month</SelectItem>
                                                        <SelectItem value="premium">Premium - £39.99/month</SelectItem>
                                                        <SelectItem value="professional">Professional - £79.99/month</SelectItem>
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

                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="sendWelcomeEmail"
                                                    checked={formData.sendWelcomeEmail}
                                                    onChange={(e) => handleInputChange('sendWelcomeEmail', e.target.checked)}
                                                    className="rounded"
                                                />
                                                <Label htmlFor="sendWelcomeEmail">Send Welcome Email</Label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                                    placeholder="Enter secure password"
                                                    className={validationErrors.password ? 'border-red-500' : ''}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {validationErrors.password && (
                                                <p className="text-sm text-red-500">{validationErrors.password}</p>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={generatePassword}
                                                className="mt-2"
                                            >
                                                Generate Secure Password
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                    placeholder="Confirm password"
                                                    className={validationErrors.confirmPassword ? 'border-red-500' : ''}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            {validationErrors.confirmPassword && (
                                                <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Save className="h-4 w-4 mr-2 animate-spin" />
                                        Creating User...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Create User
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
