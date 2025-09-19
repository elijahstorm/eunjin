"use client";

/**
 * CODE INSIGHT
 * This page displays a list of import jobs for recordings/transcripts (queued/processing/done/failed),
 * linking each item to its detail page at /imports/[importId]. When an import is completed, it provides
 * a direct link to the target session transcript at /sessions/[sessionId]/transcript. The page focuses
 * on client-side UI with filters, search, and helpful CTAs to start new imports via Upload/Zoom/Teams.
 * No direct database calls are made here to ensure compatibility with varying schemas and deployments.
 */

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type ImportStatus = "queued" | "processing" | "done" | "failed";

type ImportItem = {
  id: string;
  name: string;
  source: "upload" | "zoom" | "teams" | "link" | "other";
  status: ImportStatus;
  sessionId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  sizeBytes?: number;
  error?: string | null;
};

const STATUS_TABS: { key: "all" | ImportStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Processing" },
  { key: "done", label: "Completed" },
  { key: "failed", label: "Failed" },
];

function useQueryParamsState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const statusParam = (searchParams.get("status") || "all").toLowerCase();
  const qParam = searchParams.get("q") || "";

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return {
    status: (statusParam === "all" || ["queued", "processing", "done", "failed"].includes(statusParam))
      ? (statusParam as "all" | ImportStatus)
      : "all",
    q: qParam,
    setStatus: (s: "all" | ImportStatus) => setParam("status", s),
    setQ: (v: string) => setParam("q", v),
  };
}

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return "-";
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"]; // practical for uploads
  let u = -1;
  let b = bytes;
  do {
    b /= thresh;
    ++u;
  } while (Math.abs(b) >= thresh && u < units.length - 1);
  return b.toFixed(1) + " " + units[u];
}

function StatusBadge({ status }: { status: ImportStatus }) {
  const styles: Record<ImportStatus, string> = {
    queued: "bg-muted text-muted-foreground border border-border",
    processing: "bg-secondary text-secondary-foreground",
    done: "bg-primary text-primary-foreground",
    failed: "bg-destructive text-destructive-foreground",
  };
  const label: Record<ImportStatus, string> = {
    queued: "Queued",
    processing: "Processing",
    done: "Completed",
    failed: "Failed",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {label[status]}
    </span>
  );
}

