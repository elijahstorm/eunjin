"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a session-level error boundary UI for pages under /sessions/[sessionId].
 * It shows a friendly error message, offers retry and recovery actions, and links to other tabs or /sessions.
 * It performs no data fetching and relies on Next.js error boundary props for reset and error details.
 */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const sessionId = (params?.["sessionId"] as string) || "";
  const [copying, setCopying] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // Log for observability; safe in client error boundary
    // eslint-disable-next-line no-console
    console.error("Session error boundary:", { sessionId, message: error?.message, digest: error?.digest, stack: error?.stack });
  }, [error, sessionId]);

  const details = React.useMemo(() => {
    return [
      `Session ID: ${sessionId || "(unknown)"}`,
      `Message: ${error?.message || "(no message)"}`,
      `Digest: ${error?.digest || "(none)"}`,
      `Stack:\n${error?.stack || "(no stack)"}`,
      `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "(unknown)"}`,
      `Online: ${typeof navigator !== "undefined" ? String(navigator.onLine) : "(unknown)"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
  }, [error?.message, error?.digest, error?.stack, sessionId]);

  const copyDetails = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy error details", e);
    } finally {
      setCopying(false);
    }
  };

  const QuickLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className="group rounded-lg border border-border bg-card p-4 text-sm font-medium text-card-foreground shadow-sm transition hover:shadow-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-4xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">문제가 발생했습니다</h1>
          <p className="mt-1 text-sm text-muted-foreground">세션을 불러오는 중 오류가 발생했습니다. 아래 조치로 복구를 시도하세요.</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${typeof navigator !== "undefined" && navigator.onLine ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"}`}>
            {typeof navigator !== "undefined" && navigator.onLine ? "온라인" : "오프라인"}
          </span>
        </div>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertTitle>세션 오류</AlertTitle>
        <AlertDescription>
          {error?.message ? (
            <span className="break-words">{error.message}</span>
          ) : (
            <span>알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.</span>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          새로고침
        </button>
        <Link
          href="/sessions"
          className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          세션 목록으로 이동
        </Link>
        <Link
          href="/help"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          도움말 보기
        </Link>
      </div>

      <Separator className="my-8" />

      {sessionId ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">빠른 이동</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <QuickLink href={`/sessions/${sessionId}`} label="세션 개요" />
            <QuickLink href={`/sessions/${sessionId}/live`} label="라이브 상태" />
            <QuickLink href={`/sessions/${sessionId}/transcript`} label="전사 보기" />
            <QuickLink href={`/sessions/${sessionId}/highlights`} label="하이라이트" />
            <QuickLink href={`/sessions/${sessionId}/upload-highlights`} label="하이라이트 업로드" />
            <QuickLink href={`/sessions/${sessionId}/summary`} label="요약 결과" />
            <QuickLink href={`/sessions/${sessionId}/exports`} label="내보내기" />
            <QuickLink href={`/sessions/${sessionId}/settings`} label="세션 설정" />
            <QuickLink href="/ingest/upload" label="녹음 업로드" />
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-lg font-medium">다른 위치로 이동</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <QuickLink href="/sessions" label="세션 목록" />
            <QuickLink href="/dashboard" label="대시보드" />
            <QuickLink href="/ingest" label="가져오기" />
            <QuickLink href="/ingest/upload" label="파일 업로드" />
            <QuickLink href="/integrations" label="통합 설정" />
            <QuickLink href="/offline" label="오프라인 모드" />
          </div>
        </section>
      )}

      <Separator className="my-8" />

      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">기술 세부정보</h3>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {open ? "숨기기" : "자세히"}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
            <div className="mb-3 grid grid-cols-1 gap-2 text-sm">
              <div className="text-muted-foreground">Digest</div>
              <div className="truncate font-mono text-xs">{error?.digest || "(none)"}</div>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-background p-3 text-xs leading-5 text-muted-foreground">
{details}
            </pre>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={copyDetails}
                disabled={copying}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                {copied ? "복사됨" : copying ? "복사 중..." : "세부정보 복사"}
              </button>
              <Link
                href="/help"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                문제 신고
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickLink href="/dashboard" label="대시보드로 이동" />
        <QuickLink href="/sessions" label="모든 세션 보기" />
      </div>
    </main>
  );
}
