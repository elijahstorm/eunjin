"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an organization-level data retention and auto-deletion settings page.
 * It focuses on client-side configuration UI, previewing impact windows, and navigation to related pages
 * (organization settings, per-session overrides, integrations, and help/legal). Persistence is localStorage-based
 * due to absent schema in this scope; server/database integration can replace localStorage in the future.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

// Types
type CategoryKey = "recordings" | "transcripts" | "highlights" | "summaries";

type CategorySettings = {
  enabled: boolean;
  durationDays: number | null; // null = keep indefinitely
  autoDelete: boolean; // if durationDays is null, autoDelete is ignored
};

type RetentionSettings = {
  globalEnabled: boolean;
  legalHold: boolean;
  applyToExisting: boolean; // if true, backfill enforcement for historical data
  gracePeriodDays: number; // safety buffer before permanent deletion
  categories: Record<CategoryKey, CategorySettings>;
  updatedAt?: string;
};

const LOCAL_STORAGE_KEY = "orgRetentionSettings";

const DEFAULT_SETTINGS: RetentionSettings = {
  globalEnabled: true,
  legalHold: false,
  applyToExisting: true,
  gracePeriodDays: 7,
  categories: {
    recordings: { enabled: true, durationDays: 90, autoDelete: true },
    transcripts: { enabled: true, durationDays: 365, autoDelete: true },
    highlights: { enabled: true, durationDays: 730, autoDelete: true },
    summaries: { enabled: true, durationDays: null, autoDelete: false },
  },
  updatedAt: undefined,
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  recordings: "Raw recordings",
  transcripts: "Transcripts",
  highlights: "Highlights",
  summaries: "Summaries",
};

