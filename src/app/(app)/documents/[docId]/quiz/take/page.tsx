"use client";

/**
 * CODE INSIGHT
 * This code's use case is the in-session quiz taking UI for a specific document.
 * It fetches the latest quiz set for the document and current user, creates a quiz attempt,
 * renders questions sequentially with grading and feedback, persists each question attempt,
 * and on completion updates the attempt score and offers navigation to the results page,
 * back to the document quiz overview, and to reviews if there are scheduled SRS items.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type UUID = string;

type QuestionType =
  | "multiple_choice"
  | "single_choice"
  | "true_false"
  | "short_answer"
  | string; // fallbacks for any custom types

type Difficulty = "easy" | "medium" | "hard" | string | null;

interface QuizSetRow {
  id: UUID;
  title: string;
  document_id: UUID | null;
  difficulty: Difficulty;
  created_at: string;
}

interface QuizQuestionRow {
  id: UUID;
  quiz_set_id?: UUID;
  question_type: QuestionType;
  prompt: string;
  options: any | null; // jsonb
  correct_answer: any | null; // jsonb
  explanation: string | null;
  difficulty: Difficulty;
  chunk_id: UUID | null;
  created_at?: string;
}

interface UserShape {
  id: UUID;
  email?: string | null;
}

interface AnswerRecord {
  questionId: UUID;
  value: string | string[] | boolean | null;
}

interface GradedRecord {
  questionId: UUID;
  isCorrect: boolean;
  score: number; // 1 or 0
}

function useAuthUser() {
  const [user, setUser] = useState<UserShape | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = supabaseBrowser;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!active) return;
        setUser(data.user ? { id: data.user.id as UUID, email: data.user.email } : null);
      } catch (_e) {
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}

function normalizeValue(v: any): string {
  if (typeof v === "string") return v.trim().toLowerCase();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.map((x) => normalizeValue(x)).sort().join("|");
  if (v && typeof v === "object") {
    // common patterns: { value: "..." } or { values: [ ... ] }
    if ("value" in v) return normalizeValue((v as any).value);
    if ("values" in v && Array.isArray((v as any).values)) return normalizeValue((v as any).values);
    try {
      return normalizeValue(Object.values(v));
    } catch {
      return JSON.stringify(v);
    }
  }
  return String(v ?? "");
}

function isAnswerCorrect(question: QuizQuestionRow, answer: string | string[] | boolean | null): boolean {
  const qType = question.question_type;
  const ca = question.correct_answer;

  if (answer === null || typeof answer === "undefined") return false;

  // true_false and single_choice treated as single value
  if (qType === "true_false") {
    const normalizedUser = normalizeValue(answer);
    const normalizedCorrect = normalizeValue(ca);
    return normalizedUser === normalizedCorrect;
  }

  if (qType === "single_choice") {
    const normalizedUser = normalizeValue(answer);
    const normalizedCorrect = normalizeValue(ca);
    return normalizedUser === normalizedCorrect;
  }

  if (qType === "multiple_choice") {
    // both sides as set strings
    const normalizedUser = normalizeValue(Array.isArray(answer) ? answer : [answer]);
    const normalizedCorrect = normalizeValue(
      Array.isArray(ca)
        ? ca
        : ca && typeof ca === "object" && "values" in ca
        ? (ca as any).values
        : [ca]
    );
    return normalizedUser === normalizedCorrect;
  }

  if (qType === "short_answer") {
    // accept substring/loose match if correct_answer is array of acceptable answers
    const normalizedUser = normalizeValue(answer);
    if (Array.isArray(ca)) {
      return ca.map((x) => normalizeValue(x)).some((c) => c === normalizedUser);
    }
    return normalizedUser === normalizeValue(ca);
  }

  // default strict compare
  return normalizeValue(answer) === normalizeValue(ca);
}

function extractOptions(options: any): { value: string; label: string }[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((o, idx) => {
      if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") {
        const val = String(o);
        return { value: val, label: val };
        }
      if (o && typeof o === "object") {
        const val = (o as any).value ?? (o as any).id ?? (o as any).text ?? JSON.stringify(o);
        const label = (o as any).label ?? (o as any).text ?? String(val);
        return { value: String(val), label: String(label) };
      }
      return { value: String(idx), label: String(o) };
    });
  }
  // if object with key->label
  if (typeof options === "object") {
    return Object.entries(options).map(([key, val]) => ({ value: key, label: String(val) }));
  }
  return [];
}

export default function TakeQuizPage() {
  const { docId } = useParams<{ docId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const supabase = supabaseBrowser;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizSet, setQuizSet] = useState<QuizSetRow | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [attemptId, setAttemptId] = useState<UUID | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<UUID, AnswerRecord>>({});
  const [graded, setGraded] = useState<Record<UUID, GradedRecord>>({});
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [srsDueCount, setSrsDueCount] = useState<number>(0);

  const currentQuestion = questions[currentIdx];

  const total = questions.length;
  const answeredCount = useMemo(() => Object.keys(graded).length, [graded]);
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Load latest quiz set for this doc and user
      const { data: qs, error: qsErr } = await supabase
        .from("quiz_sets")
        .select("id,title,document_id,difficulty,created_at")
        .eq("document_id", docId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (qsErr) throw qsErr;
      if (!qs) {
        setQuizSet(null);
        setQuestions([]);
        setError("해당 문서에 대한 퀴즈 세트를 찾을 수 없습니다. 문서의 퀴즈 탭에서 세트를 생성해 주세요.");
        return;
      }
      setQuizSet(qs as QuizSetRow);

      // Create attempt
      const { data: attemptIns, error: attemptErr } = await supabase
        .from("quiz_attempts")
        .insert({ quiz_set_id: qs.id, user_id: user.id })
        .select("id")
        .single();
      if (attemptErr) throw attemptErr;
      setAttemptId(attemptIns.id as UUID);

      // Load questions
      const { data: qq, error: qqErr } = await supabase
        .from("quiz_questions")
        .select("id,question_type,prompt,options,correct_answer,explanation,difficulty,chunk_id,created_at")
        .eq("quiz_set_id", qs.id)
        .order("created_at", { ascending: true });
      if (qqErr) throw qqErr;
      setQuestions(qq as QuizQuestionRow[]);

      // Load SRS due count (due now or earlier)
      const nowIso = new Date().toISOString();
      const { count } = await supabase
        .from("srs_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("document_id", docId)
        .lte("due_at", nowIso);
      setSrsDueCount(typeof count === "number" ? count : 0);
    } catch (e: any) {
      setError(e?.message ?? "퀴즈를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [docId, supabase, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // handled below with auth guard
    loadData();
  }, [authLoading, user, loadData]);

  const setAnswerForCurrent = (value: string | string[] | boolean | null) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { questionId: currentQuestion.id, value } }));
  };

  const onToggleMulti = (val: string) => {
    const curr = answers[currentQuestion.id]?.value;
    const arr = Array.isArray(curr) ? [...curr] : [];
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(val);
    setAnswerForCurrent(arr);
  };

  const currentAnswer = answers[currentQuestion?.id ?? ""]?.value ?? null;
  const isCurrentGraded = !!graded[currentQuestion?.id ?? ""];

  const canGrade = useMemo(() => {
    if (!currentQuestion) return false;
    if (isCurrentGraded) return false;
    if (currentQuestion.question_type === "multiple_choice") {
      return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    }
    if (currentQuestion.question_type === "single_choice" || currentQuestion.question_type === "true_false") {
      return typeof currentAnswer === "string" || typeof currentAnswer === "boolean";
    }
    if (currentQuestion.question_type === "short_answer") {
      return typeof currentAnswer === "string" && currentAnswer.trim().length > 0;
    }
    return currentAnswer !== null;
  }, [currentAnswer, currentQuestion, isCurrentGraded]);

  const gradeCurrent = async () => {
    if (!currentQuestion || !attemptId || !user) return;
    if (isCurrentGraded) return;
    setSubmitting(true);
    try {
      const correct = isAnswerCorrect(currentQuestion, currentAnswer);
      const score = correct ? 1 : 0;

      // Persist attempt
      await supabase.from("question_attempts").insert({
        quiz_attempt_id: attemptId,
        question_id: currentQuestion.id,
        user_answer: currentAnswer as any,
        is_correct: correct,
        score,
      });

      setGraded((prev) => ({ ...prev, [currentQuestion.id]: { questionId: currentQuestion.id, isCorrect: correct, score } }));
    } catch (e) {
      // surface minimal error
      setError("답안을 저장하는 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const goPrev = () => {
    setCurrentIdx((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    setCurrentIdx((i) => Math.min(total - 1, i + 1));
  };

  const finalizeAttempt = async () => {
    if (!attemptId || !user) return;
    setFinishing(true);
    try {
      const totalScore = Object.values(graded).reduce((acc, g) => acc + (g.score || 0), 0);
      const percent = total > 0 ? Math.round((totalScore / total) * 100) : 0;
      await supabase
        .from("quiz_attempts")
        .update({ completed_at: new Date().toISOString(), score: percent })
        .eq("id", attemptId);
      setFinished(true);
    } catch (e) {
      setError("퀴즈 완료 처리 중 오류가 발생했습니다.");
    } finally {
      setFinishing(false);
    }
  };

  const resetError = () => setError(null);

  // UI helpers
  const DifficultyBadge: React.FC<{ value: Difficulty }> = ({ value }) => {
    if (!value) return null;
    const color = value === "easy" ? "bg-green-100 text-green-700" : value === "hard" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
    return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", color)}>{value}</span>;
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Alert className="bg-card border">
          <AlertTitle className="text-base font-semibold">로그인이 필요합니다</AlertTitle>
          <AlertDescription className="mt-2 text-sm text-muted-foreground">
            이 페이지를 이용하려면 로그인해 주세요.
          </AlertDescription>
          <div className="mt-4 flex gap-2">
            <a href="/login" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">로그인하기</a>
            <a href="/dashboard" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">대시보드로 이동</a>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-card border rounded-xl shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">퀴즈 풀이</h1>
              <p className="text-sm text-muted-foreground mt-1">문서 기반 문제를 풀고 즉시 피드백을 받아보세요.</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/documents/${docId}/quiz`} className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent">문서 퀴즈 홈</a>
            </div>
          </div>

          <Separator className="my-5" />

          {error && (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10">
              <AlertTitle className="font-semibold">문제가 발생했습니다</AlertTitle>
              <AlertDescription className="mt-1 text-sm">{error}</AlertDescription>
              <div className="mt-3">
                <button onClick={resetError} className="text-sm underline">닫기</button>
              </div>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-5">
              <Skeleton className="h-5 w-36" />
              <div>
                <div className="h-2 w-full bg-muted rounded" />
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          ) : !quizSet ? (
            <div className="">
              <Alert className="bg-muted/30 border">
                <AlertTitle className="font-semibold">퀴즈 세트가 없습니다</AlertTitle>
                <AlertDescription className="mt-1 text-sm">
                  이 문서에 대한 퀴즈 세트를 먼저 생성해 주세요.
                </AlertDescription>
                <div className="mt-4">
                  <a href={`/documents/${docId}/quiz`} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">퀴즈 탭으로 이동</a>
                </div>
              </Alert>
            </div>
          ) : finished ? (
            <FinishSummary
              attemptId={attemptId!}
              total={total}
              graded={graded}
              srsDueCount={srsDueCount}
              docId={docId}
            />
          ) : total === 0 ? (
            <div className="">
              <Alert className="bg-muted/30 border">
                <AlertTitle className="font-semibold">문제가 없습니다</AlertTitle>
                <AlertDescription className="mt-1 text-sm">생성된 문제가 없어 퀴즈를 진행할 수 없습니다.</AlertDescription>
                <div className="mt-4">
                  <a href={`/documents/${docId}/quiz`} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">퀴즈 탭으로 이동</a>
                </div>
              </Alert>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{currentIdx + 1} / {total}</span>
                  {quizSet?.difficulty ? <DifficultyBadge value={quizSet.difficulty} /> : null}
                </div>
                <div className="text-sm text-muted-foreground">진행률 {progressPct}%</div>
              </div>
              <div className="mt-2 h-2 w-full rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="mt-6 bg-accent/30 border rounded-lg p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">문제</div>
                    <h2 className="text-base sm:text-lg font-medium leading-relaxed whitespace-pre-wrap">{currentQuestion.prompt}</h2>
                  </div>
                  <div className="shrink-0">
                    {currentQuestion.difficulty ? <DifficultyBadge value={currentQuestion.difficulty} /> : null}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <QuestionInput
                    question={currentQuestion}
                    answer={currentAnswer}
                    setAnswer={setAnswerForCurrent}
                    onToggleMulti={onToggleMulti}
                  />

                  {isCurrentGraded ? (
                    <FeedbackBlock
                      correct={graded[currentQuestion.id].isCorrect}
                      explanation={currentQuestion.explanation}
                    />
                  ) : null}
                </div>

                <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
                  <div className="flex gap-2 order-2 sm:order-1">
                    <button
                      onClick={goPrev}
                      disabled={currentIdx === 0}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium",
                        currentIdx === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                      )}
                    >
                      이전
                    </button>
                    {currentIdx < total - 1 ? (
                      <button
                        onClick={goNext}
                        disabled={!isCurrentGraded}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium",
                          !isCurrentGraded ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                        )}
                      >
                        다음
                      </button>
                    ) : (
                      <button
                        onClick={finalizeAttempt}
                        disabled={finishing || answeredCount < total}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                          finishing || answeredCount < total ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                        )}
                      >
                        {finishing ? "완료 처리 중..." : "퀴즈 완료하기"}
                      </button>
                    )}
                  </div>

                  <div className="order-1 sm:order-2">
                    {!isCurrentGraded ? (
                      <button
                        onClick={gradeCurrent}
                        disabled={!canGrade || submitting}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                          !canGrade || submitting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                        )}
                      >
                        {submitting ? "채점 중..." : "채점하기"}
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">채점 완료</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  answer,
  setAnswer,
  onToggleMulti,
}: {
  question: QuizQuestionRow;
  answer: string | string[] | boolean | null;
  setAnswer: (value: string | string[] | boolean | null) => void;
  onToggleMulti: (val: string) => void;
}) {
  const options = useMemo(() => extractOptions(question.options), [question.options]);

  if (question.question_type === "multiple_choice") {
    return (
      <div className="grid gap-2">
        {options.length === 0 ? (
          <div className="text-sm text-muted-foreground">선택지가 없습니다.</div>
        ) : (
          options.map((opt) => {
            const checked = Array.isArray(answer) ? answer.includes(opt.value) : false;
            return (
              <label key={opt.value} className={cn("flex items-start gap-3 rounded-md border p-3 cursor-pointer", checked ? "bg-primary/5 border-primary/40" : "hover:bg-accent") }>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  checked={checked}
                  onChange={() => onToggleMulti(opt.value)}
                />
                <span className="text-sm leading-relaxed">{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
    );
  }

  if (question.question_type === "single_choice") {
    return (
      <div className="grid gap-2">
        {options.length === 0 ? (
          <div className="text-sm text-muted-foreground">선택지가 없습니다.</div>
        ) : (
          options.map((opt) => {
            const checked = typeof answer === "string" ? answer === opt.value : false;
            return (
              <label key={opt.value} className={cn("flex items-start gap-3 rounded-md border p-3 cursor-pointer", checked ? "bg-primary/5 border-primary/40" : "hover:bg-accent") }>
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="mt-1 h-4 w-4 border-input text-primary focus:ring-ring"
                  checked={checked}
                  onChange={() => setAnswer(opt.value)}
                />
                <span className="text-sm leading-relaxed">{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
    );
  }

  if (question.question_type === "true_false") {
    const tfOptions = options.length > 0 ? options : [
      { value: "true", label: "참" },
      { value: "false", label: "거짓" },
    ];
    return (
      <div className="grid gap-2">
        {tfOptions.map((opt) => {
          const checked = typeof answer === "string" ? answer === opt.value : typeof answer === "boolean" ? String(answer) === opt.value : false;
          return (
            <label key={opt.value} className={cn("flex items-start gap-3 rounded-md border p-3 cursor-pointer", checked ? "bg-primary/5 border-primary/40" : "hover:bg-accent") }>
              <input
                type="radio"
                name={`q-${question.id}-tf`}
                className="mt-1 h-4 w-4 border-input text-primary focus:ring-ring"
                checked={checked}
                onChange={() => {
                  if (opt.value === "true") setAnswer(true);
                  else if (opt.value === "false") setAnswer(false);
                  else setAnswer(opt.value);
                }}
              />
              <span className="text-sm leading-relaxed">{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  // short_answer default
  return (
    <div>
      <textarea
        className="w-full min-h-[96px] rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="답안을 입력하세요"
        value={typeof answer === "string" ? answer : ""}
        onChange={(e) => setAnswer(e.target.value)}
      />
    </div>
  );
}

function FeedbackBlock({ correct, explanation }: { correct: boolean; explanation: string | null }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        correct ? "border-green-200 bg-green-50" : "border-destructive/30 bg-destructive/10"
      )}
    >
      <div className={cn("font-medium", correct ? "text-green-700" : "text-destructive")}>{correct ? "정답입니다!" : "오답입니다."}</div>
      {explanation ? (
        <div className="mt-1.5 text-muted-foreground leading-relaxed">{explanation}</div>
      ) : null}
    </div>
  );
}

function FinishSummary({
  attemptId,
  total,
  graded,
  srsDueCount,
  docId,
}: {
  attemptId: UUID;
  total: number;
  graded: Record<UUID, GradedRecord>;
  srsDueCount: number;
  docId: string;
}) {
  const correct = Object.values(graded).filter((g) => g.isCorrect).length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">퀴즈 완료</h2>
          <p className="text-sm text-muted-foreground mt-1">수고하셨어요! 아래에서 결과를 확인하세요.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-accent/30 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">정답 수</div>
            <div className="text-2xl font-semibold mt-1">{correct} / {total}</div>
          </div>
          <div className="w-full sm:w-1/2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>정답률</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/quizzes/results/${attemptId}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          결과 상세 보기
        </a>
        <a
          href={`/documents/${docId}/quiz`}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          문서 퀴즈 홈으로
        </a>
        {srsDueCount > 0 ? (
          <a
            href="/reviews"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            복습하기 ({srsDueCount})
          </a>
        ) : null}
      </div>
    </div>
  );
}
