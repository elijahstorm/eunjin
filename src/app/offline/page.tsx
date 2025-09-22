"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a PWA offline fallback page. It displays a friendly offline message,
 * indicates connectivity/auth states, and provides a retry action that, when back online, routes users either
 * to the dashboard (if authenticated) or to the landing page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import { supabaseBrowser } from "@/utils/supabase/client-browser";

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted.current) return;
      setHasSession(!!data.session);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted.current) return;
      setHasSession(!!session);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const connectionBadge = useMemo(() => {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
          isOnline ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-950/40 dark:text-green-400" : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/40 dark:text-orange-400"
        )}
        aria-live="polite"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isOnline ? "bg-green-500" : "bg-orange-500"
          )}
          aria-hidden
        />
        {isOnline ? "온라인" : "오프라인"}
      </span>
    );
  }, [isOnline]);

  const authBadge = useMemo(() => {
    const status = hasSession ? "로그인됨" : "게스트";
    const color = hasSession ? "border-primary/30 bg-primary/10 text-primary" : "border-muted bg-muted text-muted-foreground";
    return (
      <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", color)} aria-live="polite">
        {status}
      </span>
    );
  }, [hasSession]);

  const pingOrigin = useCallback(async (timeoutMs = 3500) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("/", { cache: "no-store", signal: ctrl.signal });
      return res.ok || res.type === "opaqueredirect" || res.type === "opaque"; // tolerate opaque for no-cors
    } catch (_) {
      return false;
    } finally {
      clearTimeout(id);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setChecking(true);
    setError(null);
    setLastCheckedAt(new Date());

    // If navigator already reports online, try a small ping to confirm reachability.
    const reachable = isOnline ? await pingOrigin() : false;

    if (reachable) {
      // Route based on auth status
      if (hasSession) {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
      setChecking(false);
      return;
    }

    // If still offline or unreachable, surface guidance
    setError("아직 연결되지 않았어요. 네트워크를 확인한 뒤 다시 시도해 주세요.");
    setChecking(false);
  }, [hasSession, isOnline, pingOrigin, router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            {/* Inline wifi-off icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M2 8.82a15.94 15.94 0 0 1 10-3.62c2.48 0 4.83.56 6.91 1.57" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.92 12.06a11.94 11.94 0 0 1 7.08-2.31c1.63 0 3.2.32 4.62.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.84 15.29A7.94 7.94 0 0 1 12 14c1.04 0 2.03.2 2.93.57" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">오프라인 상태예요</h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground sm:text-base">
            인터넷 연결을 확인하고 다시 시도해 주세요. 연결되면 poiima가 바로 학습을 이어갈 수 있게 도와드릴게요.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {connectionBadge}
            {authBadge}
          </div>

          <div className="mt-6 w-full">
            <Alert className="border-border/70 bg-muted/40">
              <AlertTitle className="text-sm font-semibold">페이지를 불러올 수 없어요</AlertTitle>
              <AlertDescription className="mt-1 text-sm text-muted-foreground">
                네트워크가 복구되면 자동으로 다시 시도하거나 아래 버튼으로 수동으로 시도할 수 있어요.
              </AlertDescription>
            </Alert>
          </div>

          <div className="mt-6 w-full">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleRetry}
                disabled={checking}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  checking && "opacity-80"
                )}
              >
                {checking ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent" aria-hidden />
                    다시 시도 중...
                  </span>
                ) : (
                  <span>다시 시도</span>
                )}
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                홈으로 이동
              </Link>

              {isOnline && hasSession && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  대시보드로 이동
                </Link>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive" role="status" aria-live="assertive">{error}</p>
          )}

          <Separator className="my-8" />

          <div className="grid w-full gap-4 text-left sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <h3 className="text-sm font-semibold">팁 1</h3>
              <p className="mt-1 text-sm text-muted-foreground">Wi‑Fi 또는 모바일 데이터가 켜져 있는지 확인한 뒤, 브라우저 새로고침을 해보세요.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <h3 className="text-sm font-semibold">팁 2</h3>
              <p className="mt-1 text-sm text-muted-foreground">poiima를 홈 화면에 추가하면 오프라인에서도 더 빨리 접근할 수 있어요.</p>
            </div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground" aria-live="polite">
            {lastCheckedAt ? `마지막 확인: ${lastCheckedAt.toLocaleTimeString()}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
