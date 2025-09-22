"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a document-scoped RAG chat interface for an authenticated user.
 * It fetches or creates a chat session for the given document, lists chat messages, and displays
 * retrieval citations with highlighted snippets from related document chunks. It supports sending new
 * questions, real-time updates for incoming assistant messages, and navigation to related document tabs.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type UUID = string;

type DocumentRow = {
  id: UUID;
  user_id: UUID;
  title: string;
  original_filename: string;
  page_count: number | null;
};

type ChatSessionRow = {
  id: UUID;
  user_id: UUID;
  document_id: UUID | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type ChatRole = "user" | "assistant" | "system" | string;

type ChatMessageRow = {
  id: UUID;
  session_id: UUID;
  user_id: UUID | null;
  role: ChatRole;
  content: string;
  created_at: string;
  updated_at: string;
  tokens_in: number | null;
  tokens_out: number | null;
};

type CitationRow = {
  id: UUID;
  message_id: UUID;
  chunk_id: UUID;
  similarity: number | null;
  start_offset: number | null;
  end_offset: number | null;
  created_at: string;
  updated_at: string;
};

type ChunkRow = {
  id: UUID;
  document_id: UUID;
  chunk_index: number;
  text: string;
  page_number: number | null;
  slide_number: number | null;
  char_start: number | null;
  char_end: number | null;
};

type CitationDisplay = {
  citation: CitationRow;
  chunk: ChunkRow | null;
};

function useAutoScroll(deps: any[]) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return bottomRef;
}

