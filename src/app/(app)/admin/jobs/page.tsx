"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an Admin Jobs dashboard that visualizes background jobs/queues
 * status with search, filtering, bulk actions, and quick retry/cancel controls. It links to other
 * admin and resource pages (sessions/imports) for fast navigation. This client-only implementation
 * avoids direct database/API calls and focuses on production-ready UI and state management that can
 * be wired to backend endpoints later.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

// Types

type JobStatus =
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled"
  | "deadletter";

type JobQueue = "transcription" | "summarization" | "import" | "webhook" | "cleanup";

interface JobEntityLink {
  type: "session" | "import" | "recording" | "summary";
  id: string;
}

interface JobItem {
  id: string;
  queue: JobQueue;
  status: JobStatus;
  priority: "low" | "normal" | "high" | "critical";
  attempts: number;
  maxAttempts: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  scheduledAt?: string; // ISO
  nextRunAt?: string; // ISO
  message?: string;
  logs?: string[];
  entity?: JobEntityLink;
}

// Utilities

const formatDateTime = (iso?: string) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return iso;
  }
};

const statusColors: Record<JobStatus, string> = {
  queued: "bg-muted text-muted-foreground ring-border",
  running: "bg-primary/10 text-primary ring-primary/40",
  retrying: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-yellow-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30",
  failed: "bg-destructive/15 text-destructive ring-destructive/30",
  cancelled: "bg-secondary text-secondary-foreground ring-secondary/30",
  deadletter: "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30",
};

const queueColors: Record<JobQueue, string> = {
  transcription: "bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-blue-500/30",
  summarization: "bg-violet-500/10 text-violet-600 dark:text-violet-300 ring-violet-500/30",
  import: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  webhook: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-cyan-500/30",
  cleanup: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/30",
};

