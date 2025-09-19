"use client";

/**
 * CODE INSIGHT
 * This page renders the Consent Templates dashboard. It focuses on listing, creating, and managing consent templates
 * used to collect participant recording/transcription consent. Each template card links to its detail (/consent/[id])
 * and share page (/consent/[id]/share). Since no DB schema is provided here, it uses localStorage for client-side
 * persistence, while offering clear navigation to other relevant app routes.
 */

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

type ConsentTemplateStatus = "draft" | "published" | "archived";

interface ConsentTemplate {
  id: string;
  title: string;
  language: string;
  updatedAt: string; // ISO string
  status: ConsentTemplateStatus;
  version: number;
}

const LS_KEY = "consent:templates";

function loadTemplates(): ConsentTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .map((t: any) => ({
        id: String(t.id ?? crypto.randomUUID()),
        title: String(t.title ?? "Untitled"),
        language: String(t.language ?? "ko"),
        updatedAt: new Date(t.updatedAt ?? Date.now()).toISOString(),
        status: (t.status as ConsentTemplateStatus) ?? "draft",
        version: Number.isFinite(Number(t.version)) ? Number(t.version) : 1,
      }));
  } catch {
    return [];
  }
}

function saveTemplates(templates: ConsentTemplate[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}

function timeAgo(date: Date) {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diff = (date.getTime() - Date.now()) / 1000; // negative if past
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 31104000) return rtf.format(Math.round(diff / 2592000), "month");
  return rtf.format(Math.round(diff / 31104000), "year");
}

function StatusBadge({ status }: { status: ConsentTemplateStatus }) {
  const variant =
    status === "published"
      ? "bg-primary/15 text-primary"
      : status === "archived"
      ? "bg-muted text-muted-foreground"
      : "bg-secondary/30 text-secondary-foreground";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        variant,
        status === "published" && "ring-primary/30",
        status === "draft" && "ring-secondary/30",
        status === "archived" && "ring-border"
      )}
    >
      {label}
    </span>
  );
}

function LanguageBadge({ lang }: { lang: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground ring-1 ring-inset ring-border">
      {lang.toUpperCase()}
    </span>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
    />
  );
}

function PrimaryLinkButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      {children}
    </Link>
  );
}

