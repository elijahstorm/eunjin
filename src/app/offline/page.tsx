"use client";

/**
 * CODE INSIGHT
 * This code's use case is an offline fallback page for the PWA. It is shown by the service worker when the network is unavailable.
 * It monitors connectivity, attempts reconnection with backoff, and when back online it redirects users to the home page.
 * It also provides helpful links to other parts of the app and troubleshooting tips.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

function WifiOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M16.72 5.78A11.94 11.94 0 0 0 12 4c-3.06 0-5.86 1.15-7.98 3.02M1 1l22 22" />
      <path d="M5.1 10.29a7.94 7.94 0 0 1 6.9-2.29M8.53 13.72a3.94 3.94 0 0 1 3.41-.71" />
      <path d="M12 20h.01" />
    </svg>
  );
}

function WifiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a6 6 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </svg>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        online ? "bg-emerald-500" : "bg-destructive"
      )}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}

function useConnectivity() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : false);
  const [checking, setChecking] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const backoff = (n: number) => Math.min(30, Math.max(3, Math.round(Math.pow(1.8, n) + 2)));

  const ping = async () => {
    if (checking) return;
    setChecking(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    let nextOnline = false;
    try {
      // robots.txt is tiny and almost always present; any response indicates network reachability.
      const res = await fetch(`/robots.txt?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      // Treat any HTTP response as connectivity (even a 404 proves we reached the server).
      nextOnline = true;
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      setLatency(Math.max(0, end - start));
      setOnline(true);
      setAttempts(0);
    } catch {
      nextOnline = false;
      setOnline(false);
      setLatency(null);
      setAttempts((a) => a + 1);
    } finally {
      setLastChecked(Date.now());
      setChecking(false);
      abortRef.current = null;
      if (!nextOnline) setCountdown(backoff(attempts + 1));
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setAttempts(0);
      setCountdown(0);
      void ping();
    };
    const handleOffline = () => {
      setOnline(false);
      setCountdown(backoff(attempts + 1));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !online) {
        void ping();
      }
    });

    // initial check quickly after mount
    const t = setTimeout(() => {
      void ping();
    }, 150);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(t);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (online) return; // no countdown when online
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          void ping();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, online]);

  return { online, checking, latency, lastChecked, countdown, ping } as const;
}

export default function OfflinePage() {
  const router = useRouter();
  const { online, checking, latency, lastChecked, countdown, ping } = useConnectivity();

  useEffect(() => {
    if (!online) return;
    const id = setTimeout(() => {
      router.replace("/");
    }, 1200);
    return () => clearTimeout(id);
  }, [online, router]);

  const quickLinks = useMemo(
    () => [
      { href: "/", title: "홈", desc: "서비스 홈으로 돌아가기" },
      { href: "/dashboard", title: "대시보드", desc: "진행 중/최근 세션 한눈에" },
      { href: "/sessions", title: "세션 목록", desc: "회의·강의 세션 관리" },
      { href: "/sessions/new", title: "새 세션 시작", desc: "실시간 캡처/전사 시작" },
      { href: "/ingest/upload", title: "녹음 업로드", desc: "Zoom/Teams 파일 가져오기" },
      { href: "/integrations", title: "통합 설정", desc: "Zoom/Teams 연동" },
      { href: "/org", title: "조직 관리", desc: "멤버·권한·보안 설정" },
      { href: "/me", title: "내 계정", desc: "계정 및 구독 정보" },
      { href: "/settings/profile", title: "프로필 설정", desc: "이름·언어·알림" },
      { href: "/help", title: "도움말", desc: "FAQ와 가이드 문서" },
      { href: "/legal/privacy", title: "개인정보 처리방침", desc: "데이터 보호 정책" },
      { href: "/legal/terms", title: "이용약관", desc: "서비스 약관" },
    ],
    []
  );

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <section className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center gap-3 border-b border-border p-6">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", online ? "bg-emerald-100/40 text-emerald-600" : "bg-destructive/10 text-destructive")}
               aria-hidden="true">
            {online ? <WifiIcon className="h-5 w-5" /> : <WifiOffIcon className="h-5 w-5" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusDot online={online} />
              <span aria-live="polite">{online ? "온라인" : "오프라인"}</span>
            </div>
            <h1 className="text-lg font-semibold">{online ? "연결이 복구되었습니다." : "인터넷 연결이 오프라인입니다."}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {checking ? (
              <span className="inline-flex items-center gap-2" aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> 재연결 확인 중…
              </span>
            ) : lastChecked ? (
              <span title={new Date(lastChecked).toLocaleString()}>마지막 확인 {new Intl.RelativeTimeFormat("ko", { numeric: "auto" }).format(-Math.round((Date.now() - lastChecked) / 1000), "second")} 전</span>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {!online ? (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTitle>네트워크를 찾을 수 없습니다</AlertTitle>
              <AlertDescription>
                연결 상태를 확인하고 잠시 후 다시 시도해 주세요. 재시도는 자동으로 진행됩니다.
                {countdown > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-destructive/20 px-2 py-0.5 text-xs">다음 시도까지 {countdown}s</span>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
              <AlertTitle>온라인으로 복구됨</AlertTitle>
              <AlertDescription>
                {typeof latency === "number" ? `왕복 지연 ${Math.round(latency)}ms · ` : null}
                곧 홈으로 이동합니다. 바로 이동하려면 아래 버튼을 눌러주세요.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!online ? (
              <>
                <button
                  type="button"
                  onClick={() => ping()}
                  disabled={checking}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
                    checking && "opacity-80"
                  )}
                >
                  <span className={cn("h-3 w-3 rounded-full", checking ? "bg-primary animate-pulse" : "bg-secondary-foreground/70")}></span>
                  다시 시도
                </button>
                <button
                  type="button"
                  onClick={() => location.reload()}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  새로고침
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  홈으로 이동
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  대시보드 열기
                </Link>
              </>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4">
              <h2 className="mb-2 text-sm font-medium">빠른 링크</h2>
              <ul className="space-y-2">
                {quickLinks.slice(0, 6).map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center justify-between rounded-md border border-transparent px-2 py-2 text-sm hover:border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="truncate">
                        <span className="font-medium">{l.title}</span>
                        <span className="ml-2 text-muted-foreground">{l.desc}</span>
                      </span>
                      <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <h2 className="mb-2 text-sm font-medium">도움말 및 정책</h2>
              <ul className="space-y-2">
                {quickLinks.slice(6).map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center justify-between rounded-md border border-transparent px-2 py-2 text-sm hover:border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="truncate">
                        <span className="font-medium">{l.title}</span>
                        <span className="ml-2 text-muted-foreground">{l.desc}</span>
                      </span>
                      <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {!online && (
            <div className="rounded-lg border border-dashed border-border p-4">
              <h3 className="mb-3 text-sm font-medium">캐시된 콘텐츠</h3>
              <p className="mb-3 text-sm text-muted-foreground">일부 페이지는 오프라인에서도 보일 수 있습니다. 네트워크가 복구되면 자동으로 최신 상태로 동기화됩니다.</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
            </div>
          )}

          <Collapsible>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">연결 문제 해결</h3>
              <CollapsibleTrigger className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground">펼치기</CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>1) Wi‑Fi 또는 이더넷 연결을 확인하세요.</p>
              <p>2) VPN/프록시 사용 시 네트워크 정책을 확인하세요.</p>
              <p>3) 브라우저를 새로고침하거나, 다른 탭에서 <span className="rounded bg-muted px-1">/help</span> 페이지를 열어보세요.</p>
              <p>4) PWA 설치 환경이라면, 네트워크 복구 후 자동으로 최신 서비스 워커가 활성화됩니다.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-card-foreground">
        <h2 className="mb-4 text-sm font-semibold">자주 찾는 작업</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/sessions" className="group rounded-lg border border-border bg-background p-4 hover:bg-accent hover:text-accent-foreground">
            <div className="mb-1 flex items-center justify-between text-sm font-medium">세션 관리 <span className="transition-transform group-hover:translate-x-0.5">→</span></div>
            <p className="text-xs text-muted-foreground group-hover:text-accent-foreground">실시간/과거 회의·강의 세션을 확인합니다.</p>
          </Link>
          <Link href="/integrations/zoom" className="group rounded-lg border border-border bg-background p-4 hover:bg-accent hover:text-accent-foreground">
            <div className="mb-1 flex items-center justify-between text-sm font-medium">Zoom 연동 <span className="transition-transform group-hover:translate-x-0.5">→</span></div>
            <p className="text-xs text-muted-foreground group-hover:text-accent-foreground">녹음 가져오기 설정 및 계정 연결.</p>
          </Link>
          <Link href="/integrations/teams" className="group rounded-lg border border-border bg-background p-4 hover:bg-accent hover:text-accent-foreground">
            <div className="mb-1 flex items-center justify-between text-sm font-medium">Microsoft Teams 연동 <span className="transition-transform group-hover:translate-x-0.5">→</span></div>
            <p className="text-xs text-muted-foreground group-hover:text-accent-foreground">조직 계정으로 손쉽게 연결하세요.</p>
          </Link>
          <Link href="/ingest/upload" className="group rounded-lg border border-border bg-background p-4 hover:bg-accent hover:text-accent-foreground">
            <div className="mb-1 flex items-center justify-between text-sm font-medium">녹음 파일 업로드 <span className="transition-transform group-hover:translate-x-0.5">→</span></div>
            <p className="text-xs text-muted-foreground group-hover:text-accent-foreground">mp3/wav 등 파일을 업로드하여 전사를 생성합니다.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
