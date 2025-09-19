"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a production-ready password reset request page.
 * It collects a user's email, requests a Supabase Auth password reset email, and
 * upon success instructs the user to check their inbox. It emphasizes accessible,
 * sleek UI with links to related auth and help/legal pages throughout the app.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const value = email.trim().toLowerCase();
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError("유효한 이메일 주소를 입력해주세요.");
        return;
      }

      setLoading(true);
      try {
        const { error: authError } = await supabaseBrowser.auth.resetPasswordForEmail(value);
        if (authError) {
          // Normalize common error messages to be user-friendly
          const message =
            authError.message === "For security purposes, you can only request this after 60 seconds"
              ? "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요."
              : authError.message || "요청 처리 중 오류가 발생했습니다.";
          setError(message);
          setSent(false);
          return;
        }
        setSent(true);
      } catch (err) {
        setError("일시적인 문제로 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.");
        setSent(false);
      } finally {
        setLoading(false);
      }
    },
    [email, supabaseBrowser]
  );

  return (
    <main className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10 md:py-16">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-sm">
        <div className="px-6 sm:px-8 pt-8 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">비밀번호 재설정</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                계정에 등록된 이메일로 비밀번호 재설정 링크를 보내드립니다.
              </p>
            </div>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-1"
              aria-label="로그인 페이지로 돌아가기"
            >
              로그인
            </Link>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                이메일 주소
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                aria-invalid={!!error && !sent}
                aria-describedby={error && !sent ? "email-error" : undefined}
                disabled={loading || sent}
              />
              {error && !sent ? (
                <p id="email-error" className="mt-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading || sent}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-lg",
                "bg-primary text-primary-foreground px-4 py-2 text-sm font-medium",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                (loading || sent) && "opacity-90 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  전송 중...
                </>
              ) : sent ? (
                <>메일 발송됨</>
              ) : (
                <>재설정 링크 보내기</>
              )}
            </button>
          </form>

          <div className="mt-6" aria-live="polite" aria-atomic="true">
            {sent ? (
              <Alert className="border-green-500/40 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200">
                <AlertTitle>이메일을 확인해주세요</AlertTitle>
                <AlertDescription>
                  비밀번호 재설정 링크를 보냈습니다. 받은 편지함 또는 스팸함을 확인한 뒤, 안내에 따라 비밀번호를 변경하세요.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Separator className="my-6" />

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">이미 계정이 있으신가요?</span>
              <Link className="text-primary hover:underline" href="/auth/sign-in">
                로그인으로 이동
              </Link>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">아직 계정이 없으신가요?</span>
              <Link className="text-primary hover:underline" href="/auth/sign-up">
                회원가입
              </Link>
            </div>
          </div>
        </div>

        <Separator />

        <div className="px-6 sm:px-8 py-6">
          <Collapsible>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">도움이 필요하신가요?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  이메일이 오지 않았다면 아래 안내를 확인해주세요.
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-1"
                >
                  펼치기
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <ul className="mt-4 list-disc list-inside text-sm space-y-2 text-muted-foreground">
                <li>스팸/프로모션 메일함을 확인하세요.</li>
                <li>입력한 이메일이 정확한지 다시 확인한 후 재요청해보세요.</li>
                <li>
                  조직 이메일 사용 시, 메일 보안 정책으로 차단될 수 있습니다. 문제가 지속되면
                  <Link href="/help" className="ml-1 text-primary hover:underline">도움말</Link>을 참고하거나 관리자에게 문의하세요.
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <Link href="/legal/privacy" className="hover:underline">
              개인정보처리방침
            </Link>
            <Link href="/legal/terms" className="hover:underline">
              서비스 이용약관
            </Link>
            <Link href="/offline" className="hover:underline">
              오프라인 지원
            </Link>
            <Link href="/dashboard" className="hover:underline">
              대시보드로 이동
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
