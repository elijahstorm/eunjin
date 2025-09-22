"use client";

/**
 * CODE INSIGHT
 * This code's use case is the per-document Settings page for poiima. It allows an authenticated user to manage a specific document: rename it, request reprocessing (enqueue a job), delete it, and view processing logs (jobs) related to that document. The page fetches and updates data using Supabase with client-side RLS and provides a responsive, production-ready UI without headers/footers/sidebars.
 */

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

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
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type JobRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  job_type: string;
  status: string;
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "-";
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("error") || s.includes("failed") || s.includes("dead")) return "bg-destructive/15 text-destructive border-destructive/20";
  if (s.includes("queued") || s.includes("pending") || s.includes("waiting")) return "bg-muted text-foreground border-border";
  if (s.includes("running") || s.includes("processing") || s.includes("started")) return "bg-primary/10 text-primary border-primary/20";
  if (s.includes("done") || s.includes("success") || s.includes("finished") || s.includes("completed")) return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20";
  return "bg-secondary text-secondary-foreground border-border";
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const docIdRaw = (params?.docId ?? "") as string | string[];
  const docId = Array.isArray(docIdRaw) ? docIdRaw[0] : docIdRaw;

  const supabase = React.useMemo(() => supabaseBrowser, []);

  const [userId, setUserId] = React.useState<string | null>(null);

  const [doc, setDoc] = React.useState<DocumentRow | null>(null);
  const [loadingDoc, setLoadingDoc] = React.useState(true);
  const [docError, setDocError] = React.useState<string | null>(null);

  const [renameValue, setRenameValue] = React.useState("");
  const [savingRename, setSavingRename] = React.useState(false);

  const [jobs, setJobs] = React.useState<JobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = React.useState(true);
  const [jobsOpen, setJobsOpen] = React.useState(false);

  const [globalMsg, setGlobalMsg] = React.useState<{ type: "success" | "error"; title?: string; message: string } | null>(null);
  const [reprocessing, setReprocessing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/login");
        return;
      }
      if (cancelled) return;
      setUserId(userRes.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  React.useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    async function load() {
      setLoadingDoc(true);
      setDocError(null);
      const { data, error } = await supabase
        .from("documents")
        .select("id,user_id,title,original_filename,file_type,mime_type,file_size_bytes,storage_bucket,storage_path,page_count,language,ocr_used,status,error_message,created_at,updated_at")
        .eq("id", docId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setDocError(error.message || "문서를 불러오는 중 오류가 발생했어요.");
      } else if (!data) {
        setDocError("문서를 찾을 수 없어요.");
      } else {
        setDoc(data as DocumentRow);
        setRenameValue((data as DocumentRow).title || "");
      }
      setLoadingDoc(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [docId, supabase]);

  React.useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    async function loadJobs() {
      setLoadingJobs(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("id,user_id,document_id,job_type,status,priority,attempts,max_attempts,last_error,payload,result,run_after,started_at,finished_at,created_at,updated_at")
        .eq("document_id", docId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (!error && data) {
        setJobs(data as JobRow[]);
      }
      setLoadingJobs(false);
    }
    loadJobs();

    const channel = supabase
      .channel(`jobs-doc-${docId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `document_id=eq.${docId}` },
        () => {
          // Light refetch on change
          (async () => {
            const { data } = await supabase
              .from("jobs")
              .select("id,user_id,document_id,job_type,status,priority,attempts,max_attempts,last_error,payload,result,run_after,started_at,finished_at,created_at,updated_at")
              .eq("document_id", docId)
              .order("created_at", { ascending: false })
              .limit(50);
            if (!cancelled && data) setJobs(data as JobRow[]);
          })();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [docId, supabase]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!docId || !renameValue.trim()) {
      setGlobalMsg({ type: "error", message: "제목을 입력해 주세요." });
      return;
    }
    if (renameValue.trim().length > 200) {
      setGlobalMsg({ type: "error", message: "제목은 200자 이내로 입력해 주세요." });
      return;
    }
    setSavingRename(true);
    setGlobalMsg(null);
    const { data, error } = await supabase
      .from("documents")
      .update({ title: renameValue.trim() })
      .eq("id", docId)
      .select("id,user_id,title,original_filename,file_type,mime_type,file_size_bytes,storage_bucket,storage_path,page_count,language,ocr_used,status,error_message,created_at,updated_at")
      .maybeSingle();
    setSavingRename(false);
    if (error) {
      setGlobalMsg({ type: "error", message: error.message || "이름 변경에 실패했어요." });
      return;
    }
    if (data) setDoc(data as DocumentRow);
    setGlobalMsg({ type: "success", title: "변경 완료", message: "문서 제목이 업데이트되었어요." });
  }

  async function handleReprocess() {
    if (!docId || !userId) return;
    if (!window.confirm("이 문서를 다시 처리할까요? 기존 임베딩/요약/퀴즈가 갱신될 수 있어요.")) return;
    setReprocessing(true);
    setGlobalMsg(null);

    // Try to reuse last known job_type to respect enum values.
    let jobType: string | null = null;
    {
      const { data } = await supabase
        .from("jobs")
        .select("job_type")
        .eq("document_id", docId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      jobType = (data as any)?.job_type || null;
    }

    const payload = { source: "ui", action: "reprocess", at: new Date().toISOString() };
    const insertBody: Partial<JobRow> = {
      user_id: userId,
      document_id: docId,
      job_type: jobType || "document_ingest",
      priority: 0,
      payload,
    } as any;

    const { error } = await supabase.from("jobs").insert(insertBody as any);
    setReprocessing(false);
    if (error) {
      setGlobalMsg({ type: "error", message: error.message || "재처리 요청에 실패했어요." });
    } else {
      setGlobalMsg({ type: "success", title: "요청됨", message: "재처리 작업이 큐에 추가되었어요." });
      setJobsOpen(true);
    }
  }

  async function handleDelete() {
    if (!docId) return;
    const confirm = window.confirm(
      "정말로 이 문서를 삭제할까요? 이 작업은 되돌릴 수 없어요. 관련 데이터(요약/퀴즈/임베딩 등)도 함께 삭제될 수 있어요."
    );
    if (!confirm) return;
    setDeleting(true);
    setGlobalMsg(null);
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    setDeleting(false);
    if (error) {
      setGlobalMsg({
        type: "error",
        message: error.message || "삭제에 실패했어요. 관련 처리 내역이 있는지 확인해 주세요.",
      });
      return;
    }
    router.replace("/documents");
  }

  return (
    <div className="mx-auto max-w-3xl w-full space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">문서 설정</h1>
          <p className="text-sm text-muted-foreground">문서 이름, 처리 작업, 삭제 및 로그를 관리해요.</p>
        </div>
        <div className="flex items-center gap-2">
          {docId && (
            <Link
              href={`/documents/${docId}`}
              className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              상세로 이동
            </Link>
          )}
          <Link
            href="/documents"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            내 문서
          </Link>
        </div>
      </div>

      {globalMsg && (
        <Alert
          className={cn(
            "border",
            globalMsg.type === "success" ? "border-green-500/30" : "border-destructive/30"
          )}
          variant={globalMsg.type === "success" ? "default" : "destructive"}
        >
          {globalMsg.title && <AlertTitle>{globalMsg.title}</AlertTitle>}
          <AlertDescription>{globalMsg.message}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium">기본 정보</h2>
          <p className="mt-1 text-sm text-muted-foreground">문서의 메타데이터와 상태를 확인할 수 있어요.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-muted-foreground">제목</div>
              <div className="font-medium">
                {loadingDoc ? <Skeleton className="h-5 w-40" /> : doc?.title || "-"}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-muted-foreground">원본 파일</div>
              <div className="font-medium">
                {loadingDoc ? <Skeleton className="h-5 w-56" /> : doc?.original_filename || "-"}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-muted-foreground">파일 크기</div>
              <div className="font-medium">
                {loadingDoc ? <Skeleton className="h-5 w-24" /> : doc ? formatBytes(doc.file_size_bytes) : "-"}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-muted-foreground">상태</div>
              <div className="mt-1 inline-flex items-center gap-2">
                {loadingDoc ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", statusColor(doc?.status || ""))}>
                    {doc?.status || "-"}
                  </span>
                )}
                {doc?.error_message && (
                  <span className="text-xs text-destructive">오류: {doc.error_message}</span>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-muted-foreground">페이지 수</div>
              <div className="font-medium">{loadingDoc ? <Skeleton className="h-5 w-10" /> : doc?.page_count ?? "-"}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-muted-foreground">OCR 사용</div>
              <div className="font-medium">{loadingDoc ? <Skeleton className="h-5 w-10" /> : doc?.ocr_used ? "예" : "아니오"}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
              <div className="text-muted-foreground">업데이트</div>
              <div className="font-medium">{loadingDoc ? <Skeleton className="h-5 w-44" /> : fmtDate(doc?.updated_at)}</div>
            </div>
          </div>
          {docError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>로드 실패</AlertTitle>
              <AlertDescription>{docError}</AlertDescription>
            </Alert>
          )}
        </div>
        <Separator />
        <div className="p-4 sm:p-6">
          <h3 className="text-base font-medium">이름 변경</h3>
          <form onSubmit={handleRename} className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
              type="text"
              name="title"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="새 문서 제목"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              maxLength={200}
              disabled={savingRename || loadingDoc}
              aria-label="문서 제목"
            />
            <button
              type="submit"
              disabled={savingRename || loadingDoc || !renameValue.trim()}
              className={cn(
                "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                savingRename || loadingDoc || !renameValue.trim() ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              {savingRename ? "저장 중..." : "저장"}
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-medium">재처리</h3>
            <p className="mt-1 text-sm text-muted-foreground">텍스트 추출·임베딩·요약·퀴즈 생성을 다시 수행해요. 대용량 문서(20MB 이상)는 제한돼요.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleReprocess}
              disabled={reprocessing || loadingDoc}
              className={cn(
                "inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                reprocessing || loadingDoc ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              {reprocessing ? "재처리 요청 중..." : "재처리 요청"}
            </button>
            <span className="text-xs text-muted-foreground">작업 생성 후 아래 '처리 로그'에서 상태를 확인할 수 있어요.</span>
          </div>
        </div>
        <Separator />
        <div className="p-4 sm:p-6">
          <Collapsible open={jobsOpen} onOpenChange={setJobsOpen}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-medium">처리 로그</h4>
                <p className="text-sm text-muted-foreground">최근 작업 내역을 확인해요.</p>
              </div>
              <CollapsibleTrigger asChild>
                <button className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring">
                  {jobsOpen ? "숨기기" : "보기"} ({jobs.length})
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-4 space-y-3">
                {loadingJobs ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">작업 내역이 없어요.</div>
                ) : (
                  jobs.map((j) => (
                    <div key={j.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", statusColor(j.status))}>{j.status}</span>
                          <span className="text-sm font-medium">{j.job_type}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">생성: {fmtDate(j.created_at)}</div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/40 p-2">시작: {fmtDate(j.started_at)}</div>
                        <div className="rounded-md bg-muted/40 p-2">완료: {fmtDate(j.finished_at)}</div>
                        <div className="rounded-md bg-muted/40 p-2">시도: {j.attempts}/{j.max_attempts}</div>
                      </div>
                      {j.last_error && (
                        <div className="mt-2 text-xs text-destructive">오류: {j.last_error}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-card text-card-foreground shadow-sm">
        <div className="p-4 sm:p-6">
          <h3 className="text-base font-semibold text-destructive">위험 구역</h3>
          <p className="mt-1 text-sm text-muted-foreground">문서를 영구 삭제해요. 되돌릴 수 없어요.</p>
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting || loadingDoc}
              className={cn(
                "inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors",
                deleting || loadingDoc ? "opacity-60 cursor-not-allowed" : "hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            >
              {deleting ? "삭제 중..." : "문서 삭제"}
            </button>
            <span className="text-xs text-muted-foreground">관련 데이터가 남아있으면 삭제가 제한될 수 있어요.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
