"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Document Overview page for a specific document. It fetches the document
 * and related entities (summaries, chunks, embeddings, jobs, quiz sets, SRS cards) from Supabase on the client,
 * shows processing status, a quick summary preview, key metadata, and suggested next actions. It provides
 * navigation to document-specific subpages: summary, chat, quiz, chunks, and settings. This is a client-only page
 * meant to be used within an authenticated app layout that already includes header/footer/sidebar.
 */

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_bucket: string;
  storage_path: string;
  page_count: number | null;
  language: string | null;
  ocr_used: boolean;
  status: string; // document_status_enum
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type SummaryRow = {
  id: string;
  document_id: string;
  user_id: string;
  scope: string;
  length: string;
  section_label: string | null;
  page_from: number | null;
  page_to: number | null;
  content: string;
  created_at: string;
};

type JobRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  job_type: string;
  status: string; // job_status_enum
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  payload: any | null;
  result: any | null;
  run_after: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

function bytesToReadable(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"]; 
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${sizes[i]}`;
}

function formatDateTime(dt?: string | null): string {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function relativeTime(dt?: string | null): string {
  if (!dt) return "-";
  const d = new Date(dt).getTime();
  if (Number.isNaN(d)) return "-";
  const diff = Date.now() - d;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      const value = Math.round(diff / ms);
      return rtf.format(value, unit);
    }
  }
  return "-";
}

function computeProgress(params: {
  status: string;
  hasChunks: boolean;
  hasEmbeddings: boolean;
  hasSummary: boolean;
}): { percent: number; label: string; tone: "idle" | "progress" | "success" | "error" } {
  const s = params.status?.toLowerCase?.() ?? "";
  let base = 0;
  let label = "준비됨";
  let tone: "idle" | "progress" | "success" | "error" = "idle";

  if (["failed", "error"].includes(s)) {
    return { percent: 100, label: "처리 실패", tone: "error" };
  }
  if (["ready", "completed", "complete", "done"].includes(s)) {
    const steps = [params.hasChunks, params.hasEmbeddings, params.hasSummary];
    const achieved = steps.filter(Boolean).length;
    const pct = Math.max(90, Math.round((achieved / 3) * 100));
    return { percent: pct, label: "완료", tone: "success" };
  }
  if (["processing", "running", "in_progress", "embedding", "parsing", "queued", "pending"].includes(s)) {
    tone = "progress";
    label = s === "queued" || s === "pending" ? "대기 중" : "처리 중";
    base = s === "queued" || s === "pending" ? 10 : 30;
  }

  // Incremental progress by milestones
  let percent = base;
  if (params.hasChunks) percent += 30;
  if (params.hasEmbeddings) percent += 30;
  if (params.hasSummary) percent += 10;
  percent = Math.min(95, Math.max(5, percent));

  return { percent, label, tone };
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, { text: string; cls: string }> = {
    ready: { text: "완료", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    completed: { text: "완료", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    processing: { text: "처리 중", cls: "bg-primary/10 text-primary" },
    running: { text: "처리 중", cls: "bg-primary/10 text-primary" },
    queued: { text: "대기 중", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    pending: { text: "대기 중", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    failed: { text: "실패", cls: "bg-destructive/10 text-destructive" },
    error: { text: "실패", cls: "bg-destructive/10 text-destructive" },
  };
  const meta = map[s] || { text: status || "-", cls: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", meta.cls)}>{meta.text}</span>;
}

function ProgressBar({ value, tone }: { value: number; tone: "idle" | "progress" | "success" | "error" }) {
  const color = tone === "success" ? "bg-green-500" : tone === "error" ? "bg-destructive" : tone === "progress" ? "bg-primary" : "bg-muted-foreground/40";
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full transition-all", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground p-4", accent)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function IconBack(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconRefresh(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0019 5" />
    </svg>
  );
}
function IconDoc(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v4h4" />
    </svg>
  );
}
function IconChat(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-3-6.708L21 3v6h-6l2.293-2.293A7 7 0 1020 12z" />
    </svg>
  );
}
function IconQuiz(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 8h6M9 16h3" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  );
}
function IconChunks(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconSettings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.11.73 1.77.73h.09a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function DocumentOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const docId = Array.isArray(params?.docId) ? params.docId[0] : (params?.docId as string | undefined);

  const [doc, setDoc] = React.useState<DocumentRow | null>(null);
  const [summary, setSummary] = React.useState<SummaryRow | null>(null);
  const [jobs, setJobs] = React.useState<JobRow[]>([]);
  const [counts, setCounts] = React.useState({
    chunks: 0,
    embeddings: 0,
    quizSets: 0,
    srsCards: 0,
    chatSessions: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const fetchAll = React.useCallback(async () => {
    if (!docId) return;
    setError(null);
    const supabase = supabaseBrowser;

    const docPromise = supabase.from("documents").select("*").eq("id", docId).limit(1).single();
    const summaryPromise = supabase
      .from("summaries")
      .select("*")
      .eq("document_id", docId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const chunksCountPromise = supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", docId);
    const embeddingsCountPromise = supabase
      .from("chunk_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("document_id", docId);

    const quizSetsCountPromise = supabase
      .from("quiz_sets")
      .select("id", { count: "exact", head: true })
      .eq("document_id", docId);

    const srsCardsCountPromise = supabase
      .from("srs_cards")
      .select("id", { count: "exact", head: true })
      .eq("document_id", docId);

    const chatSessionsCountPromise = supabase
      .from("chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("document_id", docId);

    const jobsPromise = supabase
      .from("jobs")
      .select("id, user_id, document_id, job_type, status, priority, attempts, max_attempts, last_error, payload, result, run_after, started_at, finished_at, created_at, updated_at")
      .eq("document_id", docId)
      .order("created_at", { ascending: false })
      .limit(8);

    const [docRes, summaryRes, chunksRes, embedsRes, quizRes, srsRes, chatRes, jobsRes] = await Promise.all([
      docPromise,
      summaryPromise,
      chunksCountPromise,
      embeddingsCountPromise,
      quizSetsCountPromise,
      srsCardsCountPromise,
      chatSessionsCountPromise,
      jobsPromise,
    ]);

    if (docRes.error) throw docRes.error;

    setDoc(docRes.data as DocumentRow);
    if (summaryRes.error && summaryRes.error.code !== "PGRST116") {
      // PGRST116: No rows found for maybeSingle
      throw summaryRes.error;
    }
    setSummary((summaryRes.data as SummaryRow) || null);

    setCounts({
      chunks: chunksRes.count ?? 0,
      embeddings: embedsRes.count ?? 0,
      quizSets: quizRes.count ?? 0,
      srsCards: srsRes.count ?? 0,
      chatSessions: chatRes.count ?? 0,
    });

    if (jobsRes.error) throw jobsRes.error;
    setJobs((jobsRes.data as JobRow[]) || []);
  }, [docId]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await fetchAll();
      } catch (e: any) {
        setError(e?.message || "데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchAll, refreshKey]);

  // Polling while processing
  React.useEffect(() => {
    if (!doc) return;
    const s = (doc.status || "").toLowerCase();
    const stillProcessing = ["processing", "running", "in_progress", "queued", "pending", "embedding", "parsing"].includes(s);
    if (!stillProcessing) return;

    const id = setInterval(async () => {
      try {
        await fetchAll();
      } catch (_) {
        // swallow
      }
    }, 4000);
    return () => clearInterval(id);
  }, [doc, fetchAll]);

  const progressMeta = computeProgress({
    status: doc?.status || "",
    hasChunks: counts.chunks > 0,
    hasEmbeddings: counts.embeddings > 0,
    hasSummary: !!summary,
  });

  const handleManualRefresh = () => setRefreshKey((k) => k + 1);

  const showError = !!doc?.error_message || jobs.some((j) => (j.status || "").toLowerCase() === "failed" || j.last_error);

  const disabledUntilReady = !doc || (!summary && progressMeta.tone !== "success");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/documents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <IconBack className="w-5 h-5 mr-1" /> 문서 목록으로
          </Link>
        </div>
        <button
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          aria-label="새로고침"
        >
          <IconRefresh className="w-4 h-4" /> 새로고침
        </button>
      </div>

      {/* Header */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        {loading && !doc ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : !doc ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>문서를 찾을 수 없어요</AlertTitle>
              <AlertDescription>이 문서에 접근 권한이 없거나 삭제되었을 수 있어요.</AlertDescription>
            </Alert>
            <div>
              <Link href="/documents" className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">문서로 돌아가기</Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <IconDoc className="w-6 h-6 text-muted-foreground" />
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{doc.title}</h1>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{doc.original_filename} · {doc.mime_type} · {bytesToReadable(doc.file_size_bytes)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={doc.status} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">처리 진행률</span>
                <span className="text-xs text-muted-foreground">{progressMeta.label} · 업데이트 {relativeTime(doc.updated_at)}</span>
              </div>
              <ProgressBar value={progressMeta.percent} tone={progressMeta.tone} />
            </div>

            {showError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>처리 중 문제가 발생했어요</AlertTitle>
                <AlertDescription>
                  {doc.error_message ? <div className="mb-1">{doc.error_message}</div> : null}
                  {jobs.filter((j) => (j.status || "").toLowerCase() === "failed" || j.last_error).slice(0, 1).map((j) => (
                    <div key={j.id} className="text-xs opacity-90">최근 작업 오류: {j.last_error || j.status}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </section>

      {/* Tab Nav */}
      <nav className="rounded-xl border bg-card p-1 overflow-x-auto">
        <ul className="flex items-center gap-1 min-w-max">
          {[
            { href: `/documents/${docId}/summary`, label: "요약" },
            { href: `/documents/${docId}/chat`, label: "대화" },
            { href: `/documents/${docId}/quiz`, label: "퀴즈" },
            { href: `/documents/${docId}/chunks`, label: "청크" },
            { href: `/documents/${docId}/settings`, label: "설정" },
          ].map((t) => (
            <li key={t.href} className="py-1">
              <Link
                href={t.href}
                className="inline-flex whitespace-nowrap items-center rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Summary + Actions */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold">빠른 요약</h2>
              <Link
                href={`/documents/${docId}/summary`}
                className={cn(
                  "text-sm rounded-lg px-3 py-1.5 border",
                  summary ? "bg-background hover:bg-accent hover:text-accent-foreground" : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                aria-disabled={!summary}
              >
                전체 보기
              </Link>
            </div>
            <Separator />
            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : summary ? (
              <div className="mt-4 text-sm leading-6 text-foreground whitespace-pre-wrap line-clamp-[12]">{summary.content}</div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                아직 요약이 준비되지 않았어요. 처리 완료 후 자동으로 생성됩니다.
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold">추천 다음 단계</h2>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                href={`/documents/${docId}/chat`}
                className={cn(
                  "group rounded-xl border p-4 hover:bg-accent transition-colors",
                  disabledUntilReady ? "opacity-70" : ""
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-primary/10 text-primary">
                    <IconChat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">문서와 대화하기</div>
                    <div className="text-xs text-muted-foreground">RAG 기반 질의응답</div>
                  </div>
                </div>
              </Link>
              <Link
                href={`/documents/${docId}/quiz`}
                className={cn(
                  "group rounded-xl border p-4 hover:bg-accent transition-colors",
                  counts.chunks > 0 ? "" : "opacity-70"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-chart-2/20 text-chart-2">
                    <IconQuiz className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">퀴즈 만들기/풀기</div>
                    <div className="text-xs text-muted-foreground">핵심 개념 확인</div>
                  </div>
                </div>
              </Link>
              <Link
                href={`/documents/${docId}/chunks`}
                className="group rounded-xl border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-chart-5/20 text-chart-5">
                    <IconChunks className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">청크 확인하기</div>
                    <div className="text-xs text-muted-foreground">출처/페이지 정보</div>
                  </div>
                </div>
              </Link>
              <Link
                href={`/documents/${docId}/summary`}
                className={cn("group rounded-xl border p-4 hover:bg-accent transition-colors", summary ? "" : "opacity-70")}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-chart-3/20 text-chart-3">
                    <IconDoc className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">요약 자세히 보기</div>
                    <div className="text-xs text-muted-foreground">핵심 포인트 정리</div>
                  </div>
                </div>
              </Link>
              <Link
                href={`/documents/${docId}/settings`}
                className="group rounded-xl border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-secondary text-secondary-foreground">
                    <IconSettings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">문서 설정</div>
                    <div className="text-xs text-muted-foreground">언어/요약 길이 등</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Stats + Metadata + Jobs */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold">진행 현황</h2>
            <Separator className="my-3" />
            {loading && !doc ? (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="청크" value={counts.chunks} hint="추출된 텍스트 단위" />
                <StatCard label="임베딩" value={counts.embeddings} hint="검색 인덱스" />
                <StatCard label="퀴즈 세트" value={counts.quizSets} hint="문서 기반" />
                <StatCard label="SRS 카드" value={counts.srsCards} hint="복습 일정" />
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">문서 메타데이터</h2>
              <span className="text-xs text-muted-foreground">생성 {formatDateTime(doc?.created_at)} • 수정 {relativeTime(doc?.updated_at)}</span>
            </div>
            <Separator className="my-3" />
            {!doc ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">파일명</span>
                    <div className="font-medium">{doc.original_filename}</div>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">파일 유형</span>
                    <div className="font-medium">{doc.file_type} ({doc.mime_type})</div>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">크기</span>
                    <div className="font-medium">{bytesToReadable(doc.file_size_bytes)}</div>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">페이지</span>
                    <div className="font-medium">{doc.page_count ?? '-'}</div>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">언어</span>
                    <div className="font-medium">{doc.language ?? '-'}</div>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">OCR 사용</span>
                    <div className="font-medium">{doc.ocr_used ? '예' : '아니오'}</div>
                  </div>
                </div>
                <Collapsible className="mt-3">
                  <CollapsibleTrigger className="text-xs text-muted-foreground underline underline-offset-4">자세히</CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                      <div>
                        <span className="text-muted-foreground">스토리지 버킷</span>
                        <div className="font-mono text-xs mt-1">{doc.storage_bucket}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">스토리지 경로</span>
                        <div className="font-mono text-xs mt-1 break-all">{doc.storage_path}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">문서 ID</span>
                        <div className="font-mono text-xs mt-1 break-all">{doc.id}</div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold">최근 작업</h2>
            <Separator className="my-3" />
            {loading && !doc ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-sm text-muted-foreground">최근 작업 기록이 없어요.</div>
            ) : (
              <ul className="space-y-3">
                {jobs.slice(0, 6).map((j) => {
                  const st = (j.status || "").toLowerCase();
                  const color = st === "failed" ? "text-destructive" : st === "completed" || st === "success" ? "text-green-600 dark:text-green-400" : "text-primary";
                  return (
                    <li key={j.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{j.job_type}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">시작 {j.started_at ? relativeTime(j.started_at) : '-'} • 종료 {j.finished_at ? relativeTime(j.finished_at) : '-'}</div>
                        {j.last_error ? (
                          <div className="text-xs text-destructive mt-1 line-clamp-2">오류: {j.last_error}</div>
                        ) : null}
                      </div>
                      <div className={cn("text-sm font-medium", color)}>{j.status}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          문서 기반 학습을 시작해볼까요?
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/documents/${docId}/chat`} className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
            <IconChat className="w-4 h-4 mr-2" /> 대화 열기
          </Link>
          <Link href={`/documents/${docId}/quiz`} className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <IconQuiz className="w-4 h-4 mr-2" /> 퀴즈 탐색
          </Link>
          <Link href={`/documents/${docId}/summary`} className="inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <IconDoc className="w-4 h-4 mr-2" /> 요약 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
