"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a polished, global 404 (Not Found) page.
 * It offers a friendly message, a path back to the landing page, and, if the user is authenticated via Supabase, a quick link to the dashboard.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";

export default function NotFound() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
      } catch {
        // no-op: fall back to unauthenticated state
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const isAuthed = !!session?.user;

  return (
    <main className="relative w-full">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className={cn(
            "absolute -top-24 left-1/2 h-64 w-[48rem] -translate-x-1/2 rounded-full blur-3xl",
            "bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20"
          )}
          aria-hidden
        />
      </div>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-14 sm:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          poiima · 페이지를 찾을 수 없어요
        </div>

        <div className="text-center">
          <h1 className="text-6xl font-extrabold tracking-tight text-foreground sm:text-7xl">
            <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">404</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 주소가 변경되었어요.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            링크를 다시 확인하시거나 아래 버튼으로 계속 진행해 주세요.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium",
              "bg-primary text-primary-foreground shadow-sm",
              "hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "transition-colors"
            )}
          >
            홈으로 가기
          </Link>

          {isAuthed && (
            <Link
              href="/dashboard"
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium",
                "bg-secondary text-secondary-foreground border border-border",
                "hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "transition-colors"
              )}
            >
              대시보드로 이동
            </Link>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium",
              "bg-card text-foreground border border-border",
              "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "transition-colors"
            )}
          >
            이전 페이지로 돌아가기
          </button>
        </div>

        <div className="mt-6 w-full max-w-xl rounded-xl border border-dashed border-border bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
              !
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <span className="inline-block animate-pulse">상태 확인 중...</span>
              ) : isAuthed ? (
                <span>로그인 상태가 확인되었습니다. 대시보드에서 계속 학습을 이어가세요.</span>
              ) : (
                <span>로그인하지 않은 상태입니다. 홈에서 poiima를 시작해 보세요.</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
