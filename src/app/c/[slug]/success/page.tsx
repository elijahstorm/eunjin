"use client";

/**
 * CODE INSIGHT
 * This page displays a public confirmation screen after a consent form is submitted via a shareable link (/c/[slug]).
 * It thanks the respondent and offers next actions: return to the organizer's landing (/c/[slug]) or close the window.
 * The page is client-side only, uses Tailwind theme tokens, and links to key areas in the site for smooth navigation.
 */

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function ConsentSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params?.slug[0] : "";

  const [attemptedClose, setAttemptedClose] = React.useState(false);
  const [canGoBack, setCanGoBack] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setCanGoBack(window.history.length > 1);
    }
  }, []);

  const handleCloseWindow = () => {
    try {
      window.close();
      // If window did not close (likely direct tab), show guidance
      setTimeout(() => setAttemptedClose(true), 250);
    } catch {
      setAttemptedClose(true);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative z-10 p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M9 12.75l2.25 2.25L15.75 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">동의가 안전하게 제출되었습니다</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                참여해주셔서 감사합니다. 필요한 경우 언제든지 개인정보 처리방침과 이용약관을 확인하실 수 있습니다.
              </p>
            </div>
          </div>

          <Alert className="mt-6 border-green-600/30 bg-green-600/5">
            <AlertTitle className="font-semibold">제출 완료</AlertTitle>
            <AlertDescription>
              귀하의 동의는 주최자에게 전달되었으며, 관련 세션 기록·전사 처리에 반영됩니다.
            </AlertDescription>
          </Alert>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/c/${encodeURIComponent(slug)}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              주최자 페이지로 이동
            </Link>

            <button
              type="button"
              onClick={handleCloseWindow}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              창 닫기
            </button>

            {canGoBack && (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                이전 페이지로
              </button>
            )}
          </div>

          {attemptedClose && (
            <p className="mt-3 text-xs text-muted-foreground">
              브라우저 정책상 자동으로 창이 닫히지 않을 수 있습니다. 직접 탭을 닫거나 페이지 이동을 선택하세요.
            </p>
          )}

          <Separator className="my-8" />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-foreground/80">다음 단계</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  • 세션 진행 중 실시간 자막/하이라이트 확인은 주최자의 안내에 따라 진행됩니다. 관련 링크는 주최자 페이지에서 확인할 수 있습니다.
                </li>
                <li>
                  • 서비스와 데이터 처리에 대한 자세한 내용은 아래 문서를 참고하세요.
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
                  개인정보 처리방침
                </Link>
                <span className="text-muted-foreground">/</span>
                <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
                  이용약관
                </Link>
                <span className="text-muted-foreground">/</span>
                <Link href="/help" className="underline underline-offset-4 hover:text-foreground">
                  도움말 센터
                </Link>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold tracking-wide text-foreground/80">서비스 둘러보기</h2>
              <div className="mt-3 grid gap-2">
                <Link
                  href="/dashboard"
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition hover:bg-accent hover:text-accent-foreground"
                >
                  대시보드로 이동
                  <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/sessions"
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition hover:bg-accent hover:text-accent-foreground"
                >
                  내 세션 보기
                  <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/consent"
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition hover:bg-accent hover:text-accent-foreground"
                >
                  동의서 관리
                  <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition hover:bg-accent hover:text-accent-foreground"
                >
                  로그인하여 더 보기
                  <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            이 페이지는 주최자 <span className="font-medium text-foreground">{slug || "알 수 없음"}</span> 의 동의 요청을 바탕으로 표시되었습니다.
            문제가 있으면 <Link href={`/c/${encodeURIComponent(slug)}`} className="underline underline-offset-4 hover:text-foreground">주최자 페이지</Link>를 확인하세요.
          </div>
        </div>
      </section>
    </main>
  );
}
