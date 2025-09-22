"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the main authenticated dashboard for poiima users.
 * It provides progress stats, upcoming SRS reviews, recent activity, and quick actions.
 * The page loads user-specific data from supabaseBrowser (client-side) and presents a sleek,
 * responsive UI without header/footer/sidebar. This page is production-ready and
 * optimized for clarity and usability on mobile and desktop.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type UUID = string;

type Profile = {
  id: UUID;
  user_id: UUID;
  display_name: string | null;
  avatar_url: string | null;
};

type DocumentRow = {
  id: UUID;
  user_id: UUID;
  title: string;
  status: string | null;
  created_at: string;
  page_count: number | null;
};

type SrsCardRow = {
  id: UUID;
  user_id: UUID;
  document_id: UUID | null;
  quiz_question_id: UUID | null;
  chunk_id: UUID | null;
  due_at: string; // ISO
};

type UsageEventRow = {
  id: UUID;
  user_id: UUID;
  event_type: string;
  related_document_id: UUID | null;
  provider: string | null;
  model: string | null;
  total_cost_usd: string | number | null;
  occurred_at: string; // ISO
};

type QuizAttemptRow = {
  id: UUID;
  user_id: UUID;
  score: string | number | null;
  started_at: string;
  completed_at: string | null;
};

function formatNumber(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat().format(n);
}

