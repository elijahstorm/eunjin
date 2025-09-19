"use client";

/**
 * CODE INSIGHT
 * This code's use case is the public landing page for a real-time transcription and highlight-based summarization service.
 * It showcases product value, links to key app areas, and adapts CTAs based on authentication state.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        setIsAuthed(Boolean(data.session));
      } catch (_) {
        if (!mounted) return;
        setIsAuthed(false);
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    }

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
    });

    init();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const primaryCtas = useMemo(() => {
    if (checking) return [] as { href: string; label: string }[];
    if (isAuthed) {
      return [
        { href: "/(app)/sessions/new", label: "새 세션 시작하기" },
        { href: "/(app)/dashboard", label: "대시보드" },
      ];
    }
    return [
      { href: "/(auth)/auth/sign-in", label: "지금 로그인" },
      { href: "/(auth)/auth/sign-up", label: "무료로 시작" },
    ];
  }, [isAuthed, checking]);

  return (
    <main className="min-h-[calc(100dvh-var(--header-footer,0px))] bg-gradient-to-b from-primary/10 via-background to-background">
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 1-7.07 2.93A9.96 9.96 0 0 1 12 2zm4.24 6.34-5.66 5.66-2.83-2.83-1.41 1.41 4.24 4.24 7.07-7.07-1.41-1.41z"/></svg>
                실시간 전사 · 하이라이트 요약
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                회의와 강의, 실시간으로 기록하고 핵심만 요약합니다
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
                브라우저에서 바로 녹음·전사하고, 화자 분리와 타임스탬프를 포함한 전체 스크립트와 하이라이트 기반 요약 문서를 자동 생성합니다. 팀과 수업의 기록을 더 빠르게, 더 정확하게.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {checking ? (
                  <span className="inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">로딩 중…</span>
                ) : (
                  primaryCtas.map((cta) => (
                    <Link
                      key={cta.href}
                      href={cta.href}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {cta.label}
                    </Link>
                  ))
                )}
                <Link
                  href="/(app)/sessions"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  세션 목록 보기
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">개인정보처리방침</Link>
                <span className="hidden sm:inline" aria-hidden>•</span>
                <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">이용약관</Link>
                <span className="hidden sm:inline" aria-hidden>•</span>
                <Link href="/help" className="underline underline-offset-4 hover:text-foreground">도움말</Link>
              </div>
            </div>

            <div className="relative lg:pl-8">
              <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 1 1-6.36 2.64A8.96 8.96 0 0 1 12 3zm-1 5h2v6h-2V8zm0 8h2v2h-2v-2z"/></svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">실시간 상태</h3>
                    <p className="text-sm text-muted-foreground">저지연 한국어 전사 · 화자 분리 · 하이라이트 동기화</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-3 text-sm">
                  <FeatureItem title="브라우저 녹음·스트리밍" desc="MediaRecorder 기반 청크 업로드 및 불안정 네트워크 대응" />
                  <FeatureItem title="화자 다이아리제이션" desc="화자 라벨과 타임라인 정렬 자동 처리" />
                  <FeatureItem title="하이라이트 버튼" desc="타임스탬프와 메모를 클릭 한 번으로 기록" />
                  <FeatureItem title="요약 자동 생성" desc="전체 전사와 중요 포인트 기반 압축 요약" />
                </div>
                <div className="mt-5 flex gap-2">
                  <Link href="/(app)/sessions/new" className="inline-flex w-full items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">새 세션</Link>
                  <Link href="/(app)/ingest/upload" className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">녹음 업로드</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-3 gap-6">
          <LandingCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16v2H4zm0 7h10v2H4zm0 7h16v2H4z"/></svg>
            }
            title="실시간 전사"
            desc="문장 구분과 구두점 복원으로 읽기 쉬운 라이브 스크립트 제공"
            links={[{ href: "/(app)/sessions/new", label: "바로 전사 시작" }, { href: "/(app)/sessions", label: "기록 보기" }]}
          />
          <LandingCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 2v9H2v2h9v9h2v-9h9v-2h-9V2z"/></svg>
            }
            title="하이라이트 수집"
            desc="버튼/메모로 바로 표시하고, 타임스탬프 포함 텍스트 업로드도 지원"
            links={[{ href: "/(app)/sessions/new", label: "세션에서 표시" }, { href: "/(app)/ingest/upload", label: "하이라이트 업로드" }]}
          />
          <LandingCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h18v2H3zm2 4h14v10H5z"/></svg>
            }
            title="요약/내보내기"
            desc="전체 전사본과 핵심 요약본을 PDF/TXT로 저장하고 링크로 공유"
            links={[{ href: "/(app)/dashboard", label: "대시보드 보기" }, { href: "/(app)/sessions", label: "세션 선택" }]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">작동 방식</h2>
              <p className="text-sm text-muted-foreground mt-1">시작부터 공유까지, 네 단계로 끝나는 워크플로우</p>
            </div>
            <div className="hidden md:flex gap-2">
              <Link href="/(app)/onboarding" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">온보딩</Link>
              <Link href="/(app)/imports" className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">파일 가져오기</Link>
            </div>
          </div>

          <div className="mt-6">
            <Carousel className="w-full">
              <CarouselContent>
                <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                  <StepCard
                    step="01"
                    title="세션 시작"
                    desc="브라우저에서 바로 녹음/전사를 시작합니다."
                    cta={{ href: "/(app)/sessions/new", label: "새 세션" }}
                  />
                </CarouselItem>
                <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                  <StepCard
                    step="02"
                    title="하이라이트 표시"
                    desc="중요 순간에 버튼을 눌러 타임스탬프를 저장하세요."
                    cta={{ href: "/(app)/sessions", label: "세션 열기" }}
                  />
                </CarouselItem>
                <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                  <StepCard
                    step="03"
                    title="자동 요약"
                    desc="전체 전사와 하이라이트를 기반으로 요약본이 생성됩니다."
                    cta={{ href: "/(app)/dashboard", label: "결과 확인" }}
                  />
                </CarouselItem>
                <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                  <StepCard
                    step="04"
                    title="내보내기/공유"
                    desc="PDF/TXT 다운로드와 공유용 링크를 제공합니다."
                    cta={{ href: "/(app)/sessions", label: "내보내기" }}
                  />
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-semibold">통합 및 가져오기</h3>
            <p className="mt-1 text-sm text-muted-foreground">Zoom/Teams 계정을 연동하거나, 기존 녹음 파일을 업로드하여 처리할 수 있습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/(app)/integrations/zoom" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Zoom 연동</Link>
              <Link href="/(app)/integrations/teams" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Teams 연동</Link>
              <Link href="/(app)/ingest/upload" className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">녹음 업로드</Link>
              <Link href="/(app)/imports" className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">외부 가져오기</Link>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-semibold">보안과 동의 관리</h3>
            <p className="mt-1 text-sm text-muted-foreground">조직 보안 정책과 데이터 보존 기간을 설정하고, 참여자 동의 기록을 관리합니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/(app)/consent/new" className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">동의 받기</Link>
              <Link href="/(app)/org/security" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">보안 설정</Link>
              <Link href="/(app)/org/retention" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">보존 정책</Link>
              <Link href="/(app)/org/settings" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">조직 설정</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl border border-border p-6 sm:p-8 bg-muted/40">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold">자주 묻는 질문</h3>
              <p className="mt-1 text-sm text-muted-foreground">더 많은 문서는 도움말 센터에서 확인하세요.</p>
              <div className="mt-3">
                <Link href="/help" className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/90">도움말 바로가기</Link>
              </div>
            </div>
            <div className="space-y-3">
              <FaqItem q="실시간 전사는 어떤 언어를 지원하나요?" a="초기에는 한국어에 최적화되어 있으며, 다국어 확장이 가능한 아키텍처로 설계되어 점진적으로 지원 언어를 늘려갑니다." />
              <FaqItem q="하이라이트 업로드는 어떻게 하나요?" a="세션 중 버튼으로 기록하거나, 세션 종료 후 업로드 페이지에서 타임스탬프 포함/미포함 텍스트를 업로드하면 자동으로 매핑합니다." />
              <FaqItem q="요약 결과는 어떻게 공유하나요?" a="세션 상세에서 요약과 전사본을 PDF/TXT로 내보내고, 공유 링크를 생성하여 구성원과 외부에 전달할 수 있습니다." />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Alert className="border-primary/40">
          <AlertTitle className="font-semibold">PWA 오프라인 지원</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            네트워크가 불안정해도 안전한 버퍼링과 재시도가 동작합니다. 오프라인 페이지: <Link href="/offline" className="underline underline-offset-4 hover:text-foreground">/offline</Link>
          </AlertDescription>
        </Alert>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        <div className="rounded-2xl border border-border bg-primary text-primary-foreground p-8 sm:p-12 text-center shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold">지금 바로 회의 기록과 요약을 자동화하세요</h2>
          <p className="mt-2 text-primary-foreground/90">로그인하면 대시보드에서 새 세션을 생성하거나 기존 파일을 가져올 수 있습니다.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isAuthed ? (
              <>
                <Link href="/(app)/sessions/new" className="inline-flex items-center rounded-md bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background/90">새 세션 시작</Link>
                <Link href="/(app)/dashboard" className="inline-flex items-center rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-medium hover:bg-primary-foreground/10">대시보드</Link>
              </>
            ) : (
              <>
                <Link href="/(auth)/auth/sign-in" className="inline-flex items-center rounded-md bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background/90">로그인</Link>
                <Link href="/(auth)/auth/sign-up" className="inline-flex items-center rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-medium hover:bg-primary-foreground/10">무료로 시작</Link>
              </>
            )}
            <Link href="/legal/privacy" className="inline-flex items-center rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-medium hover:bg-primary-foreground/10">개인정보처리방침</Link>
            <Link href="/legal/terms" className="inline-flex items-center rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-medium hover:bg-primary-foreground/10">이용약관</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.285 6.709 9 18l-5.285-5.291 1.414-1.418L9 15.172l9.871-9.88z"/></svg>
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function LandingCard({ icon, title, desc, links }: { icon: React.ReactNode; title: string; desc: string; links: { href: string; label: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-sm h-full">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StepCard({ step, title, desc, cta }: { step: string; title: string; desc: string; cta: { href: string; label: string } }) {
  return (
    <div className="h-full rounded-xl border border-border bg-background p-5 flex flex-col">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
        <span className="rounded-md bg-primary/10 px-2 py-0.5">STEP {step}</span>
      </div>
      <h4 className="mt-3 text-lg font-semibold text-foreground">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground flex-1">{desc}</p>
      <div className="mt-4">
        <Link href={cta.href} className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">{cta.label}</Link>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium">{q}</h4>
            {open && (
              <p className="mt-1 text-sm text-muted-foreground">{a}</p>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <button aria-label={open ? "닫기" : "열기"} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {open ? (
                  <path d="M19 13H5v-2h14v2z" />
                ) : (
                  <path d="M11 5h2v14h-2zM5 11h14v2H5z" />
                )}
              </svg>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent />
      </div>
    </Collapsible>
  );
}
