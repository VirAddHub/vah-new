'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import {
    Mail,
    FileText,
    Clock,
    TrendingUp,
    RefreshCw,
    Download,
    Plus,
    Bell
} from 'lucide-react';
import { useMail, useMailStats } from '@/lib/swr-hooks';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
    const router = useRouter();
    const { mail, isLoading: mailLoading, refetch: refetchMail } = useMail();
    const { stats, isLoading: statsLoading, refetch: refetchStats } = useMailStats();

    const handleRefresh = () => {
        refetchMail();
        refetchStats();
    };

    const quickActions = [
        {
            label: 'New Scan Request',
            icon: Plus,
            onClick: () => router.push('/dashboard/mail?action=scan'),
            endpoint: '/api/mail/scan'
        },
        {
            label: 'Download Archive',
            icon: Download,
            onClick: () => window.open('/api/export/mail.zip', '_blank'),
            endpoint: '/api/export/mail.zip'
        },
        {
            label: 'View All Mail',
            icon: Mail,
            onClick: () => router.push('/dashboard/mail'),
            endpoint: '/api/mail'
        },
        {
            label: 'Manage Invoices',
            icon: FileText,
            onClick: () => router.push('/dashboard/invoices'),
            endpoint: '/api/invoices'
        }
    ];

    if (mailLoading || statsLoading) {
        return <LoadingSpinner size="lg" text="Loading dashboard..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back! Here's what's happening with your mail.
                    </p>
                </div>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Mail Today</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.newToday || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            +{stats?.newToday || 0} from yesterday
                        </p>
                        <Button
                            variant="link"
                            className="p-0 h-auto text-xs mt-2"
                            onClick={() => refetchMail()}
                        >
                            Refresh → /api/mail?since=today
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unread Items</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.unread || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.unread || 0} items need attention
                        </p>
                        <Button
                            variant="link"
                            className="p-0 h-auto text-xs mt-2"
                            onClick={() => {
                                // Mark all as read
                                fetch('/api/mail/bulk/mark-read', { method: 'POST' })
                                    .then(() => refetchMail());
                            }}
                        >
                            Mark all read → /api/mail/bulk/mark-read
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Invoices Due</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.invoicesDue || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.invoicesDue || 0} invoices pending
                        </p>
                        <Button
                            variant="link"
                            className="p-0 h-auto text-xs mt-2"
                            onClick={() => refetchStats()}
                        >
                            Refresh → /api/invoices?status=due
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mail</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All time mail items
                        </p>
                        <Button
                            variant="link"
                            className="p-0 h-auto text-xs mt-2"
                            onClick={() => refetchStats()}
                        >
                            Refresh → /api/mail/stats
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Mail */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Mail</CardTitle>
                </CardHeader>
                <CardContent>
                    {mail?.length > 0 ? (
                        <div className="space-y-4">
                            {mail.slice(0, 5).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{item.sender || 'Unknown Sender'}</p>
                                            <p className="text-sm text-muted-foreground">{item.subject || 'No Subject'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">
                                            {formatRelativeTime(item.receivedAt || item.createdAt)}
                                        </p>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${item.status === 'unread'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}>
                                            {item.status || 'unknown'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push('/dashboard/mail')}
                            >
                                View All Mail
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No mail items yet</p>
                            <p className="text-sm text-muted-foreground">
                                Your mail will appear here once it's received
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-center space-y-2"
                                onClick={action.onClick}
                            >
                                <action.icon className="h-6 w-6" />
                                <span className="text-sm">{action.label}</span>
                                {process.env.NODE_ENV === 'development' && (
                                    <span className="text-xs text-muted-foreground">
                                        {action.endpoint}
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
