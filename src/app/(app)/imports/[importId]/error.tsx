"use client";

/**
 * CODE INSIGHT
 * This code's use case is the error boundary UI for an individual import page.
 * It provides a production-ready, user-friendly error screen with retry support
 * via Next.js error boundary reset(), and quick navigation links to related pages
 * like /imports and /ingest to help users recover.
 */

import React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

export default function Error(
  {
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }
) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    // Basic client-side logging. In production, this may be wired to a logging service.
    // eslint-disable-next-line no-console
    console.error("Import page error:", { message: error?.message, stack: error?.stack, digest: error?.digest });
  }, [error]);

  const copyDetails = async () => {
    try {
      const details = [
        `Message: ${error?.message ?? "(none)"}`,
        error?.digest ? `Digest: ${error.digest}` : undefined,
        error?.stack ? `\nStack:\n${error.stack}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");

      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-start gap-4 p-6 md:p-8">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <span aria-hidden>⚠️</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">가져오기 중 문제가 발생했어요</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              일시적인 오류일 수 있어요. 아래에서 다시 시도하거나, 가져오기 목록 또는 수집 페이지로 이동해 작업을 계속할 수 있어요.
            </p>

            <Alert variant="destructive" className="mt-4">
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>
                {error?.message ? (
                  <span className="break-words">{error.message}</span>
                ) : (
                  <span>원인을 알 수 없는 오류가 발생했습니다.</span>
                )}
                {error?.digest ? (
                  <span className="mt-1 block text-xs text-muted-foreground">참고 코드: {error.digest}</span>
                ) : null}
              </AlertDescription>
            </Alert>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={reset}
                className={cn(
                  "inline-flex select-none items-center justify-center gap-2 rounded-md px-4 py-2",
                  "bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
              >
                다시 시도
              </button>
              <Link
                href="/imports"
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-input bg-background px-4 py-2 text-sm",
                  "hover:bg-accent hover:text-accent-foreground transition-colors"
                )}
              >
                가져오기 목록으로 이동
              </Link>
              <Link
                href="/ingest"
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-input bg-background px-4 py-2 text-sm",
                  "hover:bg-accent hover:text-accent-foreground transition-colors"
                )}
              >
                수집(업로드/연동)으로 이동
              </Link>
            </div>

            <Collapsible open={open} onOpenChange={setOpen} className="mt-6">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground",
                    "hover:text-foreground focus:outline-none"
                  )}
                >
                  <span className="inline-block h-5 w-5 rounded border border-border text-center leading-5">
                    {open ? "−" : "+"}
                  </span>
                  오류 세부정보 보기
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
{`${error?.message ?? "(no message)"}

${error?.digest ? `Digest: ${error.digest}\n\n` : ""}${error?.stack ?? "(no stack)"}`}
                  </pre>
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={copyDetails}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs",
                        "hover:bg-accent hover:text-accent-foreground transition-colors"
                      )}
                    >
                      {copied ? "복사됨" : "세부정보 복사"}
                    </button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QuickLink href="/ingest/upload" title="파일 업로드 다시 시도" subtitle="오디오/녹음 파일을 다시 업로드" />
              <QuickLink href="/dashboard" title="대시보드" subtitle="진행 중인 작업과 최근 활동" />
              <QuickLink href="/sessions" title="세션" subtitle="실시간/기록된 세션 보기" />
              <QuickLink href="/integrations" title="통합 관리" subtitle="Zoom/Teams 계정 연동" />
              <QuickLink href="/integrations/zoom" title="Zoom 연동" subtitle="회의 녹음 가져오기 설정" />
              <QuickLink href="/integrations/teams" title="Teams 연동" subtitle="회의 녹음 가져오기 설정" />
              <QuickLink href="/settings/profile" title="프로필 설정" subtitle="계정 및 알림 설정" />
              <QuickLink href="/help" title="도움말 센터" subtitle="문제 해결 가이드" />
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              계속 문제가 발생한다면 도움말 센터에서 안내를 확인하거나 관리자에게 문의하세요.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuickLink({ href, title, subtitle }: { href: string; title: string; subtitle?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-lg border border-border bg-background p-4 transition-colors",
        "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-muted-foreground group-hover:text-accent-foreground/80">{subtitle}</div>
          ) : null}
        </div>
        <span className="text-muted-foreground group-hover:text-accent-foreground">→</span>
      </div>
    </Link>
  );
}
