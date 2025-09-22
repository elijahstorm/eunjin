"use client"

/**
 * CODE INSIGHT
 * This code's use case is the Preferences page for authenticated users to manage UI language (Korean default), theme appearance, and general UI options. 
 * It loads and updates the user's profile preferences via Supabase and stores local-only UI toggles in localStorage. 
 * The page includes a simple settings sub-navigation and a link back to the dashboard. Header, footer, and sidebar are provided by layout and are not included here.
 */

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/utils/supabase/client-browser"
import { cn } from "@/utils/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

type ThemeOption = "system" | "light" | "dark"

type ProfilePrefs = {
  preferred_language: string
  ui_theme: ThemeOption
  palette_name: string | null
}

const LANG_OPTIONS: { value: string; label: string }[] = [
  { value: "ko", label: "한국어 (기본)" },
  { value: "en", label: "English" },
]

const THEME_OPTIONS: { value: ThemeOption; label: string; hint: string }[] = [
  { value: "system", label: "시스템", hint: "OS 설정을 따릅니다" },
  { value: "light", label: "라이트", hint: "밝은 테마" },
  { value: "dark", label: "다크", hint: "어두운 테마" },
]

const PALETTES: { key: string; label: string; colors: string[] }[] = [
  { key: "poiima", label: "poiima 기본", colors: ["bg-primary", "bg-secondary", "bg-accent"] },
  { key: "ocean", label: "Ocean", colors: ["bg-sky-500", "bg-cyan-500", "bg-blue-600"] },
  { key: "forest", label: "Forest", colors: ["bg-emerald-500", "bg-teal-500", "bg-green-600"] },
  { key: "rose", label: "Rose", colors: ["bg-rose-500", "bg-pink-500", "bg-fuchsia-500"] },
]

const LOCAL_UI_KEYS = {
  compact: "poiima:ui:compact",
  reducedMotion: "poiima:ui:reducedMotion",
  tooltips: "poiima:ui:tooltips",
}

