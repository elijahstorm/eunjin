"use client";

/**
 * CODE INSIGHT
 * This code's use case is the global error boundary UI for the app router. It catches unexpected runtime/rendering errors
 * on public routes, shows a friendly message, provides actions to retry rendering or navigate home, and exposes
 * optional technical details for debugging. It also surfaces quick links to key areas to keep users productive.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Log the error for observability tools if any are attached.
    // eslint-disable-next-line no-console
    console.error("App Error Boundary:", error);
  }, [error]);

  const detailText = useMemo(() => {
    const now = new Date().toISOString();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const lang = typeof navigator !== "undefined" ? navigator.language : "";
    const digest = error?.digest ?? "(none)";
    const msg = error?.message ?? "(no message)";
    const stk = error?.stack ?? "(no stack)";
    return [
      `Time: ${now}`,
      `Digest: ${digest}`,
      `Message: ${msg}`,
      `UserAgent: ${ua}`,
      `Language: ${lang}`,
      "\nStack:",
      stk,
    ].join("\n");
  }, [error]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(detailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to copy error details", e);
    }
  };

  return (
    <main className="w-full px-4 md:px-8 lg:px-12 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <span className="text-2xl" aria-hidden>
                  ⚠️
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight">문제가 발생했어요</h1>
                <p className="mt-1 text-muted-foreground">
                  일시적인 오류가 발생했습니다. 아래 버튼으로 다시 시도하거나 홈으로 돌아갈 수 있어요.
                </p>
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>오류 안내</AlertTitle>
                  <AlertDescription>
                    {error?.message ? error.message : "예기치 못한 오류가 발생했습니다."}
                    {error?.digest ? (
                      <span className="ml-2 inline-flex items-center rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        코드: {error.digest}
                      </span>
                    ) : null}
                  </AlertDescription>
                </Alert>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    다시 시도
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    홈으로 이동
                  </Link>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {copied ? "복사됨" : "오류 세부정보 복사"}
                  </button>
                </div>

                <Collapsible className="mt-6">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="group inline-flex items-center gap-2 rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:border-muted hover:bg-muted/30"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
                        aria-hidden
                      >
                        <path fillRule="evenodd" d="M12 14.5a.75.75 0 0 1-.53-.22l-5-5a.75.75 0 1 1 1.06-1.06L12 12.69l4.47-4.47a.75.75 0 0 1 1.06 1.06l-5 5a.75.75 0 0 1-.53.22z" clipRule="evenodd" />
                      </svg>
                      기술 세부정보 보기
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                      {detailText}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>

                <Separator className="my-8" />

                <section aria-labelledby="quick-links-heading">
                  <h2 id="quick-links-heading" className="text-sm font-medium text-muted-foreground">
                    빠른 이동
                  </h2>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Link href="/dashboard" className="group rounded-lg border border-input bg-background p-4 hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">대시보드</div>
                          <div className="text-xs text-muted-foreground">진행 중인 세션과 최근 활동</div>
                        </div>
                        <span className="text-xl">📊</span>
                      </div>
                    </Link>
                    <Link href="/sessions/new" className="group rounded-lg border border-input bg-background p-4 hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">새 세션 시작</div>
                          <div className="text-xs text-muted-foreground">실시간 녹음·전사 세션 만들기</div>
                        </div>
                        <span className="text-xl">🎙️</span>
                      </div>
                    </Link>
                    <Link href="/sessions" className="group rounded-lg border border-input bg-background p-4 hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">세션 목록</div>
                          <div className="text-xs text-muted-foreground">지난 회의/강의 기록 보기</div>
                        </div>
                        <span className="text-xl">🗂️</span>
                      </div>
                    </Link>
                    <Link href="/integrations/zoom" className="group rounded-lg border border-input bg-background p-4 hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Zoom 연동</div>
                          <div className="text-xs text-muted-foreground">녹음 가져오기 설정</div>
                        </div>
                        <span className="text-xl">🔗</span>
                      </div>
                    </Link>
                    <Link href="/integrations/teams" className="group rounded-lg border border-input bg-background p-4 hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Teams 연동</div>
                          <div className="text-xs text-muted-foreground">Microsoft Teams 녹음 연동</div>
                        </div>
                        <span className="text-xl">🟦</span>
                      </div>
                    </Link>
                    <Link href="/help" className="group rounded-lg border border-input bg-background p-4 hover:bg-accent">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">도움말</div>
                          <div className="text-xs text-muted-foreground">문제 해결 가이드</div>
                        </div>
                        <span className="text-xl">❓</span>
                      </div>
                    </Link>
                  </div>
                </section>

                <Separator className="my-8" />

                <section aria-labelledby="more-links-heading">
                  <h2 id="more-links-heading" className="text-sm font-medium text-muted-foreground">
                    추가 링크
                  </h2>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Link href="/onboarding" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      온보딩 가이드
                    </Link>
                    <Link href="/auth/sign-in" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      다시 로그인
                    </Link>
                    <Link href="/settings/profile" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      프로필 설정
                    </Link>
                    <Link href="/settings/notifications" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      알림 설정
                    </Link>
                    <Link href="/settings/devices" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      녹음 장치 설정
                    </Link>
                    <Link href="/offline" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      오프라인 페이지
                    </Link>
                    <Link href="/legal/privacy" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      개인정보 처리방침
                    </Link>
                    <Link href="/legal/terms" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      서비스 이용약관
                    </Link>
                    <Link href="/org" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      조직 대시보드
                    </Link>
                    <Link href="/admin/metrics" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      관리자: 지표
                    </Link>
                    <Link href="/admin/jobs" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      관리자: 작업 상태
                    </Link>
                    <Link href="/admin/costs" className="rounded-lg border border-input bg-background p-3 text-sm hover:bg-accent">
                      관리자: 비용 현황
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
