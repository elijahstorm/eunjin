"use client"

/**
 * CODE INSIGHT
 * This page renders the Quiz configuration and history for a specific document.
 * It provides controls to choose quiz type, difficulty, scope, and question count.
 * It also lists past quiz attempts for this document and links to view results.
 * Users can start a new quiz which navigates to the quiz take page with query parameters.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabaseBrowser } from "@/utils/supabase/client-browser"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/utils/utils"

interface DocRow {
  id: string
  title: string
  page_count: number | null
}

interface AttemptRow {
  id: string
  started_at: string
  completed_at: string | null
  score: string | number | null
  quiz_sets?: {
    id: string
    title: string
    type: string | null
    difficulty: string | null
  } | null
}

export default function Page() {
  const router = useRouter()
  const params = useParams()
  const docId = Array.isArray(params?.docId) ? params.docId[0] : (params?.docId as string | undefined)

  const supabase = useMemo(() => supabaseBrowser, [])

  const [userId, setUserId] = useState<string | null>(null)
  const [doc, setDoc] = useState<DocRow | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const storageKey = docId ? `poiima.quiz.config.${docId}` : undefined
  const [quizType, setQuizType] = useState<"mcq" | "short" | "subjective" | "flashcard">("mcq")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [scope, setScope] = useState<"entire" | "pages">("entire")
  const [pageFrom, setPageFrom] = useState<number | "">("")
  const [pageTo, setPageTo] = useState<number | "">("")
  const [count, setCount] = useState<number>(10)

  // Load persisted form state
  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved?.quizType) setQuizType(saved.quizType)
        if (saved?.difficulty) setDifficulty(saved.difficulty)
        if (saved?.scope) setScope(saved.scope)
        if (typeof saved?.pageFrom !== "undefined") setPageFrom(saved.pageFrom)
        if (typeof saved?.pageTo !== "undefined") setPageTo(saved.pageTo)
        if (typeof saved?.count === "number") setCount(saved.count)
      }
    } catch {}
  }, [storageKey])

  // Persist form state
  useEffect(() => {
    if (!storageKey) return
    const data = { quizType, difficulty, scope, pageFrom, pageTo, count }
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {}
  }, [storageKey, quizType, difficulty, scope, pageFrom, pageTo, count])

  useEffect(() => {
    let isMounted = true
    async function init() {
      if (!docId) return
      setLoading(true)
      setError(null)
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser()
        if (userErr) throw userErr
        const uid = userData.user?.id ?? null
        if (!uid) {
          if (!isMounted) return
          setUserId(null)
          setDoc(null)
          setAttempts(null)
          setLoading(false)
          return
        }
        if (!isMounted) return
        setUserId(uid)

        // Fetch document
        const { data: docRows, error: docErr } = await supabase
          .from("documents")
          .select("id,title,page_count")
          .eq("id", docId)
          .limit(1)
        if (docErr) throw docErr
        const docRow = docRows?.[0] ?? null
        if (!docRow) {
          if (!isMounted) return
          setError("문서를 찾을 수 없어요. 접근 권한을 확인해 주세요.")
          setDoc(null)
          setAttempts([])
          setLoading(false)
          return
        }
        if (!isMounted) return
        setDoc(docRow as DocRow)

        // Fetch attempts for this document and user
        const { data: attemptRows, error: attErr } = await supabase
          .from("quiz_attempts")
          .select(
            "id, started_at, completed_at, score, quiz_sets:quiz_set_id(id,title,type,difficulty,document_id)"
          )
          .eq("user_id", uid)
          .eq("quiz_sets.document_id", docId)
          .order("started_at", { ascending: false })
          .limit(50)
        if (attErr) throw attErr
        if (!isMounted) return
        setAttempts((attemptRows as AttemptRow[]) ?? [])
      } catch (e: any) {
        if (!isMounted) return
        setError(e?.message || "문제가 발생했어요. 잠시 후 다시 시도해 주세요.")
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [docId, supabase])

  const onStart = () => {
    if (!docId) return
    // Validate pages if scope is pages
    if (scope === "pages") {
      const from = typeof pageFrom === "number" ? pageFrom : parseInt(String(pageFrom || 0), 10)
      const to = typeof pageTo === "number" ? pageTo : parseInt(String(pageTo || 0), 10)
      if (!from || !to || from < 1 || to < 1 || (doc?.page_count ? to > doc.page_count : false) || from > to) {
        setError("페이지 범위를 올바르게 입력해 주세요.")
        return
      }
    }
    const params = new URLSearchParams()
    params.set("type", quizType)
    params.set("difficulty", difficulty)
    params.set("scope", scope)
    params.set("count", String(count))
    if (scope === "pages") {
      params.set("from", String(pageFrom))
      params.set("to", String(pageTo))
    }
    router.push(`/documents/${docId}/quiz/take?${params.toString()}`)
  }

  const loginAlert = !loading && !userId

  return (
    <main className="w-full">
      {/* Top tabs */}
      <nav className="mb-6">
        <div className="flex w-full overflow-x-auto gap-2">
          <Link
            href={docId ? `/documents/${docId}/summary` : "#"}
            className={cn(
              "px-4 py-2 rounded-lg text-sm border",
              "bg-muted/40 hover:bg-muted text-foreground border-border"
            )}
            prefetch={false}
          >
            요약
          </Link>
          <Link
            href={docId ? `/documents/${docId}/chat` : "#"}
            className={cn(
              "px-4 py-2 rounded-lg text-sm border",
              "bg-muted/40 hover:bg-muted text-foreground border-border"
            )}
            prefetch={false}
          >
            채팅
          </Link>
          <span
            className={cn(
              "px-4 py-2 rounded-lg text-sm border",
              "bg-primary text-primary-foreground border-primary"
            )}
          >
            퀴즈
          </span>
          <div className="flex-1" />
          <Link
            href={docId ? `/documents/${docId}` : "#"}
            className="px-3 py-2 rounded-md text-sm border bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
            prefetch={false}
          >
            문서로 돌아가기
          </Link>
        </div>
      </nav>

      {loginAlert && (
        <Alert className="mb-6 border-destructive/30">
          <AlertTitle className="font-semibold">로그인이 필요해요</AlertTitle>
          <AlertDescription>
            퀴즈 설정과 기록은 로그인 후 이용할 수 있어요. {" "}
            <Link href="/login" className="underline underline-offset-4">로그인</Link>
          </AlertDescription>
        </Alert>
      )}

      {!!error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>오류가 발생했어요</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold tracking-tight">퀴즈 설정</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {doc ? `${doc.title}${doc.page_count ? ` · ${doc.page_count}p` : ""}` : "문서 정보"}
                </p>
              </>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Configuration Card */}
          <div className="lg:col-span-2">
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm">
              <div className="p-4 sm:p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-medium mb-3">문항 형식</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { key: "mcq", label: "객관식(MCQ)", desc: "보기 선택" },
                        { key: "short", label: "단답형", desc: "짧은 답" },
                        { key: "subjective", label: "서술형", desc: "서술식" },
                        { key: "flashcard", label: "플래시카드", desc: "앞뒤 카드" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setQuizType(opt.key)}
                        className={cn(
                          "relative text-left rounded-lg border p-3 transition",
                          "bg-muted/30 hover:bg-muted/50 border-border",
                          quizType === opt.key && "ring-2 ring-primary border-primary bg-primary/5"
                        )}
                        aria-pressed={quizType === opt.key}
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="bg-border" />

                <div>
                  <h2 className="text-sm font-medium mb-3">난이도</h2>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "easy", label: "쉬움" },
                        { key: "medium", label: "보통" },
                        { key: "hard", label: "어려움" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDifficulty(opt.key)}
                        className={cn(
                          "px-3 py-2 rounded-md border text-sm",
                          difficulty === opt.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-foreground hover:bg-muted border-border"
                        )}
                        aria-pressed={difficulty === opt.key}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-3">
                  <h2 className="text-sm font-medium">출제 범위</h2>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        value="entire"
                        checked={scope === "entire"}
                        onChange={() => setScope("entire")}
                        className="h-4 w-4 text-primary border-input"
                      />
                      <span className="text-sm">문서 전체</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="scope"
                          value="pages"
                          checked={scope === "pages"}
                          onChange={() => setScope("pages")}
                          className="h-4 w-4 text-primary border-input"
                        />
                        <span className="text-sm">페이지 범위</span>
                      </label>
                      {scope === "pages" && (
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="number"
                            min={1}
                            max={doc?.page_count ?? undefined}
                            value={pageFrom}
                            onChange={(e) => setPageFrom(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="시작"
                            className="w-20 rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="text-muted-foreground">~</span>
                          <input
                            type="number"
                            min={1}
                            max={doc?.page_count ?? undefined}
                            value={pageTo}
                            onChange={(e) => setPageTo(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="끝"
                            className="w-20 rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          {doc?.page_count ? (
                            <span className="text-xs text-muted-foreground">(1 ~ {doc.page_count})</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">문항 수</label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={30}
                        step={5}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <span className="w-10 text-right text-sm tabular-nums">{count}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">추천</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[5, 10, 15, 20, 25, 30].map((n) => (
                        <button
                          type="button"
                          key={n}
                          onClick={() => setCount(n)}
                          className={cn(
                            "px-3 py-1.5 rounded-md border text-sm",
                            count === n
                              ? "bg-secondary text-secondary-foreground border-secondary"
                              : "bg-muted/40 hover:bg-muted border-border"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={onStart}
                    disabled={loading || !userId || !docId}
                    className={cn(
                      "inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      (loading || !userId || !docId) && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    퀴즈 시작
                  </button>
                  <div className="text-xs text-muted-foreground">
                    • 설정은 자동 저장됩니다
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick info / Tips */}
          <aside className="lg:col-span-1">
            <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
              <h3 className="text-sm font-semibold">학습 팁</h3>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>짧은 퀴즈(5~10문항)로 집중도 유지</li>
                <li>문서 전체 → 핵심 이해, 페이지 범위 → 선택 복습</li>
                <li>어려움 난이도는 개념 정리 후 추천</li>
              </ul>
              <Separator className="bg-border" />
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">다른 도구</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/quizzes/adaptive"
                    className="px-3 py-1.5 rounded-md border bg-muted/40 hover:bg-muted text-sm border-border"
                    prefetch={false}
                  >
                    맞춤(오답 기반) 퀴즈
                  </Link>
                  <Link
                    href={docId ? `/documents/${docId}/summary` : "#"}
                    className="px-3 py-1.5 rounded-md border bg-muted/40 hover:bg-muted text-sm border-border"
                    prefetch={false}
                  >
                    요약 보기
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">지난 퀴즈 기록</h2>
          <div className="text-xs text-muted-foreground">최대 50개 표시</div>
        </div>
        <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-4/5" />
              </div>
            ) : attempts && attempts.length > 0 ? (
              attempts.map((a) => (
                <div key={a.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {a.quiz_sets?.title || "퀴즈 세트"}
                      </span>
                      {a.quiz_sets?.type ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 border-border text-muted-foreground">
                          {a.quiz_sets.type}
                        </span>
                      ) : null}
                      {a.quiz_sets?.difficulty ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/40 border-border text-muted-foreground">
                          {a.quiz_sets.difficulty}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      시작: {formatDateTime(a.started_at)} {a.completed_at ? `· 완료: ${formatDateTime(a.completed_at)}` : "· 진행 중"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:ml-auto">
                    <div className="text-sm font-semibold tabular-nums">
                      {a.score != null ? `${Number(a.score).toFixed(0)}점` : "-"}
                    </div>
                    <Link
                      href={`/quizzes/results/${a.id}`}
                      className="px-3 py-1.5 rounded-md text-sm border bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary"
                      prefetch={false}
                    >
                      결과 보기
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-muted-foreground">아직 퀴즈 기록이 없어요. 설정 후 퀴즈를 시작해 보세요!</div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function formatDateTime(value: string | number | Date) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return "-"
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`
}
