"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a production-ready UI for creating a new consent template.
 * Users can enter a title, manage multiple locales, author localized body content, preview it,
 * and save. On save, the page navigates to /consent/[consentId] and hints the next page to
 * suggest sharing via query parameters. Data persistence to database is intentionally not performed
 * here due to absent schema; instead, a temporary localStorage draft is maintained to avoid data loss.
 */

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

type LocalizedBodies = Record<string, string>;

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID() as string;
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isValidLocaleCode(code: string) {
  return /^[a-z]{2,3}(-[A-Z]{2})?$/.test(code.trim());
}

export default function Page() {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [locales, setLocales] = React.useState<string[]>(["ko"]);
  const [defaultLocale, setDefaultLocale] = React.useState<string>("ko");
  const [selectedLocale, setSelectedLocale] = React.useState<string>("ko");
  const [bodies, setBodies] = React.useState<LocalizedBodies>({ ko: "" });
  const [newLocaleInput, setNewLocaleInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = React.useState<"idle" | "saving" | "saved">("idle");

  const draftKey = React.useMemo(() => "consent:new:autosave", []);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setTitle(parsed.title ?? "");
          const loadedLocales: string[] = Array.isArray(parsed.locales) && parsed.locales.length ? Array.from(new Set(parsed.locales)) : ["ko"];
          setLocales(loadedLocales);
          setDefaultLocale(parsed.defaultLocale && loadedLocales.includes(parsed.defaultLocale) ? parsed.defaultLocale : loadedLocales[0] ?? "ko");
          setSelectedLocale(parsed.selectedLocale && loadedLocales.includes(parsed.selectedLocale) ? parsed.selectedLocale : loadedLocales[0] ?? "ko");
          setBodies(parsed.bodies && typeof parsed.bodies === "object" ? parsed.bodies : { [loadedLocales[0] ?? "ko"]: "" });
        }
      }
    } catch {}
  }, [draftKey]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      try {
        setAutosaveStatus("saving");
        const payload = {
          title,
          locales,
          defaultLocale,
          selectedLocale,
          bodies,
          ts: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 1200);
      } catch {}
    }, 400);
    return () => clearTimeout(handle);
  }, [title, locales, defaultLocale, selectedLocale, bodies, draftKey]);

  const selectedBody = bodies[selectedLocale] ?? "";

  function addLocale() {
    const code = newLocaleInput.trim();
    if (!code) return;
    if (!isValidLocaleCode(code)) {
      setError("로케일 코드는 예: ko, en, ja, en-US 형식이어야 합니다.");
      return;
    }
    if (locales.includes(code)) {
      setError("이미 추가된 로케일입니다.");
      return;
    }
    const nextLocales = [...locales, code];
    setLocales(nextLocales);
    setBodies((prev) => ({ ...prev, [code]: prev[selectedLocale] ?? "" }));
    setSelectedLocale(code);
    setNewLocaleInput("");
    setError(null);
  }

  function removeLocale(code: string) {
    if (locales.length <= 1) return;
    if (code === defaultLocale) {
      // switch default to the first remaining different locale
      const nextDefault = locales.find((l) => l !== code) ?? "ko";
      setDefaultLocale(nextDefault);
    }
    const nextLocales = locales.filter((l) => l !== code);
    setLocales(nextLocales);
    setBodies((prev) => {
      const clone = { ...prev };
      delete clone[code];
      return clone;
    });
    if (selectedLocale === code) {
      setSelectedLocale(nextLocales[0] ?? "ko");
    }
  }

  function setBodyForLocale(code: string, value: string) {
    setBodies((prev) => ({ ...prev, [code]: value }));
  }

  function validate(): string | null {
    if (!title.trim()) return "제목을 입력하세요.";
    if (!locales.length) return "최소 1개 로케일이 필요합니다.";
    if (!bodies[defaultLocale] || !bodies[defaultLocale].trim()) return "기본 로케일 본문을 입력하세요.";
    for (const code of locales) {
      if (!isValidLocaleCode(code)) return `잘못된 로케일 코드: ${code}`;
    }
    return null;
  }

  async function onSave(shareAfter?: boolean) {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      setSaving(true);
      // Simulated creation: store a temp snapshot in localStorage for continuity
      const id = generateId();
      const record = {
        id,
        title: title.trim(),
        locales,
        defaultLocale,
        bodies,
        createdAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(`consent:temp:${id}`, JSON.stringify(record));
      } catch {}

      // Clear draft after save
      try {
        localStorage.removeItem(draftKey);
      } catch {}

      if (shareAfter) {
        router.push(`/consent/${id}/share?created=1`);
      } else {
        router.push(`/consent/${id}?created=1&suggestShare=1`);
      }
    } catch (e: any) {
      setError("저장 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/dashboard" className="hover:text-foreground">대시보드</Link>
          </li>
          <li className="opacity-60">/</li>
          <li>
            <Link href="/consent" className="hover:text-foreground">동의서</Link>
          </li>
          <li className="opacity-60">/</li>
          <li className="text-foreground">새 템플릿</li>
        </ol>
      </nav>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">새 동의서 템플릿 만들기</h1>
          <p className="mt-1 text-sm text-muted-foreground">세션 시작 전 참가자의 녹음·전사 동의를 수집하세요. 다국어 템플릿을 제공하면 참여자가 언어를 선택할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/consent" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">취소</Link>
          <button
            type="button"
            onClick={() => onSave(false)}
            disabled={saving}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90",
              saving && "opacity-80"
            )}
          >
            {saving ? (
              <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" /> 저장 중…</span>
            ) : (
              <span>저장</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onSave(true)}
            disabled={saving}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/90",
              saving && "opacity-80"
            )}
          >
            저장 후 공유로 이동
          </button>
        </div>
      </div>

      <Alert className="mb-6">
        <AlertTitle>법적 고지</AlertTitle>
        <AlertDescription>
          녹음 및 전사에는 사전 동의가 필요합니다. 템플릿에 개인정보 처리 및 보존 기간을 명확히 표시하세요. 관련 정책은 {" "}
          <Link href="/legal/privacy" className="underline underline-offset-4">개인정보 처리방침</Link> 및 {" "}
          <Link href="/legal/terms" className="underline underline-offset-4">서비스 이용약관</Link>을 참조하세요.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6 border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <label htmlFor="title" className="text-sm font-medium">템플릿 제목</label>
              <span className="text-xs text-muted-foreground">{title.trim().length}자</span>
            </div>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 회의 녹음·전사 동의서 (한국어/영어)"
              className="mb-6 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">로케일</h3>
                <div className="text-xs text-muted-foreground">
                  자동 저장 상태: {autosaveStatus === "saving" ? "저장 중…" : autosaveStatus === "saved" ? "저장됨" : "대기"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {locales.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedLocale(code)}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border border-input px-3 py-1.5 text-xs",
                      selectedLocale === code ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent hover:text-accent-foreground"
                    )}
                    aria-pressed={selectedLocale === code}
                  >
                    <span className="uppercase tracking-wide">{code}</span>
                    {defaultLocale === code && (
                      <span className={cn("rounded-full bg-secondary px-1.5 py-0.5 text-[10px]", selectedLocale === code ? "text-secondary-foreground" : "text-foreground/70")}>기본</span>
                    )}
                    {locales.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLocale(code);
                        }}
                        title="로케일 삭제"
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full",
                          selectedLocale === code ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground/70",
                          "hover:opacity-80"
                        )}
                        role="button"
                        aria-label={`${code} 로케일 삭제`}
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <input
                    value={newLocaleInput}
                    onChange={(e) => setNewLocaleInput(e.target.value)}
                    placeholder="로케일 추가 (예: en, ja, en-US)"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addLocale}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    로케일 추가
                  </button>
                  <div className="relative">
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={defaultLocale}
                      onChange={(e) => setDefaultLocale(e.target.value)}
                    >
                      {locales.map((l) => (
                        <option key={l} value={l} className="uppercase">{l} (기본)</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="body" className="text-sm font-medium">본문 ({selectedLocale})</label>
              <span className="text-xs text-muted-foreground">
                길이: {(bodies[selectedLocale]?.length ?? 0).toLocaleString()}자 · 권장: 200–1500자
              </span>
            </div>
            <textarea
              id="body"
              value={selectedBody}
              onChange={(e) => setBodyForLocale(selectedLocale, e.target.value)}
              rows={12}
              placeholder={`예시 가이드\n- 본 서비스는 회의/강의의 녹음 및 전사를 수행합니다.\n- 개인정보 및 민감정보가 포함될 수 있습니다.\n- 동의 철회 방법, 보존기간, 접근제어에 대해 설명하세요.\n- 참여자의 명시적 동의를 받기 위한 체크박스 문구를 포함하세요.`}
              className="min-h-[220px] w-full rounded-md border border-input bg-background p-3 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />

            <Collapsible className="mt-4">
              <CollapsibleTrigger asChild>
                <button type="button" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M12 5v14M5 12h14"/></svg>
                  미리보기 열기/닫기
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 rounded-md border border-border bg-muted/40 p-4">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">미리보기 ({selectedLocale})</h4>
                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {selectedBody?.trim() ? selectedBody : <span className="text-muted-foreground">내용이 없습니다.</span>}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => onSave(false)}
                disabled={saving}
                className={cn("inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90", saving && "opacity-80")}
              >
                {saving ? "저장 중…" : "저장하기"}
              </button>
              <button
                type="button"
                onClick={() => onSave(true)}
                disabled={saving}
                className={cn("inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/90", saving && "opacity-80")}
              >
                저장하고 공유 설정으로 이동
              </button>
              <div className="text-xs text-muted-foreground sm:ml-2">저장 시 /consent/[id]로 이동하며 공유 안내가 표시됩니다.</div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">워크플로우 힌트</h3>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                템플릿을 만든 뒤 세션에서 사용하세요: <Link className="text-primary underline underline-offset-4" href="/sessions/new">새 세션 시작</Link>
              </li>
              <li>
                기존 동의서 보기/관리: <Link className="text-primary underline underline-offset-4" href="/consent">동의서 목록</Link>
              </li>
              <li>
                조직 보안 정책: <Link className="text-primary underline underline-offset-4" href="/org/security">보안</Link> · <Link className="text-primary underline underline-offset-4" href="/org/retention">보존 기간</Link>
              </li>
              <li>
                Zoom/Teams 연동으로 자동 요청: <Link className="text-primary underline underline-offset-4" href="/integrations/zoom">Zoom</Link> · <Link className="text-primary underline underline-offset-4" href="/integrations/teams">Teams</Link>
              </li>
              <li>
                도움말: <Link className="text-primary underline underline-offset-4" href="/help">문서 센터</Link>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">작성 팁</h3>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>수집 목적과 처리 근거(동의)를 명확히 기재하세요.</li>
              <li>보존 기간, 암호화, 접근 통제 등 보안 항목을 포함하세요.</li>
              <li>동의 철회 방법과 문의 채널을 제공하세요.</li>
              <li>언어별로 의미가 달라지지 않도록 검수하세요.</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="mt-10 text-xs text-muted-foreground">
        관련: <Link href="/sessions" className="underline underline-offset-4">세션</Link> · <Link href="/org/settings" className="underline underline-offset-4">조직 설정</Link> · <Link href="/me" className="underline underline-offset-4">내 계정</Link>
      </div>
    </div>
  );
}
