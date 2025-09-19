"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Session Overview page for a specific session. It shows current session status
 * (recording/processing/done/idle), provides next steps, and offers quick navigation links to Live, Transcript,
 * Highlights, Summary, Exports, and Settings tabs. It avoids server/database calls (schema not provided) and
 * persists lightweight session metadata (title/status) locally. It integrates with existing app layout and theme.
 */

import React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type SessionStatus = "idle" | "recording" | "processing" | "done" | "error";

type SessionMeta = {
  title: string;
  status: SessionStatus;
  updatedAt: number;
};

function StatusPill({ status }: { status: SessionStatus }) {
  const style =
    status === "recording"
      ? "bg-destructive text-destructive-foreground"
      : status === "processing"
      ? "bg-secondary text-secondary-foreground"
      : status === "done"
      ? "bg-primary text-primary-foreground"
      : status === "error"
      ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";
  const label =
    status === "recording"
      ? "녹음 중"
      : status === "processing"
      ? "처리 중"
      : status === "done"
      ? "완료"
      : status === "error"
      ? "에러"
      : "대기";
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", style)}>
      <span className={cn("h-2 w-2 rounded-full", status === "recording" ? "bg-white" : "bg-foreground/60")} />
      {label}
    </span>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}

export default function SessionOverviewPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = React.useMemo(() => String(params?.sessionId || ""), [params]);
  const search = useSearchParams();
  const router = useRouter();

  const storageKey = React.useMemo(() => (sessionId ? `session:meta:${sessionId}` : ""), [sessionId]);

  const [meta, setMeta] = React.useState<SessionMeta | null>(null);
  const [micPermission, setMicPermission] = React.useState<"granted" | "denied" | "prompt" | "unknown">("unknown");

  // Load meta from localStorage and accept overrides from URL (?status=&title=)
  React.useEffect(() => {
    if (!sessionId) return;

    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    let initial: SessionMeta = saved
      ? (JSON.parse(saved) as SessionMeta)
      : { title: `세션 ${sessionId.slice(0, 6)}`, status: "idle", updatedAt: Date.now() };

    const statusParam = search?.get("status") as SessionStatus | null;
    const titleParam = search?.get("title");

    if (statusParam && ["idle", "recording", "processing", "done", "error"].includes(statusParam)) {
      initial = { ...initial, status: statusParam, updatedAt: Date.now() };
    }
    if (titleParam) {
      initial = { ...initial, title: titleParam, updatedAt: Date.now() };
    }

    setMeta(initial);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(initial));
    } catch {}
  }, [sessionId, storageKey, search]);

  // Broadcast across tabs (optional, safe no-op if unsupported)
  React.useEffect(() => {
    if (!sessionId) return;
    const channelName = `session-status:${sessionId}`;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(channelName);
      bc.onmessage = (ev) => {
        if (ev?.data?.type === "status:update" && ev.data?.payload) {
          setMeta((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...ev.data.payload, updatedAt: Date.now() } as SessionMeta;
            try {
              window.localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      };
    } catch {
      // ignore
    }
    return () => {
      try {
        bc?.close();
      } catch {}
    };
  }, [sessionId, storageKey]);

  // Microphone permission info for helpful hints
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        // @ts-expect-error: 'microphone' may not be in PermissionName typings in all TS lib versions
        const status = await navigator.permissions?.query?.({ name: "microphone" });
        if (!active || !status) return;
        setMicPermission(status.state as any);
        status.onchange = () => {
          if (!active) return;
          setMicPermission((status.state as any) ?? "unknown");
        };
      } catch {
        setMicPermission("unknown");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateStatus = React.useCallback(
    (next: SessionStatus, redirect?: string) => {
      setMeta((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, status: next, updatedAt: Date.now() };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(merged));
          const channelName = `session-status:${sessionId}`;
          try {
            const bc = new BroadcastChannel(channelName);
            bc.postMessage({ type: "status:update", payload: { status: next } });
            bc.close();
          } catch {}
        } catch {}
        return merged;
      });
      if (redirect) router.push(redirect);
    },
    [router, sessionId, storageKey]
  );

  const humanTime = React.useMemo(() => {
    if (!meta?.updatedAt) return "";
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "2-digit",
      }).format(new Date(meta.updatedAt));
    } catch {
      return new Date(meta.updatedAt).toLocaleString();
    }
  }, [meta?.updatedAt]);

  const nextSteps = React.useMemo(() => {
    const sid = sessionId;
    const s = meta?.status ?? "idle";
    const base = `/sessions/${sid}`;
    const steps: { title: string; desc: string; href: string; action?: string }[] = [];
    if (s === "idle") {
      steps.push(
        { title: "라이브 세션 시작", desc: "브라우저에서 마이크를 캡처해 실시간 전사를 시작합니다.", href: `${base}/live`, action: "시작" },
        { title: "녹음 파일 업로드", desc: "기존 회의/강의 녹음을 업로드해 전사와 요약을 생성합니다.", href: "/ingest/upload", action: "업로드" },
        { title: "Zoom/Teams 연동", desc: "계정을 연동해 회의 녹음을 자동으로 가져옵니다.", href: "/integrations/zoom", action: "연동" }
      );
    } else if (s === "recording") {
      steps.push(
        { title: "라이브 보기 열기", desc: "실시간 자막과 하이라이트 입력을 사용할 수 있습니다.", href: `${base}/live`, action: "열기" },
        { title: "중요 포인트 표시", desc: "회의 중간중간 하이라이트를 남겨 요약 정확도를 높입니다.", href: `${base}/highlights`, action: "표시" },
        { title: "녹음 종료", desc: "종료 후 전사/요약 처리가 자동으로 시작됩니다.", href: `${base}/live`, action: "종료" }
      );
    } else if (s === "processing") {
      steps.push(
        { title: "전사 검토 준비", desc: "처리 완료 후 전사 탭에서 화자/타임스탬프를 확인하세요.", href: `${base}/transcript`, action: "전사" },
        { title: "하이라이트 업로드(선택)", desc: "텍스트 메모나 타임스탬프 포함 파일을 업로드해 요약 품질을 향상합니다.", href: `${base}/upload-highlights`, action: "업로드" },
        { title: "보존/보안 설정", desc: "조직 보존기간, 접근제어, 동의서를 설정합니다.", href: "/org/retention", action: "설정" }
      );
    } else if (s === "done") {
      steps.push(
        { title: "전사본 검토", desc: "화자 라벨과 타임라인을 확인하고 필요한 수정사항을 반영합니다.", href: `${base}/transcript`, action: "검토" },
        { title: "요약 생성 및 공유", desc: "하이라이트 기반 간추린 요약을 확인하고 공유 링크를 발급합니다.", href: `${base}/summary`, action: "요약" },
        { title: "내보내기", desc: "PDF/TXT/DOCX로 다운로드하거나 외부 공유 링크를 생성합니다.", href: `${base}/exports`, action: "내보내기" }
      );
    }
    return steps;
  }, [meta?.status, sessionId]);

  const basePath = `/sessions/${sessionId}`;

  const renderStatusAlert = () => {
    const s = meta?.status ?? "idle";
    if (s === "recording") {
      return (
        <Alert className="border-destructive/40">
          <AlertTitle className="flex items-center gap-2">녹음이 진행 중입니다</AlertTitle>
          <AlertDescription>
            실시간 자막과 하이라이트는 라이브 보기에서 사용할 수 있습니다. 안전한 저장과 전송이 적용됩니다. {" "}
            <Link href={`${basePath}/live`} className="underline underline-offset-4">라이브 보기로 이동</Link>.
          </AlertDescription>
        </Alert>
      );
    }
    if (s === "processing") {
      return (
        <Alert className="border-secondary/40">
          <AlertTitle>전사/요약 처리 중</AlertTitle>
          <AlertDescription>
            처리가 끝나면 전사와 요약을 확인할 수 있습니다. 페이지는 자동으로 갱신되지 않을 수 있습니다. {" "}
            <Link href={`${basePath}/transcript`} className="underline underline-offset-4">전사 탭</Link>을 열어 진행 상황을 확인하세요.
          </AlertDescription>
        </Alert>
      );
    }
    if (s === "done") {
      return (
        <Alert className="border-primary/40">
          <AlertTitle>처리 완료</AlertTitle>
          <AlertDescription>
            전사본과 요약본이 준비되었습니다. {" "}
            <Link href={`${basePath}/summary`} className="underline underline-offset-4">요약 보기</Link> 또는 {" "}
            <Link href={`${basePath}/exports`} className="underline underline-offset-4">내보내기</Link>로 진행하세요.
          </AlertDescription>
        </Alert>
      );
    }
    if (s === "error") {
      return (
        <Alert className="border-destructive/60">
          <AlertTitle>처리 중 오류가 발생했습니다</AlertTitle>
          <AlertDescription>
            잠시 후 다시 시도하거나 관리자에게 문의하세요. {" "}
            <Link href="/help" className="underline underline-offset-4">도움말</Link>
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert className="border-muted/60">
        <AlertTitle>세션을 시작할 준비가 되었어요</AlertTitle>
        <AlertDescription>
          바로 라이브 전사를 시작하거나 기존 녹음을 업로드할 수 있습니다. 마이크 권한:{" "}
          <span className="ml-1 font-medium">{micPermission === "unknown" ? "확인 불가" : micPermission}</span>.
        </AlertDescription>
      </Alert>
    );
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {meta?.status !== "recording" ? (
        <button
          onClick={() => updateStatus("recording", `${basePath}/live`)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
        >
          <span className="relative inline-block h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-primary-foreground opacity-70 animate-ping" />
            <span className="relative block h-2 w-2 rounded-full bg-primary-foreground" />
          </span>
          라이브 시작
        </button>
      ) : (
        <button
          onClick={() => updateStatus("processing")}
          className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow hover:opacity-90"
        >
          녹음 종료
        </button>
      )}
      <Link href={`${basePath}/live`} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
        라이브 보기
      </Link>
      <Link href={`${basePath}/transcript`} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
        전사
      </Link>
      <Link href={`${basePath}/summary`} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
        요약
      </Link>
      <Link href={`${basePath}/settings`} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
        설정
      </Link>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ul className="flex items-center gap-2">
          <li>
            <Link href="/dashboard" className="hover:text-foreground">대시보드</Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link href="/sessions" className="hover:text-foreground">세션</Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="text-foreground">{meta?.title ?? <Skeleton className="inline-block h-4 w-24 align-middle" />}</li>
        </ul>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:mb-8 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{meta?.title ?? "세션"}</h1>
            <StatusPill status={meta?.status ?? "idle"} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            세션 ID: <span className="font-mono">{sessionId}</span> • 업데이트: {humanTime || "-"}
          </p>
        </div>
        {headerActions}
      </div>

      {/* Status Alert */}
      <div className="mb-6 md:mb-8">{renderStatusAlert()}</div>

      {/* Next Steps */}
      <section aria-labelledby="next-steps" className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="next-steps" className="text-lg font-semibold">
            다음 단계
          </h2>
          <div className="text-xs text-muted-foreground">
            상태에 맞춰 권장 작업을 안내합니다.
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nextSteps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              현재 단계에서 권장 작업이 없습니다. 상단의 빠른 링크를 사용하세요.
            </div>
          ) : (
            nextSteps.map((step) => (
              <Link
                key={step.title}
                href={step.href}
                className="group relative overflow-hidden rounded-lg border bg-card p-5 transition hover:shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-base font-medium">{step.title}</p>
                  <ArrowIcon className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{step.desc}</p>
                {step.action && (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {step.action}
                    <ArrowIcon className="h-3.5 w-3.5" />
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </section>

      <Separator className="my-6" />

      {/* Quick Links */}
      <section aria-labelledby="quick-links" className="mb-10">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="quick-links" className="text-lg font-semibold">
            빠른 링크
          </h2>
          <div className="text-xs text-muted-foreground">자주 가는 탭과 도구</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`${basePath}/live`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">라이브</div>
            <p className="text-sm text-muted-foreground">실시간 자막, 하이라이트, 상태 표시</p>
          </Link>
          <Link href={`${basePath}/transcript`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">전사</div>
            <p className="text-sm text-muted-foreground">문단/화자/타임스탬프 정렬 보기</p>
          </Link>
          <Link href={`${basePath}/highlights`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">하이라이트</div>
            <p className="text-sm text-muted-foreground">중요 포인트 생성 및 편집</p>
          </Link>
          <Link href={`${basePath}/upload-highlights`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">하이라이트 업로드</div>
            <p className="text-sm text-muted-foreground">텍스트/타임스탬프 파일 업로드</p>
          </Link>
          <Link href={`${basePath}/summary`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">요약</div>
            <p className="text-sm text-muted-foreground">핵심 요약 생성 및 공유</p>
          </Link>
          <Link href={`${basePath}/exports`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">내보내기</div>
            <p className="text-sm text-muted-foreground">PDF / TXT / DOCX 다운로드</p>
          </Link>
          <Link href={`${basePath}/settings`} className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 text-sm font-medium">세션 설정</div>
            <p className="text-sm text-muted-foreground">화자 수, 언어, 접근권한</p>
          </Link>
          <Link href="/ingest/upload" className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 inline-flex items-center gap-1 text-sm font-medium">
              녹음 업로드
              <ExternalIcon className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-muted-foreground">기존 녹음 파일 가져오기</p>
          </Link>
          <Link href="/integrations/zoom" className="rounded-lg border bg-card p-5 transition hover:shadow-sm">
            <div className="mb-1 inline-flex items-center gap-1 text-sm font-medium">
              Zoom 연동
              <ExternalIcon className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm text-muted-foreground">회의 녹음 자동 수집</p>
          </Link>
        </div>
      </section>

      {/* Integrations & Compliance */}
      <section aria-labelledby="integrations" className="mb-10">
        <h2 id="integrations" className="mb-3 text-lg font-semibold">연동 및 준수</h2>
        <div className="rounded-lg border bg-card p-4">
          <Collapsible>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">필수 정책과 계정 연동</p>
                <p className="text-sm text-muted-foreground">동의서, 보존기간, 보안, 화상회의 계정 연동을 관리하세요.</p>
              </div>
              <CollapsibleTrigger className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">상세 보기</CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/consent/new" className="rounded-md border bg-card p-4 hover:bg-muted">
                  <div className="text-sm font-medium">녹음 동의 수집</div>
                  <p className="mt-1 text-sm text-muted-foreground">동의서 생성 및 공유 링크</p>
                </Link>
                <Link href="/org/retention" className="rounded-md border bg-card p-4 hover:bg-muted">
                  <div className="text-sm font-medium">보존기간 정책</div>
                  <p className="mt-1 text-sm text-muted-foreground">자동 삭제/보관 규칙</p>
                </Link>
                <Link href="/org/security" className="rounded-md border bg-card p-4 hover:bg-muted">
                  <div className="text-sm font-medium">보안 설정</div>
                  <p className="mt-1 text-sm text-muted-foreground">접근 제어와 암호화</p>
                </Link>
                <Link href="/integrations/teams" className="rounded-md border bg-card p-4 hover:bg-muted">
                  <div className="text-sm font-medium">Microsoft Teams 연동</div>
                  <p className="mt-1 text-sm text-muted-foreground">회의 녹음 자동 수집</p>
                </Link>
                <Link href="/settings/devices" className="rounded-md border bg-card p-4 hover:bg-muted">
                  <div className="text-sm font-medium">장치 설정</div>
                  <p className="mt-1 text-sm text-muted-foreground">마이크와 오디오 장치 구성</p>
                </Link>
                <div className="rounded-md border bg-card p-4">
                  <div className="text-sm font-medium">정책</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Link href="/legal/privacy" className="underline underline-offset-4">개인정보 처리방침</Link> · {" "}
                    <Link href="/legal/terms" className="underline underline-offset-4">이용약관</Link>
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* Activity placeholder (no DB) */}
      <section aria-labelledby="activity" className="mb-16">
        <h2 id="activity" className="mb-3 text-lg font-semibold">최근 활동</h2>
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-sm text-muted-foreground">처리 내역은 전사/요약이 생성되면 표시됩니다.</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-3 w-1/2" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Helpful links */}
      <section aria-labelledby="more-links" className="mb-8">
        <h2 id="more-links" className="mb-3 text-lg font-semibold">더 보기</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/sessions/new" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">새 세션</Link>
          <Link href="/imports" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">가져오기</Link>
          <Link href="/help" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">도움말</Link>
          <Link href="/me" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">내 계정</Link>
          <Link href="/settings/profile" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">프로필 설정</Link>
          <Link href="/settings/notifications" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">알림 설정</Link>
          <Link href="/org/members" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">조직 멤버</Link>
          <Link href="/admin/metrics" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">관리자: 지표</Link>
          <Link href="/admin/jobs" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">관리자: 작업</Link>
          <Link href="/admin/costs" className="rounded-md border border-input bg-card px-3 py-2 hover:bg-muted">관리자: 비용</Link>
        </div>
      </section>
    </div>
  );
}
