"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Adaptive Quiz setup page for authenticated users.
 * It analyzes recent quiz performance from Supabase, highlights weaknesses, and lets users configure
 * an adaptive quiz session. It provides a start action to /quizzes/adaptive/take and a link back to /quizzes.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type QuizAttempt = {
  id: string;
  started_at: string;
  completed_at: string | null;
  score: string | number | null;
};

type QuestionAttempt = {
  id: string;
  quiz_attempt_id: string;
  question_id: string;
  is_correct: boolean | null;
  created_at: string;
  score: string | number | null;
};

type QuizQuestion = {
  id: string;
  difficulty: string | null;
  chunk_id: string | null;
  quiz_set_id: string;
};

type DocumentChunk = {
  id: string;
  document_id: string;
};

type DocumentRow = {
  id: string;
  title: string;
};

export default function AdaptiveQuizSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<QuestionAttempt[]>([]);
  const [questions, setQuestions] = useState<Record<string, QuizQuestion>>({});
  const [chunksById, setChunksById] = useState<Record<string, DocumentChunk>>({});
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  const [mode, setMode] = useState<"mistakes" | "weak_docs" | "all" | "custom">("mistakes");
  const [difficulty, setDifficulty] = useState<"mixed" | "easy" | "medium" | "hard">("mixed");
  const [types, setTypes] = useState<string[]>(["multiple_choice", "short_answer"]);
  const [count, setCount] = useState<number>(12);
  const [useSrs, setUseSrs] = useState<boolean>(true);
  const [explain, setExplain] = useState<boolean>(true);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();
        if (!user) {
          router.replace("/login?next=/quizzes/adaptive");
          return;
        }
        if (cancelled) return;
        setAuthChecking(false);

        setLoading(true);
        // Fetch user's documents for selection
        const { data: docsData, error: docsErr } = await supabaseBrowser
          .from("documents")
          .select("id,title")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (docsErr) throw docsErr;

        if (!cancelled) setDocuments(docsData || []);

        // Fetch recent quiz attempts for this user
        const { data: attemptsData, error: attemptsErr } = await supabaseBrowser
          .from("quiz_attempts")
          .select("id,started_at,completed_at,score")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(25);
        if (attemptsErr) throw attemptsErr;
        const attemptIds = (attemptsData || []).map((a) => a.id);
        if (!cancelled) setQuizAttempts(attemptsData || []);

        if (attemptIds.length === 0) {
          if (!cancelled) {
            setQuestionAttempts([]);
            setQuestions({});
            setChunksById({});
          }
          return;
        }

        const { data: qaData, error: qaErr } = await supabaseBrowser
          .from("question_attempts")
          .select("id,quiz_attempt_id,question_id,is_correct,created_at,score")
          .in("quiz_attempt_id", attemptIds);
        if (qaErr) throw qaErr;
        const questionIds = Array.from(new Set((qaData || []).map((q) => q.question_id)));
        if (!cancelled) setQuestionAttempts(qaData || []);

        let questionRows: QuizQuestion[] = [];
        if (questionIds.length > 0) {
          const { data: qRows, error: qErr } = await supabaseBrowser
            .from("quiz_questions")
            .select("id,difficulty,chunk_id,quiz_set_id")
            .in("id", questionIds);
          if (qErr) throw qErr;
          questionRows = qRows || [];
          if (!cancelled) {
            const map: Record<string, QuizQuestion> = {};
            for (const q of questionRows) map[q.id] = q;
            setQuestions(map);
          }
        } else {
          if (!cancelled) setQuestions({});
        }

        const chunkIds = Array.from(new Set(questionRows.map((q) => q.chunk_id).filter(Boolean))) as string[];
        if (chunkIds.length > 0) {
          const { data: chunkRows, error: chunkErr } = await supabaseBrowser
            .from("document_chunks")
            .select("id,document_id")
            .in("id", chunkIds);
          if (chunkErr) throw chunkErr;
          if (!cancelled) {
            const cMap: Record<string, DocumentChunk> = {};
            for (const c of chunkRows || []) cMap[c.id] = c;
            setChunksById(cMap);
          }
        } else {
          if (!cancelled) setChunksById({});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "데이터를 불러오는 중 문제가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const { totalAnswered, incorrectCount, accuracy, diffStats, weakDocsTop } = useMemo(() => {
    const total = questionAttempts.length;
    const incorrect = questionAttempts.filter((qa) => qa.is_correct === false).length;
    const acc = total > 0 ? Math.round(((total - incorrect) / total) * 100) : null;

    const dStats: Record<string, { wrong: number; total: number }> = {};
    for (const qa of questionAttempts) {
      const q = questions[qa.question_id];
      const diff = (q?.difficulty || "unknown").toString();
      if (!dStats[diff]) dStats[diff] = { wrong: 0, total: 0 };
      dStats[diff].total += 1;
      if (qa.is_correct === false) dStats[diff].wrong += 1;
    }

    // Weak documents based on incorrect counts by document_id
    const wrongByDoc: Record<string, number> = {};
    for (const qa of questionAttempts) {
      if (qa.is_correct === false) {
        const q = questions[qa.question_id];
        const chunk = q?.chunk_id ? chunksById[q.chunk_id] : undefined;
        const docId = chunk?.document_id;
        if (docId) wrongByDoc[docId] = (wrongByDoc[docId] || 0) + 1;
      }
    }
    const top = Object.entries(wrongByDoc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([docId, count]) => ({
        id: docId,
        title: documents.find((d) => d.id === docId)?.title || "이름 없는 문서",
        count,
      }));

    return {
      totalAnswered: total,
      incorrectCount: incorrect,
      accuracy: acc,
      diffStats: dStats,
      weakDocsTop: top,
    };
  }, [questionAttempts, questions, chunksById, documents]);

  // Recommended difficulty based on lowest accuracy bucket
  const recommendedDifficulty = useMemo(() => {
    let best: { diff: "easy" | "medium" | "hard" | "mixed"; acc: number } | null = null;
    const keys: ("easy" | "medium" | "hard" | "mixed" | string)[] = Object.keys(diffStats);
    for (const k of keys) {
      if (k === "unknown" || k === "mixed") continue;
      const s = diffStats[k];
      if (!s) continue;
      const a = s.total > 0 ? (s.total - s.wrong) / s.total : 1;
      const d = (k as any) as "easy" | "medium" | "hard" | "mixed";
      if (!best || a < best.acc) best = { diff: d, acc: a };
    }
    return best?.diff || "mixed";
  }, [diffStats]);

  const canStart = useMemo(() => {
    if (documents.length === 0) return false;
    if (mode === "custom" && selectedDocs.length === 0) return false;
    if (count < 1) return false;
    return true;
  }, [documents.length, mode, selectedDocs.length, count]);

  const onToggleType = (t: string) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const applyRecommended = () => {
    setDifficulty(recommendedDifficulty);
    if (weakDocsTop.length > 0) {
      setMode("weak_docs");
      setSelectedDocs(weakDocsTop.map((w) => w.id));
    } else {
      setMode("mistakes");
    }
    if (totalAnswered >= 12) setCount(15);
  };

  const startQuiz = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("difficulty", difficulty);
    params.set("count", String(count));
    if (types.length > 0) params.set("types", types.join(","));
    if (mode === "custom" || mode === "weak_docs") {
      const ids = mode === "weak_docs" ? selectedDocs : selectedDocs;
      if (ids.length > 0) params.set("docs", ids.join(","));
    }
    params.set("srs", useSrs ? "1" : "0");
    params.set("explain", explain ? "1" : "0");
    router.push(`/quizzes/adaptive/take?${params.toString()}`);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">맞춤형 퀴즈 설정</h1>
          <p className="text-muted-foreground mt-1">약점과 오답 데이터를 바탕으로 가장 효율적인 학습 세트를 구성합니다.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="border-destructive/20">
            <AlertTitle>불러오기 오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {authChecking || loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">최근 정답률</div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className={cn("text-3xl font-semibold", accuracy !== null ? (accuracy >= 70 ? "text-emerald-600" : accuracy >= 40 ? "text-amber-600" : "text-rose-600") : "text-muted-foreground")}>{accuracy !== null ? `${accuracy}%` : "-"}</div>
                <div className="text-xs text-muted-foreground">({totalAnswered}문항)</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">오답 {incorrectCount}개</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">난이도별 오답</div>
              <div className="mt-3 space-y-2">
                {(["easy", "medium", "hard"] as const).map((d) => {
                  const s = diffStats[d] || { wrong: 0, total: 0 };
                  const rate = s.total ? Math.round((s.wrong / s.total) * 100) : 0;
                  return (
                    <div key={d} className="flex items-center gap-3">
                      <div className="w-16 text-xs capitalize text-muted-foreground">{d}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full", d === recommendedDifficulty ? "bg-primary" : "bg-amber-500")} style={{ width: `${rate}%` }} />
                      </div>
                      <div className="w-10 text-right text-xs text-muted-foreground">{rate}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">약한 문서</div>
              <div className="mt-2 space-y-1">
                {weakDocsTop.length > 0 ? (
                  weakDocsTop.map((w) => (
                    <div key={w.id} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-3" title={w.title}>
                        {w.title}
                      </span>
                      <span className="text-muted-foreground">오답 {w.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">데이터가 충분하지 않습니다.</div>
                )}
              </div>
              <button
                type="button"
                onClick={applyRecommended}
                className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition"
              >
                추천 설정 적용
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">세트 구성</h2>
              <Link href="/quizzes" className="text-sm text-primary hover:underline">
                퀴즈 목록으로 돌아가기
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-1">학습 목적에 맞춰 범위와 난이도, 문항 유형을 선택하세요.</p>

            <Separator className="my-5" />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-medium mb-2">집중 범위</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { key: "mistakes", label: "최근 오답" },
                      { key: "weak_docs", label: "약한 문서" },
                      { key: "all", label: "전체" },
                      { key: "custom", label: "문서 선택" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setMode(opt.key as any)}
                        className={cn(
                          "h-10 rounded-md border px-3 text-sm font-medium transition",
                          mode === (opt.key as any)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent border-input"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(mode === "weak_docs" || mode === "custom") && (
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-2">포함할 문서를 선택하세요</div>
                      <div className="max-h-48 overflow-auto rounded-md border p-2">
                        {documents.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-2">문서를 먼저 업로드해 주세요.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {documents.map((d) => (
                              <label key={d.id} className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={selectedDocs.includes(d.id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedDocs((prev) =>
                                      checked ? Array.from(new Set([...prev, d.id])) : prev.filter((x) => x !== d.id)
                                    );
                                  }}
                                />
                                <span className="text-sm truncate" title={d.title}>{d.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {mode === "weak_docs" && weakDocsTop.length > 0 && selectedDocs.length === 0 && (
                        <div className="text-xs text-muted-foreground mt-2">힌트: 상단 카드의 "추천 설정 적용"을 누르면 약한 문서가 자동 선택됩니다.</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">난이도</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["mixed", "easy", "medium", "hard"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={cn(
                          "h-10 rounded-md border px-3 text-sm font-medium transition capitalize",
                          difficulty === d ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-input"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">문항 유형</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { k: "multiple_choice", label: "객관식" },
                      { k: "short_answer", label: "단답형" },
                      { k: "true_false", label: "OX" },
                      { k: "flashcard", label: "플래시카드" },
                    ].map((t) => (
                      <button
                        key={t.k}
                        type="button"
                        onClick={() => onToggleType(t.k)}
                        className={cn(
                          "h-10 rounded-md border px-3 text-sm font-medium transition",
                          types.includes(t.k) ? "bg-secondary text-secondary-foreground border-secondary" : "bg-background hover:bg-accent border-input"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">문항 수</div>
                    <div className="text-sm text-muted-foreground">{count}문항</div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="mt-3 w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5</span>
                    <span>30</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={useSrs}
                      onChange={(e) => setUseSrs(e.target.checked)}
                    />
                    <div>
                      <div className="text-sm font-medium">SRS 우선순위 적용</div>
                      <div className="text-xs text-muted-foreground">복습 예정 카드와 약한 개념을 우선 포함합니다.</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={explain}
                      onChange={(e) => setExplain(e.target.checked)}
                    />
                    <div>
                      <div className="text-sm font-medium">해설 포함</div>
                      <div className="text-xs text-muted-foreground">문항마다 정답과 간단한 해설을 제공합니다.</div>
                    </div>
                  </label>
                </div>

                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">현재 설정 요약</div>
                  <div>범위: {mode === "mistakes" ? "최근 오답" : mode === "weak_docs" ? "약한 문서" : mode === "custom" ? "선택 문서" : "전체"}</div>
                  <div>난이도: {difficulty}</div>
                  <div>유형: {types.length > 0 ? types.join(", ") : "선택 없음"}</div>
                  <div>문항 수: {count}</div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {documents.length === 0 ? (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTitle>시작하려면 문서를 업로드하세요</AlertTitle>
                <AlertDescription>
                  아직 학습 문서가 없습니다. 업로드 후 자동 생성된 퀴즈와 요약으로 맞춤형 학습을 시작할 수 있어요.
                  <div className="mt-3">
                    <Link
                      href="/upload"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition"
                    >
                      문서 업로드하기
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={startQuiz}
                  disabled={!canStart}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition",
                    canStart ? "hover:opacity-90" : "opacity-50 cursor-not-allowed"
                  )}
                >
                  시작하기
                </button>
                <Link
                  href="/quizzes"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition"
                >
                  취소
                </Link>
                {mode === "custom" && selectedDocs.length === 0 && (
                  <div className="text-xs text-amber-600">문서 선택 후 시작할 수 있어요.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="text-base font-medium">작동 방식</h3>
          <p className="text-sm text-muted-foreground mt-2">
            poiima는 최근 오답, 난이도별 정확도, SRS 복습 일정을 종합해 학습 효과가 높은 문제를 우선 제공합니다.
            문서 기반 RAG를 사용하여 문맥을 유지한 질의응답 및 해설을 제공합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
