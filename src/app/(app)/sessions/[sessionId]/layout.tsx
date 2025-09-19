"use client";

/**
 * CODE INSIGHT
 * This layout wraps all Session detail pages and provides a consistent header,
 * breadcrumb, quick links, and tabbed navigation for: Overview, Live,
 * Transcript, Highlights, Summary, Exports, and Settings. It links to other
 * key app areas (dashboard, sessions list, ingest, integrations, org, help,
 * legal, etc.) and renders child routes below a sticky tabs bar.
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type Props = {
  children: React.ReactNode;
  params: { sessionId: string };
};

function TabLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:text-foreground/90",
        isActive
          ? "text-foreground bg-accent"
          : "text-muted-foreground hover:bg-accent/60"
      )}
    >
      {label}
    </Link>
  );
}

export default function SessionLayout({ children, params }: Props) {
  const pathname = usePathname();
  const base = `/sessions/${params.sessionId}`;

  const tabs = [
    { label: "Overview", href: base },
    { label: "Live", href: `${base}/live` },
    { label: "Transcript", href: `${base}/transcript` },
    { label: "Highlights", href: `${base}/highlights` },
    { label: "Summary", href: `${base}/summary` },
    { label: "Exports", href: `${base}/exports` },
    { label: "Settings", href: `${base}/settings` },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === base) return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(href);
  };

  const shortId = params.sessionId.length > 10 ? `${params.sessionId.slice(0, 10)}…` : params.sessionId;
  const isLive = pathname?.startsWith(`${base}/live`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <span className="text-border">/</span>
              <Link href="/sessions" className="hover:text-foreground">Sessions</Link>
              <span className="text-border">/</span>
              <span className="text-foreground">Session {shortId}</span>
            </nav>

            <div className="hidden md:flex items-center gap-3 text-sm">
              <Link href="/help" className="text-muted-foreground hover:text-foreground">Help</Link>
              <Link href="/ingest" className="text-muted-foreground hover:text-foreground">Ingest</Link>
              <Link href="/integrations" className="text-muted-foreground hover:text-foreground">Integrations</Link>
              <Link href="/org" className="text-muted-foreground hover:text-foreground">Org</Link>
              <Link href="/me" className="text-muted-foreground hover:text-foreground">Me</Link>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight">Session {shortId}</h1>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  isLive ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"
                )}>
                  {isLive ? "Live" : "Idle"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Manage recording, transcript, highlights and exports for this session.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`${base}/live`}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                Go to Live
              </Link>
              <Link
                href={`${base}/upload-highlights`}
                className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Upload Highlights
              </Link>
              <Link
                href={`${base}/exports`}
                className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Exports
              </Link>
            </div>
          </div>

          <div className="mt-3">
            <Alert className="bg-muted/40">
              <AlertTitle className="text-sm">Recording consent reminder</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                Ensure participant consent is recorded before capturing audio. Manage consent in
                <Link href="/consent/new" className="mx-1 underline hover:text-foreground">Consent</Link>
                and review
                <Link href="/legal/privacy" className="mx-1 underline hover:text-foreground">Privacy</Link>
                and
                <Link href="/legal/terms" className="mx-1 underline hover:text-foreground">Terms</Link>.
              </AlertDescription>
            </Alert>
          </div>

          <div className="mt-2 md:hidden">
            <Collapsible>
              <CollapsibleTrigger className="w-full text-left text-sm text-muted-foreground hover:text-foreground">
                Quick links
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="flex flex-wrap gap-2">
                  <Link href="/ingest/upload" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Ingest Upload</Link>
                  <Link href="/integrations/zoom" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Zoom</Link>
                  <Link href="/integrations/zoom/linked" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Zoom Linked</Link>
                  <Link href="/integrations/teams" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Teams</Link>
                  <Link href="/integrations/teams/linked" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Teams Linked</Link>
                  <Link href="/org/members" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Org Members</Link>
                  <Link href="/org/settings" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Org Settings</Link>
                  <Link href="/org/retention" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Retention</Link>
                  <Link href="/org/security" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Security</Link>
                  <Link href="/settings/profile" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Profile</Link>
                  <Link href="/settings/notifications" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Notifications</Link>
                  <Link href="/settings/devices" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Devices</Link>
                  <Link href="/admin" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Admin</Link>
                  <Link href="/admin/metrics" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Metrics</Link>
                  <Link href="/admin/jobs" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Jobs</Link>
                  <Link href="/admin/costs" className="rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent">Costs</Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1 overflow-x-auto py-2" aria-label="Session tabs">
              {tabs.map((t) => (
                <TabLink key={t.href} href={t.href} label={t.label} isActive={isActive(t.href)} />
              ))}
              <div className="mx-2 hidden md:block">
                <Separator orientation="vertical" className="h-6" />
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href={`${base}/upload-highlights`}
                  className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  Upload Highlights
                </Link>
                <Link
                  href={`${base}/exports`}
                  className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  Quick Export
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground md:flex-row md:items-center">
            <p className="order-2 md:order-1">© {new Date().getFullYear()} All rights reserved.</p>
            <div className="order-1 md:order-2 flex flex-wrap gap-3">
              <Link href="/help" className="hover:text-foreground">Help</Link>
              <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/offline" className="hover:text-foreground">Offline</Link>
              <Link href="/integrations" className="hover:text-foreground">Integrations</Link>
              <Link href="/ingest/upload" className="hover:text-foreground">Upload</Link>
              <Link href="/org/settings" className="hover:text-foreground">Org</Link>
              <Link href="/settings/profile" className="hover:text-foreground">Profile</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
