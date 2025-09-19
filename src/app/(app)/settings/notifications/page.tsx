"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Notification Preferences page where users manage email and realtime notification settings.
 * It emphasizes client-side persistence (localStorage) without database writes, provides push notification permission handling via the Web Notifications API,
 * shows links to related areas (/me, /dashboard, integrations, org settings), and offers a modern, accessible UI using Tailwind.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Preferences = {
  email: {
    session_start: boolean;
    session_end: boolean;
    transcript_ready: boolean;
    summary_ready: boolean;
    weekly_digest: boolean;
    product_updates: boolean;
  };
  realtime: {
    in_app_toast: boolean;
    sound: boolean;
    highlight_hotkey: boolean;
    push_enabled: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
};

const STORAGE_KEY = "notifications_prefs_v1";

const defaultPrefs = (): Preferences => ({
  email: {
    session_start: false,
    session_end: true,
    transcript_ready: true,
    summary_ready: true,
    weekly_digest: false,
    product_updates: false,
  },
  realtime: {
    in_app_toast: true,
    sound: false,
    highlight_hotkey: true,
    push_enabled: false,
  },
  quiet_hours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : "UTC",
  },
});

function loadPrefs(): Preferences {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw);
    return {
      ...defaultPrefs(),
      ...parsed,
      email: { ...defaultPrefs().email, ...(parsed?.email || {}) },
      realtime: { ...defaultPrefs().realtime, ...(parsed?.realtime || {}) },
      quiet_hours: { ...defaultPrefs().quiet_hours, ...(parsed?.quiet_hours || {}) },
    } as Preferences;
  } catch {
    return defaultPrefs();
  }
}

function savePrefs(p: Preferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function useNotificationPermission() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<"default" | "denied" | "granted">("default");

  useEffect(() => {
    const s = typeof window !== "undefined" && "Notification" in window;
    setSupported(!!s);
    if (s) {
      setPermission(Notification.permission);
    }
  }, []);

  const request = useCallback(async () => {
    if (!supported) return "denied" as const;
    const p = await Notification.requestPermission();
    setPermission(p);
    return p;
  }, [supported]);

  return { supported, permission, request };
}

