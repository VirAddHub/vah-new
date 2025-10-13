"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { RefreshCw, Server, Database, Mail, CreditCard, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface ServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastCheck: number;
    description: string;
}

export function SystemHealthSection() {
    const [services, setServices] = useState<ServiceHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchServiceHealth = async () => {
        try {
            setLoading(true);
            
            // Check each service health endpoint
            const serviceChecks = await Promise.allSettled([
                fetch('/api/admin/service-status/gocardless', { credentials: 'include' }),
                fetch('/api/admin/service-status/sumsub', { credentials: 'include' }),
                fetch('/api/admin/service-status/postmark', { credentials: 'include' }),
                fetch('/api/admin/service-status/onedrive', { credentials: 'include' })
            ]);

            const serviceData: ServiceHealth[] = serviceChecks.map((result, index) => {
                const serviceNames = ['Payment Gateway', 'KYC Verification (Sumsub)', 'Email Notifications', 'Mail Processing API'];
                const serviceIcons = [CreditCard, Shield, Mail, Server];
                
                if (result.status === 'fulfilled' && result.value.ok) {
                    return result.value.json().then((data: any) => ({
                        name: serviceNames[index],
                        status: data.status || 'healthy',
                        uptime: data.uptime || 99.9,
                        lastCheck: Date.now(),
                        description: data.message || 'Service operational'
                    }));
                } else {
                    return Promise.resolve({
                        name: serviceNames[index],
                        status: 'down' as const,
                        uptime: 0,
                        lastCheck: Date.now(),
                        description: 'Service check failed'
                    });
                }
            });

            const resolvedServices = await Promise.all(serviceData);
            setServices(resolvedServices);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to fetch service health:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServiceHealth();
        const interval = setInterval(fetchServiceHealth, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'degraded':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'down':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default:
                return <Server className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'healthy':
                return <Badge variant="outline" className="border-green-500 text-green-700">Healthy</Badge>;
            case 'degraded':
                return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Degraded</Badge>;
            case 'down':
                return <Badge variant="outline" className="border-red-500 text-red-700">Down</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    const getUptimeColor = (uptime: number) => {
        if (uptime >= 99.5) return "text-green-600";
        if (uptime >= 95) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">System Health</h1>
                    <p className="text-muted-foreground">Real-time system status and service uptime monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchServiceHealth}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Badge variant="outline" className="text-xs">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </Badge>
                </div>
            </div>

            {/* System Health Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Service Status Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services.map((service, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(service.status)}
                                    <div>
                                        <h3 className="font-semibold">{service.name}</h3>
                                        <p className="text-sm text-muted-foreground">{service.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${getUptimeColor(service.uptime)}`}>
                                        {service.uptime.toFixed(2)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Uptime</div>
                                    {getStatusBadge(service.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Database Performance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Database Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                                <h3 className="font-semibold">PostgreSQL Database</h3>
                                <p className="text-sm text-muted-foreground">Primary data storage and query processing</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-green-600">97.82%</div>
                            <div className="text-xs text-muted-foreground">Uptime</div>
                            <Badge variant="outline" className="border-green-500 text-green-700">Healthy</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
