"use client";

/**
 * CODE INSIGHT
 * This code's use case is a post-OAuth confirmation page for Zoom integration.
 * It confirms a successful link, shows the connected account if present via query params,
 * and provides clear next steps to import Zoom recordings or ingest/upload files.
 * It also offers navigation to related areas (sessions, integrations, help, org settings).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

export default function ZoomLinkedPage() {
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const zoomAccount = searchParams.get("account") || searchParams.get("email") || searchParams.get("user") || null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        if (mounted) {
          setUserEmail(data.user?.email ?? null);
        }
      } catch (e) {
        // fail silently for this UI; not critical
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabaseBrowser]);

  const actions: Array<{
    href: string;
    label: string;
    description: string;
    accent: string;
    icon: JSX.Element;
    external?: boolean;
  }> = [
    {
      href: "/(app)/ingest",
      label: "Ingest Center",
      description: "Start or schedule processing for new recordings.",
      accent: "from-primary/20 via-primary/10 to-transparent",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M12 3v18m9-9H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/(app)/imports",
      label: "View Imports",
      description: "Manage Zoom cloud imports, monitor progress, and resolve issues.",
      accent: "from-chart-2/20 via-chart-2/10 to-transparent",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/(app)/ingest/upload",
      label: "Upload Recording",
      description: "Upload local audio/video for transcription and summary.",
      accent: "from-chart-5/20 via-chart-5/10 to-transparent",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/(app)/sessions/new",
      label: "New Live Session",
      description: "Create a session and capture highlights in real time.",
      accent: "from-secondary/30 via-secondary/10 to-transparent",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 7h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  const secondaryLinks: Array<{ href: string; label: string }>= [
    { href: "/(app)/integrations", label: "Manage integrations" },
    { href: "/(app)/integrations/zoom", label: "Zoom integration settings" },
    { href: "/(app)/integrations/teams", label: "Link Microsoft Teams" },
    { href: "/(app)/sessions", label: "All sessions" },
    { href: "/(app)/dashboard", label: "Dashboard" },
    { href: "/help", label: "Help Center" },
    { href: "/(app)/org/settings", label: "Organization settings" },
    { href: "/(app)/org/retention", label: "Retention policy" },
    { href: "/(app)/org/security", label: "Security & access" },
    { href: "/(app)/consent", label: "Consent records" },
    { href: "/(app)/consent/new", label: "New consent" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card",
          "shadow-sm"
        )}>
          <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
                {/* Zoom-like camera icon */}
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                  <path d="M4 7.5A2.5 2.5 0 016.5 5h6A2.5 2.5 0 0115 7.5v.764l3.553-2.276A1 1 0 0120 6.882v10.236a1 1 0 01-1.447.894L15 15.736V16.5A2.5 2.5 0 0112.5 19h-6A2.5 2.5 0 014 16.5v-9z" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Zoom linked successfully</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your Zoom account is now connected. You can import cloud recordings or process new files immediately.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {loadingUser ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <span className="sr-only">Loading user</span>
                    </div>
                  ) : (
                    userEmail && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                        Signed in as {userEmail}
                      </span>
                    )
                  )}
                  {zoomAccount && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                      Connected Zoom: {zoomAccount}
                    </span>
                  )}
                  <Link
                    href="/(app)/integrations/zoom"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Manage Zoom settings
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <Alert className="mt-6 bg-muted/50">
              <AlertTitle className="flex items-center gap-2 text-foreground">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-emerald-50">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Ready to import
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Imports may take a few minutes depending on media length. You can navigate away—processing continues in the background.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      <section aria-labelledby="next-steps-heading" className="space-y-6">
        <div className="flex items-end justify-between gap-2">
          <h2 id="next-steps-heading" className="text-lg font-medium text-foreground">Next steps</h2>
          <Link href="/(app)/imports" className="text-sm text-primary hover:underline">Go to Imports</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {actions.map((a) => (
            <ActionCard key={a.href} href={a.href} label={a.label} description={a.description} accent={a.accent} icon={a.icon} />
          ))}
        </div>
      </section>

      <Separator className="my-10" />

      <section aria-labelledby="extras-heading" className="space-y-4">
        <h3 id="extras-heading" className="text-base font-medium text-foreground">More places you may need</h3>
        <div className="flex flex-wrap gap-2">
          {secondaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {l.label}
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <Collapsible defaultOpen>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium text-foreground">What happens next?</p>
              <p className="text-sm text-muted-foreground">Understand how imports and processing work after linking Zoom.</p>
            </div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                Details
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="space-y-4 p-4 pt-3 text-sm text-muted-foreground">
              <ul className="list-disc space-y-2 pl-5">
                <li>We fetch Zoom cloud recordings when you visit Imports. You can also trigger ingestion from the Ingest Center.</li>
                <li>Processing includes transcription, diarization, highlights mapping, and summary generation.</li>
                <li>You’ll receive status updates on the Imports page and in each Session’s detail view.</li>
                <li>Manage retention and security in Organization settings. Ensure consent is recorded for participants.</li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link href="/(app)/sessions" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90">View Sessions</Link>
                <Link href="/(app)/consent/new" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted">Create Consent</Link>
                <Link href="/help" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted">Help Center</Link>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <footer className="mt-12">
        <p className="text-xs text-muted-foreground">
          Need to unlink Zoom? Visit
          {" "}
          <Link href="/(app)/integrations/zoom" className="text-primary hover:underline">Zoom Integration</Link>
          {" "}
          or manage all providers in
          {" "}
          <Link href="/(app)/integrations" className="text-primary hover:underline">Integrations</Link>.
        </p>
      </footer>
    </main>
  );
}

function ActionCard(props: {
  href: string;
  label: string;
  description: string;
  accent: string;
  icon: JSX.Element;
}) {
  const { href, label, description, accent, icon } = props;
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md focus:outline-none",
        "ring-0 ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", accent)} />
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background text-foreground ring-1 ring-inset ring-border">
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="relative z-10 mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Open
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden>
          <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </Link>
  );
}
