"use client";

/**
 * CODE INSIGHT
 * This code's use case is to run a protected SRS review session. It fetches all due SRS cards for the
 * authenticated user, renders each item (quiz question or document chunk), captures recall grades,
 * and updates scheduling per SM-2. On completion, it provides navigation to /reviews and /dashboard.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type UUID = string;

type SrsCardRow = {
  id: UUID;
  user_id?: UUID;
  origin_type: string; // enum in DB
  origin_id: UUID;
  document_id: UUID | null;
  quiz_question_id: UUID | null;
  chunk_id: UUID | null;
  due_at: string; // ISO
  last_reviewed_at: string | null;
  interval_days: number;
  ease_factor: string | number; // numeric comes as string from PostgREST
  repetitions: number;
  status: string; // enum in DB
};

type QuizQuestion = {
  id: UUID;
  question_type: string;
  prompt: string;
  options: any | null; // JSON
  correct_answer: any | null; // JSON
  explanation: string | null;
  chunk_id: UUID | null;
};

type DocumentChunk = {
  id: UUID;
  document_id: UUID;
  text: string;
  page_number: number | null;
  slide_number: number | null;
};

type DocumentRow = {
  id: UUID;
  title: string;
};

type EnrichedCard = {
  card: SrsCardRow;
  kind: "quiz" | "chunk" | "generic";
  prompt: string;
  options?: any | null;
  answer?: any | null;
  explanation?: string | null;
  chunkText?: string | null;
  source?: {
    documentTitle?: string;
    page?: number | null;
    slide?: number | null;
  };
};

export default function ReviewSessionPage() {
  const router = useRouter();
  const supabase = supabaseBrowser;

  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState<UUID | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<EnrichedCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [justGraded, setJustGraded] = useState<{
    quality: number;
    cardId: UUID;
  } | null>(null);

  const current = cards[index];

  const progressPct = useMemo(() => {
    const total = cards.length || 1;
    return Math.min(100, Math.round(((index + (sessionComplete ? 1 : 0)) / total) * 100));
  }, [cards.length, index, sessionComplete]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setAuthChecking(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (authError) {
        setError("인증 상태를 확인하는 중 오류가 발생했어요.");
        setAuthChecking(false);
        setLoading(false);
        return;
      }
      const u = authData?.user ?? null;
      if (!u) {
        setUserId(null);
        setAuthChecking(false);
        setLoading(false);
        return;
      }
      setUserId(u.id as UUID);
      setAuthChecking(false);
      await loadDueCards(u.id as UUID);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDueCards = useCallback(
    async (uid: UUID) => {
      setLoading(true);
      setError(null);
      setSessionComplete(false);
      setRevealed(false);
      setIndex(0);

      const nowIso = new Date().toISOString();
      const { data: dueRows, error: dueErr } = await supabase
        .from("srs_cards")
        .select(
          "id, user_id, origin_type, origin_id, document_id, quiz_question_id, chunk_id, due_at, last_reviewed_at, interval_days, ease_factor, repetitions, status"
        )
        .eq("user_id", uid)
        .lte("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(200);

      if (dueErr) {
        setError("복습 카드를 불러오는 중 문제가 발생했어요.");
        setLoading(false);
        return;
      }

      const rows: SrsCardRow[] = dueRows ?? [];
      if (rows.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // Collect related IDs
      const chunkIds = rows.filter((r) => !!r.chunk_id).map((r) => r.chunk_id!) as UUID[];
      const qqIds = rows
        .filter((r) => !!r.quiz_question_id)
        .map((r) => r.quiz_question_id!) as UUID[];

      // Fetch related rows in parallel
      const [chunksRes, qqRes] = await Promise.all([
        chunkIds.length
          ? supabase
              .from("document_chunks")
              .select("id, document_id, text, page_number, slide_number")
              .in("id", chunkIds)
          : Promise.resolve({ data: [], error: null } as { data: DocumentChunk[]; error: any }),
        qqIds.length
          ? supabase
              .from("quiz_questions")
              .select("id, question_type, prompt, options, correct_answer, explanation, chunk_id")
              .in("id", qqIds)
          : Promise.resolve({ data: [], error: null } as { data: QuizQuestion[]; error: any }),
      ]);

      if (chunksRes.error || qqRes.error) {
        setError("관련 데이터를 로드하는 중 오류가 발생했어요.");
        setLoading(false);
        return;
      }

      const chunks = (chunksRes.data as DocumentChunk[]) || [];
      const qqs = (qqRes.data as QuizQuestion[]) || [];

      // Fetch documents
      const docIds = new Set<UUID>();
      rows.forEach((r) => r.document_id && docIds.add(r.document_id));
      chunks.forEach((c) => docIds.add(c.document_id));

      const { data: docRows, error: docErr } = docIds.size
        ? await supabase
            .from("documents")
            .select("id, title")
            .in("id", Array.from(docIds))
        : { data: [], error: null };

      if (docErr) {
        setError("문서 정보를 불러오는 중 오류가 발생했어요.");
        setLoading(false);
        return;
      }

      const docMap = new Map<UUID, DocumentRow>();
      (docRows as DocumentRow[]).forEach((d) => docMap.set(d.id, d));
      const chunkMap = new Map<UUID, DocumentChunk>();
      chunks.forEach((c) => chunkMap.set(c.id, c));
      const qqMap = new Map<UUID, QuizQuestion>();
      qqs.forEach((q) => qqMap.set(q.id, q));

      const enriched: EnrichedCard[] = rows.map((r) => {
        if (r.quiz_question_id && qqMap.has(r.quiz_question_id)) {
          const q = qqMap.get(r.quiz_question_id)!;
          const chunk = q.chunk_id ? chunkMap.get(q.chunk_id) : null;
          const doc = r.document_id ? docMap.get(r.document_id) : chunk ? docMap.get(chunk.document_id) : undefined;
          return {
            card: r,
            kind: "quiz",
            prompt: q.prompt,
            options: q.options ?? null,
            answer: q.correct_answer ?? null,
            explanation: q.explanation ?? null,
            chunkText: chunk?.text ?? null,
            source: {
              documentTitle: doc?.title,
              page: chunk?.page_number ?? null,
              slide: chunk?.slide_number ?? null,
            },
          } as EnrichedCard;
        } else if (r.chunk_id && chunkMap.has(r.chunk_id)) {
          const chunk = chunkMap.get(r.chunk_id)!;
          const doc = docMap.get(chunk.document_id);
          return {
            card: r,
            kind: "chunk",
            prompt: doc?.title ? `${doc.title}` : "학습 섹션",
            options: null,
            answer: null,
            explanation: null,
            chunkText: chunk.text,
            source: {
              documentTitle: doc?.title,
              page: chunk.page_number ?? null,
              slide: chunk.slide_number ?? null,
            },
          } as EnrichedCard;
        } else {
          // Fallback if neither quiz nor chunk resolvable
          const doc = r.document_id ? docMap.get(r.document_id) : undefined;
          return {
            card: r,
            kind: "generic",
            prompt: doc?.title ? `${doc.title}` : "복습 항목",
            options: null,
            answer: null,
            explanation: null,
            chunkText: null,
            source: { documentTitle: doc?.title },
          } as EnrichedCard;
        }
      });

      setCards(enriched);
      setLoading(false);
    },
    [supabase]
  );

  const onReveal = () => setRevealed(true);

  const formatAnswer = (ans: any) => {
    if (ans == null) return "";
    if (typeof ans === "string") return ans;
    try {
      return JSON.stringify(ans, null, 2);
    } catch (_) {
      return String(ans);
    }
  };

  const computeSchedule = (
    card: SrsCardRow,
    quality: number
  ) => {
    const prevInterval = Number(card.interval_days || 0) || 0;
    let ef = typeof card.ease_factor === "string" ? parseFloat(card.ease_factor) : Number(card.ease_factor || 2);
    if (!isFinite(ef) || ef <= 0) ef = 2;
    let reps = Number(card.repetitions || 0) || 0;

    // Update EF per SM-2
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ef < 1.3) ef = 1.3;

    let interval = 0;
    if (quality < 3) {
      reps = 0;
      interval = 1; // minimal day interval for failed recall
    } else {
      if (reps <= 0) interval = 1;
      else if (reps === 1) interval = 6;
      else interval = Math.round(prevInterval * ef) || 1;
      reps = reps + 1;
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    return {
      previous: {
        interval_days: prevInterval,
        ease_factor: typeof card.ease_factor === "string" ? parseFloat(card.ease_factor) : Number(card.ease_factor || 2),
        repetitions: Number(card.repetitions || 0) || 0,
      },
      next: {
        interval_days: interval,
        ease_factor: ef,
        repetitions: reps,
        last_reviewed_at: now.toISOString(),
        due_at: dueAt.toISOString(),
      },
    } as const;
  };

  const gradeCard = async (quality: number) => {
    if (!current) return;
    setSubmitting(true);
    setError(null);

    const { previous, next } = computeSchedule(current.card, quality);

    // Update card
    const { error: updErr } = await supabase
      .from("srs_cards")
      .update({
        interval_days: next.interval_days,
        ease_factor: next.ease_factor,
        repetitions: next.repetitions,
        last_reviewed_at: next.last_reviewed_at,
        due_at: next.due_at,
      })
      .eq("id", current.card.id)
      .limit(1);

    if (updErr) {
      setError("카드 일정을 업데이트하지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }

    // Insert review log
    const { error: insErr } = await supabase.from("srs_reviews").insert({
      card_id: current.card.id,
      quality: quality,
      previous_interval_days: previous.interval_days,
      new_interval_days: next.interval_days,
      previous_ease_factor: previous.ease_factor,
      new_ease_factor: next.ease_factor,
      previous_repetitions: previous.repetitions,
      new_repetitions: next.repetitions,
    });

    if (insErr) {
      // Not fatal to session progression, but inform user
      setError("리뷰 기록 저장 중 문제가 있었어요. 계속 진행은 가능하지만 다시 시도해주세요.");
    }

    setJustGraded({ quality, cardId: current.card.id });

    // Move forward
    setSubmitting(false);
    setRevealed(false);
    if (index + 1 >= cards.length) {
      setSessionComplete(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const restartSession = async () => {
    if (!userId) return;
    await loadDueCards(userId);
  };

  const renderHeader = () => {
    return (
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">복습 세션</h1>
          <p className="text-sm text-muted-foreground">기억 점수를 선택하면 일정이 자동으로 조정됩니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <div className="text-xs text-muted-foreground mb-1">진행률</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.min(index + 1, cards.length)} / {cards.length}
          </div>
        </div>
      </div>
    );
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {renderHeader()}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  );

  const GradeButtons = ({ disabled }: { disabled?: boolean }) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => gradeCard(0)}
        className={cn(
          "h-11 rounded-md border px-3 text-sm font-medium transition-colors",
          "bg-destructive text-destructive-foreground border-transparent hover:opacity-90 disabled:opacity-50"
        )}
        aria-label="Again (0)"
      >
        다시(0)
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => gradeCard(3)}
        className={cn(
          "h-11 rounded-md border px-3 text-sm font-medium transition-colors",
          "bg-secondary text-secondary-foreground border-transparent hover:opacity-90 disabled:opacity-50"
        )}
        aria-label="Hard (3)"
      >
        어려움(3)
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => gradeCard(4)}
        className={cn(
          "h-11 rounded-md border px-3 text-sm font-medium transition-colors",
          "bg-primary text-primary-foreground border-transparent hover:opacity-90 disabled:opacity-50"
        )}
        aria-label="Good (4)"
      >
        보통(4)
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => gradeCard(5)}
        className={cn(
          "h-11 rounded-md border px-3 text-sm font-medium transition-colors",
          "bg-accent text-accent-foreground border-transparent hover:opacity-90 disabled:opacity-50"
        )}
        aria-label="Easy (5)"
      >
        쉬움(5)
      </button>
    </div>
  );

  const renderFront = (item: EnrichedCard) => {
    const docTitle = item.source?.documentTitle;
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-muted-foreground truncate max-w-[75%]">
            {docTitle ? docTitle : "문서"}
            {item.source?.page ? ` · p.${item.source.page}` : ""}
            {item.source?.slide ? ` · 슬라이드 ${item.source.slide}` : ""}
          </div>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {item.kind === "quiz" ? "퀴즈" : item.kind === "chunk" ? "섹션" : "카드"}
          </span>
        </div>
        <h2 className="mb-3 text-lg font-semibold leading-snug">
          {item.kind === "quiz" ? item.prompt : `${item.prompt} — 기억해보세요`}
        </h2>
        {item.kind === "quiz" && item.options ? (
          <div className="mb-4 space-y-2">
            {Array.isArray(item.options) ? (
              (item.options as any[]).map((opt, idx) => (
                <div key={idx} className="rounded-md border bg-card px-3 py-2 text-sm">
                  {typeof opt === "string" ? opt : JSON.stringify(opt)}
                </div>
              ))
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                {formatAnswer(item.options)}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
              아래 버튼을 눌러 정답/해설을 확인하세요.
            </div>
            {item.kind === "chunk" && item.chunkText ? (
              <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                <div className="line-clamp-3 select-none blur-[3px]">{item.chunkText}</div>
              </div>
            ) : null}
          </>
        )}
        <div className="mt-6">
          <button
            type="button"
            onClick={onReveal}
            className={cn(
              "h-11 w-full rounded-md border px-4 text-sm font-medium",
              "bg-primary text-primary-foreground border-transparent hover:opacity-90"
            )}
          >
            정답 보기
          </button>
        </div>
      </div>
    );
  };

  const renderBack = (item: EnrichedCard) => {
    const docTitle = item.source?.documentTitle;
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-muted-foreground truncate max-w-[75%]">
            {docTitle ? docTitle : "문서"}
            {item.source?.page ? ` · p.${item.source.page}` : ""}
            {item.source?.slide ? ` · 슬라이드 ${item.source.slide}` : ""}
          </div>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            결과
          </span>
        </div>
        <h2 className="mb-3 text-lg font-semibold leading-snug">정답 & 해설</h2>
        {item.kind === "quiz" ? (
          <div className="space-y-3">
            {item.answer != null ? (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">정답</div>
                <div className="rounded-md border bg-card p-3 text-sm">
                  {formatAnswer(item.answer)}
                </div>
              </div>
            ) : null}
            {item.explanation ? (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">해설</div>
                <div className="rounded-md border bg-card p-3 text-sm whitespace-pre-wrap">
                  {item.explanation}
                </div>
              </div>
            ) : null}
            {item.chunkText ? (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">관련 섹션</div>
                <div className="rounded-md border bg-card p-3 text-sm whitespace-pre-wrap">
                  {item.chunkText}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {item.chunkText ? (
              <div className="rounded-md border bg-card p-3 text-sm whitespace-pre-wrap">
                {item.chunkText}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                이 카드에는 표시할 텍스트가 없어요.
              </div>
            )}
          </div>
        )}
        <Separator className="my-6" />
        <div>
          <div className="mb-2 text-sm text-muted-foreground">기억 점수를 선택하세요</div>
          <GradeButtons disabled={submitting} />
        </div>
      </div>
    );
  };

  if (authChecking || loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {renderSkeleton()}
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertTitle>로그인이 필요해요</AlertTitle>
          <AlertDescription>
            이 페이지는 보호되어 있습니다. 로그인 후 다시 시도해주세요.
          </AlertDescription>
        </Alert>
        <div className="mt-6 flex gap-3">
          <a
            href="/login"
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium",
              "bg-primary text-primary-foreground border-transparent hover:opacity-90"
            )}
          >
            로그인으로 이동
          </a>
          <a
            href="/"
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium",
              "bg-secondary text-secondary-foreground border-transparent hover:opacity-90"
            )}
          >
            홈으로
          </a>
        </div>
      </main>
    );
  }

  if (!loading && cards.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        {renderHeader()}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-2 text-lg font-semibold">현재 복습할 항목이 없어요</div>
          <p className="text-sm text-muted-foreground">
            예정된 카드가 없거나 모두 완료되었어요. 잠시 후 다시 확인해보세요.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <a
              href="/reviews"
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center rounded-md border px-4 text-sm font-medium",
                "bg-primary text-primary-foreground border-transparent hover:opacity-90"
              )}
            >
              리뷰 목록으로
            </a>
            <a
              href="/dashboard"
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center rounded-md border px-4 text-sm font-medium",
                "bg-secondary text-secondary-foreground border-transparent hover:opacity-90"
              )}
            >
              대시보드로
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      {renderHeader()}

      {error ? (
        <div className="mb-4">
          <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
            <AlertTitle>문제가 발생했어요</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {!sessionComplete && current ? (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          {!revealed ? renderFront(current) : renderBack(current)}
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              예정일: {new Date(current.card.due_at).toLocaleString()}
            </div>
            <div className="flex items-center gap-3">
              <a href="/reviews" className="hover:underline">
                나가기
              </a>
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                className="rounded-md border bg-muted px-3 py-1.5 text-xs hover:opacity-90"
              >
                {revealed ? "질문으로" : "정답으로"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-2 text-lg font-semibold">세션 완료!</div>
          <p className="text-sm text-muted-foreground">
            훌륭해요. 복습한 카드는 다음 일정에 맞춰 자동으로 예약되었어요.
          </p>
          {justGraded ? (
            <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              마지막 카드 점수: {justGraded.quality}
            </div>
          ) : null}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a
              href="/reviews"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium",
                "bg-primary text-primary-foreground border-transparent hover:opacity-90"
              )}
            >
              리뷰 목록으로
            </a>
            <a
              href="/dashboard"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium",
                "bg-secondary text-secondary-foreground border-transparent hover:opacity-90"
              )}
            >
              대시보드로
            </a>
            <button
              type="button"
              onClick={restartSession}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium",
                "bg-accent text-accent-foreground border-transparent hover:opacity-90"
              )}
            >
              새로고침 및 다시 시작
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