const priorityColors: Record<JobItem["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const initialJobsSeed = (): JobItem[] => {
  const now = Date.now();
  const iso = (t: number) => new Date(t).toISOString();
  return [
    {
      id: "job_t_1",
      queue: "transcription",
      status: "running",
      priority: "high",
      attempts: 1,
      maxAttempts: 5,
      createdAt: iso(now - 1000 * 60 * 15),
      updatedAt: iso(now - 1000 * 10),
      nextRunAt: iso(now + 1000 * 30),
      message: "Streaming ASR in progress (ko-KR, punctuate=true).",
      logs: [
        "ASR session opened",
        "Streaming chunk #45",
        "ASR latency 320ms",
      ],
      entity: { type: "session", id: "sess_8ab123" },
    },
    {
      id: "job_s_1",
      queue: "summarization",
      status: "failed",
      priority: "normal",
      attempts: 2,
      maxAttempts: 5,
      createdAt: iso(now - 1000 * 60 * 40),
      updatedAt: iso(now - 1000 * 60 * 2),
      message: "LLM provider rate limited. Backoff required.",
      logs: [
        "Building highlight set (n=6)",
        "POST /summarize 429 Too Many Requests",
      ],
      entity: { type: "session", id: "sess_8ab123" },
    },
    {
      id: "job_i_1",
      queue: "import",
      status: "queued",
      priority: "normal",
      attempts: 0,
      maxAttempts: 3,
      createdAt: iso(now - 1000 * 60 * 5),
      updatedAt: iso(now - 1000 * 60 * 5),
      scheduledAt: iso(now + 1000 * 60 * 5),
      message: "Queued Zoom recording import.",
      entity: { type: "import", id: "imp_4321" },
    },
    {
      id: "job_w_1",
      queue: "webhook",
      status: "deadletter",
      priority: "low",
      attempts: 5,
      maxAttempts: 5,
      createdAt: iso(now - 1000 * 60 * 120),
      updatedAt: iso(now - 1000 * 60 * 55),
      message: "Webhook delivery to https://hooks.example.com failed after retries.",
      entity: { type: "session", id: "sess_77af90" },
    },
    {
      id: "job_c_1",
      queue: "cleanup",
      status: "completed",
      priority: "low",
      attempts: 1,
      maxAttempts: 1,
      createdAt: iso(now - 1000 * 60 * 200),
      updatedAt: iso(now - 1000 * 60 * 180),
      message: "Purged expired temporary files.",
    },
    {
      id: "job_s_2",
      queue: "summarization",
      status: "retrying",
      priority: "high",
      attempts: 1,
      maxAttempts: 5,
      createdAt: iso(now - 1000 * 60 * 20),
      updatedAt: iso(now - 1000 * 15),
      nextRunAt: iso(now + 1000 * 60),
      message: "Scheduled retry with exponential backoff (t=60s).",
      entity: { type: "session", id: "sess_4c9921" },
    },
    {
      id: "job_t_2",
      queue: "transcription",
      status: "queued",
      priority: "critical",
      attempts: 0,
      maxAttempts: 4,
      createdAt: iso(now - 1000 * 60 * 3),
      updatedAt: iso(now - 1000 * 60 * 3),
      message: "Awaiting ASR slot (concurrency=3).",
      entity: { type: "session", id: "sess_f7a2d1" },
    },
    {
      id: "job_i_2",
      queue: "import",
      status: "running",
      priority: "normal",
      attempts: 1,
      maxAttempts: 3,
      createdAt: iso(now - 1000 * 60 * 50),
      updatedAt: iso(now - 1000 * 8),
      message: "Downloading Teams recording (128MB).",
      entity: { type: "import", id: "imp_98aa" },
    },
    {
      id: "job_w_2",
      queue: "webhook",
      status: "failed",
      priority: "normal",
      attempts: 3,
      maxAttempts: 5,
      createdAt: iso(now - 1000 * 60 * 90),
      updatedAt: iso(now - 1000 * 60 * 4),
      message: "Timeout connecting to subscriber endpoint.",
    },
    {
      id: "job_c_2",
      queue: "cleanup",
      status: "queued",
      priority: "low",
      attempts: 0,
      maxAttempts: 1,
      createdAt: iso(now - 1000 * 60 * 2),
      updatedAt: iso(now - 1000 * 60 * 2),
      scheduledAt: iso(now + 1000 * 60 * 25),
      message: "Nightly retention cleanup scheduled.",
    },
    {
      id: "job_t_3",
      queue: "transcription",
      status: "completed",
      priority: "high",
      attempts: 1,
      maxAttempts: 4,
      createdAt: iso(now - 1000 * 60 * 300),
      updatedAt: iso(now - 1000 * 60 * 250),
      message: "ASR finalized with diarization (speakers=3).",
      entity: { type: "session", id: "sess_a1b2c3" },
    },
    {
      id: "job_s_3",
      queue: "summarization",
      status: "queued",
      priority: "normal",
      attempts: 0,
      maxAttempts: 5,
      createdAt: iso(now - 1000 * 60 * 6),
      updatedAt: iso(now - 1000 * 60 * 6),
      message: "Waiting for transcript consolidation.",
      entity: { type: "session", id: "sess_a1b2c3" },
    },
  ];
};

function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    router.replace(`${pathname}?${next.toString()}`);
  };

  return { params, set } as const;
}

