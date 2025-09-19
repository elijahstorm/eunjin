"use client";

/**
 * CODE INSIGHT
 * This code's use case is an onboarding checklist page for first-time users to prepare the app: test microphone input, set up consent templates, optionally connect Zoom/Teams integrations, and then proceed to create a new session. It focuses solely on main content (layout already provides header/footer/sidebar) and links to relevant sections across the app.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

type MicPermission = "prompt" | "granted" | "denied" | "unsupported";

function useOnline() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}

function useMicTest() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const [permission, setPermission] = useState<MicPermission>("prompt");
  const [volume, setVolume] = useState(0); // 0..1
  const [error, setError] = useState<string | null>(null);
  const [healthy, setHealthy] = useState(false);
  const [sampledFrames, setSampledFrames] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const listDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    const mics = list.filter((d) => d.kind === "audioinput");
    setDevices(mics);
    return mics;
  }, []);

  // Restore preferred device
  useEffect(() => {
    try {
      const stored = localStorage.getItem("preferredMicId");
      if (stored) setSelectedDeviceId(stored);
    } catch {}
  }, []);

  // Browser support check
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
    }
  }, []);

  // Keep devices updated
  useEffect(() => {
    listDevices();
    const handler = () => listDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [listDevices]);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      analyserRef.current?.disconnect();
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
      setError("브라우저가 마이크 접근을 지원하지 않습니다.");
      return;
    }
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermission("granted");
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ac;
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);
      let healthyCount = 0;
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        // Compute RMS from time-domain data [0..255], center 128
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128; // -1..1
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length); // 0..1
        setVolume(rms);
        setSampledFrames((p) => p + 1);
        if (rms > 0.02) healthyCount += 1; // any non-silence
        if (healthyCount >= 5) setHealthy(true);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setRunning(true);
      // Update device labels (some browsers need active permission to reveal labels)
      listDevices();
    } catch (e: any) {
      if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
        setPermission("denied");
        setError("마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.");
      } else if (e && e.name === "NotFoundError") {
        setError("사용 가능한 마이크를 찾을 수 없습니다.");
      } else {
        setError("마이크 초기화 중 오류가 발생했습니다.");
      }
      cleanup();
      setRunning(false);
    }
  }, [cleanup, listDevices, selectedDeviceId]);

  const stop = useCallback(() => {
    cleanup();
    setRunning(false);
  }, [cleanup]);

  const toggle = useCallback(() => {
    if (running) stop();
    else start();
  }, [running, start, stop]);

  const selectDevice = useCallback((id: string) => {
    setSelectedDeviceId(id || undefined);
    try {
      if (id) localStorage.setItem("preferredMicId", id);
      else localStorage.removeItem("preferredMicId");
    } catch {}
    if (running) {
      // restart with new device
      stop();
      setTimeout(() => start(), 50);
    }
  }, [running, start, stop]);

  useEffect(() => () => cleanup(), [cleanup]);

  const statusText = useMemo(() => {
    if (permission === "unsupported") return "지원되지 않음";
    if (permission === "denied") return "권한 거부됨";
    if (running) return healthy ? "입력 감지됨" : "대기 중";
    return permission === "granted" ? "준비됨" : "권한 필요";
  }, [permission, running, healthy]);

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    running,
    toggle,
    start,
    stop,
    volume,
    statusText,
    permission,
    error,
    healthy,
    sampledFrames,
  } as const;
}

export default function OnboardingPage() {
  const online = useOnline();
  const {
    devices,
    selectedDeviceId,
    selectDevice,
    running,
    toggle,
    stop,
    volume,
    statusText,
    permission,
    error,
    healthy,
    sampledFrames,
  } = useMicTest();

  const volumePct = Math.min(100, Math.max(0, Math.round(volume * 100)));

  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-8">
      {!online && (
        <div className="mb-6">
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
            <AlertTitle>오프라인 모드</AlertTitle>
            <AlertDescription>
              현재 네트워크 연결이 없습니다. 연결이 복구되면 통합 및 세션 생성 기능을 사용할 수 있습니다.
              <span className="ml-2 underline">
                <Link href="/offline">자세히 보기</Link>
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <section>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">빠른 시작 체크리스트</h1>
        <p className="mt-2 text-muted-foreground">
          첫 사용 설정을 완료하고 바로 회의/강의를 시작하세요. 필요 시 가이드는
          <Link href="/help" className="ml-1 underline">도움말</Link>에서 확인할 수 있습니다.
        </p>
      </section>

      <Separator className="my-6" />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Step 1: Microphone test */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">1) 마이크 테스트</h2>
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
              healthy ? "bg-green-600/10 text-green-700 dark:text-green-400" : "bg-amber-600/10 text-amber-700 dark:text-amber-400"
            )}>
              {healthy ? "완료" : "필요"}
            </span>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            사용 중인 입력 장치를 확인하고 음성 입력이 감지되는지 확인하세요. 권한 허용이 필요할 수 있습니다.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium">입력 장치</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedDeviceId ?? ""}
              onChange={(e) => selectDevice(e.target.value)}
            >
              <option value="">기본 마이크</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `마이크 (${d.deviceId.slice(0, 6)}…)`}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">상태: {statusText}</div>
              <button
                onClick={toggle}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  running ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
                  "hover:opacity-90"
                )}
              >
                {running ? "중지" : "테스트 시작"}
              </button>
            </div>

            <div className="mt-1">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>입력 레벨</span>
                <span>{volumePct}%</span>
              </div>
              <div className="h-3 w-full rounded-md bg-muted">
                <div
                  className={cn(
                    "h-3 rounded-md transition-[width]",
                    volumePct > 60 ? "bg-green-500" : volumePct > 20 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.max(4, volumePct)}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={volumePct}
                  role="progressbar"
                />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {sampledFrames < 10 ? "분석 초기화 중…" : healthy ? "정상적으로 음성이 감지되고 있습니다." : "마이크에 대고 말해 보세요."}
              </div>
            </div>

            {(permission === "denied" || permission === "unsupported" || error) && (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle>마이크 문제</AlertTitle>
                <AlertDescription>
                  {permission === "unsupported"
                    ? "브라우저가 마이크 권한을 지원하지 않습니다. 최신 버전의 Chrome/Edge/Firefox를 권장합니다."
                    : error || "마이크 접근이 거부되었습니다. 브라우저 주소창의 권한 설정을 확인하세요."}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/settings/devices" className="underline text-muted-foreground hover:text-foreground">
                장치 설정
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/help" className="underline text-muted-foreground hover:text-foreground">
                트러블슈팅 가이드
              </Link>
            </div>
          </div>
        </div>

        {/* Step 2: Consent setup */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">2) 동의서 템플릿 설정</h2>
            <span className="inline-flex items-center rounded-full bg-amber-600/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">권장</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            녹음·전사에 대한 동의가 필요한 경우, 공유 가능한 동의서 템플릿을 생성하고 관리하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/consent" className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">동의서 라이브러리</Link>
            <Link href="/consent/new" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">새 동의서 만들기</Link>
            <Link href="/consent/[consentId]" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">예시 상세 보기</Link>
          </div>
          <Collapsible className="mt-4">
            <CollapsibleTrigger className="text-xs underline text-muted-foreground hover:text-foreground">
              보안 및 보존 정책 설정 안내
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                <p>조직 차원의 보안 및 보존 정책을 설정해 데이터 거버넌스를 강화하세요.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/org/security" className="rounded-md border px-2 py-1 hover:bg-accent hover:text-accent-foreground">보안 설정</Link>
                  <Link href="/org/retention" className="rounded-md border px-2 py-1 hover:bg-accent hover:text-accent-foreground">보존 기간</Link>
                  <Link href="/legal/privacy" className="rounded-md border px-2 py-1 hover:bg-accent hover:text-accent-foreground">개인정보 처리방침</Link>
                  <Link href="/legal/terms" className="rounded-md border px-2 py-1 hover:bg-accent hover:text-accent-foreground">이용약관</Link>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Step 3: Integrations */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">3) Zoom / Teams 연동 (선택)</h2>
            <span className="inline-flex items-center rounded-full bg-slate-700/10 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300">선택</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            회의 종료 후 녹음 파일을 자동으로 가져와 처리할 수 있도록 계정을 연결하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/integrations" className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">통합 관리</Link>
            <Link href="/integrations/zoom" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Zoom 연결</Link>
            <Link href="/integrations/teams" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Teams 연결</Link>
            <Link href="/integrations/zoom/linked" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Zoom 상태</Link>
            <Link href="/integrations/teams/linked" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Teams 상태</Link>
          </div>
          {!online && (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>네트워크 필요</AlertTitle>
              <AlertDescription>연동을 위해 인터넷 연결이 필요합니다.</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Step 4: Ready to start */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">4) 시작하기</h2>
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
              healthy ? "bg-green-600/10 text-green-700 dark:text-green-400" : "bg-amber-600/10 text-amber-700 dark:text-amber-400"
            )}>
              {healthy ? "권장 설정 완료" : "마이크 점검 권장"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            준비가 되었다면 새 세션을 생성하거나 기존 녹음을 업로드하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sessions/new" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">새 세션 시작</Link>
            <Link href="/ingest/upload" className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">녹음 업로드</Link>
            <Link href="/dashboard" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">대시보드</Link>
            <Link href="/sessions" className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">모든 세션</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/me" className="underline text-muted-foreground hover:text-foreground">내 계정</Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/settings/profile" className="underline text-muted-foreground hover:text-foreground">프로필 설정</Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/settings/notifications" className="underline text-muted-foreground hover:text-foreground">알림 설정</Link>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-base font-medium">유용한 바로가기</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
          <Link href="/sessions/[sessionId]/live" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">라이브 전사 보기</Link>
          <Link href="/sessions/[sessionId]/transcript" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">전사 상세</Link>
          <Link href="/sessions/[sessionId]/highlights" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">하이라이트</Link>
          <Link href="/sessions/[sessionId]/summary" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">요약본</Link>
          <Link href="/sessions/[sessionId]/exports" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">내보내기</Link>
          <Link href="/sessions/[sessionId]/settings" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">세션 설정</Link>
          <Link href="/imports" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">가져오기 목록</Link>
          <Link href="/admin" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">관리자</Link>
          <Link href="/admin/metrics" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">지표</Link>
          <Link href="/admin/jobs" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">백그라운드 작업</Link>
          <Link href="/admin/costs" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">비용 추적</Link>
          <Link href="/ingest" className="rounded-md border px-3 py-2 hover:bg-accent hover:text-accent-foreground">인입 홈</Link>
        </div>
      </section>

      <div className="mt-8 text-center">
        <button
          onClick={() => stop()}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          테스트 중지
        </button>
      </div>
    </main>
  );
}
