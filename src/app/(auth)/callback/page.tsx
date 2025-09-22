"use client";

/**
 * CODE INSIGHT
 * This code's use case is to handle Supabase Auth callback redirects (OAuth PKCE, magic links, recovery, invites).
 * It verifies the URL params with Supabase, establishes a session, determines onboarding status,
 * and then redirects the user to the appropriate destination (/dashboard, /onboarding/welcome, or /onboarding/consent).
 * It provides a responsive loading UI with error handling.
 */

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedRef = useRef(false);
  const [status, setStatus] = useState<string>("링크 확인 중...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const run = async () => {
      try {
        const error = searchParams.get("error");
        const error_description = searchParams.get("error_description");
        if (error) {
          setErrorMessage(error_description || "인증 중 오류가 발생했습니다. 다시 시도해주세요.");
          setStatus("인증 오류");
          return;
        }

        const nextParam = searchParams.get("next");
        const sanitizeNext = (n?: string | null) => {
          if (!n) return null;
          if (!n.startsWith("/") || n.startsWith("//") || n.includes("://")) return null;
          if (n.startsWith("/callback") || n.includes("/(auth)/callback")) return null;
          return n;
        };
        const next = sanitizeNext(nextParam);

        const code = searchParams.get("code");
        if (code) {
          setStatus("세션 생성 중...");
          const { error: exchangeError } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setErrorMessage(exchangeError.message || "세션 교환 중 오류가 발생했습니다.");
            setStatus("인증 오류");
            return;
          }
        } else {
          const token_hash = searchParams.get("token_hash");
          const typeParam = (searchParams.get("type") || "").toLowerCase();
          const allowedTypes = new Set(["signup", "magiclink", "recovery", "invite", "email_change"]);
          const verifyType = allowedTypes.has(typeParam) ? (typeParam as any) : ("magiclink" as const);
          if (token_hash) {
            setStatus("이메일 링크 확인 중...");
            const { error: verifyError } = await supabaseBrowser.auth.verifyOtp({
              type: verifyType,
              token_hash,
            } as any);
            if (verifyError) {
              setErrorMessage(verifyError.message || "이메일 링크 확인 중 오류가 발생했습니다.");
              setStatus("인증 오류");
              return;
            }
          }
        }

        setStatus("세션 확인 중...");
        const { data: sessionData, error: sessionErr } = await supabaseBrowser.auth.getSession();
        if (sessionErr) {
          setErrorMessage(sessionErr.message || "세션 확인 중 오류가 발생했습니다.");
          setStatus("인증 오류");
          return;
        }

        const session = sessionData.session;
        if (!session) {
          setErrorMessage("로그인 세션을 찾을 수 없습니다. 다시 로그인해주세요.");
          setStatus("세션 없음");
          return;
        }

        setStatus("프로필 확인 중...");
        const userId = session.user.id;
        const { data: profile, error: profileErr } = await supabaseBrowser
          .from("profiles")
          .select("id, user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileErr) {
          setErrorMessage(profileErr.message || "프로필 정보를 불러오는 중 오류가 발생했습니다.");
          setStatus("오류");
          return;
        }

        if (!profile) {
          setStatus("온보딩으로 이동합니다...");
          router.replace("/onboarding/welcome");
          return;
        }

        setStatus("동의 상태 확인 중...");
        const { data: consents, error: consentErr } = await supabaseBrowser
          .from("user_consents")
          .select("id")
          .eq("user_id", userId)
          .is("revoked_at", null)
          .limit(1);

        if (consentErr) {
          setErrorMessage(consentErr.message || "동의 상태 확인 중 오류가 발생했습니다.");
          setStatus("오류");
          return;
        }

        if (!consents || consents.length === 0) {
          setStatus("동의 절차로 이동합니다...");
          router.replace("/onboarding/consent");
          return;
        }

        setStatus("대시보드로 이동합니다...");
        router.replace(next || "/dashboard");
      } catch (e: any) {
        setErrorMessage(e?.message || "예기치 못한 오류가 발생했습니다.");
        setStatus("오류");
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md">
        {!errorMessage ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-2xl" aria-hidden />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 p-2">
                  <div className="h-full w-full animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="로딩 중" />
                </div>
              </div>
              <h1 className="mb-2 text-lg font-semibold text-foreground">인증 처리 중</h1>
              <p className="mb-6 text-sm text-muted-foreground">{status}</p>
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
        ) : (
          <div className="space-y-4">
            <Alert className="border-destructive/50 bg-destructive/5">
              <AlertTitle className="text-destructive">인증에 실패했어요</AlertTitle>
              <AlertDescription className="text-muted-foreground">{errorMessage}</AlertDescription>
            </Alert>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="mb-4 text-sm text-muted-foreground">다시 시도하시려면 아래 버튼을 눌러 로그인 화면으로 이동해주세요.</p>
              <div className="flex items-center gap-3">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  로그인으로 이동
                </a>
                <a
                  href="/about"
                  className="inline-flex items-center justify-center rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/30"
                >
                  서비스 소개
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Page() {
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
