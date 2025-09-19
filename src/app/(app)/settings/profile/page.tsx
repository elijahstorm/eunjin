"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the user's profile and preferences page, allowing updates to display name,
 * locale, and time zone stored in Supabase Auth user_metadata. It links users to related sections like /me and
 * /dashboard for smooth navigation within the authenticated app. This is a client component using the browser
 * Supabase client and Tailwind for styling.
 */

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

type PreferencesState = {
  displayName: string;
  locale: string;
  timeZone: string;
};

const LOCALES: { value: string; label: string }[] = [
  { value: "auto", label: "브라우저 자동" },
  { value: "ko-KR", label: "한국어 (대한민국)" },
  { value: "en-US", label: "English (United States)" },
  { value: "ja-JP", label: "日本語 (日本)" },
  { value: "zh-CN", label: "中文 (简体, 中国)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "fr-FR", label: "Français (France)" },
];

function getSupportedTimeZones(): string[] {
  try {
    // @ts-ignore - supportedValuesOf may not be in all TS libs
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
      // @ts-ignore
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {}
  return [
    "Asia/Seoul",
    "UTC",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];
}

function useUserProfile() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (!mounted) return;
      if (error) {
        setError(error.message || "사용자 정보를 불러오지 못했습니다.");
        setUser(null);
      } else {
        setUser(data.user ?? null);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, user, error };
}

function initialPrefsFromUser(user: any): PreferencesState {
  const md = user?.user_metadata || {};
  const browserLocale = (typeof navigator !== "undefined" && navigator.language) || "ko-KR";
  const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
  const displayNameSuggest = md.display_name || md.name || user?.email?.split("@")[0] || "";
  return {
    displayName: displayNameSuggest,
    locale: md.locale || "auto",
    timeZone: md.time_zone || browserTZ,
  };
}

function initialsFrom(user: any, displayName: string): string {
  const name = displayName?.trim() || user?.email || "";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "U";
}

function formatExample(dt: Date, locale: string, timeZone: string): string {
  try {
    const loc = locale === "auto" ? undefined : locale;
    return new Intl.DateTimeFormat(loc, { dateStyle: "full", timeStyle: "long", timeZone }).format(dt);
  } catch {
    return dt.toLocaleString();
  }
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { loading, user, error } = useUserProfile();
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const timeZones = React.useMemo(() => getSupportedTimeZones(), []);

  const [prefs, setPrefs] = React.useState<PreferencesState>(() => initialPrefsFromUser(null));
  const [initial, setInitial] = React.useState<PreferencesState>(() => initialPrefsFromUser(null));

  React.useEffect(() => {
    if (!loading && user) {
      const init = initialPrefsFromUser(user);
      setInitial(init);
      setPrefs(init);
    }
  }, [loading, user]);

  const dirty =
    prefs.displayName !== initial.displayName ||
    prefs.locale !== initial.locale ||
    prefs.timeZone !== initial.timeZone;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const payload: Record<string, any> = {
        display_name: prefs.displayName,
        locale: prefs.locale,
        time_zone: prefs.timeZone,
      };
      const { error } = await supabaseBrowser.auth.updateUser({ data: payload });
      if (error) throw error;
      setInitial(prefs);
      setSaveSuccess("프로필이 업데이트되었습니다.");
      // Soft refresh of session to propagate metadata
      await supabaseBrowser.auth.getUser();
    } catch (err: any) {
      setSaveError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => setPrefs(initial);
  const onBrowserDefaults = () => {
    setPrefs((p) => ({
      ...p,
      locale: "auto",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || p.timeZone,
    }));
  };

  const exampleNow = React.useMemo(() => formatExample(new Date(), prefs.locale, prefs.timeZone), [prefs.locale, prefs.timeZone]);

  return (
    <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
              </li>
              <li className="px-1">/</li>
              <li>
                <Link href="/me" className="hover:text-foreground transition-colors">내 정보</Link>
              </li>
              <li className="px-1">/</li>
              <li className="text-foreground">프로필 및 환경설정</li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">프로필 및 환경설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">표시 이름, 언어 및 시간대를 관리합니다.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Link href="/sessions" className="text-sm text-muted-foreground hover:text-foreground">세션</Link>
          <Separator orientation="vertical" className="h-4" />
          <Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground">연동</Link>
          <Separator orientation="vertical" className="h-4" />
          <Link href="/settings/notifications" className="text-sm text-muted-foreground hover:text-foreground">알림</Link>
          <Separator orientation="vertical" className="h-4" />
          <Link href="/settings/devices" className="text-sm text-muted-foreground hover:text-foreground">장치</Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!error && !loading && !user && (
          <Alert className="border-border bg-card">
            <AlertTitle>로그인이 필요합니다</AlertTitle>
            <AlertDescription>
              계속하려면 계정에 로그인하세요. <Link className="underline underline-offset-4" href="/(auth)/auth/sign-in">로그인</Link>
            </AlertDescription>
          </Alert>
        )}

        {saveError && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10" aria-live="polite">
            <AlertTitle>저장 실패</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {saveSuccess && (
          <Alert className="border-border bg-card" aria-live="polite">
            <AlertTitle>완료</AlertTitle>
            <AlertDescription>{saveSuccess}</AlertDescription>
          </Alert>
        )}

        <section className="bg-card text-card-foreground border border-border rounded-xl">
          <form onSubmit={onSave} className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
                {initialsFrom(user, prefs.displayName)}
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="displayName" className="text-sm font-medium">표시 이름</label>
                    <input
                      id="displayName"
                      type="text"
                      value={prefs.displayName}
                      onChange={(e) => setPrefs((p) => ({ ...p, displayName: e.target.value }))}
                      placeholder="이름"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="text-xs text-muted-foreground">앱과 공유 링크에 표시되는 이름입니다.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">이메일</label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">로그인에 사용되는 이메일입니다.</p>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="locale" className="text-sm font-medium">언어</label>
                    <select
                      id="locale"
                      value={prefs.locale}
                      onChange={(e) => setPrefs((p) => ({ ...p, locale: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    >
                      {LOCALES.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">UI 언어 및 날짜/시간 형식에 사용됩니다.</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="timezone" className="text-sm font-medium">시간대</label>
                    <div className="relative">
                      <select
                        id="timezone"
                        value={prefs.timeZone}
                        onChange={(e) => setPrefs((p) => ({ ...p, timeZone: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      >
                        {timeZones.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">타임스탬프와 일정 표시의 기준 시간대입니다.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">미리보기</p>
                  <p className="mt-1 text-sm">{exampleNow}</p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!dirty || saving || !user}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      (saving || !dirty || !user) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {saving ? "저장 중..." : "변경사항 저장"}
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    disabled={!dirty || saving}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                      "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                      (!dirty || saving) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={onBrowserDefaults}
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-medium border border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    브라우저 기본값 적용
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <section className="bg-card text-card-foreground border border-border rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">빠른 이동</h2>
          <p className="mt-1 text-sm text-muted-foreground">관련 기능으로 빠르게 이동하세요.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickLink href="/me" title="내 정보" desc="프로필 및 계정 요약" />
            <QuickLink href="/dashboard" title="대시보드" desc="요약과 최근 세션" />
            <QuickLink href="/sessions" title="세션" desc="회의/강의 기록 보기" />
            <QuickLink href="/integrations/zoom" title="Zoom 연동" desc="녹음 가져오기 설정" />
            <QuickLink href="/integrations/teams" title="Teams 연동" desc="조직 계정 연결" />
            <QuickLink href="/settings/notifications" title="알림 설정" desc="이메일/브라우저 알림" />
            <QuickLink href="/settings/devices" title="장치 관리" desc="마이크/스피커 테스트" />
            <QuickLink href="/org/settings" title="조직 설정" desc="멤버 및 권한 관리" />
            <QuickLink href="/consent" title="녹음 동의" desc="동의 기록 및 공유" />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/help" className="text-muted-foreground hover:text-foreground">도움말 센터</Link>
          <Separator orientation="vertical" className="h-4" />
          <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">개인정보처리방침</Link>
          <Separator orientation="vertical" className="h-4" />
          <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">이용약관</Link>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-lg border border-border bg-background p-4",
        "hover:bg-accent hover:text-accent-foreground transition-colors"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-accent-foreground/80">{desc}</p>
        </div>
        <span className="text-muted-foreground group-hover:text-accent-foreground" aria-hidden>
          →
        </span>
      </div>
    </Link>
  );
}
