"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import {
    Settings,
    Bell,
    Shield,
    Database,
    Mail,
    CreditCard,
    Globe,
    Save,
    RefreshCcw,
    AlertTriangle,
    CheckCircle,
    Server,
    Key,
    Users,
    FileText,
} from "lucide-react";
import { apiClient, logAdminAction, useApiData } from "../../lib";

interface SystemSettings {
    general: {
        siteName: string;
        siteUrl: string;
        adminEmail: string;
        timezone: string;
        maintenanceMode: boolean;
    };
    notifications: {
        emailNotifications: boolean;
        smsNotifications: boolean;
        pushNotifications: boolean;
        adminAlerts: boolean;
        userAlerts: boolean;
    };
    integrations: {
        mailProvider: string;
        paymentProvider: string;
        kycProvider: string;
        analyticsProvider: string;
        emailProvider: string;
    };
    security: {
        twoFactorAuth: boolean;
        sessionTimeout: number;
        passwordPolicy: string;
        ipWhitelist: string[];
        auditLogging: boolean;
    };
}

interface SettingsSectionProps { }

export function SettingsSection({ }: SettingsSectionProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<SystemSettings>({
        general: {
            siteName: "VirtualAddressHub",
            siteUrl: "https://virtualaddresshub.com",
            adminEmail: "admin@virtualaddresshub.com",
            timezone: "Europe/London",
            maintenanceMode: false
        },
        notifications: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true,
            adminAlerts: true,
            userAlerts: true
        },
        integrations: {
            mailProvider: "royal_mail",
            paymentProvider: "stripe",
            kycProvider: "sumsub",
            analyticsProvider: "google_analytics",
            emailProvider: "postmark"
        },
        security: {
            twoFactorAuth: true,
            sessionTimeout: 30,
            passwordPolicy: "strong",
            ipWhitelist: [],
            auditLogging: true
        }
    });

    // API Data fetching
    const { data: systemSettings, isLoading: settingsLoading, refetch: refetchSettings } = useApiData('/api/admin/settings');
    const { data: systemHealth, isLoading: healthLoading } = useApiData('/api/admin/system/health');

    useEffect(() => {
        if (systemSettings) {
            setSettings(systemSettings);
        }
    }, [systemSettings]);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_settings_refresh');
            await refetchSettings();
        } catch (error) {
            await logAdminAction('admin_settings_refresh_error', { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (section: string) => {
        setSaving(true);
        try {
            await logAdminAction('admin_save_settings', { section, settings: settings[section] });
            await apiClient.post(`/api/admin/settings/${section}`, settings[section]);
            await refetchSettings();
        } catch (error) {
            await logAdminAction('admin_save_settings_error', { section, error: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleTestIntegration = async (integration: string) => {
        setLoading(true);
        try {
            await logAdminAction('admin_test_integration', { integration });
            const response = await apiClient.post(`/api/admin/integrations/${integration}/test`);
            // Show success/error message
        } catch (error) {
            await logAdminAction('admin_test_integration_error', { integration, error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleBackupDatabase = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_backup_database');
            const response = await apiClient.post('/api/admin/database/backup');
            const blob = new Blob([response.data], { type: 'application/sql' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `database-backup-${new Date().toISOString().split('T')[0]}.sql`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_backup_database_error', { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_clear_cache');
            await apiClient.post('/api/admin/cache/clear');
        } catch (error) {
            await logAdminAction('admin_clear_cache_error', { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSetting = (section: keyof SystemSettings, key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">System Settings</h1>
                    <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="siteName">Site Name</Label>
                                    <Input
                                        id="siteName"
                                        value={settings.general.siteName}
                                        onChange={(e) => handleUpdateSetting('general', 'siteName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="siteUrl">Site URL</Label>
                                    <Input
                                        id="siteUrl"
                                        value={settings.general.siteUrl}
                                        onChange={(e) => handleUpdateSetting('general', 'siteUrl', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminEmail">Admin Email</Label>
                                    <Input
                                        id="adminEmail"
                                        type="email"
                                        value={settings.general.adminEmail}
                                        onChange={(e) => handleUpdateSetting('general', 'adminEmail', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Select value={settings.general.timezone} onValueChange={(value) => handleUpdateSetting('general', 'timezone', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Europe/London">Europe/London</SelectItem>
                                            <SelectItem value="America/New_York">America/New_York</SelectItem>
                                            <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                                            <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="maintenanceMode"
                                    checked={settings.general.maintenanceMode}
                                    onCheckedChange={(checked) => handleUpdateSetting('general', 'maintenanceMode', checked)}
                                />
                                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                            </div>
                            <Button onClick={() => handleSaveSettings('general')} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save General Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Send email notifications to users</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.emailNotifications}
                                        onCheckedChange={(checked) => handleUpdateSetting('notifications', 'emailNotifications', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>SMS Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Send SMS notifications to users</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.smsNotifications}
                                        onCheckedChange={(checked) => handleUpdateSetting('notifications', 'smsNotifications', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Push Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Send push notifications to users</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.pushNotifications}
                                        onCheckedChange={(checked) => handleUpdateSetting('notifications', 'pushNotifications', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Admin Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Send alerts to admin users</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.adminAlerts}
                                        onCheckedChange={(checked) => handleUpdateSetting('notifications', 'adminAlerts', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>User Alerts</Label>
                                        <p className="text-sm text-muted-foreground">Send alerts to regular users</p>
                                    </div>
                                    <Switch
                                        checked={settings.notifications.userAlerts}
                                        onCheckedChange={(checked) => handleUpdateSetting('notifications', 'userAlerts', checked)}
                                    />
                                </div>
                            </div>
                            <Button onClick={() => handleSaveSettings('notifications')} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Notification Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Third-party Integrations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Mail Provider</Label>
                                    <Select value={settings.integrations.mailProvider} onValueChange={(value) => handleUpdateSetting('integrations', 'mailProvider', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="royal_mail">Royal Mail</SelectItem>
                                            <SelectItem value="dpd">DPD</SelectItem>
                                            <SelectItem value="ups">UPS</SelectItem>
                                            <SelectItem value="fedex">FedEx</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" onClick={() => handleTestIntegration('mail')}>
                                        Test Connection
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>Payment Provider</Label>
                                    <Select value={settings.integrations.paymentProvider} onValueChange={(value) => handleUpdateSetting('integrations', 'paymentProvider', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="stripe">Stripe</SelectItem>
                                            <SelectItem value="paypal">PayPal</SelectItem>
                                            <SelectItem value="gocardless">GoCardless</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" onClick={() => handleTestIntegration('payment')}>
                                        Test Connection
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>KYC Provider</Label>
                                    <Select value={settings.integrations.kycProvider} onValueChange={(value) => handleUpdateSetting('integrations', 'kycProvider', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sumsub">Sumsub</SelectItem>
                                            <SelectItem value="jumio">Jumio</SelectItem>
                                            <SelectItem value="onfido">Onfido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" onClick={() => handleTestIntegration('kyc')}>
                                        Test Connection
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Provider</Label>
                                    <Select value={settings.integrations.emailProvider} onValueChange={(value) => handleUpdateSetting('integrations', 'emailProvider', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="postmark">Postmark</SelectItem>
                                            <SelectItem value="sendgrid">SendGrid</SelectItem>
                                            <SelectItem value="mailgun">Mailgun</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" onClick={() => handleTestIntegration('email')}>
                                        Test Connection
                                    </Button>
                                </div>
                            </div>
                            <Button onClick={() => handleSaveSettings('integrations')} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Integration Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Two-Factor Authentication</Label>
                                        <p className="text-sm text-muted-foreground">Require 2FA for admin users</p>
                                    </div>
                                    <Switch
                                        checked={settings.security.twoFactorAuth}
                                        onCheckedChange={(checked) => handleUpdateSetting('security', 'twoFactorAuth', checked)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                                    <Input
                                        id="sessionTimeout"
                                        type="number"
                                        value={settings.security.sessionTimeout}
                                        onChange={(e) => handleUpdateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password Policy</Label>
                                    <Select value={settings.security.passwordPolicy} onValueChange={(value) => handleUpdateSetting('security', 'passwordPolicy', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="basic">Basic</SelectItem>
                                            <SelectItem value="strong">Strong</SelectItem>
                                            <SelectItem value="very_strong">Very Strong</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Audit Logging</Label>
                                        <p className="text-sm text-muted-foreground">Log all admin actions</p>
                                    </div>
                                    <Switch
                                        checked={settings.security.auditLogging}
                                        onCheckedChange={(checked) => handleUpdateSetting('security', 'auditLogging', checked)}
                                    />
                                </div>
                            </div>
                            <Button onClick={() => handleSaveSettings('security')} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Security Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Maintenance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold">Database Operations</h3>
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={handleBackupDatabase}
                                        disabled={loading}
                                    >
                                        <Database className="h-4 w-4" />
                                        Backup Database
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold">Cache Operations</h3>
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={handleClearCache}
                                        disabled={loading}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Clear Cache
                                    </Button>
                                </div>
                            </div>

                            {systemHealth && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold">System Health</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-2">
                                            <Server className="h-4 w-4 text-green-500" />
                                            <span className="text-sm">Database: {systemHealth.database ? 'Healthy' : 'Unhealthy'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Key className="h-4 w-4 text-green-500" />
                                            <span className="text-sm">API Keys: {systemHealth.apiKeys ? 'Valid' : 'Invalid'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-green-500" />
                                            <span className="text-sm">Users: {systemHealth.users}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
