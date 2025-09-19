"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Email/SSO sign-in page for users to authenticate via Supabase Auth.
 * It supports email/password and OAuth (Google, Microsoft Azure) sign-in, displays helpful errors,
 * and redirects to /dashboard (or a provided return path) on success. It also links prominently to
 * related auth pages and key app areas to facilitate navigation.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const next = searchParams?.get("next") || searchParams?.get("redirect") || "/dashboard";
    try {
      const url = new URL(next, typeof window !== "undefined" ? window.location.origin : "https://localhost");
      return url.pathname + url.search + url.hash;
    } catch {
      return "/dashboard";
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const qError = searchParams?.get("error") || searchParams?.get("error_description");
    const qMessage = searchParams?.get("message");
    if (qError && mounted) setError(decodeURIComponent(qError));
    if (qMessage && mounted) setInfo(decodeURIComponent(qMessage));

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) router.replace(redirectTo);
    });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(redirectTo);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabaseBrowser, redirectTo, searchParams]);

  const handleEmailSignIn = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setInfo(null);
      setLoading(true);
      try {
        const { data, error: signInError } = await supabaseBrowser.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        if (data.session) {
          router.replace(redirectTo);
        } else {
          setInfo("로그인 링크가 전송되었거나 추가 확인이 필요합니다.");
        }
      } catch (err: any) {
        setError(err?.message || "로그인 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, supabaseBrowser, router, redirectTo]
  );

  const handleOAuth = useCallback(
    async (provider: "google" | "azure") => {
      setError(null);
      setInfo(null);
      setOauthLoading(provider);
      try {
        const { error: oauthError } = await supabaseBrowser.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: typeof window !== "undefined" ? `${window.location.origin}${redirectTo}` : undefined,
            queryParams: { prompt: "select_account" },
          },
        });
        if (oauthError) setError(oauthError.message);
        // Redirect handled by provider
      } catch (err: any) {
        setError(err?.message || "SSO 중 문제가 발생했습니다.");
      } finally {
        setOauthLoading(null);
      }
    },
    [supabaseBrowser, redirectTo]
  );

  return (
    <div className="w-full py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 md:grid-cols-2">
        <section className="hidden rounded-2xl border border-border bg-card p-8 shadow-sm md:block">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">실시간 회의·강의 요약 서비스</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              브라우저에서 바로 녹음·전사·하이라이트, 그리고 요약까지. 로그인 후 아래 기능을 바로 시작해 보세요.
            </p>
          </div>
          <Carousel className="relative">
            <CarouselContent>
              <CarouselItem>
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-6">
                  <h3 className="text-lg font-medium">새 세션 시작</h3>
                  <p className="mt-1 text-sm text-muted-foreground">실시간 캡처와 전사를 시작하세요.</p>
                  <Link href="/sessions/new" className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                    세션 만들기 →
                  </Link>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="rounded-xl bg-gradient-to-br from-chart-1/10 to-chart-2/10 p-6">
                  <h3 className="text-lg font-medium">Zoom 연동</h3>
                  <p className="mt-1 text-sm text-muted-foreground">녹음 파일을 가져와 자동 전사/요약.</p>
                  <Link href="/integrations/zoom" className="mt-4 inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">
                    Zoom 연결하기 →
                  </Link>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="rounded-xl bg-gradient-to-br from-chart-3/10 to-chart-4/10 p-6">
                  <h3 className="text-lg font-medium">파일 업로드 전사</h3>
                  <p className="mt-1 text-sm text-muted-foreground">기존 녹음을 업로드해 처리하세요.</p>
                  <Link href="/ingest/upload" className="mt-4 inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:opacity-90">
                    업로드하기 →
                  </Link>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
          </Carousel>

          <Separator className="my-8" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link href="/help" className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">도움말</Link>
            <Link href="/legal/privacy" className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">개인정보처리방침</Link>
            <Link href="/legal/terms" className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">이용약관</Link>
            <Link href="/onboarding" className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">온보딩</Link>
            <Link href="/org" className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">조직</Link>
            <Link href="/settings/profile" className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground">프로필 설정</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight">로그인</h2>
            <p className="mt-1 text-sm text-muted-foreground">이메일/비밀번호 또는 SSO로 로그인하세요.</p>
          </div>

          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>문제가 발생했습니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {info ? (
            <Alert className="mb-4">
              <AlertTitle>안내</AlertTitle>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon className="h-4 w-4" />
              {oauthLoading === "google" ? "Google로 이동 중..." : "Google로 계속하기"}
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("azure")}
              disabled={!!oauthLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MicrosoftIcon className="h-4 w-4" />
              {oauthLoading === "azure" ? "Microsoft로 이동 중..." : "Microsoft로 계속하기"}
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">또는</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="mb-1 block text-sm font-medium">비밀번호</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  {showPassword ? "숨기기" : "표시"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-input" defaultChecked />
                  자동 로그인 유지
                </label>
              </div>
              <Link href="/auth/reset-password" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                비밀번호 찾기
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "로그인 중..." : "이메일로 로그인"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            계정이 없으신가요? {" "}
            <Link href="/auth/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">회원가입</Link>
          </p>

          <Separator className="my-8" />

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <Link href="/dashboard" className="rounded-md border border-border bg-background px-3 py-2 text-center hover:bg-accent hover:text-accent-foreground">대시보드</Link>
            <Link href="/sessions" className="rounded-md border border-border bg-background px-3 py-2 text-center hover:bg-accent hover:text-accent-foreground">세션 목록</Link>
            <Link href="/sessions/[sessionId]/live" className="rounded-md border border-border bg-background px-3 py-2 text-center hover:bg-accent hover:text-accent-foreground">라이브</Link>
            <Link href="/integrations/teams" className="rounded-md border border-border bg-background px-3 py-2 text-center hover:bg-accent hover:text-accent-foreground">Teams 연동</Link>
            <Link href="/consent/new" className="rounded-md border border-border bg-background px-3 py-2 text-center hover:bg-accent hover:text-accent-foreground">녹음 동의 받기</Link>
            <Link href="/me" className="rounded-md border border-border bg-background px-3 py-2 text-center hover:bg-accent hover:text-accent-foreground">내 정보</Link>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            이메일 인증을 못 받으셨나요?{" "}
            <Link href="/auth/verify-email" className="font-medium text-foreground underline-offset-4 hover:underline">이메일 재확인</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.6 3 14.5 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 8.2-4.9 8.2-7.3 0-.5 0-.8-.1-1.2H12z" />
      <path fill="#34A853" d="M3.7 7.1l3.2 2.4C7.7 7.8 9.7 6.3 12 6.3c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.6 3 14.5 2 12 2 8.5 2 5.5 3.9 3.7 7.1z" />
      <path fill="#FBBC05" d="M12 20.4c3.8 0 5.3-2.5 5.5-3.8h0l-5.5 0v3.8z" />
      <path fill="#4285F4" d="M20.3 12.1c0-.4 0-.7-.1-1.2H12v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8v3.8c6.9 0 8.2-4.9 8.2-7.3z" />
    </svg>
  );
}

function MicrosoftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" fill="#F25022" />
      <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
      <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
      <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
    </svg>
  );
}
