"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a protected, client-side chunk browser for a specific document.
 * It fetches document metadata and its extracted text chunks from Supabase, shows source info
 * (filename, page/slide, positions), provides search and copy utilities, and offers navigation
 * to the document overview, summary, and chat pages. It is designed for transparency/debugging
 * and optimized for responsive, production-ready UI without server components.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

type Doc = {
  id: string;
  title: string;
  original_filename: string;
  page_count: number | null;
  file_type: string;
  ocr_used: boolean;
  status: string;
};

type Chunk = {
  id: string;
  chunk_index: number;
  text: string;
  page_number: number | null;
  slide_number: number | null;
  char_start: number | null;
  char_end: number | null;
  tokens: number | null;
  created_at?: string;
};

const PAGE_SIZE = 40;

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function useDocId(): string | null {
  const params = useParams();
  if (!params) return null;
  const raw = (params as Record<string, string | string[] | undefined>)["docId"];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function DocumentChunksPage() {
  const docId = useDocId();
  const searchParams = useSearchParams();

  const [doc, setDoc] = useState<Doc | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metaOpen, setMetaOpen] = useState<boolean>(false);
  const initializedRef = useRef(false);

  // Initialize search query from URL param
  useEffect(() => {
    const q = searchParams?.get("q") || "";
    if (q) setQuery(q);
  }, [searchParams]);

  // Sync query to URL without full navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState({}, "", url.toString());
  }, [query]);

  const loadDocument = useCallback(async () => {
    if (!docId) return;
    setDocLoading(true);
    setDocError(null);
    const supabase = supabaseBrowser;
    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, title, original_filename, page_count, file_type, ocr_used, status"
      )
      .eq("id", docId)
      .single();
    if (error) {
      setDocError(error.message || "문서를 불러오지 못했어요.");
      setDoc(null);
    } else {
      setDoc(data as Doc);
    }
    setDocLoading(false);
  }, [docId]);

  const loadChunks = useCallback(
    async (append = true) => {
      if (!docId) return;
      if (chunksLoading) return;
      setChunksLoading(true);
      setChunksError(null);
      const supabase = supabaseBrowser;

      try {
        // Count (only once or when unknown)
        if (totalCount === null) {
          const { count, error: countErr } = await supabase
            .from("document_chunks")
            .select("id", { count: "exact", head: true })
            .eq("document_id", docId);
          if (countErr) throw countErr;
          setTotalCount(count ?? 0);
        }

        const start = append ? chunks.length : 0;
        const end = start + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("document_chunks")
          .select(
            "id, chunk_index, text, page_number, slide_number, char_start, char_end, tokens, created_at"
          )
          .eq("document_id", docId)
          .order("chunk_index", { ascending: true })
          .range(start, end);

        if (error) throw error;

        const next = (data as Chunk[]) || [];
        setChunks((prev) => (append ? [...prev, ...next] : next));
      } catch (e: any) {
        setChunksError(e?.message || "청크를 불러오지 못했어요.");
      } finally {
        setChunksLoading(false);
      }
    },
    [docId, chunks.length, chunksLoading, totalCount]
  );

  // Initial load
  useEffect(() => {
    if (!docId || initializedRef.current) return;
    initializedRef.current = true;
    loadDocument();
    loadChunks(true);
  }, [docId, loadDocument, loadChunks]);

  const hasMore = useMemo(() => {
    if (totalCount === null) return true;
    return chunks.length < totalCount;
  }, [chunks.length, totalCount]);

  const filteredChunks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chunks;
    return chunks.filter((c) => c.text.toLowerCase().includes(q));
  }, [chunks, query]);

  const highlight = useCallback((text: string, q: string) => {
    if (!q.trim()) return text;
    try {
      const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
      return parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-400/30 rounded px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      );
    } catch {
      return text;
    }
  }, []);

  const onCopy = useCallback(async (chunk: Chunk) => {
    try {
      await navigator.clipboard.writeText(chunk.text);
      setCopiedId(chunk.id);
      setTimeout(() => setCopiedId((prev) => (prev === chunk.id ? null : prev)), 1500);
    } catch {
      // no-op
    }
  }, []);

  return (
    <section className="w-full px-4 pb-10 pt-4 md:px-6 md:pt-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Topbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">청크 브라우저</h1>
            <p className="text-sm text-muted-foreground">추출된 텍스트 청크와 출처 정보를 확인할 수 있어요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {docId && (
              <Link
                href={`/documents/${docId}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                문서로 돌아가기
              </Link>
            )}
            {docId && (
              <>
                <Link
                  href={`/documents/${docId}/summary`}
                  className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:bg-secondary/80"
                >
                  요약
                </Link>
                <Link
                  href={`/documents/${docId}/chat`}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                  대화형 QA
                </Link>
              </>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Document header */}
        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          {docLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-72" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ) : docError ? (
            <Alert className="border-destructive/40 bg-destructive/10">
              <AlertTitle>문서를 불러오지 못했어요</AlertTitle>
              <AlertDescription className="text-sm">{docError}</AlertDescription>
            </Alert>
          ) : doc ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium">{doc.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{doc.original_filename}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-accent px-2 py-0.5 text-accent-foreground">상태: {doc.status}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5">형식: {doc.file_type}</span>
                  {typeof doc.page_count === "number" && (
                    <span className="rounded-md bg-muted px-2 py-0.5">페이지: {doc.page_count}</span>
                  )}
                  <span className={cn("rounded-md px-2 py-0.5", doc.ocr_used ? "bg-chart-3/20 text-chart-3" : "bg-muted text-muted-foreground")}>{doc.ocr_used ? "OCR 사용" : "OCR 미사용"}</span>
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {totalCount === null ? (
                  <>청크 수를 계산 중…</>
                ) : (
                  <>총 {totalCount}개 중 {chunks.length}개 로드됨{query ? ` · 검색 결과 ${filteredChunks.length}개` : ""}</>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:max-w-md">
            <label htmlFor="q" className="text-sm font-medium">청크 내 검색</label>
            <input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="키워드를 입력하세요"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    aria-expanded={metaOpen}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2"/><path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    세부정보 토글
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <p className="mt-2 text-xs text-muted-foreground">각 청크 카드에 인덱스/오프셋/토큰 등의 메타데이터를 표시합니다.</p>
              </CollapsibleContent>
            </Collapsible>
            <button
              onClick={() => loadChunks(true)}
              disabled={!hasMore || chunksLoading}
              className={cn(
                "inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground",
                (!hasMore || chunksLoading) && "opacity-60"
              )}
            >
              {chunksLoading ? "불러오는 중…" : hasMore ? "더 불러오기" : "모두 불러옴"}
            </button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Content */}
        {chunksError && (
          <Alert className="mb-4 border-destructive/40 bg-destructive/10">
            <AlertTitle>청크 로드 실패</AlertTitle>
            <AlertDescription className="text-sm">{chunksError}</AlertDescription>
          </Alert>
        )}

        {/* Skeletons */}
        {chunks.length === 0 && chunksLoading && (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!chunksLoading && chunks.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-card-foreground">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-muted" />
            <p className="text-sm text-muted-foreground">아직 청크가 없어요. 문서 처리 중이거나 오류가 발생했을 수 있어요.</p>
          </div>
        )}

        {/* Chunk list */}
        {chunks.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {filteredChunks.map((chunk) => (
              <article key={chunk.id} className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">Chunk #{chunk.chunk_index}</span>
                    {chunk.page_number !== null && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">페이지 {chunk.page_number}</span>
                    )}
                    {chunk.slide_number !== null && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">슬라이드 {chunk.slide_number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCopy(chunk)}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                      aria-label="청크 텍스트 복사"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="2" y="2" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
                      {copiedId === chunk.id ? "복사됨" : "복사"}
                    </button>
                  </div>
                </div>

                <div className="rounded-md bg-background/60 p-3 text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap break-words">
                    {highlight(chunk.text, query)}
                  </div>
                </div>

                {metaOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="rounded-md bg-muted px-2 py-1">
                      <span className="opacity-70">문자 범위</span>: {chunk.char_start ?? "-"} – {chunk.char_end ?? "-"}
                    </div>
                    <div className="rounded-md bg-muted px-2 py-1">
                      <span className="opacity-70">토큰</span>: {chunk.tokens ?? "-"}
                    </div>
                    <div className="rounded-md bg-muted px-2 py-1">
                      <span className="opacity-70">ID</span>: <span className="font-mono">{chunk.id.slice(0, 8)}…</span>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Load more footer */}
        {chunks.length > 0 && (
          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={() => loadChunks(true)}
              disabled={!hasMore || chunksLoading}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                (!hasMore || chunksLoading) && "opacity-60"
              )}
            >
              {chunksLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/><path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4"/></svg>
                  불러오는 중…
                </>
              ) : hasMore ? (
                <>더 불러오기</>
              ) : (
                <>모든 청크를 불러왔어요</>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
