"use client"

/**
 * CODE INSIGHT
 * This code's use case is the public About page for poiima. It explains the mission and core features,
 * and provides clear calls-to-action to sign up or log in. It should remain a client component to support
 * interactive UI elements (carousel/collapsible) and be responsive with a modern, friendly look.
 */

import Link from "next/link"
import { cn } from "@/utils/utils"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"

export default function Page() {
  return (
    <main aria-label="About poiima" className="relative">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              poiima — AI 스마트 튜터
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              더 빨리 이해하고, 오래 기억하는 학습
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              문서를 올리면 poiima가 요약·퀴즈·대화형 QA까지 한 번에. SRS 복습 스케줄로 기억을 단단하게 만들어 드려요.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground",
                  "shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                )}
              >
                지금 무료로 시작하기
              </Link>
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium",
                  "text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                이미 계정이 있어요
              </Link>
            </div>

            <Alert className="mt-6 text-left">
              <AlertTitle>중요 안내</AlertTitle>
              <AlertDescription className="mt-1 text-sm text-muted-foreground">
                개인 계정 전용 서비스입니다. 파일은 최대 20MB까지 업로드 가능하며, PDF/DOCX/PPTX/TXT/JPG/PNG를 지원합니다.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Mission */}
        <section className="py-8 sm:py-10">
          <div className="grid items-start gap-8 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <h2 className="text-2xl font-semibold">poiima의 미션</h2>
              <p className="mt-3 text-muted-foreground">
                누구나 가진 학습 자료를 가장 효율적으로 소화할 수 있도록 돕는 것. poiima는 업로드한 문서를 이해하고 요약과
                핵심 기반 퀴즈, 문서 기반 대화형 QA를 제공해 학습 시간을 절약하고 기억을 오래 유지하도록 설계되었습니다.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/90">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                  친근한 한국어 튜터 경험으로 학습 부담을 줄여요.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                  SRS(SM-2) 기반 복습 일정으로 자동 반복 학습을 제공합니다.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                  사용자별 데이터 분리와 삭제/내보내기 옵션으로 프라이버시를 지켜요.
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <Carousel opts={{ align: "start", loop: true }}>
                  <CarouselContent>
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <FeatureSlide
                        title="업로드 & OCR"
                        description="PDF/DOCX/PPTX/TXT/이미지를 업로드하면 자동으로 파싱하고 OCR로 텍스트를 추출합니다."
                        icon={<IconUpload className="h-5 w-5" />}
                      />
                    </CarouselItem>
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <FeatureSlide
                        title="요약 생성"
                        description="짧은 개요부터 핵심 포인트까지, 원하는 길이로 문서 요약을 바로 받아보세요."
                        icon={<IconSparkle className="h-5 w-5" />}
                      />
                    </CarouselItem>
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <FeatureSlide
                        title="퀴즈 & 해설"
                        description="객관식/주관식/단답형/플래시카드 중 선택하고, 정답과 친절한 해설로 바로 복습하세요."
                        icon={<IconQuiz className="h-5 w-5" />}
                      />
                    </CarouselItem>
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <FeatureSlide
                        title="대화형 QA"
                        description="RAG로 관련 내용을 찾아 문서 컨텍스트 기반 질의응답을 제공합니다."
                        icon={<IconChat className="h-5 w-5" />}
                      />
                    </CarouselItem>
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <FeatureSlide
                        title="SRS 스케줄"
                        description="SM-2로 개인 맞춤 복습 일정을 자동 생성하고 리마인드를 제공해요."
                        icon={<IconCalendar className="h-5 w-5" />}
                      />
                    </CarouselItem>
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <FeatureSlide
                        title="오답 분석"
                        description="틀린 문제를 기반으로 약점을 파악해 집중 퀴즈 세트를 추천합니다."
                        icon={<IconTarget className="h-5 w-5" />}
                      />
                    </CarouselItem>
                  </CarouselContent>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <CarouselPrevious className="h-8 w-8" />
                    <CarouselNext className="h-8 w-8" />
                  </div>
                </Carousel>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-10" />

        {/* Core Features Grid */}
        <section className="py-4 sm:py-6">
          <h3 className="text-xl font-semibold">핵심 기능 한눈에 보기</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            업로드부터 복습까지 — 학습의 전 과정을 자연스럽게 이어드립니다.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="업로드 검사 & 진행 상태"
              description="형식·용량(20MB) 유효성 검사와 업로드 진행 표시, 취소 기능까지 지원합니다."
              icon={<IconShield className="h-5 w-5" />}
            />
            <FeatureCard
              title="임베딩 & 벡터 저장"
              description="문서를 분할·정제해 임베딩을 생성하고 Supabase pgvector에 안전하게 저장합니다."
              icon={<IconVector className="h-5 w-5" />}
            />
            <FeatureCard
              title="요약 옵션"
              description="간단/보통/상세 중 선택해 목적에 맞는 요약을 생성합니다."
              icon={<IconSummary className="h-5 w-5" />}
            />
            <FeatureCard
              title="퀴즈 난이도 설정"
              description="난이도를 직접 고르고 즉시 채점·피드백을 받아보세요."
              icon={<IconLevels className="h-5 w-5" />}
            />
            <FeatureCard
              title="진행 대시보드"
              description="완료 문서, 성공률, 예정 복습 등 학습 현황을 한곳에서 확인합니다."
              icon={<IconDashboard className="h-5 w-5" />}
            />
            <FeatureCard
              title="데이터 관리"
              description="사용자별 데이터 분리, 삭제·내보내기, 보관 정책을 명확하게 제공합니다."
              icon={<IconLock className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-10">
          <h3 className="text-xl font-semibold">자주 묻는 질문</h3>
          <div className="mt-4 space-y-3">
            <FaqItem question="어떤 파일을 지원하나요?">
              PDF, DOCX, PPTX, TXT, JPG/PNG를 지원합니다. 스캔 이미지는 OCR을 통해 텍스트를 추출합니다.
            </FaqItem>
            <FaqItem question="개인정보는 안전한가요?">
              Supabase Auth로 인증되며 사용자별 데이터 분리를 적용합니다. 파일은 전용 스토리지에 저장되고 삭제/내보내기가 가능합니다.
            </FaqItem>
            <FaqItem question="무료인가요?">
              기본 기능은 무료로 시작할 수 있으며, 사용량이 많은 경우 요금제 업그레이드가 필요할 수 있습니다.
            </FaqItem>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-12 sm:pb-16">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="max-w-2xl">
              <h4 className="text-2xl font-semibold">지금 바로 poiima로 학습을 가볍게</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                회원가입 후 문서를 업로드하면 자동 요약과 퀴즈, 대화형 QA를 바로 이용할 수 있어요.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground",
                    "shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  )}
                >
                  무료 가입하고 시작하기
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium",
                    "text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  로그인
                </Link>
              </div>
            </div>
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 hidden h-48 w-48 rounded-full bg-primary/20 blur-2xl sm:block" />
          </div>

          <div className="mt-6 text-center text-sm">
            <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
              돌아가기
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold leading-6">{title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 transition group-hover:bg-primary/10" />
    </div>
  )
}

