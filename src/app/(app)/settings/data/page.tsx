"use client";

/**
 * CODE INSIGHT
 * This code's use case is the authenticated Data Management page for users to export their data as JSON
 * and purge all personal data stored in the application's Supabase database and storage (excluding auth account deletion).
 * It provides a clear explanation of storage isolation and links to related settings pages. No header/footer/sidebar content here.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

type Json = Record<string, any>;

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em]",
        className
      )}
      aria-label="로딩 중"
      role="status"
    />
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function DataSettingsPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const confirmValid = confirmPhrase.trim().toLowerCase() === "delete" || confirmPhrase.trim() === "삭제";

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingUser(true);
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (error || !data.user) {
        setUserId(null);
        setUserEmail(null);
      } else {
        setUserId(data.user.id);
        setUserEmail(data.user.email ?? null);
      }
      setLoadingUser(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const downloadJson = (filename: string, data: Json) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeSelect = async <T,>(table: string, builder: (q: any) => any) => {
    const q = supabase.from(table).select("*");
    const query = builder(q);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    return data as T[];
  };

  const exportData = useCallback(async () => {
    if (!userId) return;
    setExportError(null);
    setExportSuccess(null);
    setExporting(true);
    try {
      // Core tables with direct user_id
      const [profile] = await safeSelect<any>("profiles", (q: any) => q.eq("user_id", userId).limit(1));
      const documents = await safeSelect<any>("documents", (q: any) => q.eq("user_id", userId));
      const summaries = await safeSelect<any>("summaries", (q: any) => q.eq("user_id", userId));
      const quiz_sets = await safeSelect<any>("quiz_sets", (q: any) => q.eq("user_id", userId));
      const srs_cards = await safeSelect<any>("srs_cards", (q: any) => q.eq("user_id", userId));
      const usage_events = await safeSelect<any>("usage_events", (q: any) => q.eq("user_id", userId));
      const chat_sessions = await safeSelect<any>("chat_sessions", (q: any) => q.eq("user_id", userId));
      const quiz_attempts = await safeSelect<any>("quiz_attempts", (q: any) => q.eq("user_id", userId));
      const jobs = await safeSelect<any>("jobs", (q: any) => q.eq("user_id", userId));
      const user_consents = await safeSelect<any>("user_consents", (q: any) => q.eq("user_id", userId));

      // Related tables via joins or dependent IDs
      const documentIds = documents.map((d) => d.id);
      const quizSetIds = quiz_sets.map((s) => s.id);
      const srsCardIds = srs_cards.map((c) => c.id);
      const chatSessionIds = chat_sessions.map((s) => s.id);
      const quizAttemptIds = quiz_attempts.map((a) => a.id);

      const document_chunks = documentIds.length
        ? await safeSelect<any>("document_chunks", (q: any) => q.in("document_id", documentIds))
        : [];

      const quiz_questions = quizSetIds.length
        ? await safeSelect<any>("quiz_questions", (q: any) => q.in("quiz_set_id", quizSetIds))
        : [];

      const question_attempts = quizAttemptIds.length
        ? await safeSelect<any>("question_attempts", (q: any) => q.in("quiz_attempt_id", quizAttemptIds))
        : [];

      // srs_reviews join by srs_cards
      const srs_reviews = srsCardIds.length
        ? await safeSelect<any>("srs_reviews", (q: any) => q.in("card_id", srsCardIds))
        : [];

      // chat_messages by session ids
      const chat_messages = chatSessionIds.length
        ? await safeSelect<any>("chat_messages", (q: any) => q.in("session_id", chatSessionIds))
        : [];
      const chatMessageIds = chat_messages.map((m) => m.id);
      const chat_message_citations = chatMessageIds.length
        ? await safeSelect<any>("chat_message_citations", (q: any) => q.in("message_id", chatMessageIds))
        : [];

      const exportedAt = new Date().toISOString();
      const payload = {
        metadata: {
          app: "poiima",
          exported_at: exportedAt,
          user_id: userId,
          user_email: userEmail,
          schema_version: 1,
          note: "chunk_embeddings and raw storage file bytes are excluded in this JSON export.",
        },
        profile: profile ?? null,
        documents,
        document_chunks,
        summaries,
        quiz_sets,
        quiz_questions,
        quiz_attempts,
        question_attempts,
        srs_cards,
        srs_reviews,
        usage_events,
        chat_sessions,
        chat_messages,
        chat_message_citations,
        jobs,
        user_consents,
      } satisfies Json;

      const stamp = exportedAt.replace(/[:.]/g, "-");
      const filename = `poiima-export-${stamp}.json`;
      downloadJson(filename, payload);
      setExportSuccess("데이터 내보내기가 완료되었어요. JSON 파일이 다운로드되었습니다.");
    } catch (e: any) {
      setExportError(e?.message || "내보내기 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }, [userId, userEmail, supabase]);

  const deleteAllData = useCallback(async () => {
    if (!userId) return;
    setDeleteError(null);
    setDeleteSuccess(null);
    setDeleting(true);
    setDeleteProgress(0);

    const step = (i: number, n: number) => setDeleteProgress(Math.round(((i + 1) / n) * 100));

    try {
      // Prefetch IDs and storage paths
      const [documentsRes, chatSessionsRes, quizAttemptsRes, quizSetsRes, srsCardsRes, chatMessagesRes] = await Promise.all([
        supabase.from("documents").select("id, storage_bucket, storage_path").eq("user_id", userId),
        supabase.from("chat_sessions").select("id").eq("user_id", userId),
        supabase.from("quiz_attempts").select("id").eq("user_id", userId),
        supabase.from("quiz_sets").select("id").eq("user_id", userId),
        supabase.from("srs_cards").select("id").eq("user_id", userId),
        // messages to speed up citations deletion
        supabase.from("chat_messages").select("id").in(
          "session_id",
          (await supabase.from("chat_sessions").select("id").eq("user_id", userId)).data?.map((s: any) => s.id) ?? []
        ),
      ]);

      if (documentsRes.error) throw documentsRes.error;
      if (chatSessionsRes.error) throw chatSessionsRes.error;
      if (quizAttemptsRes.error) throw quizAttemptsRes.error;
      if (quizSetsRes.error) throw quizSetsRes.error;
      if (srsCardsRes.error) throw srsCardsRes.error;
      if (chatMessagesRes.error) throw chatMessagesRes.error;

      const documents = documentsRes.data || [];
      const documentIds: string[] = documents.map((d: any) => d.id);
      const chatSessionIds: string[] = chatSessionsRes.data?.map((s: any) => s.id) || [];
      const quizAttemptIds: string[] = quizAttemptsRes.data?.map((a: any) => a.id) || [];
      const quizSetIds: string[] = quizSetsRes.data?.map((s: any) => s.id) || [];
      const srsCardIds: string[] = srsCardsRes.data?.map((c: any) => c.id) || [];
      const chatMessageIds: string[] = chatMessagesRes.data?.map((m: any) => m.id) || [];

      const batches = <T,>(arr: T[], size = 500) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      const totalSteps = 18;
      let s = 0;

      // 1) Delete citations
      if (chatMessageIds.length) {
        for (const b of batches(chatMessageIds)) {
          const { error } = await supabase.from("chat_message_citations").delete().in("message_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 2) Delete chat messages
      if (chatSessionIds.length) {
        for (const b of batches(chatSessionIds)) {
          const { error } = await supabase.from("chat_messages").delete().in("session_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 3) Delete chat sessions
      const { error: delSessionsErr } = await supabase.from("chat_sessions").delete().eq("user_id", userId);
      if (delSessionsErr) throw delSessionsErr;
      step(s++, totalSteps);

      // 4) Delete question_attempts
      if (quizAttemptIds.length) {
        for (const b of batches(quizAttemptIds)) {
          const { error } = await supabase.from("question_attempts").delete().in("quiz_attempt_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 5) Delete quiz_attempts
      const { error: delQuizAttemptsErr } = await supabase.from("quiz_attempts").delete().eq("user_id", userId);
      if (delQuizAttemptsErr) throw delQuizAttemptsErr;
      step(s++, totalSteps);

      // 6) Delete srs_reviews
      if (srsCardIds.length) {
        for (const b of batches(srsCardIds)) {
          const { error } = await supabase.from("srs_reviews").delete().in("card_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 7) Delete srs_cards
      const { error: delSrsErr } = await supabase.from("srs_cards").delete().eq("user_id", userId);
      if (delSrsErr) throw delSrsErr;
      step(s++, totalSteps);

      // 8) Delete quiz_questions (by quiz_set)
      if (quizSetIds.length) {
        for (const b of batches(quizSetIds)) {
          const { error } = await supabase.from("quiz_questions").delete().in("quiz_set_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 9) Delete quiz_sets
      const { error: delQuizSetsErr } = await supabase.from("quiz_sets").delete().eq("user_id", userId);
      if (delQuizSetsErr) throw delQuizSetsErr;
      step(s++, totalSteps);

      // 10) Delete summaries
      const { error: delSummariesErr } = await supabase.from("summaries").delete().eq("user_id", userId);
      if (delSummariesErr) throw delSummariesErr;
      step(s++, totalSteps);

      // 11) Delete chunk_embeddings by document_id
      if (documentIds.length) {
        for (const b of batches(documentIds)) {
          const { error } = await supabase.from("chunk_embeddings").delete().in("document_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 12) Delete document_chunks
      if (documentIds.length) {
        for (const b of batches(documentIds)) {
          const { error } = await supabase.from("document_chunks").delete().in("document_id", b);
          if (error) throw error;
        }
      }
      step(s++, totalSteps);

      // 13) Delete usage_events
      const { error: delUsageErr } = await supabase.from("usage_events").delete().eq("user_id", userId);
      if (delUsageErr) throw delUsageErr;
      step(s++, totalSteps);

      // 14) Delete jobs
      const { error: delJobsErr } = await supabase.from("jobs").delete().eq("user_id", userId);
      if (delJobsErr) throw delJobsErr;
      step(s++, totalSteps);

      // 15) Delete user_consents
      const { error: delConsentsErr } = await supabase.from("user_consents").delete().eq("user_id", userId);
      if (delConsentsErr) throw delConsentsErr;
      step(s++, totalSteps);

      // 16) Remove storage files
      if (documents.length) {
        const byBucket: Record<string, string[]> = {};
        for (const doc of documents) {
          if (!doc.storage_bucket || !doc.storage_path) continue;
          byBucket[doc.storage_bucket] = byBucket[doc.storage_bucket] || [];
          byBucket[doc.storage_bucket].push(doc.storage_path);
        }
        for (const [bucket, paths] of Object.entries(byBucket)) {
          for (const b of batches(paths, 100)) {
            // Ignore errors to avoid blocking DB cleanup if file already removed
            await supabase.storage.from(bucket).remove(b);
          }
        }
      }
      step(s++, totalSteps);

      // 17) Delete documents
      const { error: delDocsErr } = await supabase.from("documents").delete().eq("user_id", userId);
      if (delDocsErr) throw delDocsErr;
      step(s++, totalSteps);

      // 18) Delete profile
      const { error: delProfileErr } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (delProfileErr) throw delProfileErr;
      step(s++, totalSteps);

      setDeleteProgress(100);
      setDeleteSuccess("계정 데이터가 모두 삭제되었습니다. 서비스 이용을 계속하려면 새 데이터를 업로드하세요.");
    } catch (e: any) {
      setDeleteError(e?.message || "데이터 삭제 중 문제가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }, [supabase, userId]);

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← 대시보드로 돌아가기
        </Link>
        {!loadingUser && userEmail && (
          <span className="text-xs text-muted-foreground">로그인: {userEmail}</span>
        )}
      </div>

      <section className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">데이터 및 계정 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          poiima는 사용자별 데이터 격리와 프라이버시를 최우선으로 합니다. 여기에서 데이터 내보내기와 삭제를 관리하세요.
        </p>
      </section>

      <nav className="mb-8 flex w-full flex-wrap gap-2">
        <Link
          href="/settings/privacy"
          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          개인정보 및 동의
        </Link>
        <Link
          href="/settings/usage"
          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          사용량 및 비용
        </Link>
        <span
          className="rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          데이터 관리
        </span>
      </nav>

      <div className="space-y-8">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">저장소 격리 및 보안</h2>
          <Alert className="mb-4">
            <AlertTitle>사용자별 데이터 격리</AlertTitle>
            <AlertDescription>
              모든 데이터는 사용자별로 분리되어 저장되며, 데이터베이스는 RLS(Row-Level Security)로 보호됩니다. 파일은 Supabase
              Storage의 사용자 경로로 격리되어 다른 사용자가 접근할 수 없습니다.
            </AlertDescription>
          </Alert>

          <Collapsible>
            <CollapsibleTrigger className="text-sm text-primary hover:underline">자세히 보기</CollapsibleTrigger>
            <CollapsibleContent className="mt-3 text-sm text-muted-foreground">
              <ul className="list-inside list-disc space-y-1">
                <li>DB: 사용자 식별자 기준의 엄격한 접근 제어(RLS) 적용</li>
                <li>스토리지: 문서 파일은 사용자 버킷/경로에 저장되며 사전 인증 없이는 접근 불가</li>
                <li>삭제 시: 의존 데이터부터 안전하게 제거 후 원본 파일 삭제</li>
                <li>내보내기: JSON 형식으로 주요 데이터 다운로드(임베딩 벡터는 제외)</li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">데이터 내보내기</h2>
            <button
              onClick={exportData}
              disabled={!userId || exporting}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground shadow-sm",
                "hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {exporting && <Spinner />}
              {exporting ? "내보내는 중..." : "JSON 다운로드"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            내 계정의 주요 데이터(문서 메타, 청크, 요약, 퀴즈, 대화, 사용량 등)를 JSON 파일로 다운로드합니다. 저장소의 원본 파일과 임베딩 벡터는 포함되지 않습니다.
          </p>

          {exportError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>내보내기 실패</AlertTitle>
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}
          {exportSuccess && (
            <Alert className="mt-4">
              <AlertTitle>완료</AlertTitle>
              <AlertDescription>{exportSuccess}</AlertDescription>
            </Alert>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-medium text-destructive">데이터 삭제</h2>
          <p className="text-sm text-muted-foreground">
            아래 확인 절차를 완료하면 계정과 연결된 모든 앱 데이터가 삭제됩니다. 삭제는 되돌릴 수 없습니다. 인증 계정 자체 삭제는 포함되지 않습니다.
          </p>

          <div className="my-4 rounded-lg border border-dashed border-border p-4">
            <h3 className="mb-2 text-sm font-medium">삭제 대상 항목</h3>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              <li>문서, 청크, 요약, 임베딩, 퀴즈 세트 및 시도/결과</li>
              <li>대화 세션/메시지 및 인용, SRS 카드/리뷰</li>
              <li>사용량 이벤트, 작업 이력, 동의 기록, 프로필</li>
              <li>스토리지의 원본 파일(문서 업로드)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">확인 문구 입력</label>
              <input
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder='"DELETE" 또는 "삭제"를 입력'
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={ack1} onChange={(e) => setAck1(e.target.checked)} className="mt-0.5" />
              <span>삭제가 영구적이며 되돌릴 수 없음을 이해했습니다.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={ack2} onChange={(e) => setAck2(e.target.checked)} className="mt-0.5" />
              <span>인증 계정(로그인)은 별도의 절차로 삭제된다는 것을 이해했습니다.</span>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={deleteAllData}
              disabled={!userId || deleting || !confirmValid || !ack1 || !ack2}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground shadow-sm",
                "hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {deleting && <Spinner />}
              {deleting ? "삭제 중..." : "모든 데이터 삭제"}
            </button>
            {deleting && (
              <div className="flex-1">
                <Progress value={deleteProgress} />
                <p className="mt-1 text-xs text-muted-foreground">진행률 {deleteProgress}%</p>
              </div>
            )}
          </div>

          {deleteError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>삭제 실패</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          {deleteSuccess && (
            <Alert className="mt-4">
              <AlertTitle>완료</AlertTitle>
              <AlertDescription>{deleteSuccess}</AlertDescription>
            </Alert>
          )}
        </section>

        <Separator className="my-2" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">궁금한 점이 있나요? 개인정보 설정에서 동의 내역을 확인할 수 있어요.</p>
          <div className="flex gap-2">
            <Link
              href="/settings/privacy"
              className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
            >
              개인정보 설정
            </Link>
            <Link
              href="/settings/usage"
              className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
            >
              사용량 보기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
