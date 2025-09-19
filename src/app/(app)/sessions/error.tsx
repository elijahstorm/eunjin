"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a resilient, user-friendly error boundary UI for the Sessions section.
 * It surfaces the error context, offers quick recovery via reset, and provides navigation to frequently used pages
 * like /sessions and /dashboard, plus helpful related links within the application.
 */

import React from "react";
import Link from "next/link";
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
  const [expanded, setExpanded] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "error">("idle");
  const [isResetting, setIsResetting] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      // Minimal client-side logging for observability.
      // In production, this can be wired to a capture endpoint.
      // eslint-disable-next-line no-console
      console.error("Sessions Error Boundary:", error);
    }
  }, [error]);

  const onCopy = async () => {
    if (!error?.digest) return;
    try {
      await navigator.clipboard.writeText(error.digest);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  const onReset = () => {
    setIsResetting(true);
    // Let the UI show the intent; Next will re-render on reset.
    try {
      reset();
    } finally {
      // In case reset is synchronous/no-op in some environments
      setTimeout(() => setIsResetting(false), 1200);
    }
  };

  const message = error?.message || "예기치 못한 오류가 발생했습니다.";

  return (
    <main className="mx-auto w-full max-w-4xl p-6 md:p-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          {/* Exclamation icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11 7h2v7h-2V7zm0 8h2v2h-2v-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">세션 처리 중 오류가 발생했습니다</h1>
          <p className="text-sm text-muted-foreground">불편을 드려 죄송합니다. 아래 옵션으로 계속 진행하세요.</p>
        </div>
      </div>

      <Alert variant="destructive" className="border-destructive/50">
        <AlertTitle>오류 상세</AlertTitle>
        <AlertDescription className="mt-2 break-words">
          {message}
          {error?.digest ? (
            <span className="ml-2 inline-flex items-center rounded-md bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
              오류 ID: {error.digest}
            </span>
          ) : null}
        </AlertDescription>
      </Alert>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-live="polite"
        >
          {isResetting ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" aria-hidden />
              다시 시도 중...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 5V1L8 5l4 4V6c3.31 0 6 2.69 6 6a6 6 0 11-6-6z" />
              </svg>
              다시 시도
            </span>
          )}
        </button>

        <Link
          href="/sessions"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          세션으로 이동
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
          대시보드로 이동
        </Link>
      </div>

      {error?.digest ? (
        <div className="mt-6">
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus:outline-none"
                >
                  기술 정보 {expanded ? "숨기기" : "자세히 보기"}
                </button>
              </CollapsibleTrigger>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={!error.digest}
                >
                  {copyStatus === "copied" ? "복사됨" : copyStatus === "error" ? "복사 실패" : "오류 ID 복사"}
                </button>
                <Link
                  href="/help"
                  className="rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                >
                  도움말로 이동
                </Link>
              </div>
            </div>
            <CollapsibleContent className="mt-3 rounded-lg border border-input bg-muted/30 p-4 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">오류 ID</span>
                  <code className="rounded bg-muted px-2 py-0.5">{error.digest}</code>
                </div>
                {error?.stack ? (
                  <div className="mt-2">
                    <div className="mb-1 text-muted-foreground">스택 트레이스</div>
                    <pre className="max-h-64 overflow-auto rounded-md bg-card p-3 text-xs leading-5">
                      {error.stack}
                    </pre>
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : null}

      <Separator className="my-8" />

      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
          빠른 이동
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/sessions/new" title="새 세션 시작" desc="회의/강의 녹음 및 전사를 시작합니다." />
          <QuickLink href="/ingest/upload" title="녹음 업로드" desc="기존 녹음 파일을 업로드하여 처리합니다." />
          <QuickLink href="/integrations" title="통합 관리" desc="Zoom/Teams 연동 상태를 확인합니다." />
          <QuickLink href="/integrations/zoom" title="Zoom 연동" desc="Zoom 계정을 연결하고 녹음을 가져옵니다." />
          <QuickLink href="/integrations/teams" title="Teams 연동" desc="Microsoft Teams 계정을 연결합니다." />
          <QuickLink href="/onboarding" title="온보딩" desc="서비스 사용 방법을 알아봅니다." />
          <QuickLink href="/org" title="조직 대시보드" desc="조직 단위 설정과 현황을 확인합니다." />
          <QuickLink href="/settings/profile" title="프로필 설정" desc="계정 정보 및 알림 설정을 변경합니다." />
          <QuickLink href="/help" title="도움말 센터" desc="문제 해결 가이드와 FAQ를 확인하세요." />
        </div>
      </section>
    </main>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-input bg-card p-4 transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-medium text-foreground">{title}</h3>
        <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 4l1.41 1.41L8.83 10H20v2H8.83l4.58 4.59L12 18l-8-8 8-8z" transform="rotate(180 12 12)" />
          </svg>
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
