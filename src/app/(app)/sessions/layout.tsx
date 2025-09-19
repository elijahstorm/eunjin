"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a polished, production-ready layout for the Sessions section.
 * It renders a breadcrumb back to /dashboard, global actions (e.g., New Session), and context-aware
 * navigation tabs when viewing an individual session. It wraps all child pages within /sessions,
 * including list, new session, and session detail sub-routes. The layout emphasizes modern styling,
 * accessibility, and frequent linking to other key app sections for smooth navigation.
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const { isSessionContext, sessionId, sectionKey } = React.useMemo(() => {
    const base = "/sessions";
    if (!pathname || !pathname.startsWith(base)) {
      return { isSessionContext: false, sessionId: "", sectionKey: "" };
    }
    const after = pathname.slice(base.length + 1); // remove "/sessions/"
    const segments = after.split("/").filter(Boolean);
    const sid = segments[0] || "";
    const isCtx = sid.length > 0 && sid !== "new";
    const sec = isCtx ? (segments[1] || "") : (sid === "new" ? "new" : "");
    return { isSessionContext: isCtx, sessionId: sid, sectionKey: sec };
  }, [pathname]);

  const sessionBase = isSessionContext ? `/sessions/${sessionId}` : "/sessions";

  const sectionLabel = React.useMemo(() => {
    if (!sectionKey) return "";
    if (sectionKey === "new") return "New";
    return sectionKey
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }, [sectionKey]);

  const tabs = React.useMemo(() => {
    if (!isSessionContext) return [] as { href: string; label: string; active: boolean }[];
    const list = [
      { label: "Overview", href: `${sessionBase}` },
      { label: "Live", href: `${sessionBase}/live` },
      { label: "Transcript", href: `${sessionBase}/transcript` },
      { label: "Highlights", href: `${sessionBase}/highlights` },
      { label: "Upload Highlights", href: `${sessionBase}/upload-highlights` },
      { label: "Summary", href: `${sessionBase}/summary` },
      { label: "Exports", href: `${sessionBase}/exports` },
      { label: "Settings", href: `${sessionBase}/settings` },
    ];
    return list.map((t) => ({
      ...t,
      active:
        pathname === t.href ||
        pathname === `${t.href}/` ||
        (t.href === sessionBase && (pathname === sessionBase || pathname === `${sessionBase}/`)),
    }));
  }, [isSessionContext, pathname, sessionBase]);

  const onSessionsRoot = pathname === "/sessions" || pathname === "/sessions/";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#sessions-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground rounded px-3 py-1">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                <ChevronLeftIcon className="h-4 w-4" />
                Dashboard
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href="/sessions" className={cn("hover:text-foreground transition-colors", pathname?.startsWith("/sessions") ? "text-foreground" : "text-muted-foreground")}>Sessions</Link>
              {isSessionContext && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{shortenId(sessionId)}</span>
                </>
              )}
              {!!sectionLabel && sectionLabel !== "New" && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{sectionLabel}</span>
                </>
              )}
              {sectionLabel === "New" && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">New</span>
                </>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/ingest/upload"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground px-3 py-1.5 text-sm"
              >
                <UploadIcon className="h-4 w-4" />
                Import Recording
              </Link>
              <Link
                href="/integrations"
                className="hidden sm:inline-flex items-center gap-2 rounded-md border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground px-3 py-1.5 text-sm"
              >
                <PlugIcon className="h-4 w-4" />
                Integrations
              </Link>
              <Link
                href="/sessions/new"
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                New Session
              </Link>
            </div>
          </div>

          {isSessionContext && (
            <div className="mt-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {tabs.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={cn(
                      "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                      t.active
                        ? "bg-primary/10 text-foreground border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    aria-current={t.active ? "page" : undefined}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <Separator />
        {!isSessionContext && onSessionsRoot && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Alert className="bg-card border-border">
              <AlertTitle className="font-semibold flex items-center gap-2">
                <InfoIcon className="h-4 w-4 text-primary" />
                Get started with Sessions
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Create a new session or import an existing recording. Ensure consent is recorded and connect integrations.
                Quick links:
                <span className="inline-flex flex-wrap gap-2 pl-2">
                  <Link href="/consent/new" className="underline hover:no-underline">New Consent</Link>
                  <span>•</span>
                  <Link href="/integrations/zoom" className="underline hover:no-underline">Zoom</Link>
                  <span>•</span>
                  <Link href="/integrations/teams" className="underline hover:no-underline">Teams</Link>
                  <span>•</span>
                  <Link href="/ingest" className="underline hover:no-underline">Ingest</Link>
                </span>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      <main id="sessions-content" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-muted-foreground">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/help" className="hover:text-foreground">Help</Link>
              <span>•</span>
              <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
              <span>•</span>
              <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/org/settings" className="hover:text-foreground">Org Settings</Link>
              <span>•</span>
              <Link href="/me" className="hover:text-foreground">My Account</Link>
              <span>•</span>
              <Link href="/settings/profile" className="hover:text-foreground">Profile</Link>
              <span>•</span>
              <Link href="/admin/metrics" className="hover:text-foreground">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function shortenId(id: string) {
  if (!id) return "";
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 16a1 1 0 001-1V9.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3A1 1 0 008.707 10.707L10 9.414V15a1 1 0 001 1z" />
      <path d="M5 19a2 2 0 012-2h10a2 2 0 012 2 1 1 0 002 0 4 4 0 00-4-4H7a4 4 0 00-4 4 1 1 0 002 0z" />
    </svg>
  );
}

function PlugIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 2a1 1 0 011 1v4h8V3a1 1 0 112 0v4a4 4 0 01-4 4h-1v3a4 4 0 11-8 0v-3H9a4 4 0 01-4-4V3a1 1 0 011-1z" />
    </svg>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zM9 8a1 1 0 112 0 1 1 0 01-2 0zm1 3a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}
