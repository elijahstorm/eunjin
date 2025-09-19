"use client";

/**
 * CODE INSIGHT
 * This page renders the Integrations overview for Zoom and Microsoft Teams. It shows a simple
 * connected/disconnected status (persisted in localStorage for client-side UX only), provides
 * actions to connect/manage each provider by linking to their respective pages, and guides users
 * toward importing via /ingest. It intentionally avoids database calls (no schema provided) and
 * focuses on production-ready UI and navigation.
 */

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

type IntegrationKey = "zoom" | "teams";

const STORAGE_KEYS: Record<IntegrationKey, string> = {
  zoom: "integration_zoom_connected",
  teams: "integration_teams_connected",
};

function readConnected(key: IntegrationKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    return raw === "true";
  } catch {
    return false;
  }
}

function writeConnected(key: IntegrationKey, val: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], String(val));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS[key], newValue: String(val) }));
  } catch {}
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
        connected
          ? "bg-green-100/60 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-200/60 dark:border-green-800"
          : "bg-muted text-muted-foreground border-border"
      )}
      aria-label={connected ? "Connected" : "Not connected"}
    >
      <span
        className={cn(
          "mr-1 h-1.5 w-1.5 rounded-full",
          connected ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
        )}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function ProviderIcon({ provider }: { provider: IntegrationKey }) {
  if (provider === "zoom") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-sky-500" fill="currentColor">
        <path d="M3 7.5A4.5 4.5 0 0 1 7.5 3h9A4.5 4.5 0 0 1 21 7.5v9A4.5 4.5 0 0 1 16.5 21h-9A4.5 4.5 0 0 1 3 16.5v-9Zm6.25 1.75A2.75 2.75 0 0 0 6.5 12v2.75a.75.75 0 0 0 1.5 0V12a1.25 1.25 0 0 1 1.25-1.25h5.25a1.25 1.25 0 0 1 1.25 1.25v2.75a.75.75 0 0 0 1.5 0V12a2.75 2.75 0 0 0-2.75-2.75H9.25Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-indigo-500" fill="currentColor">
      <path d="M4 7.75A3.75 3.75 0 0 1 7.75 4h8.5A3.75 3.75 0 0 1 20 7.75v8.5A3.75 3.75 0 0 1 16.25 20h-8.5A3.75 3.75 0 0 1 4 16.25v-8.5Zm3.75-.25A.75.75 0 0 0 7 8.25v7.5c0 .414.336.75.75.75h4.5a3.75 3.75 0 0 0 3.75-3.75V8.25a.75.75 0 0 0-.75-.75H7.75Zm10.25 1a.75.75 0 0 0-1.5 0v7a.75.75 0 0 0 1.5 0v-7Z" />
    </svg>
  );
}

