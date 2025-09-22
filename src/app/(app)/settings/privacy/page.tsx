"use client"

/**
 * CODE INSIGHT
 * This code's use case is a protected Privacy & Consent settings page where authenticated users can view their recorded consents and update (revoke/reinstate) them. It fetches the user's consent records from Supabase (user_consents), and allows bulk withdrawal or reinstatement. It also provides quick navigation to related data settings and the public privacy policy.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabaseBrowser } from "@/utils/supabase/client-browser"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"

interface ConsentRow {
  id: string
  user_id: string
  consent_type: string
  version: string | null
  given_at: string
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [consents, setConsents] = useState<ConsentRow[]>([])

  useEffect(() => {
    let ignore = false
    async function init() {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const sb = supabaseBrowser
        const { data: authData, error: authErr } = await sb.auth.getUser()
        if (authErr) throw authErr
        const uid = authData.user?.id || null
        setUserId(uid)
        if (!uid) {
          setConsents([])
          return
        }
        const { data, error: qErr } = await sb
          .from("user_consents")
          .select("*")
          .eq("user_id", uid)
          .order("given_at", { ascending: false })
        if (qErr) throw qErr
        if (!ignore) setConsents(data || [])
      } catch (e: any) {
        if (!ignore) setError(e?.message || "동의 내역을 불러오지 못했습니다.")
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  const activeConsents = useMemo(() => consents.filter(c => !c.revoked_at), [consents])
  const revokedConsents = useMemo(() => consents.filter(c => !!c.revoked_at), [consents])

  function toLabel(type: string) {
    const map: Record<string, string> = {
      terms_of_service: "서비스 이용약관",
      privacy_policy: "개인정보 처리방침",
      data_processing: "데이터 처리 동의",
      analytics_tracking: "분석/사용성 데이터 수집",
      marketing_emails: "마케팅 이메일 수신",
      research_opt_in: "개선/연구 목적 데이터 활용",
    }
    if (map[type]) return map[type]
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  }

  function fmtDate(iso?: string | null) {
    if (!iso) return "—"
    try {
      const d = new Date(iso)
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    } catch {
      return iso || "—"
    }
  }

  async function refresh() {
    const sb = supabaseBrowser
    if (!userId) return
    const { data, error: qErr } = await sb
      .from("user_consents")
      .select("*")
      .eq("user_id", userId)
      .order("given_at", { ascending: false })
    if (qErr) throw qErr
    setConsents(data || [])
  }

  async function handleToggle(consentId: string, revoke: boolean) {
    setUpdating(true)
    setError(null)
    setSuccess(null)
    try {
      const sb = supabaseBrowser
      const payload = revoke ? { revoked_at: new Date().toISOString() } : { revoked_at: null }
      const { error: uErr } = await sb
        .from("user_consents")
        .update(payload)
        .eq("id", consentId)
        .select("id")
        .single()
      if (uErr) throw uErr
      await refresh()
      setSuccess(revoke ? "동의를 철회했습니다." : "동의를 다시 인정했습니다.")
    } catch (e: any) {
      setError(e?.message || "업데이트 중 오류가 발생했습니다.")
    } finally {
      setUpdating(false)
    }
  }

  async function handleWithdrawAll() {
    if (!userId) return
    if (!confirm("모든 활성 동의를 철회하시겠어요?")) return
    setUpdating(true)
    setError(null)
    setSuccess(null)
    try {
      const sb = supabaseBrowser
      const now = new Date().toISOString()
      const { error: uErr } = await sb
        .from("user_consents")
        .update({ revoked_at: now })
        .is("revoked_at", null)
        .eq("user_id", userId)
      if (uErr) throw uErr
      await refresh()
      setSuccess("모든 활성 동의를 철회했습니다.")
    } catch (e: any) {
      setError(e?.message || "일괄 철회 중 오류가 발생했습니다.")
    } finally {
      setUpdating(false)
    }
  }

  async function handleReinstateAll() {
    if (!userId) return
    if (!confirm("철회된 모든 동의를 다시 인정하시겠어요?")) return
    setUpdating(true)
    setError(null)
    setSuccess(null)
    try {
      const sb = supabaseBrowser
      const { error: uErr } = await sb
        .from("user_consents")
        .update({ revoked_at: null })
        .not("revoked_at", "is", null)
        .eq("user_id", userId)
      if (uErr) throw uErr
      await refresh()
      setSuccess("철회된 동의를 다시 인정했습니다.")
    } catch (e: any) {
      setError(e?.message || "일괄 재인정 중 오류가 발생했습니다.")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">개인정보 및 동의</h1>
          <p className="mt-1 text-sm text-muted-foreground">poiima 서비스에서 수집·이용되는 데이터와 동의 상태를 관리하세요.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/dashboard" className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <svg className="mr-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.707 14.707a1 1 0 01-1.414 0L6.586 10l4.707-4.707a1 1 0 011.414 1.414L9.414 10l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
            대시보드
          </Link>
          <Link href="/settings/data" className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">데이터 관리</Link>
          <Link href="/privacy" className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">공개 정책 보기</Link>
        </div>
      </div>

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-600/40 bg-green-600/10 text-foreground">
          <AlertTitle>완료</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!userId && !loading && (
        <Alert className="mb-6">
          <AlertTitle>로그인이 필요합니다</AlertTitle>
          <AlertDescription>
            동의 설정을 보려면 로그인해주세요. {" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">로그인하기</Link>
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="active-consents">
        <div className="flex items-center justify-between">
          <h2 id="active-consents" className="text-lg font-medium text-foreground">활성 동의</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleWithdrawAll} disabled={updating || activeConsents.length === 0} className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
              전체 철회
            </button>
            <button onClick={handleReinstateAll} disabled={updating || revokedConsents.length === 0} className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
              전체 재인정
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-card">
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex min-w-0 flex-col">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-64" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          ) : activeConsents.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              활성화된 동의가 없습니다. 필요한 경우 {" "}
              <Link href="/onboarding/consent" className="text-foreground underline underline-offset-4 hover:text-primary">동의 설정 페이지</Link>
              에서 진행할 수 있습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activeConsents.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-medium text-foreground">{toLabel(c.consent_type)}</span>
                      {c.version && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">v{c.version}</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">동의 일시: {fmtDate(c.given_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href="/privacy" className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">정책 보기</Link>
                    <button
                      onClick={() => handleToggle(c.id, true)}
                      disabled={updating}
                      className="inline-flex items-center rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
                    >
                      철회
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Separator className="my-8" />

      <section aria-labelledby="revoked-consents">
        <div className="flex items-center justify-between">
          <h2 id="revoked-consents" className="text-lg font-medium text-foreground">철회된 동의</h2>
        </div>
        <div className="mt-3 rounded-lg border border-border bg-card">
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex min-w-0 flex-col">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="mt-2 h-3 w-56" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                </div>
              ))}
            </div>
          ) : revokedConsents.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">철회된 동의가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-border">
              {revokedConsents.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-sm font-medium text-foreground">{toLabel(c.consent_type)}</span>
                      {c.version && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">v{c.version}</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">철회 일시: {fmtDate(c.revoked_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleToggle(c.id, false)}
                      disabled={updating}
                      className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                      다시 인정
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Separator className="my-8" />

      <section aria-labelledby="policy-faq">
        <h2 id="policy-faq" className="text-lg font-medium text-foreground">정책 요약</h2>
        <div className="mt-3 rounded-lg border border-border bg-card p-4">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="group inline-flex w-full items-center justify-between rounded-md border border-transparent bg-background px-3 py-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                수집 목적과 범위 간단히 보기
                <svg className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>poiima는 학습 기능 제공을 위해 아래 데이터를 처리합니다.</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>계정 식별 정보(인증, 보안)</li>
                  <li>업로드 문서 및 파생 데이터(요약, 퀴즈, 임베딩)</li>
                  <li>사용성 분석 및 서비스 개선 목적의 이벤트 데이터</li>
                </ul>
                <p>
                  자세한 내용은 {" "}
                  <Link href="/privacy" className="text-foreground underline underline-offset-4 hover:text-primary">개인정보 처리방침</Link>
                  을 참고하세요.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">동의 설정을 더 변경하고 싶으신가요?</p>
          <p className="text-xs text-muted-foreground">온보딩 동의 화면에서 필요한 항목을 추가로 설정할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/onboarding/consent" className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">동의 설정 이동</Link>
          <Link href="/settings/data" className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">데이터 관리로</Link>
        </div>
      </div>
    </div>
  )
}
