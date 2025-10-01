"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/apiClient";
import { mailService, forwardingService, profileService, billingService, plansService } from "../lib/services";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { LogOut, Mail, Truck, Settings, RefreshCw, User, CreditCard, FileText } from "lucide-react";

interface SimpleDashboardProps {
    onLogout: () => void;
    onNavigate: (page: string) => void;
    onGoBack: () => void;
}

export function SimpleDashboard({ onLogout, onNavigate, onGoBack }: SimpleDashboardProps) {
    const { user, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [mailItems, setMailItems] = useState<any[]>([]);
    const [forwardingRequests, setForwardingRequests] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [billing, setBilling] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load user data and all dashboard information using the service layer
                const [
                    whoamiResponse,
                    mailResponse,
                    forwardingResponse,
                    profileResponse,
                    billingResponse,
                    plansResponse
                ] = await Promise.allSettled([
                    apiClient.whoami(),
                    mailService.getMailItems(),
                    forwardingService.getForwardingRequests(),
                    profileService.getProfile(),
                    billingService.getBillingOverview(),
                    plansService.getPlans()
                ]);

                // Handle user data
                if (whoamiResponse.status === 'fulfilled' && whoamiResponse.value.ok) {
                    const userData = whoamiResponse.value.data?.user;
                    if (userData) {
                        setUserData(userData);
                        setProfile({
                            id: userData.id,
                            email: userData.email,
                            name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
                            is_admin: userData.is_admin,
                            role: userData.role
                        });
                    }
                }

                // Handle mail items
                if (mailResponse.status === 'fulfilled' && mailResponse.value.ok) {
                    setMailItems(mailResponse.value.data || []);
                } else {
                    console.warn('Failed to load mail items:', mailResponse.status === 'rejected' ? mailResponse.reason : 'API error');
                }

                // Handle forwarding requests
                if (forwardingResponse.status === 'fulfilled' && forwardingResponse.value.ok) {
                    setForwardingRequests(forwardingResponse.value.data || []);
                } else {
                    console.warn('Failed to load forwarding requests:', forwardingResponse.status === 'rejected' ? forwardingResponse.reason : 'API error');
                }

                // Handle profile data
                if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
                    setProfile(profileResponse.value.data);
                } else {
                    console.warn('Failed to load profile:', profileResponse.status === 'rejected' ? profileResponse.reason : 'API error');
                }

                // Handle billing data
                if (billingResponse.status === 'fulfilled' && billingResponse.value.ok) {
                    setBilling(billingResponse.value);
                } else {
                    console.warn('Failed to load billing:', billingResponse.status === 'rejected' ? billingResponse.reason : 'API error');
                }

                // Handle plans data
                if (plansResponse.status === 'fulfilled' && plansResponse.value.ok) {
                    setPlans(plansResponse.value.data || []);
                } else {
                    console.warn('Failed to load plans:', plansResponse.status === 'rejected' ? plansResponse.reason : 'API error');
                }

            } catch (err) {
                console.error('Failed to load dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            loadDashboardData();
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You need to be logged in to access the dashboard.</p>
                        <Button onClick={() => window.location.href = '/login'} className="w-full mt-4">
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 flex">
                        <h1 className="text-xl font-bold">VirtualAddressHub</h1>
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                    {userData?.role || user?.role || 'user'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {userData?.email || user?.email}
                                </span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={onLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-6">
                {error && (
                    <Alert className="mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Welcome Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Welcome
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Welcome to your VirtualAddressHub dashboard!
                            </p>
                            <div className="mt-4 space-y-2">
                                <div className="text-sm">
                                    <strong>Email:</strong> {userData?.email || user?.email}
                                </div>
                                <div className="text-sm">
                                    <strong>Role:</strong> {userData?.role || user?.role || 'user'}
                                </div>
                                <div className="text-sm">
                                    <strong>Admin:</strong> {userData?.is_admin ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mail Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Mail Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Manage your virtual mail
                            </p>
                            <div className="mt-4">
                                <Badge variant="secondary">{mailItems.length} items</Badge>
                            </div>
                            {mailItems.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {mailItems.slice(0, 3).map((item) => (
                                        <div key={item.id} className="text-xs text-muted-foreground">
                                            {item.subject || 'No subject'} - {new Date(item.received_at).toLocaleDateString()}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button variant="outline" size="sm" className="mt-2">
                                View Mail
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Forwarding Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Forwarding
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Manage forwarding requests
                            </p>
                            <div className="mt-4">
                                <Badge variant="secondary">{forwardingRequests.length} requests</Badge>
                            </div>
                            {forwardingRequests.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {forwardingRequests.slice(0, 3).map((request) => (
                                        <div key={request.id} className="text-xs text-muted-foreground">
                                            {request.to_name} - <Badge variant="outline" className="text-xs">{request.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button variant="outline" size="sm" className="mt-2">
                                View Requests
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Profile Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Manage your profile
                            </p>
                            <div className="mt-4 space-y-1">
                                <div className="text-xs">
                                    <strong>Name:</strong> {profile?.first_name} {profile?.last_name}
                                </div>
                                <div className="text-xs">
                                    <strong>Company:</strong> {profile?.company_name || 'Not set'}
                                </div>
                                <div className="text-xs">
                                    <strong>Phone:</strong> {profile?.phone || 'Not set'}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                                Edit Profile
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Billing Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Billing
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Manage your subscription
                            </p>
                            <div className="mt-4 space-y-1">
                                <div className="text-xs">
                                    <strong>Plan:</strong> {billing?.current_plan || 'Free'}
                                </div>
                                <div className="text-xs">
                                    <strong>Next Billing:</strong> {billing?.next_billing_date ? new Date(billing.next_billing_date).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="text-xs">
                                    <strong>Amount Due:</strong> {billing?.amount_due ? `£${billing.amount_due}` : '£0'}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                                Manage Billing
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Plans Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Available Plans
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                View subscription plans
                            </p>
                            <div className="mt-4">
                                <Badge variant="secondary">{plans.length} plans available</Badge>
                            </div>
                            {plans.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {plans.slice(0, 3).map((plan) => (
                                        <div key={plan.id} className="text-xs text-muted-foreground">
                                            {plan.name} - £{plan.price_monthly}/month
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button variant="outline" size="sm" className="mt-2">
                                View Plans
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => onNavigate('profile')}>
                                Update Profile
                            </Button>
                            <Button variant="outline" onClick={() => onNavigate('settings')}>
                                Settings
                            </Button>
                            <Button variant="outline" onClick={() => onNavigate('support')}>
                                Support
                            </Button>
                            <Button variant="outline" onClick={onGoBack}>
                                Back to Home
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Debug Info */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Debug Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div><strong>Authentication Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
                            <div><strong>User ID:</strong> {userData?.id || user?.id || 'N/A'}</div>
                            <div><strong>Email:</strong> {userData?.email || user?.email || 'N/A'}</div>
                            <div><strong>Role:</strong> {userData?.role || user?.role || 'N/A'}</div>
                            <div><strong>Is Admin:</strong> {userData?.is_admin ? 'Yes' : 'No'}</div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Page
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
