"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Import detail/progress page for a specific importId.
 * It visualizes pipeline stages (ASR, diarization, post-processing), shows real-time-like progress,
 * and upon completion provides a CTA to view the generated session transcript at /sessions/[sessionId]/transcript.
 * It avoids server/database calls due to missing schema and focuses on a robust, production-ready client UI.
 */

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

type StepStatus = "pending" | "active" | "done";

type Step = {
  key: string;
  title: string;
  description: string;
  status: StepStatus;
  progress: number; // 0-100
  logs: string[];
};

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 11.086l6.543-6.543a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  );
}

function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", className)} />;
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)}>
      <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warn" }) {
  const style =
    tone === "success"
      ? "bg-green-600/15 text-green-600 ring-1 ring-green-600/20"
      : tone === "warn"
      ? "bg-amber-600/15 text-amber-600 ring-1 ring-amber-600/20"
      : "bg-primary/10 text-primary ring-1 ring-primary/20";
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", style)}>{label}</span>;
}

export default function ImportDetailPage({ params }: { params: { importId: string } }) {
  const { importId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();

  const querySessionId = searchParams.get("sessionId") || undefined;
  const simulate = searchParams.get("simulate") !== "false"; // default simulate if no backend status

  const [steps, setSteps] = React.useState<Step[]>(() => {
    // Attempt to restore from localStorage
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`import:${importId}:steps`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Step[];
          return parsed;
        } catch {}
      }
    }
    return [
      {
        key: "received",
        title: "파일 수신 및 분석 준비",
        description: "업로드된 녹음/녹화 파일의 형식 확인 및 변환 준비",
        status: "active",
        progress: 0,
        logs: ["작업 대기열에 추가됨"],
      },
      {
        key: "asr",
        title: "실시간/배치 전사 (ASR)",
        description: "딥러닝 ASR로 텍스트 전사 및 구두점 복원",
        status: "pending",
        progress: 0,
        logs: [],
      },
      {
        key: "diarization",
        title: "화자 분리 (Diarization)",
        description: "발화자를 구간별로 식별 및 라벨링",
        status: "pending",
        progress: 0,
        logs: [],
      },
      {
        key: "post",
        title: "후처리 및 타임라인 정렬",
        description: "문장화/중복 제거 및 타임스탬프 정렬",
        status: "pending",
        progress: 0,
        logs: [],
      },
    ];
  });

  const [isComplete, setComplete] = React.useState<boolean>(() => {
    return steps.every((s) => s.status === "done" && s.progress >= 100);
  });
  const [sessionId, setSessionId] = React.useState<string | undefined>(() => querySessionId || (typeof window !== "undefined" ? window.localStorage.getItem(`import:${importId}:sessionId`) || undefined : undefined));
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const activeIndex = steps.findIndex((s) => s.status === "active");
  const overallProgress = React.useMemo(() => {
    const total = steps.reduce((acc, s) => acc + s.progress, 0);
    return Math.round(total / steps.length);
  }, [steps]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`import:${importId}:steps`, JSON.stringify(steps));
    }
  }, [steps, importId]);

  React.useEffect(() => {
    if (isComplete && typeof window !== "undefined") {
      window.localStorage.setItem(`import:${importId}:complete`, "1");
      if (sessionId) window.localStorage.setItem(`import:${importId}:sessionId`, sessionId);
    }
  }, [isComplete, sessionId, importId]);

  React.useEffect(() => {
    if (!simulate || isComplete) return;

    const iv = window.setInterval(() => {
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.status === "active");
        if (idx === -1) return prev;
        const copy = [...prev];
        const step = { ...copy[idx] };
        const inc = Math.max(3, Math.min(9, Math.round(Math.random() * 10)));
        const nextProgress = Math.min(100, step.progress + inc);
        step.progress = nextProgress;
        if (nextProgress === 100) {
          step.status = "done";
          step.logs = [...step.logs, `${new Date().toLocaleTimeString()} • 완료됨`];
          copy[idx] = step;
          if (idx + 1 < copy.length) {
            const nxt = { ...copy[idx + 1] };
            nxt.status = "active";
            nxt.logs = [...nxt.logs, `${new Date().toLocaleTimeString()} • 단계 시작`] ;
            copy[idx + 1] = nxt;
          }
        } else {
          step.logs = [...step.logs, `${new Date().toLocaleTimeString()} • 진행률 ${step.progress}%`];
          copy[idx] = step;
        }
        return copy;
      });
    }, 600);

    return () => window.clearInterval(iv);
  }, [simulate, isComplete]);

  React.useEffect(() => {
    const done = steps.every((s) => s.status === "done" && s.progress >= 100);
    if (done && !isComplete) {
      setComplete(true);
      setSessionId((prev) => prev || querySessionId || `sim-${importId.slice(0, 8)}`);
    }
  }, [steps, isComplete, importId, querySessionId]);

  const handleCancel = () => {
    if (!isComplete && confirm("정말로 가져오기를 취소하시겠어요? 진행 중인 작업이 중단됩니다.")) {
      // Since no backend, just redirect to imports list
      router.push("/imports");
    }
  };

  const resetSimulation = () => {
    if (confirm("이 가져오기 진행 상태를 초기화할까요?")) {
      const reset: Step[] = steps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending", progress: 0, logs: i === 0 ? ["작업 대기열에 추가됨"] : [] }));
      setSteps(reset);
      setComplete(false);
      setSessionId(undefined);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`import:${importId}:complete`);
        window.localStorage.removeItem(`import:${importId}:sessionId`);
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link href="/imports" className="hover:text-foreground transition-colors">가져오기</Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="text-foreground font-medium">{importId}</li>
        </ol>
      </nav>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">가져오기 처리 진행상황</h1>
          <p className="text-muted-foreground">ASR 전사, 화자 분리, 후처리 단계를 순차적으로 실행합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {isComplete ? <StatusPill label="완료됨" tone="success" /> : activeIndex >= 0 ? <StatusPill label="진행 중" /> : <StatusPill label="대기 중" tone="warn" />}
          <button onClick={handleCancel} className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors", isComplete ? "cursor-not-allowed opacity-50" : "hover:bg-muted") } disabled={isComplete}>
            취소
          </button>
        </div>
      </header>

      <div className="bg-card border rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isComplete ? (
              <SpinnerIcon className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <CheckIcon className="h-5 w-5 text-green-600" />
            )}
            <div>
              <div className="text-sm text-muted-foreground">전체 진행률</div>
              <div className="text-lg font-medium">{overallProgress}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.refresh()} className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">새로고침</button>
            <button onClick={resetSimulation} className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">초기화</button>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={overallProgress} />
        </div>
      </div>

      {isComplete && (
        <Alert className="bg-green-600/10 border-green-600/20">
          <AlertTitle className="flex items-center gap-2 text-green-700">
            <CheckIcon className="h-5 w-5" /> 가져오기 완료
          </AlertTitle>
          <AlertDescription className="mt-1 text-green-700/90">
            전사와 화자 분리가 완료되었어요. 아래 버튼으로 세션 전사본을 확인하세요. 공유용 링크는 세션의 내보내기 메뉴에서 생성할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isActive = step.status === "active";
              const isDone = step.status === "done";
              return (
                <div key={step.key} className={cn("rounded-xl border bg-card", isActive ? "ring-1 ring-primary/20" : "")}>
                  <div className="p-4 md:p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {isDone ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/15 text-green-700">
                            <CheckIcon className="h-5 w-5" />
                          </span>
                        ) : isActive ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <SpinnerIcon className="h-5 w-5 animate-spin" />
                          </span>
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start gap-2 justify-between">
                          <div>
                            <h3 className="font-medium leading-none tracking-tight">{step.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDone ? (
                              <StatusPill label="완료" tone="success" />
                            ) : isActive ? (
                              <StatusPill label="진행 중" />
                            ) : (
                              <StatusPill label="대기" tone="warn" />
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <ProgressBar value={step.progress} />
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Dot className={isDone ? "bg-green-600" : isActive ? "bg-primary" : "bg-muted-foreground/40"} />
                            {isDone ? "이 단계가 완료되었습니다" : isActive ? "이 단계가 처리 중입니다" : "이 단계는 곧 시작됩니다"}
                          </span>
                          <span>•</span>
                          <span>진행률 {step.progress}%</span>
                        </div>
                        <div className="mt-4">
                          <Collapsible open={!!collapsed[step.key]} onOpenChange={(open) => setCollapsed((c) => ({ ...c, [step.key]: open }))}>
                            <CollapsibleTrigger className="text-sm text-primary hover:underline">
                              {collapsed[step.key] ? "로그 숨기기" : "세부 로그 보기"}
                            </CollapsibleTrigger>
                            <CollapsibleContent forceMount>
                              <div className="mt-3 rounded-md border bg-muted/30 p-3">
                                {step.logs.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">표시할 로그가 없습니다.</p>
                                ) : (
                                  <ul className="space-y-2 text-sm">
                                    {step.logs.map((l, i) => (
                                      <li key={i} className="text-muted-foreground">{l}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="font-medium">다음 단계</h3>
            <p className="mt-1 text-sm text-muted-foreground">가져오기가 완료되면 세션 상세에서 전사, 하이라이트, 요약을 확인하고 내보낼 수 있습니다.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/sessions" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">세션 목록으로</Link>
              <Link href="/sessions/new" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">새 세션 시작</Link>
              <Link href="/ingest/upload" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">파일 다시 업로드</Link>
              <Link href="/help" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-muted transition-colors">도움말 보기</Link>
            </div>
            {isComplete && (
              <div className="mt-6">
                <Separator />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/sessions/${sessionId || "unknown"}/transcript`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    세션 전사본 보기
                  </Link>
                  {sessionId && (
                    <>
                      <Link href={`/sessions/${sessionId}/highlights`} className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">하이라이트</Link>
                      <Link href={`/sessions/${sessionId}/summary`} className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">요약</Link>
                      <Link href={`/sessions/${sessionId}/exports`} className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">내보내기</Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="font-medium">가져오기 정보</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-xs">{importId}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">상태</span><span className="text-foreground">{isComplete ? "완료" : "진행 중"}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">진행률</span><span>{overallProgress}%</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">세션 ID</span><span className="font-mono text-xs">{sessionId || "생성 중"}</span></div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link href="/imports" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">가져오기 목록</Link>
              <Link href="/ingest/upload" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">새 파일 업로드</Link>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="font-medium">통합 설정</h3>
            <p className="mt-1 text-sm text-muted-foreground">Zoom 또는 Teams 계정을 연동하면 녹음 파일을 자동으로 가져올 수 있어요.</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link href="/integrations/zoom" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">Zoom 연동</Link>
              <Link href="/integrations/teams" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">Teams 연동</Link>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="font-medium">보안과 동의</h3>
            <p className="mt-1 text-sm text-muted-foreground">참여자에 대한 녹음 동의 문서를 생성하고 공유하세요.</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link href="/consent/new" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">동의 문서 생성</Link>
              <Link href="/legal/privacy" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">개인정보 처리방침</Link>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="font-medium">장치 및 알림</h3>
            <p className="mt-1 text-sm text-muted-foreground">마이크/스피커를 점검하고 작업 완료 알림을 설정하세요.</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link href="/settings/devices" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">장치 설정</Link>
              <Link href="/settings/notifications" className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">알림 설정</Link>
            </div>
          </div>
        </aside>
      </div>

      {!isComplete && (
        <div className="rounded-xl border bg-card p-4 md:p-6">
          <h3 className="font-medium">도움이 필요하신가요?</h3>
          <p className="mt-2 text-sm text-muted-foreground">가져오기가 길어지면 페이지를 떠나도 안전합니다. 작업이 완료되면 세션 목록에 표시됩니다.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/sessions" className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">세션으로 이동</Link>
            <Link href="/help" className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">도움말</Link>
          </div>
        </div>
      )}
    </div>
  );
}
