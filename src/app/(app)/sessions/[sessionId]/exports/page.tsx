"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an Export Center for a specific session. It enables users to prepare and download Transcript and Summary files (PDF/TXT/DOCX) and to create/manage share links that point to /share/transcript/[shareId] and /share/summary/[shareId].
 * The page intentionally avoids direct database access (no schema provided) and uses client-side storage for persistence where needed. UI provides links to related pages for content preparation and session navigation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";


type ExportTheme = "light" | "dark";
type PageSize = "A4" | "Letter";

type ExportOptions = {
  includeTimestamps: boolean;
  includeSpeakers: boolean;
  theme: ExportTheme;
  pageSize: PageSize;
  lineSpacing: number;
};

type ShareLinkType = "transcript" | "summary";

type ShareLink = {
  id: string;
  type: ShareLinkType;
  createdAt: string;
  expiresAt: string | null; // ISO timestamp or null for never
  options: ExportOptions;
  title: string;
};

const defaultExportOptions: ExportOptions = {
  includeTimestamps: true,
  includeSpeakers: true,
  theme: "light",
  pageSize: "A4",
  lineSpacing: 1.4,
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sanitizeText(text: string, opts: ExportOptions): string {
  let out = text || "";
  if (!opts.includeTimestamps) {
    // Remove typical timestamps like [00:00], [00:00:00], (00:00), 00:00, 00:00:00 at start of lines
    out = out
      .replace(/\[\d{1,2}:\d{2}(?::\d{2})?]/g, "") // [mm:ss] or [hh:mm:ss]
      .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, "") // (mm:ss) or (hh:mm:ss)
      .replace(/(^|\n)\s*\d{1,2}:\d{2}(?::\d{2})?\s*/g, "$1"); // plain at line start
  }
  if (!opts.includeSpeakers) {
    // Remove speaker labels at line starts e.g., "Speaker 1:", "Alice:", "SPEAKER_00:"
    out = out.replace(/(^|\n)\s*[A-Za-z가-힣0-9_\.\- ]{2,20}:\s+/g, "$1");
  }
  return out.trim();
}

function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

function useLocalStorageString(key: string, initial = "") {
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setValue(raw ?? initial);
    } catch {
      setValue(initial);
    }
  }, [key, initial]);
  const setPersisted = useCallback(
    (v: string) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v);
      } catch {}
    },
    [key]
  );
  return [value, setPersisted] as const;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getPageDimensions(size: PageSize): { width: number; height: number } {
  // Dimensions in points (72 points per inch)
  if (size === "Letter") return { width: 612, height: 792 }; // 8.5x11"
  return { width: 595.28, height: 841.89 }; // A4 210x297mm
}

