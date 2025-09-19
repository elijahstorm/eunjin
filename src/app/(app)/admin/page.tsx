"use client";

/**
 * CODE INSIGHT
 * This page renders the Admin Overview (system health) dashboard. It presents live client-side health checks
 * (online status, service worker, performance, Supabase auth) and provides clear navigation into deeper admin
 * sections: metrics, jobs, and costs. This is a client-only page with no direct DB access.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";
import { supabaseBrowser } from "@/utils/supabase/client-browser";

type HealthLevel = "good" | "warn" | "critical" | "unknown";

function levelTone(level: HealthLevel) {
  switch (level) {
    case "good":
      return "bg-primary/10 text-primary ring-1 ring-primary/20";
    case "warn":
      return "bg-accent text-accent-foreground/90 ring-1 ring-accent/40";
    case "critical":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/20";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-border";
  }
}

function StatusBadge({ level, children }: { level: HealthLevel; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
        levelTone(level)
      )}
    >
      {children}
    </span>
  );
}

export default function AdminOverviewPage() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [swSupported, setSwSupported] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [swState, setSwState] = useState<string>("unknown");
  const [heapUsedMB, setHeapUsedMB] = useState<number | null>(null);
  const [heapLimitMB, setHeapLimitMB] = useState<number | null>(null);
  const [eventLoopLagMs, setEventLoopLagMs] = useState<number | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [supabaseLatencyMs, setSupabaseLatencyMs] = useState<number | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Online status listener
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Service worker status
  useEffect(() => {
    const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    setSwSupported(supported);
    let unsub: (() => void) | undefined;
    if (supported) {
      const updateState = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const controller = navigator.serviceWorker.controller;
          setSwActive(!!controller || !!reg);
          const state = controller?.state || (reg ? (reg.active ? "active" : reg.installing ? "installing" : "registered") : "none");
          setSwState(state);
        } catch (e) {
          setSwActive(false);
          setSwState("unknown");
        }
      };
      updateState();
      const onControllerChange = () => updateState();
      const onMessage = () => updateState();
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.addEventListener("message", onMessage);
      unsub = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        navigator.serviceWorker.removeEventListener("message", onMessage);
      };
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Memory & event loop lag sampling
  useEffect(() => {
    let rafId: number | null = null;
    const updateMemory = () => {
      const anyPerf: any = performance as any;
      if (anyPerf && anyPerf.memory) {
        const used = anyPerf.memory.usedJSHeapSize;
        const limit = anyPerf.memory.jsHeapSizeLimit;
        setHeapUsedMB(Math.round((used / 1024 / 1024) * 10) / 10);
        setHeapLimitMB(Math.round((limit / 1024 / 1024) * 10) / 10);
      }
      rafId = requestAnimationFrame(updateMemory);
    };
    rafId = requestAnimationFrame(updateMemory);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const diff = now - last - 1000; // expected interval 1000ms
      last = now;
      setEventLoopLagMs(Math.max(0, Math.round(diff)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Supabase session and latency
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const fetchSession = async () => {
      setSupabaseError(null);
      const started = Date.now();
      const { data, error } = await supabaseBrowser.auth.getSession();
      const latency = Date.now() - started;
      setSupabaseLatencyMs(latency);
      if (error) {
        setSupabaseError(error.message);
        setSupabaseSession(null);
      } else {
        setSupabaseSession(data.session ?? null);
      }
      // quick role check heuristic
      const user = data.session?.user;
      const appMeta = (user?.app_metadata as any) || {};
      const userMeta = (user?.user_metadata as any) || {};
      const roles: string[] = [
        ...(Array.isArray(appMeta.roles) ? appMeta.roles : []),
        ...(Array.isArray(userMeta.roles) ? userMeta.roles : []),
      ];
      const role: string | undefined = appMeta.role || userMeta.role || (roles.length ? roles[0] : undefined);
      setIsAdmin(role === "admin" || roles.includes("admin") || appMeta.is_admin === true || userMeta.is_admin === true);
    };

    fetchSession();

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      const user = session?.user;
      const appMeta = (user?.app_metadata as any) || {};
      const userMeta = (user?.user_metadata as any) || {};
      const roles: string[] = [
        ...(Array.isArray(appMeta.roles) ? appMeta.roles : []),
        ...(Array.isArray(userMeta.roles) ? userMeta.roles : []),
      ];
      const role: string | undefined = appMeta.role || userMeta.role || (roles.length ? roles[0] : undefined);
      setIsAdmin(role === "admin" || roles.includes("admin") || appMeta.is_admin === true || userMeta.is_admin === true);
    });

    cleanup = () => {
      sub?.subscription?.unsubscribe?.();
    };

    return () => cleanup && cleanup();
  }, []);

  const onlineLevel: HealthLevel = isOnline ? "good" : "critical";
  const swLevel: HealthLevel = swSupported ? (swActive ? "good" : "warn") : "unknown";
  const heapLevel: HealthLevel = useMemo(() => {
    if (heapUsedMB == null || heapLimitMB == null) return "unknown";
    const pct = heapLimitMB > 0 ? (heapUsedMB / heapLimitMB) * 100 : 0;
    if (pct < 60) return "good";
    if (pct < 85) return "warn";
    return "critical";
  }, [heapUsedMB, heapLimitMB]);
  const lagLevel: HealthLevel = useMemo(() => {
    if (eventLoopLagMs == null) return "unknown";
    if (eventLoopLagMs < 100) return "good";
    if (eventLoopLagMs < 500) return "warn";
    return "critical";
  }, [eventLoopLagMs]);

  const supabaseLevel: HealthLevel = useMemo(() => {
    if (supabaseError) return "critical";
    if (supabaseLatencyMs == null) return "unknown";
    if (supabaseLatencyMs < 400) return "good";
    if (supabaseLatencyMs < 1500) return "warn";
    return "critical";
  }, [supabaseLatencyMs, supabaseError]);

  const healthSummaryLevel: HealthLevel = useMemo(() => {
    const levels = [onlineLevel, swLevel, heapLevel, lagLevel, supabaseLevel].filter((l) => l !== "unknown");
    if (levels.includes("critical")) return "critical";
    if (levels.includes("warn")) return "warn";
    return levels.length ? "good" : "unknown";
  }, [onlineLevel, swLevel, heapLevel, lagLevel, supabaseLevel]);

  const renderCardLink = useCallback(
    (href: string, title: string, desc: string) => (
      <Link
        href={href}
        className={cn(
          "group block rounded-xl border border-border bg-card p-5 transition",
          "hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    ),
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin Overview</h1>
            <p className="text-sm text-muted-foreground">Real-time system health at a glance. Dive into metrics, jobs, and costs.</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge level={healthSummaryLevel}>
              <span className="inline-block h-2 w-2 rounded-full bg-current" />
              Overall: {healthSummaryLevel === "unknown" ? "Unknown" : healthSummaryLevel === "good" ? "Healthy" : healthSummaryLevel === "warn" ? "Degraded" : "Critical"}
            </StatusBadge>
            {isOnline ? (
              <StatusBadge level="good">Online</StatusBadge>
            ) : (
              <StatusBadge level="critical">Offline</StatusBadge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">Dashboard</Link>
          <span>•</span>
          <Link href="/sessions" className="underline-offset-4 hover:underline">Sessions</Link>
          <span>•</span>
          <Link href="/integrations" className="underline-offset-4 hover:underline">Integrations</Link>
          <span>•</span>
          <Link href="/org" className="underline-offset-4 hover:underline">Organization</Link>
          <span>•</span>
          <Link href="/help" className="underline-offset-4 hover:underline">Help</Link>
          <span>•</span>
          <Link href="/legal/terms" className="underline-offset-4 hover:underline">Terms</Link>
          <span>•</span>
          <Link href="/legal/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
        </div>
      </div>

      {isAdmin === false && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertTitle>Limited access</AlertTitle>
          <AlertDescription>
            Your account does not appear to have admin privileges. If you believe this is an error, contact your organization owner.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {renderCardLink(
          "/admin/metrics",
          "System Metrics",
          "Traffic, ASR latency, queue depth, and success rates across ingestion and summarization."
        )}
        {renderCardLink(
          "/admin/jobs",
          "Background Jobs",
          "Track transcription, diarization, and summarization jobs with retry and error visibility."
        )}
        {renderCardLink(
          "/admin/costs",
          "Costs & Usage",
          "ASR/LLM spend, storage trends, and forecasts with per-organization breakdowns."
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-5">
          <div>
            <h2 className="text-base font-semibold">Live Health Checks</h2>
            <p className="text-xs text-muted-foreground">Client-side indicators for quick triage.</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Network</span>
              <StatusBadge level={onlineLevel}>{isOnline ? "Online" : "Offline"}</StatusBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Browser connectivity status.</p>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Service Worker</span>
              <StatusBadge level={swLevel}>
                {swSupported ? (swActive ? "Active" : "Registered") : "Unsupported"}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">State: {swState}</p>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">JS Heap</span>
              <StatusBadge level={heapLevel}>
                {heapUsedMB == null || heapLimitMB == null ? "N/A" : `${heapUsedMB} / ${heapLimitMB} MB`}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {heapUsedMB == null ? (
                <span className="inline-flex items-center gap-2"><Skeleton className="h-3 w-20" /></span>
              ) : (
                "Current memory usage in this tab."
              )}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Event Loop Lag</span>
              <StatusBadge level={lagLevel}>{eventLoopLagMs == null ? "N/A" : `${eventLoopLagMs} ms`}</StatusBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Lower is better. High lag indicates a busy main thread.</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Supabase Auth</span>
              <StatusBadge level={supabaseLevel}>
                {supabaseError ? "Error" : supabaseLatencyMs == null ? "Checking" : `${supabaseLatencyMs} ms`}
              </StatusBadge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {supabaseError ? (
                <p className="text-destructive">{supabaseError}</p>
              ) : supabaseSession ? (
                <p>Signed in as {supabaseSession.user?.email || "user"}</p>
              ) : (
                <p>Not authenticated</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quick Links</span>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/admin/metrics" className="text-primary underline-offset-4 hover:underline">View metrics</Link>
              </li>
              <li>
                <Link href="/admin/jobs" className="text-primary underline-offset-4 hover:underline">View job queues</Link>
              </li>
              <li>
                <Link href="/admin/costs" className="text-primary underline-offset-4 hover:underline">Analyze costs</Link>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Operations</span>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link href="/imports" className="underline-offset-4 hover:underline">Recent imports</Link>
              </li>
              <li>
                <Link href="/ingest" className="underline-offset-4 hover:underline">Ingest</Link>
              </li>
              <li>
                <Link href="/org/retention" className="underline-offset-4 hover:underline">Retention policy</Link>
              </li>
              <li>
                <Link href="/org/security" className="underline-offset-4 hover:underline">Security settings</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">ASR & Realtime</h3>
          <p className="mt-1 text-xs text-muted-foreground">Monitor transcription latency, error rates, and WebSocket stability.</p>
          <div className="mt-4">
            <Link href="/admin/metrics" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Open Metrics
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Background Jobs</h3>
          <p className="mt-1 text-xs text-muted-foreground">Track summarization, diarization, and storage tasks with retry logic.</p>
          <div className="mt-4">
            <Link href="/admin/jobs" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              View Jobs
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Costs & Usage</h3>
          <p className="mt-1 text-xs text-muted-foreground">Monitor spend across ASR, LLM, and storage to manage budgets.</p>
          <div className="mt-4">
            <Link href="/admin/costs" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Review Costs
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Need something else?</h3>
        <p className="mt-1 text-xs text-muted-foreground">Explore organization settings, session management, or integrations.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/org/settings" className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted">Org Settings</Link>
          <Link href="/sessions" className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted">All Sessions</Link>
          <Link href="/integrations/zoom" className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted">Zoom</Link>
          <Link href="/integrations/teams" className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted">Microsoft Teams</Link>
          <Link href="/settings/profile" className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted">My Profile</Link>
        </div>
      </div>
    </div>
  );
}
