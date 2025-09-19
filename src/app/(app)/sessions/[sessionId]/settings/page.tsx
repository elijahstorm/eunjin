"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Session Settings page for a specific session.
 * It provides UI to edit session metadata: title, organizer, consent status, retention override,
 * and a danger-zone delete action. It links to Org Retention and Consent template pages for
 * organization-wide settings. No server/database calls are made here; state is managed on the client
 * and persisted to localStorage keyed by the sessionId. The layout already provides header/footer/sidebar.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type ConsentStatus = "not_required" | "pending" | "obtained";

interface SessionSettings {
  title: string;
  organizer: string;
  consentStatus: ConsentStatus;
  retentionOverrideEnabled: boolean;
  retentionDays: number;
}

export default function SessionSettingsPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";

  const storageKey = useMemo(() => `session_settings_${sessionId}`, [sessionId]);

  const defaultSettings: SessionSettings = useMemo(
    () => ({
      title: "",
      organizer: "",
      consentStatus: "pending",
      retentionOverrideEnabled: false,
      retentionDays: 30,
    }),
    []
  );

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SessionSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<SessionSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Load settings from localStorage if present
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as SessionSettings;
        setSettings(parsed);
        setOriginalSettings(parsed);
      } else {
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
      }
    } catch {
      setSettings(defaultSettings);
      setOriginalSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(originalSettings), [settings, originalSettings]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof SessionSettings, string>> = {};
    if (!settings.title || settings.title.trim().length < 2) {
      e.title = "제목은 2자 이상 입력해 주세요.";
    }
    if (settings.retentionOverrideEnabled) {
      if (!Number.isFinite(settings.retentionDays) || settings.retentionDays <= 0) {
        e.retentionDays = "보존 기간은 1 이상의 숫자여야 합니다.";
      }
      if (settings.retentionDays > 3650) {
        e.retentionDays = "보존 기간은 10년(3650일) 이하로 설정해 주세요.";
      }
    }
    return e;
  }, [settings]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(settings));
      }
      setOriginalSettings(settings);
      setSaveSuccess("세션 설정이 저장되었습니다.");
      setTimeout(() => {
        if (mounted.current) setSaveSuccess(null);
      }, 3000);
    } catch (err) {
      setSaveError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Remove any locally stored settings for this session.
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
      // Redirect to sessions list after deletion
      router.push("/sessions");
    } finally {
      setDeleting(false);
    }
  };

  const sessionBasePath = `/sessions/${sessionId}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">세션 설정</h1>
          <p className="text-sm text-muted-foreground">세션 ID: {sessionId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">도움말</Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || Object.keys(errors).length > 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm",
              "bg-primary text-primary-foreground hover:opacity-90",
              (saving || !dirty || Object.keys(errors).length > 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving && (
              <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground/50 border-t-transparent animate-spin" />
            )}
            변경사항 저장
          </button>
        </div>
      </div>

      <nav className="w-full overflow-x-auto">
        <ul className="flex items-center gap-2 text-sm">
          <li>
            <Link href={sessionBasePath} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">개요</Link>
          </li>
          <li>
            <Link href={`${sessionBasePath}/live`} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">라이브</Link>
          </li>
          <li>
            <Link href={`${sessionBasePath}/transcript`} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">전사본</Link>
          </li>
          <li>
            <Link href={`${sessionBasePath}/highlights`} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">하이라이트</Link>
          </li>
          <li>
            <Link href={`${sessionBasePath}/upload-highlights`} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">하이라이트 업로드</Link>
          </li>
          <li>
            <Link href={`${sessionBasePath}/summary`} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">요약</Link>
          </li>
          <li>
            <Link href={`${sessionBasePath}/exports`} className="inline-flex items-center rounded-md px-3 py-2 border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground">내보내기</Link>
          </li>
          <li>
            <span className="inline-flex items-center rounded-md px-3 py-2 border bg-primary text-primary-foreground">설정</span>
          </li>
        </ul>
      </nav>

      {saveSuccess && (
        <Alert className="border-green-600/40 bg-green-600/10">
          <AlertTitle>저장됨</AlertTitle>
          <AlertDescription>{saveSuccess}</AlertDescription>
        </Alert>
      )}
      {saveError && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium">기본 정보</h2>
            <p className="text-sm text-muted-foreground">세션 제목과 주최자 정보를 설정합니다.</p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">제목</label>
              {loading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <input
                  id="title"
                  type="text"
                  placeholder="예: 2025-1 데이터사이언스 강의 3주차"
                  value={settings.title}
                  onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                  className={cn(
                    "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    errors.title && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              )}
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="grid gap-2">
              <label htmlFor="organizer" className="text-sm font-medium">주최자</label>
              {loading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <input
                  id="organizer"
                  type="text"
                  placeholder="이름 또는 조직"
                  value={settings.organizer}
                  onChange={(e) => setSettings((s) => ({ ...s, organizer: e.target.value }))}
                  className={cn(
                    "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                />
              )}
              <p className="text-xs text-muted-foreground">주최자는 전사/요약 문서의 메타데이터에 포함됩니다.</p>
            </div>
          </div>
        </div>
        <Separator />
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium">녹음 동의(Consent)</h2>
            <p className="text-sm text-muted-foreground">세션별 동의 요구 여부를 설정합니다. 템플릿 관리는 별도 페이지에서 할 수 있습니다.</p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="consentStatus" className="text-sm font-medium">동의 상태</label>
              {loading ? (
                <Skeleton className="h-10 w-60 rounded-md" />
              ) : (
                <select
                  id="consentStatus"
                  value={settings.consentStatus}
                  onChange={(e) => setSettings((s) => ({ ...s, consentStatus: e.target.value as ConsentStatus }))}
                  className={cn(
                    "h-10 w-full sm:w-60 rounded-md border bg-background px-3 text-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <option value="not_required">요구 안 함</option>
                  <option value="pending">요구됨 - 보류</option>
                  <option value="obtained">동의 획득</option>
                </select>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                템플릿 구성은 <Link className="underline underline-offset-4 hover:text-foreground" href="/consent">Consent 템플릿</Link>에서 관리하세요.
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium">보존 기간 재정의</h2>
            <p className="text-sm text-muted-foreground">조직 기본 정책을 세션 단위로 재정의합니다.</p>
          </div>
          <div className="space-y-3">
            <label className="inline-flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={settings.retentionOverrideEnabled}
                onChange={(e) => setSettings((s) => ({ ...s, retentionOverrideEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              이 세션에서 별도의 보존 기간 사용
            </label>
            <div className={cn("grid gap-2 sm:grid-cols-[200px_1fr] items-center", !settings.retentionOverrideEnabled && "opacity-50")}> 
              <label htmlFor="retentionDays" className="text-sm font-medium">보존 일수</label>
              {loading ? (
                <Skeleton className="h-10 w-32 rounded-md" />
              ) : (
                <input
                  id="retentionDays"
                  type="number"
                  min={1}
                  max={3650}
                  disabled={!settings.retentionOverrideEnabled}
                  value={settings.retentionDays}
                  onChange={(e) => setSettings((s) => ({ ...s, retentionDays: Number(e.target.value) }))}
                  className={cn(
                    "h-10 w-40 rounded-md border bg-background px-3 text-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    settings.retentionOverrideEnabled && errors.retentionDays && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              )}
            </div>
            {settings.retentionOverrideEnabled && errors.retentionDays && (
              <p className="text-sm text-destructive">{errors.retentionDays}</p>
            )}
            <p className="text-xs text-muted-foreground">
              조직 기본 정책은 <Link className="underline underline-offset-4 hover:text-foreground" href="/org/retention">조직 보존 정책</Link>에서 확인 및 변경할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-destructive">위험 구역</h2>
            <p className="text-sm text-muted-foreground">세션을 삭제하면 되돌릴 수 없습니다. 관련 녹음, 전사, 요약 및 하이라이트가 제거될 수 있습니다.</p>
          </div>

          <Collapsible open={deleteOpen} onOpenChange={setDeleteOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm",
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  )}
                >
                  세션 삭제
                </button>
              </CollapsibleTrigger>
              <span className="text-xs text-muted-foreground">영구 삭제 전에 확인이 필요합니다</span>
            </div>
            <CollapsibleContent>
              <div className="mt-4 rounded-md border p-4 space-y-3 bg-background">
                <p className="text-sm">삭제를 확인하려면 아래 입력란에 대문자로 DELETE를 입력하세요.</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium border hover:bg-accent hover:text-accent-foreground"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteConfirmText !== "DELETE" || deleting}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm",
                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                      (deleteConfirmText !== "DELETE" || deleting) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {deleting && (
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-destructive-foreground/50 border-t-transparent animate-spin" />
                    )}
                    영구 삭제
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">삭제 후에는 복구할 수 없습니다. 필요 시 <Link className="underline underline-offset-4" href={`${sessionBasePath}/exports`}>내보내기</Link>에서 데이터를 백업하세요.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          더 많은 설정은 <Link className="underline underline-offset-4 hover:text-foreground" href="/integrations">통합 설정</Link> 또는 <Link className="underline underline-offset-4 hover:text-foreground" href="/org/settings">조직 설정</Link>에서 관리할 수 있습니다.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(sessionBasePath)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium border hover:bg-accent hover:text-accent-foreground"
          >
            세션으로 돌아가기
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || Object.keys(errors).length > 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm",
              "bg-primary text-primary-foreground hover:opacity-90",
              (saving || !dirty || Object.keys(errors).length > 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving && (
              <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground/50 border-t-transparent animate-spin" />
            )}
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
}