function IntegrationCard({
  provider,
  name,
  description,
  features,
  manageHref,
  onDisconnect,
  connected,
}: {
  provider: IntegrationKey;
  name: string;
  description: string;
  features: string[];
  manageHref: string;
  onDisconnect: () => void;
  connected: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2 ring-1 ring-border">
              <ProviderIcon provider={provider} />
            </div>
            <div>
              <h3 className="text-base font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <StatusBadge connected={connected} />
        </div>

        <Separator className="my-4" />

        <ul className="mb-4 space-y-2 text-sm text-muted-foreground">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          {!connected ? (
            <Link
              href={manageHref}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Connect
            </Link>
          ) : (
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center justify-center rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Disconnect
            </button>
          )}

          <Link
            href={manageHref}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Manage
          </Link>

          <Link
            href="/ingest"
            className="ml-auto inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Go to Import
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = React.useState<{ zoom: boolean; teams: boolean }>(() => ({
    zoom: readConnected("zoom"),
    teams: readConnected("teams"),
  }));
  const [banner, setBanner] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === STORAGE_KEYS.zoom) {
        setConnected((s) => ({ ...s, zoom: readConnected("zoom") }));
      } else if (e.key === STORAGE_KEYS.teams) {
        setConnected((s) => ({ ...s, teams: readConnected("teams") }));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    const zoomParam = searchParams.get("zoom");
    const teamsParam = searchParams.get("teams");

    if (zoomParam && ["linked", "connected", "1", "true"].includes(zoomParam)) {
      writeConnected("zoom", true);
      setConnected((s) => ({ ...s, zoom: true }));
      setBanner("Zoom has been connected.");
    }
    if (teamsParam && ["linked", "connected", "1", "true"].includes(teamsParam)) {
      writeConnected("teams", true);
      setConnected((s) => ({ ...s, teams: true }));
      setBanner((prev) => (prev ? `${prev} Microsoft Teams has been connected.` : "Microsoft Teams has been connected."));
    }
  }, [searchParams]);

  const disconnect = (key: IntegrationKey) => {
    writeConnected(key, false);
    setConnected((s) => ({ ...s, [key]: false } as typeof s));
    setBanner(`${key === "zoom" ? "Zoom" : "Microsoft Teams"} has been disconnected.`);
  };

  const allDisconnected = !connected.zoom && !connected.teams;

  return (
    <main className="space-y-6">
      <section className="rounded-xl border border-border bg-gradient-to-b from-muted/40 to-background p-6 text-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Connect Zoom or Microsoft Teams to import recordings and transcripts. Manage connections and start importing in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ingest"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Start Import
            </Link>
            <Link
              href="/imports"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              View Imports
            </Link>
          </div>
        </div>

        {banner && (
          <Alert className="mt-4 border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
            <div className="flex w-full items-start justify-between gap-4">
              <div>
                <AlertTitle>Integration update</AlertTitle>
                <AlertDescription>{banner}</AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="rounded-md p-1 text-sm text-green-900/70 hover:bg-green-100 hover:text-green-900 dark:text-green-100/70 dark:hover:bg-green-900/50"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </Alert>
        )}
      </section>

      {allDisconnected && (
        <section className="rounded-lg border border-dashed border-border bg-card/40 p-5">
          <p className="text-sm text-muted-foreground">
            No integrations connected yet. Connect a provider below to begin importing past recordings or set up automated imports.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Link href="/integrations/zoom" className="underline underline-offset-4 hover:text-foreground">
              Connect Zoom
            </Link>
            <span className="text-muted-foreground">or</span>
            <Link href="/integrations/teams" className="underline underline-offset-4 hover:text-foreground">
              Connect Microsoft Teams
            </Link>
            <span className="text-muted-foreground">. You can also</span>
            <Link href="/ingest/upload" className="underline underline-offset-4 hover:text-foreground">
              upload audio files
            </Link>
            <span className="text-muted-foreground">directly.</span>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <IntegrationCard
          provider="zoom"
          name="Zoom"
          description="Import cloud recordings or link your account for automated ingestion."
          features={[
            "OAuth-based account linking",
            "Cloud recording import",
            "Speaker labels (when available)",
          ]}
          manageHref="/integrations/zoom"
          connected={connected.zoom}
          onDisconnect={() => disconnect("zoom")}
        />

        <IntegrationCard
          provider="teams"
          name="Microsoft Teams"
          description="Connect to Microsoft 365 to access meeting recordings for processing."
          features={[
            "Microsoft Graph integration",
            "Recording import workflow",
            "Org-controlled permissions",
          ]}
          manageHref="/integrations/teams"
          connected={connected.teams}
          onDisconnect={() => disconnect("teams")}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Next steps</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          After connecting, go to Import to fetch recent recordings, or create a new session to capture live audio.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/ingest"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Open Import
          </Link>
          <Link
            href="/sessions/new"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            New Live Session
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Help Center
          </Link>
        </div>
      </section>

      <footer className="text-xs text-muted-foreground">
        Looking for organization-wide controls? Visit
        <Link href="/org/settings" className="ml-1 underline underline-offset-4 hover:text-foreground">
          Organization Settings
        </Link>
        . Admin dashboards are available under
        <Link href="/admin" className="ml-1 underline underline-offset-4 hover:text-foreground">
          Admin
        </Link>
        .
      </footer>
    </main>
  );
}
