"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useMemo, useState } from "react";

type SeriesPoint = { day: string; signups?: number; items?: number; requests?: number };

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

export default function AdminMetricsGrowthCard() {
  const [windowDays, setWindowDays] = useState(60);
  const { data, isLoading } = useSWR<{ ok: boolean; data?: any }>(
    `/api/bff/admin/metrics/growth?window=${windowDays}`,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const kpis = data?.data?.kpis ?? { active_paying: 0, scan_sla_24h_pct: 0, stale_mail_over_14d: 0 };
  const signups: SeriesPoint[] = data?.data?.series?.daily_signups ?? [];
  const mail: SeriesPoint[] = data?.data?.series?.daily_mail_received ?? [];
  const fwd: SeriesPoint[] = data?.data?.series?.daily_forwarding_requests ?? [];

  const merged = useMemo(() => {
    // merge by day for a compact single chart
    const byDay = new Map<string, SeriesPoint>();
    const put = (arr: SeriesPoint[], key: keyof SeriesPoint) => {
      arr.forEach(p => {
        const d = String(p.day);
        const entry = byDay.get(d) ?? { day: d };
        const value = (p as any)[key] ?? (p as any).signups ?? (p as any).items ?? (p as any).requests;
        (entry as any)[key] = value;
        byDay.set(d, entry);
      });
    };
    put(signups, "signups");
    put(mail, "items");
    put(fwd, "requests");
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [signups, mail, fwd]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Growth Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Growth (last {windowDays} days)</CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant={windowDays === 30 ? "default" : "outline"} 
            size="sm" 
            onClick={() => setWindowDays(30)} 
            aria-label="30 days"
          >
            30d
          </Button>
          <Button 
            variant={windowDays === 60 ? "default" : "outline"} 
            size="sm" 
            onClick={() => setWindowDays(60)} 
            aria-label="60 days"
          >
            60d
          </Button>
          <Button 
            variant={windowDays === 90 ? "default" : "outline"} 
            size="sm" 
            onClick={() => setWindowDays(90)} 
            aria-label="90 days"
          >
            90d
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Active paying</div>
            <div className="text-2xl font-semibold">{kpis.active_paying}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Scan SLA ≤ 24h</div>
            <div className="text-2xl font-semibold">{kpis.scan_sla_24h_pct}%</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Stale mail &gt; 14d</div>
            <div className="text-2xl font-semibold">{kpis.stale_mail_over_14d}</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }} 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString();
                }}
              />
              <Line 
                type="monotone" 
                dataKey="signups" 
                name="Signups" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false} 
              />
              <Line 
                type="monotone" 
                dataKey="items" 
                name="Mail received" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={false} 
              />
              <Line 
                type="monotone" 
                dataKey="requests" 
                name="Forwarding requests" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
