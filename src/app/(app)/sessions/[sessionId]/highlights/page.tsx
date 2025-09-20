"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a highlights management interface for a given session.
 * It lists live and uploaded highlights, supports local edit/delete, and provides CTAs to
 * Upload Highlights and Build Summary. It avoids server/database calls (no schema provided)
 * and persists temporary edits in localStorage scoped to the session. It links broadly to
 * relevant app pages for smooth navigation.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: { sessionId: string };
}

type HighlightSource = "live" | "uploaded" | "manual";

interface HighlightItem {
  id: string;
  session_id: string;
  at_ms: number; // timestamp in milliseconds relative to session start or absolute media timeline
  note: string;
  source: HighlightSource;
  speaker?: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

const STORAGE_KEY = (sessionId: string) => `session:${sessionId}:highlights`;

function formatMs(ms: number): string {
  if (Number.isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function parseTimestampToMs(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  // Accept HH:MM:SS(.mmm), MM:SS(.mmm), SS(.mmm), or raw milliseconds (ending with ms)
  if (/^\d+ms$/i.test(raw)) {
    const num = parseInt(raw.replace(/ms/i, ""), 10);
    return Number.isFinite(num) ? num : null;
  }
  const parts = raw.split(":").map((p) => p.trim());
  const last = parts[parts.length - 1];
  const secFloat = parseFloat(last);
  if (parts.length === 1) {
    // seconds float
    if (!Number.isFinite(secFloat)) return null;
    return Math.round(secFloat * 1000);
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    const m = parseInt(mm, 10);
    const s = parseFloat(ss);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
    return Math.round((m * 60 + s) * 1000);
  }
  if (parts.length === 3) {
    const [hh, mm, ssStr] = parts;
    const h = parseInt(hh, 10);
    const m = parseInt(mm, 10);
    const s = parseFloat(ssStr);
    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
    return Math.round(((h * 3600) + (m * 60) + s) * 1000);
  }
  return null;
}

export default function Page({ params }: PageProps) {
  const { sessionId } = params;
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | HighlightSource>("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editTime, setEditTime] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newTime, setNewTime] = useState("");
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    setLoading(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY(sessionId));
      if (raw) {
        const parsed = JSON.parse(raw) as HighlightItem[];
        if (Array.isArray(parsed)) {
          setHighlights(parsed);
        }
      }
    } catch {}
    const timer = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(timer);
  }, [sessionId]);

  const persist = (data: HighlightItem[]) => {
    setHighlights(data);
    try {
      localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(data));
    } catch {}
  };

