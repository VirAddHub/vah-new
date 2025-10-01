"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/apiClient";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { LogOut, Mail, Truck, Settings, RefreshCw } from "lucide-react";

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

    useEffect(() => {
        const loadUserData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Get user data from whoami endpoint
                const response = await apiClient.whoami();
                if (response.ok) {
                    setUserData(response.data?.user);
                } else {
                    setError('Failed to load user data');
                }
            } catch (err) {
                console.error('Failed to load user data:', err);
                setError('Failed to load user data');
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            loadUserData();
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

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                <Badge variant="secondary">0 items</Badge>
                            </div>
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
                                <Badge variant="secondary">0 requests</Badge>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                                View Requests
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
