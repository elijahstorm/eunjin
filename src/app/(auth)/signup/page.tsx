"use client";

/**
 * CODE INSIGHT
 * This code's use case is a production-ready, client-side signup page for poiima, providing email/password registration using Supabase Auth. It validates inputs, handles consent acknowledgment with a link to privacy policy, displays actionable error/success alerts, and redirects successful signups to onboarding. It avoids headers/footers/sidebars and focuses on a responsive, modern UI.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const emailValid = useMemo(() => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email), [email]);
  const passwordValid = useMemo(() => password.length >= 8, [password]);
  const passwordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword]);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      const { data } = await supabaseBrowser.auth.getUser();
      if (!isMounted) return;
      if (data.user) {
        router.replace("/onboarding/welcome");
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!emailValid) {
      setError("올바른 이메일 주소를 입력해주세요.");
      errorRef.current?.focus();
      return;
    }
    if (!passwordValid) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      errorRef.current?.focus();
      return;
    }
    if (!passwordsMatch) {
      setError("비밀번호가 일치하지 않습니다.");
      errorRef.current?.focus();
      return;
    }
    if (!agree) {
      setError("개인정보 및 이용 정책에 동의해주세요.");
      errorRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/callback` : undefined;
      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      });

      if (signUpError) {
        setError(mapSupabaseError(signUpError.message));
        errorRef.current?.focus();
        return;
      }

      // If email confirmation is disabled, a session may be returned and we can route immediately.
      if (data.session) {
        router.replace("/onboarding/welcome");
        return;
      }

      // Otherwise, confirmation email sent. Inform the user to verify.
      setInfo("확인 이메일을 보냈습니다. 받은 편지함(스팸함 포함)을 확인하고 이메일 인증을 완료해주세요. 인증 후 로그인하면 온보딩이 시작됩니다.");
    } catch (err) {
      setError("회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      errorRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">poiima에 가입하기</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              이미 계정이 있나요?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                로그인
              </Link>
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4" role="alert" aria-live="assertive" tabIndex={-1} ref={errorRef}>
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {info && (
            <Alert className="mb-4" role="status" aria-live="polite">
              <AlertTitle>이메일 인증 필요</AlertTitle>
              <AlertDescription>
                {info} {' '}
                <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                  로그인으로 이동
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                이메일
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="최소 8자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10.585 10.585A2 2 0 0012 14a2 2 0 001.414-.586" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.88 5.098A10.05 10.05 0 0112 5c5 0 9 4.5 10 7- .223.519-.52 1.04-.886 1.547M6.228 6.228C4.189 7.51 2.67 9.27 2 12c.5 1.5 2.5 4.5 6 6 2 .8 4 .8 6 0 .83-.332 1.584-.728 2.268-1.172" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">영문 대소문자, 숫자, 특수문자 조합을 권장합니다.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium text-foreground">
                비밀번호 확인
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              {!passwordsMatch && confirmPassword.length > 0 && (
                <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <input
                id="agree"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-ring"
              />
              <label htmlFor="agree" className="text-sm text-foreground">
                <span>다음에 동의합니다: </span>
                <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                  개인정보 처리방침 및 서비스 이용 정책
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="absolute left-4 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent" aria-hidden />
              )}
              {loading ? "가입 처리 중..." : "이메일로 가입하기"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          가입 완료 후 자동으로 온보딩이 시작됩니다. 먼저 환영 화면으로 이동한 뒤, 필수 동의 절차로 안내됩니다.
        </p>
      </div>
    </main>
  );
}

function mapSupabaseError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("rate limit")) return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
  if (msg.includes("invalid email")) return "올바른 이메일 주소를 입력해주세요.";
  if (msg.includes("password")) return "비밀번호 정책을 확인해주세요. (최소 8자 이상)";
  if (msg.includes("user already registered") || msg.includes("already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  return "요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}
