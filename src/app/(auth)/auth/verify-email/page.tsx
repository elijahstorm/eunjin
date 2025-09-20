"use client";

/**
 * CODE INSIGHT
 * This code's use case is to handle Supabase email verification links. It validates the magic link/token from query params,
 * finalizes the authentication session on the client, and presents clear next steps. On success, users can proceed to onboarding
 * or the dashboard, with additional helpful navigation links to key areas of the app.
 */

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "idle" | "verifying" | "success" | "error" | "already";

function VerifyEmailPageInner() {
  const search = useSearchParams();
  const router = useRouter();
  const ran = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const raw = search.get("redirect") || search.get("next") || search.get("redirect_to");
    if (!raw) return null;
    try {
      const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      // Only allow same-origin relative paths
      if (url.origin === (typeof window !== "undefined" ? window.location.origin : url.origin)) {
        return url.pathname + url.search + url.hash;
      }
      return null;
    } catch {
      // Fallback for plain relative path without protocol
      if (raw.startsWith("/")) return raw;
      return null;
    }
  }, [search]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = search.get("code");
    const tokenHash = search.get("token_hash");
    const type = search.get("type");
    const emailParam = search.get("email");
    if (emailParam) setEmail(emailParam);

    const verify = async () => {
      setStatus("verifying");

      try {
        if (code) {
          const { error, data } = await supabaseBrowser.auth.exchangeCodeForSession(code );
          if (error) throw error;
          const authedEmail = data?.user?.email ?? emailParam ?? null;
          setEmail(authedEmail);
          setStatus("success");
          setMessage("이메일 인증이 완료되었습니다.");
          return;
        }

        if (tokenHash && type && (type === "email" || type === "email_change")) {
          const { error, data } = await supabaseBrowser.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "email_change" });
          if (error) throw error;
          // Refresh session state after verification
          const session = await supabaseBrowser.auth.getSession();
          const authedEmail = session.data.session?.user?.email ?? data?.user?.email ?? emailParam ?? null;
          setEmail(authedEmail);
          setStatus("success");
          setMessage(type === "email_change" ? "이메일 변경이 확인되었습니다." : "이메일 인증이 완료되었습니다.");
          return;
        }

        // No tokens present; check if user is already signed in and confirmed
        const { data: userData } = await supabaseBrowser.auth.getUser();
        const authedUser = userData?.user ?? null;
        if (authedUser) {
          const confirmedAt = (authedUser as any)?.email_confirmed_at as string | null | undefined;
          setEmail(authedUser.email ?? emailParam ?? null);
          if (confirmedAt) {
            setStatus("already");
            setMessage("이미 이메일 인증이 완료된 계정입니다.");
          } else {
            setStatus("error");
            setMessage("유효한 인증 토큰이 없습니다. 받은 편지함의 인증 링크를 사용해주세요.");
          }
          return;
        }

        setStatus("error");
        setMessage("유효한 인증 토큰이 없습니다. 받은 편지함의 인증 링크를 사용해주세요.");
      } catch (err: any) {
        const desc = search.get("error_description");
        setStatus("error");
        setMessage(desc || err?.message || "인증 처리 중 오류가 발생했습니다.");
      }
    };

    void verify();
  }, [supabaseBrowser, search]);

  return (
    <main className="w-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Z" stroke="currentColor" strokeWidth="2" />
              <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">이메일 확인</h1>
            <p className="text-sm text-muted-foreground">계정 보안을 위해 이메일 인증을 완료해주세요.</p>
          </div>
        </div>

        <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          {status === "verifying" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">인증 링크를 확인하고 있습니다...</p>
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          )}

          {status === "success" && (
            <div className="space-y-5">
              <Alert className="border-green-600/20 bg-green-600/10">
                <AlertTitle className="font-medium">인증 완료</AlertTitle>
                <AlertDescription>
                  {message} {email ? `(${email})` : ""}
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/onboarding")}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  온보딩 계속하기
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  대시보드로 이동
                </button>
              </div>

              {nextPath ? (
                <div className="text-sm text-muted-foreground">
                  또는 지정된 다음 경로로 이동하기: {" "}
                  <Link href={nextPath} className="font-medium text-primary underline-offset-4 hover:underline">
                    {nextPath}
                  </Link>
                </div>
              ) : null}

              <Separator className="my-3" />

              <div>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">다음에 할 일</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href="/sessions/new"
                    className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    새 세션 시작
                    <span aria-hidden className="text-muted-foreground transition-colors group-hover:text-accent-foreground">→</span>
                  </Link>
                  <Link
                    href="/ingest/upload"
                    className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    녹음 파일 업로드
                    <span aria-hidden className="text-muted-foreground transition-colors group-hover:text-accent-foreground">→</span>
                  </Link>
                  <Link
                    href="/integrations/zoom"
                    className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Zoom 연동하기
                    <span aria-hidden className="text-muted-foreground transition-colors group-hover:text-accent-foreground">→</span>
                  </Link>
                  <Link
                    href="/org/settings"
                    className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    조직 설정 보기
                    <span aria-hidden className="text-muted-foreground transition-colors group-hover:text-accent-foreground">→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {status === "already" && (
            <div className="space-y-5">
              <Alert className="border-blue-600/20 bg-blue-600/10">
                <AlertTitle className="font-medium">이미 인증된 계정</AlertTitle>
                <AlertDescription>
                  {message} {email ? `(${email})` : ""}
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  대시보드로 이동
                </button>
                <button
                  onClick={() => router.push("/sessions")}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  내 세션 보기
                </button>
              </div>

              <Separator className="my-3" />
              <div className="text-sm text-muted-foreground">
                도움이 필요하신가요? {" "}
                <Link href="/help" className="font-medium text-primary underline-offset-4 hover:underline">
                  도움말 센터
                </Link>
                를 방문하세요.
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-5">
              <Alert variant="destructive">
                <AlertTitle className="font-medium">인증 실패</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/auth/sign-in"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  다시 로그인
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  새 계정 만들기
                </Link>
              </div>

              <Separator className="my-3" />

              <div className="text-sm text-muted-foreground">
                • 인증 메일이 스팸함으로 분류되었는지 확인해주세요. <br />• 문제가 계속되면 {" "}
                <Link href="/help" className="font-medium text-primary underline-offset-4 hover:underline">
                  도움말 센터
                </Link>
                에서 안내를 확인하세요.
              </div>
            </div>
          )}
        </section>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-3 text-center text-xs text-muted-foreground sm:flex-row sm:justify-center">
          <Link href="/legal/terms" className="underline-offset-4 hover:underline">
            이용약관
          </Link>
          <span className="hidden select-none sm:inline">•</span>
          <Link href="/legal/privacy" className="underline-offset-4 hover:underline">
            개인정보 처리방침
          </Link>
          <span className="hidden select-none sm:inline">•</span>
          <Link href="/offline" className="underline-offset-4 hover:underline">
            오프라인 모드 안내
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="w-full"><div className="mx-auto max-w-2xl px-4 py-10 sm:py-14"><Skeleton className="h-10 w-full" /><Skeleton className="h-5 w-1/3" /></div></main>}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
