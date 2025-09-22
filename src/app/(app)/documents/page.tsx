"use client";

/**
 * CODE INSIGHT
 * This code's use case is the user's protected Document Library page. It lists the user's uploaded documents,
 * shows processing status chips, provides quick actions, and supports search/filters/sorting. It links each
 * document to its detail page (/documents/[docId]), includes a breadcrumb back to /dashboard, and a top-right
 * action to /upload. It uses Supabase (client) for authenticated data fetching and Tailwind for a clean, responsive UI.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

interface DocumentRow {
  id: string;
  user_id?: string;
  title: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_bucket?: string;
  storage_path?: string;
  page_count: number | null;
  language: string | null;
  ocr_used: boolean;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusClasses(statusRaw?: string | null) {
  const status = (statusRaw || "").toLowerCase();
  if (["ready", "completed", "done", "success"].includes(status)) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (["failed", "error", "canceled"].includes(status)) {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  if (["queued", "pending"].includes(status)) {
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
  }
  // processing-like
  return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
}

function statusLabel(status?: string | null) {
  if (!status) return "-";
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    ready: "완료",
    completed: "완료",
    done: "완료",
    success: "완료",
    failed: "실패",
    error: "오류",
    canceled: "취소됨",
    queued: "대기 중",
    pending: "대기 중",
    processing: "처리 중",
    parsing: "파싱 중",
    embedding: "임베딩 중",
    summarizing: "요약 중",
    index: "인덱싱 중",
  };
  return map[s] || status;
}

function fileTypeIcon(fileType?: string | null, mime?: string | null) {
  const v = (fileType || mime || "").toLowerCase();
  if (v.includes("pdf")) return "📄";
  if (v.includes("doc")) return "📄";
  if (v.includes("ppt")) return "📊";
  if (v.includes("txt")) return "📝";
  if (v.includes("png") || v.includes("jpg") || v.includes("jpeg") || v.includes("image")) return "🖼️";
  return "🗂️";
}

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState<string>(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "");
  const [type, setType] = useState<string>(searchParams.get("type") ?? "");
  const [sort, setSort] = useState<string>(searchParams.get("sort") ?? "new");

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user
  useEffect(() => {
    let active = true;
    setLoadingUser(true);
    supabaseBrowser.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setUserId(null);
        setLoadingUser(false);
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setLoadingUser(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const updateQueryString = useCallback(
    (params: Record<string, string | undefined>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      Object.entries(params).forEach(([k, v]) => {
        if (v && v.length > 0) current.set(k, v);
        else current.delete(k);
      });
      const qs = current.toString();
      router.replace(qs ? `?${qs}` : "");
    },
    [router, searchParams]
  );

  // Sync URL when filters change (debounce for q)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      updateQueryString({ q: q || undefined, status: status || undefined, type: type || undefined, sort: sort || undefined });
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [q, status, type, sort, updateQueryString]);

  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    setLoadingDocs(true);
    setError(null);
    const { data, error } = await supabaseBrowser
      .from("documents")
      .select(
        [
          "id",
          "title",
          "original_filename",
          "file_type",
          "mime_type",
          "file_size_bytes",
          "page_count",
          "language",
          "ocr_used",
          "status",
          "error_message",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message || "문서를 불러오는 중 오류가 발생했습니다.");
      setDocs(null);
    } else {
      setDocs(data as DocumentRow[]);
    }
    setLoadingDocs(false);
  }, [userId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll while any doc is still processing-like
  useEffect(() => {
    if (!docs || docs.length === 0) return;
    const hasActive = docs.some((d) => {
      const s = (d.status || "").toLowerCase();
      return !["ready", "completed", "done", "success", "failed", "error", "canceled"].includes(s);
    });
    if (hasActive) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchDocuments();
      }, 8000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [docs, fetchDocuments]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    (docs || []).forEach((d) => d.status && set.add(d.status));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    (docs || []).forEach((d) => d.file_type && set.add(d.file_type));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const filtered = useMemo(() => {
    let list = (docs || []).slice();
    if (status) list = list.filter((d) => (d.status || "").toLowerCase() === status.toLowerCase());
    if (type) list = list.filter((d) => (d.file_type || "").toLowerCase() === type.toLowerCase());
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter((d) =>
        (d.title || "").toLowerCase().includes(qq) || (d.original_filename || "").toLowerCase().includes(qq)
      );
    }
    if (sort === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sort === "old") {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      // new
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [docs, status, type, q, sort]);

  const hasFilters = !!(q || status || type || (sort && sort !== "new"));

  const handleClearFilters = () => {
    setQ("");
    setStatus("");
    setType("");
    setSort("new");
  };

  if (loadingUser) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium">내 문서</li>
          </ol>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDocuments()}
            className="h-9 px-3 rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            새로고침
          </button>
          <Link
            href="/upload"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-primary-foreground hover:opacity-90 transition-opacity"
          >
            업로드
          </Link>
        </div>
      </div>

      {/* Heading */}
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">문서 라이브러리</h1>
        <p className="text-sm text-muted-foreground mt-1">업로드한 학습 자료를 한 곳에서 관리해요.</p>
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">검색</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목 또는 파일명으로 검색"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 md:w-[520px]">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">전체</option>
                {uniqueStatuses.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">형식</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">전체</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">정렬</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="new">최신순</option>
                <option value="old">오래된순</option>
                <option value="title">제목 A-Z</option>
              </select>
            </div>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* Errors */}
      {error && (
        <div className="mt-4">
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {loadingDocs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <div className="text-3xl mb-2">📚</div>
            <h2 className="text-lg font-medium text-foreground">저장된 문서가 없습니다</h2>
            <p className="text-sm text-muted-foreground mt-1">학습할 파일을 업로드해 시작해 보세요.</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link
                href="/upload"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-primary-foreground hover:opacity-90 transition-opacity"
              >
                업로드 바로가기
              </Link>
              {hasFilters && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <div key={d.id} className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center text-lg">
                      {fileTypeIcon(d.file_type, d.mime_type)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/documents/${d.id}`}
                        className="block font-medium text-foreground truncate hover:underline"
                        title={d.title}
                      >
                        {d.title}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate" title={d.original_filename}>
                        {d.original_filename}
                      </div>
                    </div>
                  </div>
                  <span
                    title={d.status}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      statusClasses(d.status)
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusLabel(d.status)}
                  </span>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>형식</span>
                      <span className="text-foreground/80">{(d.file_type || "").toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>페이지</span>
                      <span className="text-foreground/80">{d.page_count ?? "-"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>용량</span>
                      <span className="text-foreground/80">{formatBytes(d.file_size_bytes)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>업로드</span>
                      <span className="text-foreground/80">{formatDate(d.created_at)}</span>
                    </div>
                  </div>
                </div>

                {d.error_message && (
                  <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    오류: {d.error_message}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/documents/${d.id}`}
                    className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    열기
                  </Link>
                  <Link
                    href={`/documents/${d.id}/summary`}
                    className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    요약
                  </Link>
                  <Link
                    href={`/documents/${d.id}/chat`}
                    className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    채팅
                  </Link>
                  <Link
                    href={`/documents/${d.id}/quiz`}
                    className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    퀴즈
                  </Link>

                  <Collapsible className="ml-auto">
                    <CollapsibleTrigger asChild>
                      <button className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-foreground hover:bg-accent hover:text-accent-foreground">
                        더보기
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <Link
                          href={`/documents/${d.id}/chunks`}
                          className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          청크 보기
                        </Link>
                        <span className="text-muted-foreground">•</span>
                        <Link
                          href={`/documents/${d.id}/settings`}
                          className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          설정
                        </Link>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
