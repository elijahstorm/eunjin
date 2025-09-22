"use client";

/**
 * CODE INSIGHT
 * This code's use case is to run an adaptive quiz session that pulls questions across the user's quiz sets.
 * It creates a new quiz_set and quiz_attempt for this session, presents questions adaptively by difficulty,
 * records each question_attempt to the database, and on completion updates the attempt summary and provides
 * links to results and other quiz pages. It is a protected page and will redirect to login if unauthenticated.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Minimal type definitions aligned with DB columns used
type UUID = string;

type QuizSet = {
  id: UUID;
  user_id: UUID;
  title: string;
  document_id: UUID | null;
};

type QuizQuestion = {
  id: UUID;
  quiz_set_id: UUID;
  question_type: string; // question_type_enum
  prompt: string;
  options: any | null; // jsonb (array or structured)
  correct_answer: any | null; // jsonb
  explanation: string | null;
  difficulty: string | null; // difficulty_enum
  chunk_id: UUID | null;
};

function useAuthUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const supabase = supabaseBrowser;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return { userId, loading };
}

function normalizeDifficulty(d: string | null | undefined): "easy" | "medium" | "hard" | "unknown" {
  if (!d) return "unknown";
  const v = String(d).toLowerCase();
  if (v.includes("easy") || v === "e") return "easy";
  if (v.includes("medium") || v.includes("normal") || v === "m") return "medium";
  if (v.includes("hard") || v.includes("difficult") || v === "h") return "hard";
  return "unknown";
}

function toLabel(val: any): string {
  if (val == null) return "";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if ("label" in val && typeof (val as any).label === "string") return (val as any).label as string;
    if ("text" in val && typeof (val as any).text === "string") return (val as any).text as string;
  }
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function sanitizeOptions(options: any): { label: string; value: any }[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt, idx) => ({ label: toLabel(opt), value: opt ?? idx }));
}

function normalizeText(t: any): string {
  return String(t ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function evaluateCorrect(
  question: Pick<QuizQuestion, "question_type" | "options" | "correct_answer">,
  userAnswer: any
): boolean | null {
  const type = (question.question_type || "").toLowerCase();
  const opts = sanitizeOptions(question.options);
  const ca = question.correct_answer;

  // For multiple choice: we compare selected index or value
  if (type.includes("choice") || (opts.length > 0 && !type.includes("short"))) {
    const userIndex = typeof userAnswer?.selectedOptionIndex === "number" ? userAnswer.selectedOptionIndex : null;
    if (userIndex == null) return false;

    // candidate matches: index, value or label match
    if (typeof ca === "number") {
      return userIndex === ca;
    }
    if (typeof ca === "string" || typeof ca === "boolean" || typeof ca === "number") {
      const userVal = opts[userIndex]?.value;
      const userLabel = opts[userIndex]?.label;
      const caLabel = toLabel(ca);
      // direct value equality or label match (case-insensitive)
      if (userVal === ca) return true;
      return normalizeText(userLabel) === normalizeText(caLabel);
    }
    if (ca && typeof ca === "object") {
      if (typeof (ca as any).index === "number") return userIndex === (ca as any).index;
      if ("value" in (ca as any)) {
        const userVal = opts[userIndex]?.value;
        return userVal === (ca as any).value;
      }
      if ("label" in (ca as any)) {
        const userLabel = opts[userIndex]?.label;
        return normalizeText(userLabel) === normalizeText((ca as any).label);
      }
    }
    return null; // unknown format
  }

  // True/False style with no real options
  if (type.includes("true") || type.includes("boolean")) {
    const ua = userAnswer?.value;
    if (typeof ca === "boolean" && typeof ua === "boolean") return ua === ca;
    if (typeof ca === "string") return normalizeText(ua) === normalizeText(ca);
    return null;
  }

  // Short answer / text
  const uaText = normalizeText(userAnswer?.text ?? "");
  if (typeof ca === "string") {
    return uaText !== "" && uaText === normalizeText(ca);
  }
  if (typeof ca === "number" || typeof ca === "boolean") {
    return uaText !== "" && uaText === normalizeText(String(ca));
  }
  if (ca && typeof ca === "object") {
    // consider a simple case where {text: "..."}
    if (typeof (ca as any).text === "string") return uaText !== "" && uaText === normalizeText((ca as any).text);
  }
  return null;
}

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AdaptiveQuizTakePage() {
  const { userId, loading: authLoading } = useAuthUserId();
  const router = useRouter();
  const supabase = supabaseBrowser;

  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [pool, setPool] = useState<QuizQuestion[]>([]);
  const [sessionSetId, setSessionSetId] = useState<UUID | null>(null);
  const [attemptId, setAttemptId] = useState<UUID | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [askedIds, setAskedIds] = useState<Set<UUID>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<"easy" | "medium" | "hard" | "unknown">("medium");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  const [totalQuestions, setTotalQuestions] = useState<number>(8);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);

  const timerIntervalRef = useRef<any>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    timerIntervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - (startedAt ?? Date.now()));
    }, 1000);
    return () => clearInterval(timerIntervalRef.current);
  }, [startedAt, finishedAt]);

  const resetLocalState = useCallback(() => {
    setCurrentIndex(0);
    setAskedIds(new Set());
    setCurrentQuestion(null);
    setCurrentDifficulty("medium");
    setSelectedOptionIndex(null);
    setTextAnswer("");
    setSubmitted(false);
    setWasCorrect(null);
    setCorrectCount(0);
    setStartedAt(null);
    setFinishedAt(null);
    setElapsedMs(0);
  }, []);

  const loadQuestionPool = useCallback(async (uid: string) => {
    // Fetch all quiz sets for this user
    const { data: sets, error: setsErr } = await supabase
      .from("quiz_sets")
      .select("id, user_id, title, document_id")
      .eq("user_id", uid);
    if (setsErr) throw setsErr;

    const setIds = (sets as QuizSet[] | null)?.map((s) => s.id) ?? [];

    if (setIds.length === 0) return [] as QuizQuestion[];

    // Fetch all questions across these sets
    const { data: questions, error: qErr } = await supabase
      .from("quiz_questions")
      .select(
        "id, quiz_set_id, question_type, prompt, options, correct_answer, explanation, difficulty, chunk_id"
      )
      .in("quiz_set_id", setIds)
      .order("created_at", { ascending: false });

    if (qErr) throw qErr;
    const filtered = (questions as QuizQuestion[] | null)?.filter((q) => q && q.prompt) ?? [];
    return filtered;
  }, [supabase]);

  const startNewSession = useCallback(async () => {
    if (!userId) return;
    setIsInitializing(true);
    setInitError(null);
    try {
      resetLocalState();
      const questions = await loadQuestionPool(userId);
      setPool(questions);

      if (questions.length === 0) {
        setIsInitializing(false);
        return; // empty state handled by UI
      }

      // Create a new quiz_set for this adaptive session
      const title = `Adaptive Session — ${new Date().toLocaleString()}`;
      const { data: newSet, error: setErr } = await supabase
        .from("quiz_sets")
        .insert([{ user_id: userId, title }])
        .select("id")
        .single();
      if (setErr) throw setErr;
      const newSetId = newSet?.id as UUID;
      setSessionSetId(newSetId);

      // Create a new quiz_attempt row
      const { data: attempt, error: attErr } = await supabase
        .from("quiz_attempts")
        .insert([{ quiz_set_id: newSetId, user_id: userId }])
        .select("id, started_at")
        .single();
      if (attErr) throw attErr;
      setAttemptId(attempt.id as UUID);

      // Select first question: prefer medium difficulty, else any
      const first = pickNextQuestion(questions, new Set(), "medium");
      setCurrentQuestion(first);
      setAskedIds(new Set(first ? [first.id] : []));
      setCurrentDifficulty(normalizeDifficulty(first?.difficulty ?? "medium"));
      setStartedAt(Date.now());
      setIsInitializing(false);
    } catch (e: any) {
      setInitError(e?.message || "세션을 시작할 수 없습니다.");
      setIsInitializing(false);
    }
  }, [userId, loadQuestionPool, resetLocalState, supabase]);

  const pickNextQuestion = useCallback(
    (questions: QuizQuestion[], asked: Set<UUID>, targetDifficulty: "easy" | "medium" | "hard" | "unknown") => {
      const remaining = questions.filter((q) => !asked.has(q.id));
      if (remaining.length === 0) return null;
      const buckets: Record<string, QuizQuestion[]> = { easy: [], medium: [], hard: [], unknown: [] };
      for (const q of remaining) {
        const d = normalizeDifficulty(q.difficulty);
        buckets[d].push(q);
      }
      const order = [targetDifficulty, "medium", "easy", "hard", "unknown"];
      for (const key of order) {
        const arr = buckets[key] ?? [];
        if (arr.length > 0) {
          // random pick for variety
          return arr[Math.floor(Math.random() * arr.length)]!;
        }
      }
      return remaining[0] ?? null;
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || !attemptId) return;
    const type = (currentQuestion.question_type || "").toLowerCase();

    const userAnswer = (() => {
      if (currentQuestion.options && Array.isArray(currentQuestion.options)) {
        return { selectedOptionIndex, value: selectedOptionIndex != null ? sanitizeOptions(currentQuestion.options)[selectedOptionIndex]?.value : null };
      }
      if (type.includes("true") || type.includes("boolean")) {
        // map text answer to boolean if possible
        const t = normalizeText(textAnswer);
        const val = t === "true" || t === "t" || t === "1" || t === "yes" || t === "y";
        return { value: val, raw: textAnswer };
      }
      return { text: textAnswer };
    })();

    const correct = evaluateCorrect(currentQuestion, userAnswer);
    const score = correct ? 1 : 0;

    setSaving(true);
    try {
      const payload = {
        quiz_attempt_id: attemptId,
        question_id: currentQuestion.id,
        user_answer: userAnswer,
        is_correct: correct,
        score,
      } as any;

      const { error: qaErr } = await supabase.from("question_attempts").insert([payload]);
      if (qaErr) throw qaErr;

      setWasCorrect(correct);
      setSubmitted(true);
      if (correct) setCorrectCount((c) => c + 1);

      // adjust difficulty for next question
      setCurrentDifficulty((prev) => {
        if (correct === null) return prev;
        const order: ("easy" | "medium" | "hard" | "unknown")[] = ["easy", "medium", "hard"];
        const idx = Math.max(0, order.indexOf(prev));
        if (correct === true && idx < order.length - 1) return order[idx + 1];
        if (correct === false && idx > 0) return order[idx - 1];
        return prev;
      });
    } catch (e: any) {
      setInitError(e?.message || "답안을 저장하는 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [attemptId, currentQuestion, selectedOptionIndex, textAnswer, supabase]);

  const goNext = useCallback(() => {
    if (!currentQuestion) return;
    const newAsked = new Set(askedIds);
    newAsked.add(currentQuestion.id);
    setAskedIds(newAsked);

    // If completed
    if (newAsked.size >= totalQuestions) {
      setFinishedAt(Date.now());
      return;
    }

    const next = pickNextQuestion(pool, newAsked, currentDifficulty);
    setCurrentQuestion(next);
    setCurrentIndex((i) => i + 1);
    setSelectedOptionIndex(null);
    setTextAnswer("");
    setSubmitted(false);
    setWasCorrect(null);
  }, [askedIds, currentQuestion, currentDifficulty, pickNextQuestion, pool, totalQuestions]);

  const finalizeSession = useCallback(async () => {
    if (!attemptId) return;
    try {
      const scorePct = (correctCount / totalQuestions) * 100;
      const { error } = await supabase
        .from("quiz_attempts")
        .update({ completed_at: new Date().toISOString(), score: scorePct })
        .eq("id", attemptId);
      if (error) throw error;
    } catch (e: any) {
      setInitError(e?.message || "세션 완료 처리 중 오류가 발생했습니다.");
    }
  }, [attemptId, correctCount, totalQuestions, supabase]);

  useEffect(() => {
    if (finishedAt && attemptId) {
      finalizeSession();
    }
  }, [finishedAt, attemptId, finalizeSession]);

  useEffect(() => {
    if (!authLoading && userId) {
      startNewSession();
    }
  }, [authLoading, userId, startNewSession]);

  const percentProgress = useMemo(() => {
    const current = Math.min(askedIds.size + (currentQuestion ? 0 : 0), totalQuestions);
    return Math.round((current / totalQuestions) * 100);
  }, [askedIds.size, currentQuestion, totalQuestions]);

  const showCompletion = finishedAt != null;

  const canSubmit = useMemo(() => {
    if (!currentQuestion) return false;
    const hasOptions = Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0;
    if (hasOptions) return selectedOptionIndex !== null;
    // text
    return textAnswer.trim().length > 0;
  }, [currentQuestion, selectedOptionIndex, textAnswer]);

  const handleSkip = useCallback(async () => {
    if (!currentQuestion || !attemptId) return;
    setSaving(true);
    try {
      const payload = {
        quiz_attempt_id: attemptId,
        question_id: currentQuestion.id,
        user_answer: null,
        is_correct: false,
        score: 0,
      } as any;
      const { error } = await supabase.from("question_attempts").insert([payload]);
      if (error) throw error;
      setSubmitted(true);
      setWasCorrect(false);
    } catch (e: any) {
      setInitError(e?.message || "문제를 건너뛰는 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [attemptId, currentQuestion, supabase]);

  const handleCancel = useCallback(async () => {
    const ok = window.confirm("세션을 종료하시겠어요? 진행 내용은 저장됩니다.");
    if (!ok) return;
    if (attemptId) {
      try {
        const scorePct = (correctCount / Math.max(1, askedIds.size)) * 100;
        await supabase.from("quiz_attempts").update({ completed_at: new Date().toISOString(), score: scorePct }).eq("id", attemptId);
      } catch {
        // ignore
      }
      router.replace(`/quizzes/results/${attemptId}`);
    } else {
      router.replace("/quizzes");
    }
  }, [attemptId, askedIds.size, correctCount, router, supabase]);

  const handleRetry = useCallback(() => {
    startNewSession();
  }, [startNewSession]);

  // UI components
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">맞춤 적응형 퀴즈</h1>
          <p className="text-sm text-muted-foreground">당신의 약점을 빠르게 파악해 더 똑똑하게 학습해요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/quizzes"
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            퀴즈 목록
          </Link>
          <button
            onClick={handleCancel}
            className="inline-flex items-center rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition"
          >
            종료
          </button>
        </div>
      </div>

      <div className="mt-4">
        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${showCompletion ? 100 : percentProgress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            진행 {Math.min(askedIds.size + (currentQuestion ? 1 : 0), totalQuestions)} / {totalQuestions}
          </span>
          <span>경과 {formatDuration(elapsedMs)}</span>
        </div>
      </div>

      {initError && (
        <div className="mt-4">
          <Alert variant="destructive" className="border border-destructive/50">
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{initError}</AlertDescription>
          </Alert>
        </div>
      )}

      {authLoading || isInitializing ? (
        <div className="mt-8 space-y-4">
          <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-1/2 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-1/3 animate-pulse rounded-md bg-muted" />
        </div>
      ) : null}

      {!isInitializing && pool.length === 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-medium">사용 가능한 문제가 없습니다</h2>
          <p className="mt-1 text-sm text-muted-foreground">문서에서 퀴즈를 먼저 생성해 주세요.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/documents"
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              문서로 이동
            </Link>
            <Link
              href="/quizzes"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              퀴즈 관리
            </Link>
          </div>
        </div>
      )}

      {!isInitializing && !showCompletion && currentQuestion && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground">
                난이도: {currentDifficulty === "unknown" ? "-" : currentDifficulty}
              </span>
              <span className="hidden sm:inline-flex h-7 items-center rounded-full bg-muted px-3 text-xs text-muted-foreground">
                질문 {Math.min(askedIds.size + 1, totalQuestions)} / {totalQuestions}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">세션 ID: {attemptId?.slice(0, 8)}</div>
          </div>

          <Separator className="my-4" />

          <div>
            <h2 className="text-base sm:text-lg font-medium leading-relaxed text-foreground">{currentQuestion.prompt}</h2>
          </div>

          {/* Answer Area */}
          <div className="mt-5">
            {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
              <div className="grid gap-3">
                {sanitizeOptions(currentQuestion.options).map((opt, idx) => (
                  <label
                    key={idx}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-4 text-sm transition",
                      selectedOptionIndex === idx
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="answer"
                        className="h-4 w-4 accent-primary"
                        checked={selectedOptionIndex === idx}
                        onChange={() => setSelectedOptionIndex(idx)}
                        disabled={submitted}
                      />
                      <span>{opt.label}</span>
                    </div>
                    {submitted && selectedOptionIndex === idx ? (
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                          wasCorrect === true
                            ? "bg-green-600/10 text-green-600"
                            : wasCorrect === false
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {wasCorrect === true ? "정답" : wasCorrect === false ? "오답" : "채점 없음"}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                <label htmlFor="text-answer" className="text-xs text-muted-foreground">
                  답안을 입력하세요
                </label>
                <textarea
                  id="text-answer"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={submitted}
                  placeholder="간단히 입력해 보세요"
                  className="min-h-[96px] w-full rounded-md border border-input bg-background p-3 text-sm outline-none ring-0 focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={handleSkip}
                disabled={submitted || saving}
                className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                건너뛰기
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "제출"}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  다음
                </button>
              )}
            </div>
          </div>

          {/* Feedback */}
          {submitted && (
            <div className="mt-5 rounded-lg border border-input bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {wasCorrect === true ? (
                    <span className="text-green-600">정답입니다!</span>
                  ) : wasCorrect === false ? (
                    <span className="text-destructive">아쉬워요. 다시 한 번 살펴볼까요?</span>
                  ) : (
                    <span className="text-foreground">채점 기준을 확인할 수 없어요.</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">누적 정답 {correctCount} / {Math.max(1, askedIds.size)}</div>
              </div>
              {currentQuestion.explanation ? (
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  해설: {currentQuestion.explanation}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Completion */}
      {showCompletion && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">세션 완료!</h2>
          <p className="mt-1 text-sm text-muted-foreground">수고하셨어요. 결과를 확인하고 약점을 보완해 보세요.</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-input bg-background p-4">
              <div className="text-xs text-muted-foreground">정답</div>
              <div className="text-lg font-semibold">{correctCount} / {totalQuestions}</div>
            </div>
            <div className="rounded-lg border border-input bg-background p-4">
              <div className="text-xs text-muted-foreground">점수</div>
              <div className="text-lg font-semibold">{Math.round((correctCount / totalQuestions) * 100)}%</div>
            </div>
            <div className="rounded-lg border border-input bg-background p-4">
              <div className="text-xs text-muted-foreground">소요시간</div>
              <div className="text-lg font-semibold">{formatDuration((finishedAt ?? Date.now()) - (startedAt ?? Date.now()))}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {attemptId ? (
              <Link
                href={`/quizzes/results/${attemptId}`}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                결과 보기
              </Link>
            ) : null}
            <button
              onClick={handleRetry}
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              다시 풀기
            </button>
            <Link
              href="/quizzes"
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              퀴즈로 돌아가기
            </Link>
          </div>
        </div>
      )}

      {/* Session length control (before starting new session) */}
      {!isInitializing && !currentQuestion && pool.length > 0 && !showCompletion && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">세션 길이 선택</h2>
          <p className="mt-1 text-sm text-muted-foreground">한 번에 풀 문제 수를 선택해요.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[5, 8, 12].map((n) => (
              <button
                key={n}
                onClick={() => setTotalQuestions(n)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm",
                  totalQuestions === n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {n}문항
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={startNewSession}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              시작하기
            </button>
            <Link
              href="/quizzes"
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              취소
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
