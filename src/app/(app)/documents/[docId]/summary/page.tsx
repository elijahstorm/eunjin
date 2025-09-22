"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Document Summary workspace for a specific document.
 * It provides summary length options (short/normal/detailed), displays the overall summary,
 * and lists section/slide summaries when available. It reads from Supabase (client-side)
 * using RLS-authenticated queries, and offers navigation to Chat and Quiz pages for the
 * same document, as well as breadcrumbs back to the document detail and documents list.
 */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type SummaryRow = {
  id: string;
  document_id: string;
  user_id: string;
  scope: string | null;
  length: string | null;
  section_label: string | null;
  page_from: number | null;
  page_to: number | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  title: string;
  original_filename: string;
  status: string;
  page_count: number | null;
  created_at: string;
  updated_at: string;
};

const LENGTH_OPTIONS = [
  { key: "short", label: "짧게" },
  { key: "normal", label: "보통" },
  { key: "detailed", label: "상세" },
] as const;

type LengthKey = typeof LENGTH_OPTIONS[number]["key"];

export default function DocumentSummaryPage() {
  const params = useParams();
  const docId = String(params?.docId ?? "");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<DocumentRow | null>(null);
  const [summaries, setSummaries] = React.useState<SummaryRow[]>([]);
  const [selectedLength, setSelectedLength] = React.useState<LengthKey>("normal");
  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const [docRes, sumRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title, original_filename, status, page_count, created_at, updated_at")
          .eq("id", docId)
          .single(),
        supabase
          .from("summaries")
          .select(
            "id, document_id, user_id, scope, length, section_label, page_from, page_to, content, created_at, updated_at"
          )
          .eq("document_id", docId)
          .order("created_at", { ascending: false }),
      ]);

      if (docRes.error) throw docRes.error;
      setDoc(docRes.data as DocumentRow);

      if (sumRes.error) throw sumRes.error;
      setSummaries((sumRes.data ?? []) as SummaryRow[]);
    } catch (e: any) {
      setError(e?.message ?? "오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredByLength = React.useMemo(() => {
    return summaries.filter((s) => (s.length ?? "").toLowerCase() === selectedLength);
  }, [summaries, selectedLength]);

  const overallSummary = React.useMemo(() => {
    // Prefer summaries that look like document-level (no section/page bounds)
    const candidates = filteredByLength.filter(
      (s) => !s.section_label && !s.page_from && !s.page_to
    );
    if (candidates.length > 0) return candidates[0];
    // Fallback: any summary if none match the clean overall
    return filteredByLength[0] ?? null;
  }, [filteredByLength]);

  const sectionSummaries = React.useMemo(() => {
    return filteredByLength.filter((s) => !!s.section_label || !!s.page_from || !!s.page_to);
  }, [filteredByLength]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <div className="mb-4 text-sm flex items-center gap-2 text-muted-foreground">
        <Link href="/documents" className="hover:text-foreground transition-colors">문서</Link>
        <span className="text-border">/</span>
        {docId ? (
          <Link href={`/documents/${docId}`} className="hover:text-foreground transition-colors">
            상세
          </Link>
        ) : (
          <span className="text-muted-foreground">상세</span>
        )}
        <span className="text-border">/</span>
        <span className="text-foreground">요약</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : doc ? (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{doc.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {doc.original_filename} • {doc.page_count ?? "-"}p • 업데이트 {formatDate(doc.updated_at)}
              </p>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">문서를 찾을 수 없어요</h1>
          )}
        </div>

        {/* Top-right Nav tabs */}
        <div className="inline-flex items-center rounded-full border border-border bg-card p-1">
          <span className={cn(
            "px-3 py-1.5 text-sm rounded-full font-medium",
            "bg-primary text-primary-foreground"
          )}>
            요약
          </span>
          {docId && (
            <Link
              href={`/documents/${docId}/chat`}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full font-medium",
                "text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
              )}
            >
              채팅
            </Link>
          )}
          {docId && (
            <Link
              href={`/documents/${docId}/quiz`}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full font-medium",
                "text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
              )}
            >
              퀴즈
            </Link>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Length selector and actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card w-full md:w-auto">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedLength(opt.key)}
              className={cn(
                "px-3 sm:px-4 py-2 text-sm rounded-md transition-colors w-1/3 md:w-auto",
                selectedLength === opt.key
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border",
              "border-border bg-card text-foreground hover:bg-muted transition-colors",
              (loading || refreshing) && "opacity-60 cursor-not-allowed"
            )}
          >
            <span className={cn("inline-block h-3 w-3 rounded-full", (loading || refreshing) ? "animate-pulse bg-muted-foreground" : "bg-accent")}></span>
            새로고침
          </button>
          {docId && (
            <Link
              href={`/documents/${docId}`}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-border bg-card text-foreground hover:bg-muted transition-colors"
            >
              문서로 돌아가기
            </Link>
          )}
        </div>
      </div>

      {/* Overall Summary */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold tracking-tight mb-3">전체 요약</h2>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : error ? (
            <Alert className="border-destructive/40">
              <AlertTitle>요약을 불러오지 못했어요</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : overallSummary ? (
            <article className="prose prose-neutral max-w-none whitespace-pre-wrap leading-relaxed text-foreground/90">
              {overallSummary.content}
            </article>
          ) : (
            <Alert>
              <AlertTitle>선택한 길이의 전체 요약이 아직 없어요</AlertTitle>
              <AlertDescription>
                다른 길이를 선택해 보거나 잠시 후 다시 확인해 주세요. 빠르게 살펴보려면 아래 섹션/슬라이드 요약을 확인하거나 채팅에서 질문할 수 있어요.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      {/* Section / Slide Summaries */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">섹션/슬라이드 요약</h2>
          {docId && (
            <div className="flex items-center gap-2">
              <Link
                href={`/documents/${docId}/chat`}
                className="text-sm text-primary hover:underline"
              >
                관련해서 질문하기 →
              </Link>
              <Link
                href={`/documents/${docId}/quiz`}
                className="text-sm text-primary hover:underline"
              >
                퀴즈로 복습하기 →
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-4/6 mb-2" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ))
          ) : sectionSummaries.length > 0 ? (
            sectionSummaries.map((s) => {
              const header = s.section_label
                ? s.section_label
                : s.page_from || s.page_to
                ? `페이지 ${s.page_from ?? "?"}${s.page_to ? `–${s.page_to}` : ""}`
                : "요약";
              return (
                <div
                  key={s.id}
                  className="group rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="font-medium text-foreground truncate">{header}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-6 group-hover:line-clamp-none transition-[line-clamp]">
                    {s.content}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="col-span-full">
              <Alert>
                <AlertTitle>섹션/슬라이드 요약이 아직 없어요</AlertTitle>
                <AlertDescription>
                  문서 파싱이 완료되면 섹션 또는 페이지 범위별 요약이 표시돼요. 전체 요약 또는 채팅 기능을 먼저 활용해 보세요.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </section>

      {/* Bottom actions */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        {docId && (
          <Link
            href={`/documents/${docId}/chat`}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-95 transition-opacity"
          >
            이 요약으로 질문하기
          </Link>
        )}
        {docId && (
          <Link
            href={`/documents/${docId}/quiz`}
            className="inline-flex items-center px-4 py-2 rounded-md border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            요약 기반 퀴즈 풀기
          </Link>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className={cn(
            "inline-flex items-center px-4 py-2 rounded-md border",
            "border-border bg-card text-foreground hover:bg-muted transition-colors",
            (loading || refreshing) && "opacity-60 cursor-not-allowed"
          )}
        >
          새로고침
        </button>
      </div>
    </div>
  );
}
