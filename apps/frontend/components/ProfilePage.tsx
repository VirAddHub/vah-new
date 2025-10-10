"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, User, Mail, Phone, Building2, MapPin, Save, Edit, ShieldCheck, CheckCircle, Loader2 } from "lucide-react";
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
        phone: '',
        company_name: '',
        forwarding_address: ''
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
                        phone: response.data.phone || '',
                        company_name: response.data.company_name || '',
                        forwarding_address: response.data.forwarding_address || ''
                    });
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
            const response = await profileService.updateProfile(formData);
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
            <div className="min-h-screen bg-background">
                <div className="container-modern py-24">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="container-modern py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onGoBack}
                                className="btn-outline"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <h1 className="text-2xl font-bold">Profile Settings</h1>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {editing ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditing(false)}
                                        className="btn-outline"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn-primary"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => setEditing(true)}
                                    className="btn-primary"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-modern py-8">
                {/* Profile Overview */}
                <div className="mb-8">
                    <Card className="card-modern p-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center">
                                <User className="h-10 w-10 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold mb-2">
                                    {profile?.first_name} {profile?.last_name}
                                </h2>
                                <p className="text-muted-foreground mb-2">{profile?.email}</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="success" className="bg-success/20 text-success">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verified Account
                                    </Badge>
                                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                        Active Service
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Profile Form */}
                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Personal Information */}
                    <Card className="card-modern">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="first_name" className="text-sm font-medium mb-2 block">
                                        First Name
                                    </Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => handleChange('first_name', e.target.value)}
                                        disabled={!editing}
                                        className="form-input"
                                        placeholder="Enter your first name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="last_name" className="text-sm font-medium mb-2 block">
                                        Last Name
                                    </Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => handleChange('last_name', e.target.value)}
                                        disabled={!editing}
                                        className="form-input"
                                        placeholder="Enter your last name"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <Label htmlFor="phone" className="text-sm font-medium mb-2 block">
                                    Phone Number
                                </Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    disabled={!editing}
                                    className="form-input"
                                    placeholder="Enter your phone number"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Business Information */}
                    <Card className="card-modern">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Business Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="company_name" className="text-sm font-medium mb-2 block">
                                    Company Name
                                </Label>
                                <Input
                                    id="company_name"
                                    value={formData.company_name}
                                    onChange={(e) => handleChange('company_name', e.target.value)}
                                    disabled={!editing}
                                    className="form-input"
                                    placeholder="Enter your company name"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="forwarding_address" className="text-sm font-medium mb-2 block">
                                    Forwarding Address
                                </Label>
                                <Textarea
                                    id="forwarding_address"
                                    value={formData.forwarding_address}
                                    onChange={(e) => handleChange('forwarding_address', e.target.value)}
                                    disabled={!editing}
                                    className="form-input"
                                    placeholder="Enter your forwarding address"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Service Information */}
                <div className="mt-8">
                    <Card className="card-modern">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Service Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <h4 className="font-semibold mb-2">Your London Address</h4>
                                    <p className="text-muted-foreground mb-2">
                                        This is your professional business address for all official correspondence.
                                    </p>
                                    <div className="p-4 bg-muted/50 rounded-xl">
                                        <p className="font-mono text-sm">
                                            {profile?.london_address || '123 Business Street, London, EC1A 4HD'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-semibold mb-2">Service Status</h4>
                                    <p className="text-muted-foreground mb-2">
                                        Your current service plan and status.
                                    </p>
                                    <div className="space-y-2">
                                        <Badge variant="success" className="bg-success/20 text-success">
                                            Active Service
                                        </Badge>
                                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                                            Premium Plan
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Account Actions */}
                <div className="mt-8">
                    <Card className="card-modern">
                        <CardHeader>
                            <CardTitle>Account Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <Button
                                    variant="outline"
                                    onClick={() => onNavigate('dashboard')}
                                    className="btn-outline"
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    View Dashboard
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onNavigate('help')}
                                    className="btn-outline"
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Contact Support
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onNavigate('pricing')}
                                    className="btn-outline"
                                >
                                    <Building2 className="mr-2 h-4 w-4" />
                                    Manage Plan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}