function Toggle({
  checked,
  onChange,
  id,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-4 p-4 rounded-lg border bg-card", disabled && "opacity-60")}>      
      <button
        type="button"
        aria-pressed={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          checked ? "bg-primary" : "bg-input",
          disabled && "cursor-not-allowed"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      <div className="flex-1">
        <label id={`${id}-label`} htmlFor={id} className="block font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </div>
  );
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs());
  const [initialPrefs, setInitialPrefs] = useState<Preferences>(defaultPrefs());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [offline, setOffline] = useState<boolean>(false);

  const { supported: notificationsSupported, permission, request } = useNotificationPermission();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = loadPrefs();
        if (!mounted) return;
        setPrefs(saved);
        setInitialPrefs(saved);
        const { data } = await supabaseBrowser.auth.getUser();
        if (mounted) setUserEmail(data.user?.email ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const handleOnline = () => setOffline(!navigator.onLine);
    handleOnline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOnline);
    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOnline);
    };
  }, []);

  const dirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(initialPrefs), [prefs, initialPrefs]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      // Persist locally. In a future iteration, these would sync to Supabase via an API.
      savePrefs(prefs);
      setInitialPrefs(prefs);
      setSavedAt(Date.now());
      setBanner("알림 설정이 저장되었습니다.");
      setTimeout(() => setBanner(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const onReset = useCallback(() => {
    const d = defaultPrefs();
    setPrefs(d);
  }, []);

  // Quiet hours helper
  const isQuietNow = useMemo(() => {
    if (!prefs.quiet_hours.enabled) return false;
    try {
      const now = new Date();
      const [sh, sm] = prefs.quiet_hours.start.split(":").map(Number);
      const [eh, em] = prefs.quiet_hours.end.split(":").map(Number);
      const start = new Date(now);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(now);
      end.setHours(eh, em, 0, 0);
      if (end <= start) {
        // Overnight
        return now >= start || now <= end;
      }
      return now >= start && now <= end;
    } catch {
      return false;
    }
  }, [prefs.quiet_hours]);

  // Hotkey demo: Press "H" to simulate highlight toast
  const hotkeyAttached = useRef(false);
  useEffect(() => {
    if (!prefs.realtime.highlight_hotkey || hotkeyAttached.current) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h" && !e.repeat) {
        setBanner("하이라이트가 기록되었습니다 (데모)");
        setTimeout(() => setBanner(null), 1500);
      }
    };
    hotkeyAttached.current = true;
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      hotkeyAttached.current = false;
    };
  }, [prefs.realtime.highlight_hotkey]);

  const requestPushPermission = useCallback(async () => {
    const p = await request();
    const enable = p === "granted";
    setPrefs((prev) => ({ ...prev, realtime: { ...prev.realtime, push_enabled: enable } }));
  }, [request]);

  const sendTestNotification = useCallback(() => {
    if (typeof window === "undefined") return;
    if (notificationsSupported && permission === "granted") {
      try {
        new Notification("알림 테스트", {
          body: "브라우저 푸시 알림이 정상적으로 작동합니다.",
          tag: "test-notification",
        });
      } catch {
        setBanner("테스트 알림을 표시할 수 없습니다.");
        setTimeout(() => setBanner(null), 2000);
      }
    } else {
      setBanner("브라우저 권한이 필요합니다. \"브라우저 알림 활성화\"를 눌러주세요.");
      setTimeout(() => setBanner(null), 2500);
    }
  }, [notificationsSupported, permission]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-2 flex-wrap">
          <li>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
          </li>
          <li className="opacity-50">/</li>
          <li>
            <Link href="/me" className="hover:text-foreground transition-colors">내 프로필</Link>
          </li>
          <li className="opacity-50">/</li>
          <li className="text-foreground">알림 설정</li>
        </ol>
      </nav>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">알림 설정</h1>
          <p className="text-muted-foreground mt-2">
            이메일과 실시간 알림을 관리합니다. 요약 완료, 전사 처리 상태 등 주요 이벤트를 빠르게 받아보세요.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Link href="/settings/profile" className="text-sm underline-offset-4 hover:underline text-muted-foreground">프로필</Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/settings/devices" className="text-sm underline-offset-4 hover:underline text-muted-foreground">디바이스</Link>
        </div>
      </header>

      {banner ? (
        <Alert className="border border-primary/30">
          <AlertTitle>알림</AlertTitle>
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      ) : null}

      {offline ? (
        <Alert variant="warning" className="border-yellow-500/40">
          <AlertTitle>오프라인 모드</AlertTitle>
          <AlertDescription>
            현재 오프라인입니다. 변경 사항은 이 기기에 저장되며, 온라인 상태에서 동기화 기능이 활성화됩니다.
          </AlertDescription>
        </Alert>
      ) : null}

      {!notificationsSupported ? (
        <Alert variant="default">
          <AlertTitle>브라우저 푸시 미지원</AlertTitle>
          <AlertDescription>
            현재 브라우저에서는 푸시 알림이 지원되지 않습니다. 최신 크롬, 엣지, 사파리 등으로 접속해 주세요.
          </AlertDescription>
        </Alert>
      ) : permission === "denied" ? (
        <Alert variant="destructive">
          <AlertTitle>푸시 알림이 차단되었습니다</AlertTitle>
          <AlertDescription>
            사이트 알림 권한이 차단되어 있습니다. 브라우저 설정에서 권한을 허용해 주세요.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="sec-email" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="sec-email" className="text-xl font-semibold">이메일 알림</h2>
          {loading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="text-sm text-muted-foreground truncate max-w-[220px]" title={userEmail ?? undefined}>
              수신 이메일: {userEmail ?? "—"}
            </span>
          )}
        </div>
        <div className="grid gap-3">
          <Toggle
            id="email-transcript"
            label="전사 처리 완료"
            description="세션 전사본이 준비되면 이메일로 알려드립니다."
            checked={prefs.email.transcript_ready}
            onChange={(v) => setPrefs((p) => ({ ...p, email: { ...p.email, transcript_ready: v } }))}
          />
          <Toggle
            id="email-summary"
            label="요약본 생성 완료"
            description="하이라이트 기반 요약문서가 생성되면 이메일로 받습니다."
            checked={prefs.email.summary_ready}
            onChange={(v) => setPrefs((p) => ({ ...p, email: { ...p.email, summary_ready: v } }))}
          />
          <Toggle
            id="email-session-start"
            label="세션 시작 알림"
            description="예약된 회의/강의가 시작될 때 알림을 받습니다."
            checked={prefs.email.session_start}
            onChange={(v) => setPrefs((p) => ({ ...p, email: { ...p.email, session_start: v } }))}
          />
          <Toggle
            id="email-session-end"
            label="세션 종료 알림"
            description="녹음이 종료되면 알림을 받습니다."
            checked={prefs.email.session_end}
            onChange={(v) => setPrefs((p) => ({ ...p, email: { ...p.email, session_end: v } }))}
          />
          <Toggle
            id="email-weekly"
            label="주간 요약 리포트"
            description="지난 주의 세션 활동과 주요 요약본을 모아 보내드립니다."
            checked={prefs.email.weekly_digest}
            onChange={(v) => setPrefs((p) => ({ ...p, email: { ...p.email, weekly_digest: v } }))}
          />
          <Toggle
            id="email-product"
            label="제품 업데이트 및 공지"
            description="신규 기능/중요 공지를 받아봅니다."
            checked={prefs.email.product_updates}
            onChange={(v) => setPrefs((p) => ({ ...p, email: { ...p.email, product_updates: v } }))}
          />
        </div>
      </section>

      <Separator />

      <section aria-labelledby="sec-realtime" className="space-y-4">
        <h2 id="sec-realtime" className="text-xl font-semibold">실시간 알림</h2>
        <div className="grid gap-3">
          <Toggle
            id="rt-inapp"
            label="인앱 토스트 알림"
            description="브라우저 내 상단에 실시간 상태/하이라이트 알림을 표시합니다."
            checked={prefs.realtime.in_app_toast}
            onChange={(v) => setPrefs((p) => ({ ...p, realtime: { ...p.realtime, in_app_toast: v } }))}
          />
          <Toggle
            id="rt-sound"
            label="알림 사운드"
            description="실시간 알림 수신 시 짧은 효과음을 재생합니다."
            checked={prefs.realtime.sound}
            onChange={(v) => setPrefs((p) => ({ ...p, realtime: { ...p.realtime, sound: v } }))}
          />
          <Toggle
            id="rt-hotkey"
            label="하이라이트 단축키 사용 (H 키)"
            description="세션 중 H 키로 중요 포인트를 빠르게 표시합니다. 세션 페이지에서 동작합니다."
            checked={prefs.realtime.highlight_hotkey}
            onChange={(v) => setPrefs((p) => ({ ...p, realtime: { ...p.realtime, highlight_hotkey: v } }))}
          />
        </div>

        <div className="mt-6 rounded-lg border bg-card">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-medium">브라우저 푸시 알림</div>
              <p className="text-sm text-muted-foreground mt-1">
                앱이 백그라운드이거나 닫혀 있어도 주요 이벤트를 받아볼 수 있습니다.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                상태: {notificationsSupported ? (permission === "granted" ? "허용됨" : permission === "denied" ? "차단됨" : "미설정") : "미지원"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestPushPermission}
                disabled={!notificationsSupported || permission === "granted"}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  permission === "granted"
                    ? "bg-secondary text-secondary-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                브라우저 알림 활성화
              </button>
              <button
                type="button"
                onClick={sendTestNotification}
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-accent text-accent-foreground hover:opacity-90"
              >
                테스트 알림
              </button>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section aria-labelledby="sec-quiet" className="space-y-4">
        <h2 id="sec-quiet" className="text-xl font-semibold">방해 금지 시간대</h2>
        <p className="text-sm text-muted-foreground">
          지정된 시간에는 이메일/실시간 알림을 억제합니다. 긴급 시스템 알림은 제외됩니다.
        </p>
        <div className="grid gap-4">
          <Toggle
            id="quiet-enabled"
            label="방해 금지 활성화"
            description={`현재 시간대 (${prefs.quiet_hours.timezone}) 기준으로 적용됩니다.`}
            checked={prefs.quiet_hours.enabled}
            onChange={(v) => setPrefs((p) => ({ ...p, quiet_hours: { ...p.quiet_hours, enabled: v } }))}
          />
          <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border bg-card", !prefs.quiet_hours.enabled && "opacity-60")}>            
            <div className="flex flex-col gap-2">
              <label className="text-sm">시작 시간</label>
              <input
                type="time"
                value={prefs.quiet_hours.start}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours: { ...p.quiet_hours, start: e.target.value } }))}
                disabled={!prefs.quiet_hours.enabled}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">종료 시간</label>
              <input
                type="time"
                value={prefs.quiet_hours.end}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours: { ...p.quiet_hours, end: e.target.value } }))}
                disabled={!prefs.quiet_hours.enabled}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">시간대</label>
              <input
                type="text"
                value={prefs.quiet_hours.timezone}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours: { ...p.quiet_hours, timezone: e.target.value } }))}
                disabled
                className="h-9 rounded-md border bg-muted px-3 text-sm text-muted-foreground"
              />
            </div>
            {prefs.quiet_hours.enabled ? (
              <div className="sm:col-span-3">
                <Alert variant="default" className="border-muted">
                  <AlertTitle>현재 상태</AlertTitle>
                  <AlertDescription>
                    {isQuietNow ? "지금은 방해 금지 시간입니다. 일부 알림이 지연될 수 있습니다." : "지금은 알림이 정상적으로 전송됩니다."}
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Separator />

      <section aria-labelledby="sec-related" className="space-y-3">
        <h2 id="sec-related" className="text-xl font-semibold">관련 설정</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/integrations/zoom" className="block rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors">
            <div className="font-medium">Zoom 연동</div>
            <p className="text-sm text-muted-foreground mt-1">회의 녹음을 가져와 전사/요약을 자동화합니다.</p>
          </Link>
          <Link href="/integrations/teams" className="block rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors">
            <div className="font-medium">Microsoft Teams 연동</div>
            <p className="text-sm text-muted-foreground mt-1">Teams 회의 녹음 가져오기 설정.</p>
          </Link>
          <Link href="/org/settings" className="block rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors">
            <div className="font-medium">조직 설정</div>
            <p className="text-sm text-muted-foreground mt-1">조직 전체 기본 알림 정책을 구성합니다.</p>
          </Link>
          <Link href="/org/retention" className="block rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors">
            <div className="font-medium">보존 기간 정책</div>
            <p className="text-sm text-muted-foreground mt-1">알림 관련 이메일/파일 보존 기간 관리.</p>
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          녹음 동의와 개인정보는 <Link className="underline underline-offset-4" href="/consent">동의 관리</Link>,
          정책은 <Link className="underline underline-offset-4" href="/legal/privacy">개인정보처리방침</Link> 및 <Link className="underline underline-offset-4" href="/legal/terms">이용약관</Link>을 참조하세요.
        </div>
      </section>

      <div className="h-16" />

      <div className="sticky bottom-0 inset-x-0 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {savedAt ? (
              <span>저장됨 • {new Date(savedAt).toLocaleTimeString()}</span>
            ) : dirty ? (
              <span>변경 사항이 저장되지 않았습니다</span>
            ) : (
              <span>최근 상태가 저장되어 있습니다</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/me" className="hidden sm:inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-muted text-foreground hover:opacity-90">
              내 프로필로 이동
            </Link>
            <button
              type="button"
              onClick={onReset}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:opacity-90"
            >
              기본값 복원
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className={cn(
                "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                dirty && !saving
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <Link href="/dashboard" className="underline underline-offset-4">대시보드로 돌아가기</Link>
      </div>
    </main>
  );
}
