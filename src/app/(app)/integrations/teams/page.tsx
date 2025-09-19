"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Microsoft Teams integration page. It provides a clear connect/disconnect UI,
 * outlines the required Microsoft Graph scopes, and offers next-step deep links to ingest and imports flows.
 * It avoids server/database mutations and gracefully handles signed-in state via Supabase browser client.
 * It must not import components that don't exist and should work as a client-only Next.js page.
 */

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function TeamsIntegrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(true);
  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [isLinked, setIsLinked] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "info" | "success" | "error"; title: string; desc?: string } | null>(
    null
  );

  React.useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        setSessionEmail(data.session?.user?.email ?? null);
      } catch (e) {
        // Non-fatal; UI still renders without user context
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Linked state from localStorage or URL param
    const urlLinked = searchParams?.get("linked");
    const urlDisconnected = searchParams?.get("disconnected");

    const storedLinked = typeof window !== "undefined" ? localStorage.getItem("msTeamsLinked") : null;
    const initialLinked = urlLinked === "1" || storedLinked === "true";
    setIsLinked(initialLinked);

    if (urlLinked === "1") {
      try {
        localStorage.setItem("msTeamsLinked", "true");
        localStorage.removeItem("msTeamsLinkPending");
      } catch {}
      setMessage({ type: "success", title: "Microsoft Teams 계정이 연결되었습니다.", desc: "이제 녹음 파일을 가져오거나 자동 요약을 실행할 수 있어요." });
    } else if (urlDisconnected === "1") {
      setMessage({ type: "info", title: "연결이 해제되었습니다.", desc: "언제든 다시 연결하여 Teams 녹음을 가져올 수 있습니다." });
    }

    init();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleConnect = React.useCallback(() => {
    try {
      localStorage.setItem("msTeamsLinkPending", "true");
    } catch {}
    router.push("/integrations/teams/linked");
  }, [router]);

  const handleDisconnect = React.useCallback(() => {
    try {
      localStorage.setItem("msTeamsLinked", "false");
      localStorage.removeItem("msTeamsLinkPending");
    } catch {}
    setIsLinked(false);
    setMessage({ type: "info", title: "연결을 해제했습니다.", desc: "외부 접근 토큰은 더 이상 사용되지 않습니다." });
  }, []);

  const scopeItems = React.useMemo(
    () => [
      {
        name: "offline_access",
        desc: "장기 토큰 유지를 위한 오프라인 접근",
      },
      {
        name: "User.Read",
        desc: "사용자 프로필 및 기본 계정 정보 읽기",
      },
      {
        name: "Files.Read.All",
        desc: "OneDrive/SharePoint에 저장된 회의 녹음 파일 읽기",
      },
      {
        name: "Sites.Read.All",
        desc: "조직의 SharePoint 사이트 콘텐츠 인덱싱/검색",
      },
      {
        name: "OnlineMeetingArtifact.Read.All",
        desc: "회의 관련 아티팩트(녹음/기록 등) 접근",
      },
      {
        name: "Team.ReadBasic.All",
        desc: "팀/채널 기본 메타데이터 읽기",
      },
    ],
    []
  );

  const featureSlides = [
    {
      title: "Teams 녹음 가져오기",
      desc: "조직의 OneDrive/SharePoint에서 회의 녹음을 선택해 자동 전사 및 요약을 시작합니다.",
      cta: { label: "녹음 가져오기", href: "/imports" },
    },
    {
      title: "하이라이트 기반 요약",
      desc: "중요 표시나 업로드한 메모를 바탕으로 간결한 요약을 생성하여 공유하세요.",
      cta: { label: "요약 살펴보기", href: "/sessions" },
    },
    {
      title: "보존·보안 정책 준수",
      desc: "조직 보안 정책과 보존 기간을 설정해 안전하게 운영합니다.",
      cta: { label: "보안 설정", href: "/org/security" },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Microsoft Teams 연동</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Microsoft Graph를 통해 Teams 회의 녹음을 가져오고 자동 전사/요약을 실행합니다.
          </p>
        </div>
        <div className={cn("flex items-center gap-2 text-xs rounded-full px-3 py-1", isLinked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}> 
          <span className={cn("size-2 rounded-full", isLinked ? "bg-primary" : "bg-muted-foreground/30")} />
          {isLinked ? "연결됨" : "미연결"}
        </div>
      </div>

      {message && (
        <Alert className="mt-4 border-border bg-card">
          <AlertTitle className="text-sm font-medium">{message.title}</AlertTitle>
          {message.desc ? (
            <AlertDescription className="text-xs text-muted-foreground">{message.desc}</AlertDescription>
          ) : null}
        </Alert>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">계정 연결</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Microsoft 365 계정을 연결하여 Teams 회의 녹음 파일에 접근합니다.
                </p>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-28 rounded-md" />
              ) : isLinked ? (
                <button
                  onClick={handleDisconnect}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  연결 해제
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Microsoft 계정 연결
                </button>
              )}
            </header>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">상태</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isLinked ? "정상적으로 연결되어 있습니다." : "아직 연결되지 않았습니다."}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-1 text-xs", isLinked ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>{isLinked ? "Connected" : "Not connected"}</span>
                </div>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground">
                  <p>
                    {sessionEmail ? (
                      <>
                        로그인 계정: <span className="font-medium text-foreground">{sessionEmail}</span>
                      </>
                    ) : (
                      <>
                        먼저 <Link href="/auth/sign-in" className="underline underline-offset-4">로그인</Link> 해주세요.
                      </>
                    )}
                  </p>
                  <p className="mt-2">
                    조직 설정은 <Link href="/org/settings" className="underline underline-offset-4">조직 설정</Link>에서 관리하세요.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium">다음 단계</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/ingest"
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
                  >
                    실시간 캡처 열기
                  </Link>
                  <Link
                    href="/ingest/upload"
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
                  >
                    파일 업로드
                  </Link>
                  <Link
                    href="/imports"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:opacity-90"
                  >
                    Teams 녹음 가져오기
                  </Link>
                  <Link
                    href="/consent/new"
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
                  >
                    녹음 동의 수집
                  </Link>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  연결 후에는 <Link href="/sessions" className="underline underline-offset-4">세션 목록</Link>에서 처리 상태를 확인하고, 각 세션의 <Link href="/sessions/[sessionId]/summary" className="underline underline-offset-4">요약</Link>과 <Link href="/sessions/[sessionId]/transcript" className="underline underline-offset-4">전사</Link>를 열람할 수 있습니다.
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">권한 및 범위</p>
                  <p className="mt-1 text-xs text-muted-foreground">필수 Microsoft Graph 권한과 사용 목적</p>
                </div>
                <Link
                  href="/help"
                  className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
                >
                  도움말
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {scopeItems.map((s) => (
                  <div key={s.name} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{s.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Required</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>

              <Collapsible className="mt-4">
                <CollapsibleTrigger className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  세부 엔드포인트와 데이터 흐름 보기
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                    <ul className="list-disc space-y-2 pl-5 text-xs text-muted-foreground">
                      <li>녹음 파일 검색: GET /v1.0/me/drive/root/search(q='mp4') 및 조직 단위 Sites 검색</li>
                      <li>회의 아티팩트 접근: GET /v1.0/communications/callRecords</li>
                      <li>팀/채널 메타: GET /v1.0/teams, /channels (필요 시)</li>
                      <li>보존 정책 연동: 조직 보안 설정 참고 — <Link href="/org/retention" className="underline">보존 설정</Link></li>
                      <li>처리 결과물: 전사/요약은 <Link href="/sessions" className="underline">세션</Link>에 저장되며 공유 링크는 <Link href="/share/summary/[shareId]" className="underline">요약 공유</Link> 및 <Link href="/share/transcript/[shareId]" className="underline">전사 공유</Link>로 발급됩니다.</li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium">무엇을 할 수 있나요?</h3>
            <p className="mt-1 text-xs text-muted-foreground">Teams 연동으로 가능한 주요 기능을 살펴보세요.</p>

            <div className="mt-4">
              <Carousel className="relative">
                <CarouselContent>
                  {featureSlides.map((slide, idx) => (
                    <CarouselItem key={idx} className="basis-full md:basis-1/2 lg:basis-1/3">
                      <div className="h-full rounded-lg border border-border bg-card p-4">
                        <p className="text-sm font-medium">{slide.title}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{slide.desc}</p>
                        <div className="mt-3">
                          <Link
                            href={slide.cta.href}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground hover:opacity-90"
                          >
                            {slide.cta.label}
                          </Link>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2" />
              </Carousel>
            </div>
          </div>
        </section>

        <aside className="lg:col-span-1">
          <div className="sticky top-4 flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">빠른 링크</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground underline underline-offset-4">대시보드</Link>
                <Link href="/onboarding" className="text-muted-foreground hover:text-foreground underline underline-offset-4">온보딩</Link>
                <Link href="/sessions/new" className="text-muted-foreground hover:text-foreground underline underline-offset-4">새 세션 시작</Link>
                <Link href="/integrations/zoom" className="text-muted-foreground hover:text-foreground underline underline-offset-4">Zoom 연동</Link>
                <Link href="/me" className="text-muted-foreground hover:text-foreground underline underline-offset-4">내 계정</Link>
                <Link href="/settings/profile" className="text-muted-foreground hover:text-foreground underline underline-offset-4">프로필 설정</Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">보안 및 준수</p>
              <p className="mt-1 text-xs text-muted-foreground">
                데이터는 전송 중 TLS로 보호되며, 저장소 암호화가 적용됩니다. 조직 정책은 아래에서 관리하세요.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/org/security" className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">보안</Link>
                <Link href="/org/retention" className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">보존 정책</Link>
                <Link href="/legal/privacy" className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">개인정보</Link>
                <Link href="/legal/terms" className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">이용약관</Link>
              </div>
            </div>

            {!isLinked && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-medium">이미 연결하셨나요?</p>
                <p className="mt-1 text-xs text-muted-foreground">OAuth를 이미 완료했다면 아래에서 바로 이동하세요.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/integrations/teams/linked" className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90">연결 확인</Link>
                  <Link href="/imports" className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">녹음 가져오기</Link>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">관리</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                <Link href="/admin" className="text-muted-foreground hover:text-foreground underline underline-offset-4">관리 콘솔</Link>
                <Link href="/admin/metrics" className="text-muted-foreground hover:text-foreground underline underline-offset-4">지표</Link>
                <Link href="/admin/jobs" className="text-muted-foreground hover:text-foreground underline underline-offset-4">작업 큐</Link>
                <Link href="/admin/costs" className="text-muted-foreground hover:text-foreground underline underline-offset-4">비용</Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium">문제가 있나요?</p>
            <p className="mt-1 text-xs text-muted-foreground">도움말 센터를 확인하거나 지원팀에 문의하세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/help" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted">도움말</Link>
            <Link href="/sessions" className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:opacity-90">세션 보기</Link>
            <Link href="/ingest" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">실시간 캡처 시작</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
