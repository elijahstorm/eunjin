"use client"

/**
 * CODE INSIGHT
 * This code's use case is the Organization Overview page. It presents the current organization's basic information, helpful quick stats (non-PII, safe defaults when data isn't available), and navigational links to key organization sub-pages: members, settings, retention, and security. It avoids direct database calls due to absent schema and relies on Supabase Auth for user context only. The page emphasizes actionable links across related app sections for smooth navigation.
 */

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { supabaseBrowser } from "@/utils/supabase/client-browser"
import { cn } from "@/utils/utils"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

function StatCard({
  title,
  value,
  description,
  href,
  accent = "",
}: {
  title: string
  value: string | React.ReactNode
  description?: string
  href?: string
  accent?: string
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    href ? (
      <Link
        href={href}
        className={cn(
          "block rounded-lg border bg-card text-card-foreground shadow-sm transition hover:shadow-md",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {children}
      </Link>
    ) : (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        {children}
      </div>
    )

  return (
    <Wrapper>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {accent ? <span className={cn("rounded-full px-2 py-0.5 text-xs", accent)} /> : null}
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {href ? (
          <div className="mt-4 text-sm font-medium text-primary">
            자세히 보기 →
          </div>
        ) : null}
      </div>
    </Wrapper>
  )
}

function ActionLink({ href, title, desc, badge }: {
  href: string
  title: string
  desc?: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start justify-between rounded-md border p-4",
        "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        {desc ? (
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        ) : null}
      </div>
      <span className="text-muted-foreground transition group-hover:translate-x-0.5">→</span>
    </Link>
  )
}

export default function OrgOverviewPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [orgName, setOrgName] = useState<string>("")

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data } = await supabaseBrowser.auth.getUser()
      if (!mounted) return
      const u = data.user ?? null
      setUser(u)

      const meta = (u?.user_metadata as any) || {}
      const appMeta = (u?.app_metadata as any) || {}
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("org:name") : null
      const inferred =
        meta.org_name ||
        meta.organization ||
        appMeta.org_name ||
        appMeta.organization ||
        stored ||
        "내 조직"
      setOrgName(inferred)
      setLoadingUser(false)
    }

    load()
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      const meta = (u?.user_metadata as any) || {}
      const appMeta = (u?.app_metadata as any) || {}
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("org:name") : null
      const inferred =
        meta.org_name ||
        meta.organization ||
        appMeta.org_name ||
        appMeta.organization ||
        stored ||
        "내 조직"
      setOrgName(inferred)
    })
    return () => {
      mounted = false
      sub?.subscription.unsubscribe()
    }
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 5) return "좋은 밤이에요"
    if (h < 12) return "좋은 아침이에요"
    if (h < 18) return "좋은 오후예요"
    return "좋은 저녁이에요"
  }, [])

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">조직 개요</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold leading-tight">
              {loadingUser ? <Skeleton className="h-7 w-48" /> : orgName}
            </h1>
            {!loadingUser && user?.email ? (
              <span className="text-xs text-muted-foreground">
                {greeting}, {user.email}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/org/settings"
            className={cn(
              "inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium",
              "hover:bg-accent hover:text-accent-foreground transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            조직 설정
          </Link>
          <Link
            href="/sessions/new"
            className={cn(
              "inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
              "hover:opacity-90 transition shadow",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            세션 시작하기
          </Link>
        </div>
      </div>

      <Alert className="bg-muted/40">
        <AlertTitle>보안과 보존 정책을 설정하세요</AlertTitle>
        <AlertDescription>
          조직의 데이터 수명과 접근 안전을 위한 기본 정책을 지금 구성하세요.
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/org/security"
              className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:opacity-90"
            >
              보안 설정 이동
            </Link>
            <Link
              href="/org/retention"
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              보존 정책 구성
            </Link>
          </div>
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="이달의 세션"
          value="—"
          description="실시간/업로드 포함 전체 세션 수"
          href="/sessions"
        />
        <StatCard
          title="조직 멤버"
          value="—"
          description="초대 및 역할 관리"
          href="/org/members"
        />
        <StatCard
          title="스토리지 사용량"
          value="—"
          description="녹음/문서 저장 현황"
          href="/org/retention"
        />
        <StatCard
          title="생성된 요약"
          value="—"
          description="하이라이트 기반 요약 수"
          href="/dashboard"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">빠른 시작</h2>
            <div className="text-xs text-muted-foreground">가이드를 넘겨보세요</div>
          </div>
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-lg border bg-card p-5 text-card-foreground">
                    <div className="text-sm font-semibold">실시간 세션 시작</div>
                    <p className="mt-1 text-sm text-muted-foreground">브라우저에서 바로 녹음하고 자막을 확인하세요.</p>
                    <Link
                      href="/sessions/new"
                      className="mt-4 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      세션 만들기
                    </Link>
                  </div>
                </CarouselItem>
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-lg border bg-card p-5 text-card-foreground">
                    <div className="text-sm font-semibold">녹음 파일 업로드</div>
                    <p className="mt-1 text-sm text-muted-foreground">Zoom/Teams 녹음 파일을 업로드해 전사와 요약을 생성합니다.</p>
                    <Link
                      href="/ingest/upload"
                      className="mt-4 inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      파일 업로드
                    </Link>
                  </div>
                </CarouselItem>
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-lg border bg-card p-5 text-card-foreground">
                    <div className="text-sm font-semibold">Zoom 연동</div>
                    <p className="mt-1 text-sm text-muted-foreground">OAuth로 계정을 연결하고 녹음을 자동으로 가져오세요.</p>
                    <Link
                      href="/integrations/zoom"
                      className="mt-4 inline-flex rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:opacity-90"
                    >
                      Zoom 연결
                    </Link>
                  </div>
                </CarouselItem>
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-lg border bg-card p-5 text-card-foreground">
                    <div className="text-sm font-semibold">Teams 연동</div>
                    <p className="mt-1 text-sm text-muted-foreground">Microsoft Teams 녹음을 손쉽게 가져와 처리합니다.</p>
                    <Link
                      href="/integrations/teams"
                      className="mt-4 inline-flex rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:opacity-90"
                    >
                      Teams 연결
                    </Link>
                  </div>
                </CarouselItem>
                <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-lg border bg-card p-5 text-card-foreground">
                    <div className="text-sm font-semibold">동의(Consent) 관리</div>
                    <p className="mt-1 text-sm text-muted-foreground">녹음/전사 동의를 수집하고 공유 링크를 생성합니다.</p>
                    <Link
                      href="/consent/new"
                      className="mt-4 inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      동의 양식 만들기
                    </Link>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold">빠른 작업</h2>
          <div className="space-y-2">
            <ActionLink href="/org/members" title="멤버 초대 및 역할 관리" desc="조직 구성원과 권한을 관리합니다." />
            <ActionLink href="/org/retention" title="보존 정책 구성" desc="오디오/문서 자동 삭제 및 보존 기간 설정." />
            <ActionLink href="/org/security" title="보안 정책 설정" desc="2단계 인증/공유 제한/접근 제어 구성." />
            <ActionLink href="/integrations/zoom" title="Zoom 연동" />
            <ActionLink href="/integrations/teams" title="Teams 연동" />
            <ActionLink href="/ingest/upload" title="녹음 업로드" />
            <ActionLink href="/imports" title="외부 데이터 가져오기" />
            <ActionLink href="/sessions" title="세션 보기" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-lg border bg-card p-5 text-card-foreground lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">최근 활동</h3>
            <Link
              href="/sessions"
              className="text-xs text-primary hover:underline"
            >
              모두 보기
            </Link>
          </div>
          <Separator />
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="text-sm text-muted-foreground">아직 표시할 활동이 없습니다.</div>
            <div className="flex gap-2">
              <Link
                href="/sessions/new"
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                새 세션 시작
              </Link>
              <Link
                href="/ingest/upload"
                className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                녹음 업로드
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-5 text-card-foreground">
          <h3 className="text-sm font-semibold">컴플라이언스 스냅샷</h3>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">2단계 인증 강제</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">구성 필요</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">보존 정책</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">구성 필요</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">외부 공유 제한</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">구성 필요</span>
            </div>
            <div className="pt-2">
              <Link
                href="/org/security"
                className="inline-flex w-full items-center justify-center rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:opacity-90"
              >
                보안 설정으로 이동
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold">도움말 & 리소스</h3>
            <p className="mt-1 text-sm text-muted-foreground">가이드와 약관, 상태 페이지 등 유용한 링크</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/help" className="text-sm text-primary hover:underline">도움말 센터</Link>
            <Link href="/legal/privacy" className="text-sm text-primary hover:underline">개인정보 처리방침</Link>
            <Link href="/legal/terms" className="text-sm text-primary hover:underline">이용약관</Link>
            <Link href="/dashboard" className="text-sm text-primary hover:underline">대시보드</Link>
            <Link href="/onboarding" className="text-sm text-primary hover:underline">온보딩</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
