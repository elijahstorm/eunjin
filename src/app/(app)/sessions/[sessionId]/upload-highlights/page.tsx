"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an in-browser uploader and parser for user-provided highlight text files or pasted text, with optional transcript input for alignment. It extracts timestamps when present, and if absent, attempts to align highlights against an optional transcript using token-based similarity. The results are previewed and can be saved locally to be picked up by the highlights page. Navigation links guide users back to Highlights and to Summary for the session.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

// Types
type HighlightItem = {
  id: string;
  text: string;
  timestamp: number | null; // seconds
  source: "file" | "paste" | "manual";
  approximate?: boolean; // true if aligned via similarity (no explicit timestamp)
};

type TranscriptSegment = {
  start: number; // seconds
  end?: number | null;
  text: string;
  speaker?: string | null;
};

// Helpers
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function toTimestampString(totalSeconds: number | null): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return hours > 0 ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

function parseTimestampToSeconds(input: string): number | null {
  if (!input) return null;
  const s = input.trim();
  // common patterns: HH:MM:SS(.ms), MM:SS(.ms), [HH:MM:SS], 00:01:23,456, 1:23
  const re = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;
  const m = s.match(re);
  if (!m) return null;
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const minutes = parseInt(m[2] ?? "0", 10);
  const seconds = parseInt(m[3] ?? "0", 10);
  const millis = m[4] ? parseInt(m[4].padEnd(3, "0"), 10) : 0;
  const total = hours * 3600 + minutes * 60 + seconds + millis / 1000;
  return Number.isFinite(total) ? total : null;
}

function extractFirstTimestamp(line: string): { ts: number | null; content: string } {
  const re = /\[?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?\]?/;
  const m = line.match(re);
  if (!m) return { ts: null, content: line.trim() };
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const minutes = parseInt(m[2] ?? "0", 10);
  const seconds = parseInt(m[3] ?? "0", 10);
  const millis = m[4] ? parseInt(m[4].padEnd(3, "0"), 10) : 0;
  const ts = hours * 3600 + minutes * 60 + seconds + millis / 1000;
  const content = (line.slice(0, m.index) + line.slice((m.index ?? 0) + m[0].length))
    .replace(/[\-–—|•·]+/, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { ts, content: content || line.replace(m[0], "").trim() };
}

function parseHighlightsFromText(text: string, source: HighlightItem["source"]): HighlightItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const items: HighlightItem[] = [];
  for (const raw of lines) {
    if (!raw) continue;
    const { ts, content } = extractFirstTimestamp(raw);
    const cleaned = content.trim();
    if (!cleaned) continue;
    items.push({
      id: crypto.randomUUID(),
      text: cleaned,
      timestamp: ts,
      source,
      approximate: false,
    });
  }
  return dedupeHighlights(items);
}