export default function ImportsPage() {
  const { status, q, setStatus, setQ } = useQueryParamsState();

  // Data store (empty by default). This page avoids direct DB calls.
  const [items, setItems] = React.useState<ImportItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // In production, data should be provided via higher-level fetch layer or context.
    // Here, we simulate a quick resolve with no data and robust error handling placeholder.
    const t = setTimeout(() => {
      try {
        setItems([]);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Failed to load imports.");
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const filtered = React.useMemo(() => {
    const base = status === "all" ? items : items.filter((it) => it.status === status);
    if (!q) return base;
    const query = q.toLowerCase();
    return base.filter((it) =>
      it.name.toLowerCase().includes(query) ||
      it.source.toLowerCase().includes(query) ||
      it.id.toLowerCase().includes(query)
    );
  }, [items, status, q]);

  const counts = React.useMemo(() => {
    const c = { all: items.length, queued: 0, processing: 0, done: 0, failed: 0 } as Record<string, number>;
    items.forEach((it) => { c[it.status]++; });
    return c;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Imports</h1>
          <p className="text-sm text-muted-foreground">Manage recording imports and processing status. Connect Zoom/Teams or upload files to create new imports.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ingest/upload" className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            New Upload
          </Link>
          <Link href="/integrations/zoom" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Connect Zoom
          </Link>
          <Link href="/integrations/teams" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Connect Teams
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm",
                  status === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {t.label}
                <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-foreground/70">
                  {t.key === "all" ? counts.all : counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search imports..."
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Link
              href="/help"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Help
            </Link>
          </div>
        </div>
        <Separator />

        {/* Table */}
        <div className="p-4">
          <div className="hidden md:block">
            <div className="grid grid-cols-12 gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-4">Import</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-border rounded-md border border-border bg-card">
              {loading && (
                <div className="space-y-2 p-4">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-4"><Skeleton className="h-4 w-3/4" /></div>
                    <div className="col-span-2"><Skeleton className="h-4 w-16" /></div>
                    <div className="col-span-2"><Skeleton className="h-5 w-20" /></div>
                    <div className="col-span-2"><Skeleton className="h-4 w-24" /></div>
                    <div className="col-span-2 flex justify-end gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-8" /></div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-4"><Skeleton className="h-4 w-2/3" /></div>
                    <div className="col-span-2"><Skeleton className="h-4 w-16" /></div>
                    <div className="col-span-2"><Skeleton className="h-5 w-20" /></div>
                    <div className="col-span-2"><Skeleton className="h-4 w-24" /></div>
                    <div className="col-span-2 flex justify-end gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-8" /></div>
                  </div>
                </div>
              )}
              {!loading && filtered.length > 0 && filtered.map((it) => (
                <div key={it.id} className="grid grid-cols-12 items-center gap-2 px-3 py-3">
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-accent/60" />
                      <div>
                        <div className="font-medium text-sm">
                          <Link href={`/imports/${it.id}`} className="hover:underline">{it.name || it.id}</Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {it.sizeBytes ? formatBytes(it.sizeBytes) + " • " : ""}
                          ID: {it.id}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 capitalize text-sm">{it.source}</div>
                  <div className="col-span-2"><StatusBadge status={it.status} /></div>
                  <div className="col-span-2 text-sm text-muted-foreground">{new Date(it.createdAt).toLocaleString()}</div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-end gap-2">
                      {it.status === "done" && it.sessionId ? (
                        <Link href={`/sessions/${it.sessionId}/transcript`} className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">Open transcript</Link>
                      ) : (
                        <Link href={`/imports/${it.id}`} className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">View</Link>
                      )}
                      <Link href={`/sessions${it.sessionId ? `/${it.sessionId}` : ""}`} className="inline-flex items-center rounded-md border border-input bg-background p-1.5 text-xs hover:bg-accent hover:text-accent-foreground" aria-label="Open session">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M4.5 5.25A2.25 2.25 0 016.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25zM7.5 6a.75.75 0 000 1.5h9A.75.75 0 0016.5 6h-9zm0 3.75a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zM6.75 15a.75.75 0 000 1.5h6.75a.75.75 0 000-1.5H6.75z"/></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile list */}
          <div className="md:hidden">
            {loading && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-4">
                  <Skeleton className="h-4 w-1/2" />
                  <div className="mt-2 flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <div className="mt-2 flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <ul className="space-y-3">
                {filtered.map((it) => (
                  <li key={it.id} className="rounded-lg border border-border">
                    <Link href={`/imports/${it.id}`} className="block p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{it.name || it.id}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {it.source.toUpperCase()} • {new Date(it.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <StatusBadge status={it.status} />
                      </div>
                      {it.status === "done" && it.sessionId && (
                        <div className="mt-3">
                          <Link href={`/sessions/${it.sessionId}/transcript`} className="text-xs text-primary underline">Open transcript</Link>
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-10 text-center">
              {error ? (
                <Alert variant="destructive" className="max-w-xl text-left">
                  <AlertTitle>Unable to load imports</AlertTitle>
                  <AlertDescription>
                    {error}
                    <div className="mt-2 text-xs text-muted-foreground">Try again later or contact your admin. You can still upload new files or connect an integration below.</div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="text-xl font-medium">No imports found</div>
                  <p className="max-w-lg text-sm text-muted-foreground">Kick off your first import by uploading a recording or linking Zoom/Teams. Once processing completes, you can jump straight to the transcript.</p>
                </>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/ingest/upload" className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Upload recording</Link>
                <Link href="/integrations/zoom" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Connect Zoom</Link>
                <Link href="/integrations/teams" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Connect Teams</Link>
                <Link href="/sessions" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">View sessions</Link>
              </div>

              <Collapsible className="w-full max-w-2xl">
                <CollapsibleTrigger asChild>
                  <button className="mx-auto block text-sm text-muted-foreground underline hover:text-foreground">How do imports work?</button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 text-left text-sm leading-relaxed text-muted-foreground">
                  - Upload recordings in Ingest to create an import job. Once processed, we attach the transcript to a session. You can also start a live session from Sessions to capture real-time audio.
                  <br />
                  - Connect Zoom or Teams in Integrations to sync past meeting recordings automatically.
                  <br />
                  - When an import completes, open the transcript at the session page where you can view Highlights, create a Summary, and Export results.
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/ingest" className="text-primary underline">Go to Ingest</Link>
                    <Link href="/integrations" className="text-primary underline">Integrations</Link>
                    <Link href="/sessions" className="text-primary underline">Sessions</Link>
                    <Link href="/help" className="text-primary underline">Help Center</Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Next steps</div>
            <p className="text-sm text-muted-foreground">After imports complete, review transcripts, add highlights, and generate summaries.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/sessions" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Open Sessions</Link>
            <Link href="/admin/jobs" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Background Jobs</Link>
            <Link href="/dashboard" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
