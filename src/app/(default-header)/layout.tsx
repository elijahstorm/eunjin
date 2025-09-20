'use client'

/**
 * CODE INSIGHT
 * This code's use case is to provide the global Root Layout for the Next.js app. It defines global metadata,
 * PWA essentials (manifest/robots/sitemap), and renders a minimal public header/footer. It defers authenticated
 * shells and complex navigation to nested layouts under (app)/. This file must include <html> and <body>, and
 * import global styles via ./globals.css.
 */

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function DefaultHeaderLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold">
                <span className="inline-block h-2 w-2 rounded-sm bg-primary" aria-hidden />
                <span className="tracking-tight">Summarize Live</span>
              </Link>
              <nav className="hidden lg:flex items-center gap-1 text-sm">
                <NavLink href="/dashboard">대시보드</NavLink>
                <NavLink href="/sessions">세션</NavLink>
                <NavLink href="/ingest">인제스트</NavLink>
                <NavLink href="/imports">임포트</NavLink>
                <NavLink href="/integrations">연동</NavLink>
                <NavLink href="/help">도움말</NavLink>
                <NavLink href="/legal">정책</NavLink>
                <NavLink href="/offline">오프라인</NavLink>
              </nav>
              {/* Mobile menu button */}
              <button
                className="lg:hidden ml-2 p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <HeaderLink href="/integrations/zoom">Zoom</HeaderLink>
                <HeaderLink href="/integrations/teams">Teams</HeaderLink>
                <HeaderLink href="/org">조직</HeaderLink>
              </div>
              <Link
                href="/sessions/new"
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                새 세션 시작
              </Link>
              <Link
                href="/auth/sign-in"
                className="hidden sm:inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <Link href="/" className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-lg font-semibold">
                <span className="inline-block h-2 w-2 rounded-sm bg-primary" aria-hidden />
                <span className="tracking-tight">Summarize Live</span>
              </Link>
              <button
                className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="size-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-2 px-4 py-6 text-base bg-background">
              <NavLink href="/dashboard">대시보드</NavLink>
              <NavLink href="/sessions">세션</NavLink>
              <NavLink href="/ingest">인제스트</NavLink>
              <NavLink href="/imports">임포트</NavLink>
              <NavLink href="/integrations">연동</NavLink>
              <NavLink href="/help">도움말</NavLink>
              <NavLink href="/legal">정책</NavLink>
              <NavLink href="/offline">오프라인</NavLink>
              <HeaderLink href="/integrations/zoom">Zoom</HeaderLink>
              <HeaderLink href="/integrations/teams">Teams</HeaderLink>
              <HeaderLink href="/org">조직</HeaderLink>
              <Link
                href="/sessions/new"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-base font-medium text-primary-foreground shadow hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                새 세션 시작
              </Link>
              <Link
                href="/auth/sign-in"
                className="mt-2 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-base font-medium hover:bg-accent hover:text-accent-foreground"
              >
                로그인
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <Footer />
    </>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      {children}
    </Link>
  )
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      {children}
    </Link>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-sm">
          <div>
            <p className="mb-3 font-semibold">시작하기</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/sessions/new">새 세션</Link></li>
              <li><Link className="hover:text-foreground" href="/sessions">세션 목록</Link></li>
              <li><Link className="hover:text-foreground" href="/dashboard">대시보드</Link></li>
              <li><Link className="hover:text-foreground" href="/help">도움말</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold">인제스트</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/ingest">인제스트 홈</Link></li>
              <li><Link className="hover:text-foreground" href="/ingest/upload">녹음 업로드</Link></li>
              <li><Link className="hover:text-foreground" href="/imports">임포트</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold">통합</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/integrations">연동 개요</Link></li>
              <li><Link className="hover:text-foreground" href="/integrations/zoom">Zoom 연동</Link></li>
              <li><Link className="hover:text-foreground" href="/integrations/teams">Teams 연동</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold">조직</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/org">조직 홈</Link></li>
              <li><Link className="hover:text-foreground" href="/org/members">구성원</Link></li>
              <li><Link className="hover:text-foreground" href="/org/settings">설정</Link></li>
              <li><Link className="hover:text-foreground" href="/org/retention">보존정책</Link></li>
              <li><Link className="hover:text-foreground" href="/org/security">보안</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold">계정</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/auth/sign-in">로그인</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/sign-up">회원가입</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/reset-password">비밀번호 재설정</Link></li>
              <li><Link className="hover:text-foreground" href="/auth/verify-email">이메일 인증</Link></li>
              <li><Link className="hover:text-foreground" href="/me">내 정보</Link></li>
              <li><Link className="hover:text-foreground" href="/settings/profile">프로필 설정</Link></li>
              <li><Link className="hover:text-foreground" href="/settings/notifications">알림 설정</Link></li>
              <li><Link className="hover:text-foreground" href="/settings/devices">장치</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold">관리</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/admin">관리 콘솔</Link></li>
              <li><Link className="hover:text-foreground" href="/admin/metrics">지표</Link></li>
              <li><Link className="hover:text-foreground" href="/admin/jobs">작업</Link></li>
              <li><Link className="hover:text-foreground" href="/admin/costs">비용</Link></li>
              <li><Link className="hover:text-foreground" href="/legal">법적 고지</Link></li>
              <li><Link className="hover:text-foreground" href="/legal/privacy">개인정보 처리방침</Link></li>
              <li><Link className="hover:text-foreground" href="/legal/terms">서비스 이용약관</Link></li>
              <li><Link className="hover:text-foreground" href="/offline">오프라인 페이지</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Summarize Live. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Link className="hover:text-foreground" href="/sitemap.xml">Sitemap</Link>
            <span className="text-border">•</span>
            <Link className="hover:text-foreground" href="/robots.txt">Robots</Link>
            <span className="text-border">•</span>
            <Link className="hover:text-foreground" href="/help">지원</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
