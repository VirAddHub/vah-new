"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { VAHLogo } from './VAHLogo';
import { LogOut, Mail, Truck, CreditCard, Settings, User } from 'lucide-react';

interface SimpleUserDashboardProps {
    onLogout: () => void;
    onNavigate: (page: string) => void;
    onGoBack: () => void;
}

export function SimpleUserDashboard({ onLogout, onNavigate, onGoBack }: SimpleUserDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        console.log('SimpleUserDashboard: Component mounted');

        // Get user from localStorage
        const storedUser = localStorage.getItem('vah_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('SimpleUserDashboard: User loaded:', parsedUser);
                setUser(parsedUser);
            } catch (e) {
                console.error('SimpleUserDashboard: Failed to parse user:', e);
            }
        }

        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border">
                <div className="flex items-center justify-between h-16 px-6">
                    <div className="flex items-center gap-3">
                        <VAHLogo size="md" showText={true} />
                        <div>
                            <p className="text-sm text-muted-foreground">Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onGoBack} className="bg-background/90 backdrop-blur-sm border-border hover:bg-accent hover:border-primary/20 text-foreground shadow-sm hover:shadow-md transition-all duration-200">
                            Back to Home
                        </Button>
                        <Button variant="outline" size="sm" onClick={onLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">
                            Welcome back{user?.first_name ? `, ${user.first_name}` : ''}!
                        </h2>
                        <p className="text-muted-foreground">
                            Manage your virtual address and mail forwarding services.
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Mail Items</CardTitle>
                                <Mail className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">No mail items yet</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Forwarding Requests</CardTitle>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">No requests yet</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Billing</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Active</div>
                                <p className="text-xs text-muted-foreground">Subscription active</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Button variant="outline" className="h-20 flex flex-col gap-2">
                                    <Mail className="h-6 w-6" />
                                    <span>View Mail</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex flex-col gap-2"
                                    onClick={() => onNavigate('forwarding')}
                                >
                                    <Truck className="h-6 w-6" />
                                    <span>Request Forwarding</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex flex-col gap-2"
                                    onClick={() => onNavigate('account')}
                                >
                                    <User className="h-6 w-6" />
                                    <span>Account</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
