"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Quizzes hub page for authenticated users. It presents entry points to Adaptive (mistake-focused) quizzes,
 * highlights recently studied quiz activity, and offers per-document quiz access. It reads only the necessary data from Supabase under RLS
 * using the browser client and renders a clean, responsive UI without headers/footers/sidebars (handled by layout).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type QuizAttemptRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  score: string | number | null;
  quiz_sets: {
    id: string;
    title: string;
    type: string;
    document_id: string | null;
    documents: {
      id: string;
      title: string;
    } | null;
  } | null;
};

type DocumentRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at?: string;
};

export default function QuizzesHubPage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [recentAttempts, setRecentAttempts] = useState<QuizAttemptRow[] | null>(null);
  const [recentAttemptsError, setRecentAttemptsError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  const [mistakeCount, setMistakeCount] = useState<number | null>(null);
  const [mistakeCountError, setMistakeCountError] = useState<string | null>(null);
  const [loadingMistakes, setLoadingMistakes] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (!isMounted) return;
      if (error || !data?.user) {
        setUserId(null);
      } else {
        setUserId(data.user.id);
      }
      setLoadingUser(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let abort = false;

    const fetchAttempts = async () => {
      setLoadingAttempts(true);
      setRecentAttemptsError(null);
      const { data, error } = await supabaseBrowser
        .from("quiz_attempts")
        .select(
          `id, started_at, completed_at, score,
           quiz_sets:quiz_sets (
             id, title, type, document_id,
             documents:documents ( id, title )
           )`
        )
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(5);
      if (abort) return;
      if (error) {
        setRecentAttemptsError(error.message || "최근 활동을 불러오지 못했어요.");
        setRecentAttempts(null);
      } else {
        setRecentAttempts(data as unknown as QuizAttemptRow[]);
      }
      setLoadingAttempts(false);
    };

    const fetchDocuments = async () => {
      setLoadingDocuments(true);
      setDocumentsError(null);
      const { data, error } = await supabaseBrowser
        .from("documents")
        .select("id, title, status, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(12);
      if (abort) return;
      if (error) {
        setDocumentsError(error.message || "문서 목록을 불러오지 못했어요.");
        setDocuments(null);
      } else {
        setDocuments(data as unknown as DocumentRow[]);
      }
      setLoadingDocuments(false);
    };

    const fetchMistakeCount = async () => {
      setLoadingMistakes(true);
      setMistakeCountError(null);
      // Count incorrect answers across user's question attempts using an inner join filter
      const { count, error } = await supabaseBrowser
        .from("question_attempts")
        .select("id, quiz_attempts!inner(user_id)", { count: "exact", head: true })
        .eq("quiz_attempts.user_id", userId)
        .eq("is_correct", false);
      if (abort) return;
      if (error) {
        setMistakeCountError(error.message || "약점 통계를 불러오지 못했어요.");
        setMistakeCount(null);
      } else {
        setMistakeCount(count ?? 0);
      }
      setLoadingMistakes(false);
    };

    fetchAttempts();
    fetchDocuments();
    fetchMistakeCount();

    return () => {
      abort = true;
    };
  }, [userId]);

  const isLoading = loadingUser || loadingAttempts || loadingDocuments || loadingMistakes;

  const primaryActionClasses =
    "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:opacity-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm font-medium";
  const secondaryLinkClasses =
    "inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline";

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "";
    try {
      const dt = new Date(iso);
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dt);
    } catch {
      return iso || "";
    }
  };

  const adaptiveSubtitle = useMemo(() => {
    if (loadingMistakes) return "분석 중...";
    if (mistakeCountError) return "통계를 불러오지 못함";
    const count = mistakeCount ?? 0;
    if (count === 0) return "훌륭해요! 약점이 거의 없어요.";
    if (count < 5) return `약점 ${count}개 보완하기`;
    if (count < 15) return `집중 연습 추천: 약점 ${count}개`;
    return `우선순위 보강 필요: 약점 ${count}개`;
  }, [loadingMistakes, mistakeCountError, mistakeCount]);

  return (
    <div className="w-full">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">퀴즈 허브</h1>
        <p className="text-sm text-muted-foreground">poiima가 준비한 학습 퀴즈—약점 보강, 최근 학습 이어하기, 문서별 퀴즈를 한 곳에서.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Adaptive Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">적응형 퀴즈 (오답 중심)</h2>
              <p className="mt-1 text-sm text-muted-foreground">개인 약점을 자동으로 분석해 가장 필요한 문제부터 제시합니다.</p>
            </div>
            <div className="shrink-0 rounded-full bg-primary/10 p-2 text-primary">✨</div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{adaptiveSubtitle}</div>
            <Link href="/quizzes/adaptive" className={primaryActionClasses}>
              시작하기
            </Link>
          </div>
        </div>

        {/* Recently Studied Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">최근 학습 이어하기</h2>
              <p className="mt-1 text-sm text-muted-foreground">최근에 풀었던 퀴즈 결과를 확인하고, 필요한 영역을 복습하세요.</p>
            </div>
            <div className="shrink-0 rounded-full bg-primary/10 p-2 text-primary">🕒</div>
          </div>
          <div className="mt-4">
            {loadingAttempts ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : recentAttemptsError ? (
              <Alert variant="destructive">
                <AlertTitle>불러오기 오류</AlertTitle>
                <AlertDescription>{recentAttemptsError}</AlertDescription>
              </Alert>
            ) : recentAttempts && recentAttempts.length > 0 ? (
              <ul className="space-y-3">
                {recentAttempts.map((a) => {
                  const docTitle = a.quiz_sets?.documents?.title || a.quiz_sets?.title || "제목 없는 세트";
                  const completed = !!a.completed_at;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{docTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {completed ? `완료 • ${formatDateTime(a.completed_at)}` : `시작 • ${formatDateTime(a.started_at)}`}
                          {typeof a.score !== "undefined" && a.score !== null ? ` • 점수 ${a.score}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {completed ? (
                          <Link href={`/quizzes/results/${a.id}`} className={cn(secondaryLinkClasses)}>
                            결과 보기 →
                          </Link>
                        ) : a.quiz_sets?.documents?.id ? (
                          <Link href={`/documents/${a.quiz_sets.documents.id}/quiz`} className={cn(secondaryLinkClasses)}>
                            이어서 풀기 →
                          </Link>
                        ) : (
                          <Link href="/dashboard" className={cn(secondaryLinkClasses)}>
                            대시보드 →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">아직 최근 활동이 없어요. 아래에서 문서를 선택해 퀴즈를 시작해 보세요.</div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Link href="/dashboard" className={secondaryLinkClasses}>
              학습 대시보드로 이동 →
            </Link>
          </div>
        </div>

        {/* By Document Card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">문서별 퀴즈</h2>
              <p className="mt-1 text-sm text-muted-foreground">업로드한 학습자료에서 핵심 개념을 테스트하세요.</p>
            </div>
            <div className="shrink-0 rounded-full bg-primary/10 p-2 text-primary">📚</div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">내 문서에서 선택하여 바로 풀기</div>
            <Link href="/documents" className={primaryActionClasses}>
              문서 선택
            </Link>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Documents carousel */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">내 문서</h3>
          <Link href="/documents" className={secondaryLinkClasses}>
            모두 보기 →
          </Link>
        </div>
        {loadingDocuments ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-3 h-4 w-1/2" />
                <Skeleton className="mt-4 h-9 w-28" />
              </div>
            ))}
          </div>
        ) : documentsError ? (
          <Alert variant="destructive">
            <AlertTitle>불러오기 오류</AlertTitle>
            <AlertDescription>{documentsError}</AlertDescription>
          </Alert>
        ) : documents && documents.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {documents.map((doc) => (
                <CarouselItem key={doc.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-xl border border-border bg-card p-4 flex flex-col">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {doc.status ? `상태: ${doc.status}` : ""} {doc.updated_at ? `• 업데이트 ${formatDateTime(doc.updated_at)}` : ""}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link href={`/documents/${doc.id}/quiz`} className={primaryActionClasses}>
                        퀴즈 풀기
                      </Link>
                      <Link href={`/documents/${doc.id}`} className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition">
                        문서 보기
                      </Link>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-3 flex items-center justify-end gap-2">
              <CarouselPrevious className="h-9 w-9" />
              <CarouselNext className="h-9 w-9" />
            </div>
          </Carousel>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">아직 업로드된 문서가 없어요. 학습자료를 추가하고 바로 퀴즈를 생성해 보세요.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link href="/upload" className={primaryActionClasses}>
                문서 업로드
              </Link>
              <Link href="/documents" className={secondaryLinkClasses}>
                문서 목록으로 이동 →
              </Link>
            </div>
          </div>
        )}
      </section>

      <Separator className="my-8" />

      {/* Recent quiz activity list */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">최근 퀴즈 활동</h3>
          <Link href="/dashboard" className={secondaryLinkClasses}>
            대시보드에서 더 보기 →
          </Link>
        </div>
        {loadingAttempts ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
                <Skeleton className="h-9 w-28" />
              </div>
            ))}
          </div>
        ) : recentAttemptsError ? (
          <Alert variant="destructive">
            <AlertTitle>불러오기 오류</AlertTitle>
            <AlertDescription>{recentAttemptsError}</AlertDescription>
          </Alert>
        ) : recentAttempts && recentAttempts.length > 0 ? (
          <ul className="space-y-3">
            {recentAttempts.map((a) => {
              const docTitle = a.quiz_sets?.documents?.title || a.quiz_sets?.title || "제목 없는 세트";
              const completed = !!a.completed_at;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{docTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {completed ? `완료 • ${formatDateTime(a.completed_at)}` : `시작 • ${formatDateTime(a.started_at)}`}
                      {typeof a.score !== "undefined" && a.score !== null ? ` • 점수 ${a.score}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {completed ? (
                      <Link href={`/quizzes/results/${a.id}`} className={primaryActionClasses}>
                        결과 보기
                      </Link>
                    ) : a.quiz_sets?.documents?.id ? (
                      <Link href={`/documents/${a.quiz_sets.documents.id}/quiz`} className={primaryActionClasses}>
                        이어서 풀기
                      </Link>
                    ) : (
                      <Link href="/dashboard" className={primaryActionClasses}>
                        대시보드로 이동
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            최근 활동이 없어요. 적응형 퀴즈를 시작하거나 문서에서 퀴즈를 생성해 보세요.
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link href="/quizzes/adaptive" className={primaryActionClasses}>
                적응형 시작
              </Link>
              <Link href="/documents" className={secondaryLinkClasses}>
                문서별 퀴즈 →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* If user missing (edge under misconfigured protection) */}
      {!loadingUser && !userId && (
        <div className="mt-8">
          <Alert variant="destructive">
            <AlertTitle>로그인이 필요합니다</AlertTitle>
            <AlertDescription>
              보호된 페이지예요. 로그인 후 퀴즈 허브를 이용하세요. {" "}
              <Link href="/login" className="underline">로그인</Link>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