const DURATION_PRESETS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "1 year", value: 365 },
  { label: "2 years", value: 730 },
  { label: "Keep indefinitely", value: null },
] as const;

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function humanizeDays(days: number | null): string {
  if (days === null) return "indefinitely";
  if (days === 1) return "1 day";
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? "s" : ""}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? "s" : ""}`;
  return `${days} days`;
}

function classForEnabled(enabled: boolean) {
  return enabled ? "bg-primary/10 border-primary/30" : "bg-muted border-border";
}

export default function OrgRetentionPage() {
  const [settings, setSettings] = useState<RetentionSettings>(DEFAULT_SETTINGS);
  const [initialJson, setInitialJson] = useState<string>(JSON.stringify(DEFAULT_SETTINGS));
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [sessionIdForOverride, setSessionIdForOverride] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RetentionSettings;
        setSettings(parsed);
        setInitialJson(JSON.stringify(parsed));
      } else {
        setInitialJson(JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (e) {
      // Ignore and use default
    }
  }, []);

  const isDirty = useMemo(() => JSON.stringify(settings) !== initialJson, [settings, initialJson]);

  const cutoffDates = useMemo(() => {
    const now = new Date();
    const map: Partial<Record<CategoryKey, Date | null>> = {};
    (Object.keys(settings.categories) as CategoryKey[]).forEach((key) => {
      const cfg = settings.categories[key];
      if (!settings.globalEnabled || settings.legalHold || !cfg.enabled || cfg.durationDays === null) {
        map[key] = null;
        return;
      }
      const cutoff = new Date(now.getTime() - cfg.durationDays * 24 * 60 * 60 * 1000);
      map[key] = cutoff;
    });
    return map as Record<CategoryKey, Date | null>;
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setErrorBanner(null);
    setSavedBanner(null);
    try {
      const toSave: RetentionSettings = { ...settings, updatedAt: new Date().toISOString() };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
      setInitialJson(JSON.stringify(toSave));
      setSavedBanner("Retention policy updated.");
    } catch (e) {
      setErrorBanner("Failed to save settings locally.");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedBanner(null), 4000);
    }
  };

  const handleDiscard = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        setSettings(JSON.parse(raw));
        setInitialJson(raw);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setInitialJson(JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setInitialJson(JSON.stringify(DEFAULT_SETTINGS));
    }
  };

  const ResetToDefaults = () => (
    <button
      type="button"
      onClick={() => setSettings(DEFAULT_SETTINGS)}
      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
    >
      Reset to recommended defaults
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/org/settings" className="hover:text-foreground">Organization settings</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Data retention</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-2">Data Retention & Auto-Deletion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define how long to keep recordings, transcripts, highlights, and summaries. Preview impact and navigate to per-session overrides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/org/settings"
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            Back to Settings
          </Link>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || saving}
            className={cn(
              "inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm",
              !isDirty || saving ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              "inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow",
              !isDirty || saving ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
            )}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <Separator className="my-6" />

      {settings.legalHold && (
        <Alert className="border-destructive text-destructive">
          <AlertTitle>Legal hold is active</AlertTitle>
          <AlertDescription>
            While legal hold remains active, no data will be auto-deleted regardless of the retention policy. Disable legal hold to resume enforcement.
          </AlertDescription>
        </Alert>
      )}

      {savedBanner && (
        <Alert className="mt-4 border-emerald-500/60 text-emerald-700">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{savedBanner}</AlertDescription>
        </Alert>
      )}

      {errorBanner && (
        <Alert className="mt-4 border-destructive text-destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorBanner}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left: Global & Categories */}
        <div className="lg:col-span-2 space-y-6">
          {/* Global Controls */}
          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">Global retention controls</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure enforcement and safety nets applied across the organization.
                </p>
              </div>
              <ResetToDefaults />
            </div>

            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={settings.globalEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, globalEnabled: e.target.checked }))}
                />
                <div>
                  <div className="font-medium">Enable retention enforcement</div>
                  <p className="text-sm text-muted-foreground">Applies retention windows and auto-deletion actions when eligible.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={settings.applyToExisting}
                  onChange={(e) => setSettings((s) => ({ ...s, applyToExisting: e.target.checked }))}
                />
                <div>
                  <div className="font-medium">Apply to existing data</div>
                  <p className="text-sm text-muted-foreground">When enabled, older data outside the retention window may be queued for deletion.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={settings.legalHold}
                  onChange={(e) => setSettings((s) => ({ ...s, legalHold: e.target.checked }))}
                />
                <div>
                  <div className="font-medium">Legal hold</div>
                  <p className="text-sm text-muted-foreground">Temporarily pause deletions across all categories for compliance or audit events.</p>
                </div>
              </label>

              <div className="flex items-center gap-3">
                <label htmlFor="gracePeriod" className="text-sm font-medium min-w-36">Grace period</label>
                <select
                  id="gracePeriod"
                  value={settings.gracePeriodDays}
                  onChange={(e) => setSettings((s) => ({ ...s, gracePeriodDays: Number(e.target.value) }))}
                  className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {[0, 3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>{d === 0 ? "No grace period" : `${d} days`}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Time window to recover items from trash before permanent deletion.</p>
              </div>
            </div>
          </section>

          {/* Category Cards */}
          {(Object.keys(settings.categories) as CategoryKey[]).map((key) => {
            const cfg = settings.categories[key];
            return (
              <section key={key} className={cn("rounded-lg border p-5 transition-colors", classForEnabled(cfg.enabled && settings.globalEnabled && !settings.legalHold))}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold">{CATEGORY_LABELS[key]}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {key === "recordings" && "Large files, highest storage impact."}
                      {key === "transcripts" && "Textual content with moderate storage needs."}
                      {key === "highlights" && "User-marked moments and notes."}
                      {key === "summaries" && "Generated summaries and reports."}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={cfg.enabled}
                      onChange={(e) => setSettings((s) => ({
                        ...s,
                        categories: { ...s.categories, [key]: { ...s.categories[key], enabled: e.target.checked } },
                      }))}
                    />
                    <span className="font-medium">Enabled</span>
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Retention window</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                      value={cfg.durationDays === null ? "null" : String(cfg.durationDays)}
                      onChange={(e) => {
                        const value = e.target.value === "null" ? null : Number(e.target.value);
                        setSettings((s) => ({
                          ...s,
                          categories: { ...s.categories, [key]: { ...s.categories[key], durationDays: value } },
                        }));
                      }}
                      disabled={!cfg.enabled}
                    >
                      {DURATION_PRESETS.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Action</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                      value={cfg.autoDelete ? "delete" : "retain"}
                      onChange={(e) => {
                        const v = e.target.value === "delete";
                        setSettings((s) => ({
                          ...s,
                          categories: { ...s.categories, [key]: { ...s.categories[key], autoDelete: v } },
                        }));
                      }}
                      disabled={!cfg.enabled || cfg.durationDays === null}
                    >
                      <option value="retain">Move to archive (retain)</option>
                      <option value="delete">Auto-delete after window</option>
                    </select>
                    {cfg.durationDays === null && (
                      <p className="text-xs text-muted-foreground">Indefinite retention selected; deletion is disabled.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preview cutoff</label>
                    <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {settings.globalEnabled && cfg.enabled && !settings.legalHold && cfg.durationDays !== null ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Before</span>
                          <span className="font-medium">{formatDate(cutoffDates[key] as Date)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not applicable</span>
                      )}
                    </div>
                    {settings.globalEnabled && cfg.enabled && !settings.legalHold && cfg.durationDays !== null && cfg.autoDelete && (
                      <p className="text-xs text-muted-foreground">Eligible items will go to trash, then permanently deleted after {settings.gracePeriodDays} days.</p>
                    )}
                  </div>
                </div>
              </section>
            );
          })}

          {/* Advanced */}
          <section className="rounded-lg border bg-card p-5">
            <Collapsible>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">Advanced</h3>
                  <p className="text-sm text-muted-foreground mt-1">Optional settings and references for admins.</p>
                </div>
                <CollapsibleTrigger asChild>
                  <button className="text-sm text-primary underline underline-offset-4">Toggle</button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md border p-4">
                    <div className="font-medium">Compliance</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>
                        Review our <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link> and <Link href="/legal/terms" className="text-primary hover:underline">Terms</Link>.
                      </li>
                      <li>
                        Manage org security at <Link href="/org/security" className="text-primary hover:underline">Organization Security</Link>.
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="font-medium">Integrations</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      <li>
                        Connect <Link href="/integrations/zoom" className="text-primary hover:underline">Zoom</Link> or <Link href="/integrations/teams" className="text-primary hover:underline">Microsoft Teams</Link> to ingest recordings.
                      </li>
                      <li>
                        Check imports at <Link href="/imports" className="text-primary hover:underline">Imports</Link>.
                      </li>
                      <li>
                        Need help? Visit <Link href="/help" className="text-primary hover:underline">Help Center</Link>.
                      </li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>

        {/* Right: Preview & Shortcuts */}
        <aside className="space-y-6">
          <section className="rounded-lg border bg-card p-5">
            <h3 className="text-base font-semibold">Preview impact</h3>
            <p className="text-sm text-muted-foreground mt-1">These cutoffs help identify what would be archived or deleted.</p>
            <div className="mt-4 space-y-3">
              {(Object.keys(settings.categories) as CategoryKey[]).map((key) => {
                const cfg = settings.categories[key];
                const cutoff = cutoffDates[key];
                const active = settings.globalEnabled && cfg.enabled && !settings.legalHold && cfg.durationDays !== null;
                return (
                  <div key={key} className="flex items-start gap-3">
                    <div className={cn("h-2 w-2 mt-1.5 rounded-full", active ? "bg-chart-3" : "bg-muted")}></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{CATEGORY_LABELS[key]}</div>
                      {active ? (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Items created before <span className="font-medium text-foreground">{formatDate(cutoff as Date)}</span> will be
                          {" "}
                          {cfg.autoDelete ? (
                            <>
                              queued for deletion (trash + {settings.gracePeriodDays}d grace).
                            </>
                          ) : (
                            <> moved to archive for retention.</>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-0.5">No deletion due to current settings.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="text-sm font-medium">Explore affected sessions</div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                {(Object.keys(settings.categories) as CategoryKey[]).map((key) => {
                  const cutoff = cutoffDates[key];
                  if (!cutoff) return null;
                  const before = formatDate(cutoff);
                  return (
                    <li key={`lnk-${key}`}>
                      <Link
                        href={`/sessions?before=${before}&type=${key}`}
                        className="text-primary hover:underline"
                      >
                        Sessions with {CATEGORY_LABELS[key].toLowerCase()} older than {before}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link href="/sessions" className="text-primary hover:underline">Browse all sessions</Link>
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h3 className="text-base font-semibold">Per-session override</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Override retention at the session level, e.g., keep indefinitely for critical meetings.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Session ID"
                value={sessionIdForOverride}
                onChange={(e) => setSessionIdForOverride(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Link
                href={sessionIdForOverride ? `/sessions/${encodeURIComponent(sessionIdForOverride)}/settings` : "#"}
                className={cn(
                  "inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground",
                  !sessionIdForOverride ? "opacity-50 pointer-events-none" : "hover:opacity-90"
                )}
              >
                Open
              </Link>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Tip: You can also open a session, then switch to the Retention tab.
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h3 className="text-base font-semibold">Shortcuts</h3>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Link href="/org/settings" className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Organization settings</Link>
              <Link href="/ingest" className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Ingest</Link>
              <Link href="/integrations" className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Integrations</Link>
              <Link href="/help" className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">Help Center</Link>
            </div>
          </section>
        </aside>
      </div>

      <Separator className="my-6" />

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-base font-semibold">How retention works</h3>
        <div className="mt-3 text-sm text-muted-foreground space-y-2">
          <p>
            When enforcement is enabled, items older than their retention window are either archived or moved to trash,
            then permanently deleted after the configured grace period. Legal hold pauses deletions globally.
          </p>
          <p>
            For one-off exceptions, set a per-session override at the session level: open a session and navigate to
            Settings → Retention, or use the quick open above.
          </p>
          <p>
            Learn more in the <Link href="/help" className="text-primary hover:underline">Help Center</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
