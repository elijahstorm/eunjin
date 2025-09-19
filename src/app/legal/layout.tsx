"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a dedicated, neutral layout wrapper for all pages under /legal.
 * It renders a minimal header with back-to-home navigation, lightweight page navigation for legal/help/auth routes,
 * and a focused content container that isolates legal document typography from the rest of the app. A comprehensive
 * footer surfaces quick links to key areas across the site map for discoverability from legal pages.
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";

function ActiveLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        "rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 ") +
        (className ? ` ${className}` : "")
      }
    >
      {children}
    </Link>
  );
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#legal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        본문으로 건너뛰기
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <div className="flex flex-1 items-center gap-2">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="홈으로 돌아가기"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">LS</span>
              <span className="hidden sm:inline">LiveSummary</span>
            </Link>
            <Separator orientation="vertical" className="hidden h-6 sm:inline-flex" />
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
              홈으로
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            <ActiveLink href="/legal/privacy">개인정보처리방침</ActiveLink>
            <ActiveLink href="/legal/terms">이용약관</ActiveLink>
            <ActiveLink href="/help" className="hidden sm:inline-flex">도움말</ActiveLink>
            <ActiveLink href="/auth/sign-in" className="hidden sm:inline-flex">로그인</ActiveLink>
            <ActiveLink href="/auth/sign-up" className="hidden sm:inline-flex">회원가입</ActiveLink>
          </nav>
        </div>
      </header>

      <main id="legal-content" className="mx-auto w-full max-w-4xl px-4 py-8">
        <section
          className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm"
          aria-label="법적 고지 및 정책 문서"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">홈</Link>
              <span className="px-1.5">/</span>
              <span className="text-foreground">법적 고지</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                대시보드로 가기
              </Link>
            </div>
          </div>

          <article
            className="mx-auto max-w-3xl text-base leading-7 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a:hover]:opacity-90 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/20 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground"
          >
            {children}
          </article>
        </section>
      </main>

      <footer className="mt-8 border-t border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">제품</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/dashboard">대시보드</Link></li>
              <li><Link className="hover:text-foreground" href="/sessions">세션 목록</Link></li>
              <li><Link className="hover:text-foreground" href="/sessions/new">새 세션 시작</Link></li>
              <li><Link className="hover:text-foreground" href="/ingest">실시간 캡처</Link></li>
              <li><Link className="hover:text-foreground" href="/ingest/upload">녹음 업로드</Link></li>
              <li><Link className="hover:text-foreground" href="/imports">가져오기</Link></li>
              <li><Link className="hover:text-foreground" href="/consent">녹음 동의</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">조직/설정</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/me">내 정보</Link></li>
              <li><Link className="hover:text-foreground" href="/settings/profile">프로필</Link></li>
              <li><Link className="hover:text-foreground" href="/settings/notifications">알림</Link></li>
              <li><Link className="hover:text-foreground" href="/settings/devices">디바이스</Link></li>
              <li><Link className="hover:text-foreground" href="/org">조직</Link></li>
              <li><Link className="hover:text-foreground" href="/org/members">구성원</Link></li>
              <li><Link className="hover:text-foreground" href="/org/settings">조직 설정</Link></li>
              <li><Link className="hover:text-foreground" href="/org/retention">보존 정책</Link></li>
              <li><Link className="hover:text-foreground" href="/org/security">보안</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">통합</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/integrations">연동 개요</Link></li>
              <li><Link className="hover:text-foreground" href="/integrations/zoom">Zoom 연동</Link></li>
              <li><Link className="hover:text-foreground" href="/integrations/zoom/linked">Zoom 상태</Link></li>
              <li><Link className="hover:text-foreground" href="/integrations/teams">Teams 연동</Link></li>
              <li><Link className="hover:text-foreground" href="/integrations/teams/linked">Teams 상태</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">지원 및 정책</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/help">도움말</Link></li>
              <li><Link className="hover:text-foreground" href="/legal/privacy">개인정보처리방침</Link></li>
              <li><Link className="hover:text-foreground" href="/legal/terms">이용약관</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/sign-in">로그인</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/sign-up">회원가입</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/reset-password">비밀번호 재설정</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/verify-email">이메일 인증</Link></li>
              <li><Link className="hover:text-foreground" href="/admin">관리자</Link></li>
              <li><Link className="hover:text-foreground" href="/admin/metrics">지표</Link></li>
              <li><Link className="hover:text-foreground" href="/admin/jobs">작업</Link></li>
              <li><Link className="hover:text-foreground" href="/admin/costs">비용</Link></li>
            </ul>
          </div>
        </div>
        <Separator className="mx-auto max-w-7xl" />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} LiveSummary. 모든 권리 보유.</p>
          <div className="flex items-center gap-4">
            <Link className="hover:text-foreground" href="/legal/terms">약관</Link>
            <Link className="hover:text-foreground" href="/legal/privacy">개인정보</Link>
            <Link className="hover:text-foreground" href="/help">지원</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