function FeatureSlide({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <div className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium">
            <span>{question}</span>
            <span aria-hidden className="text-muted-foreground">＋</span>
          </button>
        </CollapsibleTrigger>
        <Separator className="mx-4" />
        <CollapsibleContent>
          <div className="px-4 py-3 text-sm text-muted-foreground">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Icons
function IconUpload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 16V4" strokeLinecap="round" />
      <path d="M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
    </svg>
  )
}
function IconSparkle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3l1.8 4.6L18 9.2l-4.2 1.6L12 15l-1.8-4.2L6 9.2l4.2-1.6L12 3z" />
      <path d="M19 16l.9 2.2L22 19l-2.1.8L19 22l-.9-2.2L16 19l2.1-.8L19 16z" />
    </svg>
  )
}
function IconQuiz(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 7h8M8 11h5M6 3h12a2 2 0 0 1 2 2v14l-4-3H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </svg>
  )
}
function IconChat(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M21 12a7 7 0 0 1-7 7H7l-4 4V12a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7z" />
    </svg>
  )
}
function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
function IconTarget(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
    </svg>
  )
}
function IconVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 7h4v4H3zM17 3h4v4h-4zM13 17h4v4h-4z" />
      <path d="M7 9l10-4M7 9l6 8M17 5l0 8" />
    </svg>
  )
}
function IconSummary(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 5h16M4 12h10M4 19h7" />
    </svg>
  )
}
function IconLevels(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 18h4v-6H4v6zm6 0h4V6h-4v12zm6 0h4v-9h-4v9z" />
    </svg>
  )
}
function IconDashboard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
    </svg>
  )
}
function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}