function dedupeHighlights(items: HighlightItem[]): HighlightItem[] {
  const seen = new Set<string>();
  const out: HighlightItem[] = [];
  for (const it of items) {
    const key = `${(it.timestamp ?? -1).toFixed(3)}::${it.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// Transcript parsing supports SRT and simple timestamped lines
function parseTranscriptFromText(text: string): TranscriptSegment[] {
  const lines = text.split(/\r?\n/);
  const segments: TranscriptSegment[] = [];

  // Try SRT pattern first
  // Example: 00:00:01,000 --> 00:00:03,000
  const timeRangeRe = /(\d{2}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{1,3})/;
  let i = 0;
  let matchedSrt = false;
  while (i < lines.length) {
    const maybeIndex = lines[i].trim();
    const maybeTime = lines[i + 1]?.trim() ?? "";
    if (timeRangeRe.test(maybeTime)) {
      matchedSrt = true;
      const t = maybeTime.match(timeRangeRe)!;
      const start = parseInt(t[1], 10) * 3600 + parseInt(t[2], 10) * 60 + parseInt(t[3], 10) + parseInt(t[4].padEnd(3, "0"), 10) / 1000;
      const end = parseInt(t[5], 10) * 3600 + parseInt(t[6], 10) * 60 + parseInt(t[7], 10) + parseInt(t[8].padEnd(3, "0"), 10) / 1000;
      const textLines: string[] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].trim());
        i++;
      }
      segments.push({ start, end, text: textLines.join(" ") });
      // consume empty line
      while (i < lines.length && lines[i].trim() === "") i++;
    } else {
      i++;
    }
  }

  if (matchedSrt) return compactTranscript(segments);

  // Fallback: any line with a timestamp becomes a segment
  for (const raw of lines) {
    const { ts, content } = extractFirstTimestamp(raw);
    if (ts != null && content.trim()) {
      segments.push({ start: ts, end: null, text: content.trim() });
    }
  }
  return compactTranscript(segments);
}

function compactTranscript(segments: TranscriptSegment[]): TranscriptSegment[] {
  // Sort by start and merge trivial contiguous duplicates
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const out: TranscriptSegment[] = [];
  for (const seg of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.start - seg.start) < 0.001 && last.text === seg.text) {
      last.end = seg.end ?? last.end ?? null;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

// Tokenization & similarity
function normalizeText(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function jaccard(setA: Set<string>, setB: Set<string>): number {
  const inter = new Set<string>();
  for (const x of setA) if (setB.has(x)) inter.add(x);
  const union = new Set<string>([...Array.from(setA), ...Array.from(setB)]);
  return union.size === 0 ? 0 : inter.size / union.size;
}

function containment(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  let count = 0;
  for (const t of tokensA) if (setB.has(t)) count++;
  return count / tokensA.length;
}

function bestMatchTimestamp(text: string, segments: TranscriptSegment[]): { ts: number | null; score: number } {
  const tokensA = normalizeText(text);
  if (tokensA.length === 0 || segments.length === 0) return { ts: null, score: 0 };
  let best = { ts: null as number | null, score: 0 };
  for (const seg of segments) {
    const tokensB = normalizeText(seg.text);
    if (tokensB.length === 0) continue;
    const score = containment(tokensA, tokensB) * 0.7 + jaccard(new Set(tokensA), new Set(tokensB)) * 0.3;
    if (score > best.score) best = { ts: seg.start, score };
  }
  return best;
}

// Local storage keys
function lsHighlightsKey(sessionId: string) {
  return `session-highlights-${sessionId}`;
}

// Page Component
export default function UploadHighlightsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || "";

  const [highlightText, setHighlightText] = useState<string>("");
  const [transcriptText, setTranscriptText] = useState<string>("");
  const [parsedHighlights, setParsedHighlights] = useState<HighlightItem[]>([]);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [globalOffset, setGlobalOffset] = useState<number>(0); // seconds, can be negative

  // Read any cached un-imported highlights to prefill
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(lsHighlightsKey(sessionId) + "-staging");
      if (cached) {
        const data = JSON.parse(cached) as { highlightText?: string; transcriptText?: string; offset?: number };
        if (data.highlightText) setHighlightText(data.highlightText);
        if (data.transcriptText) setTranscriptText(data.transcriptText);
        if (typeof data.offset === "number") setGlobalOffset(data.offset);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    try {
      const payload = JSON.stringify({ highlightText, transcriptText, offset: globalOffset });
      window.localStorage.setItem(lsHighlightsKey(sessionId) + "-staging", payload);
    } catch {}
  }, [highlightText, transcriptText, globalOffset, sessionId]);

  const handleFileRead = useCallback(async (file: File, target: "highlights" | "transcript") => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setInfo("");
      setError("파일이 너무 큽니다. 6MB 이하의 텍스트 파일을 업로드해주세요.");
      return;
    }
    try {
      const text = await file.text();
      if (target === "highlights") setHighlightText((prev) => (prev ? prev + "\n" + text : text));
      else setTranscriptText((prev) => (prev ? prev + "\n" + text : text));
      setError("");
      setInfo(`${file.name} 파일을 불러왔습니다.`);
    } catch (e) {
      setInfo("");
      setError("파일을 읽는 중 오류가 발생했습니다.");
    }
  }, []);

  const parseAll = useCallback(() => {
    setProcessing(true);
    setError("");
    try {
      const items = parseHighlightsFromText(highlightText, "paste");
      const segs = transcriptText.trim() ? parseTranscriptFromText(transcriptText) : [];

      // Apply global offset to any existing timestamps
      const offsetItems = items.map((it) => ({
        ...it,
        timestamp: it.timestamp != null ? clamp(it.timestamp + globalOffset, 0, 24 * 3600 * 10) : null,
      }));

      // Align items without timestamps using transcript if available
      const aligned: HighlightItem[] = offsetItems.map((it) => {
        if (it.timestamp == null && segs.length > 0) {
          const { ts, score } = bestMatchTimestamp(it.text, segs);
          if (ts != null && score >= 0.18) {
            return { ...it, timestamp: clamp(ts + globalOffset, 0, 24 * 3600 * 10), approximate: true };
          }
        }
        return it;
      });

      setParsedHighlights(aligned);
      setTranscriptSegments(segs);
      if (segs.length === 0) {
        setInfo("일부 하이라이트는 타임스탬프가 없어 정렬되지 않을 수 있습니다. 전사를 추가하면 자동 정렬 정확도가 높아집니다.");
      } else {
        setInfo(`${aligned.filter((a) => a.timestamp != null).length}개 항목이 타임스탬프와 정렬되었습니다.`);
      }
    } catch (e) {
      setError("텍스트를 파싱하는 중 문제가 발생했습니다. 형식을 확인해주세요.");
    } finally {
      setProcessing(false);
    }
  }, [highlightText, transcriptText, globalOffset]);

  const handleAdjustTime = useCallback((id: string, delta: number) => {
    setParsedHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, timestamp: clamp((h.timestamp ?? 0) + delta, 0, 24 * 3600 * 10) } : h))
    );
  }, []);

  const handleEditTime = useCallback((id: string, tsStr: string) => {
    setParsedHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, timestamp: parseTimestampToSeconds(tsStr) } : h)));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setParsedHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const summaryStats = useMemo(() => {
    const total = parsedHighlights.length;
    const withTs = parsedHighlights.filter((h) => h.timestamp != null).length;
    const approx = parsedHighlights.filter((h) => h.approximate).length;
    return { total, withTs, approx };
  }, [parsedHighlights]);

  const handleSave = useCallback(() => {
    try {
      const toStore = parsedHighlights.map((h) => ({ id: h.id, text: h.text, timestamp: h.timestamp, approximate: !!h.approximate }));
      // Save finalized highlights for this session (client-side staging). The Highlights page should be able to read this.
      window.localStorage.setItem(lsHighlightsKey(sessionId), JSON.stringify(toStore));
      setInfo("하이라이트가 저장되었습니다. 하이라이트 페이지에서 확인할 수 있습니다.");
      router.push(`/sessions/${sessionId}/highlights`);
    } catch (e) {
      setError("저장 중 오류가 발생했습니다. 브라우저 저장소 설정을 확인해주세요.");
    }
  }, [parsedHighlights, router, sessionId]);

  const DropArea: React.FC<{ onFiles: (files: FileList) => void; label: string }> = ({ onFiles, label }) => {
    const [active, setActive] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActive(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    };

    return (
      <div
        ref={ref}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActive(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          active ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40"
        )}
      >
        <div className="text-center">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-xs text-muted-foreground">파일을 여기로 끌어다 놓거나 아래 버튼을 사용하세요</div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">하이라이트 업로드 · 정렬</h1>
          <p className="text-sm text-muted-foreground">세션 #{sessionId} | 텍스트 파일 또는 붙여넣기를 통해 하이라이트를 가져오고, 전사와 정렬하세요.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/sessions/${sessionId}`} className="rounded-md bg-secondary px-3 py-2 text-secondary-foreground hover:opacity-90">세션 개요</Link>
          <Link href={`/sessions/${sessionId}/transcript`} className="rounded-md bg-secondary px-3 py-2 text-secondary-foreground hover:opacity-90">전사 보기</Link>
          <Link href={`/sessions/${sessionId}/highlights`} className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90">하이라이트</Link>
          <Link href={`/sessions/${sessionId}/summary`} className="rounded-md bg-accent px-3 py-2 text-accent-foreground hover:opacity-90">요약</Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTitle>문제가 발생했습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert className="border-border">
          <AlertTitle>알림</AlertTitle>
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-lg border bg-card p-4 md:p-6">
        <h2 className="mb-2 text-lg font-medium">1) 하이라이트 가져오기</h2>
        <p className="mb-4 text-sm text-muted-foreground">타임스탬프가 포함되어 있으면 자동 인식합니다. 예: [00:12:34] 제품 가격 논의, 12:34 제품 가격 논의, 00:12 제품 가격 논의</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <DropArea
              label="하이라이트 .txt/.md/.csv 드롭"
              onFiles={(files) => {
                const file = files[0];
                if (file) handleFileRead(file, "highlights");
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <input
                aria-label="하이라이트 파일 선택"
                type="file"
                accept=".txt,.md,.csv,.srt"
                onChange={(e) => e.target.files && handleFileRead(e.target.files[0], "highlights")}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground file:hover:opacity-90"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="highlightPaste" className="text-sm font-medium">텍스트 붙여넣기</label>
            <textarea
              id="highlightPaste"
              className="min-h-[140px] w-full rounded-md border bg-background p-3 text-sm outline-none ring-0 focus:border-primary"
              placeholder="예: 00:05:12 인사말 시작\n00:12:34 가격 전략 논의\n질문: 차기 로드맵 일정?"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 md:p-6">
        <h2 className="mb-2 text-lg font-medium">2) 전사 추가(선택)</h2>
        <p className="mb-4 text-sm text-muted-foreground">전사를 추가하면 타임스탬프가 없는 하이라이트도 텍스트 유사도로 자동 정렬합니다. SRT 또는 타임스탬프 포함 텍스트를 지원합니다.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <DropArea
              label="전사 .srt/.txt 드롭"
              onFiles={(files) => {
                const file = files[0];
                if (file) handleFileRead(file, "transcript");
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <input
                aria-label="전사 파일 선택"
                type="file"
                accept=".srt,.txt,.md,.csv"
                onChange={(e) => e.target.files && handleFileRead(e.target.files[0], "transcript")}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground file:hover:opacity-90"
              />
          </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="transcriptPaste" className="text-sm font-medium">전사 텍스트 붙여넣기</label>
            <textarea
              id="transcriptPaste"
              className="min-h-[140px] w-full rounded-md border bg-background p-3 text-sm outline-none ring-0 focus:border-primary"
              placeholder={`예: 00:00:12 인사말\n00:12:34 가격 논의 시작\n또는 SRT 형식의 전사.`}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
            />
          </div>
        </div>

        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <button className="text-sm text-muted-foreground underline-offset-4 hover:underline">고급 설정</button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="offset" className="text-sm font-medium">전역 오프셋(초)</label>
              <input
                id="offset"
                type="number"
                step="1"
                value={globalOffset}
                onChange={(e) => setGlobalOffset(parseFloat(e.target.value || "0"))}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">원본 전사 대비 시작점 차이가 있을 때 전체 타임스탬프를 보정합니다. 음수도 가능.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={parseAll}
          disabled={processing || (!highlightText && !transcriptText)}
          className={cn(
            "rounded-md px-4 py-2",
            processing ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {processing ? "처리 중..." : "정렬 실행"}
        </button>
        <Link href={`/sessions/${sessionId}/highlights`} className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground hover:opacity-90">하이라이트 목록으로</Link>
        <Link href={`/sessions/${sessionId}/summary`} className="rounded-md bg-accent px-4 py-2 text-accent-foreground hover:opacity-90">요약 보기</Link>
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">미리보기</h2>
          <div className="text-sm text-muted-foreground">
            총 {summaryStats.total}건 · 타임스탬프 {summaryStats.withTs}건{summaryStats.approx > 0 ? ` · 자동정렬 ${summaryStats.approx}건` : ""}
          </div>
        </div>

        {parsedHighlights.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">하이라이트를 가져오고 "정렬 실행"을 눌러 결과를 확인하세요.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[120px_1fr_120px_80px] items-center gap-0 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div>타임스탬프</div>
              <div>내용</div>
              <div className="text-center">보정</div>
              <div className="text-center">작업</div>
            </div>
            <ul className="divide-y">
              {parsedHighlights.map((h) => (
                <li key={h.id} className="grid grid-cols-[120px_1fr_120px_80px] items-start gap-2 px-3 py-3 hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="타임스탬프"
                      className="w-[110px] rounded-md border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                      placeholder="mm:ss 또는 hh:mm:ss"
                      value={toTimestampString(h.timestamp)}
                      onChange={(e) => handleEditTime(h.id, e.target.value)}
                    />
                  </div>
                  <div className="min-w-0 text-sm leading-relaxed">
                    <div className="line-clamp-4 break-words">{h.text}</div>
                    {h.approximate && (
                      <div className="mt-1 text-xs text-muted-foreground">전사 기반 자동 정렬</div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      title="-5초"
                      onClick={() => handleAdjustTime(h.id, -5)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      -5s
                    </button>
                    <button
                      title="+5초"
                      onClick={() => handleAdjustTime(h.id, +5)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      +5s
                    </button>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => handleRemoveItem(h.id)}
                      className="rounded-md bg-destructive px-3 py-1 text-xs text-destructive-foreground hover:opacity-90"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">저장 시, 하이라이트 페이지에서 이 세션의 하이라이트로 반영됩니다. 요약은 하이라이트를 기준으로 생성됩니다.</div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setParsedHighlights([]);
                setHighlightText("");
                setTranscriptText("");
                setInfo("입력 내용을 초기화했습니다.");
              }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              초기화
            </button>
            <button
              onClick={handleSave}
              disabled={parsedHighlights.length === 0}
              className={cn(
                "rounded-md px-4 py-2",
                parsedHighlights.length === 0 ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              저장하고 하이라이트로 이동
            </button>
          </div>
        </div>
      </section>

      <Separator />

      <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <div className="mb-2 font-medium text-foreground">도움말</div>
        <ul className="list-inside list-disc space-y-1">
          <li>타임스탬프 형식 예: 00:12, 12:34, 01:02:03, [00:01:23], 00:01:23,456</li>
          <li>전사는 SRT 또는 타임스탬프가 포함된 텍스트를 권장합니다.</li>
          <li>타임스탬프가 없는 항목은 전사가 제공된 경우 유사도 기반으로 자동 정렬됩니다.</li>
          <li>정렬 후 하이라이트 탭에서 항목을 추가 편집하거나 삭제할 수 있습니다.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/sessions/${sessionId}/live`} className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">라이브</Link>
          <Link href={`/sessions/${sessionId}/exports`} className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">내보내기</Link>
          <Link href={`/sessions/${sessionId}/settings`} className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">세션 설정</Link>
          <Link href="/dashboard" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">대시보드</Link>
          <Link href="/ingest/upload" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">녹음 업로드</Link>
          <Link href="/integrations/zoom" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">Zoom 연동</Link>
          <Link href="/integrations/teams" className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground hover:opacity-90">Teams 연동</Link>
        </div>
      </section>
    </div>
  );
}
