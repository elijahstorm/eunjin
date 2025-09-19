"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a production-ready New Session wizard UI that collects a session title,
 * organization context, and a required consent confirmation. Upon successful creation, it navigates users to
 * /sessions/[sessionId]/live using a generated client-side ID. It avoids database calls (no schema provided) and
 * stores minimal context in sessionStorage for potential downstream use. The page also links users to related
 * areas across the app for smooth navigation.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import { supabaseBrowser } from "@/utils/supabase/client-browser";

export default function NewSessionPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        if (!mounted) return;
        setAuthed(Boolean(data?.user));
      } catch {
        if (!mounted) return;
        setAuthed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const titleHelp = useMemo(() => {
    if (!title) return "세션의 목적을 간단히 입력하세요.";
    if (title.length < 3) return "3자 이상 입력해 주세요.";
    return undefined;
  }, [title]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title || title.trim().length < 3) {
      setError("세션 제목을 3자 이상 입력해 주세요.");
      return;
    }
    if (!consentGiven) {
      setError("녹음 및 전사에 대한 동의를 확인해 주세요.");
      return;
    }

    try {
      setCreating(true);
      const sessionId = crypto.randomUUID();
      const payload = {
        id: sessionId,
        title: title.trim(),
        org: org.trim() || null,
        consent: true,
        createdAt: new Date().toISOString(),
      } as const;

      try {
        sessionStorage.setItem(`session:${sessionId}`, JSON.stringify(payload));
      } catch {}

      router.push(`/sessions/${sessionId}/live`);
    } catch (err) {
      setError("세션 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground hover:underline">대시보드</Link>
        <span>/</span>
        <Link href="/sessions" className="hover:text-foreground hover:underline">세션</Link>
        <span>/</span>
        <span className="text-foreground">새 세션</span>
      </div>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">새 세션 만들기</h1>
          <p className="mt-1 text-sm text-muted-foreground">회의나 강의를 시작하고 실시간 전사/하이라이트를 기록합니다.</p>
        </div>
        <Link
          href="/sessions"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          세션 목록으로
        </Link>
      </div>

      {authed === false && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>로그인이 필요합니다</AlertTitle>
          <AlertDescription>
            새 세션을 생성하려면 로그인해 주세요. {" "}
            <Link href="/auth/sign-in" className="underline underline-offset-4">
              로그인하기
            </Link>{" "}
            또는 {" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              회원가입
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6" role="alert" aria-live="polite">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <label htmlFor="title" className="text-sm font-medium text-foreground">세션 제목</label>
            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 주간 회의 - 마케팅 팀"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
              required
              minLength={3}
            />
            <p className={cn("text-xs", titleHelp ? "text-muted-foreground" : "text-muted-foreground")}>{titleHelp}</p>
          </div>

          <div className="grid gap-2">
            <label htmlFor="org" className="text-sm font-medium text-foreground">조직/팀</label>
            <input
              id="org"
              name="org"
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="예: Acme Corp · 제품팀 (선택)"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="organization"
            />
            <p className="text-xs text-muted-foreground">
              조직 설정은 {" "}
              <Link href="/org/settings" className="underline underline-offset-4">조직 설정</Link>{" "}
              에서 관리할 수 있습니다.
            </p>
          </div>

          <Separator className="my-2" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={consentGiven}
                  aria-label="녹음 및 전사 동의 토글"
                  onClick={() => setConsentGiven((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    consentGiven ? "bg-primary" : "bg-input"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 translate-x-1 transform rounded-full bg-background shadow ring-1 ring-border transition-transform",
                      consentGiven && "translate-x-5"
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-foreground">녹음 및 전사 동의</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                세션 참가자의 사전 동의가 필요합니다. 동의서 템플릿은 {" "}
                <Link href="/consent/new" className="underline underline-offset-4">동의 관리</Link>{" "}
                에서 생성/공유할 수 있습니다. 개인정보 처리 관련 내용은 {" "}
                <Link href="/legal/privacy" className="underline underline-offset-4">개인정보 처리방침</Link>을 참고하세요.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors",
                "hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              {creating ? "만드는 중…" : "생성 후 라이브로 이동"}
            </button>
            <Link
              href="/sessions"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              취소
            </Link>
          </div>
        </div>
      </form>

      <div className="mt-8 grid gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">다음 단계</h2>
          <p className="mt-1 text-sm text-muted-foreground">필요 시 통합 및 자료 업로드를 설정해 보세요.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            <Link
              href="/ingest/upload"
              className="group rounded-lg border border-input bg-background p-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              녹음 파일 업로드
              <span className="block text-xs text-muted-foreground group-hover:text-accent-foreground">
                기존 회의/강의 녹음을 업로드해 전사 및 요약을 생성합니다.
              </span>
            </Link>
            <Link
              href="/integrations/zoom"
              className="group rounded-lg border border-input bg-background p-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Zoom 연동
              <span className="block text-xs text-muted-foreground group-hover:text-accent-foreground">
                계정을 연결해 회의 녹음을 자동으로 가져옵니다.
              </span>
            </Link>
            <Link
              href="/integrations/teams"
              className="group rounded-lg border border-input bg-background p-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Microsoft Teams 연동
              <span className="block text-xs text-muted-foreground group-hover:text-accent-foreground">
                팀즈 녹음을 가져와 후처리를 진행합니다.
              </span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">도움말 & 설정</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/help" className="underline underline-offset-4">도움말 센터</Link>
            <Link href="/onboarding" className="underline underline-offset-4">온보딩</Link>
            <Link href="/settings/profile" className="underline underline-offset-4">프로필 설정</Link>
            <Link href="/org/members" className="underline underline-offset-4">조직 멤버 관리</Link>
            <Link href="/org/security" className="underline underline-offset-4">보안 설정</Link>
            <Link href="/admin/metrics" className="underline underline-offset-4">운영 지표</Link>
            <Link href="/legal/terms" className="underline underline-offset-4">서비스 이용약관</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
