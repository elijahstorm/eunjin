"use client"

/**
 * CODE INSIGHT
 * This code's use case is the onboarding welcome page shown immediately after signup.
 * It explains the key first steps (consent → upload → learn) and offers navigation:
 * primary call-to-action to proceed to consent, and a secondary option to skip to dashboard.
 */

import Link from "next/link"
import { cn } from "@/utils/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export default function Page() {
  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-10 md:py-16">
      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-64 w-[90%] max-w-5xl rounded-3xl bg-primary/5 blur-2xl" />

      <section aria-labelledby="welcome-title" className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
          <span className="font-medium">poiima</span>
          <span className="opacity-70">친근한 AI 튜터</span>
        </div>

        <h1 id="welcome-title" className="text-3xl font-bold tracking-tight md:text-4xl">
          환영해요! 바로 시작해볼까요?
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          poiima는 학습자료를 이해하고 요약·퀴즈·대화형 QA를 제공하는 한국어 전용 AI 튜터예요. 아래 3단계만 거치면 바로 학습을 시작할 수 있어요.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StepCard
            step={1}
            title="동의"
            description="개인정보와 처리 목적에 동의해 주세요. 동의는 언제든 철회할 수 있어요."
            bullets={["투명한 데이터 처리", "필수 항목만 최소 수집"]}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary" aria-hidden>
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <StepCard
            step={2}
            title="업로드"
            description="PDF/DOCX/PPTX/TXT/이미지(JPG, PNG)를 업로드하면 poiima가 자동으로 분석해요."
            bullets={["문서 파싱·OCR", "임베딩 저장 및 색인"]}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary" aria-hidden>
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
          <StepCard
            step={3}
            title="학습"
            description="요약을 읽고 퀴즈를 풀며, 문서 기반 대화형 QA로 모르는 점을 바로 물어보세요."
            bullets={["요약·퀴즈·QA", "SRS(반복학습) 스케줄링"]}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary" aria-hidden>
                <path d="M4 19V5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M9 13h6M9 17h6M9 9h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        <Alert className="border border-border bg-muted/30">
          <AlertTitle className="flex items-center gap-2 text-sm font-semibold">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary" aria-hidden>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            업로드 안내
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm text-muted-foreground">
            지원 형식: PDF, DOCX, PPTX, TXT, JPG, PNG · 파일 용량은 최대 20MB까지 가능합니다.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
          <Link
            href="/onboarding/consent"
            className={cn(
              "inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
            )}
          >
            동의하고 시작하기
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "inline-flex w-full items-center justify-center rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-auto"
            )}
          >
            건너뛰고 대시보드로 이동
          </Link>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard
            title="왜 동의가 필요한가요?"
            body="poiima는 업로드한 자료를 안전하게 처리하고, 요약·퀴즈·QA 기능을 제공하기 위해 최소한의 정보만 사용합니다. 동의는 언제든지 철회할 수 있어요."
            cta={{ label: "자세히 보기", href: "/privacy" }}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary" aria-hidden>
                <path d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 11v4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
          <InfoCard
            title="무엇부터 하면 좋을까요?"
            body="가벼운 문서 하나를 업로드하고 자동 요약을 확인해 보세요. 이어서 퀴즈를 풀거나, 문서 기반 QA로 바로 질문해 볼 수 있어요."
            cta={{ label: "업로드로 이동", href: "/upload" }}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary" aria-hidden>
                <path d="M8 17l4-4 4 4M12 13V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 21H4a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      </section>
    </main>
  )
}

function StepCard({
  step,
  title,
  description,
  bullets,
  icon,
}: {
  step: number
  title: string
  description: string
  bullets?: string[]
  icon?: React.ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {step}
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-primary" />
              <span className="text-foreground/90">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InfoCard({
  title,
  body,
  cta,
  icon,
}: {
  title: string
  body: string
  cta?: { label: string; href: string }
  icon?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{body}</p>
      {cta && (
        <div>
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {cta.label}
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
              <path d="M7 17L17 7M17 7H9m8 0v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
