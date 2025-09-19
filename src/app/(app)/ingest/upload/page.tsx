"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Local File Upload page for ingesting audio/video files.
 * It provides a drag-and-drop uploader, validates files, captures basic session metadata (title, language, diarization),
 * and on submit, creates a client-side pending import payload and navigates to /imports or /imports/[importId] to track processing.
 * No server/database calls are made here due to schema constraints; integration is expected via subsequent pages or API routes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

type SelectedFile = {
  id: string;
  file: File;
  kind: "audio" | "video";
  duration?: number | null;
  error?: string | null;
};

const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB per file
const ACCEPT_TYPES = "audio/*,video/*";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${value} ${sizes[i]}`;
}

function formatDuration(totalSeconds?: number | null) {
  if (totalSeconds == null || !isFinite(totalSeconds)) return "–";
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const hh = h > 0 ? `${h.toString().padStart(2, "0")}:` : "";
  return `${hh}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

async function probeMediaDuration(file: File): Promise<number | null> {
  try {
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith("audio/");
    const mediaEl = document.createElement(isAudio ? "audio" : "video");
    mediaEl.preload = "metadata";
    return await new Promise<number | null>((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(url);
      };
      mediaEl.onloadedmetadata = () => {
        const d = isFinite(mediaEl.duration) ? mediaEl.duration : null;
        cleanup();
        resolve(d);
      };
      mediaEl.onerror = () => {
        cleanup();
        resolve(null);
      };
      mediaEl.src = url;
    });
  } catch (_) {
    return null;
  }
}

