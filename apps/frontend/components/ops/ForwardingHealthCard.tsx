"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { parsePromText, sumMetric, estimateHistogramQuantile, rowsFor } from "@/lib/prometheus";
import { Switch } from "@/components/ui/switch";

type Point = { ts: number; transitions: number; illegal: number; err5: number };

export default function ForwardingHealthCard() {
  const [text, setText] = useState<string>("");
  const [promText, setPromText] = useState<string>("");
  const [series, setSeries] = useState<Point[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [mute, setMute] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ops_mute_alerts") === "1";
  });

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
      setPromText(t);
      setUpdatedAt(Date.now());
    } catch (err) {
      console.error('[ForwardingHealthCard] Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function runSelfTest() {
    try {
      setRunning(true);
      setLastResult(null);
      
      const r = await fetch("/api/bff/ops/self-test", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-selftest-secret": process.env.NEXT_PUBLIC_SELFTEST_SECRET || ""
        }
      });
      
      const j = await r.json();
      setLastRun(Date.now());
      
      if (j?.ok) {
        setLastResult({ 
          ok: true, 
          msg: `✅ Passed in ${j.data?.durationMs ?? "?"} ms` 
        });
      } else {
        setLastResult({ 
          ok: false, 
          msg: `❌ Failed: ${j?.error || "Unknown"}` 
        });
      }
      
      // Pull fresh metrics immediately so the charts reflect the run
      fetchMetrics();
    } catch (e: any) {
      setLastRun(Date.now());
      setLastResult({ 
        ok: false, 
        msg: `❌ Error: ${e?.message || String(e)}` 
      });
    } finally {
      setRunning(false);
    }
  }

  function toggleMute(v: boolean) {
    setMute(v);
    try { localStorage.setItem("ops_mute_alerts", v ? "1" : "0"); } catch {}
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

  // Compute advanced metrics
  const adv = useMemo(() => {
    if (!promText) return { 
      p95RP: null as number|null, 
      p95PD: null as number|null, 
      p95DD: null as number|null, 
      slaPct: null as number|null, 
      webhooks: [] as {provider:string, age:number}[], 
      flags: [] as {flag:string, state:number}[] 
    };
    const p = parsePromText(promText);

    const p95RP = estimateHistogramQuantile(p, "forwarding_transition_latency_ms", 0.95, { from:"Requested", to:"Processing" });
    const p95PD = estimateHistogramQuantile(p, "forwarding_transition_latency_ms", 0.95, { from:"Processing", to:"Dispatched" });
    const p95DD = estimateHistogramQuantile(p, "forwarding_transition_latency_ms", 0.95, { from:"Dispatched", to:"Delivered" });

    const met = sumMetric(p, "forwarding_sla_met_total", { window: "2h" });
    const breached = sumMetric(p, "forwarding_sla_breached_total", { window: "2h" });
    const total = met + breached;
    const slaPct = total ? Math.round((met/total)*100) : null;

    const webhookRows = rowsFor(p, "webhook_last_seen_seconds", "provider")
      .map(r => ({ provider: r.key, age: Math.round(r.value) }));

    const flagRows = rowsFor(p, "feature_flag_state", "flag")
      .map(r => ({ flag: r.key, state: r.value }));

    return { p95RP, p95PD, p95DD, slaPct, webhooks: webhookRows, flags: flagRows };
  }, [promText]);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-60">Mute UI alerts</span>
            <Switch checked={mute} onCheckedChange={toggleMute} />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={runSelfTest} 
            disabled={running}
          >
            {running ? "Running…" : "Run Self-Test"}
          </Button>
          {lastResult && (
            <span className={`text-sm ${lastResult.ok ? "text-emerald-700" : "text-red-700"}`}>
              {lastResult.msg}{lastRun ? ` • ${new Date(lastRun).toLocaleTimeString()}` : ""}
            </span>
          )}
          {!mute && uiAlerts.stalled && <Badge variant="destructive">No transitions</Badge>}
          {!mute && uiAlerts.illegalSpike && <Badge variant="destructive">Illegal spike</Badge>}
          {!mute && uiAlerts.errSpike && <Badge variant="destructive">5xx spike</Badge>}
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

      {/* SLA Meter */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">SLA (Requested → Processing within 2h)</h4>
          <span className="text-sm">{adv.slaPct === null ? "n/a" : `${adv.slaPct}% met`}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-2 bg-emerald-500" style={{ width: `${adv.slaPct ?? 0}%` }} />
        </div>
        <p className="mt-1 text-xs opacity-70">Uses counters: forwarding_sla_met_total / _breached_total (window=2h)</p>
      </Card>

      {/* Latency p95s */}
      <Card className="p-4">
        <h4 className="font-medium mb-2">Latency p95</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <LatencyRow label="Req → Proc" ms={adv.p95RP} />
          <LatencyRow label="Proc → Disp" ms={adv.p95PD} />
          <LatencyRow label="Disp → Deliv" ms={adv.p95DD} />
        </div>
        <p className="mt-1 text-xs opacity-70">From histogram: forwarding_transition_latency_ms_bucket</p>
      </Card>

      {/* Webhook Freshness + Feature Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Webhook Freshness</h4>
            <span className="text-xs opacity-60">age (s)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {adv.webhooks.length === 0 && <span className="text-xs opacity-60">n/a</span>}
            {adv.webhooks.map(w => {
              const tone = w.age > 7200 ? "bg-red-50 border-red-200 text-red-700"
                         : w.age > 1800 ? "bg-amber-50 border-amber-200 text-amber-700"
                         : "bg-emerald-50 border-emerald-200 text-emerald-700";
              return (
                <div key={w.provider} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${tone}`}>
                  <span className="text-sm">{w.provider}</span>
                  <span className="text-sm">{w.age}s</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Feature Flags</h4>
            <span className="text-xs opacity-60">state</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {adv.flags.length === 0 && <span className="text-xs opacity-60">n/a</span>}
            {adv.flags.map(f => {
              const on = (f.state ?? 0) >= 1;
              const tone = on ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-700";
              return (
                <div key={f.flag} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${tone}`}>
                  <span className="text-sm">{f.flag}</span>
                  <span className="text-sm">{on ? "ON" : "OFF"}</span>
                </div>
              );
            })}
          </div>
        </Card>
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

function LatencyRow({ label, ms }: { label:string; ms:number|null }) {
  const text = ms === null ? "n/a" : (ms >= 1000 ? `${Math.round(ms/100)/10}s` : `${Math.round(ms)}ms`);
  const tone = ms === null ? "bg-slate-50 border-slate-200 text-slate-700"
            : ms > 2*60*60*1000 ? "bg-red-50 border-red-200 text-red-700" // >2h
            : ms > 15*60*1000 ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-base font-medium">{text}</div>
    </div>
  );
}
