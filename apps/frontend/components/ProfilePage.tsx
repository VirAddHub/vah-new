"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, User, Mail, Phone, Building2, MapPin, Save, Edit } from "lucide-react";
import { profileService, UserProfile } from "@/lib/services/profile.service";
import { useToast } from "./ui/use-toast";

interface ProfilePageProps {
    onNavigate: (page: string) => void;
    onGoBack: () => void;
}

export function ProfilePage({ onNavigate, onGoBack }: ProfilePageProps) {
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        forwarding_address: ''
    });
    const [forwardingAddress, setForwardingAddress] = useState({
        name: '',
        address1: '',
        address2: '',
        city: '',
        postal: '',
        country: 'United Kingdom'
    });

    // Load profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                const response = await profileService.getProfile();
                if (response.ok && response.data) {
                    setProfile(response.data);
                    setFormData({
                        first_name: response.data.first_name || '',
                        last_name: response.data.last_name || '',
                        email: response.data.email || '',
                        phone: response.data.phone || '',
                        company_name: response.data.company_name || '',
                        forwarding_address: response.data.forwarding_address || ''
                    });

                    // Parse existing forwarding address into separate fields
                    if (response.data.forwarding_address) {
                        const lines = response.data.forwarding_address.split('\n').filter((line: string) => line.trim() !== '');
                        setForwardingAddress({
                            name: lines[0] || '',
                            address1: lines[1] || '',
                            address2: lines[2] || '',
                            city: lines[lines.length - 2]?.split(',')[0]?.trim() || '',
                            postal: lines[lines.length - 2]?.split(',')[1]?.trim() || '',
                            country: lines[lines.length - 1] || 'United Kingdom'
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                toast({
                    title: "Profile Load Failed",
                    description: "Failed to load profile. Please try again.",
                    variant: "destructive",
                    durationMs: 5000,
                });
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);

            // Combine forwarding address fields into the expected format
            const combinedAddress = [
                forwardingAddress.name,
                forwardingAddress.address1,
                forwardingAddress.address2,
                `${forwardingAddress.city}, ${forwardingAddress.postal}`,
                forwardingAddress.country
            ].filter(line => line.trim() !== '').join('\n');

            const response = await profileService.updateProfile({
                ...formData,
                forwarding_address: combinedAddress
            });
            if (response.ok && response.data) {
                setProfile(response.data);
                setEditing(false);
                toast({
                    title: "Profile Updated",
                    description: "Profile updated successfully!",
                    durationMs: 3000,
                });
            } else {
                toast({
                    title: "Profile Update Failed",
                    description: "Failed to update profile. Please try again.",
                    variant: "destructive",
                    durationMs: 5000,
                });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                title: "Profile Update Error",
                description: "Error updating profile. Please try again.",
                variant: "destructive",
                durationMs: 5000,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={onGoBack} className="bg-background/90 backdrop-blur-sm border-border hover:bg-accent hover:border-primary/20 text-foreground shadow-sm hover:shadow-md transition-all duration-200">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <h1 className="text-2xl font-semibold">Profile Settings</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditing(!editing)}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                {editing ? 'Cancel' : 'Edit'}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => handleChange('first_name', e.target.value)}
                                        disabled={!editing || profile?.kyc_status === 'verified'}
                                        placeholder="Enter your first name"
                                    />
                                    {profile?.kyc_status === 'verified' && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Name cannot be changed after KYC verification
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => handleChange('last_name', e.target.value)}
                                        disabled={!editing || profile?.kyc_status === 'verified'}
                                        placeholder="Enter your last name"
                                    />
                                    {profile?.kyc_status === 'verified' && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Name cannot be changed after KYC verification
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    disabled={!editing}
                                    placeholder="your.email@example.com"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    This is your account email address. You'll use this to log in.
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    disabled={!editing}
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            <div>
                                <Label htmlFor="company_name">Company Name</Label>
                                <Input
                                    id="company_name"
                                    value={formData.company_name}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    disabled={!editing}
                                    placeholder="Enter your company name (optional)"
                                />
                            </div>

                            {editing && (
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={() => setEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Forwarding Address */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Forwarding Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-sm text-blue-900 mb-2">Important</h4>
                                <p className="text-sm text-blue-800">
                                    This address will be used for all mail forwarding requests.
                                    Make sure it's accurate and complete.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-base font-medium">Forwarding Address</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        This address will be used automatically when you request mail forwarding.
                                        Make sure it's accurate and complete.
                                    </p>
                                </div>

                                <div className="grid gap-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="forwarding_name">Full Name *</Label>
                                            <Input
                                                id="forwarding_name"
                                                value={forwardingAddress.name}
                                                onChange={(e) => setForwardingAddress({ ...forwardingAddress, name: e.target.value })}
                                                disabled={!editing}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="forwarding_country">Country *</Label>
                                            <Input
                                                id="forwarding_country"
                                                value={forwardingAddress.country}
                                                onChange={(e) => setForwardingAddress({ ...forwardingAddress, country: e.target.value })}
                                                disabled={!editing}
                                                placeholder="United Kingdom"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="forwarding_address1">Address Line 1 *</Label>
                                        <Input
                                            id="forwarding_address1"
                                            value={forwardingAddress.address1}
                                            onChange={(e) => setForwardingAddress({ ...forwardingAddress, address1: e.target.value })}
                                            disabled={!editing}
                                            placeholder="123 Main Street"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="forwarding_address2">Address Line 2</Label>
                                        <Input
                                            id="forwarding_address2"
                                            value={forwardingAddress.address2}
                                            onChange={(e) => setForwardingAddress({ ...forwardingAddress, address2: e.target.value })}
                                            disabled={!editing}
                                            placeholder="Apartment 4B (optional)"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="forwarding_city">City *</Label>
                                            <Input
                                                id="forwarding_city"
                                                value={forwardingAddress.city}
                                                onChange={(e) => setForwardingAddress({ ...forwardingAddress, city: e.target.value })}
                                                disabled={!editing}
                                                placeholder="London"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="forwarding_postal">Postal Code *</Label>
                                            <Input
                                                id="forwarding_postal"
                                                value={forwardingAddress.postal}
                                                onChange={(e) => setForwardingAddress({ ...forwardingAddress, postal: e.target.value })}
                                                disabled={!editing}
                                                placeholder="SW1A 1AA"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {editing && (
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={() => setEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? 'Saving...' : 'Save Address'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Account Information */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Account Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Account Status</Label>
                                <div className="mt-1">
                                    <Badge variant="default">Active</Badge>
                                </div>
                            </div>
                            <div>
                                <Label>Member Since</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
