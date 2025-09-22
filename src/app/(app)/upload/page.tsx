"use client";

/**
 * CODE INSIGHT
 * This code's use case is the protected Upload workspace page that allows users to upload study documents
 * (PDF/DOCX/PPTX/TXT/JPG/PNG) up to 20MB with validation, progress UI, and cancel interaction. It persists
 * uploads to Supabase Storage and records metadata in the documents table, while also showing a recent
 * uploads list with statuses. It links back to the dashboard, to the documents index, and to each document's
 * detail page when available.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type UploadStatus =
  | "queued"
  | "validating"
  | "uploading"
  | "creating"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number; // 0-100
  error?: string;
  storagePath?: string;
  documentId?: string;
  canceled?: boolean;
};

type RecentDoc = {
  id: string;
  title: string;
  original_filename: string;
  status: string | null;
  created_at: string;
  file_type: string;
};

const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const STORAGE_BUCKET = "documents"; // existing storage bucket for user document uploads

const ACCEPTED_EXT = ["pdf", "docx", "pptx", "txt", "jpg", "jpeg", "png"] as const;
const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
];

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

function isAcceptedFile(file: File): boolean {
  const ext = getExt(file.name);
  if (ACCEPTED_EXT.includes(ext as any)) return true;
  if (ACCEPTED_MIME.includes(file.type)) return true;
  return false;
}

function mapFileTypeEnum(file: File): string {
  const ext = getExt(file.name);
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "pptx":
      return "pptx";
    case "txt":
      return "txt";
    case "jpg":
    case "jpeg":
      return "jpg";
    case "png":
      return "png";
    default:
      // Fallback by mime
      if (file.type === "application/pdf") return "pdf";
      if (file.type === "text/plain") return "txt";
      if (file.type === "image/png") return "png";
      if (file.type === "image/jpeg") return "jpg";
      return ext || "txt";
  }
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let n = bytes;
  while (n >= 1024 && idx < units.length - 1) {
    n /= 1024;
    idx++;
  }
  return `${n.toFixed(n >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function UploadPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [recent, setRecent] = useState<RecentDoc[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);

  // Session
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (!mounted) return;
      if (error || !data.user) {
        setUserId(null);
      } else {
        setUserId(data.user.id);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Recent uploads fetcher + polling
  useEffect(() => {
    let timer: any;
    let mounted = true;
    async function fetchRecent() {
      if (!userId) return;
      setRecentLoading((prev) => (prev && !recent ? true : prev));
      const { data, error } = await supabaseBrowser
        .from("documents")
        .select("id,title,original_filename,status,created_at,file_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!mounted) return;
      if (error) {
        // do not spam errors
        setRecent((prev) => prev ?? []);
        setRecentLoading(false);
      } else {
        setRecent(data as unknown as RecentDoc[]);
        setRecentLoading(false);
      }
    }
    if (userId) {
      fetchRecent();
      timer = setInterval(fetchRecent, 6000);
    }
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const acceptAttr = useMemo(() => {
    return [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "image/jpeg",
      "image/png",
      ".pdf",
      ".docx",
      ".pptx",
      ".txt",
      ".jpg",
      ".jpeg",
      ".png",
    ].join(",");
  }, []);

  function addFiles(files: FileList | File[]) {
    setError(null);
    const next: UploadItem[] = [];
    const existingNames = new Set(items.map((i) => `${i.file.name}-${i.file.size}`));
    for (const f of Array.from(files)) {
      if (existingNames.has(`${f.name}-${f.size}`)) continue;
      const id = crypto.randomUUID();
      next.push({ id, file: f, status: "queued", progress: 0 });
    }
    if (next.length === 0) {
      setInfo("이미 선택된 파일입니다.");
      setTimeout(() => setInfo(null), 3000);
      return;
    }
    setItems((prev) => [...next, ...prev]);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    addFiles(e.target.files);
    // reset input value to allow re-selecting same files
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length) addFiles(files);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function cancelItem(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, canceled: true, status: i.status === "uploading" ? "canceled" : "canceled" } : i))
    );
  }

  async function startUpload() {
    if (!userId) {
      setError("로그인이 필요합니다. 다시 로그인 후 시도해 주세요.");
      return;
    }
    if (items.length === 0) return;
    setIsUploading(true);
    setError(null);
    setInfo(null);

    // Validate first
    setItems((prev) =>
      prev.map((i) => {
        if (i.status !== "queued") return i;
        return { ...i, status: "validating" };
      })
    );

    // Run uploads with small concurrency
    const queue = items
      .map((i) => i.id)
      .filter((id) => {
        const it = items.find((x) => x.id === id)!;
        return it.status === "queued" || it.status === "validating";
      });

    const CONCURRENCY = 3;
    let idx = 0;

    async function worker() {
      while (idx < queue.length) {
        const curIndex = idx++;
        const id = queue[curIndex];
        const item = items.find((x) => x.id === id);
        if (!item) continue;
        if (item.canceled) {
          setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "canceled" } : p)));
          continue;
        }
        const file = item.file;
        // Validation
        if (!isAcceptedFile(file)) {
          setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: "지원하지 않는 형식입니다." } : p)));
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: `파일이 너무 큽니다. 최대 ${MAX_FILE_MB}MB` } : p)));
          continue;
        }

        // Upload with simulated progress
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "uploading", progress: 0 } : p)));

        const ext = getExt(file.name) || mapFileTypeEnum(file);
        const safeName = file.name.replace(/[^\w\-.]+/g, "_");
        const path = `${userId}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

        let simProgress = 0;
        let tick: any = null;
        try {
          tick = setInterval(() => {
            simProgress = Math.min(90, simProgress + Math.random() * 10);
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, progress: Math.floor(simProgress) } : p)));
          }, 300);

          if (item.canceled) {
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "canceled" } : p)));
            if (tick) clearInterval(tick);
            continue;
          }

          const { error: upErr } = await supabaseBrowser.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
              upsert: false,
              contentType: file.type || undefined,
            });

          if (upErr) {
            if (tick) clearInterval(tick);
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: upErr.message, progress: 0 } : p)));
            continue;
          }

          // Uploaded successfully
          if (tick) clearInterval(tick);
          setItems((prev) => prev.map((p) => (p.id === id ? { ...p, progress: 95 } : p)));

          // Create document record
          setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "creating" } : p)));
          const { data: insertData, error: insertErr } = await supabaseBrowser
            .from("documents")
            .insert({
              user_id: userId,
              title: file.name.replace(/\.[^.]+$/, ""),
              original_filename: file.name,
              file_type: mapFileTypeEnum(file),
              mime_type: file.type || inferMimeTypeByExt(ext),
              file_size_bytes: file.size,
              storage_bucket: STORAGE_BUCKET,
              storage_path: path,
            })
            .select("id")
            .single();

          if (insertErr) {
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: insertErr.message } : p)));
            continue;
          }

          setItems((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, status: "completed", progress: 100, storagePath: path, documentId: insertData?.id }
                : p
            )
          );

          // Nudge recent list
          setTimeout(async () => {
            const { data } = await supabaseBrowser
              .from("documents")
              .select("id,title,original_filename,status,created_at,file_type")
              .eq("id", insertData!.id)
              .single();
            if (data) setRecent((prev) => (prev ? [data as RecentDoc, ...prev.filter((d) => d.id !== data.id)].slice(0, 10) : [data as RecentDoc]));
          }, 600);
        } catch (e: any) {
          if (tick) clearInterval(tick);
          setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: "failed", error: e?.message || "업로드 중 오류" } : p)));
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker());
    await Promise.all(workers);
    setIsUploading(false);
  }

  function inferMimeTypeByExt(ext: string): string {
    switch (ext) {
      case "pdf":
        return "application/pdf";
      case "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      case "txt":
        return "text/plain";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      default:
        return "application/octet-stream";
    }
  }

  const queuedCount = items.filter((i) => i.status === "queued" || i.status === "validating").length;
  const uploadingCount = items.filter((i) => i.status === "uploading" || i.status === "creating").length;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">파일 업로드</h1>
          <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, PPTX, TXT, JPG/PNG 파일을 최대 {MAX_FILE_MB}MB까지 업로드할 수 있어요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">← 대시보드</Link>
          <Link href="/documents" className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity">내 문서</Link>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              "relative rounded-lg border-2 border-dashed p-6 sm:p-8 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-border bg-card"
            )}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">📄</div>
              <div>
                <p className="font-medium">파일을 끌어다 놓거나 선택하세요</p>
                <p className="text-xs text-muted-foreground mt-1">지원 형식: PDF, DOCX, PPTX, TXT, JPG, PNG · 최대 {MAX_FILE_MB}MB</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                  파일 선택
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={acceptAttr}
                  multiple
                  onChange={onInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading || items.length === 0 || queuedCount + uploadingCount === 0}
                  onClick={startUpload}
                  className={cn(
                    "inline-flex items-center rounded-md px-3 py-2 text-sm",
                    isUploading || items.length === 0 || queuedCount + uploadingCount === 0
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-secondary text-secondary-foreground hover:opacity-90"
                  )}
                >
                  {isUploading ? "업로드 중..." : "업로드 시작"}
                </button>
                <button
                  type="button"
                  onClick={() => setItems([])}
                  disabled={isUploading || items.length === 0}
                  className={cn(
                    "inline-flex items-center rounded-md border border-border px-3 py-2 text-sm",
                    isUploading || items.length === 0
                      ? "text-muted-foreground cursor-not-allowed"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  선택 초기화
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {!userId && (
              <Alert className="border-destructive/50">
                <AlertTitle>로그인이 필요합니다</AlertTitle>
                <AlertDescription>
                  업로드를 진행하려면 먼저 로그인하세요. 계정이 없으시면 간단히 회원가입할 수 있어요.
                  <div className="mt-2">
                    <Link href="/login" className="underline text-primary">로그인하기</Link>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <Alert className="">
              <AlertTitle>업로드 안내</AlertTitle>
              <AlertDescription>
                업로드 완료 후 문서 파싱과 요약/임베딩 작업이 자동으로 진행됩니다. 문서 상태는 아래 최근 업로드에서 실시간으로 업데이트됩니다.
              </AlertDescription>
            </Alert>
            {error && (
              <Alert className="border-destructive/50">
                <AlertTitle>오류</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert>
                <AlertTitle>알림</AlertTitle>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">선택된 파일</h2>
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">선택된 파일이 없습니다.</div>
            ) : (
              <ul className="space-y-3">
                {items.map((it) => (
                  <li key={it.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{it.file.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{formatBytes(it.file.size)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={it.status} />
                        {it.status === "queued" || it.status === "validating" ? (
                          <button
                            className="text-xs rounded-md border border-border px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                            onClick={() => removeItem(it.id)}
                          >
                            제거
                          </button>
                        ) : null}
                        {it.status === "uploading" || it.status === "creating" ? (
                          <button
                            className="text-xs rounded-md border border-border px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                            onClick={() => cancelItem(it.id)}
                          >
                            취소
                          </button>
                        ) : null}
                        {it.status === "completed" && it.documentId ? (
                          <Link
                            href={`/documents/${it.documentId}`}
                            className="text-xs rounded-md bg-primary px-2 py-1 text-primary-foreground hover:opacity-90"
                          >
                            열기
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            it.status === "failed" || it.status === "canceled" ? "bg-destructive" : "bg-primary"
                          )}
                          style={{ width: `${it.progress}%` }}
                        />
                      </div>
                      {it.error ? (
                        <div className="text-xs text-destructive mt-2">{it.error}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-2">
                          {statusText(it.status)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">최근 업로드</h2>
              <Link href="/documents" className="text-sm underline text-primary">전체 보기</Link>
            </div>
            <div className="mt-4 space-y-3">
              {recentLoading ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : recent && recent.length > 0 ? (
                <ul className="space-y-2">
                  {recent.map((doc) => (
                    <li key={doc.id} className="group rounded-md border border-border p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileTypePill type={doc.file_type} />
                            <Link
                              href={`/documents/${doc.id}`}
                              className="truncate font-medium hover:underline"
                            >
                              {doc.title || doc.original_filename}
                            </Link>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{relativeDate(doc.created_at)}</div>
                        </div>
                        <StatusPill status={doc.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">아직 업로드된 문서가 없습니다.</div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-card p-4 sm:p-5">
            <h3 className="font-medium">Tip</h3>
            <p className="text-sm text-muted-foreground mt-1">업로드 후 문서 세부 페이지에서 요약, 퀴즈, 대화형 QA를 바로 사용할 수 있어요.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function statusText(status: UploadStatus): string {
  switch (status) {
    case "queued":
      return "대기 중";
    case "validating":
      return "유효성 검사 중";
    case "uploading":
      return "업로드 중";
    case "creating":
      return "문서 등록 중";
    case "processing":
      return "처리 중";
    case "completed":
      return "업로드 완료 (처리 중일 수 있어요)";
    case "canceled":
      return "취소됨";
    case "failed":
      return "실패";
    default:
      return "";
  }
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const color =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-600"
      : status === "failed"
      ? "bg-destructive/15 text-destructive"
      : status === "canceled"
      ? "bg-muted text-muted-foreground"
      : status === "uploading" || status === "creating"
      ? "bg-primary/15 text-primary"
      : status === "validating"
      ? "bg-secondary/15 text-secondary-foreground"
      : "bg-muted text-muted-foreground";
  const label = statusText(status);
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", color)}>{label}</span>;
}

function StatusPill({ status }: { status: string | null }) {
  const normalized = (status || "").toLowerCase();
  let cls = "bg-muted text-muted-foreground";
  let label = status || "unknown";
  if (["ready", "completed", "complete", "done"].includes(normalized)) {
    cls = "bg-emerald-500/15 text-emerald-600";
    label = "완료";
  } else if (["processing", "parsed", "embedding", "queued", "uploaded"].includes(normalized)) {
    cls = "bg-primary/15 text-primary";
    label = "처리 중";
  } else if (["failed", "error"].includes(normalized)) {
    cls = "bg-destructive/15 text-destructive";
    label = "실패";
  }
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", cls)}>{label}</span>;
}

function FileTypePill({ type }: { type: string }) {
  const t = (type || "").toLowerCase();
  const map: Record<string, string> = {
    pdf: "PDF",
    docx: "DOCX",
    pptx: "PPTX",
    txt: "TXT",
    jpg: "JPG",
    jpeg: "JPG",
    png: "PNG",
  };
  const label = map[t] || t.toUpperCase() || "FILE";
  return <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">{label}</span>;
}