function formatPercent(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "-";
  return `${Math.round(n)}%`;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function timeFromNow(iso: string) {
  const now = new Date();
  const target = new Date(iso);
  const diffMs = target.getTime() - now.getTime();
  const past = diffMs <= 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return past ? "지금" : "곧";
  if (mins < 60) return `${mins}분 ${past ? "지남" : "후"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}시간 ${past ? "지남" : "후"}`;
  const days = Math.round(hours / 24);
  return `${days}일 ${past ? "지남" : "후"}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<UUID | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Stats
  const [docCount, setDocCount] = useState<number>(0);
  const [quizAttemptCount, setQuizAttemptCount] = useState<number>(0);
  const [quizAvgScore, setQuizAvgScore] = useState<number | null>(null);
  const [dueNowCount, setDueNowCount] = useState<number>(0);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);

  // Lists
  const [recentDocs, setRecentDocs] = useState<DocumentRow[] | null>(null);
  const [dueNowList, setDueNowList] = useState<SrsCardRow[] | null>(null);
  const [upcomingList, setUpcomingList] = useState<SrsCardRow[] | null>(null);
  const [recentEvents, setRecentEvents] = useState<UsageEventRow[] | null>(null);
  const [docTitles, setDocTitles] = useState<Record<string, string>>({});

  const loadData = useCallback(async (uid: UUID) => {
    setError(null);
    setLoading(true);
    try {
      // Profile
      const { data: profileData, error: profileError } = await supabaseBrowser
        .from("profiles")
        .select("id,user_id,display_name,avatar_url")
        .eq("user_id", uid)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profileData) setProfile(profileData as Profile);

      // Stats: documents count
      const { count: dCount, error: dErr } = await supabaseBrowser
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if (dErr) throw dErr;
      setDocCount(dCount ?? 0);

      // Stats: quiz attempts count
      const { count: qaCount, error: qaErr } = await supabaseBrowser
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if (qaErr) throw qaErr;
      setQuizAttemptCount(qaCount ?? 0);

      // Stats: quiz avg score (fetch subset for efficiency)
      const { data: qaScores, error: qaScoresErr } = await supabaseBrowser
        .from("quiz_attempts")
        .select("score")
        .eq("user_id", uid)
        .not("score", "is", null)
        .order("started_at", { ascending: false })
        .limit(1000);
      if (qaScoresErr) throw qaScoresErr;
      if (qaScores && qaScores.length > 0) {
        const nums = qaScores
          .map((r) => (typeof r.score === "string" ? parseFloat(r.score) : r.score))
          .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
        setQuizAvgScore(avg !== null ? Math.max(0, Math.min(100, avg)) : null);
      } else {
        setQuizAvgScore(null);
      }

      const nowIso = new Date().toISOString();

      // Stats: due now count
      const { count: dueCount, error: dueErr } = await supabaseBrowser
        .from("srs_cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .lte("due_at", nowIso);
      if (dueErr) throw dueErr;
      setDueNowCount(dueCount ?? 0);

      // Stats: next due at
      const { data: nextDue, error: nextErr } = await supabaseBrowser
        .from("srs_cards")
        .select("due_at")
        .eq("user_id", uid)
        .gt("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(1);
      if (nextErr) throw nextErr;
      setNextDueAt(nextDue && nextDue.length ? nextDue[0].due_at : null);

      // Recent documents
      const { data: rDocs, error: rDocsErr } = await supabaseBrowser
        .from("documents")
        .select("id,user_id,title,status,created_at,page_count")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5);
      if (rDocsErr) throw rDocsErr;
      setRecentDocs((rDocs as DocumentRow[]) || []);

      // Due now list (top 5 by overdue)
      const { data: dueList, error: dueListErr } = await supabaseBrowser
        .from("srs_cards")
        .select("id,user_id,document_id,quiz_question_id,chunk_id,due_at")
        .eq("user_id", uid)
        .lte("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(5);
      if (dueListErr) throw dueListErr;
      setDueNowList((dueList as SrsCardRow[]) || []);

      // Upcoming list (next 5)
      const { data: upList, error: upErr } = await supabaseBrowser
        .from("srs_cards")
        .select("id,user_id,document_id,quiz_question_id,chunk_id,due_at")
        .eq("user_id", uid)
        .gt("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(5);
      if (upErr) throw upErr;
      setUpcomingList((upList as SrsCardRow[]) || []);

      // Recent usage events
      const { data: events, error: eventsErr } = await supabaseBrowser
        .from("usage_events")
        .select("id,user_id,event_type,related_document_id,provider,model,total_cost_usd,occurred_at")
        .eq("user_id", uid)
        .order("occurred_at", { ascending: false })
        .limit(8);
      if (eventsErr) throw eventsErr;
      setRecentEvents((events as UsageEventRow[]) || []);

      // Collect doc titles for cards and events
      const docIds = new Set<string>();
      for (const c of (dueList as SrsCardRow[]) || []) {
        if (c.document_id) docIds.add(c.document_id);
      }
      for (const c of (upList as SrsCardRow[]) || []) {
        if (c.document_id) docIds.add(c.document_id);
      }
      for (const ev of (events as UsageEventRow[]) || []) {
        if (ev.related_document_id) docIds.add(ev.related_document_id);
      }
      if (docIds.size > 0) {
        const { data: titles, error: titlesErr } = await supabaseBrowser
          .from("documents")
          .select("id,title")
          .in("id", Array.from(docIds));
        if (titlesErr) throw titlesErr;
        const map: Record<string, string> = {};
        for (const t of titles || []) map[t.id] = t.title;
        setDocTitles(map);
      } else {
        setDocTitles({});
      }
    } catch (e: any) {
      setError(e?.message || "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [supabaseBrowser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabaseBrowser.auth.getUser();
      if (userErr || !user) {
        router.replace("/login?next=/dashboard");
        return;
      }
      if (!mounted) return;
      setUserId(user.id as UUID);
      await loadData(user.id as UUID);
    })();

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login?next=/dashboard");
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router, supabaseBrowser, loadData]);

  const greeting = useMemo(() => {
    const name = profile?.display_name?.trim();
    return name && name.length > 0 ? `${name}님` : "학습자님";
  }, [profile]);

  const handleRefresh = useCallback(() => {
    if (userId) loadData(userId);
  }, [loadData, userId]);

  return (
    <main className="w-full space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">안녕하세요, {greeting}</h1>
          <p className="text-muted-foreground mt-1">poiima 대시보드에서 학습 진행 상황과 다음 할 일을 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            파일 업로드
          </Link>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            새로고침
          </button>
        </div>
      </section>

      {error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTitle>데이터를 불러오지 못했어요</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="학습자료"
          primary={loading ? undefined : formatNumber(docCount)}
          subtitle="업로드한 문서"
          loading={loading}
        />
        <StatCard
          title="퀴즈 시도"
          primary={loading ? undefined : formatNumber(quizAttemptCount)}
          subtitle="총 시도 수"
          loading={loading}
        />
        <StatCard
          title="평균 점수"
          primary={loading ? undefined : formatPercent(quizAvgScore)}
          subtitle="최근 시도 기준"
          loading={loading}
        />
        <StatCard
          title="복습 예정"
          primary={loading ? undefined : formatNumber(dueNowCount)}
          subtitle={nextDueAt ? `다음: ${timeFromNow(nextDueAt)}` : "다음 일정 준비중"}
          loading={loading}
        />
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <QuickAction href="/upload" label="업로드" emoji="📤" description="PDF/DOCX 등 자료 추가" />
        <QuickAction href="/documents" label="문서" emoji="📚" description="내 문서 관리" />
        <QuickAction href="/reviews/session" label="복습 시작" emoji="🧠" description="SRS 세션 진행" />
        <QuickAction href="/quizzes/adaptive" label="맞춤 퀴즈" emoji="🎯" description="약점 집중 퀴즈" />
        <QuickAction href="/settings" label="설정" emoji="⚙️" description="환경 설정" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Reviews */}
        <div className="col-span-1 flex flex-col rounded-xl border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">오늘 복습</h2>
            <Link href="/reviews" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </div>
          <Separator className="my-3" />
          {loading ? (
            <ListSkeleton rows={5} />
          ) : dueNowList && dueNowList.length > 0 ? (
            <ul className="space-y-3">
              {dueNowList.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.document_id ? docTitles[c.document_id] || "문서 기반 카드" : "카드"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(c.due_at)} • {timeFromNow(c.due_at)}</p>
                  </div>
                  {c.document_id ? (
                    <Link
                      href={`/documents/${c.document_id}`}
                      className="ml-3 inline-flex shrink-0 items-center rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      문서
                    </Link>
                  ) : (
                    <span className="ml-3 inline-flex shrink-0 select-none rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">일반</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="오늘 복습할 카드가 없어요" description="예정된 복습이 생기면 여기에서 안내해 드릴게요." />
          )}

          <Separator className="my-4" />
          <h3 className="mb-2 text-sm font-medium">다가오는 복습</h3>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : upcomingList && upcomingList.length > 0 ? (
            <ul className="space-y-3">
              {upcomingList.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.document_id ? docTitles[c.document_id] || "문서 기반 카드" : "카드"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(c.due_at)} • {timeFromNow(c.due_at)}</p>
                  </div>
                  {c.document_id ? (
                    <Link
                      href={`/documents/${c.document_id}`}
                      className="ml-3 inline-flex shrink-0 items-center rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      문서
                    </Link>
                  ) : (
                    <span className="ml-3 inline-flex shrink-0 select-none rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">일반</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="예정된 복습이 없어요" description="문서 학습 또는 퀴즈를 진행하면 복습 카드가 생성됩니다." />
          )}
          <div className="mt-4 flex justify-end">
            <Link
              href="/reviews/session"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              지금 복습 시작
            </Link>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="col-span-1 flex flex-col rounded-xl border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">최근 문서</h2>
            <Link href="/documents" className="text-sm text-primary hover:underline">
              문서 관리
            </Link>
          </div>
          <Separator className="my-3" />
          {loading ? (
            <ListSkeleton rows={5} />
          ) : recentDocs && recentDocs.length > 0 ? (
            <ul className="space-y-3">
              {recentDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/documents/${d.id}`} className="truncate text-sm font-medium hover:underline">
                      {d.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateTime(d.created_at)} • 페이지 {d.page_count ?? "-"}</p>
                  </div>
                  <span className="ml-3 shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{d.status ?? "처리중"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="아직 업로드한 문서가 없어요" description="지금 문서를 업로드하고 학습을 시작해 보세요." ctaHref="/upload" ctaLabel="업로드" />
          )}
        </div>

        {/* Recent Activity */}
        <div className="col-span-1 flex flex-col rounded-xl border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">최근 활동</h2>
            <Link href="/settings/usage" className="text-sm text-primary hover:underline">
              사용량 보기
            </Link>
          </div>
          <Separator className="my-3" />
          {loading ? (
            <ListSkeleton rows={6} />
          ) : recentEvents && recentEvents.length > 0 ? (
            <ul className="space-y-3">
              {recentEvents.map((e) => (
                <li key={e.id} className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 items-center rounded-md bg-secondary px-2 text-xs text-secondary-foreground">
                        {e.event_type}
                      </span>
                      {e.related_document_id && (
                        <Link
                          href={`/documents/${e.related_document_id}`}
                          className="max-w-[160px] truncate text-xs text-primary hover:underline sm:max-w-[220px]"
                        >
                          {docTitles[e.related_document_id] || "문서"}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(e.occurred_at)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {e.provider && <span>제공자: {e.provider}</span>}
                    {e.model && <span>모델: {e.model}</span>}
                    {e.total_cost_usd != null && (
                      <span className="ml-auto inline-flex items-center rounded bg-muted px-2 py-0.5 text-muted-foreground">
                        비용 ${typeof e.total_cost_usd === "string" ? parseFloat(e.total_cost_usd).toFixed(4) : (e.total_cost_usd as number).toFixed(4)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="활동 내역이 아직 없어요" description="문서를 업로드하고 요약·퀴즈·대화를 시작해 보세요." />
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, primary, subtitle, loading }: { title: string; primary?: string; subtitle?: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <p className="text-xs text-muted-foreground">{title}</p>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold">{primary ?? "-"}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

function QuickAction({ href, label, emoji, description }: { href: string; label: string; emoji: string; description?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground transition",
        "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg">{emoji}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{label}</p>
        {description && <p className="truncate text-xs text-muted-foreground group-hover:text-accent-foreground/80">{description}</p>}
      </div>
    </Link>
  );
}

function EmptyState({ title, description, ctaHref, ctaLabel }: { title: string; description?: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background p-6 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {ctaHref && ctaLabel && (
        <div className="mt-3">
          <Link href={ctaHref} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-12" />
        </li>
      ))}
    </ul>
  );
}
