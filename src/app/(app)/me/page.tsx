"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Personal Profile page for authenticated users. It summarizes the user's profile info
 * and provides quick actions to common destinations: profile settings, notification preferences, and device settings.
 * It also offers deep links to frequently used app areas (sessions, ingest, integrations, org, admin) to streamline navigation.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

function InitialsAvatar({ name, email }: { name?: string | null; email?: string | null }) {
  const initials = useMemo(() => {
    const source = (name || email || "").trim();
    if (!source) return "?";
    const parts = source
      .replace(/@.+$/, "")
      .split(/[\s._-]+/)
      .filter(Boolean);
    if (parts.length === 0) return source.slice(0, 2).toUpperCase();
    const first = parts[0]?.[0] || "";
    const last = parts[parts.length - 1]?.[0] || "";
    return (first + last).toUpperCase();
  }, [name, email]);

  return (
    <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold shadow-sm">
      <span className="select-none text-xl" aria-hidden>{initials}</span>
      <span className="sr-only">User avatar</span>
    </div>
  );
}

type PermState = "granted" | "denied" | "prompt" | "unsupported";

function StatusBadge({ state, label }: { state: PermState; label: string }) {
  const styles = {
    granted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20",
    denied: "bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-rose-500/20",
    prompt: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
    unsupported: "bg-muted text-muted-foreground ring-border",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[state]
      )}
    >
      {label}
    </span>
  );
}

