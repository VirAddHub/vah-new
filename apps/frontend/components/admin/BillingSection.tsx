"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
    Download,
    DollarSign,
    FileText,
    TrendingDown,
    ArrowUp,
    ArrowDown,
    CreditCard,
    Receipt,
    AlertTriangle,
    CheckCircle,
    Clock,
} from "lucide-react";
import { apiClient, safe, adminApi } from "../../lib/apiClient";
import { useApiData } from "../../lib/client-hooks";

const logAdminAction = async (action: string, data?: any) => {
    try {
        await apiClient.post('/api/audit/admin-action', {
            action,
            data,
            timestamp: new Date().toISOString(),
            adminId: null // Will be set by backend
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
};
import { getErrorMessage, getErrorStack } from "../../lib/errors";

interface BillingData {
    monthlyRevenue: number;
    outstandingInvoices: number;
    churnRate: number;
    revenueGrowth: number;
    churnChange: number;
    pendingPayments: number;
}

interface Transaction {
    id: number;
    userId: number;
    userName: string;
    type: "subscription" | "one_time" | "refund";
    amount: number;
    currency: string;
    status: "completed" | "pending" | "failed" | "refunded";
    description: string;
    createdAt: string;
    invoiceId?: string;
    paymentMethod: string;
}

type BillingSectionProps = Record<string, never>;

export function BillingSection({ }: BillingSectionProps) {
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("30d");
    const [billingMetrics, setBillingMetrics] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);
    const [isMutating, setIsMutating] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [invoices, setInvoices] = useState<any[]>([]);

    // Load billing metrics
    const loadBillingMetrics = async () => {
        try {
            const response = await adminApi.billingMetrics();
            if (response.ok) {
                setBillingMetrics(response.data);
            }
        } catch (error) {
            console.error('Failed to load billing metrics:', error);
        }
    };

    // Load transactions
    const loadTransactions = useCallback(async () => {
        setIsFetchingTransactions(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(pageSize),
            });

            const resp = await apiClient.getAdminTransactions({ page: page, page_size: pageSize });
            if (resp.ok) {
                const data = resp.data as { items?: any[] };
                setTransactions(data?.items ?? []);
            } else {
                setTransactions([]);
                console.error('Failed to fetch transactions:', resp);
            }
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            setTransactions([]);
        } finally {
            setIsFetchingTransactions(false);
        }
    }, [page, pageSize]);

    // Load invoices
    const loadInvoices = async () => {
        try {
            // Use BFF route (browser traffic should be BFF-only)
            const r = await fetch('/api/bff/admin/invoices?page=1&page_size=25', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = await r.json().catch(() => null);
            if (payload?.ok) {
                const data = payload.data as { items?: any[] };
                setInvoices(safe(data?.items, []));
            } else {
                setInvoices([]);
            }
        } catch (error) {
            console.error('Failed to load invoices:', error);
        }
    };

    useEffect(() => {
        loadBillingMetrics();
        loadInvoices();
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const billing = billingMetrics;
    const transactionsData = transactions;


    const handleExportReports = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_export_billing_reports', { timeRange });

            const response = await apiClient.get(`/api/admin/billing/export?timeRange=${timeRange}`);

            if (!response.ok) {
                throw new Error('Failed to export invoices');
            }
            const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `billing-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_export_billing_reports_error', {
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoice = async (invoiceId: string) => {
        try {
            await logAdminAction('admin_view_invoice', { invoiceId });
            window.open(`/admin/invoices/${invoiceId}`, '_blank');
        } catch (error) {
            await logAdminAction('admin_view_invoice_error', {
                invoiceId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        }
    };

    const handleProcessPayment = async (transactionId: number) => {
        try {
            setIsMutating(true);
            await logAdminAction('admin_process_payment', { transactionId });
            await apiClient.post(`/api/admin/transactions/${transactionId}/process`);
            await loadTransactions();
        } catch (error) {
            await logAdminAction('admin_process_payment_error', {
                transactionId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setIsMutating(false);
        }
    };

    const handleRefundTransaction = async (transactionId: number) => {
        try {
            setIsMutating(true);
            await logAdminAction('admin_refund_transaction', { transactionId });
            await apiClient.post(`/api/admin/transactions/${transactionId}/refund`);
            await loadTransactions();
        } catch (error) {
            await logAdminAction('admin_refund_transaction_error', {
                transactionId,
                error_message: getErrorMessage(error),
                stack: getErrorStack(error)
            });
        } finally {
            setIsMutating(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
            case "failed": return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case "refunded": return <CreditCard className="h-4 w-4 text-blue-500" />;
            default: return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "failed": return "bg-red-100 text-red-800";
            case "refunded": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "subscription": return "bg-purple-100 text-purple-800";
            case "one_time": return "bg-blue-100 text-blue-800";
            case "refund": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Billing & Revenue</h1>
                    <p className="text-muted-foreground">Monitor payments, invoices, and revenue metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportReports}
                        disabled={loading}
                    >
                        <Download className="h-4 w-4" />
                        Export Reports
                    </Button>
                </div>
            </div>

            {/* Revenue Metrics */}
            {!billing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                                No billing data available
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                                    <p className="text-2xl font-bold">
                                        £{safe(billing?.monthly_revenue_pence, 0) / 100}
                                    </p>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ArrowUp className="h-3 w-3" />
                                        +{safe(billing?.revenue_growth, 0)}% from last month
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Outstanding Invoices</p>
                                    <p className="text-2xl font-bold">
                                        £{safe(billing?.outstanding_invoices_pence, 0) / 100}
                                    </p>
                                    <p className="text-xs text-orange-600">
                                        {safe(billing?.pending_count, 0)} pending payments
                                    </p>
                                </div>
                                <FileText className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Churn Rate</p>
                                    <p className="text-2xl font-bold">{safe(billing?.churn_rate, 0)}%</p>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ArrowDown className="h-3 w-3" />
                                        {safe(billing?.churn_change, 0)}% from last month
                                    </p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Recent Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactionsData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No transactions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactionsData.map((transaction: any) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell>#{transaction.id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{transaction.userName}</div>
                                                <div className="text-sm text-muted-foreground">ID: {transaction.userId}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getTypeColor(transaction.type)} variant="secondary">
                                                {transaction.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {transaction.currency} {transaction.amount.toFixed(2)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(transaction.status)}
                                                <Badge className={getStatusColor(transaction.status)} variant="secondary">
                                                    {transaction.status}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>{transaction.description}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {transaction.paymentMethod}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {transaction.createdAt}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {transaction.invoiceId && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewInvoice(transaction.invoiceId!)}
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {transaction.status === "pending" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleProcessPayment(transaction.id)}
                                                        disabled={isMutating}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {transaction.status === "completed" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRefundTransaction(transaction.id)}
                                                        disabled={isMutating}
                                                    >
                                                        <CreditCard className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Revenue Trends Chart Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                    <div className="text-center">
                        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Revenue trends chart would be displayed here</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Integration with charting library (Chart.js, Recharts, etc.)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
