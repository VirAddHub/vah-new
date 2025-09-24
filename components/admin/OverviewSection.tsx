"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
    Users2,
    DollarSign,
    Mail,
    Truck,
    UserCheck,
    CreditCard,
    Activity,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    RefreshCcw,
} from "lucide-react";
import { apiClient, logAdminAction, useApiData } from "../../lib";
import { getErrorMessage, getErrorStack } from "../../lib/errors";

export function OverviewSection() {
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // API Data fetching
    const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useApiData('/api/admin/stats');
    const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useApiData('/api/admin/health');
    const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useApiData('/api/admin/activity');
    const { data: pendingActions, isLoading: pendingLoading, refetch: refetchPending } = useApiData('/api/admin/pending');

    const handleRefreshAll = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_overview_refresh');
            await Promise.all([
                refetchStats(),
                refetchHealth(),
                refetchActivity(),
                refetchPending()
            ]);
            setLastRefresh(new Date());
        } catch (error) {
            await logAdminAction('admin_overview_refresh_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleViewAllActivity = async () => {
        try {
            await logAdminAction('admin_view_all_activity');
            // Navigate to activity page or open modal
            window.open('/admin/activity', '_blank');
        } catch (error) {
            await logAdminAction('admin_view_activity_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handlePendingAction = async (actionType: string, actionId: string) => {
        try {
            await logAdminAction('admin_pending_action', { actionType, actionId });
            await apiClient.post(`/api/admin/pending/${actionType}/${actionId}/process`);
            refetchPending();
        } catch (error) {
            await logAdminAction('admin_pending_action_error', { actionType, actionId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const stats = overviewData;
    const health = systemHealth || [];
    const activity = recentActivity || [];