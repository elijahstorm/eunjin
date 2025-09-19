"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a polished not-found view for invalid or inaccessible session routes.
 * It provides contextual guidance and quick navigation to related areas like Sessions, Dashboard,
 * starting a new session, help, and integrations. It is a client component, styled with Tailwind
 * and uses existing UI primitives from the project. No data fetching occurs here.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-3xl p-6 sm:p-10">
      <div className="mb-6 flex items-center gap-3 text-muted-foreground">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-6 w-6 text-destructive"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 9v4m0 4h.01M3.055 11c.45-3.954 3.634-7 7.52-7h2.85c3.886 0 7.07 3.046 7.52 7 .3 2.63-1.02 5.2-3.315 6.68l-4.564 2.94a2 2 0 01-2.135 0l-4.564-2.94C4.075 16.2 2.755 13.63 3.055 11z" />
        </svg>
        <span className="text-sm">세션</span>
        <span className="text-sm">/</span>
        <span className="text-sm font-medium text-foreground">찾을 수 없음</span>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertTitle>세션을 찾을 수 없거나 접근 권한이 없어요</AlertTitle>
        <AlertDescription>
          요청하신 세션이 존재하지 않거나, 해당 세션에 접근할 권한이 없습니다. 아래 안내에 따라 이동하거나 조치를 시도해 주세요.
        </AlertDescription>
      </Alert>

      <section className="relative overflow-hidden rounded-xl border bg-card">
        <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" aria-hidden />

        <div className="relative p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9.75 9.75v.008h.008V9.75H9.75zm4.5 0v.008h.008V9.75h-.008zM8.25 15c1.5 1.25 6 1.25 7.5 0" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">해당 세션을 찾지 못했습니다</h1>
              <p className="mt-1 text-sm text-muted-foreground">세션 ID가 잘못되었거나 삭제되었을 수 있어요. 또는 조직 권한이 필요할 수 있습니다.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/sessions"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              세션 목록으로 이동
            </Link>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              다시 시도
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              대시보드로 이동
            </Link>

            <Link
              href="/sessions/new"
              className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              새 세션 시작하기
            </Link>
          </div>

          <Separator className="my-8" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h2 className="mb-2 text-sm font-medium text-foreground">탐색</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/ingest/upload" className="text-primary underline-offset-4 hover:underline">
                    녹음 업로드로 처리하기
                  </Link>
                </li>
                <li>
                  <Link href="/imports" className="text-primary underline-offset-4 hover:underline">
                    외부 녹음 가져오기
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-primary underline-offset-4 hover:underline">
                    도움말 센터
                  </Link>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="mb-2 text-sm font-medium text-foreground">통합 설정</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/integrations/zoom" className="text-primary underline-offset-4 hover:underline">
                    Zoom 연동 관리
                  </Link>
                </li>
                <li>
                  <Link href="/integrations/teams" className="text-primary underline-offset-4 hover:underline">
                    Microsoft Teams 연동 관리
                  </Link>
                </li>
                <li>
                  <Link href="/settings/profile" className="text-primary underline-offset-4 hover:underline">
                    내 프로필 설정
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <Collapsible>
              <CollapsibleTrigger className="w-full rounded-md border border-input bg-background px-4 py-2 text-left text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                가능한 원인 보기
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                  <li>세션이 삭제되었거나 소속 조직이 변경되었을 수 있어요.</li>
                  <li>해당 세션에 대한 접근 권한이 없을 수 있어요. 필요한 경우 조직 관리자에게 요청해 주세요. <Link href="/org/members" className="text-primary underline-offset-2 hover:underline">조직 멤버 보기</Link></li>
                  <li>로그인이 만료되었을 수 있어요. 다시 로그인해 주세요. <Link href="/auth/sign-in" className="text-primary underline-offset-2 hover:underline">로그인</Link></li>
                  <li>이메일 인증이 완료되지 않았을 수 있어요. <Link href="/auth/verify-email" className="text-primary underline-offset-2 hover:underline">이메일 인증하기</Link></li>
                  <li>녹음 동의가 필요한 워크스페이스일 수 있어요. <Link href="/consent" className="text-primary underline-offset-2 hover:underline">동의 현황 확인</Link></li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">세션을 찾을 수 없습니다. 다른 페이지로 이동하거나 다시 시도하세요.</p>
    </main>
  );
}
