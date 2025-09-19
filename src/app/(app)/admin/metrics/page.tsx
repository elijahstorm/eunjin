"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Admin Metrics dashboard. It displays ASR latency, error rates, and usage stats
 * over a selectable time range with auto-refresh controls. It does not directly query the database due to the
 * current schema context; it supports an optional demo mode via URL (?demo=1) for visualization, and provides
 * quick navigation to /admin and /admin/costs for cost context, as well as other relevant admin pages.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";
import { supabaseBrowser } from "@/utils/supabase/client-browser";

type Granularity = "1m" | "5m" | "1h" | "1d";

type MetricPoint = {
  t: number; // epoch ms
  latencyAvg: number; // ms
  latencyP95: number; // ms
  errorRate: number; // 0..1
  throughput: number; // segments/min
  activeSessions: number; // count
};

function formatMillis(ms: number | null | undefined) {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem.toFixed(0)}s`;
}

function formatPercent(p: number | null | undefined) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(p < 0.01 ? 2 : 1)}%`;
}

function formatNumber(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat().format(n);
}

function getGranularity(from: Date, to: Date): Granularity {
  const spanMs = to.getTime() - from.getTime();
  const oneHour = 3600_000;
  if (spanMs <= oneHour) return "1m";
  if (spanMs <= 24 * oneHour) return "5m";
  if (spanMs <= 7 * 24 * oneHour) return "1h";
  return "1d";
}

function stepForGranularity(g: Granularity) {
  switch (g) {
    case "1m":
      return 60_000;
    case "5m":
      return 5 * 60_000;
    case "1h":
      return 60 * 60_000;
    case "1d":
      return 24 * 60 * 60_000;
  }
}

function useAuthEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return email;
}

function generateDemoSeries(from: Date, to: Date): MetricPoint[] {
  const g = getGranularity(from, to);
  const step = stepForGranularity(g);
  const out: MetricPoint[] = [];
  let t = Math.floor(from.getTime() / step) * step;
  const seed = Math.sin(from.getTime() / 9_000_000) * 1000 + 42;
  const rand = (i: number) => {
    const x = Math.sin(i * 14.3 + seed) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; t <= to.getTime(); i++, t += step) {
    const load = 0.3 + 0.6 * Math.abs(Math.sin(i / 12));
    const errNoise = rand(i) * 0.015;
    const baseLatency = 300 + 220 * load + rand(i + 100) * 50;
    const p95 = baseLatency + 200 + rand(i + 200) * 180;
    const throughput = Math.max(2, Math.round(20 * load + rand(i + 300) * 5));
    const sessions = Math.max(1, Math.round(5 * load + rand(i + 400) * 3));
    const errorRate = Math.max(0, Math.min(0.12, 0.01 * load + errNoise));
    out.push({
      t,
      latencyAvg: baseLatency,
      latencyP95: p95,
      errorRate,
      throughput,
      activeSessions: sessions,
    });
  }
  return out;
}

function computeAggregates(series: MetricPoint[]) {
  if (!series.length) {
    return {
      latencyAvg: null as number | null,
      latencyP95: null as number | null,
      errorRate: null as number | null,
      throughput: null as number | null,
      activeSessions: null as number | null,
    };
  }
  const n = series.length;
  const latencyAvg = series.reduce((a, b) => a + b.latencyAvg, 0) / n;
  const latencyP95 = series.reduce((a, b) => a + b.latencyP95, 0) / n;
  const errorRate = series.reduce((a, b) => a + b.errorRate, 0) / n;
  const throughput = series.reduce((a, b) => a + b.throughput, 0) / n;
  const activeSessions = Math.max(...series.map((s) => s.activeSessions));
  return { latencyAvg, latencyP95, errorRate, throughput, activeSessions };
}

