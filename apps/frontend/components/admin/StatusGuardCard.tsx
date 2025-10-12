// apps/frontend/components/admin/StatusGuardCard.tsx
// Admin dashboard card showing status guard metrics

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RefreshCw, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StatusGuardHealth {
  status: string;
  timestamp: string;
  flags: {
    STRICT_STATUS_GUARD: string;
    BFF_READS_ONLY: string;
    PERF_OPTIMIZATIONS: string;
  };
  system: {
    gitSha: string;
    nodeVersion: string;
    uptime: number;
    memoryUsage: any;
    hostname: string;
  };
  statusGuard: {
    enabled: boolean;
    canonicalStatuses: string[];
    allowedTransitions: Record<string, string[]>;
  };
  bffGuard: {
    enabled: boolean;
    blocksNonGet: boolean;
  };
}

interface MetricsHealth {
  status: string;
  timestamp: string;
  metrics: {
    totalStatusTransitions: number;
    totalIllegalAttempts: number;
    totalApiErrors: number;
    statusTransitions: Record<string, number>;
    illegalTransitions: Record<string, number>;
    apiErrors: Record<string, number>;
  };
  indicators: {
    hasRecentActivity: boolean;
    hasIllegalAttempts: boolean;
    hasApiErrors: boolean;
  };
}

export default function StatusGuardCard() {
  const [statusGuardHealth, setStatusGuardHealth] = useState<StatusGuardHealth | null>(null);
  const [metricsHealth, setMetricsHealth] = useState<MetricsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch status guard health
      const statusGuardResponse = await fetch(`${API_BASE}/api/healthz/status-guard`);
      if (!statusGuardResponse.ok) throw new Error('Failed to fetch status guard health');
      const statusGuardData = await statusGuardResponse.json();

      // Fetch metrics health
      const metricsResponse = await fetch(`${API_BASE}/api/healthz/metrics`);
      if (!metricsResponse.ok) throw new Error('Failed to fetch metrics health');
      const metricsData = await metricsResponse.json();

      setStatusGuardHealth(statusGuardData);
      setMetricsHealth(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (enabled: boolean) => {
    return enabled ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">
        Inactive
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status Guard Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status Guard Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <span className="ml-2">Error: {error}</span>
          </div>
          <Button onClick={fetchHealthData} className="w-full mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status Guard Health
          </div>
          <Button variant="outline" size="sm" onClick={fetchHealthData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feature Flags Status */}
        <div>
          <h4 className="font-medium mb-2">Feature Flags</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(statusGuardHealth?.flags.STRICT_STATUS_GUARD === '1')}
                <span className="text-sm">Strict Status Guard</span>
              </div>
              {getStatusBadge(statusGuardHealth?.flags.STRICT_STATUS_GUARD === '1')}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(statusGuardHealth?.flags.BFF_READS_ONLY === '1')}
                <span className="text-sm">BFF Reads Only</span>
              </div>
              {getStatusBadge(statusGuardHealth?.flags.BFF_READS_ONLY === '1')}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(statusGuardHealth?.flags.PERF_OPTIMIZATIONS === '0')}
                <span className="text-sm">Performance Optimizations</span>
              </div>
              {getStatusBadge(statusGuardHealth?.flags.PERF_OPTIMIZATIONS === '0')}
            </div>
          </div>
        </div>

        {/* Metrics Summary */}
        {metricsHealth && (
          <div>
            <h4 className="font-medium mb-2">Last 24h Activity</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {metricsHealth.metrics.totalStatusTransitions}
                </div>
                <div className="text-xs text-gray-600">Transitions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {metricsHealth.metrics.totalIllegalAttempts}
                </div>
                <div className="text-xs text-gray-600">Illegal Attempts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {metricsHealth.metrics.totalApiErrors}
                </div>
                <div className="text-xs text-gray-600">API Errors</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Transitions */}
        {statusGuardHealth && (
          <div>
            <h4 className="font-medium mb-2">Allowed Transitions</h4>
            <div className="space-y-1">
              {Object.entries(statusGuardHealth.statusGuard.allowedTransitions).map(([from, to]) => (
                <div key={from} className="text-xs text-gray-600">
                  <span className="font-medium">{from}</span> → {to.join(', ') || 'none'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Info */}
        {statusGuardHealth && (
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500 space-y-1">
              <div>Git SHA: {statusGuardHealth.system.gitSha.substring(0, 8)}</div>
              <div>Uptime: {Math.floor(statusGuardHealth.system.uptime / 3600)}h</div>
              <div>Host: {statusGuardHealth.system.hostname}</div>
            </div>
          </div>
        )}

        {/* Health Indicators */}
        {metricsHealth && (
          <div className="pt-2 border-t">
            <h4 className="font-medium mb-2">Health Indicators</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {metricsHealth.indicators.hasRecentActivity ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-gray-400" />
                )}
                <span className="text-xs">Recent Activity</span>
              </div>
              <div className="flex items-center gap-2">
                {metricsHealth.indicators.hasIllegalAttempts ? (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
                <span className="text-xs">No Illegal Attempts</span>
              </div>
              <div className="flex items-center gap-2">
                {metricsHealth.indicators.hasApiErrors ? (
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
                <span className="text-xs">No API Errors</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