async function generatePDF({
  text,
  title,
  fileName,
  options,
}: {
  text: string;
  title: string;
  fileName: string;
  options: ExportOptions;
}) {
  const content = sanitizeText(text, options);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = getPageDimensions(options.pageSize);
  const margin = 48; // pts
  const lineHeight = 12 * options.lineSpacing; // fontSize * spacing

  let page = pdfDoc.addPage([width, height]);
  if (options.theme === "dark") {
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.1, 0.11, 0.12) });
  }

  // Header
  const headerY = height - margin + 16;
  page.drawText(title, {
    x: margin,
    y: headerY,
    size: 16,
    font: fontBold,
    color: options.theme === "dark" ? rgb(1, 1, 1) : rgb(0.1, 0.1, 0.1),
  });
  const nowText = formatDate(new Date());
  const dateWidth = font.widthOfTextAtSize(nowText, 10);
  page.drawText(nowText, {
    x: width - margin - dateWidth,
    y: headerY,
    size: 10,
    font,
    color: options.theme === "dark" ? rgb(0.9, 0.9, 0.9) : rgb(0.35, 0.35, 0.35),
  });

  // Content
  const contentColor = options.theme === "dark" ? rgb(0.95, 0.95, 0.95) : rgb(0.05, 0.05, 0.05);
  const fontSize = 12;
  const maxWidth = width - margin * 2;

  const paragraphs = content.split(/\n\n+/);
  let cursorY = height - margin - 16 - 16; // below header

  function addPageNumber(p: any, pageIndex: number) {
    const label = `Page ${pageIndex + 1}`;
    const labelWidth = font.widthOfTextAtSize(label, 10);
    p.drawText(label, {
      x: (width - labelWidth) / 2,
      y: margin / 2,
      size: 10,
      font,
      color: options.theme === "dark" ? rgb(0.7, 0.7, 0.7) : rgb(0.45, 0.45, 0.45),
    });
  }

  const pages: any[] = [page];

  function newPage() {
    page = pdfDoc.addPage([width, height]);
    if (options.theme === "dark") {
      page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.1, 0.11, 0.12) });
    }
    pages.push(page);
    cursorY = height - margin;
  }

  function wrapText(textLine: string): string[] {
    const words = textLine.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? current + " " + w : w;
      const widthAtSize = font.widthOfTextAtSize(candidate, fontSize);
      if (widthAtSize <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        // If single word longer than max, hard-break
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let tmp = w;
          while (font.widthOfTextAtSize(tmp, fontSize) > maxWidth && tmp.length > 0) {
            let sliceEnd = tmp.length - 1;
            while (sliceEnd > 1 && font.widthOfTextAtSize(tmp.slice(0, sliceEnd), fontSize) > maxWidth) {
              sliceEnd--;
            }
            lines.push(tmp.slice(0, sliceEnd));
            tmp = tmp.slice(sliceEnd);
          }
          current = tmp;
        } else {
          current = w;
        }
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  for (const para of paragraphs) {
    const lines = para.split(/\n/).flatMap(wrapText);
    for (const line of lines) {
      if (cursorY - lineHeight < margin) {
        addPageNumber(page, pages.length - 1);
        newPage();
      }
      page.drawText(line, {
        x: margin,
        y: cursorY - lineHeight,
        size: fontSize,
        font,
        color: contentColor,
        maxWidth,
      });
      cursorY -= lineHeight;
    }
    // paragraph spacing
    cursorY -= lineHeight * 0.5;
  }

  // footer page numbers
  addPageNumber(page, pages.length - 1);

  const pdfBytes = await pdfDoc.save();
  downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), fileName);
}

async function generateDOCX({
  text,
  title,
  fileName,
  options,
}: {
  text: string;
  title: string;
  fileName: string;
  options: ExportOptions;
}) {
  const content = sanitizeText(text, options);
  const paragraphs = content.split(/\n\n+/);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
          }),
          ...paragraphs.flatMap((p) => {
            const lines = p.split(/\n/);
            return lines.map(
              (line) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: line }),
                  ],
                  spacing: { line: Math.round(options.lineSpacing * 240) }, // 240 = 1 line
                })
            ).concat([new Paragraph({ children: [new TextRun("")] })]);
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, fileName);
}

function generateTXT({ text, fileName, options }: { text: string; fileName: string; options: ExportOptions }) {
  const content = sanitizeText(text, options);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, fileName);
}