function downloadCSV(series: MetricPoint[]) {
  const header = [
    "timestamp",
    "latency_avg_ms",
    "latency_p95_ms",
    "error_rate",
    "throughput_segments_per_min",
    "active_sessions",
  ];
  const rows = series.map((p) => [
    new Date(p.t).toISOString(),
    p.latencyAvg.toFixed(2),
    p.latencyP95.toFixed(2),
    p.errorRate.toFixed(4),
    p.throughput.toString(),
    p.activeSessions.toString(),
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `metrics_${new Date().toISOString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Sparkline({ data, className, colorClass = "text-chart-1" }: { data: number[]; className?: string; colorClass?: string }) {
  const width = 280;
  const height = 56;
  const padding = 4;
  const path = useMemo(() => {
    if (!data.length) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const xStep = (width - padding * 2) / Math.max(1, data.length - 1);
    const scaleY = (v: number) => {
      if (max === min) return height / 2;
      // invert y for SVG
      return padding + (height - padding * 2) * (1 - (v - min) / (max - min));
    };
    const points = data.map((v, i) => `${padding + i * xStep},${scaleY(v)}`).join(" ");
    return `M ${points}`;
  }, [data]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full h-14", className)} aria-hidden>
      <defs>
        <linearGradient id="sparklineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopOpacity="0.22" />
          <stop offset="100%" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path} className={cn("fill-none stroke-2", colorClass)} strokeWidth={2} />
    </svg>
  );
}

function StatCard({ title, value, subtitle, children }: { title: string; value: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export default function AdminMetricsPage() {
  const email = useAuthEmail();
  const searchParams = useSearchParams();
  const demo = searchParams.get("demo") === "1";

  const now = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<string>("24h");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tick, setTick] = useState(0);

  const range = useMemo(() => {
    const to = new Date();
    let from: Date;
    if (preset === "1h") from = new Date(to.getTime() - 1 * 60 * 60_000);
    else if (preset === "24h") from = new Date(to.getTime() - 24 * 60 * 60_000);
    else if (preset === "7d") from = new Date(to.getTime() - 7 * 24 * 60 * 60_000);
    else if (preset === "30d") from = new Date(to.getTime() - 30 * 24 * 60 * 60_000);
    else {
      // custom
      const cFrom = customFrom ? new Date(customFrom) : new Date(to.getTime() - 24 * 60 * 60_000);
      const cTo = customTo ? new Date(customTo) : to;
      from = cFrom;
      return { from: cFrom, to: cTo, granularity: getGranularity(cFrom, cTo) };
    }
    return { from, to, granularity: getGranularity(from, to) };
  }, [preset, customFrom, customTo, tick]);

  const series = useMemo<MetricPoint[]>(() => {
    if (!demo) return [];
    return generateDemoSeries(range.from, range.to);
  }, [range.from, range.to, demo]);

  const aggregates = useMemo(() => computeAggregates(series), [series]);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const onExport = useCallback(() => downloadCSV(series), [series]);

  const errorSeverity = useMemo(() => {
    const e = aggregates.errorRate ?? 0;
    if (e > 0.08) return { label: "High error rate detected", variant: "destructive" as const };
    if (e > 0.03) return { label: "Elevated error rate", variant: "default" as const };
    return null;
  }, [aggregates.errorRate]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Metrics</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Metrics dashboard</h1>
          <p className="text-sm text-muted-foreground">ASR latency, error rates, and usage. See costs in <Link href="/admin/costs" className="underline underline-offset-4 hover:text-foreground">Admin › Costs</Link>.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/costs" className="inline-flex items-center rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-secondary/80">View costs</Link>
          <button onClick={() => setTick((x) => x + 1)} className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-medium text-muted-foreground">Time range</div>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom…</option>
            </select>
          </div>
          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-1 gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                From
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                To
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs"
                />
              </label>
            </div>
          )}
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-muted-foreground">Auto-refresh</span>
            </label>
            <span className="text-xs text-muted-foreground">Granularity: {range.granularity}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Signed in</div>
          <div className="mt-1 text-sm font-medium">{email ?? "—"}</div>
          <div className="mt-2 text-xs text-muted-foreground">Admin tools: <Link href="/admin/jobs" className="underline underline-offset-4 hover:text-foreground">Jobs</Link>, <Link href="/admin/costs" className="underline underline-offset-4 hover:text-foreground">Costs</Link></div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Integrations</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Link href="/integrations" className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground hover:bg-secondary/80">All integrations</Link>
            <Link href="/integrations/zoom" className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground hover:bg-secondary/80">Zoom</Link>
            <Link href="/integrations/teams" className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground hover:bg-secondary/80">Teams</Link>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Run a session to populate metrics: <Link href="/sessions/new" className="underline underline-offset-4 hover:text-foreground">Start</Link> or <Link href="/ingest/upload" className="underline underline-offset-4 hover:text-foreground">Upload</Link>.</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Exports</div>
          <button
            onClick={onExport}
            className="mt-2 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Download CSV
          </button>
          <div className="mt-2 text-xs text-muted-foreground">Shareable links available in <Link href="/admin/jobs" className="underline underline-offset-4 hover:text-foreground">Jobs</Link> when post-processing completes.</div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {errorSeverity ? (
            <Alert variant={errorSeverity.variant} className="border-destructive/40">
              <AlertTitle>{errorSeverity.label}</AlertTitle>
              <AlertDescription>
                Investigate recent failures in <Link href="/admin/jobs" className="underline underline-offset-4 hover:text-foreground">Admin › Jobs</Link>. Check provider status and retry policies.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Avg ASR latency" value={formatMillis(aggregates.latencyAvg) ?? "—"} subtitle="End-to-end per segment">
              <Sparkline data={series.map((d) => d.latencyAvg)} colorClass="text-chart-1" />
            </StatCard>
            <StatCard title="P95 latency" value={formatMillis(aggregates.latencyP95) ?? "—"}>
              <Sparkline data={series.map((d) => d.latencyP95)} colorClass="text-chart-2" />
            </StatCard>
            <StatCard title="Error rate" value={formatPercent(aggregates.errorRate) ?? "—"}>
              <Sparkline data={series.map((d) => d.errorRate)} colorClass="text-destructive" />
            </StatCard>
            <StatCard title="Throughput" value={`${formatNumber(aggregates.throughput)} seg/min`}>
              <Sparkline data={series.map((d) => d.throughput)} colorClass="text-chart-3" />
            </StatCard>
            <StatCard title="Active sessions (max)" value={formatNumber(aggregates.activeSessions)}>
              <Sparkline data={series.map((d) => d.activeSessions)} colorClass="text-chart-4" />
            </StatCard>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Timeline</h2>
                <p className="text-xs text-muted-foreground">{range.from.toLocaleString()} → {range.to.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/dashboard" className="underline underline-offset-4 hover:text-foreground">Dashboard</Link>
                <span>•</span>
                <Link href="/sessions" className="underline underline-offset-4 hover:text-foreground">Sessions</Link>
                <span>•</span>
                <Link href="/org/retention" className="underline underline-offset-4 hover:text-foreground">Retention</Link>
              </div>
            </div>
            <Separator className="my-4" />

            {!series.length ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <div className="text-sm font-medium">No metrics for the selected range</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Run a live session at <Link href="/sessions/new" className="underline underline-offset-4 hover:text-foreground">Sessions › New</Link> or upload a recording via <Link href="/ingest/upload" className="underline underline-offset-4 hover:text-foreground">Ingest › Upload</Link>.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  For provider setup, see <Link href="/integrations/zoom" className="underline underline-offset-4 hover:text-foreground">Zoom</Link> or <Link href="/integrations/teams" className="underline underline-offset-4 hover:text-foreground">Teams</Link> integrations.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Latency (ms)</div>
                    <div className="text-xs text-muted-foreground">avg / p95</div>
                  </div>
                  <div className="mt-2">
                    <Sparkline data={series.map((d) => d.latencyAvg)} colorClass="text-chart-1" />
                    <Sparkline data={series.map((d) => d.latencyP95)} colorClass="text-chart-2" />
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Errors & Throughput</div>
                    <div className="text-xs text-muted-foreground">error% / seg·min</div>
                  </div>
                  <div className="mt-2">
                    <Sparkline data={series.map((d) => d.errorRate)} colorClass="text-destructive" />
                    <Sparkline data={series.map((d) => d.throughput)} colorClass="text-chart-3" />
                  </div>
                </div>
              </div>
            )}

            <Collapsible>
              <CollapsibleTrigger asChild>
                <button className="mt-4 inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-muted/80">
                  Metric definitions
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    <div className="font-medium text-foreground">ASR latency</div>
                    <p>Time from audio chunk received to transcript segment produced. Includes provider and network overhead.</p>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Error rate</div>
                    <p>Fraction of failed ASR operations in the selected window. Includes timeouts and provider errors.</p>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Throughput</div>
                    <p>Segments processed per minute. Use alongside active sessions for capacity planning.</p>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Costs</div>
                    <p>See <Link href="/admin/costs" className="underline underline-offset-4 hover:text-foreground">Admin › Costs</Link> for per-provider and per-session breakdowns.</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Next steps</div>
            <p className="text-xs text-muted-foreground">Tune retention, security, and org settings to keep data under control.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href="/org/retention" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:bg-secondary/80">Retention</Link>
            <Link href="/org/security" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:bg-secondary/80">Security</Link>
            <Link href="/org/settings" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:bg-secondary/80">Org settings</Link>
            <Link href="/help" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:bg-secondary/80">Help</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
