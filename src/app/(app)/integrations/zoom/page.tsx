"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Zoom integration page inside the app shell.
 * It handles authenticated state detection via Supabase Auth, provides OAuth connect/disconnect controls,
 * shows current connection status, and offers deep links for next actions like importing recordings or
 * uploading audio after linking. It avoids server/database calls and relies on client state and
 * environment-provided OAuth endpoints, gracefully falling back to in-app routes.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

export default function ZoomIntegrationPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setLoading(false);
    };
    init();

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabaseBrowser]);

  const zoomConnected: boolean = useMemo(() => {
    const u = session?.user;
    if (!u) return false;
    const fromAppMeta = Array.isArray((u as any)?.app_metadata?.providers)
      ? ((u as any).app_metadata.providers as string[]).includes("zoom")
      : false;
    const fromUserMeta = Boolean((u as any)?.user_metadata?.zoom_connected);
    return fromAppMeta || fromUserMeta;
  }, [session]);

  const oauthStartUrl = process.env.NEXT_PUBLIC_ZOOM_OAUTH_URL || "/integrations/zoom/linked".replace("/(app)", "");
  const disconnectUrl = process.env.NEXT_PUBLIC_ZOOM_DISCONNECT_URL || "/integrations/zoom".replace("/(app)", "");

  const handleConnect = () => {
    if (!session) {
      router.push(`/auth/sign-in?next=${encodeURIComponent("/integrations/zoom")}`);
      return;
    }
    window.location.href = oauthStartUrl;
  };

  const handleDisconnect = () => {
    if (!session) {
      router.push(`/auth/sign-in?next=${encodeURIComponent("/integrations/zoom")}`);
      return;
    }
    window.location.href = disconnectUrl;
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <ZoomIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Zoom Integration</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect Zoom to automatically import recordings for transcription, highlights, and summaries.
            </p>
          </div>
        </div>
        {!loading ? (
          <StatusPill connected={zoomConnected} />
        ) : (
          <Skeleton className="h-7 w-28 rounded-full" />
        )}
      </div>

      <Separator className="my-6" />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="text-base font-medium">Connection</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Secure OAuth connection. We never join your meetings; we only fetch your cloud recordings with your consent.
            </p>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-11 w-40" />
                  <Skeleton className="h-5 w-64" />
                </div>
              ) : !session ? (
                <Alert variant="default" className="border border-border bg-muted/50">
                  <AlertTitle className="font-medium">Sign in required</AlertTitle>
                  <AlertDescription className="mt-1 text-sm">
                    To connect Zoom, please sign in. You can create an account or continue with SSO.
                  </AlertDescription>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/auth/sign-in?next=/integrations/zoom"
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Sign in to continue
                    </Link>
                    <Link
                      href="/auth/sign-up?next=/integrations/zoom"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      Create account
                    </Link>
                  </div>
                </Alert>
              ) : zoomConnected ? (
                <div className="space-y-4">
                  <Alert variant="default" className="border border-border bg-primary/10">
                    <AlertTitle className="font-medium flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      Connected to Zoom
                    </AlertTitle>
                    <AlertDescription className="mt-1 text-sm">
                      Your Zoom account is linked. New cloud recordings will be available to import shortly.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/imports")}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Go to Imports
                    </button>
                    <button
                      onClick={() => router.push("/ingest/upload")}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      Upload a recording
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Disconnect Zoom
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert variant="default" className="border border-border bg-muted/50">
                    <AlertTitle className="font-medium">Not connected</AlertTitle>
                    <AlertDescription className="mt-1 text-sm">
                      Connect Zoom to automatically pull your cloud recordings for transcription and AI summaries.
                      Read our <Link href="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleConnect}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Connect Zoom
                    </button>
                    <Link
                      href="/help"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      Need help?
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-base font-medium">What you get</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Automatic import of Zoom cloud recordings</li>
              <li>Accurate transcription with speaker labels and timestamps</li>
              <li>Real-time highlights and post-meeting AI summaries</li>
              <li>Downloadable outputs (TXT, PDF, DOCX) and shareable links</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/sessions/new"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Start a live session
              </Link>
              <Link
                href="/ingest"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Ingest dashboard
              </Link>
              <Link
                href="/imports"
                className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:opacity-90"
              >
                View Imports
              </Link>
            </div>
          </div>

          <Collapsible defaultOpen className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium">Troubleshooting & Tips</h3>
                <p className="mt-1 text-sm text-muted-foreground">Common issues and how to resolve them.</p>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  aria-label="Toggle troubleshooting"
                >
                  Toggle
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent forceMount>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">I connected but don't see recordings.</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>It can take a few minutes for Zoom to finish processing cloud recordings.</li>
                    <li>
                      Go to <Link href="/imports" className="underline underline-offset-2">Imports</Link> and click Refresh. You can also
                      <Link href="/ingest/upload" className="ml-1 underline underline-offset-2">upload files manually</Link>.
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Wrong Zoom account linked.</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Disconnect Zoom here and reconnect with the correct account.</li>
                    <li>Ensure your Zoom plan supports cloud recordings.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Privacy & consent</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>
                      Manage consent templates under {" "}
                      <Link href="/consent" className="underline underline-offset-2">Consent</Link> or {" "}
                      <Link href="/consent/new" className="underline underline-offset-2">create a new record</Link>.
                    </li>
                    <li>
                      Review <Link href="/legal/privacy" className="underline underline-offset-2">Privacy</Link> and {" "}
                      <Link href="/legal/terms" className="underline underline-offset-2">Terms</Link>.
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <aside className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium">Next steps</h3>
            <div className="mt-3 space-y-3 text-sm">
              <Link className={linkBtn()} href="/imports">Open Imports</Link>
              <Link className={linkBtn("secondary")}
                href="/ingest/upload"
              >Upload recording</Link>
              <Link className={linkBtn("outline")} href="/sessions">View sessions</Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium">Organization</h3>
            <div className="mt-3 space-y-3 text-sm">
              <Link className={linkLine()} href="/org/settings">Org settings</Link>
              <Link className={linkLine()} href="/org/retention">Data retention</Link>
              <Link className={linkLine()} href="/org/security">Security</Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium">Other integrations</h3>
            <div className="mt-3 space-y-3 text-sm">
              <Link className={linkLine()} href="/integrations/teams">Microsoft Teams</Link>
              <Link className={linkLine()} href="/integrations/zoom/linked">Zoom (linked view)</Link>
            </div>
          </div>
        </aside>
      </section>

      <Separator className="my-8" />

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <Link href="/help" className="hover:underline">Help Center</Link>
          <span className="text-border">•</span>
          <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
          <span className="text-border">•</span>
          <Link href="/legal/terms" className="hover:underline">Terms</Link>
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-4 w-44" />
          ) : session ? (
            <span>Signed in as {session.user.email}</span>
          ) : (
            <Link href="/auth/sign-in?next=/integrations/zoom" className="hover:underline">Sign in</Link>
          )}
        </div>
      </footer>
    </div>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        connected ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-foreground/30")}></span>
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function linkBtn(variant: "primary" | "secondary" | "outline" = "primary") {
  const base = "block w-full text-center rounded-md px-4 py-2 font-medium transition";
  if (variant === "primary") return cn(base, "bg-primary text-primary-foreground hover:opacity-90");
  if (variant === "secondary") return cn(base, "bg-secondary text-secondary-foreground hover:opacity-90");
  return cn(base, "border border-input bg-background hover:bg-accent hover:text-accent-foreground");
}

function linkLine() {
  return "block rounded-md border border-input bg-background px-4 py-2 hover:bg-accent hover:text-accent-foreground";
}

function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="zgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="40" height="32" rx="8" fill="url(#zgrad)" />
      <path d="M18 18h6a4 4 0 0 1 4 4v8h-6a4 4 0 0 1-4-4v-8z" fill="white" opacity="0.95" />
      <path d="M34 19.5l6 4.5v8l-6-4.5v-8z" fill="white" opacity="0.95" />
    </svg>
  );
}
