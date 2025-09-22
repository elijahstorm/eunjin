"use client";

/**
 * CODE INSIGHT
 * This code's use case is a per-document nested layout that augments the main app layout
 * by adding a document-level tab bar (Overview, Summary, Chat, Quiz, Chunks, Settings).
 * It must be lightweight, responsive, and only provide this tab navigation without adding
 * extra headers or sidebars. It also fetches and displays the document title and status for context.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/utils/supabase/client-browser";

type DocumentSummary = {
  id: string;
  title: string;
  status: string | null;
};

export default function DocumentLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const docId = (params?.docId as string) || "";

  const base = useMemo(() => (docId ? `/documents/${docId}` : "/documents"), [docId]);

  const tabs = useMemo(
    () => [
      { key: "overview", label: "개요", href: base },
      { key: "summary", label: "요약", href: `${base}/summary` },
      { key: "chat", label: "채팅", href: `${base}/chat` },
      { key: "quiz", label: "퀴즈", href: `${base}/quiz` },
      { key: "chunks", label: "청크", href: `${base}/chunks` },
      { key: "settings", label: "설정", href: `${base}/settings` },
    ],
    [base]
  );

  const isActive = (href: string, key: string) => {
    if (!pathname) return false;
    if (key === "overview") return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(href);
  };

  const [doc, setDoc] = useState<DocumentSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!docId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabaseBrowser
          .from("documents")
          .select("id,title,status")
          .eq("id", docId)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) setDoc(data ?? null);
      } catch (e) {
        if (!cancelled) setError("문서 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  return (
    <div className="w-full">
      <div className="bg-card text-card-foreground">
        <div className="px-4 md:px-6 pt-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {loading ? (
                  <Skeleton className="h-6 w-40 rounded" />
                ) : (
                  <h1 className="text-base md:text-lg font-semibold truncate" title={doc?.title ?? "문서"}>
                    {doc?.title ?? "문서"}
                  </h1>
                )}
                {!loading && doc?.status ? (
                  <span
                    className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs ring-1 ring-border"
                    title={`상태: ${doc.status}`}
                  >
                    {doc.status}
                  </span>
                ) : null}
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Link
                  href="/documents"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="문서 목록으로 이동"
                >
                  문서
                </Link>
                <span className="text-muted-foreground/40">·</span>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="대시보드로 이동"
                >
                  대시보드
                </Link>
                <span className="text-muted-foreground/40">·</span>
                <Link
                  href="/upload"
                  className="text-sm font-medium text-primary hover:text-primary/90 transition-colors"
                  aria-label="파일 업로드"
                >
                  업로드
                </Link>
              </div>
              <div className="flex sm:hidden items-center gap-2 shrink-0">
                <Link
                  href="/documents"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="문서 목록으로 이동"
                >
                  목록
                </Link>
              </div>
            </div>
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
            <div className="-mb-px overflow-x-auto">
              <div className="flex items-center gap-1">
                {tabs.map((tab) => {
                  const active = isActive(tab.href, tab.key);
                  return (
                    <Link
                      key={tab.key}
                      href={tab.href}
                      role="tab"
                      aria-selected={active}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <Separator className="mt-3" />
      </div>
      <div className="px-4 md:px-6 py-4">{children}</div>
    </div>
  );
}