export default function UploadIngestPage() {
  const router = useRouter();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [language, setLanguage] = useState("ko-KR");
  const [diarization, setDiarization] = useState(true);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.file.size, 0), [files]);

  const validateAndPrepare = useCallback(async (incoming: FileList | File[]) => {
    const errs: string[] = [];
    const current = [...files];
    const existingKeys = new Set(current.map((f) => `${f.file.name}:${f.file.size}:${f.file.lastModified}`));

    const addQueue: SelectedFile[] = [];
    for (const file of Array.from(incoming)) {
      const k = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingKeys.has(k)) continue; // skip duplicates
      if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
        errs.push(`${file.name}: 지원되지 않는 형식입니다.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errs.push(`${file.name}: 최대 파일 크기(2GB)를 초과했습니다.`);
        continue;
      }
      addQueue.push({
        id: crypto.randomUUID(),
        file,
        kind: file.type.startsWith("audio/") ? "audio" : "video",
        duration: null,
        error: null,
      });
    }

    const allowedCount = Math.max(0, MAX_FILES - current.length);
    const toAdd = addQueue.slice(0, allowedCount);
    if (addQueue.length > allowedCount) {
      errs.push(`최대 ${MAX_FILES}개 파일까지만 추가할 수 있습니다.`);
    }

    // Probe durations sequentially to avoid memory spikes
    for (let i = 0; i < toAdd.length; i++) {
      const d = await probeMediaDuration(toAdd[i].file);
      toAdd[i].duration = d;
    }

    const updated = [...current, ...toAdd];
    setFiles(updated);
    setErrors((prev) => [...prev, ...errs]);
  }, [files]);

  const onFileInputChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(async (e) => {
    if (!e.target.files) return;
    await validateAndPrepare(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }, [validateAndPrepare]);

  const onDrop = useCallback<React.DragEventHandler<HTMLLabelElement>>(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.items && dt.items.length) {
      const files: File[] = [];
      for (const item of Array.from(dt.items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) await validateAndPrepare(files);
    } else if (dt.files && dt.files.length) {
      await validateAndPrepare(dt.files);
    }
  }, [validateAndPrepare]);

  const onDragOver = useCallback<React.DragEventHandler<HTMLLabelElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback<React.DragEventHandler<HTMLLabelElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const canSubmit = files.length > 0 && isOnline && !importing;

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setImporting(true);
    try {
      const importId = crypto.randomUUID();
      const payload = {
        id: importId,
        createdAt: new Date().toISOString(),
        status: "queued",
        source: "local-upload",
        session: {
          title: sessionTitle.trim() || `로컬 가져오기 - ${new Date().toLocaleString()}`,
          language,
          diarization,
        },
        files: files.map((f) => ({
          id: f.id,
          name: f.file.name,
          size: f.file.size,
          type: f.file.type,
          lastModified: f.file.lastModified,
          kind: f.kind,
          duration: f.duration ?? null,
        })),
      };

      try {
        sessionStorage.setItem(`pending-import:${importId}`, JSON.stringify(payload));
        const recentKey = "recent-import-ids";
        const prev = JSON.parse(sessionStorage.getItem(recentKey) || "[]");
        if (Array.isArray(prev)) {
          const next = [importId, ...prev.filter((x) => x !== importId)].slice(0, 20);
          sessionStorage.setItem(recentKey, JSON.stringify(next));
        } else {
          sessionStorage.setItem(recentKey, JSON.stringify([importId]));
        }
      } catch (_) {
        // If storage fails, continue with navigation to list
      }

      // Prefer navigating to the specific import page
      router.push(`/imports/${importId}`);
    } catch (e) {
      setErrors((prev) => [...prev, "가져오기 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."]);
      setImporting(false);
    }
  }, [canSubmit, diarization, files, language, router, sessionTitle]);

  return (
    <div className="w-full space-y-8 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">로컬 파일 업로드</h1>
        <p className="text-sm text-muted-foreground">오디오/비디오 파일을 업로드하여 전사 및 요약을 생성합니다. 업로드 후 진행 상황은 가져오기 대시보드에서 확인하세요.</p>
      </div>

      {!isOnline && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertTitle>오프라인 상태</AlertTitle>
          <AlertDescription>
            현재 오프라인입니다. 네트워크 연결 후 다시 시도해주세요. 오프라인 지원 안내는 <Link href="/offline" className="underline underline-offset-4">오프라인 페이지</Link>를 참고하세요.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-medium">파일 선택</h2>
              {files.length > 0 && (
                <button onClick={clearAll} className="text-sm text-muted-foreground hover:text-foreground transition-colors">모두 지우기</button>
              )}
            </div>

            <label
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer text-center",
                dragActive ? "border-primary/60 bg-primary/5" : "border-border hover:bg-accent/30"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_TYPES}
                multiple
                onChange={onFileInputChange}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="text-lg font-medium">여기에 파일을 드래그 앤 드롭하거나 클릭하여 선택</div>
                <p className="text-sm text-muted-foreground">지원 형식: 오디오/비디오, 최대 {MAX_FILES}개, 파일당 최대 2GB</p>
                <div className="text-xs text-muted-foreground">녹음 동의가 필요한 경우 <Link href="/consent/new" className="underline underline-offset-4">동의서 생성</Link> 후 업로드하세요.</div>
              </div>
            </label>

            {files.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">선택됨: {files.length}개 • 총 용량 {formatBytes(totalSize)}</div>
                </div>
                <ul className="divide-y rounded-md border">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-4 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            f.kind === "audio" ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground"
                          )}>
                            {f.kind === "audio" ? "오디오" : "비디오"}
                          </span>
                          <span className="truncate font-medium">{f.file.name}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatBytes(f.file.size)} • 길이 {formatDuration(f.duration)}
                        </div>
                      </div>
                      <button
                        className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60"
                        onClick={() => removeFile(f.id)}
                        aria-label={`${f.file.name} 제거`}
                      >
                        제거
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="space-y-2">
              {errors.map((err, idx) => (
                <Alert key={idx} variant="destructive" className="border-destructive/30">
                  <AlertTitle>업로드 오류</AlertTitle>
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="text-base font-medium mb-3">세션 설정</h3>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="sessionTitle" className="text-sm text-muted-foreground">세션 제목(선택)</label>
                  <input
                    id="sessionTitle"
                    type="text"
                    placeholder="예: 2025-09- 팀 주간회의"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="language" className="text-sm text-muted-foreground">언어</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="ko-KR">한국어 (ko-KR)</option>
                    <option value="en-US">English (en-US)</option>
                    <option value="ja-JP">日本語 (ja-JP)</option>
                    <option value="zh-CN">中文 (zh-CN)</option>
                    <option value="de-DE">Deutsch (de-DE)</option>
                    <option value="fr-FR">Français (fr-FR)</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="diarization"
                    type="checkbox"
                    checked={diarization}
                    onChange={(e) => setDiarization(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                  />
                  <label htmlFor="diarization" className="text-sm">화자 분리(스피커 다이아리제이션) 활성화</label>
                </div>

                <Alert className="border-border">
                  <AlertTitle className="text-sm">개인정보 및 동의</AlertTitle>
                  <AlertDescription className="text-sm">
                    업로드 전에 참석자에게 녹음·처리 동의를 받았는지 확인하세요. <Link href="/legal/privacy" className="underline underline-offset-4">개인정보 처리방침</Link> 및 <Link href="/consent/new" className="underline underline-offset-4">동의서 생성</Link>
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className={cn(
                  "w-full h-10 rounded-md text-sm font-medium transition-colors",
                  canSubmit ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {importing ? "가져오기 생성 중..." : files.length > 0 ? `가져오기 시작 (${files.length}개)` : "파일을 선택하세요"}
              </button>
              <div className="text-xs text-muted-foreground">
                업로드 후 상태는 <Link href="/imports" className="underline underline-offset-4">가져오기 목록</Link>에서 확인할 수 있습니다.
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 sm:p-6 space-y-4">
            <h3 className="text-base font-medium">다른 가져오기 옵션</h3>
            <ul className="space-y-2 text-sm">
              <li>
                Zoom 녹음 연동: <Link href="/integrations/zoom" className="underline underline-offset-4">계정 연결</Link> → <Link href="/integrations/zoom/linked" className="underline underline-offset-4">가져오기</Link>
              </li>
              <li>
                Microsoft Teams 녹음: <Link href="/integrations/teams" className="underline underline-offset-4">계정 연결</Link> → <Link href="/integrations/teams/linked" className="underline underline-offset-4">가져오기</Link>
              </li>
              <li>
                실시간 세션 시작: <Link href="/sessions/new" className="underline underline-offset-4">새 세션</Link> 또는 진행 중 <Link href="/sessions" className="underline underline-offset-4">세션 목록</Link>
              </li>
              <li>
                마이크·장치 점검: <Link href="/settings/devices" className="underline underline-offset-4">장치 설정</Link>
              </li>
              <li>
                보존 기간 및 비용 관리: <Link href="/org/retention" className="underline underline-offset-4">보존 정책</Link>
              </li>
              <li>
                도움말 센터: <Link href="/help" className="underline underline-offset-4">업로드 안내</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-medium">다음 단계</h3>
            <p className="text-sm text-muted-foreground">업로드 후 전사/요약 진행 상황을 추적하고, 완료되면 세션 페이지에서 하이라이트와 요약을 확인하세요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/imports" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/50">가져오기</Link>
            <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/50">대시보드</Link>
            <Link href="/sessions" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/50">세션</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