function QuickAction({ href, title, desc, emoji }: { href: string; title: string; desc: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border bg-card text-card-foreground p-4 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-base">
          <span aria-hidden>{emoji}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-none tracking-tight">{title}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{desc}</p>
          <div className="mt-3 text-xs text-primary">바로가기 →</div>
        </div>
      </div>
    </Link>
  );
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notifState, setNotifState] = useState<PermState>("unsupported");
  const [micState, setMicState] = useState<PermState>("unsupported");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabaseBrowser.auth.getUser();
        if (!mounted) return;
        if (error) {
          setError(error.message);
        } else {
          setUser(data.user ?? null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "사용자 정보를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Notification permission
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const perm = Notification.permission; // 'granted' | 'denied' | 'default'
        setNotifState(perm === "default" ? "prompt" : (perm as PermState));
      } else {
        setNotifState("unsupported");
      }
    } catch {
      setNotifState("unsupported");
    }

    // Microphone permission
    const checkMic = async () => {
      try {
        if (!navigator?.permissions) return setMicState("unsupported");
        // @ts-expect-error - 'microphone' may not be in union types in TS lib yet
        const status = await navigator.permissions.query({ name: "microphone" });
        const map: Record<PermissionState, PermState> = {
          granted: "granted",
          denied: "denied",
          prompt: "prompt",
        } as any;
        // @ts-expect-error - PermissionState narrowing
        setMicState(map[status.state] || "prompt");
        status.onchange = () => {
          // @ts-expect-error
          const next = map[status.state] || "prompt";
          setMicState(next);
        };
      } catch {
        setMicState("unsupported");
      }
    };

    checkMic();
  }, []);

  const fullName = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || null;
  const email = user?.email || null;
  const emailConfirmed = Boolean((user as any)?.email_confirmed_at);

  const requestNotificationPermission = async () => {
    try {
      if (!("Notification" in window)) return;
      const res = await Notification.requestPermission();
      setNotifState(res === "default" ? "prompt" : (res as PermState));
    } catch {
      setNotifState("unsupported");
    }
  };

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    router.push("/auth/sign-in");
  };

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">내 프로필</h1>
          <p className="mt-1 text-sm text-muted-foreground">프로필 요약과 자주 사용하는 작업을 빠르게 실행하세요.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          대시보드로 이동
        </Link>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border bg-card text-card-foreground p-4 md:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {loading ? (
              <Skeleton className="h-16 w-16 rounded-full" />
            ) : (
              <InitialsAvatar name={fullName} email={email} />
            )}
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-56" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold leading-none">
                      {fullName || "이름 미설정"}
                    </h2>
                    {!emailConfirmed && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/20">
                        이메일 미인증
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{email || "이메일 미설정"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge state={notifState} label={`알림: ${notifState}`} />
                    <StatusBadge state={micState} label={`마이크: ${micState}`} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/settings/profile"
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              프로필 편집
            </Link>
            <button
              onClick={signOut}
              className="inline-flex h-9 items-center rounded-md bg-secondary px-3 text-sm font-medium hover:opacity-95"
            >
              로그아웃
            </button>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-3">
          <QuickAction
            href="/settings/profile"
            title="프로필 설정"
            desc="이름, 아바타 등 계정 정보를 업데이트합니다."
            emoji="👤"
          />
          <QuickAction
            href="/settings/notifications"
            title="알림 설정"
            desc="이메일/브라우저 알림 기본값과 수신 빈도를 관리합니다."
            emoji="🔔"
          />
          <QuickAction
            href="/settings/devices"
            title="기기 및 권한"
            desc="마이크 권한, 입출력 장치를 확인하고 문제를 해결합니다."
            emoji="🎙️"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={requestNotificationPermission}
            className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            브라우저 알림 권한 요청
          </button>
          <Link
            href="/sessions/new"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-95"
          >
            새 세션 시작
          </Link>
          <Link
            href="/sessions"
            className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            세션 목록 보기
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">작업 바로가기</h3>
            <Link href="/ingest/upload" className="text-sm text-primary hover:underline">
              업로드로 이동
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickAction
              href="/ingest/upload"
              title="녹음 파일 업로드"
              desc="Zoom/Teams 등의 녹음 파일을 업로드하여 전사/요약을 생성합니다."
              emoji="⤴️"
            />
            <QuickAction
              href="/imports"
              title="가져오기 내역"
              desc="이전에 가져온 파일과 처리 상태를 확인합니다."
              emoji="📥"
            />
            <QuickAction
              href="/sessions"
              title="세션 관리"
              desc="진행 중/완료된 회의·강의 세션을 관리합니다."
              emoji="🗂️"
            />
            <QuickAction
              href="/consent/new"
              title="녹음 동의 수집"
              desc="참여자에게 동의 요청 링크를 생성하고 공유합니다."
              emoji="✅"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">연동 및 조직</h3>
            <Link href="/integrations" className="text-sm text-primary hover:underline">
              연동 설정 전체 보기
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickAction
              href="/integrations/zoom"
              title="Zoom 연동"
              desc="Zoom 계정을 연결하여 녹음 파일을 자동으로 가져옵니다."
              emoji="🧩"
            />
            <QuickAction
              href="/integrations/teams"
              title="Microsoft Teams 연동"
              desc="Teams 녹음에 접근하여 후처리를 자동화합니다."
              emoji="🧩"
            />
            <QuickAction
              href="/org/members"
              title="조직 멤버 관리"
              desc="멤버 초대, 역할 변경, 접근 제어를 설정합니다."
              emoji="👥"
            />
            <QuickAction
              href="/org/security"
              title="보안 설정"
              desc="2단계 인증, 접근 정책, 로그 옵션을 확인합니다."
              emoji="🛡️"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/org/settings"
              className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              조직 설정
            </Link>
            <Link
              href="/org/retention"
              className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              보존기간 정책
            </Link>
            <Link
              href="/admin/metrics"
              className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              관리자 대시보드
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-card text-card-foreground p-4 md:p-6">
        <h3 className="text-base font-semibold">도움말 및 법적 고지</h3>
        <p className="mt-1 text-sm text-muted-foreground">문제가 있거나 정책을 확인해야 하는 경우 아래 링크를 참고하세요.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/help" className="text-primary hover:underline">
            도움말 센터
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/legal/privacy" className="text-primary hover:underline">
            개인정보 처리방침
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/legal/terms" className="text-primary hover:underline">
            서비스 이용약관
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/offline" className="text-primary hover:underline">
            오프라인 모드 안내
          </Link>
        </div>
      </section>
    </main>
  );
}
