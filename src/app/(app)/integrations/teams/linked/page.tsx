"use client";

/**
 * CODE INSIGHT
 * This code's use case is the post-OAuth success page for Microsoft Teams integration.
 * It confirms a successful link, shows contextual linked-account details from query params,
 * and guides users to next steps like configuring ingest and viewing imports. It intentionally
 * performs no database calls and relies solely on client-side UX with links into the app.
 */

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let width = (c.width = c.offsetWidth);
    let height = (c.height = c.offsetHeight);

    const onResize = () => {
      width = c.width = c.offsetWidth;
      height = c.height = c.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    type Piece = { x: number; y: number; r: number; c: string; vx: number; vy: number; rot: number; vr: number; shape: "rect" | "circ" | "tri" };
    const colors = [
      "#16a34a", // green-600
      "#2563eb", // blue-600
      "#9333ea", // purple-600
      "#f59e0b", // amber-500
      "#ef4444", // red-500
    ];
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    const pieces: Piece[] = Array.from({ length: 120 }).map(() => ({
      x: rand(0, width),
      y: rand(-height * 0.2, -40),
      r: rand(4, 10),
      c: colors[Math.floor(rand(0, colors.length))],
      vx: rand(-0.6, 0.6),
      vy: rand(1.2, 2.2),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.1, 0.1),
      shape: ["rect", "circ", "tri"][Math.floor(rand(0, 3))] as Piece["shape"],
    }));

    let start = performance.now();
    const duration = 2600; // ms

    const draw = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, width, height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > height + 20) {
          p.y = rand(-height * 0.2, -20);
          p.x = rand(0, width);
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        switch (p.shape) {
          case "rect":
            ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2 * (0.6 + Math.abs(Math.sin(p.rot))));
            break;
          case "circ":
            ctx.beginPath();
            ctx.arc(0, 0, p.r, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "tri":
            ctx.beginPath();
            ctx.moveTo(0, -p.r);
            ctx.lineTo(p.r, p.r);
            ctx.lineTo(-p.r, p.r);
            ctx.closePath();
            ctx.fill();
            break;
        }
        ctx.restore();
      });

      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default function TeamsLinkedPage() {
  const params = useSearchParams();
  const teamName = params.get("team") || params.get("tenant") || "Microsoft Teams";
  const email = params.get("email");
  const org = params.get("org") || params.get("organization");
  const scope = params.get("scope");

  const details = useMemo(() => {
    const rows: { label: string; value: string | null }[] = [
      { label: "Organization", value: org },
      { label: "Linked account", value: email },
      { label: "Provider", value: "Microsoft Teams" },
      { label: "Scopes", value: scope },
    ];
    return rows.filter((r) => r.value);
  }, [email, org, scope]);

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <ConfettiCanvas />
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="shrink-0 rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Z" fill="currentColor" fillOpacity="0.08" />
              <path d="M9.5 12.8l1.8 1.8 3.8-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {teamName} linked successfully
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your Microsoft Teams account is now connected. We will import new recordings when available and keep your workspace in sync.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/imports"
                className={cn(
                  "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                )}
              >
                Go to Imports
              </Link>
              <Link
                href="/ingest"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Configure Ingest
              </Link>
              <Link
                href="/sessions/new"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Start a Live Session
              </Link>
            </div>
          </div>
        </div>

        <Alert className="mt-6">
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            If this link wasn’t initiated by you, unlink immediately from Integrations and rotate credentials.
            Manage at <Link href="/integrations" className="underline underline-offset-4 hover:text-foreground">Settings → Integrations</Link>.
          </AlertDescription>
        </Alert>

        <Separator className="my-8" />

        <section aria-labelledby="next-steps" className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">Step 1</div>
              <h2 id="next-steps" className="text-base font-semibold">Import existing recordings</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Pull past meeting recordings from Teams and process transcripts and highlights.
            </p>
            <div className="mt-4">
              <Link href="/imports" className="text-sm font-medium text-primary hover:underline">Start import →</Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">Step 2</div>
              <h2 className="text-base font-semibold">Enable auto-ingest</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure how and when to capture future meetings and apply consent and retention rules.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Link href="/ingest" className="text-sm font-medium text-primary hover:underline">Configure ingest →</Link>
              <Link href="/consent" className="text-sm text-muted-foreground hover:text-foreground hover:underline">Consent settings</Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">Optional</div>
              <h2 className="text-base font-semibold">Link Zoom as well</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Using multiple platforms? Connect Zoom to consolidate recordings and summaries.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Link href="/integrations/zoom" className="text-sm font-medium text-primary hover:underline">Open Zoom integration →</Link>
              <Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground hover:underline">Manage all</Link>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <Collapsible defaultOpen>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">What happens next?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">We’ll begin syncing metadata and preparing your workspace.</p>
                </div>
                <CollapsibleTrigger className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                  Toggle
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Validate connection and permissions with Microsoft Graph.</li>
                  <li>Queue imports for recent recordings. Track progress in <Link href="/imports" className="underline underline-offset-4">Imports</Link>.</li>
                  <li>Completed items will show transcripts, highlights, and summaries in each session.</li>
                  <li>Adjust retention at <Link href="/org/retention" className="underline underline-offset-4">Org → Retention</Link> and security at <Link href="/org/security" className="underline underline-offset-4">Org → Security</Link>.</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
            <Separator className="my-6" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold">Jump back to dashboard</h4>
                <p className="mt-1 text-sm text-muted-foreground">Overview of sessions, imports, and usage.</p>
                <div className="mt-3">
                  <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">Go to Dashboard →</Link>
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold">Upload audio files</h4>
                <p className="mt-1 text-sm text-muted-foreground">Process a local recording while imports run.</p>
                <div className="mt-3">
                  <Link href="/ingest/upload" className="text-sm font-medium text-primary hover:underline">Upload a file →</Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold">Linked account details</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pulled from the authorization response.</p>
            <dl className="mt-4 space-y-3">
              {details.length === 0 ? (
                <p className="text-sm text-muted-foreground">No additional details provided by the provider.</p>
              ) : (
                details.map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{row.label}</dt>
                    <dd className="truncate text-sm font-medium text-foreground">{row.value}</dd>
                  </div>
                ))
              )}
            </dl>
            <Separator className="my-5" />
            <div className="space-y-3">
              <Link href="/integrations/teams" className="block text-sm font-medium text-primary hover:underline">View Teams integration</Link>
              <Link href="/integrations" className="block text-sm text-muted-foreground hover:text-foreground hover:underline">Manage all integrations</Link>
              <Link href="/help" className="block text-sm text-muted-foreground hover:text-foreground hover:underline">Need help?</Link>
              <Link href="/legal/privacy" className="block text-sm text-muted-foreground hover:text-foreground hover:underline">Privacy Policy</Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
