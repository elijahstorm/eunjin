"use client";

/**
 * CODE INSIGHT
 * This code's use case is the root-level loading fallback displayed while critical routes and assets load.
 * It provides a lightweight spinner and skeleton placeholders, plus quick navigation links to popular pages
 * to keep users oriented during transitions. No network calls or heavy logic are performed here.
 */

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  const quickLinks: { href: string; label: string }[] = [
    { href: "/", label: "홈" },
    { href: "/help", label: "도움말" },
    { href: "/auth/sign-in", label: "로그인" },
    { href: "/auth/sign-up", label: "회원가입" },
    { href: "/dashboard", label: "대시보드" },
    { href: "/sessions", label: "세션" },
    { href: "/sessions/new", label: "새 세션 시작" },
    { href: "/ingest", label: "녹음 가져오기" },
    { href: "/ingest/upload", label: "파일 업로드" },
    { href: "/imports", label: "가져오기 내역" },
    { href: "/integrations", label: "연동" },
    { href: "/integrations/zoom", label: "Zoom 연동" },
    { href: "/integrations/teams", label: "Teams 연동" },
    { href: "/consent", label: "녹음 동의" },
    { href: "/consent/new", label: "동의 제출" },
    { href: "/org", label: "조직" },
    { href: "/org/members", label: "조직 구성원" },
    { href: "/org/settings", label: "조직 설정" },
    { href: "/org/retention", label: "보존 정책" },
    { href: "/org/security", label: "보안 설정" },
    { href: "/me", label: "내 정보" },
    { href: "/settings/profile", label: "프로필 설정" },
    { href: "/settings/notifications", label: "알림 설정" },
    { href: "/settings/devices", label: "디바이스" },
    { href: "/admin", label: "관리자" },
    { href: "/admin/metrics", label: "지표" },
    { href: "/admin/jobs", label: "작업" },
    { href: "/admin/costs", label: "비용" },
    { href: "/legal", label: "법률 정보" },
    { href: "/legal/privacy", label: "개인정보 처리방침" },
    { href: "/legal/terms", label: "이용약관" },
    { href: "/offline", label: "오프라인" },
  ];

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm"
        >
          <div className="relative">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none" />
          </div>
          <div className="text-sm text-muted-foreground">로딩 중입니다. 잠시만 기다려 주세요…</div>

          <div className="w-full space-y-3 pt-2">
            <Skeleton className="h-6 w-2/3 mx-auto" />
            <Skeleton className="h-4 w-11/12 mx-auto" />
            <Skeleton className="h-4 w-10/12 mx-auto" />
          </div>

          <Separator className="my-6" />

          <div className="w-full">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              빠른 이동
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3 opacity-80">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
