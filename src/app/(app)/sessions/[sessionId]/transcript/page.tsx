"use client";

/**
 * CODE INSIGHT
 * This code's use case is to present a full transcript viewer for a session, including speakers, timestamps,
 * search with highlight, and jump-to-time capabilities. It links to related actions: Add Highlight, Generate Summary,
 * and Export, and provides helpful navigation to Live, Upload Highlights, and Settings. The page avoids
 * database calls as schema is not provided and gracefully handles empty-state by suggesting next steps.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type TranscriptSegment = {
  id: string;
  start: number; // seconds
  end: number; // seconds
  speaker?: string | null;
  text: string;
};

export default function TranscriptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId } = (useParams() as { sessionId?: string }) || {};

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [groupBySpeaker, setGroupBySpeaker] = useState<boolean>(false);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Load locally cached transcript if present. No DB calls due to schema constraints.
  useEffect(() => {
    const q = searchParams?.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const key = `transcriptCache:${sessionId ?? "unknown"}`;
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
        if (!mounted) return;
        if (raw) {
          const data = JSON.parse(raw) as TranscriptSegment[];
          const cleaned = Array.isArray(data)
            ? data
                .filter((s) => s && typeof s.start === "number" && typeof s.end === "number" && typeof s.text === "string")
                .map((s, i) => ({ ...s, id: s.id || `${i}-${Math.random().toString(36).slice(2, 8)}` }))
            : [];
          setSegments(cleaned);
        }
      } catch {
        // ignore parsing errors; empty state is fine
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        const isTyping = ["input", "textarea"].includes(activeTag) || (document.activeElement as HTMLElement)?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totalDuration = useMemo(() => {
    if (!segments.length) return 0;
    return Math.max(...segments.map((s) => s.end || s.start || 0));
  }, [segments]);

  const speakers = useMemo(() => {
    const set = new Set<string>();
    for (const s of segments) if (s.speaker) set.add(s.speaker);
    return Array.from(set.values());
  }, [segments]);

  const filtered = useMemo(() => {
    if (!query.trim()) return segments;
    const terms = query
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!terms.length) return segments;
    const regex = new RegExp(terms.map(escapeRegExp).join("|"), "i");
    return segments.filter((s) => regex.test(s.text) || (s.speaker && regex.test(s.speaker)));
  }, [segments, query]);

  const groupedBySpeaker = useMemo(() => {
    if (!groupBySpeaker) return null;
    const groups = new Map<string, TranscriptSegment[]>();
    for (const seg of filtered) {
      const key = seg.speaker || "Unlabeled";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(seg);
    }
    return Array.from(groups.entries());
  }, [filtered, groupBySpeaker]);

  const handleJumpToTime = (input: string) => {
    const secs = parseTimeToSeconds(input);
    if (secs == null || isNaN(secs)) return;
    if (totalDuration && secs > totalDuration) {
      setCurrentTime(totalDuration);
      scrollToClosest(totalDuration);
      return;
    }
    setCurrentTime(Math.max(0, secs));
    scrollToClosest(secs);
  };

  const scrollToClosest = (secs: number) => {
    if (!filtered.length) return;
    let best: TranscriptSegment | null = null;
    let bestDelta = Infinity;
    for (const seg of filtered) {
      const delta = Math.abs(seg.start - secs);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = seg;
      }
    }
    if (best) {
      const el = itemRefs.current.get(best.id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const onRangeChange = (value: number) => {
    setCurrentTime(value);
    scrollToClosest(value);
  };

  const onCopySegment = async (seg: TranscriptSegment) => {
    try {
      await navigator.clipboard.writeText(`${formatTime(seg.start)} — ${seg.speaker || "Speaker"}: ${seg.text}`);
    } catch {
      // ignore
    }
  };

  const onAddHighlightAt = (t: number) => {
    if (!sessionId) return;
    router.push(`/sessions/${sessionId}/highlights?at=${Math.floor(t)}`);
  };

  const onGenerateSummary = () => {
    if (!sessionId) return;
    router.push(`/sessions/${sessionId}/summary`);
  };

  const onExport = () => {
    if (!sessionId) return;
    router.push(`/sessions/${sessionId}/exports`);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M12 1.5a1.5 1.5 0 0 1 1.5 1.5v.75c0 .414.336.75.75.75h.75A1.5 1.5 0 0 1 16.5 6v.75a.75.75 0 0 0 .75.75h.75A1.5 1.5 0 0 1 19.5 9v6a1.5 1.5 0 0 1-1.5 1.5h-.75a.75.75 0 0 0-.75.75V18a1.5 1.5 0 0 1-1.5 1.5h-.75a.75.75 0 0 0-.75.75v.75A1.5 1.5 0 0 1 12 22.5h-1.5a1.5 1.5 0 0 1-1.5-1.5v-.75a.75.75 0 0 0-.75-.75H7.5A1.5 1.5 0 0 1 6 18v-.75a.75.75 0 0 0-.75-.75H4.5A1.5 1.5 0 0 1 3 15V9a1.5 1.5 0 0 1 1.5-1.5h.75A.75.75 0 0 0 6 6.75V6a1.5 1.5 0 0 1 1.5-1.5h.75a.75.75 0 0 0 .75-.75V3A1.5 1.5 0 0 1 10.5 1.5H12z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold">Transcript</h1>
            <p className="text-sm text-muted-foreground">Session {sessionId || ""} — full transcript, search, and navigation</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAddHighlightAt(currentTime)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M4.5 12a7.5 7.5 0 1 1 12.935 5.086l2.39 2.39a.75.75 0 0 1-1.06 1.06l-2.39-2.39A7.5 7.5 0 0 1 4.5 12zm7.5-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
            </svg>
            Add Highlight
          </button>
          <button
            onClick={onGenerateSummary}
            className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M4.5 4.5A1.5 1.5 0 0 1 6 3h7.379a1.5 1.5 0 0 1 1.06.44l4.121 4.121A1.5 1.5 0 0 1 19 8.621V19.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15zM14.25 3.75V7.5a.75.75 0 0 0 .75.75h3.75" />
            </svg>
            Generate Summary
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M12 3a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 0 1 8.707 11.293L11 13.586V4a1 1 0 0 1 1-1z" />
              <path d="M5 15a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v2.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V16a1 1 0 0 1 1-1z" />
            </svg>
            Export
          </button>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-muted-foreground">
              <path d="M10.5 3a7.5 7.5 0 1 1 4.743 13.387l3.185 3.185a1 1 0 0 1-1.414 1.414l-3.185-3.185A7.5 7.5 0 0 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
            </svg>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transcript (press / to focus)"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted">
              <input
                type="checkbox"
                checked={groupBySpeaker}
                onChange={(e) => setGroupBySpeaker(e.target.checked)}
                className="accent-primary"
              />
              Group by speaker
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted">
              <input
                type="checkbox"
                checked={showTimestamps}
                onChange={(e) => setShowTimestamps(e.target.checked)}
                className="accent-primary"
              />
              Show timestamps
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{segments.length ? `${segments.length} segments` : loading ? "" : "No segments"}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{speakers.length} speakers</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TimeJump onJump={handleJumpToTime} />
            <button
              onClick={() => onAddHighlightAt(currentTime)}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Mark highlight at {formatTime(currentTime)}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <RangeScrubber
            total={totalDuration}
            value={currentTime}
            onChange={onRangeChange}
            disabled={!totalDuration}
          />
        </div>
      </section>

      {!loading && !segments.length ? (
        <EmptyState sessionId={sessionId} />
      ) : (
        <section ref={containerRef} className="relative grid grid-cols-1 gap-3">
          {loading ? (
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : groupBySpeaker && groupedBySpeaker ? (
            groupedBySpeaker.map(([speaker, list]) => (
              <div key={speaker} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-2 rounded-full bg-chart-1" />
                    <h3 className="text-sm font-medium">{speaker}</h3>
                    <span className="text-xs text-muted-foreground">{list.length} segments</span>
                  </div>
                </div>
                <Separator />
                <div className="divide-y">
                  {list.map((seg) => (
                    <SegmentRow
                      key={seg.id}
                      seg={seg}
                      showTimestamps={showTimestamps}
                      query={query}
                      currentTime={currentTime}
                      ref={(el) => {
                        if (el) itemRefs.current.set(seg.id, el);
                        else itemRefs.current.delete(seg.id);
                      }}
                      onCopy={() => onCopySegment(seg)}
                      onJump={(t) => onRangeChange(t)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            filtered.map((seg) => (
              <SegmentRow
                key={seg.id}
                seg={seg}
                showTimestamps={showTimestamps}
                query={query}
                currentTime={currentTime}
                ref={(el) => {
                  if (el) itemRefs.current.set(seg.id, el);
                  else itemRefs.current.delete(seg.id);
                }}
                onCopy={() => onCopySegment(seg)}
                onJump={(t) => onRangeChange(t)}
              />
            ))
          )}
        </section>
      )}

      <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="hover:text-foreground hover:underline">Dashboard</Link>
          <Link href="/sessions" className="hover:text-foreground hover:underline">Sessions</Link>
          {sessionId ? (
            <>
              <Link href={`/sessions/${sessionId}/live`} className="hover:text-foreground hover:underline">Live</Link>
              <Link href={`/sessions/${sessionId}/highlights`} className="hover:text-foreground hover:underline">Highlights</Link>
              <Link href={`/sessions/${sessionId}/upload-highlights`} className="hover:text-foreground hover:underline">Upload Highlights</Link>
              <Link href={`/sessions/${sessionId}/summary`} className="hover:text-foreground hover:underline">Summary</Link>
              <Link href={`/sessions/${sessionId}/exports`} className="hover:text-foreground hover:underline">Exports</Link>
              <Link href={`/sessions/${sessionId}/settings`} className="hover:text-foreground hover:underline">Settings</Link>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/integrations/zoom" className="hover:text-foreground hover:underline">Connect Zoom</Link>
          <Link href="/integrations/teams" className="hover:text-foreground hover:underline">Connect Teams</Link>
          <Link href="/help" className="hover:text-foreground hover:underline">Help</Link>
          <Link href="/legal/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-foreground hover:underline">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

function TimeJump({ onJump }: { onJump: (input: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onJump(val);
        }}
        placeholder="Jump to 1:23 or 01:02:03"
        className="w-44 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <button onClick={() => onJump(val)} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
        Jump
      </button>
    </div>
  );
}

function RangeScrubber({ total, value, onChange, disabled }: { total: number; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{formatTime(value)}</span>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.floor(total))}
        value={Math.floor(Math.min(value, total))}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          "flex-1 accent-primary",
          disabled ? "opacity-50" : "opacity-100"
        )}
      />
      <span className="w-12 text-xs tabular-nums text-muted-foreground">{formatTime(total)}</span>
    </div>
  );
}

const SkeletonRow = () => (
  <div className="rounded-lg border bg-card p-4">
    <div className="mb-2 flex items-center gap-3">
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
    </div>
    <div className="h-4 w-full animate-pulse rounded bg-muted" />
    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
  </div>
);

const EmptyState = ({ sessionId }: { sessionId?: string }) => (
  <div className="rounded-lg border bg-card p-6">
    <Alert className="border-none bg-muted/40">
      <AlertTitle className="mb-1">No transcript available yet</AlertTitle>
      <AlertDescription>
        <div className="space-y-2 text-sm">
          <p>Start a live session to generate a transcript or import a recording for processing.</p>
          <div className="flex flex-wrap gap-2">
            {sessionId ? (
              <>
                <Link href={`/sessions/${sessionId}/live`} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground">
                  Go Live
                </Link>
                <Link href={`/sessions/${sessionId}/upload-highlights`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2">
                  Upload Highlights
                </Link>
              </>
            ) : null}
            <Link href="/ingest/upload" className="inline-flex items-center gap-2 rounded-md border px-3 py-2">
              Import Recording
            </Link>
            <Link href="/integrations/zoom" className="inline-flex items-center gap-2 rounded-md border px-3 py-2">
              Connect Zoom
            </Link>
            <Link href="/integrations/teams" className="inline-flex items-center gap-2 rounded-md border px-3 py-2">
              Connect Teams
            </Link>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

type SegmentRowProps = {
  seg: TranscriptSegment;
  showTimestamps: boolean;
  query: string;
  currentTime: number;
  onCopy: () => void;
  onJump: (time: number) => void;
};


const SegmentRowForward = Object.assign(
  // eslint-disable-next-line react/display-name
  (props: SegmentRowProps & { ref?: (el: HTMLDivElement | null) => void }) => SegmentRow(props as SegmentRowProps, (props as any).ref),
  { displayName: "SegmentRow" }
);

// A small wrapper to allow ref function with TS friendliness
const SegmentRowWrapper = (
  props: SegmentRowProps & { ref?: (el: HTMLDivElement | null) => void }
) => SegmentRow(props as SegmentRowProps, (props as any).ref);

// Re-export consistent component usage
const SegmentRowComp = SegmentRowWrapper as unknown as (
  props: SegmentRowProps & { ref?: (el: HTMLDivElement | null) => void }
) => JSX.Element;

// To satisfy usage with ref assignment inline
const SegmentRowActual = SegmentRowComp;

// Alias for clean usage above
const SegmentRowAlias = SegmentRowActual;

// Use alias in JSX (TypeScript friendliness in this context)
const SegmentRowComponent = SegmentRowAlias;

// Reassign exported usage name for clarity in JSX
const SegmentRowUsed = SegmentRowComponent;

// Actual reference used above
const SegmentRowRefHack = SegmentRowUsed;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SegmentRowDisplayName = "SegmentRow";

// Helper to appease TS in JSX usage
function SegmentRow(props: SegmentRowProps & { ref?: (el: HTMLDivElement | null) => void }) {
  // @ts-ignore - our inline ref passing is handled manually
  return <SegmentRowRef {...props} />;
}

function SegmentRowRef(props: SegmentRowProps & { ref?: (el: HTMLDivElement | null) => void }) {
  const { seg, showTimestamps, query, currentTime, onCopy, onJump } = props;
  const active = currentTime >= seg.start && currentTime < seg.end;
  const hrefTimeParam = Math.floor(seg.start);
  const atLink = `?at=${hrefTimeParam}`;
  return (
    <div ref={props.ref} className={cn("rounded-lg border bg-card p-4", active && "ring-2 ring-primary/40")}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {showTimestamps ? (
            <button
              onClick={() => onJump(seg.start)}
              className={cn(
                "rounded-md bg-muted px-2 py-1 text-xs tabular-nums hover:bg-muted/80",
                active && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              title="Jump to time"
            >
              {formatTime(seg.start)} — {formatTime(seg.end)}
            </button>
          ) : null}
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex size-2 rounded-full bg-chart-2" />
            {seg.speaker || "Unlabeled"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCopy} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">Copy</button>
          <Link
            href={typeof window !== "undefined" ? `${window.location.pathname}${atLink}` : atLink}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            Link
          </Link>
        </div>
      </div>
      <p className="text-sm leading-relaxed">{highlightMatches(seg.text, query)}</p>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "00:00";
  const s = Math.floor(totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parseTimeToSeconds(input: string): number | null {
  const str = input.trim();
  if (!str) return null;

  // Support 1h2m3s style
  const hms = /^((\d+)h)?\s*((\d+)m)?\s*((\d+)s)?$/i;
  const m1 = str.match(hms);
  if (m1 && (m1[2] || m1[4] || m1[6])) {
    const h = parseInt(m1[2] || "0", 10);
    const m = parseInt(m1[4] || "0", 10);
    const s = parseInt(m1[6] || "0", 10);
    return h * 3600 + m * 60 + s;
    }

  // Support HH:MM:SS or MM:SS
  const parts = str.split(":").map((p) => p.trim());
  if (parts.length === 3) {
    const [h, m, s] = parts.map((n) => Number(n));
    if ([h, m, s].every((n) => Number.isFinite(n))) return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map((n) => Number(n));
    if ([m, s].every((n) => Number.isFinite(n))) return m * 60 + s;
  }

  // Plain seconds
  const n = Number(str);
  if (Number.isFinite(n)) return Math.max(0, Math.floor(n));

  return null;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query: string) {
  if (!query.trim()) return text;
  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return text;
  const regex = new RegExp(tokens.map(escapeRegExp).join("|"), "gi");
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    const start = m.index;
    const end = regex.lastIndex;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    const match = text.slice(start, end);
    parts.push(
      <mark key={`${start}-${end}`} className="rounded bg-yellow-200 px-0.5 py-0">
        {match}
      </mark>
    );
    lastIndex = end;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}
