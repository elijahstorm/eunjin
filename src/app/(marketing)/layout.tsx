"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

/**
 * CODE INSIGHT
 * This code's use case is to provide a public marketing sub-layout for poiima.
 * It renders a clean, responsive header with navigation to /, /about, /privacy, /login, /signup
 * and a simple footer. It must not include any authenticated app sidebar or app header.
 */

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/", label: "홈", exact: true },
    { href: "/about", label: "소개" },
    { href: "/privacy", label: "개인정보" },
  ];

  const actionItems = [
    { href: "/login", label: "로그인", variant: "ghost" as const },
    { href: "/signup", label: "무료로 시작하기", variant: "primary" as const },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        본문으로 건너뛰기
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
                π
              </span>
              <span className="text-lg font-bold tracking-tight">poiima</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Separator orientation="vertical" className="h-5" />
              {actionItems.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "text-sm font-semibold rounded-md px-3 py-2 transition-colors",
                    action.variant === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-foreground/80 hover:text-foreground"
                  )}
                >
                  {action.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              <span className="sr-only">메뉴 열기</span>
              <span className="relative block h-4 w-5">
                <span
                  className={cn(
                    "absolute left-0 top-0 block h-0.5 w-5 bg-foreground transition-transform",
                    menuOpen && "translate-y-1.5 rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-1.5 block h-0.5 w-5 bg-foreground transition-opacity",
                    menuOpen && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-3 block h-0.5 w-5 bg-foreground transition-transform",
                    menuOpen && "-translate-y-1.5 -rotate-45"
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={cn(
            "md:hidden overflow-hidden border-t border-border transition-[max-height] duration-300",
            menuOpen ? "max-h-96" : "max-h-0"
          )}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-3">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Separator className="my-2" />
              {actionItems.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-sm font-semibold text-center",
                    action.variant === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="content" className="flex-1">
        {children}
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">π</span>
              <div>
                <div className="font-bold">poiima</div>
                <p className="text-sm text-foreground/70">AI 스마트 튜터 — 요약 · 퀴즈 · 대화형 학습</p>
              </div>
            </div>
            <nav className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
              <Link href="/" className="text-sm text-foreground/80 hover:text-foreground">홈</Link>
              <Link href="/about" className="text-sm text-foreground/80 hover:text-foreground">소개</Link>
              <Link href="/privacy" className="text-sm text-foreground/80 hover:text-foreground">개인정보</Link>
              <Link href="/login" className="text-sm text-foreground/80 hover:text-foreground">로그인</Link>
              <Link href="/signup" className="text-sm text-foreground/80 hover:text-foreground">무료로 시작하기</Link>
            </nav>
          </div>
          <Separator className="my-6" />
          <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-foreground/60">© {new Date().getFullYear()} poiima. 모든 권리 보유.</p>
            <p className="text-xs text-foreground/60">친근하고 효율적인 한국어 전용 PWA 학습 도우미</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
