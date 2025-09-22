"use client"

/**
 * CODE INSIGHT
 * This page displays a quiz attempt's detailed results for a logged-in user: overall score, per-question correctness, explanations, and related follow-up actions.
 * It lets users add missed questions to their SRS deck and navigate to create a focused quiz set, reviews, quizzes list, and the related document when available.
 */

import React from "react"
import Link from "next/link"
import { supabaseBrowser } from "@/utils/supabase/client-browser"
import { cn } from "@/utils/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

type PageProps = { params: { resultId: string } }

type QuizAttempt = {
  id: string
  quiz_set_id: string
  user_id: string
  started_at: string
  completed_at: string | null
  score: number | null
}

type QuizSet = {
  id: string
  user_id: string
  document_id: string | null
  title: string
  type: string
}

type QuestionAttempt = {
  id: string
  quiz_attempt_id: string
  question_id: string
  user_answer: any
  is_correct: boolean | null
  score: number | null
  responded_at: string
}

type QuizQuestion = {
  id: string
  quiz_set_id: string
  question_type: string
  prompt: string
  options: any
  correct_answer: any
  explanation: string | null
  difficulty: string | null
  chunk_id: string | null
}

type DocumentLite = {
  id: string
  title: string
}

export default function QuizResultPage({ params }: PageProps) {
  const { resultId } = params
  const [loading, setLoading] = React.useState(true)
  const [authChecked, setAuthChecked] = React.useState(false)
  const [userId, setUserId] = React.useState<string | null>(null)

  const [attempt, setAttempt] = React.useState<QuizAttempt | null>(null)
  const [quizSet, setQuizSet] = React.useState<QuizSet | null>(null)
  const [documentInfo, setDocumentInfo] = React.useState<DocumentLite | null>(null)
  const [attempts, setAttempts] = React.useState<QuestionAttempt[]>([])
  const [questions, setQuestions] = React.useState<Record<string, QuizQuestion>>({})

  const [error, setError] = React.useState<string | null>(null)

  const [srsRunning, setSrsRunning] = React.useState(false)
  const [srsMessage, setSrsMessage] = React.useState<string | null>(null)
  const [srsError, setSrsError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    async function init() {
      try {
        const { data: auth } = await supabaseBrowser.auth.getUser()
        const uid = auth.user?.id ?? null
        if (!active) return
        setUserId(uid)
        setAuthChecked(true)
        if (!uid) {
          setLoading(false)
          return
        }

        // Load attempt
        const { data: attemptData, error: attemptErr } = await supabaseBrowser
          .from("quiz_attempts")
          .select("id, quiz_set_id, user_id, started_at, completed_at, score")
          .eq("id", resultId)
          .single()
        if (attemptErr) throw attemptErr
        if (!attemptData || attemptData.user_id !== uid) {
          setError("결과를 찾을 수 없거나 접근 권한이 없습니다.")
          setLoading(false)
          return
        }
        if (!active) return
        setAttempt(attemptData as QuizAttempt)

        // Load quiz set
        const { data: setData, error: setErr } = await supabaseBrowser
          .from("quiz_sets")
          .select("id, user_id, document_id, title, type")
          .eq("id", attemptData.quiz_set_id)
          .single()
        if (setErr) throw setErr
        if (!active) return
        setQuizSet(setData as QuizSet)

        // Load question attempts
        const { data: qaData, error: qaErr } = await supabaseBrowser
          .from("question_attempts")
          .select("id, quiz_attempt_id, question_id, user_answer, is_correct, score, responded_at")
          .eq("quiz_attempt_id", resultId)
          .order("responded_at", { ascending: true })
        if (qaErr) throw qaErr
        if (!active) return
        const atts = (qaData ?? []) as QuestionAttempt[]
        setAttempts(atts)

        const qids = Array.from(new Set(atts.map((a) => a.question_id).filter(Boolean)))
        if (qids.length > 0) {
          const { data: qData, error: qErr } = await supabaseBrowser
            .from("quiz_questions")
            .select("id, quiz_set_id, question_type, prompt, options, correct_answer, explanation, difficulty, chunk_id")
            .in("id", qids)
          if (qErr) throw qErr
          if (!active) return
          const dict: Record<string, QuizQuestion> = {}
          for (const q of (qData ?? []) as QuizQuestion[]) dict[q.id] = q
          setQuestions(dict)
        }

        // Load related document info if any
        if (setData?.document_id) {
          const { data: docData } = await supabaseBrowser
            .from("documents")
            .select("id, title")
            .eq("id", setData.document_id)
            .single()
          if (!active) return
          if (docData) setDocumentInfo(docData as DocumentLite)
        }
      } catch (e: any) {
        console.error(e)
        setError("결과를 불러오는 중 오류가 발생했습니다.")
      } finally {
        if (active) setLoading(false)
      }
    }
    init()
    return () => {
      active = false
    }
  }, [resultId])

  const combined = React.useMemo(() => {
    return attempts.map((a) => ({ attempt: a, question: questions[a.question_id] }))
  }, [attempts, questions])

  const stats = React.useMemo(() => {
    const total = attempts.length
    const correct = attempts.filter((a) => a.is_correct === true).length
    const computed = total > 0 ? Math.round((correct / total) * 100) : 0
    const score = attempt?.score ?? computed

    const start = attempt?.started_at ? new Date(attempt.started_at) : null
    const end = attempt?.completed_at ? new Date(attempt.completed_at) : null

    let durationMs: number | null = null
    if (start && (end || attempts.length > 0)) {
      const fallbackEnd = end ?? new Date(attempts[attempts.length - 1].responded_at)
      durationMs = Math.max(0, fallbackEnd.getTime() - start.getTime())
    }

    const durationText = (() => {
      if (!durationMs) return "-"
      const totalSec = Math.floor(durationMs / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      return m > 0 ? `${m}분 ${s}초` : `${s}초`
    })()

    return { total, correct, score, durationText }
  }, [attempt, attempts])

  function formatDateTime(iso?: string | null) {
    if (!iso) return "-"
    try {
      return new Date(iso).toLocaleString("ko-KR")
    } catch {
      return iso ?? "-"
    }
  }

  function renderAnswer(val: any) {
    if (val === null || typeof val === "undefined") return <span className="text-muted-foreground">미응답</span>
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      return <span>{String(val)}</span>
    }
    if (Array.isArray(val)) {
      // If array of primitives, render bullets
      const allPrim = val.every((v) => ["string", "number", "boolean"].includes(typeof v))
      if (allPrim) {
        return (
          <ul className="list-disc pl-5 space-y-1">
            {val.map((v, i) => (
              <li key={i}>{String(v)}</li>
            ))}
          </ul>
        )
      }
    }
    // Fallback: JSON block
    return (
      <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm text-muted-foreground border border-border">
        {JSON.stringify(val, null, 2)}
      </pre>
    )
  }

  async function addWrongToSRS() {
    setSrsError(null)
    setSrsMessage(null)
    setSrsRunning(true)
    try {
      if (!userId || !quizSet) throw new Error("로그인이 필요합니다.")
      const wrong = combined.filter((c) => c.attempt.is_correct !== true && c.question)
      if (wrong.length === 0) {
        setSrsMessage("추가할 오답이 없습니다.")
        return
      }
      const qids = wrong.map((w) => w.question!.id)

      // Check existing SRS cards to prevent duplicates
      const { data: existing, error: existErr } = await supabaseBrowser
        .from("srs_cards")
        .select("id, quiz_question_id")
        .eq("user_id", userId)
        .in("quiz_question_id", qids)
      if (existErr) throw existErr
      const existingSet = new Set((existing ?? []).map((e: any) => e.quiz_question_id as string))

      const toCreate = wrong
        .filter((w) => !existingSet.has(w.question!.id))
        .map((w) => ({
          user_id: userId,
          origin_type: "quiz_question",
          origin_id: w.question!.id,
          document_id: quizSet.document_id ?? null,
          quiz_question_id: w.question!.id,
          chunk_id: w.question!.chunk_id ?? null,
          due_at: new Date().toISOString(),
        }))

      if (toCreate.length === 0) {
        setSrsMessage("이미 모든 오답이 SRS에 추가되어 있습니다.")
        return
      }

      const { error: insertErr } = await supabaseBrowser.from("srs_cards").insert(toCreate)
      if (insertErr) throw insertErr

      setSrsMessage(`${toCreate.length}개 항목을 SRS에 추가했습니다.`)
    } catch (e: any) {
      console.error(e)
      setSrsError("SRS 추가 중 오류가 발생했습니다.")
    } finally {
      setSrsRunning(false)
    }
  }

  if (!authChecked || loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 w-full">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card text-card-foreground p-4">
              <Skeleton className="h-6 w-20 mb-3" />
              <Skeleton className="h-10 w-24" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card text-card-foreground p-4">
              <Skeleton className="h-6 w-32 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Alert className="border border-border">
          <AlertTitle>로그인이 필요합니다</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex items-center gap-3">
              <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50">
                로그인하기
              </Link>
              <Link href="/signup" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                회원가입
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Alert className="border border-border" variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>
            {error || "결과를 불러올 수 없습니다."}
            <div className="mt-3">
              <Link href="/quizzes" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                퀴즈 목록으로 돌아가기
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">퀴즈 결과</h1>
          <p className="text-sm text-muted-foreground">
            {quizSet?.title ? `세트: ${quizSet.title}` : "세부 정보를 확인하세요."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quizzes" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            퀴즈로 이동
          </Link>
          <Link href="/reviews" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            복습으로 이동
          </Link>
          {quizSet?.document_id && (
            <Link href={`/documents/${quizSet.document_id}`} className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              관련 문서 보기
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card text-card-foreground p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">총 점수</div>
              <div className="mt-1 text-4xl font-semibold">{stats.score}%</div>
            </div>
            <div className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
              {stats.correct}/{stats.total} 정답
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground">시작</div>
              <div className="font-medium">{formatDateTime(attempt.started_at)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">소요 시간</div>
              <div className="font-medium">{stats.durationText}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">완료</div>
              <div className="font-medium">{formatDateTime(attempt.completed_at)}</div>
            </div>
            {documentInfo && (
              <div className="space-y-1">
                <div className="text-muted-foreground">문서</div>
                <div className="font-medium truncate">{documentInfo.title}</div>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card text-card-foreground p-5">
          <div className="text-sm font-medium text-muted-foreground">다음 단계</div>
          <div className="mt-3 grid gap-2">
            <button
              onClick={addWrongToSRS}
              disabled={srsRunning}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground",
                "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              )}
            >
              {srsRunning ? "처리 중..." : "오답 SRS로 보내기"}
            </button>
            <Link
              href={`/quizzes/adaptive?source=attempt&attemptId=${attempt.id}`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-secondary/50"
            >
              오답 중심 퀴즈 만들기
            </Link>
            <Link
              href="/reviews/session"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              복습 세션 시작
            </Link>
          </div>
          {(srsMessage || srsError) && (
            <div className="mt-4">
              <Alert className={cn("border", srsError ? "border-destructive" : "border-border")}>
                <AlertTitle>{srsError ? "실패" : "완료"}</AlertTitle>
                <AlertDescription>{srsError ?? srsMessage}</AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">문항 해설</h2>
        <p className="mt-1 text-sm text-muted-foreground">각 문항의 정답 여부와 해설을 확인하세요.</p>
        <div className="mt-4 space-y-4">
          {combined.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">표시할 문항이 없습니다.</div>
          )}
          {combined.map(({ attempt: a, question: q }, idx) => (
            <div key={a.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="font-medium">
                  <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                  {q?.prompt ?? "문항 정보를 불러올 수 없습니다."}
                </div>
                <div className={cn(
                  "shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                  a.is_correct ? "bg-emerald-600/15 text-emerald-600" : "bg-rose-600/15 text-rose-600"
                )}>
                  {a.is_correct ? "정답" : "오답"}
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">내 답안</div>
                  <div className="text-sm">{renderAnswer(a.user_answer)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">정답</div>
                  <div className="text-sm">{renderAnswer(q?.correct_answer)}</div>
                </div>
              </div>

              <Collapsible defaultOpen className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">해설</div>
                  <CollapsibleTrigger className="text-xs text-muted-foreground underline underline-offset-4">
                    접기/펼치기
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                    {q?.explanation ? (
                      <p className="whitespace-pre-wrap">{q.explanation}</p>
                    ) : (
                      <span className="text-muted-foreground">해설이 없습니다.</span>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {quizSet?.document_id && (
                <div className="mt-4">
                  <Link
                    href={`/documents/${quizSet.document_id}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    관련 문서로 이동
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l3 3A1 1 0 0116 8h-3a1 1 0 110-2h.586L12 4.414 7.707 8.707a1 1 0 01-1.414-1.414l6-6z" clipRule="evenodd" />
                      <path d="M5 9a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2v-1a1 1 0 112 0v1a4 4 0 01-4 4H5a4 4 0 01-4-4v-4a4 4 0 014-4h1a1 1 0 110 2H5z" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
