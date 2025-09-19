"use client";

/**
 * CODE INSIGHT
 * This code's use case is a production-ready Sign Up page for new users to register via email/password or SSO (Google/Azure/GitHub) using Supabase Auth. It handles consent confirmation, error/success states, and redirects to /onboarding after successful registration. It also links to legal pages (/legal/terms, /legal/privacy) and other relevant routes per the site map.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/utils/utils";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "azure" | "github">(null);

  useEffect(() => {
    let isMounted = true;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        router.replace("/dashboard");
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router, supabaseBrowser]);

  const validate = useCallback(() => {
    if (!fullName.trim()) return "이름을 입력해주세요.";
    if (!email.trim()) return "이메일을 입력해주세요.";
    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(email)) return "유효한 이메일 주소를 입력해주세요.";
    if (password.length < 8) return "비밀번호는 8자리 이상이어야 합니다.";
    if (!agree) return "이용약관 및 개인정보 처리방침에 동의해야 가입이 가능합니다.";
    return null;
  }, [fullName, email, password, agree]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined;
      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: redirectTo,
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        router.replace("/onboarding");
        return;
      }

      setInfo("가입을 완료하려면 이메일을 확인하고 인증을 진행해주세요. 인증 후 자동으로 온보딩으로 이동합니다.");
    } catch (err: any) {
      setError(err?.message || "회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "azure" | "github") => {
    setError(null);
    setInfo(null);
    setOauthLoading(provider);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined;
      const { error: oauthError } = await supabaseBrowser.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // scopes can be customized in Supabase provider settings
        },
      });
      if (oauthError) throw oauthError;
      // Redirect handled by provider; no further action needed here
    } catch (err: any) {
      setError(err?.message || "SSO 로그인 중 오류가 발생했습니다. 다른 방법으로 시도해주세요.");
      setOauthLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Left: Marketing/Info */}
        <section className="order-2 lg:order-1">
          <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight">실시간 회의·강의 요약 서비스에 가입하세요</h1>
            <p className="mt-2 text-muted-foreground">
              브라우저에서 바로 녹음·전사하고, 하이라이트 기반으로 핵심만 간추린 요약을 생성합니다. 한국어 우선, 다국어 확장 가능.
            </p>

            <div className="mt-6">
              <Carousel className="w-full">
                <CarouselContent>
                  <CarouselItem>
                    <div className="rounded-lg bg-muted p-6">
                      <h3 className="text-lg font-medium">실시간 전사와 자막</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        낮은 지연으로 발화 내용을 실시간 표시하고, 화자 라벨과 타임스탬프를 자동 정렬합니다.
                      </p>
                      <div className="mt-4 text-sm">
                        • 라이브 세션 시작: <Link href="/sessions/new" className="text-primary underline underline-offset-4">새 세션 만들기</Link>
                      </div>
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="rounded-lg bg-muted p-6">
                      <h3 className="text-lg font-medium">하이라이트 기반 요약</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        회의 중 중요 버튼으로 표시하거나, 나중에 메모를 업로드해 요약의 품질을 높여보세요.
                      </p>
                      <div className="mt-4 text-sm">
                        • 하이라이트 업로드: <Link href="/sessions" className="text-primary underline underline-offset-4">세션 목록</Link>
                      </div>
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="rounded-lg bg-muted p-6">
                      <h3 className="text-lg font-medium">Zoom/Teams 연동</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        계정을 연결하고, 회의 녹음을 자동으로 불러와 후처리합니다.
                      </p>
                      <div className="mt-4 text-sm space-x-2">
                        <Link href="/integrations/zoom" className="text-primary underline underline-offset-4">Zoom 연동</Link>
                        <span className="text-muted-foreground">/</span>
                        <Link href="/integrations/teams" className="text-primary underline underline-offset-4">Teams 연동</Link>
                      </div>
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <div className="mt-3 flex items-center gap-2">
                  <CarouselPrevious className="h-8 w-8" />
                  <CarouselNext className="h-8 w-8" />
                </div>
              </Carousel>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-3 text-sm">
              <Link href="/help" className="text-primary underline underline-offset-4">도움말 센터</Link>
              <Link href="/offline" className="text-primary underline underline-offset-4">오프라인 모드 안내</Link>
              <div className="text-muted-foreground">
                이미 계정이 있으신가요? <Link href="/auth/sign-in" className="text-primary underline underline-offset-4">로그인</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Sign Up Form */}
        <section className="order-1 lg:order-2">
          <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">회원가입</h2>
              <p className="mt-1 text-sm text-muted-foreground">이메일로 가입하거나 아래 SSO로 빠르게 시작하세요.</p>
            </div>

            {error && (
              <Alert className="mb-4 border-destructive/30 bg-destructive/10 text-destructive">
                <AlertTitle>문제가 발생했습니다</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {info && (
              <Alert className="mb-4 border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>확인이 필요합니다</AlertTitle>
                <AlertDescription>{info} 이메일을 받지 못했다면 <Link href="/auth/verify-email" className="underline underline-offset-4">이메일 인증 가이드</Link>를 확인하세요.</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading || loading}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent",
                  oauthLoading === "google" && "opacity-60"
                )}
                aria-label="Continue with Google"
              >
                <span className="text-lg">🔴</span>
                {oauthLoading === "google" ? "Google로 이동 중..." : "Google로 계속하기"}
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("azure")}
                disabled={!!oauthLoading || loading}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent",
                  oauthLoading === "azure" && "opacity-60"
                )}
                aria-label="Continue with Microsoft"
              >
                <span className="text-lg">🟦</span>
                {oauthLoading === "azure" ? "Microsoft로 이동 중..." : "Microsoft로 계속하기"}
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("github")}
                disabled={!!oauthLoading || loading}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent",
                  oauthLoading === "github" && "opacity-60"
                )}
                aria-label="Continue with GitHub"
              >
                <span className="text-lg">⚫</span>
                {oauthLoading === "github" ? "GitHub로 이동 중..." : "GitHub로 계속하기"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">또는</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <label htmlFor="fullName" className="text-sm font-medium">이름</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">이메일</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">비밀번호</label>
                  <span className="text-xs text-muted-foreground">8자 이상, 안전한 비밀번호 사용</span>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none ring-0 focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="mt-1 flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
                <input
                  id="agree"
                  name="agree"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-ring"
                />
                <label htmlFor="agree" className="text-sm text-muted-foreground">
                  계속하면 <Link href="/legal/terms" className="text-primary underline underline-offset-4">이용약관</Link> 및 <Link href="/legal/privacy" className="text-primary underline underline-offset-4">개인정보 처리방침</Link>에 동의하는 것으로 간주됩니다.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !!oauthLoading}
                className={cn(
                  "mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90",
                  (loading || oauthLoading) && "opacity-70"
                )}
              >
                {loading ? "가입 처리 중..." : "이메일로 가입하기"}
              </button>

              <p className="mt-2 text-center text-sm text-muted-foreground">
                이미 계정이 있으신가요? <Link href="/auth/sign-in" className="text-primary underline underline-offset-4">로그인</Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
