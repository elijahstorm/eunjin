"use client";

/**
 * CODE INSIGHT
 * This code's use case is a public, read-only transcript viewer resolved by a share token.
 * It renders transcript segments (speakers, timestamps), provides search and filtering,
 * enables copying the share URL, and links users to the main site and related pages.
 * It avoids server/database calls and optionally decodes an embedded base64 JSON payload via the `d` query param.
 */

import React from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type TranscriptSegment = {
  id?: string;
  start: number; // seconds
  end?: number; // seconds
  speaker?: string; // e.g., "Speaker 1"
  text: string;
};

interface EmbeddedTranscriptPayload {
  title?: string;
  sessionId?: string;
  createdAt?: string; // ISO
  language?: string;
  speakers?: string[];
  duration?: number; // seconds
  segments: TranscriptSegment[];
}

function decodeBase64ToJSON<T = unknown>(payload: string): T | null {
  try {
    // Handle URL-safe base64 and unicode
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(normalized), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonStr) as T;
  } catch {
    try {
      const raw = atob(payload);
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

function formatSeconds(sec?: number): string {
  if (sec == null || Number.isNaN(sec)) return "00:00";
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function useDebounced<T>(value: T, delay = 200) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function hashColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = input.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "bg-chart-1/20 text-chart-1 border-chart-1/40",
    "bg-chart-2/20 text-chart-2 border-chart-2/40",
    "bg-chart-3/20 text-chart-3 border-chart-3/40",
    "bg-chart-4/20 text-chart-4 border-chart-4/40",
    "bg-chart-5/20 text-chart-5 border-chart-5/40",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function PublicTranscriptSharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const rawPayload = searchParams.get("d");
  const initialQ = searchParams.get("q") ?? "";

  const [payload, setPayload] = React.useState<EmbeddedTranscriptPayload | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState<string>(initialQ);
  const debouncedQ = useDebounced(q, 250);

  const [selectedSpeakers, setSelectedSpeakers] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setLoading(true);
    setError(null);

    if (rawPayload) {
      const decoded = decodeBase64ToJSON<EmbeddedTranscriptPayload>(rawPayload);
      if (!decoded || !decoded.segments || !Array.isArray(decoded.segments)) {
        setError("잘못된 공유 데이터입니다. 링크가 손상되었을 수 있습니다.");
        setLoading(false);
        return;
      }
      setPayload(decoded);
      // initialize speakers
      const speakersSet = new Set<string>();
      decoded.segments.forEach((s) => s.speaker && speakersSet.add(s.speaker));
      const initial: Record<string, boolean> = {};
      Array.from(speakersSet).forEach((s) => (initial[s] = true));
      setSelectedSpeakers(initial);
      setLoading(false);
    } else {
      // No embedded data. We cannot call DB in this page, so show error.
      setError("공유된 전사 데이터를 불러올 수 없습니다. 링크가 만료되었거나 권한이 없을 수 있습니다.");
      setLoading(false);
    }
  }, [rawPayload]);

  // Keep the URL in sync with search input
  React.useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (q) sp.set("q", q);
    else sp.delete("q");
    const url = `${pathname}?${sp.toString()}`;
    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // Jump-to timestamp via hash like #t=123
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({});
  React.useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = /t=(\d+)/.exec(hash ?? "");
    if (match) {
      const t = match[1];
      const el = refs.current[`t-${t}`];
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      }
    }
  }, [payload]);

  const speakers = React.useMemo(() => {
    const s = new Set<string>();
    payload?.segments?.forEach((seg) => seg.speaker && s.add(seg.speaker));
    return Array.from(s);
  }, [payload]);

  const filteredSegments = React.useMemo(() => {
    const segments = payload?.segments ?? [];
    const term = debouncedQ.trim().toLowerCase();
    const speakerFilterActive = Object.values(selectedSpeakers).some((v) => v);

    return segments.filter((seg) => {
      const byTerm = !term || seg.text.toLowerCase().includes(term) || (seg.speaker ?? "").toLowerCase().includes(term);
      const bySpeaker = !speakerFilterActive || (seg.speaker ? selectedSpeakers[seg.speaker] : true);
      return byTerm && bySpeaker;
    });
  }, [payload, debouncedQ, selectedSpeakers]);

  const copyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback: create a temp textarea
      const el = document.createElement("textarea");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }, []);

  const downloadTxt = React.useCallback(() => {
    const title = payload?.title || `transcript-${shareId}`;
    const lines = filteredSegments.map((s) => {
      const sp = s.speaker ? `${s.speaker}` : "";
      return `[${formatSeconds(s.start)}]${sp ? " " + sp + ":" : ""} ${s.text}`;
    });
    const meta: string[] = [];
    if (payload?.title) meta.push(`# ${payload.title}`);
    if (payload?.createdAt) meta.push(`Created: ${new Date(payload.createdAt).toLocaleString()}`);
    if (payload?.duration != null) meta.push(`Duration: ${formatSeconds(payload.duration)}`);

    const content = [...meta, meta.length ? "" : "", ...lines].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredSegments, payload, shareId]);

  const goToSummary = React.useCallback(() => {
    router.push(`/share/summary/${shareId}${rawPayload ? `?d=${encodeURIComponent(rawPayload)}` : ""}`);
  }, [router, shareId, rawPayload]);

  const shortLinkHref = `/c/${shareId}`;

  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <div className="mb-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col gap-4 p-4 md:p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Public share</span>
              {payload?.language && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{payload.language.toUpperCase()}</span>
              )}
            </div>
            <h1 className="mt-2 truncate text-2xl font-semibold md:text-3xl">{payload?.title || "공유된 전사"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div>Share ID: {shareId}</div>
              {payload?.createdAt && <div>Created {new Date(payload.createdAt).toLocaleString()}</div>}
              {payload?.duration != null && <div>Duration {formatSeconds(payload.duration)}</div>}
              <div>{filteredSegments.length} of {(payload?.segments?.length ?? 0)} segments</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M10 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 1 1-4 0V6h-4a2 2 0 0 1-2-2Zm-6 6a2 2 0 0 1 2-2h4a2 2 0 1 1 0 4H8v4a2 2 0 1 1-4 0v-6Z"/></svg>
              Copy link
            </button>
            <button onClick={downloadTxt} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 3a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4.007 4.007a1 1 0 0 1-1.4 0L7.293 12.707a1 1 0 1 1 1.414-1.414L11 13.586V4a1 1 0 0 1 1-1ZM5 20a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2H5Z"/></svg>
              Download .txt
            </button>
            <button onClick={goToSummary} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              Summary view
            </button>
          </div>
        </div>
        <Separator />
        <div className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-xl">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="전사에서 검색 (텍스트 또는 화자)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
                />
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M10 2a8 8 0 1 1 5.293 13.707l4 4a1 1 0 0 1-1.414 1.414l-4-4A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <a href="/" className="text-primary hover:underline">Home</a>
              <span className="text-muted-foreground">/</span>
              <a href="/dashboard" className="hover:underline">Dashboard</a>
              <span className="text-muted-foreground">/</span>
              <a href="/sessions" className="hover:underline">Sessions</a>
              <span className="text-muted-foreground">/</span>
              <a href="/help" className="hover:underline">Help</a>
              <span className="text-muted-foreground">/</span>
              <a href="/legal/privacy" className="hover:underline">Privacy</a>
              <span className="text-muted-foreground">/</span>
              <a href="/legal/terms" className="hover:underline">Terms</a>
            </div>
          </div>

          {speakers.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Speakers</div>
              {speakers.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSpeakers((prev) => ({ ...prev, [s]: !prev[s] }))}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                    selectedSpeakers[s]
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", selectedSpeakers[s] ? "bg-secondary-foreground/80" : "bg-muted-foreground/50")} />
                  {s}
                </button>
              ))}
              <a href={shortLinkHref} className="ml-auto text-xs text-primary hover:underline">Open short link</a>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTitle>링크를 불러올 수 없습니다</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <a className="text-primary underline" href="/auth/sign-in">Sign in</a>
              <a className="text-primary underline" href="/">Go to home</a>
              <a className="text-primary underline" href={`/share/summary/${shareId}`}>Try summary link</a>
              <a className="text-primary underline" href="/help">Help</a>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <section className="rounded-xl border border-border bg-card text-card-foreground">
          <div className="flex items-center justify-between p-4 md:p-6">
            <div className="text-sm text-muted-foreground">
              Showing {filteredSegments.length} segment{filteredSegments.length === 1 ? "" : "s"}
              {debouncedQ ? (
                <>
                  {" "}for query <span className="font-medium text-foreground">“{debouncedQ}”</span>
                </>
              ) : null}
            </div>
            {payload?.sessionId && (
              <a
                href={`/sessions/${payload.sessionId}/transcript`}
                className="text-sm text-primary hover:underline"
              >
                Open in app
              </a>
            )}
          </div>
          <Separator />
          <div className="divide-y divide-border">
            {filteredSegments.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">검색 결과가 없습니다.</div>
            )}
            {filteredSegments.map((seg) => {
              const key = String(seg.start);
              const speaker = seg.speaker ?? "";
              const color = speaker ? hashColor(speaker) : "bg-muted text-muted-foreground border-border";
              return (
                <div
                  ref={(el) => (refs.current[`t-${Math.floor(seg.start)}`] = el)}
                  key={key + (seg.id ?? "")}
                  className="flex gap-4 p-4 md:p-6"
                >
                  <div className="w-20 shrink-0">
                    <a
                      href={`#t=${Math.floor(seg.start)}`}
                      className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {formatSeconds(seg.start)}
                    </a>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {speaker ? (
                        <span className={cn("inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs", color)}>
                          {speaker}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Speaker</span>
                      )}
                      {seg.end != null && (
                        <span className="text-xs text-muted-foreground">→ {formatSeconds(seg.end)}</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{seg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
          <h3 className="mb-2 text-sm font-medium">Need more context?</h3>
          <p className="text-sm text-muted-foreground">
            Sign in to access the full workspace, live sessions, highlights, and exports.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href="/auth/sign-in" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Sign in</a>
            <a href="/auth/sign-up" className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Create account</a>
            <a href="/sessions" className="text-sm text-primary hover:underline">Browse sessions</a>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
          <h3 className="mb-2 text-sm font-medium">More actions</h3>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>
              View summary: <a className="text-primary hover:underline" href={`/share/summary/${shareId}${rawPayload ? `?d=${encodeURIComponent(rawPayload)}` : ""}`}>Summary link</a>
            </li>
            <li>
              Short URL: <a className="text-primary hover:underline" href={shortLinkHref}>{shortLinkHref}</a>
            </li>
            <li>
              Integrations: <a className="text-primary hover:underline" href="/integrations">Zoom & Teams</a>
            </li>
            <li>
              Ingest a recording: <a className="text-primary hover:underline" href="/ingest/upload">Upload</a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
