"use client";

/**
 * CODE INSIGHT
 * This code's use case is a global Not Found (404) page for unknown routes in the App Router.
 * It provides clear messaging, primary recovery actions, and rich cross-links to common destinations
 * like home, dashboard, sessions, integrations, and settings to help users quickly recover.
 */

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/utils/utils";

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const [pathInput, setPathInput] = React.useState("");

  const primaryLinks: { href: string; label: string; sub?: string; variant?: "primary" | "secondary" }[] = [
    { href: "/", label: "홈으로", sub: "서비스 메인으로 이동", variant: "primary" },
    { href: "/dashboard", label: "대시보드", sub: "요약과 최근 활동 보기" },
    { href: "/sessions", label: "세션 목록", sub: "회의/강의 세션 관리" },
    { href: "/sessions/new", label: "새 세션 시작", sub: "실시간 캡처 · 전사 시작" },
  ];

  const categories: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: "시작하기",
      links: [
        { href: "/onboarding", label: "온보딩" },
        { href: "/auth/sign-in", label: "로그인" },
        { href: "/auth/sign-up", label: "회원가입" },
        { href: "/auth/reset-password", label: "비밀번호 재설정" },
        { href: "/help", label: "도움말 센터" },
      ],
    },
    {
      title: "세션 & 전사",
      links: [
        { href: "/sessions", label: "세션 목록" },
        { href: "/sessions/new", label: "새 세션 시작" },
        { href: "/ingest", label: "가져오기" },
        { href: "/ingest/upload", label: "녹음 업로드" },
        { href: "/imports", label: "가져오기 내역" },
      ],
    },
    {
      title: "통합",
      links: [
        { href: "/integrations", label: "통합 홈" },
        { href: "/integrations/zoom", label: "Zoom 연동" },
        { href: "/integrations/zoom/linked", label: "Zoom 연결됨" },
        { href: "/integrations/teams", label: "Teams 연동" },
        { href: "/integrations/teams/linked", label: "Teams 연결됨" },
      ],
    },
    {
      title: "조직 & 보안",
      links: [
        { href: "/org", label: "조직 홈" },
        { href: "/org/members", label: "멤버 관리" },
        { href: "/org/settings", label: "조직 설정" },
        { href: "/org/retention", label: "보존 정책" },
        { href: "/org/security", label: "보안 설정" },
      ],
    },
    {
      title: "계정 & 설정",
      links: [
        { href: "/me", label: "내 계정" },
        { href: "/settings/profile", label: "프로필" },
        { href: "/settings/notifications", label: "알림" },
        { href: "/settings/devices", label: "장치" },
      ],
    },
    {
      title: "관리자",
      links: [
        { href: "/admin", label: "관리자 홈" },
        { href: "/admin/metrics", label: "지표" },
        { href: "/admin/jobs", label: "작업" },
        { href: "/admin/costs", label: "비용" },
      ],
    },
    {
      title: "법률 & 기타",
      links: [
        { href: "/legal", label: "법률 정보" },
        { href: "/legal/privacy", label: "개인정보 처리방침" },
        { href: "/legal/terms", label: "이용약관" },
        { href: "/offline", label: "오프라인 모드" },
      ],
    },
  ];

  const goto = (raw: string) => {
    if (!raw) return;
    const href = raw.startsWith("/") ? raw : `/${raw}`;
    router.push(href);
  };

  return (
    <main className="w-full">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTitle className="text-destructive">페이지를 찾을 수 없어요 (404)</AlertTitle>
            <AlertDescription>
              요청하신 주소가 존재하지 않거나 이동되었어요.
              {" "}
              {pathname ? (
                <span className="ml-1 text-destructive/80">시도한 경로: {pathname}</span>
              ) : null}
            </AlertDescription>
          </Alert>
        </div>

        <section aria-label="Primary actions" className="mb-10">
          <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">원하시는 위치로 바로 이동하세요</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  아래 주요 목적지 중 하나를 선택하거나, 경로를 직접 입력할 수 있어요.
                </p>
              </div>

              <div className="w-full sm:w-[420px]">
                <label htmlFor="quick-nav" className="sr-only">
                  경로로 이동
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="quick-nav"
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        goto(pathInput.trim());
                      }
                    }}
                    placeholder="예: /sessions 또는 /integrations"
                    className={cn(
                      "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
                      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "border-input"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => goto(pathInput.trim())}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                      "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    이동
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">슬래시(/)로 시작하는 전체 경로를 입력하세요.</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {primaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border p-4 transition-colors",
                    l.variant === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-medium")}>{l.label}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full",
                        l.variant === "primary"
                          ? "bg-primary-foreground/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      →
                    </span>
                  </div>
                  {l.sub ? (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        l.variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {l.sub}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <Separator className="my-8" />

        <section aria-label="Explore more destinations" className="mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">더 탐색하기</h2>
            <div className="text-xs text-muted-foreground">스와이프하거나 버튼으로 넘겨보세요</div>
          </div>

          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {categories.map((cat) => (
                  <CarouselItem key={cat.title} className="md:basis-1/2 lg:basis-1/3">
                    <div className="h-full rounded-xl border bg-card p-5 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-chart-2" />
                          <h3 className="text-sm font-medium">{cat.title}</h3>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {cat.links.map((lnk) => (
                          <li key={lnk.href}>
                            <Link
                              href={lnk.href}
                              className="group flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              <span className="truncate">{lnk.label}</span>
                              <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-3 bg-background/80 backdrop-blur" />
              <CarouselNext className="-right-3 bg-background/80 backdrop-blur" />
            </Carousel>
          </div>
        </section>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            계속 문제가 발생하면 {" "}
            <Link href="/help" className="underline underline-offset-4 hover:text-foreground">
              도움말 센터
            </Link>
            를 확인하세요.
          </p>
        </div>
      </div>
    </main>
  );
}
