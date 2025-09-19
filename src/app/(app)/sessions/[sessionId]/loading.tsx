"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a polished, production-ready loading skeleton
 * for the session detail routes. It includes a skeleton header, action toolbar,
 * tab navigation, and main content placeholders, while offering links to related
 * pages to keep navigation fluid during data fetching.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

export default function Loading() {
  const pathname = usePathname();

  const parts = pathname.split("/").filter(Boolean);
  const sessionsIndex = parts.indexOf("sessions");
  const base = sessionsIndex !== -1 && parts.length > sessionsIndex + 1
    ? `/${parts.slice(0, sessionsIndex + 2).join("/").replace("//",'')}`
    : "/sessions";

  const tabs = [
    { label: "라이브", href: `${base}/live` },
    { label: "전사", href: `${base}/transcript` },
    { label: "하이라이트", href: `${base}/highlights` },
    { label: "업로드 하이라이트", href: `${base}/upload-highlights` },
    { label: "요약", href: `${base}/summary` },
    { label: "내보내기", href: `${base}/exports` },
    { label: "설정", href: `${base}/settings` },
  ];

  const isActive = (href: string) => {
    // Treat exact match or pathname starting with href as active
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            세션 목록
          </Link>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Link
            href="/dashboard"
            className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            대시보드
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/integrations"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            연동관리
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <Link
            href="/org/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            조직 설정
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-56 md:w-80" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60" disabled>
              <Skeleton className="h-4 w-4 rounded" />
              <span>로딩 중…</span>
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground shadow-sm disabled:opacity-60" disabled>
              <Skeleton className="h-4 w-4 rounded" />
              메모
            </button>
            <Link
              href={`${base}/settings`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              설정
            </Link>
          </div>
        </div>

        <nav className="sticky top-0 z-10 -mx-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:mx-0">
          <div className="no-scrollbar relative overflow-x-auto px-4 md:px-0">
            <ul className="flex min-w-max gap-1 py-2">
              {tabs.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(t.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    aria-current={isActive(t.href) ? "page" : undefined}
                  >
                    <Skeleton className="h-4 w-4 rounded" />
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                <span className="text-sm font-medium text-muted-foreground">실시간 전사</span>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-6 w-12 rounded" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">타임라인</span>
              <Link
                href={`${base}/highlights`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                하이라이트 보기
              </Link>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="mt-1 h-4 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">하이라이트</span>
              <Link
                href={`${base}/upload-highlights`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                업로드
              </Link>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-44" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">요약</span>
              <Link href={`${base}/summary`} className="text-sm text-muted-foreground hover:text-foreground">
                열기
              </Link>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`${base}/exports`}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                내보내기
              </Link>
              <Link
                href={`/share/summary/temp`}
                className="inline-flex items-center justify-center rounded-md bg-secondary px-2 py-2 text-sm text-secondary-foreground hover:opacity-90"
              >
                공유 링크
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <span className="mb-3 block text-sm font-medium text-muted-foreground">빠른 이동</span>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <Link href="/ingest" className="text-muted-foreground hover:text-foreground">인제스트</Link>
              <Link href="/ingest/upload" className="text-muted-foreground hover:text-foreground">파일 업로드</Link>
              <Link href="/imports" className="text-muted-foreground hover:text-foreground">가져오기</Link>
              <Link href="/integrations/zoom" className="text-muted-foreground hover:text-foreground">Zoom 연동</Link>
              <Link href="/integrations/teams" className="text-muted-foreground hover:text-foreground">Teams 연동</Link>
              <Link href="/me" className="text-muted-foreground hover:text-foreground">내 계정</Link>
              <Link href="/settings/profile" className="text-muted-foreground hover:text-foreground">프로필 설정</Link>
              <Link href="/settings/devices" className="text-muted-foreground hover:text-foreground">장치</Link>
              <Link href="/help" className="text-muted-foreground hover:text-foreground">도움말</Link>
              <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">개인정보 처리방침</Link>
              <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">이용약관</Link>
            </div>
          </div>
        </aside>
      </section>

      <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>데이터를 불러오는 중입니다. 네트워크 상태에 따라 시간이 소요될 수 있습니다.</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/offline" className="hover:text-foreground">오프라인 모드</Link>
          <Separator orientation="vertical" className="h-4" />
          <Link href="/admin/metrics" className="hover:text-foreground">운영 지표</Link>
        </div>
      </div>
    </main>
  );
}
