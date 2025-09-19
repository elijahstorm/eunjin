"use client"

/**
 * CODE INSIGHT
 * This page is the Ingestion Hub. It provides users with clear entry points to import sources: Local Upload, Zoom, and Microsoft Teams.
 * It highlights monitoring via /imports, supports drag-and-drop to route to the upload page, shows offline state, and links to consent and help.
 * The page is client-rendered, uses Tailwind for styling, and integrates existing UI components for a sleek, production-ready experience.
 */

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

function SourceCard({
  title,
  description,
  href,
  badge,
  icon,
  accent,
}: {
  title: string
  description: string
  href: string
  badge?: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-colors hover:border-primary/50">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${accent}`}
            aria-hidden
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="truncate text-lg font-semibold leading-tight">{title}</h3>
              {badge ? (
                <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href={href}
                className="inline-flex items-center rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Continue
                <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link
                href="/imports"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View imports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const router = useRouter()
  const [isOnline, setIsOnline] = React.useState<boolean>(true)
  const [dragActive, setDragActive] = React.useState(false)

  React.useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragActive) setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    // We route to upload page where the actual file handling occurs.
    router.push("/ingest/upload?from=drag-drop")
  }

  return (
    <main
      className="relative mx-auto w-full max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Import recordings and transcripts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bring your audio or meeting recordings from your computer, Zoom, or Microsoft Teams. Monitor progress in
              <Link href="/imports" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">Imports</Link>.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/sessions/new"
              className="inline-flex items-center rounded-md bg-secondary px-3.5 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            >
              Start live session
            </Link>
            <Link
              href="/imports"
              className="inline-flex items-center rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View imports
            </Link>
          </div>
        </div>

        {!isOnline && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10 text-destructive-foreground">
            <AlertTitle className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM13 17h-2v-2h2v2zm0-4h-2V8h2v5z"/>
              </svg>
              You are offline
            </AlertTitle>
            <AlertDescription>
              New imports will start when you reconnect. You can still visit
              <Link href="/imports" className="ml-1 font-medium underline underline-offset-4">Imports</Link>
              to review history.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-border bg-muted/40">
          <AlertTitle className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            Recording consent
          </AlertTitle>
          <AlertDescription>
            Ensure participant consent is recorded before processing meeting audio. Manage consent in
            <Link href="/consent" className="mx-1 font-medium underline underline-offset-4">Consent</Link>
            or
            <Link href="/consent/new" className="ml-1 font-medium underline underline-offset-4">Create a new consent</Link>.
          </AlertDescription>
        </Alert>
      </div>

      <section aria-label="Import sources" className="space-y-4">
        <div className={`rounded-xl border ${dragActive ? "border-primary ring-2 ring-primary/30" : "border-border"} bg-card/50 p-4 transition-shadow` }>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Choose an import source</h2>
            <div className="text-xs text-muted-foreground">Tip: Drag and drop files anywhere on this page</div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SourceCard
              title="Local upload"
              description="Upload audio/video files from your device. We’ll transcribe, diarize, and generate summaries."
              href="/ingest/upload"
              badge="Recommended"
              accent="bg-primary/15 text-primary"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 15v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4H3l9-9 9 9h-2zm-7-7.586L6.414 13H9v4h6v-4h2.586L12 7.414z"/>
                </svg>
              }
            />
            <SourceCard
              title="Zoom"
              description="Connect Zoom to import your cloud recordings automatically or pull on demand."
              href="/integrations/zoom"
              accent="bg-blue-500/15 text-blue-600 dark:text-blue-400"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 8a5 5 0 015-5h8a5 5 0 015 5v8a5 5 0 01-5 5H8a5 5 0 01-5-5V8zm15.5 1.5l-3.25 2.166a1 1 0 00-.25.25A1.99 1.99 0 0015 13v2a2 2 0 002 2h1a2 2 0 002-2V10a1 1 0 00-1.5-.866z"/>
                </svg>
              }
            />
            <SourceCard
              title="Microsoft Teams"
              description="Connect Teams to fetch meeting recordings from your organization’s Microsoft 365 account."
              href="/integrations/teams"
              accent="bg-purple-500/15 text-purple-600 dark:text-purple-400"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 7a4 4 0 118 0 4 4 0 01-8 0zM2 10a3 3 0 013-3h3v10H5a3 3 0 01-3-3v-4zm12 2a4 4 0 100 8h5a3 3 0 003-3v-5a4 4 0 10-8 0z"/>
                </svg>
              }
            />
          </div>
        </div>
      </section>

      <section aria-label="Quick tips" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Make the most of your imports</h2>
          <div className="text-sm text-muted-foreground">Swipe to explore</div>
        </div>
        <div className="relative rounded-xl border bg-card p-2">
          <Carousel>
            <CarouselContent>
              <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3 p-2">
                <div className="h-full rounded-lg border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 11H7v-2h6V7l5 5-5 5v-4z"/></svg>
                    </span>
                    Faster turnaround
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload after your meeting to get full transcripts with speaker labels. Track progress in
                    <Link href="/imports" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">Imports</Link>.
                  </p>
                </div>
              </CarouselItem>
              <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3 p-2">
                <div className="h-full rounded-lg border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-secondary/20 text-secondary-foreground">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v2H4V4zm0 5h10v2H4V9zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"/></svg>
                    </span>
                    Highlights to summaries
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use highlights to generate concise summaries. Explore your
                    <Link href="/sessions" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Sessions</Link>
                    and open a session’s Summary tab.
                  </p>
                </div>
              </CarouselItem>
              <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3 p-2">
                <div className="h-full rounded-lg border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 100 10 5 5 0 000-10zm-9 5a9 9 0 1118 0 9 9 0 01-18 0z"/></svg>
                    </span>
                    Compliance ready
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review our
                    <Link href="/legal/privacy" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Privacy</Link>
                    and
                    <Link href="/legal/terms" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Terms</Link>.
                    Manage data retention in
                    <Link href="/org/retention" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">Org Retention</Link>.
                  </p>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="left-1" />
            <CarouselNext className="right-1" />
          </Carousel>
        </div>
      </section>

      <section aria-label="How it works" className="space-y-2">
        <Collapsible defaultOpen>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">How it works</h2>
            <CollapsibleTrigger className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              Toggle
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ol className="mt-3 grid list-decimal gap-4 pl-5 md:grid-cols-3 md:gap-6">
              <li className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                    1
                  </span>
                  Import your source
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use
                  <Link href="/ingest/upload" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Upload</Link>,
                  connect
                  <Link href="/integrations/zoom" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Zoom</Link>
                  or
                  <Link href="/integrations/teams" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Teams</Link>.
                </p>
              </li>
              <li className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                    2
                  </span>
                  Track progress
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monitor processing, diarization, and summaries in
                  <Link href="/imports" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">Imports</Link>.
                </p>
              </li>
              <li className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                    3
                  </span>
                  Review & share
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open your session to review the
                  <Link href="/sessions" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Transcript</Link>,
                  <Link href="/sessions" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Highlights</Link>, and
                  <Link href="/sessions" className="mx-1 font-medium text-primary underline-offset-4 hover:underline">Summary</Link>.
                </p>
              </li>
            </ol>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <Separator />

      <section aria-label="Next steps" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-base font-semibold">Drag & drop to upload</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop audio or video files anywhere on this page. You’ll be routed to the
            <Link href="/ingest/upload" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">Upload</Link>
            flow.
          </p>
          <div className={`mt-4 rounded-lg border-2 border-dashed p-6 text-center ${dragActive ? "border-primary bg-primary/5" : "border-muted"}`}>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M19 15v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4H3l9-9 9 9h-2zm-7-7.586L6.414 13H9v4h6v-4h2.586L12 7.414z"/></svg>
            </div>
            <div className="text-sm">
              {dragActive ? (
                <span className="font-medium text-primary">Release to go to Upload…</span>
              ) : (
                <>
                  <span className="font-medium">Drag files here</span> or
                  <Link href="/ingest/upload" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">browse</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-base font-semibold">Need help?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn about supported formats, integration setup, and troubleshooting in our Help Center.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/help" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
              Open Help Center
            </Link>
            <Link href="/integrations" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
              View all integrations
            </Link>
            <Link href="/dashboard" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
