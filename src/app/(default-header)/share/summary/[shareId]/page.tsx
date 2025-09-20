"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a public, read-only summary page resolved by a share token.
 * It fetches a shared summary payload from a public API endpoint and displays it with a modern UI.
 * The page provides copy-link functionality, quick navigation links (home, transcript), and report-abuse links.
 * It must not make direct database calls, and it should gracefully handle invalid or expired share links.
 */

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

type SharedSummary = {
  shareId: string;
  title: string | null;
  sessionId?: string | null;
  sessionTitle?: string | null;
  createdAt: string; // ISO date
  authorName?: string | null;
  language?: string | null;
  highlightsCount?: number | null;
  durationSec?: number | null;
  wordCount?: number | null;
  summaryText: string;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso ?? "";
  }
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, s > 0 ? `${s}s` : null].filter(Boolean);
  return parts.join(" ");
}

function computeReadingMinutes(wordCount?: number | null, text?: string) {
  const wc = wordCount ?? (text ? text.trim().split(/\s+/).length : 0);
  const minutes = Math.max(1, Math.round(wc / 200));
  return `${minutes} min read`;
}

export default function ShareSummaryPage() {
  const params = useParams();
  const search = useSearchParams();
  const shareIdRaw = (params?.shareId ?? "") as string | string[];
  const shareId = Array.isArray(shareIdRaw) ? shareIdRaw[0] : shareIdRaw;

  const [data, setData] = React.useState<SharedSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (!shareId || typeof shareId !== "string" || shareId.length < 6) {
          throw new Error("잘못된 공유 링크입니다.");
        }
        const url = `/api/share/summary/${encodeURIComponent(shareId)}` + (search?.toString() ? `?${search?.toString()}` : "");
        const resp = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!resp.ok) {
          throw new Error(resp.status === 404 ? "요청하신 공유 요약을 찾을 수 없습니다." : "요약을 불러오는 중 오류가 발생했습니다.");
        }
        const payload = (await resp.json()) as SharedSummary;
        if (!active) return;
        setData(payload);
      } catch (e: any) {
        if (!active || e?.name === "AbortError") return;
        setError(e?.message || "요약을 불러오지 못했습니다.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [shareId, search]);

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }, []);

  const onDownloadTxt = React.useCallback(() => {
    if (!data?.summaryText) return;
    const blob = new Blob([data.summaryText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safeTitle = (data.title || data.sessionTitle || "summary").replace(/[^a-zA-Z0-9-_]+/g, "-");
    a.download = `${safeTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  }, [data]);

  const transcriptHref = `/share/transcript/${encodeURIComponent(shareId)}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">홈</Link>
          <span className="text-border">/</span>
          <span>공유 요약</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
              copied ? "border-green-600 text-green-700 dark:text-green-400" : "border-input hover:bg-accent hover:text-accent-foreground"
            )}
            aria-label="링크 복사"
          >
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <Link
            href={transcriptHref}
            className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            전체 전사 보기
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-3/5" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[70%]" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="space-y-6">
          <Alert variant="destructive" className="border-destructive/60">
            <AlertTitle>링크를 불러올 수 없습니다</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Link href="/" className="underline underline-offset-4">홈으로 이동</Link>
                <Link href="/help" className="underline underline-offset-4">도움말</Link>
                <Link href="/auth/sign-in" className="underline underline-offset-4">로그인</Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">Public Share</div>
            <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
              {data?.title || data?.sessionTitle || "공유된 요약"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {data?.sessionTitle ? (
                <span className="truncate">세션: {data.sessionTitle}</span>
              ) : null}
              {data?.authorName ? (
                <span className="truncate">작성자: {data.authorName}</span>
              ) : null}
              {data?.createdAt ? (
                <span title={new Date(data.createdAt).toISOString()}>{formatDate(data.createdAt)}</span>
              ) : null}
              {typeof data?.durationSec === "number" && data.durationSec > 0 ? (
                <span>길이: {formatDuration(data.durationSec)}</span>
              ) : null}
              <span>{computeReadingMinutes(data?.wordCount, data?.summaryText)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">
                읽기 전용 요약문입니다. 원본 전사와 하이라이트는 아래 링크를 통해 확인하세요.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onDownloadTxt}
                  disabled={!data?.summaryText}
                  className={cn(
                    "inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
                    !data?.summaryText && "opacity-50"
                  )}
                >
                  TXT 다운로드
                </button>
              </div>
            </div>

            <div className="px-4 py-5">
              {data?.summaryText && data.summaryText.length > 1200 ? (
                <Collapsible open={expanded} onOpenChange={setExpanded}>
                  <div className="relative">
                    <article className={cn(
                      "prose prose-neutral max-w-none dark:prose-invert",
                      !expanded && "line-clamp-[unset] max-h-[38rem] overflow-hidden"
                    )}>
                      {data.summaryText.split(/\n\n+/).map((para, idx) => (
                        <p key={idx} className="whitespace-pre-wrap leading-7">{para}</p>
                      ))}
                    </article>
                    {!expanded && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
                    )}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <CollapsibleTrigger asChild>
                      <button className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
                        {expanded ? "간략히" : "더보기"}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </Collapsible>
              ) : (
                <article className="prose prose-neutral max-w-none dark:prose-invert">
                  {data?.summaryText?.split(/\n\n+/).map((para, idx) => (
                    <p key={idx} className="whitespace-pre-wrap leading-7">{para}</p>
                  ))}
                </article>
              )}
            </div>
          </div>

          <div>
            <Separator className="my-2" />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-sm text-muted-foreground">
                문제가 있나요? <Link href="/help" className="underline underline-offset-4">신고 / 도움말</Link> · <Link href="/legal/terms" className="underline underline-offset-4">이용약관</Link> · <Link href="/legal/privacy" className="underline underline-offset-4">개인정보처리방침</Link>
              </div>
              <div className="flex items-center gap-2">
                <Link href={transcriptHref} className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">전체 전사 열기</Link>
                <Link href="/auth/sign-in" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">내 라이브러리에 저장</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-sm font-medium">직접 요약을 만들고 싶으신가요?</div>
                <div className="text-sm text-muted-foreground">세션을 생성하고 실시간 전사 및 하이라이트를 사용해 보세요.</div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/sessions/new" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">새 세션 시작</Link>
                <Link href="/ingest/upload" className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">녹음 업로드</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
