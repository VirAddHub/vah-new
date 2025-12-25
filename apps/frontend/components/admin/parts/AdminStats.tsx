"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import OverviewMetricCard from "@/components/admin/OverviewMetricCard";

interface AdminStatsProps {
  metrics: any;
  links: any;
  ovLoading: boolean;
  severity: string;
}

export function AdminStats({ metrics, links, ovLoading, severity }: AdminStatsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">System status and key metrics</p>
        </div>
        <StatusBadge severity={severity as any} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <OverviewMetricCard title="Users" value={metrics?.totals?.users?.toLocaleString() ?? "—"} href={links?.users} loading={ovLoading} />
        <OverviewMetricCard title="Active (30d)" value={metrics?.totals?.active_users?.toLocaleString() ?? "—"} href={links?.active_users} loading={ovLoading} />
        <OverviewMetricCard title="KYC Pending" value={metrics?.totals?.pending_kyc?.toLocaleString() ?? "—"} href={links?.pending_kyc} loading={ovLoading} />
        <OverviewMetricCard
          title="Revenue (This Month)"
          value={`£${((metrics?.revenue?.this_month_pence || 0) / 100).toFixed(2)}`}
          href={links?.revenue}
          sub={metrics?.revenue?.delta_pct == null ? "—" : `${metrics.revenue.delta_pct.toFixed(1)}% vs last month`}
          loading={ovLoading}
        />
        <OverviewMetricCard title="Mail (30d)" value={metrics?.mail?.last30d?.toLocaleString() ?? "—"} href={links?.mail} loading={ovLoading} />
        <OverviewMetricCard title="Active Forwards" value={metrics?.forwards?.active?.toLocaleString() ?? "—"} href={links?.forwards} loading={ovLoading} />
      </div>
    </div>
  );
}


