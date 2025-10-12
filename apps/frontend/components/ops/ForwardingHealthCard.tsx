"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { parsePromText, sumMetric } from "@/lib/prometheus";

type Point = { ts: number; transitions: number; illegal: number; err5: number };

export default function ForwardingHealthCard() {
  const [text, setText] = useState<string>("");
  const [series, setSeries] = useState<Point[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [error, setError] = useState<string>("");

  async function fetchMetrics() {
    try {
      setError("");
      const r = await fetch("/api/bff/metrics", { 
        cache: "no-store", 
        credentials: "include" 
      });
      
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      
      const t = await r.text();
      setText(t);
      setUpdatedAt(Date.now());
    } catch (err) {
      console.error('[ForwardingHealthCard] Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 10000); // 10s
    return () => clearInterval(id);
  }, []);

  const latest = useMemo(() => {
    if (!text) return { transitions: 0, illegal: 0, err5: 0 };
    const p = parsePromText(text);

    const transitions = sumMetric(p, "forwarding_status_transition_total");
    const illegal = sumMetric(p, "forwarding_illegal_transition_total");
    
    // sum of 5xx only
    const err5 = (p["api_error_total"] || []).reduce((acc, cur) => {
      const code = cur.labels["status"] || cur.labels["code"];
      return acc + (/^5/.test(String(code)) ? (cur.value || 0) : 0);
    }, 0);

    return { transitions, illegal, err5 };
  }, [text]);

  useEffect(() => {
    if (!text) return;
    const p = parsePromText(text);
    const transitions = sumMetric(p, "forwarding_status_transition_total");
    const illegal = sumMetric(p, "forwarding_illegal_transition_total");
    const err5 = (p["api_error_total"] || []).reduce((acc, cur) => {
      const code = cur.labels["status"] || cur.labels["code"];
      return acc + (/^5/.test(String(code)) ? (cur.value || 0) : 0);
    }, 0);
    
    setSeries(s => [...s.slice(-60), { ts: Date.now(), transitions, illegal, err5 }]);
  }, [text]);

  // Simple alerting thresholds (UI only; your backend rules still send Slack/Postmark)
  const uiAlerts = useMemo(() => {
    const points = series.slice(-6); // ~1 min window (6 x 10s)
    const inc = (key: keyof Point) => {
      if (points.length < 2) return 0;
      return points[points.length - 1][key] - points[0][key];
    };
    const illegalSpike = inc("illegal") > 5;
    const errSpike = inc("err5") > 2;
    const stalled = inc("transitions") <= 0 && points.length >= 6; // ~60s no growth
    return { illegalSpike, errSpike, stalled };
  }, [series]);

  if (error) {
    return (
      <Card className="p-5">
        <div className="text-center text-red-600">
          <h3 className="text-xl font-semibold mb-2">Forwarding Health</h3>
          <p>Failed to load metrics: {error}</p>
          <button 
            onClick={fetchMetrics}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Forwarding Health</h3>
        <div className="flex items-center gap-2">
          {uiAlerts.stalled && <Badge variant="destructive">No transitions</Badge>}
          {uiAlerts.illegalSpike && <Badge variant="destructive">Illegal spike</Badge>}
          {uiAlerts.errSpike && <Badge variant="destructive">5xx spike</Badge>}
          <span className="text-xs opacity-60">
            Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPI title="Transitions (total)" value={latest.transitions} tone="good"/>
        <KPI title="Illegal attempts (total)" value={latest.illegal} tone={latest.illegal > 0 ? "warn" : "ok"}/>
        <KPI title="5xx errors (total)" value={latest.err5} tone={latest.err5 > 0 ? "warn" : "ok"}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Spark title="Transitions trend" data={series.map(p => ({ x: p.ts, y: p.transitions }))}/>
        <Spark title="Illegal attempts trend" data={series.map(p => ({ x: p.ts, y: p.illegal }))}/>
        <Spark title="5xx errors trend" data={series.map(p => ({ x: p.ts, y: p.err5 }))}/>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Data points: {series.length} | Refresh: 10s
        </div>
        <Link className="text-sm underline hover:no-underline" href="/admin/alerts">
          Open Alerts Dashboard
        </Link>
      </div>
    </Card>
  );
}

function KPI({ title, value, tone="ok" }:{ title:string; value:number; tone?: "ok"|"warn"|"good" }) {
  const cls = tone === "good" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : tone === "warn" ? "text-amber-700 bg-amber-50 border-amber-200"
            : "text-slate-700 bg-slate-50 border-slate-200";
  return (
    <Card className={`p-4 border ${cls}`}>
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
    </Card>
  );
}

function Spark({ title, data }:{ title:string; data:{x:number;y:number}[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-3">
        <div className="text-xs opacity-70 mb-2">{title}</div>
        <div className="h-28 flex items-center justify-center text-gray-400">
          No data yet
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <div className="text-xs opacity-70 mb-2">{title}</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.map(d => ({ t: new Date(d.x).toLocaleTimeString(), v: d.y }))}>
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <Tooltip 
              formatter={(value: any) => [value, '']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="v" 
              dot={false}
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