export default function Page() {
  const params = useParams();
  const sessionId = String(params?.sessionId ?? "");

  const [transcript, setTranscript] = useLocalStorageString(`session:${sessionId}:transcript`, "");
  const [summary, setSummary] = useLocalStorageString(`session:${sessionId}:summary`, "");

  // Best-effort hydration from possible alternate keys
  useEffect(() => {
    if (!sessionId) return;
    try {
      if (!transcript) {
        const alt = localStorage.getItem(`transcript:${sessionId}`) || localStorage.getItem(`sessions:${sessionId}:transcript`);
        if (alt) setTranscript(alt);
      }
      if (!summary) {
        const alt = localStorage.getItem(`summary:${sessionId}`) || localStorage.getItem(`sessions:${sessionId}:summary`);
        if (alt) setSummary(alt);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const [transcriptOptions, setTranscriptOptions] = useLocalStorageState<ExportOptions>(
    `session:${sessionId}:export:transcript:options`,
    defaultExportOptions
  );
  const [summaryOptions, setSummaryOptions] = useLocalStorageState<ExportOptions>(
    `session:${sessionId}:export:summary:options`,
    { ...defaultExportOptions, includeSpeakers: false }
  );

  const [fileBaseName, setFileBaseName] = useLocalStorageString(
    `session:${sessionId}:export:filename`,
    `session-${sessionId}`
  );

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; message?: string; variant?: "success" | "error" | "info" } | null>(null);

  const showToast = useCallback((t: { title: string; message?: string; variant?: "success" | "error" | "info" }) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const transcriptFileTitle = useMemo(() => `Transcript — Session ${sessionId}`, [sessionId]);
  const summaryFileTitle = useMemo(() => `Summary — Session ${sessionId}`, [sessionId]);

  const transcriptDefaultName = useMemo(() => `${fileBaseName || `session-${sessionId}`}-transcript`, [fileBaseName, sessionId]);
  const summaryDefaultName = useMemo(() => `${fileBaseName || `session-${sessionId}`}-summary`, [fileBaseName, sessionId]);

  const [shares, setShares] = useLocalStorageState<ShareLink[]>(`session:${sessionId}:shares`, []);

  const clipboardPasteInto = async (setter: (v: string) => void) => {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt) {
        setter(txt);
        showToast({ title: "붙여넣기 완료", message: "클립보드의 텍스트를 불러왔습니다.", variant: "success" });
      } else {
        showToast({ title: "클립보드가 비어있습니다", variant: "info" });
      }
    } catch {
      showToast({ title: "붙여넣기 실패", message: "브라우저 권한을 확인하세요.", variant: "error" });
    }
  };

  const createShare = (type: ShareLinkType, options: ExportOptions, title: string, expiresInDays: number | null) => {
    const id = crypto.randomUUID();
    const expiresAt = expiresInDays ? addDays(new Date(), expiresInDays).toISOString() : null;
    const link: ShareLink = { id, type, createdAt: new Date().toISOString(), expiresAt, options, title };
    const next = [link, ...shares];
    setShares(next);
    const url = `${window.location.origin}${type === "transcript" ? "/share/transcript/" : "/share/summary/"}${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    showToast({ title: "공유 링크 생성", message: "클립보드에 복사되었습니다.", variant: "success" });
  };

  const revokeShare = (id: string) => {
    const next = shares.filter((s) => s.id !== id);
    setShares(next);
    showToast({ title: "공유 링크 해제", variant: "info" });
  };

  const isExpired = (s: ShareLink) => (s.expiresAt ? new Date(s.expiresAt).getTime() < Date.now() : false);

  const exportHandler = async (
    docType: "pdf" | "txt" | "docx",
    which: "transcript" | "summary"
  ) => {
    const src = which === "transcript" ? transcript : summary;
    const options = which === "transcript" ? transcriptOptions : summaryOptions;
    const title = which === "transcript" ? transcriptFileTitle : summaryFileTitle;
    const baseName = which === "transcript" ? transcriptDefaultName : summaryDefaultName;

    if (!src || src.trim().length === 0) {
      showToast({ title: "내용이 없습니다", message: `${which === "transcript" ? "전사" : "요약"} 내용을 먼저 준비하세요.`, variant: "error" });
      return;
    }

    try {
      setBusy(`${which}-${docType}`);
      if (docType === "pdf") {
        await generatePDF({ text: src, title, fileName: `${baseName}.pdf`, options });
      } else if (docType === "txt") {
        generateTXT({ text: src, fileName: `${baseName}.txt`, options });
      } else if (docType === "docx") {
        await generateDOCX({ text: src, title, fileName: `${baseName}.docx`, options });
      }
      showToast({ title: "내보내기 완료", message: `${docType.toUpperCase()} 파일을 다운로드했습니다.`, variant: "success" });
    } catch (e) {
      showToast({ title: "내보내기 실패", message: "파일 생성 중 오류가 발생했습니다.", variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  const OptionRow: React.FC<{
    label: string;
    children: React.ReactNode;
  }> = ({ label, children }) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id?: string }> = ({ checked, onChange, id }) => (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "h-6 w-10 rounded-full border transition-colors",
        checked ? "bg-primary border-primary" : "bg-muted border-border"
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "block h-5 w-5 rounded-full bg-background shadow transform transition-transform m-0.5",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );

  const Select: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    id?: string;
  }> = ({ value, onChange, options, id }) => (
    <select
      id={id}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const NumberInput: React.FC<{ value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }> = ({ value, onChange, min = 1.0, max = 2.0, step = 0.1 }) => (
    <input
      type="number"
      className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      {toast && (
        <div
          className={cn(
            "fixed right-6 top-20 z-50 min-w-[280px] rounded-md border p-4 shadow-lg",
            toast.variant === "success" && "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200",
            toast.variant === "error" && "bg-destructive/10 border-destructive text-destructive-foreground",
            toast.variant === "info" && "bg-primary/10 border-primary text-primary"
          )}
        >
          <div className="font-medium">{toast.title}</div>
          {toast.message && <div className="mt-1 text-sm opacity-90">{toast.message}</div>}
        </div>
      )}

      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <ul className="flex flex-wrap items-center gap-2">
          <li>
            <Link className="hover:text-foreground" href="/dashboard" prefetch>
              /dashboard
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link className="hover:text-foreground" href="/sessions" prefetch>
              /sessions
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link className="hover:text-foreground" href={`/sessions/${sessionId}`} prefetch>
              /{sessionId}
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">exports</li>
        </ul>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Export Center</h1>
          <p className="text-sm text-muted-foreground">세션 {sessionId}의 전사 및 요약을 내보내고, 공개 공유 링크를 관리하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/sessions/${sessionId}/transcript`} className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" prefetch>
            전사 보기
          </Link>
          <Link href={`/sessions/${sessionId}/summary`} className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" prefetch>
            요약 보기
          </Link>
          <Link href={`/sessions/${sessionId}/highlights`} className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground" prefetch>
            하이라이트
          </Link>
          <Link href={`/sessions/${sessionId}/settings`} className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground hover:opacity-90" prefetch>
            세션 설정
          </Link>
        </div>
      </div>

      <Alert className="mb-6 bg-card">
        <AlertTitle>내보내기 안내</AlertTitle>
        <AlertDescription>
          - 전사/요약 내용은 이 브라우저에 저장된 텍스트를 기준으로 파일을 생성합니다. 전사 또는 요약이 비어있다면
          <Link href={`/sessions/${sessionId}/transcript`} className="mx-1 underline" prefetch>
            전사 페이지
          </Link>
          또는
          <Link href={`/sessions/${sessionId}/summary`} className="mx-1 underline" prefetch>
            요약 페이지
          </Link>
          에서 내용을 준비하세요. 또한 필요 시 아래 입력창에 직접 붙여넣을 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* Export blocks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Transcript Export */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Transcript 내보내기</h2>
              <p className="text-sm text-muted-foreground">PDF / TXT / DOCX 형식으로 저장합니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clipboardPasteInto(setTranscript)}
                className="rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                클립보드에서 붙여넣기
              </button>
              <Link
                href={`/sessions/${sessionId}/transcript`}
                className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                prefetch
              >
                전사 편집
              </Link>
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-muted-foreground">파일 이름</label>
            <input
              value={fileBaseName}
              onChange={(e) => setFileBaseName(e.target.value)}
              placeholder={`session-${sessionId}`}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-muted-foreground">전사 내용</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="전사 텍스트를 입력하거나 클립보드에서 붙여넣기 하세요."
              rows={10}
              className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">{transcript.length.toLocaleString()} chars</div>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="mb-3 w-full rounded-md bg-muted px-3 py-2 text-left text-sm hover:opacity-90">
                고급 옵션
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-md border border-border p-3">
                <OptionRow label="타임스탬프 포함">
                  <Toggle
                    checked={transcriptOptions.includeTimestamps}
                    onChange={(v) => setTranscriptOptions({ ...transcriptOptions, includeTimestamps: v })}
                  />
                </OptionRow>
                <OptionRow label="화자 라벨 포함">
                  <Toggle
                    checked={transcriptOptions.includeSpeakers}
                    onChange={(v) => setTranscriptOptions({ ...transcriptOptions, includeSpeakers: v })}
                  />
                </OptionRow>
                <OptionRow label="테마">
                  <Select
                    value={transcriptOptions.theme}
                    onChange={(v) => setTranscriptOptions({ ...transcriptOptions, theme: v as ExportTheme })}
                    options={[
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                    ]}
                  />
                </OptionRow>
                <OptionRow label="페이지 크기(PDF)">
                  <Select
                    value={transcriptOptions.pageSize}
                    onChange={(v) => setTranscriptOptions({ ...transcriptOptions, pageSize: v as PageSize })}
                    options={[
                      { value: "A4", label: "A4" },
                      { value: "Letter", label: "Letter" },
                    ]}
                  />
                </OptionRow>
                <OptionRow label="줄 간격">
                  <NumberInput
                    value={transcriptOptions.lineSpacing}
                    onChange={(v) => setTranscriptOptions({ ...transcriptOptions, lineSpacing: Math.min(Math.max(v || 1, 1), 2) })}
                    min={1}
                    max={2}
                    step={0.1}
                  />
                </OptionRow>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              disabled={busy === "transcript-pdf"}
              onClick={() => exportHandler("pdf", "transcript")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy === "transcript-pdf" ? "생성 중..." : "PDF 다운로드"}
            </button>
            <button
              disabled={busy === "transcript-docx"}
              onClick={() => exportHandler("docx", "transcript")}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy === "transcript-docx" ? "생성 중..." : "DOCX 다운로드"}
            </button>
            <button
              disabled={busy === "transcript-txt"}
              onClick={() => exportHandler("txt", "transcript")}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              {busy === "transcript-txt" ? "생성 중..." : "TXT 다운로드"}
            </button>
          </div>
        </section>

        {/* Summary Export */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Summary 내보내기</h2>
              <p className="text-sm text-muted-foreground">핵심 요약을 다양한 형식으로 저장합니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clipboardPasteInto(setSummary)}
                className="rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                클립보드에서 붙여넣기
              </button>
              <Link
                href={`/sessions/${sessionId}/summary`}
                className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                prefetch
              >
                요약 편집
              </Link>
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs text-muted-foreground">요약 내용</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="요약 텍스트를 입력하거나 클립보드에서 붙여넣기 하세요."
              rows={10}
              className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">{summary.length.toLocaleString()} chars</div>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="mb-3 w-full rounded-md bg-muted px-3 py-2 text-left text-sm hover:opacity-90">
                고급 옵션
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-md border border-border p-3">
                <OptionRow label="타임스탬프 포함">
                  <Toggle
                    checked={summaryOptions.includeTimestamps}
                    onChange={(v) => setSummaryOptions({ ...summaryOptions, includeTimestamps: v })}
                  />
                </OptionRow>
                <OptionRow label="화자 라벨 포함">
                  <Toggle
                    checked={summaryOptions.includeSpeakers}
                    onChange={(v) => setSummaryOptions({ ...summaryOptions, includeSpeakers: v })}
                  />
                </OptionRow>
                <OptionRow label="테마">
                  <Select
                    value={summaryOptions.theme}
                    onChange={(v) => setSummaryOptions({ ...summaryOptions, theme: v as ExportTheme })}
                    options={[
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                    ]}
                  />
                </OptionRow>
                <OptionRow label="페이지 크기(PDF)">
                  <Select
                    value={summaryOptions.pageSize}
                    onChange={(v) => setSummaryOptions({ ...summaryOptions, pageSize: v as PageSize })}
                    options={[
                      { value: "A4", label: "A4" },
                      { value: "Letter", label: "Letter" },
                    ]}
                  />
                </OptionRow>
                <OptionRow label="줄 간격">
                  <NumberInput
                    value={summaryOptions.lineSpacing}
                    onChange={(v) => setSummaryOptions({ ...summaryOptions, lineSpacing: Math.min(Math.max(v || 1, 1), 2) })}
                    min={1}
                    max={2}
                    step={0.1}
                  />
                </OptionRow>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              disabled={busy === "summary-pdf"}
              onClick={() => exportHandler("pdf", "summary")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy === "summary-pdf" ? "생성 중..." : "PDF 다운로드"}
            </button>
            <button
              disabled={busy === "summary-docx"}
              onClick={() => exportHandler("docx", "summary")}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy === "summary-docx" ? "생성 중..." : "DOCX 다운로드"}
            </button>
            <button
              disabled={busy === "summary-txt"}
              onClick={() => exportHandler("txt", "summary")}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              {busy === "summary-txt" ? "생성 중..." : "TXT 다운로드"}
            </button>
          </div>
        </section>
      </div>

      <Separator className="my-8" />

      {/* Share Links Management */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">공개 공유 링크</h2>
            <p className="text-sm text-muted-foreground">링크를 생성하여 읽기 전용 공개 페이지로 공유합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => createShare("transcript", transcriptOptions, transcriptFileTitle, 7)}
              className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              전사 링크 생성 (7일)
            </button>
            <button
              onClick={() => createShare("summary", summaryOptions, summaryFileTitle, 7)}
              className="rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:opacity-90"
            >
              요약 링크 생성 (7일)
            </button>
            <button
              onClick={() => createShare("transcript", transcriptOptions, transcriptFileTitle, null)}
              className="rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
            >
              전사 링크 (만료 없음)
            </button>
          </div>
        </div>

        {shares.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            아직 생성된 공유 링크가 없습니다. 위 버튼을 눌러 새 링크를 만들어 보세요.
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((s) => {
              const expired = isExpired(s);
              const link = `${typeof window !== "undefined" ? window.location.origin : ""}${s.type === "transcript" ? "/share/transcript/" : "/share/summary/"}${s.id}`;
              return (
                <div key={s.id} className={cn("flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between", expired && "opacity-60")}>                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs", s.type === "transcript" ? "bg-primary/10 text-primary" : "bg-secondary/20 text-secondary-foreground")}>{s.type}</span>
                      <span className="truncate text-sm font-medium">{s.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      생성: {formatDate(new Date(s.createdAt))} · {s.expiresAt ? `만료: ${formatDate(new Date(s.expiresAt))}` : "만료 없음"}
                      {expired && <span className="ml-2 text-destructive">(만료됨)</span>}
                    </div>
                    <div className="mt-2 truncate text-xs text-muted-foreground">{link}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      열기
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(link).then(() => {
                          showToast({ title: "링크 복사됨", variant: "success" });
                        });
                      }}
                      className="rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      복사
                    </button>
                    <button
                      onClick={() => revokeShare(s.id)}
                      className="rounded-md bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:opacity-90"
                    >
                      해제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          공유 링크는 동작을 위해 서버 구성이 필요할 수 있습니다. 통합 안내는
          <Link href="/src/app/help" className="mx-1 underline" prefetch>
            도움말
          </Link>
          을 참고하세요.
        </div>
      </section>

      <Separator className="my-8" />

      {/* Helpful links */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-medium">다음 단계</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/ingest/upload`} className="rounded-md border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground" prefetch>
            녹음 업로드
          </Link>
          <Link href={`/integrations/zoom`} className="rounded-md border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground" prefetch>
            Zoom 연동
          </Link>
          <Link href={`/integrations/teams`} className="rounded-md border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground" prefetch>
            Teams 연동
          </Link>
          <Link href={`/src/app/legal/privacy`} className="rounded-md border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground" prefetch>
            개인정보 처리방침
          </Link>
          <Link href={`/src/app/legal/terms`} className="rounded-md border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground" prefetch>
            이용약관
          </Link>
          <Link href={`/org/retention`} className="rounded-md border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground" prefetch>
            보존 기간 정책
          </Link>
        </div>
      </section>
    </div>
  );
}
