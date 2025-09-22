"use client"

/**
 * CODE INSIGHT
 * This code's use case is to render the email-based login screen for poiima using Supabase Auth.
 * It supports password and passwordless (magic link) sign-in, shows validation and error states,
 * and redirects authenticated users to /dashboard or /onboarding/welcome if they appear to be first-time users.
 */

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/utils/supabase/client-browser"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/utils/utils"

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [variant, setVariant] = useState<"password" | "magic">("password")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [checkingSession, setCheckingSession] = useState<boolean>(true)

  useEffect(() => {
    const prefill = searchParams?.get("email")
    if (prefill) setEmail(prefill)
  }, [searchParams])

  useEffect(() => {
    let active = true
    const checkSession = async () => {
      try {
        const { data: sessionData } = await supabaseBrowser.auth.getSession()
        const session = sessionData.session
        if (!session) return
        const userId = session.user.id

        // Determine first-time by checking if a profile exists for this user
        const { data: profile, error: profileErr } = await supabaseBrowser
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle()

        if (!active) return

        if (profileErr) {
          // If profile lookup fails for any reason, default to dashboard for safety
          router.replace("/dashboard")
          return
        }

        if (!profile) {
          router.replace("/onboarding/welcome")
        } else {
          router.replace("/dashboard")
        }
      } finally {
        if (active) setCheckingSession(false)
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [router])

  const emailValid = useMemo(() => {
    if (!email) return false
    // Basic email validation
    return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email)
  }, [email])

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (variant === "magic") return emailValid
    return emailValid && password.length >= 6
  }, [emailValid, password.length, loading, variant])

  const handlePasswordLogin = async () => {
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      const { data, error: signInError } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message || "로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
        return
      }

      const userId = data.user?.id
      if (!userId) {
        // If user ID is missing, fallback to dashboard
        router.replace("/dashboard")
        return
      }

      const { data: profile, error: profileErr } = await supabaseBrowser
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle()

      if (profileErr) {
        router.replace("/dashboard")
        return
      }

      if (!profile) {
        router.replace("/onboarding/welcome")
      } else {
        router.replace("/dashboard")
      }
    } catch (e: any) {
      setError(e?.message || "예상치 못한 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/callback` : undefined
      const { error: otpError } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      })

      if (otpError) {
        setError(otpError.message || "매직 링크 발송 중 오류가 발생했습니다.")
        return
      }

      setSuccess("이메일로 로그인 링크를 보냈어요. 메일함을 확인해 주세요.")
    } catch (e: any) {
      setError(e?.message || "예상치 못한 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (variant === "password") {
      await handlePasswordLogin()
    } else {
      await handleMagicLink()
    }
  }

  return (
    <main className="flex flex-1 w-full items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">poiima에 로그인</h1>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">AI 스마트 튜터</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">이메일로 로그인하거나, 매직 링크를 받아 간편하게 시작하세요.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>문제가 발생했어요</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4">
                <AlertTitle>메일을 확인해 주세요</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setVariant("password")}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition",
                  variant === "password"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                비밀번호 로그인
              </button>
              <button
                type="button"
                onClick={() => setVariant("magic")}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition",
                  variant === "magic"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                매직 링크
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">이메일</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>

              {variant === "password" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium">비밀번호</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                    >
                      {showPassword ? "숨기기" : "표시"}
                    </button>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
                    placeholder="최소 6자"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition",
                  canSubmit ? "hover:opacity-95" : "opacity-60 cursor-not-allowed"
                )}
              >
                {loading ? "처리 중..." : variant === "password" ? "로그인" : "매직 링크 보내기"}
              </button>

              {variant === "password" && (
                <p className="text-center text-xs text-muted-foreground">혹시 비밀번호가 기억나지 않나요? 매직 링크로 간편 로그인해보세요.</p>
              )}
            </form>

            <Separator className="my-6" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">처음이신가요?</span>
              <Link href="/signup" className="font-medium text-primary hover:underline">무료로 가입하기</Link>
            </div>
          </div>

          <div className="bg-muted/40 px-6 py-4 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              로그인하면 개인정보 처리방침에 동의하는 것으로 간주됩니다. 자세한 내용은 {" "}
              <Link href="/privacy" className="underline hover:text-foreground">개인정보 처리방침</Link>을 참고하세요.
            </p>
          </div>
        </div>

        {checkingSession && (
          <p className="mt-4 text-center text-xs text-muted-foreground">세션 확인 중...</p>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-2xl" aria-hidden />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 p-2">
                  <div className="h-full w-full animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="로딩 중" />
                </div>
              </div>
              <h1 className="mb-2 text-lg font-semibold text-foreground">인증 처리 중</h1>
              <p className="mb-6 text-sm text-muted-foreground">링크 확인 중...</p>
              <div className="mt-2 flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              </div>
              <div className="mt-8 text-xs text-muted-foreground">
                <p>잠시만 기다려주세요. 자동으로 이동합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