export default function PreferencesPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [serverPrefs, setServerPrefs] = React.useState<ProfilePrefs | null>(null)
  const [language, setLanguage] = React.useState<string>("ko")
  const [theme, setTheme] = React.useState<ThemeOption>("system")
  const [palette, setPalette] = React.useState<string>("poiima")

  const [compactMode, setCompactMode] = React.useState(false)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  const [showTooltips, setShowTooltips] = React.useState(true)

  const supabase = supabaseBrowser

  React.useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const { data: auth } = await supabase.auth.getUser()
        const user = auth?.user
        if (!user) {
          throw new Error("로그인이 필요합니다.")
        }
        const { data, error: qErr } = await supabase
          .from("profiles")
          .select("preferred_language, ui_theme, palette_name")
          .eq("user_id", user.id)
          .single()

        if (qErr && qErr.code !== "PGRST116") {
          // PGRST116: No rows returned
          throw qErr
        }

        const prefs: ProfilePrefs = {
          preferred_language: data?.preferred_language || "ko",
          ui_theme: (data?.ui_theme as ThemeOption) || "system",
          palette_name: data?.palette_name || "poiima",
        }
        if (!mounted) return
        setServerPrefs(prefs)
        setLanguage(prefs.preferred_language)
        setTheme(prefs.ui_theme)
        setPalette(prefs.palette_name || "poiima")
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "설정을 불러오지 못했습니다.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Load local-only UI toggles
    const compact = localStorage.getItem(LOCAL_UI_KEYS.compact)
    const reduced = localStorage.getItem(LOCAL_UI_KEYS.reducedMotion)
    const tips = localStorage.getItem(LOCAL_UI_KEYS.tooltips)
    setCompactMode(compact === "1")
    setReducedMotion(reduced === "1")
    setShowTooltips(tips === null ? true : tips === "1")

    load()
    return () => {
      mounted = false
    }
  }, [supabase])

  const dirty = React.useMemo(() => {
    if (!serverPrefs) return true
    return (
      serverPrefs.preferred_language !== language ||
      serverPrefs.ui_theme !== theme ||
      (serverPrefs.palette_name || "poiima") !== palette
    )
  }, [serverPrefs, language, theme, palette])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) throw new Error("로그인이 필요합니다.")

      const payload = {
        user_id: user.id,
        preferred_language: language,
        ui_theme: theme,
        palette_name: palette,
        updated_at: new Date().toISOString(),
      }
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" })

      if (upErr) throw upErr

      setServerPrefs({
        preferred_language: language,
        ui_theme: theme,
        palette_name: palette,
      })
      setSuccess("설정이 저장되었습니다.")
    } catch (e: any) {
      setError(e?.message || "설정을 저장하지 못했습니다.")
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (!serverPrefs) return
    setLanguage(serverPrefs.preferred_language)
    setTheme(serverPrefs.ui_theme)
    setPalette(serverPrefs.palette_name || "poiima")
    setSuccess(null)
    setError(null)
  }

  function toggleLocal(key: keyof typeof LOCAL_UI_KEYS, value: boolean) {
    const storageKey = LOCAL_UI_KEYS[key]
    localStorage.setItem(storageKey, value ? "1" : "0")
  }

  React.useEffect(() => {
    toggleLocal("compact", compactMode)
  }, [compactMode])

  React.useEffect(() => {
    toggleLocal("reducedMotion", reducedMotion)
  }, [reducedMotion])

  React.useEffect(() => {
    toggleLocal("tooltips", showTooltips)
  }, [showTooltips])

  return (
    <main className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">환경 설정</h1>
          <p className="text-sm text-muted-foreground mt-1">언어, 테마, 일반 UI 옵션을 자유롭게 설정하세요.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition"
        >
          대시보드로
        </Link>
      </div>

      <nav aria-label="설정" className="mt-6">
        <div className="flex gap-2 overflow-x-auto">
          <SubNavLink href="/settings/account">계정</SubNavLink>
          <SubNavLink href="/settings/preferences" active>
            환경 설정
          </SubNavLink>
          <SubNavLink href="/settings/privacy">개인정보</SubNavLink>
          <SubNavLink href="/settings/data">데이터</SubNavLink>
          <SubNavLink href="/settings/usage">이용 내역</SubNavLink>
        </div>
      </nav>

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border border-green-600/40 bg-green-600/10 text-foreground">
          <AlertTitle>완료</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      ) : (
        <form onSubmit={handleSave} aria-busy={saving} className="space-y-8">
          {/* Language */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">언어</h2>
                <p className="text-sm text-muted-foreground mt-1">서비스 기본 언어를 선택하세요. poiima는 한국어에 최적화되어 있습니다.</p>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="language" className="block text-sm font-medium text-foreground mb-2">
                표시 언어
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LANG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Appearance */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">모양</h2>
                <p className="text-sm text-muted-foreground mt-1">테마와 포인트 팔레트를 설정합니다.</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-foreground mb-2">테마</p>
              <div className="inline-flex overflow-hidden rounded-lg border border-input bg-background">
                {THEME_OPTIONS.map((opt, idx) => {
                  const active = theme === opt.value
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "px-4 py-2 text-sm transition focus:outline-none",
                        idx !== THEME_OPTIONS.length - 1 && "border-r border-input",
                        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-pressed={active}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium leading-none">{opt.label}</span>
                        <span className="text-xs opacity-80 mt-0.5">{opt.hint}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-foreground mb-3">팔레트</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PALETTES.map((p) => {
                  const active = palette === p.key
                  return (
                    <label
                      key={p.key}
                      className={cn(
                        "cursor-pointer rounded-lg border bg-background p-3 transition shadow-sm",
                        active ? "border-primary ring-2 ring-primary" : "border-input hover:bg-accent/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="palette"
                        value={p.key}
                        checked={active}
                        onChange={() => setPalette(p.key)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{p.label}</span>
                        <div className="flex items-center gap-1.5">
                          {p.colors.map((c, i) => (
                            <span key={i} className={cn("h-4 w-4 rounded", c)} />
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 rounded-md border border-border bg-card p-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded px-2 py-0.5 text-xs bg-primary text-primary-foreground">버튼</span>
                          <span className="rounded px-2 py-0.5 text-xs bg-secondary text-secondary-foreground">보조</span>
                          <span className="rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">뮤트</span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </section>

          {/* General UI */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">일반</h2>
                <p className="text-sm text-muted-foreground mt-1">일반 UI 동작을 선택하세요. 이 옵션은 브라우저에만 저장됩니다.</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <ToggleRow
                label="컴팩트 모드"
                description="여백을 줄여 더 많은 정보를 한 화면에서 볼 수 있습니다."
                checked={compactMode}
                onChange={setCompactMode}
              />
              <ToggleRow
                label="감소된 모션"
                description="애니메이션과 전환 효과를 최소화합니다."
                checked={reducedMotion}
                onChange={setReducedMotion}
              />
              <ToggleRow
                label="도움말 힌트 표시"
                description="필요한 위치에 간단한 안내 문구를 보여줍니다."
                checked={showTooltips}
                onChange={setShowTooltips}
              />
            </div>
          </section>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              disabled={saving || !dirty}
              className={cn(
                "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
                dirty && !saving ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground",
                saving && "opacity-70 cursor-not-allowed"
              )}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!serverPrefs || !dirty || saving}
              className={cn(
                "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground",
                (!serverPrefs || !dirty || saving) && "opacity-70 cursor-not-allowed"
              )}
            >
              재설정
            </button>
            <div className="flex-1" />
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition"
            >
              설정 홈
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}

function SubNavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition border",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-background shadow transition",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    </div>
  )
}
