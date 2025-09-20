"use client";

/**
 * CODE INSIGHT
 * This page renders the LLM-style concise summary for a given session, letting users regenerate a summary
 * based on available transcript and highlights (loaded from client storage for now), edit and version it,
 * then publish a public share link and navigate to exports. It links to related session pages to encourage
 * a full workflow: transcript, highlights, upload-highlights, exports, live, and settings.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Highlight = {
  text: string;
  ts?: number; // seconds
  author?: string;
};

type SummaryVersion = {
  id: string;
  content: string;
  mode: SummaryMode;
  createdAt: number; // epoch ms
};

type SummaryMode = "balanced" | "concise" | "detailed";

type StoredSummary = {
  content: string;
  mode: SummaryMode;
  updatedAt: number;
  versions: SummaryVersion[];
};

function getLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uniqBy<T, K extends string | number | symbol>(arr: T[], getKey: (x: T) => K): T[] {
  const m = new Map<K, T>();
  for (const item of arr) {
    const k = getKey(item);
    if (!m.has(k)) m.set(k, item);
  }
  return [...m.values()];
}

function generateId(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function normalizeText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function sentenceSplit(text: string): string[] {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?<=[.!?。！？]|\n)/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return uniqBy(parts, (x) => x);
}

function topSentencesFromTranscript(transcript: string, anchors: string[], count: number, mode: SummaryMode): string[] {
  const sentences = sentenceSplit(transcript);
  if (sentences.length === 0) return [];

  const weights: number[] = new Array(sentences.length).fill(0);

  const anchorTokens = anchors
    .map((h) => h.toLowerCase())
    .flatMap((h) => h.split(/\s+/g))
    .filter((x) => x.length > 1);

  const importantTokens = [
    "결정", "논의", "합의", "요점", "핵심", "목표", "일정", "범위", "리스크",
    "action", "todo", "plan", "deadline", "owner", "issue", "risk",
  ];

  sentences.forEach((s, i) => {
    const lower = s.toLowerCase();
    for (const t of anchorTokens) if (lower.includes(t)) weights[i] += 3;
    for (const t of importantTokens) if (lower.includes(t)) weights[i] += 2;
    if (s.length < 40) weights[i] += 0.5; // conciseness preference
    if (s.length > 220) weights[i] -= 0.5; // too long
  });

  const indexed = sentences.map((s, i) => ({ s, w: weights[i], i }));
  indexed.sort((a, b) => b.w - a.w || a.i - b.i);

  const pick = mode === "concise" ? Math.max(2, Math.min(3, count)) : mode === "detailed" ? Math.min(8, count + 2) : count;
  return indexed.slice(0, pick).map((x) => x.s);
}

function extractActionItems(transcript: string, highlights: Highlight[], maxItems: number): string[] {
  const keywords = [
    "해야", "진행", "확인", "검토", "정리", "공유", "요청", "논의", "결정", "담당", "전달",
    "준비", "구현", "테스트", "배포", "미팅", "일정", "스펙", "리뷰",
  ];
  const fromHighlights = highlights
    .map((h) => h.text)
    .filter((t) => keywords.some((k) => t.includes(k)));

  const sentences = sentenceSplit(transcript).filter((s) => keywords.some((k) => s.includes(k)));

  const merged = uniqBy([...fromHighlights, ...sentences], (x) => x).slice(0, maxItems);
  return merged;
}

function buildSummary({ transcript, highlights, mode }: { transcript: string; highlights: Highlight[]; mode: SummaryMode }): string {
  const hl = uniqBy(highlights, (h) => normalizeText(h.text))
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
    .map((h) => h.text)
    .filter(Boolean);

  const pickHighlights = mode === "concise" ? 4 : mode === "detailed" ? 8 : 6;
  const keyBullets = hl.slice(0, pickHighlights);

  const anchors = keyBullets.slice(0, 10);
  const contextCount = mode === "concise" ? 2 : mode === "detailed" ? 6 : 4;
  const context = topSentencesFromTranscript(transcript, anchors, contextCount, mode);

  const actions = extractActionItems(transcript, highlights, mode === "detailed" ? 7 : 5);

  const lines: string[] = [];
  lines.push("요약");
  lines.push("");

  if (keyBullets.length > 0) {
    lines.push("핵심 하이라이트:");
    for (const b of keyBullets) lines.push(`• ${b}`);
    lines.push("");
  }

  if (context.length > 0) {
    lines.push("추가 맥락:");
    for (const s of context) lines.push(`• ${s}`);
    lines.push("");
  }

  if (actions.length > 0) {
    lines.push("액션 아이템:");
    for (const a of actions) lines.push(`• ${a}`);
  }

  return lines.join("\n");
}

export default function SessionSummaryPage() {
  const params = useParams();
  const pathname = usePathname();
  const sessionId = String((params as { sessionId?: string }).sessionId || "");

  const baseKey = useMemo(() => (sessionId ? `session:${sessionId}:` : ""), [sessionId]);
  const transcriptKey = baseKey + "transcript";
  const highlightsKey = baseKey + "highlights";
  const summaryKey = baseKey + "summary";
  const shareKey = baseKey + "summaryShareId";

  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<string>("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [mode, setMode] = useState<SummaryMode>("balanced");
  const [versions, setVersions] = useState<SummaryVersion[]>([]);
  const [shareId, setShareId] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const t = getLocal<string>(transcriptKey) || "";
      const h = getLocal<Highlight[]>(highlightsKey) || [];
      const s = getLocal<StoredSummary>(summaryKey);
      const sh = localStorage.getItem(shareKey);

      setTranscript(t);
      setHighlights(Array.isArray(h) ? h : []);

      if (s && typeof s.content === "string") {
        setSummary(s.content);
        setMode(s.mode || "balanced");
        setVersions(Array.isArray(s.versions) ? s.versions : []);
      } else {
        setSummary("");
        setVersions([]);
      }

      setShareId(sh || null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, transcriptKey, highlightsKey, summaryKey, shareKey]);

  const hasData = (transcript && transcript.trim().length > 0) || (highlights && highlights.length > 0);

  const persistSummary = useCallback(
    (content: string, newMode: SummaryMode, addVersion = true) => {
      const now = Date.now();
      const current = (getLocal<StoredSummary>(summaryKey) || { content: "", mode: newMode, updatedAt: now, versions: [] }) as StoredSummary;

      let newVersions = current.versions || [];
      if (addVersion && (current.content || "").trim().length > 0) {
        newVersions = [
          { id: generateId(10), content: current.content, mode: current.mode || newMode, createdAt: now },
          ...newVersions,
        ].slice(0, 30);
      }

      const updated: StoredSummary = { content, mode: newMode, updatedAt: now, versions: newVersions };
      setLocal(summaryKey, updated);
      setSummary(content);
      setMode(newMode);
      setVersions(newVersions);
    },
    [summaryKey]
  );

  const onRegenerate = useCallback(() => {
    if (!hasData) return;
    const content = buildSummary({ transcript, highlights, mode });
    persistSummary(content, mode, true);
    setEditing(false);
  }, [hasData, transcript, highlights, mode, persistSummary]);

  const onPublish = useCallback(() => {
    if (!summary || summary.trim().length === 0) return;
    const id = shareId || generateId(18);
    localStorage.setItem(shareKey, id);
    setShareId(id);
    setJustPublished(true);
    setTimeout(() => setJustPublished(false), 5000);
  }, [shareId, shareKey, summary]);

  const shareLink = useMemo(() => (shareId ? `/share/summary/${shareId}` : null), [shareId]);

  const copyShareLink = useCallback(async () => {
    if (!shareLink) return;
    const url = typeof window !== "undefined" ? new URL(shareLink, window.location.origin).toString() : shareLink;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }, [shareLink]);

  const onRestoreVersion = useCallback(
    (v: SummaryVersion) => {
      persistSummary(v.content, v.mode, true);
      setHistoryOpen(false);
    },
    [persistSummary]
  );

  const NavLink: React.FC<{ href: string; label: string; active?: boolean }> = ({ href, label, active }) => (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3">
        <nav className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">대시보드</Link>
          <span className="px-2">/</span>
          <Link href="/sessions" className="hover:text-foreground">세션</Link>
          <span className="px-2">/</span>
          <Link href={`/sessions/${sessionId}`} className="hover:text-foreground">{sessionId}</Link>
          <span className="px-2">/</span>
          <span className="text-foreground">요약</span>
        </nav>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">요약</h1>
            <p className="mt-1 text-sm text-muted-foreground">전사와 하이라이트를 바탕으로 간결한 요약본을 생성하고 공유할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/sessions/${sessionId}/exports`}
              className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              내보내기
            </Link>
            <button
              type="button"
              onClick={onPublish}
              disabled={!summary || summary.trim().length === 0}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              공유 링크 만들기
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <NavLink href={`/sessions/${sessionId}/live`} label="라이브" active={pathname?.endsWith("/live")} />
        <NavLink href={`/sessions/${sessionId}/transcript`} label="전사" active={pathname?.endsWith("/transcript")} />
        <NavLink href={`/sessions/${sessionId}/highlights`} label="하이라이트" active={pathname?.endsWith("/highlights")} />
        <NavLink href={`/sessions/${sessionId}/upload-highlights`} label="하이라이트 업로드" active={pathname?.endsWith("/upload-highlights")} />
        <NavLink href={`/sessions/${sessionId}/summary`} label="요약" active={pathname?.endsWith("/summary")} />
        <NavLink href={`/sessions/${sessionId}/exports`} label="내보내기" active={pathname?.endsWith("/exports")} />
        <NavLink href={`/sessions/${sessionId}/settings`} label="설정" active={pathname?.endsWith("/settings")} />
      </div>

      {justPublished && shareLink && (
        <Alert className="border-primary/30 bg-primary/10">
          <AlertTitle>공유 링크가 생성되었습니다</AlertTitle>
          <AlertDescription className="mt-2 flex flex-wrap items-center gap-2">
            <Link href={shareLink} className="underline underline-offset-4">공개 요약 보기</Link>
            <button
              onClick={copyShareLink}
              className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90"
            >
              링크 복사
            </button>
          </AlertDescription>
        </Alert>
      )}

      {!hasData && (
        <Alert className="border-yellow-500/30 bg-yellow-500/10">
          <AlertTitle>요약을 생성할 데이터가 없습니다</AlertTitle>
          <AlertDescription className="mt-2 space-y-2 text-sm">
            <p>이 세션의 전사 또는 하이라이트가 필요합니다. 아래 페이지에서 데이터를 준비하세요.</p>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90" href={`/sessions/${sessionId}/transcript`}>전사 페이지</Link>
              <Link className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90" href={`/sessions/${sessionId}/highlights`}>하이라이트 페이지</Link>
              <Link className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90" href={`/sessions/${sessionId}/upload-highlights`}>하이라이트 업로드</Link>
              <Link className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90" href="/ingest/upload">녹음 파일 가져오기</Link>
              <Link className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90" href="/integrations/zoom">Zoom 연동</Link>
              <Link className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90" href="/integrations/teams">Teams 연동</Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">요약 본문</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">모드</label>
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as SummaryMode)}
                >
                  <option value="balanced">균형</option>
                  <option value="concise">간결</option>
                  <option value="detailed">자세히</option>
                </select>
                <button
                  onClick={onRegenerate}
                  disabled={!hasData}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  재생성
                </button>
                <button
                  onClick={() => setEditing((v) => !v)}
                  disabled={!summary}
                  className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editing ? "편집 종료" : "편집"}
                </button>
              </div>
            </div>
            <Separator className="my-3" />
            {loading ? (
              <div className="space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-5 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            ) : summary ? (
              editing ? (
                <div className="space-y-3">
                  <textarea
                    className="min-h-[320px] w-full resize-y rounded-md border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => persistSummary(summary, mode, true)}
                      className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        const s = getLocal<StoredSummary>(summaryKey);
                        setSummary(s?.content || "");
                      }}
                      className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:opacity-90"
                    >
                      변경 취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-6">{summary}</div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">요약이 아직 없습니다. 모드를 선택한 후 재생성을 눌러 생성하세요.</div>
            )}
          </div>

          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">버전 기록</h3>
              <CollapsibleTrigger asChild>
                <button className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90">
                  {historyOpen ? "닫기" : "열기"}
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">기록이 없습니다.</div>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()} • {v.mode}</span>
                        <button
                          onClick={() => onRestoreVersion(v)}
                          className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground hover:opacity-90"
                        >
                          복원
                        </button>
                      </div>
                      <Separator className="my-2" />
                      <div className="line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{v.content}</div>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">세션 빠른 이동</h2>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 gap-2">
              <Link className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-accent" href={`/sessions/${sessionId}/live`}>라이브</Link>
              <Link className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-accent" href={`/sessions/${sessionId}/transcript`}>전사</Link>
              <Link className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-accent" href={`/sessions/${sessionId}/highlights`}>하이라이트</Link>
              <Link className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-accent" href={`/sessions/${sessionId}/upload-highlights`}>하이라이트 업로드</Link>
              <Link className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-accent" href={`/sessions/${sessionId}/exports`}>내보내기</Link>
              <Link className="rounded-md bg-muted px-3 py-2 text-sm hover:bg-accent" href={`/sessions/${sessionId}/settings`}>설정</Link>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">공유</h2>
            <Separator className="my-3" />
            {shareLink ? (
              <div className="space-y-2 text-sm">
                <div className="truncate text-muted-foreground">
                  <Link href={shareLink} className="underline underline-offset-4">{shareLink}</Link>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyShareLink} className="rounded-md bg-accent px-3 py-1.5 text-xs text-accent-foreground hover:opacity-90">링크 복사</button>
                  <Link href={shareLink} className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90">공개 페이지 열기</Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">공유 링크가 없습니다. 상단의 "공유 링크 만들기"를 눌러 생성하세요.</div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">워크플로우</h2>
            <Separator className="my-3" />
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>녹음 가져오기: <Link href="/ingest/upload" className="underline">업로드</Link> 또는 <Link href="/integrations/zoom" className="underline">Zoom</Link>/<Link href="/integrations/teams" className="underline">Teams</Link></li>
              <li>전사 확인 및 하이라이트 표시</li>
              <li>요약 재생성 → 편집 → 공유/내보내기</li>
            </ol>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">도움말</h2>
            <Separator className="my-3" />
            <div className="space-y-2 text-sm">
              <Link className="block text-muted-foreground underline" href="/src/app/help">도움말 센터</Link>
              <Link className="block text-muted-foreground underline" href="/src/app/legal/privacy">개인정보 처리방침</Link>
              <Link className="block text-muted-foreground underline" href="/src/app/legal/terms">이용 약관</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