export default function JobsPage() {
  const { params, set } = useQueryState();

  const [jobs, setJobs] = useState<JobItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [banner, setBanner] = useState<null | { type: "success" | "error" | "info"; title: string; desc?: string }>(null);

  // Filters
  const [search, setSearch] = useState<string>(params?.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(params?.get("status") ?? "all");
  const [queueFilter, setQueueFilter] = useState<string>(params?.get("queue") ?? "all");
  const [rangeFilter, setRangeFilter] = useState<string>(params?.get("range") ?? "24h");

  const mounted = useRef(false);

  useEffect(() => {
    // Simulate loading delay then seed
    const t = setTimeout(() => setJobs(initialJobsSeed()), 550);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const saved = localStorage.getItem("admin_jobs_autoRefresh");
      if (saved) setAutoRefresh(saved === "1");
      return;
    }
    localStorage.setItem("admin_jobs_autoRefresh", autoRefresh ? "1" : "0");
  }, [autoRefresh]);

  // Sync URL with filters (debounced for search)
  useEffect(() => {
    const h = setTimeout(() => {
      set({ q: search || null, status: statusFilter === "all" ? null : statusFilter, queue: queueFilter === "all" ? null : queueFilter, range: rangeFilter === "24h" ? null : rangeFilter });
    }, 250);
    return () => clearTimeout(h);
  }, [search, statusFilter, queueFilter, rangeFilter]);

  // Simulated auto-refresh: update running -> completed and retrying -> queued occasionally
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => {
      setJobs((prev) => {
        if (!prev) return prev;
        // Create a shallow copy to update deterministic slices
        const next = prev.map((j) => ({ ...j }));
        const now = Date.now();
        next.forEach((j, idx) => {
          // Progress running jobs occasionally
          if (j.status === "running" && idx % 2 === 0) {
            j.status = "completed";
            j.updatedAt = new Date(now).toISOString();
            j.message = j.message?.includes("progress") ? j.message.replace("in progress", "done") : "Job completed successfully.";
          }
          // Retry schedule elapsed
          if (j.status === "retrying" && j.nextRunAt && new Date(j.nextRunAt).getTime() <= now) {
            j.status = "queued";
            j.updatedAt = new Date(now).toISOString();
            j.message = "Moved to queue after backoff.";
          }
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [autoRefresh]);

  const filtered = useMemo(() => {
    if (!jobs) return [] as JobItem[];
    const q = search.trim().toLowerCase();
    const sinceMs = (() => {
      const now = Date.now();
      switch (rangeFilter) {
        case "7d":
          return now - 1000 * 60 * 60 * 24 * 7;
        case "30d":
          return now - 1000 * 60 * 60 * 24 * 30;
        case "all":
          return 0;
        default:
          return now - 1000 * 60 * 60 * 24; // 24h
      }
    })();

    return jobs.filter((j) => {
      const inSearch = !q ||
        j.id.toLowerCase().includes(q) ||
        j.queue.toLowerCase().includes(q) ||
        j.status.toLowerCase().includes(q) ||
        (j.entity?.id?.toLowerCase().includes(q) ?? false) ||
        (j.message?.toLowerCase().includes(q) ?? false);

      const inStatus = statusFilter === "all" || j.status === statusFilter;
      const inQueue = queueFilter === "all" || j.queue === queueFilter;
      const inRange = sinceMs === 0 || new Date(j.createdAt).getTime() >= sinceMs;

      return inSearch && inStatus && inQueue && inRange;
    });
  }, [jobs, search, statusFilter, queueFilter, rangeFilter]);

  const stats = useMemo(() => {
    const base = {
      total: jobs?.length ?? 0,
      queued: 0,
      running: 0,
      retrying: 0,
      failed: 0,
      deadletter: 0,
      completed: 0,
      cancelled: 0,
    };
    (jobs ?? []).forEach((j) => {
      (base as any)[j.status] += 1;
    });
    return base;
  }, [jobs]);

  const toggleSelectAll = () => {
    if (!filtered.length) return;
    const all = new Set(selected);
    const everySelected = filtered.every((j) => all.has(j.id));
    if (everySelected) {
      filtered.forEach((j) => all.delete(j.id));
    } else {
      filtered.forEach((j) => all.add(j.id));
    }
    setSelected(all);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const updateJobs = (updater: (j: JobItem) => JobItem | null, ids?: string[]) => {
    setJobs((prev) => {
      if (!prev) return prev;
      const next: JobItem[] = [];
      const target = new Set(ids ?? prev.map((j) => j.id));
      for (const j of prev) {
        if (target.has(j.id)) {
          const u = updater(j);
          if (u) next.push(u);
        } else {
          next.push(j);
        }
      }
      return next;
    });
  };

  const canRetry = (j: JobItem) => ["failed", "deadletter", "cancelled"].includes(j.status);
  const canCancel = (j: JobItem) => ["queued", "running", "retrying"].includes(j.status);

  const handleRetry = (ids: string[]) => {
    updateJobs((j) => {
      if (!canRetry(j)) return j;
      const now = new Date();
      return {
        ...j,
        status: "queued",
        attempts: Math.min(j.attempts + 1, j.maxAttempts),
        updatedAt: now.toISOString(),
        nextRunAt: new Date(now.getTime() + 10_000).toISOString(),
        message: "Queued for retry.",
      };
    }, ids);
    setBanner({ type: "success", title: "Retry queued", desc: `${ids.length} job(s) moved to queue.` });
    setTimeout(() => setBanner(null), 2500);
  };

  const handleCancel = (ids: string[]) => {
    updateJobs((j) => {
      if (!canCancel(j)) return j;
      const now = new Date();
      return { ...j, status: "cancelled", updatedAt: now.toISOString(), message: "Job cancelled by admin." };
    }, ids);
    setBanner({ type: "info", title: "Cancelled", desc: `${ids.length} job(s) cancelled.` });
    setTimeout(() => setBanner(null), 2500);
  };

  const handlePurgeDeadletters = () => {
    setJobs((prev) => (prev ?? []).filter((j) => j.status !== "deadletter"));
    setBanner({ type: "success", title: "Dead letters purged" });
    setTimeout(() => setBanner(null), 2500);
  };

  const handleRunNow = (id: string) => {
    updateJobs((j) => {
      if (j.id !== id) return j;
      const now = new Date();
      if (j.status === "queued" || j.status === "retrying") {
        return { ...j, status: "running", updatedAt: now.toISOString(), message: "Job started immediately.", nextRunAt: undefined, scheduledAt: undefined };
      }
      return j;
    }, [id]);
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Link href="/admin" className="hover:underline">Admin</Link>
              <span>/</span>
              <span className="text-foreground">Jobs</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Background Jobs</h1>
            <p className="text-muted-foreground text-sm">Live view of background queues with quick actions. Manage retries, cancellations, and navigate to affected resources.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/metrics" className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm hover:opacity-90 border border-border">Metrics</Link>
            <Link href="/admin/costs" className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm hover:opacity-90 border border-border">Costs</Link>
          </div>
        </div>

        {banner && (
          <Alert className={cn("border", banner.type === "success" && "border-emerald-500/40", banner.type === "error" && "border-destructive/50", banner.type === "info" && "border-primary/40")}
          >
            <AlertTitle>{banner.title}</AlertTitle>
            {banner.desc && <AlertDescription>{banner.desc}</AlertDescription>}
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total" value={stats.total} className="lg:col-span-1" />
          <StatCard label="Queued" value={stats.queued} tone="muted" />
          <StatCard label="Running" value={stats.running} tone="primary" />
          <StatCard label="Retrying" value={stats.retrying} tone="warning" />
          <StatCard label="Failed" value={stats.failed} tone="destructive" />
          <StatCard label="Dead letter" value={stats.deadletter} tone="rose" />
          <StatCard label="Completed" value={stats.completed} tone="success" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, status, queue, entity id, message..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Search jobs"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">⌘K</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Auto refresh</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 accent-primary"
                aria-label="Toggle auto refresh"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">Status: All</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="retrying">Retrying</option>
              <option value="failed">Failed</option>
              <option value="deadletter">Dead letter</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <select
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
              aria-label="Filter by queue"
            >
              <option value="all">Queue: All</option>
              <option value="transcription">Transcription</option>
              <option value="summarization">Summarization</option>
              <option value="import">Import</option>
              <option value="webhook">Webhook</option>
              <option value="cleanup">Cleanup</option>
            </select>
            <select
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value)}
              aria-label="Filter by time range"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setQueueFilter("all");
                setRangeFilter("24h");
              }}
              className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm hover:opacity-90 border border-border"
            >
              Reset
            </button>
          </div>
        </div>
        <Separator />

        {selected.size > 0 && (
          <div className="p-3 flex items-center justify-between bg-accent/40">
            <div className="text-sm"><span className="font-medium">{selected.size}</span> selected</div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:opacity-90"
                onClick={() => {
                  const ids = Array.from(selected);
                  handleRetry(ids);
                  clearSelection();
                }}
              >
                Retry selected
              </button>
              <button
                className="inline-flex items-center rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm hover:opacity-90"
                onClick={() => {
                  const ids = Array.from(selected);
                  handleCancel(ids);
                  clearSelection();
                }}
              >
                Cancel selected
              </button>
              <button
                className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm hover:opacity-90 border border-border"
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="p-4">
          {!jobs ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-muted" />
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-4 w-16 rounded bg-muted" />
                  </div>
                  <div className="mt-3 h-3 w-full rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <div className="text-lg font-medium">No jobs match your filters</div>
              <div className="mt-2 text-sm">Try adjusting filters or clear the search query.</div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setQueueFilter("all");
                    setRangeFilter("24h");
                  }}
                  className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm hover:opacity-90 border border-border"
                >
                  Clear filters
                </button>
                <Link href="/admin/metrics" className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:opacity-90">View metrics</Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-primary" onChange={toggleSelectAll} checked={filtered.every((j) => selected.has(j.id)) && filtered.length > 0} aria-label="Select all filtered" />
                    Select all ({filtered.length})
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm hover:bg-rose-500/20 border border-rose-500/30"
                    onClick={handlePurgeDeadletters}
                  >
                    Purge dead letters
                  </button>
                </div>
              </div>

              {filtered.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  selected={selected.has(job.id)}
                  onToggleSelect={() => toggleSelect(job.id)}
                  onRetry={() => handleRetry([job.id])}
                  onCancel={() => handleCancel([job.id])}
                  onRunNow={() => handleRunNow(job.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">Quick links</div>
            <div className="text-xs text-muted-foreground">Navigate to related admin tools and recent resources.</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <LinkCard href="/admin" title="Admin Home" subtitle="Overview and system controls" />
          <LinkCard href="/admin/metrics" title="Metrics" subtitle="Latency, throughput, errors" />
          <LinkCard href="/admin/costs" title="Costs" subtitle="Usage and billing insights" />
          <LinkCard href="/imports" title="Imports" subtitle="Manage recording imports" />
          <LinkCard href="/sessions" title="Sessions" subtitle="All meetings and lectures" />
          <LinkCard href="/integrations" title="Integrations" subtitle="Zoom and Teams links" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, className }: { label: string; value: number; tone?: "primary" | "destructive" | "success" | "warning" | "rose" | "muted"; className?: string }) {
  const tones: Record<NonNullable<typeof tone>, string> = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg border border-border p-3 bg-card", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={cn("text-xs rounded px-2 py-0.5", tone && tones[tone])}>{tone ? label : ""}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function JobRow({ job, selected, onToggleSelect, onRetry, onCancel, onRunNow }: { job: JobItem; selected: boolean; onToggleSelect: () => void; onRetry: () => void; onCancel: () => void; onRunNow: () => void }) {
  const canRetry = ["failed", "deadletter", "cancelled"].includes(job.status);
  const canCancel = ["queued", "running", "retrying"].includes(job.status);
  const canRunNow = ["queued", "retrying"].includes(job.status);

  return (
    <Collapsible key={job.id}>
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={selected} onChange={onToggleSelect} aria-label={`Select ${job.id}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm truncate max-w-[200px]" title={job.id}>{job.id}</span>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => navigator.clipboard.writeText(job.id)}
                      aria-label="Copy job id"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>Created {formatDateTime(job.createdAt)}</span>
                    <span className="mx-2">·</span>
                    <span>Updated {formatDateTime(job.updatedAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[11px] px-2 py-1 rounded-full ring-1", statusColors[job.status])}>{job.status}</span>
                <span className={cn("text-[11px] px-2 py-1 rounded-full ring-1", queueColors[job.queue])}>{job.queue}</span>
                <span className={cn("text-[11px] px-2 py-1 rounded-full", priorityColors[job.priority])}>{job.priority}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="rounded-md bg-muted px-2 py-1 text-foreground/80">
                Attempts {job.attempts}/{job.maxAttempts}
              </div>
              {job.scheduledAt && (
                <div className="rounded-md bg-muted px-2 py-1 text-foreground/80">Scheduled {formatDateTime(job.scheduledAt)}</div>
              )}
              {job.nextRunAt && (
                <div className="rounded-md bg-muted px-2 py-1 text-foreground/80">Next run {formatDateTime(job.nextRunAt)}</div>
              )}
              {job.entity?.id && (
                <div className="rounded-md bg-muted px-2 py-1">
                  Entity:
                  <EntityLinks entity={job.entity} className="ml-1" />
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Link href="/admin/metrics" className="text-xs underline hover:no-underline">View metrics</Link>
                {canRunNow && (
                  <button onClick={onRunNow} className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs hover:opacity-90">Run now</button>
                )}
                {canRetry && (
                  <button onClick={onRetry} className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-2 py-1 text-xs hover:opacity-90 border border-border">Retry</button>
                )}
                {canCancel && (
                  <button onClick={onCancel} className="inline-flex items-center rounded-md bg-destructive text-destructive-foreground px-2 py-1 text-xs hover:opacity-90">Cancel</button>
                )}
              </div>
            </div>

            {job.message && (
              <div className="text-sm text-foreground/90">{job.message}</div>
            )}

            <CollapsibleTrigger asChild>
              <button className="text-sm text-primary hover:opacity-90 w-fit" aria-label="Toggle details">
                Details
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <Separator />
          <div className="p-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Timestamps</div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-y-1">
                <span>Created</span>
                <span className="text-foreground/80">{formatDateTime(job.createdAt)}</span>
                <span>Updated</span>
                <span className="text-foreground/80">{formatDateTime(job.updatedAt)}</span>
                <span>Scheduled</span>
                <span className="text-foreground/80">{formatDateTime(job.scheduledAt)}</span>
                <span>Next run</span>
                <span className="text-foreground/80">{formatDateTime(job.nextRunAt)}</span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Related: {" "}
                <Link href="/imports" className="underline hover:no-underline">Imports</Link>
                {" · "}
                <Link href="/sessions" className="underline hover:no-underline">Sessions</Link>
                {" · "}
                <Link href="/admin/costs" className="underline hover:no-underline">Costs</Link>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Logs</div>
              {job.logs && job.logs.length > 0 ? (
                <div className="rounded-md border border-border bg-background max-h-40 overflow-auto text-xs p-2 space-y-1">
                  {job.logs.map((l, i) => (
                    <div key={i} className="font-mono text-foreground/80">{l}</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No logs available.</div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function EntityLinks({ entity, className }: { entity: JobEntityLink; className?: string }) {
  const base = `/${entity.type === "session" ? "sessions" : entity.type === "import" ? "imports" : entity.type === "recording" ? "sessions" : "sessions"}`;
  const mainHref = entity.type === "session" ? `${base}/${entity.id}` : entity.type === "import" ? `${base}/${entity.id}` : entity.type === "recording" ? `${base}/${entity.id}` : `${base}/${entity.id}/summary`;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Link href={mainHref} className="underline hover:no-underline text-foreground/90">{entity.id}</Link>
      {entity.type === "session" && (
        <>
          <span className="text-muted-foreground">·</span>
          <Link href={`/sessions/${entity.id}/transcript`} className="underline hover:no-underline text-foreground/90">transcript</Link>
          <span className="text-muted-foreground">·</span>
          <Link href={`/sessions/${entity.id}/highlights`} className="underline hover:no-underline text-foreground/90">highlights</Link>
          <span className="text-muted-foreground">·</span>
          <Link href={`/sessions/${entity.id}/summary`} className="underline hover:no-underline text-foreground/90">summary</Link>
        </>
      )}
    </span>
  );
}

function LinkCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </Link>
  );
}
