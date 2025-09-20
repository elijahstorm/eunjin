"use client";

/**
 * CODE INSIGHT
 * This code's use case is a polished skeleton loader for an import's progress view.
 * It renders an animated progress indicator, step placeholders, and helpful navigation links
 * while the actual import status and details are being fetched. No data is loaded here.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

export default function Loading() {
  const [progress, setProgress] = useState(14);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    const target = 87; // keep under completion to indicate loading
    const stepMin = 1;
    const stepMax = 4;
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= target) return p;
        const delta = Math.floor(Math.random() * (stepMax - stepMin + 1)) + stepMin;
        const next = Math.min(p + delta, target);
        return next;
      });
    }, 260);
    return () => clearInterval(iv);
  }, []);

  const steps = useMemo(
    () => [
      { key: "upload", label: "소스 업로드 준비", hint: "미디어 분석 및 청크 준비" },
      { key: "asr", label: "실시간/배치 전사", hint: "저지연 한국어 ASR" },
      { key: "diarization", label: "화자 분리", hint: "스피커 라벨링 & 타임스탬프" },
      { key: "highlights", label: "하이라이트 인덱싱", hint: "사용자 마크 동기화" },
      { key: "cleanup", label: "전사 정제", hint: "구두점 복원 · 중복 제거" },
      { key: "summary", label: "요약 생성", hint: "핵심기반 간추린 문서" },
      { key: "finalize", label: "최종 정리", hint: "스토리지 저장 및 링크 준비" },
    ],
    []
  );

  const activeIndex = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);

  return (
    <main className="w-full space-y-6 p-4 md:p-8" aria-busy>
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">가져오기 진행 중</h1>
            <p className="text-sm text-muted-foreground">전사, 화자 분리, 하이라이트 인덱싱과 요약을 준비하고 있어요.</p>
          </div>
          <div className="hidden md:flex gap-2">
            <Link href="/dashboard" className="hidden" aria-hidden />
            <Link
              href="/" // dashboard assumed at root of (app)/layout
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:opacity-90"
            >
              대시보드로 이동
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-muted/80"
            >
              도움말
            </Link>
          </div>
        </div>

        <Alert className="bg-card text-card-foreground border border-border">
          <AlertTitle className="text-sm font-medium">가져오기 설정 확인 중</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            상태가 곧 업데이트됩니다. 페이지를 떠나도 작업은 계속됩니다. 완료되면 요약과 전사를 확인할 수 있어요.
          </AlertDescription>
        </Alert>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  IMP
                </div>
                <div>
                  <div className="text-sm font-medium">가져오기 상태</div>
                  <div className="text-xs text-muted-foreground">실시간 진행률</div>
                </div>
              </div>
              <div className="text-sm tabular-nums text-muted-foreground">{progress}%</div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%`, transition: "width 240ms ease" }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                role="progressbar"
              />
              <div className="pointer-events-none absolute inset-0 animate-[shimmer_1.6s_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%]" />
            </div>
            <style jsx>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>

            <Separator className="my-5" />

            <ol className="space-y-4">
              {steps.map((step, idx) => {
                const isActive = idx === activeIndex;
                const isDone = idx < activeIndex;
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        isDone && "bg-primary text-primary-foreground border-primary",
                        isActive && !isDone && "bg-accent text-accent-foreground border-accent",
                        !isActive && !isDone && "bg-muted text-muted-foreground border-border"
                      )}
                      aria-hidden
                    >
                      {isDone ? "✓" : idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{step.label}</div>
                        <div className="text-xs text-muted-foreground hidden sm:block">
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{step.hint}</div>
                      {isActive ? (
                        <div className="mt-2">
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Skeleton className="h-2 w-1/3" />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-medium">세부 로그</div>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="text-xs rounded-md px-2 py-1 bg-muted hover:bg-muted/80"
                    aria-expanded={logsOpen}
                  >
                    {logsOpen ? "숨기기" : "보기"}
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-3 space-y-2 rounded-md border border-dashed border-border p-3">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">전사 미리보기</div>
                <span className="text-xs text-muted-foreground">로딩 중</span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-9/12" />
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-4 w-7/12" />
              </div>
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">자동 저장됩니다</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">하이라이트</div>
                <span className="text-xs text-muted-foreground">동기화 중</span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-6 w-12 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-10/12" />
                      <Skeleton className="h-3 w-8/12" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Link
                  href="/sessions/[sessionId]/upload-highlights"
                  className="hidden"
                  aria-hidden
                />
                <Link
                  href="/sessions/[sessionId]/upload-highlights"
                  className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90"
                >
                  하이라이트 업로드
                </Link>
                <Link
                  href="/sessions/[sessionId]/highlights"
                  className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  하이라이트 보기
                </Link>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-medium mb-3">빠른 이동</div>
            <nav className="grid gap-2 text-sm">
              <Link href="/dashboard" className="group inline-flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted">
                대시보드
                <span className="text-muted-foreground group-hover:translate-x-0.5 transition">→</span>
              </Link>
              <Link href="/imports" className="group inline-flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted">
                가져오기 목록
                <span className="text-muted-foreground group-hover:translate-x-0.5 transition">→</span>
              </Link>
              <Link href="/ingest/upload" className="group inline-flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted">
                파일 업로드로 가져오기
                <span className="text-muted-foreground group-hover:translate-x-0.5 transition">→</span>
              </Link>
              <Link href="/integrations/zoom" className="group inline-flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted">
                Zoom 연동
                <span className="text-muted-foreground group-hover:translate-x-0.5 transition">→</span>
              </Link>
              <Link href="/integrations/teams" className="group inline-flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted">
                Microsoft Teams 연동
                <span className="text-muted-foreground group-hover:translate-x-0.5 transition">→</span>
              </Link>
            </nav>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <div className="text-sm font-medium">다음 단계</div>
              <p className="text-xs text-muted-foreground">가져오기가 완료되면 다음 페이지에서 결과를 확인하세요.</p>
            </div>
            <ul className="grid gap-2 text-sm">
              <li>
                <Link href="/sessions/[sessionId]/transcript" className="inline-flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                  전체 전사 보기 <span className="text-muted-foreground">→</span>
                </Link>
              </li>
              <li>
                <Link href="/sessions/[sessionId]/summary" className="inline-flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                  요약 확인 <span className="text-muted-foreground">→</span>
                </Link>
              </li>
              <li>
                <Link href="/sessions/[sessionId]/exports" className="inline-flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                  내보내기(PDF/TXT/DOCX) <span className="text-muted-foreground">→</span>
                </Link>
              </li>
              <li>
                <Link href="/sessions/[sessionId]/settings" className="inline-flex w-full items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                  세션 설정 <span className="text-muted-foreground">→</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="text-sm font-medium">계정 및 조직</div>
            <div className="grid gap-2 text-sm">
              <Link href="/me" className="inline-flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                내 계정 <span className="text-muted-foreground">→</span>
              </Link>
              <Link href="/org/settings" className="inline-flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                조직 설정 <span className="text-muted-foreground">→</span>
              </Link>
              <Link href="/org/retention" className="inline-flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                보존 정책 <span className="text-muted-foreground">→</span>
              </Link>
              <Link href="/org/security" className="inline-flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                보안 설정 <span className="text-muted-foreground">→</span>
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <footer className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-2 rounded-full bg-primary animate-pulse" aria-hidden />
          작업이 백그라운드에서 진행 중입니다. 완료 알림은 대시보드에서 확인하세요.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/legal/privacy" className="hover:underline">개인정보 처리방침</Link>
          <Link href="/legal/terms" className="hover:underline">이용약관</Link>
          <Link href="/offline" className="hover:underline">오프라인 모드</Link>
        </div>
      </footer>
    </main>
  );
}