export default function ConsentTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [templates, setTemplates] = React.useState<ConsentTemplate[]>([]);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<"updated-desc" | "updated-asc" | "title-asc" | "title-desc">("updated-desc");
  const [error, setError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [quickId, setQuickId] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const seeded = searchParams.get("seed");
    const existing = loadTemplates();

    if (seeded === "sample" && existing.length === 0) {
      const sample: ConsentTemplate[] = [
        {
          id: crypto.randomUUID(),
          title: "녹음·전사 동의서 (강의 기본)",
          language: "ko",
          status: "published",
          version: 3,
          updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          title: "Recording & Transcription Consent (English)",
          language: "en",
          status: "draft",
          version: 1,
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          title: "기업 회의용 간소화 동의서",
          language: "ko",
          status: "archived",
          version: 2,
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        },
      ];
      setTemplates(sample);
      saveTemplates(sample);
    } else {
      setTemplates(existing);
    }
  }, [searchParams]);

  React.useEffect(() => {
    // Keep localStorage in sync
    saveTemplates(templates);
  }, [templates]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = templates.filter((t) =>
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.language.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
    const sorted = [...out].sort((a, b) => {
      switch (sort) {
        case "updated-asc":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "updated-desc":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    return sorted;
  }, [templates, query, sort]);

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        const list: ConsentTemplate[] = (Array.isArray(json) ? json : [json]).map((t: any) => ({
          id: String(t.id ?? crypto.randomUUID()),
          title: String(t.title ?? "Untitled"),
          language: String(t.language ?? "ko"),
          updatedAt: new Date(t.updatedAt ?? Date.now()).toISOString(),
          status: ((t.status as ConsentTemplateStatus) ?? "draft") as ConsentTemplateStatus,
          version: Number.isFinite(Number(t.version)) ? Number(t.version) : 1,
        }));
        const merged = mergeById(templates, list);
        setTemplates(merged);
      } catch (err: any) {
        setError("Failed to import: invalid JSON format.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  function mergeById(base: ConsentTemplate[], addon: ConsentTemplate[]): ConsentTemplate[] {
    const map = new Map<string, ConsentTemplate>();
    for (const t of base) map.set(t.id, t);
    for (const x of addon) map.set(x.id, x);
    return Array.from(map.values());
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consent-templates-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function duplicateTemplate(t: ConsentTemplate) {
    const copy: ConsentTemplate = {
      ...t,
      id: crypto.randomUUID(),
      title: `${t.title} (Copy)`,
      status: "draft",
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    setTemplates([copy, ...templates]);
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Consent Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage consent language for recordings and transcription. Link templates to sessions and share with participants for compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrimaryLinkButton href="/consent/new">+ New Template</PrimaryLinkButton>
          <ActionButton onClick={() => fileInputRef.current?.click()} aria-label="Import templates from JSON">
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">Imp</span>
          </ActionButton>
          <ActionButton onClick={exportJSON} aria-label="Export templates to JSON">
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Exp</span>
          </ActionButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertTitle>Import error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert className="border-border bg-card">
        <AlertTitle className="font-semibold">Publish and share</AlertTitle>
        <AlertDescription>
          Set a template to Published before sharing. Each template has a dedicated share page at
          {" "}
          <span className="font-mono">/consent/[id]/share</span>. You can also distribute public links via {" "}
          <Link href="/c/sample" className="underline hover:text-primary">/c/[slug]</Link> after creating share slugs.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, language, or status..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-muted-foreground">⌘K</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted-foreground">Sort:</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="updated-desc">Last updated (newest)</option>
            <option value="updated-asc">Last updated (oldest)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <div key={t.id} className="group relative flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">{t.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <LanguageBadge lang={t.language} />
                  <StatusBadge status={t.status} />
                  <span className="text-muted-foreground">v{t.version}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">Updated {timeAgo(new Date(t.updatedAt))}</div>

            <Separator className="my-3" />

            <div className="mt-auto flex items-center gap-2">
              <Link
                href={`/consent/${encodeURIComponent(t.id)}`}
                className="inline-flex flex-1 items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:opacity-95"
              >
                Edit
              </Link>
              <Link
                href={`/consent/${encodeURIComponent(t.id)}/share`}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Share
              </Link>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                onClick={() => duplicateTemplate(t)}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Duplicate
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/consent/${t.id}`)}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="text-destructive underline-offset-4 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">📄</div>
          <h3 className="text-lg font-semibold text-foreground">No consent templates yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create your first template, or import from a JSON file. You can later share templates with participants via a secure link.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <PrimaryLinkButton href="/consent/new">Create Template</PrimaryLinkButton>
            <ActionButton onClick={() => fileInputRef.current?.click()}>{importing ? "Importing..." : "Import JSON"}</ActionButton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold">Quick open by ID</h4>
          <p className="mt-1 text-xs text-muted-foreground">Paste a consent template ID to jump to its page.</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={quickId}
              onChange={(e) => setQuickId(e.target.value)}
              placeholder="consent template id"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <ActionButton
              onClick={() => quickId && router.push(`/consent/${encodeURIComponent(quickId)}`)}
              className="bg-secondary text-secondary-foreground"
            >
              Open
            </ActionButton>
            <ActionButton
              onClick={() => quickId && router.push(`/consent/${encodeURIComponent(quickId)}/share`)}
            >
              Share Page
            </ActionButton>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold">Tips & Compliance</h4>
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <button className="mt-1 text-left text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                View guidance
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Clearly describe audio capture, transcription, diarization, and storage policies.</li>
                <li>Include retention duration and withdrawal of consent instructions. Configure in {" "}
                  <Link href="/org/retention" className="underline hover:text-primary">Org Retention</Link>.
                </li>
                <li>Link to your privacy policy and terms. See {" "}
                  <Link href="/legal/privacy" className="underline hover:text-primary">Privacy</Link> and {" "}
                  <Link href="/legal/terms" className="underline hover:text-primary">Terms</Link>.
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold">Related actions</h4>
        <p className="mt-1 text-xs text-muted-foreground">Quick links across your workspace.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <LinkCard href="/dashboard" title="Dashboard" subtitle="Overview & metrics" />
          <LinkCard href="/onboarding" title="Onboarding" subtitle="Get set up" />
          <LinkCard href="/sessions" title="Sessions" subtitle="All meetings & lectures" />
          <LinkCard href="/sessions/new" title="New Session" subtitle="Start recording & ASR" />
          <LinkCard href="/ingest/upload" title="Upload Recording" subtitle="Process Zoom/Teams files" />
          <LinkCard href="/integrations" title="Integrations" subtitle="Connect Zoom & Teams" />
          <LinkCard href="/integrations/zoom" title="Zoom" subtitle="OAuth & imports" />
          <LinkCard href="/integrations/teams" title="Microsoft Teams" subtitle="OAuth & imports" />
          <LinkCard href="/org/settings" title="Org Settings" subtitle="Brand, policies" />
          <LinkCard href="/org/security" title="Security" subtitle="Access control" />
          <LinkCard href="/admin/metrics" title="Admin Metrics" subtitle="Usage & costs" />
          <LinkCard href="/help" title="Help Center" subtitle="Guides & FAQs" />
          <LinkCard href="/me" title="My Account" subtitle="Profile overview" />
          <LinkCard href="/settings/profile" title="Profile Settings" subtitle="Name, locale" />
          <LinkCard href="/settings/notifications" title="Notifications" subtitle="Email & push" />
          <LinkCard href="/settings/devices" title="Devices" subtitle="Mic & permissions" />
        </div>
      </div>
    </div>
  );
}

function LinkCard({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border border-border bg-background p-3 transition hover:bg-accent hover:text-accent-foreground"
    >
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <span aria-hidden className="text-muted-foreground">→</span>
    </Link>
  );
}
