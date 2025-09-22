"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Reviews hub for the SRS system. It displays a protected overview of review items due today,
 * user's review streak, and scheduling insights. It pulls data from Supabase (srs_cards, srs_reviews, documents) for the
 * authenticated user, and provides navigation to start a review session and to related areas like dashboard and quizzes.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type SrsCardRow = {
  id: string;
  document_id: string | null;
  due_at: string; // ISO
  last_reviewed_at: string | null;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  status: string;
};

type DocumentRow = {
  id: string;
  title: string;
};

function startOfDayLocal(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDayLocal(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toLocalDateKey(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatKoreanDate(d: Date) {
  try {
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatKoreanTime(d: Date) {
  try {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
}

export default function ReviewsPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [cards, setCards] = useState<SrsCardRow[]>([]);
  const [docMap, setDocMap] = useState<Record<string, string>>({});

  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const startToday = useMemo(() => startOfDayLocal(now), [now]);
  const endToday = useMemo(() => endOfDayLocal(now), [now]);
  const endNext7 = useMemo(() => endOfDayLocal(addDays(now, 7)), [now]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const u = authData?.user ?? null;
        if (!u) {
          // If the layout doesn't handle redirects, gently nudge to login.
          setUserId(null);
          setLoading(false);
          router.push("/login");
          return;
        }
        if (cancelled) return;
        setUserId(u.id);

        // Fetch SRS cards due by next 7 days end
        const { data: cardData, error: cardErr } = await supabase
          .from("srs_cards")
          .select("id, document_id, due_at, last_reviewed_at, interval_days, ease_factor, repetitions, status")
          .eq("user_id", u.id)
          .lte("due_at", endNext7.toISOString())
          .order("due_at", { ascending: true });
        if (cardErr) throw cardErr;
        if (cancelled) return;
        const safeCards = (cardData ?? []) as SrsCardRow[];
        setCards(safeCards);

        // Fetch documents for titles
        const docIds = Array.from(new Set(safeCards.map((c) => c.document_id).filter(Boolean))) as string[];
        if (docIds.length > 0) {
          const { data: docs, error: docsErr } = await supabase
            .from("documents")
            .select("id, title")
            .in("id", docIds);
          if (docsErr) throw docsErr;
          const map: Record<string, string> = {};
          (docs as DocumentRow[] | null)?.forEach((d) => {
            map[d.id] = d.title;
          });
          if (!cancelled) setDocMap(map);
        } else {
          if (!cancelled) setDocMap({});
        }

        // Fetch recent reviews to compute streak
        try {
          const since = addDays(now, -60);
          const { data: reviews, error: rErr } = await supabase
            .from("srs_reviews")
            .select("id, reviewed_at, card_id, srs_cards!inner(user_id)")
            .eq("srs_cards.user_id", u.id)
            .gte("reviewed_at", since.toISOString())
            .order("reviewed_at", { ascending: false })
            .limit(5000);
          if (rErr) throw rErr;
          if (!reviews || cancelled) {
            setStreak(0);
            setCompletedToday(0);
            setLastReviewedAt(null);
          } else {
            const dates = new Set<string>();
            let latest: string | null = null;
            let todayCount = 0;
            const todayKey = toLocalDateKey(now);
            for (const r of reviews as { reviewed_at: string }[]) {
              const dt = new Date(r.reviewed_at);
              const key = toLocalDateKey(dt);
              dates.add(key);
              if (!latest || new Date(r.reviewed_at) > new Date(latest)) latest = r.reviewed_at;
              if (key === todayKey) todayCount += 1;
            }
            // compute streak: consecutive days ending today
            let s = 0;
            for (let i = 0; i < 365; i++) {
              const d = addDays(now, -i);
              const key = toLocalDateKey(d);
              if (dates.has(key)) s += 1;
              else break;
            }
            if (!cancelled) {
              setStreak(s);
              setCompletedToday(todayCount);
              setLastReviewedAt(latest);
            }
          }
        } catch (e) {
          // Streak is non-critical
          if (!cancelled) {
            setStreak(0);
            setCompletedToday(0);
            setLastReviewedAt(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "데이터를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [endNext7, now, router, supabase]);

  const stats = useMemo(() => {
    const startTs = startToday.getTime();
    const endTs = endToday.getTime();

    const overdue = cards.filter((c) => new Date(c.due_at).getTime() < startTs);
    const dueToday = cards.filter((c) => {
      const t = new Date(c.due_at).getTime();
      return t >= startTs && t <= endTs;
    });
    const upcoming = cards.filter((c) => new Date(c.due_at).getTime() > endTs);

    const totalDueNow = overdue.length + dueToday.length;

    // Next 7 days buckets (tomorrow -> +7)
    const buckets: { date: Date; count: number }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = addDays(startToday, i);
      buckets.push({ date: d, count: 0 });
    }
    upcoming.forEach((c) => {
      const d = startOfDayLocal(new Date(c.due_at));
      const diffDays = Math.round((d.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 7) {
        buckets[diffDays - 1].count += 1;
      }
    });
    const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

    const sampleToday = [...overdue, ...dueToday]
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
      .slice(0, 10);

    return {
      overdue,
      dueToday,
      upcomingBuckets: buckets,
      maxBucket,
      totalDueNow,
      sampleToday,
    };
  }, [cards, endToday, startToday]);

  const readyToReview = stats.totalDueNow > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">리뷰 허브</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">오늘 복습할 카드와 진행 상황을 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-sm md:text-base text-primary hover:underline">대시보드</Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/quizzes" className="text-sm md:text-base text-primary hover:underline">퀴즈</Link>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-destructive/50 text-destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Due Today */}
        <div className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-40" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">오늘 due</span>
                {stats.overdue.length > 0 && (
                  <span className="text-xs rounded-full bg-destructive/10 text-destructive px-2 py-0.5">연체 {stats.overdue.length}</span>
                )}
              </div>
              <div className="text-3xl font-bold">{stats.dueToday.length}</div>
              <p className="text-xs text-muted-foreground">지금 예정 {stats.totalDueNow}개</p>
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-orange-500"><path d="M13.4 1.7c.3.2.5.6.5 1 0 1.7-.1 3.3-.4 4.9 1.1-.4 2.3-1.1 3.4-2.1.4-.3 1-.3 1.4 0 .4.4.4 1 0 1.4-1.4 1.3-2.9 2.2-4.4 2.7-.3 2-.9 3.9-1.9 5.7-.9 1.6-2.1 2.9-3.6 3.8-.5.3-1.1.1-1.4-.4-.3-.5-.1-1.1.4-1.4 1.2-.7 2.1-1.7 2.9-2.9.6-1 1.1-2.2 1.4-3.4-1.3.4-2.7.6-4.1.6-.6 0-1-.4-1.1-1-.1-.6.4-1.1 1-1.1 1.7 0 3.3-.3 4.9-1 .3-1.6.5-3.3.5-5 0-.4.2-.8.6-1 .3-.2.8-.2 1.1 0z"/></svg>
                연속 학습
              </div>
              <div className="text-3xl font-bold">{streak}<span className="text-base font-medium ml-1 text-muted-foreground">일</span></div>
              <p className="text-xs text-muted-foreground">오늘 완료 {completedToday}회</p>
            </div>
          )}
        </div>

        {/* Next 7 days */}
        <div className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex items-end gap-1 h-16">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="w-6 h-full" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">다음 7일</div>
              <div className="flex items-end gap-1 h-20">
                {stats.upcomingBuckets.map((b, i) => {
                  const h = Math.max(6, Math.round((b.count / stats.maxBucket) * 68));
                  return (
                    <div key={i} className="flex flex-col items-center justify-end">
                      <div className="rounded-md bg-primary/80 w-6" style={{ height: h }} />
                      <span className="mt-1 text-[10px] text-muted-foreground">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Last reviewed */}
        <div className="rounded-xl border bg-card text-card-foreground p-4 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">마지막 복습</div>
              <div className="text-xl font-semibold">
                {lastReviewedAt ? `${formatKoreanDate(new Date(lastReviewedAt))} ${formatKoreanTime(new Date(lastReviewedAt))}` : "기록 없음"}
              </div>
              <p className="text-xs text-muted-foreground">꾸준함이 실력을 만듭니다 ✨</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mb-8">
        {loading ? (
          <Skeleton className="h-11 w-full sm:w-60" />
        ) : (
          <Link
            href={readyToReview ? "/reviews/session" : "/reviews"}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-colors shadow-sm",
              readyToReview
                ? "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            aria-disabled={!readyToReview}
          >
            {readyToReview ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                지금 복습 시작</span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 11h-2V7h2Zm0 4h-2v-2h2Z"/></svg>
                오늘 복습할 카드가 없어요</span>
            )}
          </Link>
        )}
      </div>

      {/* Today list */}
      <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold">오늘 예정 카드</h2>
            <p className="text-xs text-muted-foreground">연체 포함 최대 10개 미리보기</p>
          </div>
          {!loading && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >새로고침</button>
          )}
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/5" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : stats.sampleToday.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            오늘 복습할 카드가 없습니다. 퀴즈를 생성해 학습을 시작해 보세요.
            <div className="mt-3">
              <Link href="/quizzes" className="text-primary hover:underline">퀴즈 보러가기</Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {stats.sampleToday.map((c) => {
              const due = new Date(c.due_at);
              const docTitle = c.document_id ? docMap[c.document_id] : undefined;
              return (
                <li key={c.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-sm md:text-base">
                      {docTitle ? docTitle : "문서 기반 카드"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.repetitions > 0 ? `반복 ${c.repetitions}회 • 간격 ${c.interval_days}일 • EF ${Number(c.ease_factor).toFixed(2)}` : "신규 카드"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-xs md:text-sm", new Date(c.due_at).getTime() < startToday.getTime() ? "text-destructive" : "text-muted-foreground")}>{formatKoreanDate(due)} {formatKoreanTime(due)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Helpful notes */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-1">스케줄 안내</div>
          <p className="text-sm text-muted-foreground">
            SM-2 스케줄은 정답 품질에 따라 간격이 조정돼요. 꾸준히 복습할수록 간격이 늘어나며, 오답은 더 빠르게 다시 등장합니다.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-1">빠른 팁</div>
          <p className="text-sm text-muted-foreground">
            세션은 짧게, 자주! 오늘 예정 카드부터 시작하고, 집중력이 떨어지면 다음 파동을 내일로 미루세요.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-1">다음 단계</div>
          <p className="text-sm text-muted-foreground">
            문서 요약으로 핵심을 파악하고, 약한 개념 위주 맞춤 퀴즈로 보강하세요. 진행도는 대시보드에서 확인할 수 있어요.
          </p>
          <div className="mt-2 flex gap-3">
            <Link href="/dashboard" className="text-primary text-sm hover:underline">대시보드</Link>
            <Link href="/quizzes" className="text-primary text-sm hover:underline">퀴즈</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
