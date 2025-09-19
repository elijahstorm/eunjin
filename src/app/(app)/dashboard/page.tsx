"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the main dashboard page for authenticated users.
 * It focuses on quick actions (start session, ingest recordings, connect integrations),
 * shows recent sessions and imports (empty-friendly without DB calls),
 * and provides helpful navigation across the app. No database reads are performed
 * because schema is not declared here; only Supabase Auth is used for greeting.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconMic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v2a7 7 0 0014 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

function IconUpload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5-5 5 5" />
      <path d="M12 15V5" />
    </svg>
  );
}

function IconPlug(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 3v6" />
      <path d="M18 3v6" />
      <path d="M6 8h12" />
      <path d="M7 16h10a4 4 0 004-4v-1H3v1a4 4 0 004 4z" />
    </svg>
  );
}

function IconSparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" transform="translate(7 3) scale(0.7)" />
      <path d="M12 3l1.5 3 3 1.5-3 1.5L12 12l-1.5-3L7.5 7.5 10.5 6 12 3z" />
    </svg>
  );
}

function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconZoom(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="2" y="6" width="12" height="10" rx="2" />
      <path d="M18 8l4-1v10l-4-1z" />
    </svg>
  );
}

function IconTeams(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="8.5" cy="8.5" r="2.5" />
      <rect x="3" y="12" width="11" height="7" rx="2" />
      <circle cx="17.5" cy="7.5" r="2.5" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(new Date());

  const [recentSessionIds, setRecentSessionIds] = useState<string[]>([]);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.name || data.user?.email || null;
      setUserName(name);
    });
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const storedLast = localStorage.getItem("lastSessionId");
      if (storedLast) setLastSessionId(storedLast);
      const storedRecent = localStorage.getItem("recentSessionIds");
      if (storedRecent) {
        const parsed = JSON.parse(storedRecent);
        if (Array.isArray(parsed)) setRecentSessionIds(parsed.slice(0, 6));
      }
    } catch {}
  }, []);

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "좋은 아침";
    if (hours < 18) return "좋은 오후";
    return "좋은 저녁";
  }, []);

  const formattedNow = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(now);
    } catch {
      return now.toLocaleString();
    }
  }, [now]);

  return (
    <main className="flex flex-col gap-6">
      {!online && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTitle>오프라인 상태</AlertTitle>
          <AlertDescription>인터넷 연결이 없어도 녹음은 가능합니다. 연결이 복구되면 자동으로 동기화됩니다.</AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{greeting}{userName ? `, ${userName}` : ""}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <IconClock className="h-4 w-4" />
              <span>{formattedNow}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/sessions/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary">
              <IconMic className="h-4 w-4" />
              새 세션 시작
            </Link>
            <Link href="/ingest" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-secondary-foreground hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-secondary">
              <IconUpload className="h-4 w-4" />
              녹음 가져오기
            </Link>
            <Link href="/integrations" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent">
              <IconPlug className="h-4 w-4" />
              통합 설정
            </Link>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-3">
          <a href="/sessions/new" className="group rounded-xl border border-border bg-muted/30 p-5 transition hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconMic className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">실시간 전사 시작</p>
                  <p className="text-sm text-muted-foreground">브라우저에서 마이크로 즉시 시작</p>
                </div>
              </div>
              <IconChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5" />
            </div>
          </a>
          <a href="/ingest/upload" className="group rounded-xl border border-border bg-muted/30 p-5 transition hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                  <IconUpload className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">파일 업로드</p>
                  <p className="text-sm text-muted-foreground">Zoom/Teams 녹음 파일 처리</p>
                </div>
              </div>
              <IconChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5" />
            </div>
          </a>
          <a href="/integrations" className="group rounded-xl border border-border bg-muted/30 p-5 transition hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                  <IconPlug className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">Zoom / Teams 연동</p>
                  <p className="text-sm text-muted-foreground">OAuth로 계정 연결</p>
                </div>
              </div>
              <IconChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5" />
            </div>
          </a>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">최근 세션</h2>
            <div className="flex items-center gap-3">
              <Link href="/sessions" className="text-sm text-primary hover:underline">전체 보기</Link>
              <Link href="/sessions/new" className="text-sm text-muted-foreground hover:underline">새 세션</Link>
            </div>
          </div>

          {recentSessionIds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">아직 최근 세션이 없습니다.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link href="/sessions/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-95">
                  <IconMic className="h-4 w-4" />
                  첫 세션 시작하기
                </Link>
                <Link href="/ingest" className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:opacity-95">
                  <IconUpload className="h-4 w-4" />
                  녹음 가져오기
                </Link>
                <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground hover:opacity-95">
                  <IconSparkles className="h-4 w-4" />
                  온보딩 보기
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentSessionIds.map((id) => (
                <a
                  key={id}
                  href={`/sessions/${encodeURIComponent(id)}`}
                  className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">세션 {id.slice(0, 8)}</p>
                      <p className="truncate text-sm text-muted-foreground">자세히 보기 및 요약</p>
                    </div>
                    <IconChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5" />
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>실시간/업로드</span>
                    <span>상세</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          <Collapsible defaultOpen>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">최근 공지</h3>
              <CollapsibleTrigger asChild>
                <button className="text-sm text-primary hover:underline">접기/펼치기</button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="rounded-md border border-border p-3">
                  실시간 자막 성능 개선 및 하이라이트 단축키 추가. <Link href="/help" className="text-primary hover:underline">자세히</Link>
                </li>
                <li className="rounded-md border border-border p-3">
                  Zoom/Teams 연결 안정성 개선. <Link href="/integrations" className="text-primary hover:underline">통합 설정</Link>
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">가져오기</h2>
              <Link href="/imports" className="text-sm text-primary hover:underline">내 가져오기</Link>
            </div>
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">최근 가져오기가 없습니다.</p>
              <Link href="/ingest/upload" className="mt-3 inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:opacity-95">
                <IconUpload className="h-4 w-4" /> 업로드 시작
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">통합 상태</h2>
            <div className="space-y-3">
              <a href="/integrations/zoom" className="flex items-center justify-between rounded-lg border border-border p-3 transition hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <IconZoom className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">Zoom</p>
                    <p className="text-xs text-muted-foreground">계정 연결 및 가져오기</p>
                  </div>
                </div>
                <IconChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href="/integrations/teams" className="flex items-center justify-between rounded-lg border border-border p-3 transition hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-chart-3/10 text-chart-3">
                    <IconTeams className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">Microsoft Teams</p>
                    <p className="text-xs text-muted-foreground">계정 연결 및 가져오기</p>
                  </div>
                </div>
                <IconChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              <Link href="/consent/new" className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                녹음 동의 생성
              </Link>
              <Link href="/org/members" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                조직 구성원
              </Link>
              <Link href="/settings/profile" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                내 프로필
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">빠른 시작 가이드</h2>
          <div className="flex items-center gap-3">
            {lastSessionId && (
              <Link href={`/sessions/${encodeURIComponent(lastSessionId)}`} className="text-sm text-primary hover:underline">
                마지막 세션 열기
              </Link>
            )}
            <Link href="/help" className="text-sm text-muted-foreground hover:underline">도움말</Link>
          </div>
        </div>

        <Carousel className="relative">
          <CarouselContent className="-ml-2">
            <CarouselItem className="pl-2 md:basis-1/2 lg:basis-1/3">
              <div className="h-full rounded-lg border border-border bg-muted/30 p-5">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <IconMic className="h-5 w-5" />
                  <span className="text-sm font-medium">실시간 전사</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">브라우저에서 마이크 캡처 후 실시간으로 자막을 확인하세요.</p>
                <Link href="/sessions/new" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  지금 시작하기 <IconChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CarouselItem>
            <CarouselItem className="pl-2 md:basis-1/2 lg:basis-1/3">
              <div className="h-full rounded-lg border border-border bg-muted/30 p-5">
                <div className="mb-3 flex items-center gap-2 text-chart-2">
                  <IconSparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">하이라이트</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">회의 중 중요한 순간을 표시하고, 요약에 반영하세요.</p>
                <Link href="/help" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  사용법 보기 <IconChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CarouselItem>
            <CarouselItem className="pl-2 md:basis-1/2 lg:basis-1/3">
              <div className="h-full rounded-lg border border-border bg-muted/30 p-5">
                <div className="mb-3 flex items-center gap-2 text-chart-3">
                  <IconSparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">요약 생성</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">전체 전사본과 하이라이트를 기반으로 간결한 요약을 생성합니다.</p>
                <Link href="/sessions" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  내 세션 보기 <IconChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CarouselItem>
            <CarouselItem className="pl-2 md:basis-1/2 lg:basis-1/3">
              <div className="h-full rounded-lg border border-border bg-muted/30 p-5">
                <div className="mb-3 flex items-center gap-2 text-destructive">
                  <IconClock className="h-5 w-5" />
                  <span className="text-sm font-medium">동의 & 보안</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">녹음 동의를 생성하고 공유하여 컴플라이언스를 준수하세요.</p>
                <Link href="/consent/new" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  동의 만들기 <IconChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </Carousel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/sessions" className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">세션 목록</p>
              <p className="text-sm text-muted-foreground">모든 회의/강의 세션을 확인하세요</p>
            </div>
            <IconChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link href="/imports" className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">가져오기 기록</p>
              <p className="text-sm text-muted-foreground">업로드 이력을 추적합니다</p>
            </div>
            <IconChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link href="/org/settings" className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">조직 설정</p>
              <p className="text-sm text-muted-foreground">보존기간·보안 정책을 관리</p>
            </div>
            <IconChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">관리 & 운영</h2>
          <Link href="/admin" className="text-sm text-primary hover:underline">관리 콘솔</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/metrics" className="rounded-lg border border-border p-4 hover:bg-muted/50">
            <p className="font-medium">지표</p>
            <p className="text-sm text-muted-foreground">ASR 지연/성공률 등</p>
          </Link>
          <Link href="/admin/jobs" className="rounded-lg border border-border p-4 hover:bg-muted/50">
            <p className="font-medium">백그라운드 작업</p>
            <p className="text-sm text-muted-foreground">전사/요약 배치 상태</p>
          </Link>
          <Link href="/admin/costs" className="rounded-lg border border-border p-4 hover:bg-muted/50">
            <p className="font-medium">비용 대시보드</p>
            <p className="text-sm text-muted-foreground">사용량과 비용 추적</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
