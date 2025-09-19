"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Sessions listing page with search and filter controls,
 * an empty state, and navigation links. It avoids direct database calls due to unspecified schema,
 * but provides production-ready UI and routing to create and view sessions, imports, integrations,
 * and related areas of the app. Rows navigate to /sessions/[sessionId], header button to /sessions/new.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/utils/utils";

type SessionRow = {
  id: string;
  title: string;
  organization: string | null;
  status: "live" | "scheduled" | "completed" | "processing" | "failed";
  started_at: string; // ISO date string
  duration_ms?: number | null;
};

export default function SessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [org, setOrg] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  // Initialize state from URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams?.toString());
    setQ(sp.get("q") || "");
    setStatus(sp.get("status") || "all");
    setOrg(sp.get("org") || "all");
    setFrom(sp.get("from") || "");
    setTo(sp.get("to") || "");
  }, [searchParams]);

  // Reflect state into URL for shareability
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status && status !== "all") sp.set("status", status);
    if (org && org !== "all") sp.set("org", org);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);

    const query = sp.toString();
    const url = query ? `/sessions?${query}` : "/sessions";
    router.replace(url);
  }, [q, status, org, from, to, router]);

  // Data fetch placeholder: no DB schema provided, so we render empty state safely.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // In production, replace with a typed fetch to Supabase using RLS.
        // No database calls are made here due to unspecified schema.
        if (!cancelled) setSessions([]);
      } catch (e: any) {
        if (!cancelled) setError("세션 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [q, status, org, from, to]);

  const filtered = useMemo(() => {
    // With real data, apply server-side filters. Here we keep local filtering for parity.
    let rows = sessions;
    if (q) {
      const term = q.toLowerCase();
      rows = rows.filter((s) =>
        [s.title, s.organization || ""].some((v) => v.toLowerCase().includes(term))
      );
    }
    if (status !== "all") rows = rows.filter((s) => s.status === status);
    if (org !== "all") rows = rows.filter((s) => (s.organization || "") === org);
    if (from) rows = rows.filter((s) => new Date(s.started_at) >= new Date(from));
    if (to) rows = rows.filter((s) => new Date(s.started_at) <= new Date(to + "T23:59:59.999Z"));
    return rows;
  }, [sessions, q, status, org, from, to]);

  const onResetFilters = () => {
    setQ("");
    setStatus("all");
    setOrg("all");
    setFrom("");
    setTo("");
  };

  const handleRowClick = (id: string) => {
    router.push(`/sessions/${id}`);
  };

  const statusBadge = (s: SessionRow["status"]) => {
    const map: Record<SessionRow["status"], string> = {
      live: "bg-green-500/15 text-green-600 border-green-500/30",
      scheduled: "bg-blue-500/15 text-blue-600 border-blue-500/30",
      completed: "bg-muted text-foreground border-border",
      processing: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      failed: "bg-destructive/15 text-destructive border-destructive/30",
    };
    const label: Record<SessionRow["status"], string> = {
      live: "Live",
      scheduled: "Scheduled",
      completed: "Completed",
      processing: "Processing",
      failed: "Failed",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          map[s]
        )}
      >
        {label[s]}
      </span>
    );
  };

  const hasResults = filtered.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sessions</h1>
            <p className="text-sm text-muted-foreground">
              Meetings and classes you capture and summarize. Create new or import recordings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ingest/upload"
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              Import recording
            </Link>
            <Link
              href="/sessions/new"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              New session
            </Link>
          </div>
        </div>

        <Alert className="bg-card text-card-foreground">
          <AlertTitle className="text-sm font-medium">Tip</AlertTitle>
          <AlertDescription className="text-sm">
            Connect Zoom or Microsoft Teams to automatically pull recordings. Manage integrations in{" "}
            <Link href="/integrations" className="underline underline-offset-4">Integrations</Link>.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or organization"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="scheduled">Scheduled</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Organization</label>
                <Link href="/org" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Manage
                </Link>
              </div>
              <select
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All organizations</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => setIsLoading((v) => !v)}
                className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
              >
                {isLoading ? "Stop" : "Refresh"}
              </button>
              <button
                onClick={onResetFilters}
                className="inline-flex w-full items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:opacity-90"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-medium text-muted-foreground">
              {isLoading ? "Loading sessions…" : hasResults ? `${filtered.length} session(s)` : "0 sessions"}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Link href="/help" className="hover:text-foreground">Help</Link>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Link href="/onboarding" className="hover:text-foreground">Onboarding</Link>
            </div>
          </div>
          <Separator />

          {!isLoading && !hasResults && !error && (
            <div className="flex flex-col items-center justify-center gap-6 px-6 py-14 text-center">
              <div className="mx-auto max-w-md">
                <h2 className="text-lg font-semibold text-foreground">No sessions yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start capturing your next meeting or class, or import an existing recording to generate transcripts and summaries.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/sessions/new"
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
                >
                  New session
                </Link>
                <Link
                  href="/ingest/upload"
                  className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow hover:bg-accent hover:text-accent-foreground"
                >
                  Import recording
                </Link>
                <Link
                  href="/integrations/zoom"
                  className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow hover:bg-accent hover:text-accent-foreground"
                >
                  Connect Zoom
                </Link>
                <Link
                  href="/integrations/teams"
                  className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow hover:bg-accent hover:text-accent-foreground"
                >
                  Connect Teams
                </Link>
              </div>
              <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-3">
                <Link
                  href="/consent/new"
                  className="group rounded-md border border-border bg-background p-4 text-left shadow-sm hover:bg-accent"
                >
                  <div className="text-sm font-medium text-foreground">Collect consent</div>
                  <div className="mt-1 text-xs text-muted-foreground">Set up recording consent links.</div>
                </Link>
                <Link
                  href="/sessions/[sessionId]/upload-highlights" as="/sessions/demo/upload-highlights"
                  className="group rounded-md border border-border bg-background p-4 text-left shadow-sm hover:bg-accent"
                >
                  <div className="text-sm font-medium text-foreground">Upload highlights</div>
                  <div className="mt-1 text-xs text-muted-foreground">Attach your key moments to a session.</div>
                </Link>
                <Link
                  href="/admin/metrics"
                  className="group rounded-md border border-border bg-background p-4 text-left shadow-sm hover:bg-accent"
                >
                  <div className="text-sm font-medium text-foreground">Usage metrics</div>
                  <div className="mt-1 text-xs text-muted-foreground">Monitor processing and costs.</div>
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="px-6 py-10">
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTitle className="text-destructive">Error</AlertTitle>
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {isLoading && (
            <div className="px-4 py-6">
              <div className="grid grid-cols-1 divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="h-10 w-10 rounded-md bg-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-40 rounded bg-muted" />
                        <div className="mt-2 h-3 w-24 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="hidden w-40 md:block">
                      <div className="h-4 w-28 rounded bg-muted" />
                    </div>
                    <div className="hidden w-32 md:block">
                      <div className="h-6 w-20 rounded-full bg-muted" />
                    </div>
                    <div className="w-24">
                      <div className="h-4 w-16 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="px-2 py-2 sm:px-4">
              <div className="hidden grid-cols-[1fr_200px_140px_100px] items-center gap-4 px-2 py-3 text-xs text-muted-foreground md:grid">
                <div>Title</div>
                <div>Organization</div>
                <div>Status</div>
                <div className="text-right">Date</div>
              </div>
              <Separator />
              <ul className="divide-y divide-border">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => handleRowClick(s.id)}
                      className="group grid w-full grid-cols-1 items-center gap-3 px-2 py-4 text-left hover:bg-accent/50 md:grid-cols-[1fr_200px_140px_100px] md:px-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground group-hover:underline">
                          {s.title || "Untitled session"}
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {s.duration_ms ? formatDuration(s.duration_ms) + " • " : ""}
                          <span className="hidden sm:inline">Open transcript, highlights, and exports</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground md:block">
                        {s.organization || "—"}
                      </div>
                      <div className="md:block">{statusBadge(s.status)}</div>
                      <div className="text-right text-sm text-muted-foreground md:block">
                        {formatDateTime(s.started_at)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between px-2 py-3 text-xs text-muted-foreground md:px-0">
                <div>
                  Showing {filtered.length} of {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    className="inline-flex cursor-not-allowed items-center rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
                  >
                    Previous
                  </button>
                  <button
                    disabled
                    className="inline-flex cursor-not-allowed items-center rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Link href="/settings/profile" className="hover:text-foreground">Profile</Link>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Link href="/me" className="hover:text-foreground">Account</Link>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [h, m, s].map((n) => String(n).padStart(2, "0"));
  return parts.join(":");
}
