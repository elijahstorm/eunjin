"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a production-ready Live Capture UI for a session.
 * It enables start/stop microphone capture, visual mic level meter, real-time captions (via Web Speech API when available),
 * a Highlight button that stores timestamped highlights, and quick navigation links to the Transcript and Summary pages.
 * It avoids server/database calls and persists live artifacts locally per session to ensure resilience and offline support.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

// Types for Web Speech API
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
  length: number;
}
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

type RecognitionType = (typeof window extends any
  ? (window & {
      webkitSpeechRecognition?: any;
      SpeechRecognition?: any;
    })
  : any) & Window;

function formatTime(ms: number) {
  if (!Number.isFinite(ms)) return "00:00";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function bytesToSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function LiveCapturePage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "unknown";

  const [isRecording, setIsRecording] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState(0); // 0..1 RMS
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bytesRecorded, setBytesRecorded] = useState(0);

  const [highlights, setHighlights] = useState<{ t: number; note?: string; id: string }[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [highlightToast, setHighlightToast] = useState<string | null>(null);

  const [captionsSupported, setCaptionsSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const [captions, setCaptions] = useState<{ t: number; text: string }[]>([]);
  const [lang, setLang] = useState("ko-KR");
  const [autoPauseHidden, setAutoPauseHidden] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any | null>(null);

  const localKeys = useMemo(() => {
    return {
      captions: `live:${sessionId}:captions`,
      highlights: `live:${sessionId}:highlights`,
      meta: `live:${sessionId}:meta`,
    } as const;
  }, [sessionId]);

  // Load persisted local data on mount
  useEffect(() => {
    try {
      const capsRaw = localStorage.getItem(localKeys.captions);
      if (capsRaw) {
        const caps = JSON.parse(capsRaw) as { t: number; text: string }[];
        setCaptions(caps);
      }
      const hlRaw = localStorage.getItem(localKeys.highlights);
      if (hlRaw) {
        const hls = JSON.parse(hlRaw) as { t: number; note?: string; id: string }[];
        setHighlights(hls);
      }
      const metaRaw = localStorage.getItem(localKeys.meta);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw) as { lang?: string; autoPauseHidden?: boolean };
        if (meta?.lang) setLang(meta.lang);
        if (typeof meta?.autoPauseHidden === "boolean") setAutoPauseHidden(meta.autoPauseHidden);
      }
    } catch {}
  }, [localKeys]);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(localKeys.captions, JSON.stringify(captions.slice(-5000)));
    } catch {}
  }, [captions, localKeys]);

  useEffect(() => {
    try {
      localStorage.setItem(localKeys.highlights, JSON.stringify(highlights.slice(-2000)));
    } catch {}
  }, [highlights, localKeys]);

  useEffect(() => {
    try {
      localStorage.setItem(localKeys.meta, JSON.stringify({ lang, autoPauseHidden }));
    } catch {}
  }, [lang, autoPauseHidden, localKeys]);

  // Online/offline tracking
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Enumerate devices
  const enumerate = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const mics = devs.filter((d) => d.kind === "audioinput");
      setDevices(mics);
      if (!selectedDeviceId && mics.length > 0) {
        setSelectedDeviceId(mics[0].deviceId);
      }
    } catch {}
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    enumerate();
    const handler = () => enumerate();
    navigator.mediaDevices.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handler);
  }, [enumerate]);

  // Mic level loop
  const startLevelLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 2));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Setup audio capture
  const initAudio = useCallback(async () => {
    setPermissionError(null);
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

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      startLevelLoop();

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];
      setBytesRecorded(0);
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
          setBytesRecorded((prev) => prev + ev.data.size);
        }
      };
      recorder.start(1000);
    } catch (err: any) {
      setPermissionError(err?.message || "마이크 접근에 실패했습니다.");
      throw err;
    }
  }, [selectedDeviceId, startLevelLoop]);

  // Real-time captions via Web Speech API (when available)
  const ensureRecognition = useCallback(() => {
    const w = window as RecognitionType;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setCaptionsSupported(false);
      return null;
    }
    setCaptionsSupported(true);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    return rec;
  }, [lang]);

  const startRecognition = useCallback(() => {
    const rec = ensureRecognition();
    if (!rec) return;

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let interimText = "";
      let finalText = "";
      for (let i = e.results.length - 1; i >= 0; i--) {
        const result = e.results[i] as unknown as { isFinal: boolean; 0: { transcript: string } };
        if (result.isFinal) {
          finalText = result[0].transcript;
          break;
        } else if (!interimText) {
          interimText = result[0].transcript;
        }
      }
      if (finalText) {
        setCaptions((prev) => [...prev, { t: Date.now(), text: finalText }]);
        setInterim("");
      } else if (interimText) {
        setInterim(interimText);
      }
    };
    rec.onerror = () => {
      // attempt soft restart later
    };
    rec.onend = () => {
      if (isRecording) {
        try {
          rec.start();
        } catch {}
      }
    };
    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {}
  }, [ensureRecognition, isRecording]);

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch {}
    }
    recognitionRef.current = null;
    setInterim("");
  }, []);

  const clearAudio = useCallback(() => {
    stopLevelLoop();
    const rec = recorderRef.current;
    try {
      if (rec && rec.state !== "inactive") rec.stop();
    } catch {}
    recorderRef.current = null;

    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;

    const ctx = audioContextRef.current;
    try {
      ctx?.close();
    } catch {}
    audioContextRef.current = null;
    analyserRef.current = null;
  }, [stopLevelLoop]);

  const handleStart = useCallback(async () => {
    if (isRecording) return;
    await initAudio();
    startRecognition();
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setIsRecording(true);
  }, [initAudio, isRecording, startRecognition]);

  const handleStop = useCallback(() => {
    if (!isRecording) return;
    stopRecognition();
    clearAudio();
    if (startTimeRef.current) {
      const diff = Date.now() - startTimeRef.current;
      setElapsedMs(diff);
    }
    setIsRecording(false);
  }, [clearAudio, isRecording, stopRecognition]);

  const handleEndAndSummarize = useCallback(() => {
    setIsEnding(true);
    if (isRecording) handleStop();
    // mark end meta
    try {
      localStorage.setItem(
        localKeys.meta,
        JSON.stringify({ lang, autoPauseHidden, endedAt: Date.now() })
      );
    } catch {}
    // small delay to ensure UI updates
    setTimeout(() => {
      router.push(`/sessions/${sessionId}/summary`);
    }, 200);
  }, [autoPauseHidden, handleStop, isRecording, lang, localKeys.meta, router, sessionId]);

  // Timer
  useEffect(() => {
    if (!isRecording || !startTimeRef.current) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - (startTimeRef.current as number));
    }, 500);
    return () => clearInterval(id);
  }, [isRecording]);

  // Auto-pause when tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && autoPauseHidden && isRecording) {
        stopRecognition();
      } else if (!document.hidden && autoPauseHidden && isRecording) {
        startRecognition();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [autoPauseHidden, isRecording, startRecognition, stopRecognition]);

  // Detect captions support once
  useEffect(() => {
    const w = window as RecognitionType;
    setCaptionsSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
      clearAudio();
    };
  }, [clearAudio, stopRecognition]);

  const handleHighlight = useCallback(() => {
    const t = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = { t, note: noteInput.trim() || undefined, id };
    setHighlights((prev) => [...prev, entry]);
    setNoteInput("");
    setHighlightToast("하이라이트가 저장되었습니다.");
    setTimeout(() => setHighlightToast(null), 1600);
  }, [noteInput]);

  const handleDeviceChange = useCallback(
    async (id: string) => {
      setSelectedDeviceId(id);
      if (isRecording) {
        // hot switch
        try {
          stopRecognition();
          clearAudio();
          await initAudio();
          startRecognition();
        } catch {}
      }
    },
    [clearAudio, initAudio, isRecording, startRecognition, stopRecognition]
  );

  const statusBadge = (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
        isRecording ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isRecording ? "bg-primary-foreground" : "bg-foreground/50"
        )}
      />
      {isRecording ? "녹음 중" : "정지됨"}
    </div>
  );

  const onlineBadge = (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[10px]",
        isOnline ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
      {isOnline ? "온라인" : "오프라인"}
    </div>
  );

  const meterWidth = `${Math.min(100, Math.round(level * 100))}%`;

  return (
    <div className="w-full h-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">라이브 캡처</h1>
          <p className="text-sm text-muted-foreground">세션 ID: {sessionId}</p>
        </div>
        <div className="flex items-center gap-2">
          {onlineBadge}
          {statusBadge}
        </div>
      </div>

      <Separator className="my-4" />

      {permissionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>마이크 권한 필요</AlertTitle>
          <AlertDescription>
            {permissionError} 브라우저 설정에서 마이크 권한을 허용해 주세요.
          </AlertDescription>
        </Alert>
      )}

      {!captionsSupported && (
        <Alert variant="default" className="mb-4">
          <AlertTitle>실시간 캡션</AlertTitle>
          <AlertDescription>
            브라우저에서 Web Speech API를 지원하지 않아 로컬 실시간 캡션이 제한됩니다. 그래도 오디오 캡처와 하이라이트 기능은 정상 동작합니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Live captions */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card text-card-foreground">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">실시간 캡션</span>
                <span className="text-xs text-muted-foreground">{lang}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/sessions/${sessionId}/transcript`}
                  className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:opacity-90"
                >
                  전사보기
                </Link>
                <Link
                  href={`/sessions/${sessionId}/highlights`}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground hover:opacity-90"
                >
                  하이라이트
                </Link>
              </div>
            </div>
            <Separator />
            <div className="max-h-[48vh] min-h-[36vh] overflow-auto p-4">
              {captions.length === 0 && !interim ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  아직 캡션이 없습니다. 녹음을 시작해 주세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {captions.slice(-200).map((c, i) => (
                    <div key={`${c.t}-${i}`} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {formatTime(startTimeRef.current ? c.t - (startTimeRef.current as number) : 0)}
                      </span>
                      <p className="text-sm leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                  {interim && (
                    <div className="flex items-start gap-3 opacity-70">
                      <span className="mt-0.5 shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {formatTime(elapsedMs)}
                      </span>
                      <p className="text-sm italic">{interim}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>경과시간: {formatTime(elapsedMs)}</span>
                <span>용량: {bytesToSize(bytesRecorded)}</span>
              </div>
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    onClick={handleStart}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    시작
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="rounded-md bg-muted px-4 py-2 text-sm font-medium hover:opacity-90"
                  >
                    일시정지
                  </button>
                )}
                <button
                  onClick={handleEndAndSummarize}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
                >
                  종료 및 요약으로 이동
                </button>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link
              href={`/sessions/${sessionId}/transcript`}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              • 라이브 전사 탭으로 이동
            </Link>
            <Link
              href={`/sessions/${sessionId}/summary`}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              • 요약 결과 확인
            </Link>
            <Link
              href={`/sessions/${sessionId}/upload-highlights`}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              • 하이라이트 파일 업로드
            </Link>
            <Link
              href={`/sessions/${sessionId}/exports`}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              • 결과물 내보내기 (PDF/TXT/DOCX)
            </Link>
            <Link
              href={`/integrations/zoom`}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              • Zoom 연동 설정
            </Link>
            <Link
              href={`/integrations/teams`}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              • Microsoft Teams 연동
            </Link>
          </div>
        </div>

        {/* Right: Controls & meter */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card text-card-foreground p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">마이크 상태</h2>
              <span className="text-xs text-muted-foreground">RMS {Math.round(level * 100)}%</span>
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-[width] duration-75"
                style={{ width: meterWidth }}
                aria-label="Mic level"
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs text-muted-foreground">오디오 입력 장치</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {devices.length === 0 && <option value="">장치 없음</option>}
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `마이크 (${d.deviceId.slice(0, 6)}...)`}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs text-muted-foreground">캡션 언어</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="ko-KR">한국어 (ko-KR)</option>
                <option value="en-US">English (en-US)</option>
                <option value="ja-JP">日本語 (ja-JP)</option>
                <option value="zh-CN">简体中文 (zh-CN)</option>
              </select>
            </div>

            <Collapsible className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">고급 설정</span>
                <CollapsibleTrigger asChild>
                  <button className="text-xs underline text-muted-foreground">펼치기/접기</button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">탭이 숨겨지면 캡션 일시정지</span>
                    <input
                      type="checkbox"
                      checked={autoPauseHidden}
                      onChange={(e) => setAutoPauseHidden(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>
                  <div className="text-xs text-muted-foreground">
                    안정적인 녹음을 위해 네트워크가 불안정할 때도 로컬에 버퍼링합니다. 페이지를 닫기 전 반드시 종료 버튼을 눌러 주세요.
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-4" />

            <div>
              <h3 className="text-sm font-semibold">하이라이트</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                회의 중 중요한 순간에 표시합니다. 타임스탬프와 함께 저장됩니다.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="메모 (선택)"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleHighlight}
                  className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  표시
                </button>
              </div>
              {highlightToast && (
                <div className="mt-2 text-xs text-green-600">{highlightToast}</div>
              )}
              <div className="mt-3 max-h-40 overflow-auto rounded-md border">
                {highlights.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">하이라이트가 없습니다.</div>
                ) : (
                  <ul className="divide-y">
                    {highlights.slice(-20).map((h) => (
                      <li key={h.id} className="flex items-center justify-between p-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {formatTime(h.t)}
                          </span>
                          <span className="truncate text-sm">{h.note || "중요 표시"}</span>
                        </div>
                        <Link
                          href={`/sessions/${sessionId}/highlights`}
                          className="text-xs text-primary underline"
                        >
                          보기
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Link
                href={`/sessions/${sessionId}/settings`}
                className="block rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                세션 설정
              </Link>
              <Link
                href={`/consent/new`}
                className="block rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                녹음 동의 수집
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          • 대시보드로 이동: <Link href="/dashboard" className="text-primary underline">/dashboard</Link> • 조직 설정: <Link href="/org/settings" className="text-primary underline">/org/settings</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sessions/${sessionId}/transcript`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            전사 탭 열기
          </Link>
          <button
            onClick={handleEndAndSummarize}
            disabled={isEnding}
            className={cn(
              "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
              isEnding && "opacity-70"
            )}
          >
            {isEnding ? "이동 중..." : "세션 종료 후 요약 보기"}
          </button>
        </div>
      </div>
    </div>
  );
}