function MessageBubble({
  message,
  citations,
  onOpenSources,
}: {
  message: ChatMessageRow;
  citations: CitationDisplay[];
  onOpenSources?: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("w-full flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground border border-border"
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
          {message.content}
        </div>
        {!isUser && (
          <div className="mt-3 space-y-2">
            {citations && citations.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">참고 자료</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {citations
                    .slice()
                    .sort((a, b) => (b.citation.similarity ?? 0) - (a.citation.similarity ?? 0))
                    .map((c, idx) => (
                      <SourceCard key={c.citation.id} idx={idx} data={c} />
                    ))}
                </div>
                {onOpenSources && (
                  <button
                    type="button"
                    onClick={onOpenSources}
                    className="text-xs text-primary hover:underline"
                    aria-label="모든 소스 보기"
                  >
                    모든 소스 보기
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">참고 출처 없음</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function HighlightedSnippet({ text, start, end }: { text: string; start: number | null | undefined; end: number | null | undefined }) {
  const length = text.length;
  if (
    start == null ||
    end == null ||
    isNaN(start) ||
    isNaN(end) ||
    start < 0 ||
    end <= start ||
    start >= length
  ) {
    const preview = text.slice(0, 220);
    return <span className="text-sm text-muted-foreground">{preview}{length > 220 ? "…" : ""}</span>;
  }
  const s = clamp(start, 0, length);
  const e = clamp(end, 0, length);
  const pre = text.slice(Math.max(0, s - 80), s);
  const mid = text.slice(s, e);
  const post = text.slice(e, Math.min(length, e + 80));
  return (
    <span className="text-sm text-muted-foreground">
      {pre && <span>…{pre}</span>}
      <mark className="bg-yellow-300/60 dark:bg-yellow-400/30 text-foreground rounded px-0.5">{mid}</mark>
      {post && <span>{post}…</span>}
    </span>
  );
}

function SourceCard({ idx, data }: { idx: number; data: CitationDisplay }) {
  const chunk = data.chunk;
  const pageOrSlide = chunk?.page_number != null
    ? `p.${chunk.page_number}`
    : chunk?.slide_number != null
    ? `slide ${chunk.slide_number}`
    : `chunk ${chunk?.chunk_index ?? "?"}`;
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-medium text-foreground">Source {idx + 1}</div>
        <div className="text-[10px] text-muted-foreground">{pageOrSlide}</div>
      </div>
      <HighlightedSnippet
        text={chunk?.text ?? ""}
        start={data.citation.start_offset}
        end={data.citation.end_offset}
      />
    </div>
  );
}

export default function DocumentChatPage() {
  const params = useParams();
  const router = useRouter();
  const docId = String((params as any)?.docId ?? "");
  const supabase = useMemo(() => supabaseBrowser, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<UUID | null>(null);
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [session, setSession] = useState<ChatSessionRow | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [citationsByMessage, setCitationsByMessage] = useState<Record<UUID, CitationDisplay[]>>({});

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAssistant, setPendingAssistant] = useState(false);

  const bottomRef = useAutoScroll([messages.length, pendingAssistant]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!mounted) return;
        setUserId(user.id);

        // Load document (RLS will ensure access)
        const { data: doc, error: docErr } = await supabase
          .from("documents")
          .select("id,user_id,title,original_filename,page_count")
          .eq("id", docId)
          .single();
        if (docErr) throw docErr;
        if (!doc) throw new Error("문서를 찾을 수 없습니다.");
        if (!mounted) return;
        setDocument(doc as DocumentRow);

        // Find or create chat session for this doc and user
        const { data: existingSessions, error: sessErr } = await supabase
          .from("chat_sessions")
          .select("id,user_id,document_id,title,created_at,updated_at")
          .eq("user_id", user.id)
          .eq("document_id", docId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (sessErr) throw sessErr;

        let sess: ChatSessionRow | null = existingSessions?.[0] ?? null;
        if (!sess) {
          const { data: created, error: createErr } = await supabase
            .from("chat_sessions")
            .insert({ user_id: user.id, document_id: docId, title: `Chat · ${doc.title}` })
            .select("id,user_id,document_id,title,created_at,updated_at")
            .single();
          if (createErr) throw createErr;
          sess = created as ChatSessionRow;
        }
        if (!mounted) return;
        setSession(sess);

        // Load initial messages
        const { data: msgs, error: msgErr } = await supabase
          .from("chat_messages")
          .select("id,session_id,user_id,role,content,created_at,updated_at,tokens_in,tokens_out")
          .eq("session_id", sess.id)
          .order("created_at", { ascending: true });
        if (msgErr) throw msgErr;
        if (!mounted) return;
        const list = (msgs ?? []) as ChatMessageRow[];
        setMessages(list);

        // Load citations for assistant messages
        const assistantIds = list.filter((m) => m.role === "assistant").map((m) => m.id);
        if (assistantIds.length > 0) {
          await loadCitationsForMessages(assistantIds);
        }
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message ?? "오류가 발생했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`chat_session_${session.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${session.id}` },
        async (payload) => {
          const newMessage = payload.new as ChatMessageRow;
          if (newMessage.role === "assistant") {
            setMessages((prev) => [...prev, newMessage]);
            setPendingAssistant(false);
            await loadCitationsForMessages([newMessage.id]);
          }
        }
      )
      .subscribe((status) => {
        // Optional: handle status changes
      });
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  async function loadCitationsForMessages(messageIds: UUID[]) {
    if (messageIds.length === 0) return;
    const { data: cites, error: citesErr } = await supabase
      .from("chat_message_citations")
      .select("id,message_id,chunk_id,similarity,start_offset,end_offset,created_at,updated_at")
      .in("message_id", messageIds);
    if (citesErr) {
      console.error(citesErr);
      return;
    }
    const citations = (cites ?? []) as CitationRow[];
    const chunkIds = Array.from(new Set(citations.map((c) => c.chunk_id)));
    let chunks: ChunkRow[] = [];
    if (chunkIds.length > 0) {
      const { data: ch, error: chErr } = await supabase
        .from("document_chunks")
        .select("id,document_id,chunk_index,text,page_number,slide_number,char_start,char_end")
        .in("id", chunkIds);
      if (chErr) {
        console.error(chErr);
      } else {
        chunks = (ch ?? []) as ChunkRow[];
      }
    }
    const chunkMap: Record<UUID, ChunkRow> = Object.fromEntries(chunks.map((c) => [c.id, c]));

    setCitationsByMessage((prev) => {
      const next = { ...prev };
      for (const mid of messageIds) {
        next[mid] = citations
          .filter((c) => c.message_id === mid)
          .map((c) => ({ citation: c, chunk: chunkMap[c.chunk_id] ?? null }));
      }
      return next;
    });
  }

  async function handleSend() {
    if (!session || !userId) return;
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setPendingAssistant(true);
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from("chat_messages")
        .insert({ session_id: session.id, user_id: userId, role: "user", content: text })
        .select("id,session_id,user_id,role,content,created_at,updated_at,tokens_in,tokens_out")
        .single();
      if (insertErr) throw insertErr;
      if (inserted) {
        setMessages((prev) => [...prev, inserted as ChatMessageRow]);
      }
      setInput("");
      // If a backend worker exists, it will insert assistant message and our realtime will pick it up.
      // Otherwise, we keep the pending indicator.
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "메시지 전송 중 오류가 발생했습니다.");
      setPendingAssistant(false);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function onTextareaInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(180, el.scrollHeight)}px`;
  }

  const assistantCitations = (messageId: UUID) => citationsByMessage[messageId] ?? [];

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <div className="mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">문서 대화</h1>
              <p className="text-sm text-muted-foreground line-clamp-1">{document?.title ?? ""}</p>
            </div>
            <div className="hidden sm:block text-xs text-muted-foreground">poiima · RAG Chat</div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={`/documents/${docId}`}
              className={cn(
                "rounded-md border border-transparent bg-muted px-3 py-1.5 text-foreground hover:bg-accent",
              )}
            >
              개요
            </Link>
            <Link
              href={`/documents/${docId}/summary`}
              className="rounded-md border border-transparent bg-muted px-3 py-1.5 hover:bg-accent"
            >
              요약
            </Link>
            <Link
              href={`/documents/${docId}/chat`}
              className="rounded-md border bg-primary px-3 py-1.5 text-primary-foreground"
            >
              대화
            </Link>
            <Link
              href={`/documents/${docId}/quiz`}
              className="rounded-md border border-transparent bg-muted px-3 py-1.5 hover:bg-accent"
            >
              퀴즈
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertTitle>문제를 발견했어요</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <Separator className="mb-4" />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="w-9/12 max-w-[600px] rounded-2xl border border-border bg-card p-4">
                <Skeleton className="mb-2 h-4 w-10/12" />
                <Skeleton className="mb-2 h-4 w-8/12" />
                <Skeleton className="h-4 w-6/12" />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="w-8/12 max-w-[520px] rounded-2xl bg-primary p-4 text-primary-foreground">
                <Skeleton className="mb-2 h-4 w-10/12 bg-primary-foreground/30" />
                <Skeleton className="h-4 w-7/12 bg-primary-foreground/30" />
              </div>
            </div>
            <div className="flex justify-start">
              <div className="w-9/12 max-w-[600px] rounded-2xl border border-border bg-card p-4">
                <Skeleton className="mb-2 h-4 w-9/12" />
                <Skeleton className="mb-2 h-4 w-7/12" />
                <Skeleton className="h-4 w-5/12" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState docId={docId} />
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                citations={m.role === "assistant" ? assistantCitations(m.id) : []}
                onOpenSources={m.role === "assistant" ? () => router.push(`/documents/${docId}/chunks`) : undefined}
              />
            ))}
            {pendingAssistant && (
              <div className="w-full flex justify-start">
                <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  답변을 준비 중이에요…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-4 w-full border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-2 sm:px-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-end gap-2 py-3"
          >
            <div className="flex-1">
              <label htmlFor="chat-input" className="sr-only">
                질문 입력
              </label>
              <textarea
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={onTextareaInput}
                rows={1}
                placeholder="문서에 대해 무엇이든 물어보세요. (Shift+Enter 줄바꿈)"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                disabled={!session || sending}
              />
            </div>
            <button
              type="submit"
              disabled={!session || sending || input.trim().length === 0}
              className={cn(
                "inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors",
                !session || sending || input.trim().length === 0
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:brightness-110"
              )}
            >
              보내기
            </button>
          </form>
          <div className="pb-3 text-[11px] text-muted-foreground">
            참고: 일부 답변은 문서의 관련 구절과 함께 출처가 표시됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ docId }: { docId: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 text-center">
      <div className="mb-2 text-lg font-semibold">문서와 대화를 시작해보세요</div>
      <p className="mx-auto mb-4 max-w-xl text-sm text-muted-foreground">
        문서 내용을 바탕으로 질문하면 poiima가 관련 내용을 찾아 답변해드려요. 필요한 경우 출처와 하이라이트를 함께 제공합니다.
      </p>
      <div className="mx-auto mb-1 grid max-w-xl gap-2 sm:grid-cols-3">
        {[
          "핵심 개념 요약해줘",
          "이 문서의 가설과 결론은?",
          "중요한 수치만 뽑아줘",
        ].map((s, i) => (
          <Link
            key={i}
            href={`/documents/${docId}/summary`}
            className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground hover:bg-accent"
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        또는 <Link href={`/documents/${docId}/chunks`} className="text-primary hover:underline">청크 보기</Link>에서 원문 조각을 탐색하세요.
      </div>
    </div>
  );
}
