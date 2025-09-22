"use client";

/**
 * CODE INSIGHT
 * This code's use case is the public landing page for poiima, a Korean-first AI smart tutor.
 * It introduces the product with a hero, feature highlights, and primary CTAs to sign up or log in.
 * If a user is already authenticated (via Supabase Auth), it promotes a quick entry point to /dashboard.
 */

import React from "react";
import Link from "next/link";
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

export default function Page() {
  const supabase = React.useMemo(() => supabaseBrowser(), []);
  const [isAuthed, setIsAuthed] = React.useState<boolean>(false);
  const [authReady, setAuthReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setIsAuthed(Boolean(data.session));
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
    });
    unsub = () => data.subscription.unsubscribe();

    return () => {
      try {
        unsub?.();
      } catch (_) {
        // no-op
      }
    };
  }, [supabase]);

  return (
    <main className="relative isolate">
      {/* Backdrop gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-8 sm:pt-14 md:pt-20">
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            poiima — AI 스마트 튜터
          </span>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            학습자료를 업로드하면, 요약·퀴즈·대화형 QA까지
            <span className="block bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              한 곳에서 빠르게 학습하세요
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base text-foreground/80 sm:text-lg">
            PDF, DOCX, PPTX, TXT, 이미지(스캔)까지 지원. poiima가 자동으로 핵심 요약을 만들고,
            맞춤 퀴즈와 대화형 질의응답으로 학습을 도와드립니다. SRS 기반 복습 일정으로
            기억에 오래 남게 학습하세요.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  대시보드로 이동
                </Link>
                <Link
                  href="/upload"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  문서 업로드
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  무료로 시작하기
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  로그인
                </Link>
              </>
            )}
          </div>

          {/* Support & Limit Banner */}
          <div className="mt-6 w-full max-w-2xl">
            <Alert className="border-border bg-card/50">
              <AlertTitle className="text-sm font-semibold text-foreground">
                파일 업로드 안내
              </AlertTitle>
              <AlertDescription className="mt-1 text-sm text-foreground/80">
                최대 20MB · 지원 형식: PDF, DOCX, PPTX, TXT, JPG, PNG
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Visual Preview Card */}
        <div className="mt-10 grid gap-6 md:mt-14 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
              <div className="absolute -bottom-10 -left-6 h-36 w-36 rounded-full bg-chart-2/20 blur-2xl" />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-foreground/70">
                    <span className="rounded-md bg-muted px-2 py-1">PDF</span>
                    <span className="rounded-md bg-muted px-2 py-1">DOCX</span>
                    <span className="rounded-md bg-muted px-2 py-1">PPTX</span>
                    <span className="rounded-md bg-muted px-2 py-1">IMG</span>
                  </div>
                  <span className="text-xs text-foreground/60">자동 처리 · RAG 기반 QA</span>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 rounded-lg border border-dashed border-border/70 p-3 text-left">
                    <p className="text-sm font-medium text-foreground">요약</p>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/70">
                      업로드된 문서에서 핵심만 골라 짧고 정확한 요약을 생성해요.
                    </p>
                  </div>
                  <div className="col-span-3 rounded-lg border border-dashed border-border/70 p-3 text-left">
                    <p className="text-sm font-medium text-foreground">퀴즈 생성</p>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/70">
                      객관식/주관식/단답형/플래시카드 중 선택해 자동 문제를 만들고 즉시 채점합니다.
                    </p>
                  </div>
                  <div className="col-span-3 rounded-lg border border-dashed border-border/70 p-3 text-left">
                    <p className="text-sm font-medium text-foreground">대화형 QA</p>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/70">
                      문서 컨텍스트를 검색해 자연스러운 질의응답을 제공합니다.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    🔁 SRS 복습
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    🧠 맞춤 퀴즈
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Carousel of flow steps */}
          <div className="order-1 md:order-2">
            <h2 className="text-left text-2xl font-semibold text-foreground sm:text-3xl">
              5단계로 끝내는 학습 플로우
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              업로드부터 복습까지, 빠르고 간단하게.
            </p>
            <div className="mt-4">
              <Carousel
                className="w-full"
                opts={{ align: "start", loop: true }}
                orientation="horizontal"
              >
                <CarouselContent className="-ml-2">
                  {[
                    {
                      title: "업로드",
                      desc: "PDF/DOCX/PPTX/TXT/이미지 파일을 드래그 앤 드롭",
                      emoji: "⬆️",
                    },
                    {
                      title: "자동 요약",
                      desc: "핵심 요약과 포인트를 한눈에",
                      emoji: "📝",
                    },
                    {
                      title: "퀴즈 생성",
                      desc: "난이도 설정으로 다양한 유형의 문제",
                      emoji: "🧩",
                    },
                    {
                      title: "대화형 QA",
                      desc: "문서 기반 질의응답으로 이해도 향상",
                      emoji: "💬",
                    },
                    {
                      title: "SRS 복습",
                      desc: "SM-2 알고리즘으로 최적의 복습 일정",
                      emoji: "⏰",
                    },
                  ].map((item, idx) => (
                    <CarouselItem key={idx} className="pl-2 md:basis-1/2 lg:basis-1/3">
                      <div className="h-full rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-2xl">
                          <span>{item.emoji}</span>
                          <h3 className="text-lg font-semibold text-foreground">
                            {idx + 1}. {item.title}
                          </h3>
                        </div>
                        <p className="mt-2 text-sm text-foreground/70">{item.desc}</p>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="mt-3 flex items-center justify-end gap-2 pr-1">
                  <CarouselPrevious className="h-8 w-8 border-border bg-background text-foreground hover:bg-muted" />
                  <CarouselNext className="h-8 w-8 border-border bg-background text-foreground hover:bg-muted" />
                </div>
              </Carousel>
            </div>

            {/* Small stats */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {["최대 20MB", "6가지 형식 지원", "한국어 최적화"].map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3 text-center text-sm text-foreground/80"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:pb-14 md:pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "문서 업로드",
              desc: "파일 형식을 자동 감지하고 안전하게 저장합니다.",
              emoji: "📁",
            },
            {
              title: "요약 생성",
              desc: "짧은 개요부터 핵심 포인트까지 선택 가능.",
              emoji: "🧾",
            },
            {
              title: "퀴즈 파이프라인",
              desc: "객관식/주관식/단답형/플래시카드를 자동 제작.",
              emoji: "🎯",
            },
            {
              title: "대화형 QA (RAG)",
              desc: "문서 컨텍스트를 검색해 정확한 답변 제공.",
              emoji: "🔎",
            },
            {
              title: "SRS 스케줄러",
              desc: "SM-2 알고리즘으로 복습 간격을 최적화.",
              emoji: "📅",
            },
            {
              title: "개인화 설정",
              desc: "난이도, 요약 길이, 퀴즈 유형을 자유롭게.",
              emoji: "⚙️",
            },
          ].map((f, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
              <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/10 blur-xl transition-all group-hover:bg-primary/20" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                  {f.emoji}
                </div>
                <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              </div>
              <p className="mt-2 text-sm text-foreground/70">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Repeated CTA */}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-accent/10 to-chart-2/10 p-5 text-center sm:p-7">
          <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
            {isAuthed ? "바로 시작해볼까요?" : "지금 바로 poiima와 함께 학습을 시작하세요"}
          </h3>
          <p className="mt-2 text-sm text-foreground/70">
            {isAuthed
              ? "대시보드에서 요약·퀴즈·QA를 한 번에 경험해보세요."
              : "가입은 1분이면 충분해요. 파일을 올리면 자동으로 요약과 퀴즈가 준비됩니다."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  대시보드로 이동
                </Link>
                <Link
                  href="/documents"
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  내 문서 보기
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  무료로 시작하기
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium text-foreground/90 shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  로그인
                </Link>
              </>
            )}
          </div>
          {!isAuthed && (
            <p className="mt-3 text-xs text-foreground/60">
              가입 시 서비스 약관 및 개인정보처리방침에 동의하게 됩니다.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