  const filtered = useMemo(() => {
    let list = [...highlights];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((h) =>
        h.note.toLowerCase().includes(q) || (h.speaker || "").toLowerCase().includes(q)
      );
    }
    if (sourceFilter !== "all") {
      list = list.filter((h) => h.source === sourceFilter);
    }
    list.sort((a, b) => (sortAsc ? a.at_ms - b.at_ms : b.at_ms - a.at_ms));
    return list;
  }, [highlights, search, sourceFilter, sortAsc]);

  const beginEdit = (h: HighlightItem) => {
    setEditingId(h.id);
    setEditNote(h.note);
    setEditTime(formatMs(h.at_ms));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote("");
    setEditTime("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const at = editTime ? parseTimestampToMs(editTime) : null;
    if (editTime && at === null) {
      alert("잘못된 타임스탬프 형식입니다. 예: 1:23, 00:01:23.450, 75.2, 45200ms");
      return;
    }
    persist(
      highlights.map((h) =>
        h.id === editingId
          ? {
              ...h,
              note: editNote.trim(),
              at_ms: at ?? h.at_ms,
              updated_at: new Date().toISOString(),
            }
          : h
      )
    );
    cancelEdit();
  };

  const deleteOne = (id: string) => {
    if (!confirm("이 하이라이트를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    persist(highlights.filter((h) => h.id !== id));
  };

  const addNow = () => {
    const nowMs = Date.now() - sessionStartRef.current;
    const item: HighlightItem = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      at_ms: nowMs,
      note: newNote.trim() || "하이라이트",
      source: "live",
      speaker: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    persist([...highlights, item]);
    setNewNote("");
    setNewTime("");
  };

  const addManual = () => {
    const at = newTime ? parseTimestampToMs(newTime) : null;
    if (newTime && at === null) {
      alert("잘못된 타임스탬프 형식입니다. 예: 1:23, 00:01:23.450, 75.2, 45200ms");
      return;
    }
    const item: HighlightItem = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      at_ms: at ?? 0,
      note: newNote.trim() || "하이라이트",
      source: newTime ? "uploaded" : "manual",
      speaker: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    persist([...highlights, item]);
    setNewNote("");
    setNewTime("");
  };

  const copyTimestamp = async (ms: number) => {
    const text = formatMs(ms);
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const hasAny = highlights.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <nav className="text-sm text-muted-foreground flex flex-wrap items-center gap-2" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:text-foreground">대시보드</Link>
            <span>/</span>
            <Link href="/sessions" className="hover:text-foreground">세션</Link>
            <span>/</span>
            <Link href={`/sessions/${sessionId}`} className="hover:text-foreground">{sessionId}</Link>
            <span>/</span>
            <span className="text-foreground">하이라이트</span>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">하이라이트</h1>
          <p className="text-sm text-muted-foreground mt-1">라이브/업로드된 하이라이트를 관리하고 이후 요약 생성에 활용하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sessions/${sessionId}/upload-highlights`}
            className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 border border-border"
          >
            업로드
          </Link>
          <Link
            href={`/sessions/${sessionId}/summary`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            요약 만들기
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/sessions/${sessionId}/live`} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">실시간 캡처</Link>
        <Link href={`/sessions/${sessionId}/transcript`} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">전사 보기</Link>
        <Link href={`/sessions/${sessionId}/exports`} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">내보내기</Link>
        <Link href={`/sessions/${sessionId}/settings`} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">세션 설정</Link>
        <span className="mx-1 text-muted-foreground">•</span>
        <Link href="/integrations/zoom" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">Zoom 연동</Link>
        <Link href="/integrations/teams" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">Teams 연동</Link>
        <span className="mx-1 text-muted-foreground">•</span>
        <Link href="/src/app/help" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">도움말</Link>
      </div>

      <Alert className="bg-card border border-border">
        <AlertTitle className="font-semibold">라이브 하이라이트</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          H 키를 눌러 빠르게 하이라이트를 추가할 수 있습니다. 실시간 캡처 중이라면 타임스탬프는 현재 진행 시간으로 기록됩니다. 업로드된 하이라이트는 업로드 페이지에서 불러올 수 있습니다.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                aria-label="하이라이트 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="메모, 화자 등 검색"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-input p-1 bg-background">
                {["all", "live", "uploaded", "manual"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSourceFilter(s as any)}
                    className={`px-3 py-1.5 text-sm rounded ${
                      sourceFilter === s
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                    aria-pressed={sourceFilter === s}
                  >
                    {s === "all" ? "전체" : s === "live" ? "라이브" : s === "uploaded" ? "업로드" : "수동"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSortAsc((v) => !v)}
                className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
                aria-label="정렬 순서 토글"
                title="정렬 순서 토글"
              >
                {sortAsc ? "오름차순" : "내림차순"}
              </button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-2 md:items-end">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                <div className="md:col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">메모</label>
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="예: 핵심 결정사항, 다음 액션 등"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">타임스탬프</label>
                  <input
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="예: 1:23 또는 00:10:05.200"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addNow}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  지금 표시(H)
                </button>
                <button
                  type="button"
                  onClick={addManual}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted"
                >
                  수동 추가
                </button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">총 {filtered.length}개</div>
            <div className="flex items-center gap-2">
              <Link
                href={`/sessions/${sessionId}/upload-highlights`}
                className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
              >
                파일에서 가져오기
              </Link>
              <Link
                href={`/sessions/${sessionId}/summary`}
                className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/90 border border-border"
              >
                요약에 사용
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <div className="text-lg font-medium">하이라이트가 없습니다</div>
              <p className="mt-1 text-sm text-muted-foreground">실시간으로 표시하거나 파일을 업로드하여 하이라이트를 추가하세요.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={`/sessions/${sessionId}/live`}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  실시간으로 표시하기
                </Link>
                <Link
                  href={`/sessions/${sessionId}/upload-highlights`}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted"
                >
                  하이라이트 업로드
                </Link>
                <Link
                  href={`/ingest/upload`}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted"
                >
                  녹음 업로드
                </Link>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                요약 생성은 <Link href={`/sessions/${sessionId}/summary`} className="underline underline-offset-4 hover:text-foreground">요약 페이지</Link>에서 진행하세요.
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((h) => (
                <li key={h.id} className="rounded-lg border border-border bg-card p-3 md:p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => copyTimestamp(h.at_ms)}
                        title="타임스탬프 복사"
                        className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-mono text-accent-foreground hover:bg-accent/80 border border-border"
                      >
                        {formatMs(h.at_ms)}
                      </button>
                      <div className="min-w-0">
                        {editingId === h.id ? (
                          <div className="space-y-2">
                            <input
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              />
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm md:text-base font-medium break-words">{h.note || "(메모 없음)"}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {h.speaker ? <span>화자: {h.speaker}</span> : null}
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-chart-3" />
                                {h.source === "live" ? "라이브" : h.source === "uploaded" ? "업로드" : "수동"}
                              </span>
                              <span>추가: {new Date(h.created_at).toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId !== h.id && (
                        <button
                          type="button"
                          onClick={() => beginEdit(h)}
                          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
                        >
                          편집
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteOne(h.id)}
                        className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4 bg-card">
          <div className="font-medium">요약으로 보내기</div>
          <p className="text-sm text-muted-foreground mt-1">하이라이트를 기반으로 간추린 요약을 생성합니다. 세부 설정은 요약 페이지에서 지정할 수 있습니다.</p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/sessions/${sessionId}/summary`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              요약 만들기
            </Link>
            {hasAny ? (
              <span className="text-xs text-muted-foreground self-center">현재 {highlights.length}개의 하이라이트가 있습니다.</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-border p-4 bg-card">
          <div className="font-medium">관련 설정 및 보안</div>
          <div className="text-sm text-muted-foreground mt-1">
            보존 기간을 설정하거나 조직 정책을 관리하세요. 통합을 연결하면 회의 녹음을 자동으로 가져올 수 있습니다.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/org/retention" className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">보존 정책</Link>
            <Link href="/org/security" className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">보안 설정</Link>
            <Link href="/consent/new" className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">녹음 동의 수집</Link>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        더 많은 기능은 <Link href="/integrations/zoom" className="underline underline-offset-4 hover:text-foreground">Zoom</Link> / <Link href="/integrations/teams" className="underline underline-offset-4 hover:text-foreground">Teams</Link> 연동 및 <Link href={`/sessions/${sessionId}/transcript`} className="underline underline-offset-4 hover:text-foreground">전사</Link> 페이지에서 확인하세요.
      </div>

      <KeybindH onTrigger={addNow} />
    </div>
  );
}

function KeybindH({ onTrigger }: { onTrigger: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onTrigger();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTrigger]);
  return null;
}
