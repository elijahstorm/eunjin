"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an in-app, client-side cost tracking and budgeting page for admin users.
 * It estimates monthly costs across ASR, LLM, and Storage/Egress based on configurable assumptions, without
 * making database calls. It offers quick links to related admin metrics and provider integrations pages
 * for deeper analysis and settings. The UI is designed to be sleek, modern, and production-ready with
 * persistent settings using localStorage.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type AsrProvider = {
  id: string;
  name: string;
  ratePerMin: number; // USD per minute
  link?: string;
};

type LlmModel = {
  id: string;
  name: string;
  inputPer1k: number; // USD per 1K tokens
  outputPer1k: number; // USD per 1K tokens
  link?: string;
};

type Timeframe = "this_month" | "last_month" | "custom";

type PersistedState = {
  timeframe: Timeframe;
  budgetUSD: number;
  overheadPct: number;
  asrProviderId: string;
  asrProviders: AsrProvider[];
  asrMinutes: number;
  llmModelId: string;
  llmModels: LlmModel[];
  summariesPerMonth: number;
  avgInTokens: number;
  avgOutTokens: number;
  storageGBMonth: number;
  storagePricePerGBMonth: number;
  egressGB: number;
  egressPricePerGB: number;
};

const STORAGE_KEY = "admin.costs.state.v1";

const defaultAsrProviders: AsrProvider[] = [
  { id: "deepgram", name: "Deepgram", ratePerMin: 0.006, link: "/integrations" },
  { id: "assemblyai", name: "AssemblyAI", ratePerMin: 0.0065, link: "/integrations" },
  { id: "whisper", name: "OpenAI Whisper (managed)", ratePerMin: 0.004, link: "/integrations" },
];

const defaultLlmModels: LlmModel[] = [
  { id: "gpt-4o-mini", name: "OpenAI gpt-4o-mini", inputPer1k: 0.00015, outputPer1k: 0.0006, link: "/integrations" },
  { id: "gpt-4o", name: "OpenAI gpt-4o", inputPer1k: 0.005, outputPer1k: 0.015, link: "/integrations" },
  { id: "claude-sonnet", name: "Anthropic Claude Sonnet", inputPer1k: 0.003, outputPer1k: 0.015, link: "/integrations" },
];

function usd(n: number): string {
  if (!isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function clamp(n: number, min = 0, max = Number.POSITIVE_INFINITY) {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState({ ...(initial as any), ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

export default function AdminCostsPage() {
  const [persisted, setPersisted] = usePersistedState<PersistedState>(STORAGE_KEY, {
    timeframe: "this_month",
    budgetUSD: 200,
    overheadPct: 7.5,
    asrProviderId: defaultAsrProviders[0].id,
    asrProviders: defaultAsrProviders,
    asrMinutes: 1500,
    llmModelId: defaultLlmModels[0].id,
    llmModels: defaultLlmModels,
    summariesPerMonth: 120,
    avgInTokens: 1800,
    avgOutTokens: 900,
    storageGBMonth: 250,
    storagePricePerGBMonth: 0.02,
    egressGB: 40,
    egressPricePerGB: 0.09,
  });

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const asrSelected = useMemo(
    () => persisted.asrProviders.find((p) => p.id === persisted.asrProviderId) ?? persisted.asrProviders[0],
    [persisted.asrProviderId, persisted.asrProviders]
  );
  const llmSelected = useMemo(
    () => persisted.llmModels.find((m) => m.id === persisted.llmModelId) ?? persisted.llmModels[0],
    [persisted.llmModelId, persisted.llmModels]
  );

  // Derived metrics
  const llmInTokens = persisted.summariesPerMonth * persisted.avgInTokens;
  const llmOutTokens = persisted.summariesPerMonth * persisted.avgOutTokens;

  const asrCost = (persisted.asrMinutes || 0) * (asrSelected?.ratePerMin || 0);
  const llmInCost = (llmInTokens / 1000) * (llmSelected?.inputPer1k || 0);
  const llmOutCost = (llmOutTokens / 1000) * (llmSelected?.outputPer1k || 0);
  const llmCost = llmInCost + llmOutCost;
  const storageCost = (persisted.storageGBMonth || 0) * (persisted.storagePricePerGBMonth || 0);
  const egressCost = (persisted.egressGB || 0) * (persisted.egressPricePerGB || 0);
  const infraCost = storageCost + egressCost;
  const subtotal = asrCost + llmCost + infraCost;
  const overhead = subtotal * (persisted.overheadPct / 100);
  const total = subtotal + overhead;

  const overBudget = total > (persisted.budgetUSD || 0);

  const breakdown = [
    { key: "ASR", value: asrCost, color: "bg-chart-1", items: [{ label: asrSelected?.name || "ASR", value: asrCost }] },
    {
      key: "LLM",
      value: llmCost,
      color: "bg-chart-2",
      items: [
        { label: `${llmSelected?.name || "LLM"} (in)`, value: llmInCost },
        { label: `${llmSelected?.name || "LLM"} (out)`, value: llmOutCost },
      ],
    },
    {
      key: "Storage",
      value: infraCost,
      color: "bg-chart-3",
      items: [
        { label: "Storage (GB-month)", value: storageCost },
        { label: "Egress (GB)", value: egressCost },
      ],
    },
    { key: "Overhead", value: overhead, color: "bg-chart-4", items: [{ label: `Overhead ${persisted.overheadPct}%`, value: overhead }] },
  ];

  function handleExportCSV() {
    const lines: string[] = [];
    lines.push(["Category", "Item", "Units", "Unit Price (USD)", "Cost (USD)"].join(","));
    lines.push([
      "ASR",
      asrSelected?.name || "ASR",
      `${persisted.asrMinutes} min`,
      `${(asrSelected?.ratePerMin || 0).toFixed(6)}/min`,
      asrCost.toFixed(4),
    ].join(","));
    lines.push([
      "LLM",
      `${llmSelected?.name || "LLM"} input`,
      `${llmInTokens} tokens`,
      `${(llmSelected?.inputPer1k || 0).toFixed(6)}/1k`,
      llmInCost.toFixed(4),
    ].join(","));
    lines.push([
      "LLM",
      `${llmSelected?.name || "LLM"} output`,
      `${llmOutTokens} tokens`,
      `${(llmSelected?.outputPer1k || 0).toFixed(6)}/1k`,
      llmOutCost.toFixed(4),
    ].join(","));
    lines.push(["Storage", "GB-month", `${persisted.storageGBMonth} GB`, `${persisted.storagePricePerGBMonth.toFixed(4)}/GB`, storageCost.toFixed(4)].join(","));
    lines.push(["Storage", "Egress", `${persisted.egressGB} GB`, `${persisted.egressPricePerGB.toFixed(4)}/GB`, egressCost.toFixed(4)].join(","));
    lines.push(["Overhead", `${persisted.overheadPct}%`, "-", "-", overhead.toFixed(4)].join(","));
    lines.push(["Total", "-", "-", "-", total.toFixed(4)].join(","));

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `costs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function resetDefaults() {
    setPersisted({
      timeframe: "this_month",
      budgetUSD: 200,
      overheadPct: 7.5,
      asrProviderId: defaultAsrProviders[0].id,
      asrProviders: defaultAsrProviders,
      asrMinutes: 1500,
      llmModelId: defaultLlmModels[0].id,
      llmModels: defaultLlmModels,
      summariesPerMonth: 120,
      avgInTokens: 1800,
      avgOutTokens: 900,
      storageGBMonth: 250,
      storagePricePerGBMonth: 0.02,
      egressGB: 40,
      egressPricePerGB: 0.09,
    });
  }

  function updateAsrProviderRate(id: string, rate: number) {
    setPersisted((p) => ({
      ...p,
      asrProviders: p.asrProviders.map((prov) => (prov.id === id ? { ...prov, ratePerMin: clamp(rate) } : prov)),
    }));
  }

  function updateLlmModelRate(id: string, k: "inputPer1k" | "outputPer1k", v: number) {
    setPersisted((p) => ({
      ...p,
      llmModels: p.llmModels.map((m) => (m.id === id ? { ...m, [k]: clamp(v) } : m)),
    }));
  }

  const totalForBar = Math.max(total, 0.00001);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Costs & Budgets</h1>
          <p className="text-sm text-muted-foreground">Track projected spend across ASR, LLM, and storage. Adjust assumptions and compare with metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/metrics" className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring">
            View Metrics
          </Link>
          <Link href="/integrations" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            Provider Settings
          </Link>
        </div>
      </div>

      {hydrated ? (
        overBudget ? (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
            <AlertTitle>Budget at risk</AlertTitle>
            <AlertDescription>
              Your projected total {usd(total)} exceeds the monthly budget {usd(persisted.budgetUSD)}. Review assumptions or update your budget. Compare with real usage in <Link className="underline underline-offset-4" href="/admin/metrics">Metrics</Link>.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/30 bg-emerald-500/10">
            <AlertTitle>On track</AlertTitle>
            <AlertDescription>
              Projected total {usd(total)} is within your budget of {usd(persisted.budgetUSD)}. Keep provider rates in sync via <Link className="underline underline-offset-4" href="/integrations">Integrations</Link>.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Skeleton className="h-16 w-full rounded-md" />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="col-span-1 space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Assumptions</h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-md border border-input bg-background p-1">
                {(["this_month", "last_month", "custom"] as Timeframe[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPersisted((p) => ({ ...p, timeframe: t }))}
                    className={cn(
                      "rounded-sm px-2 py-1 text-xs font-medium",
                      persisted.timeframe === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t === "this_month" ? "This month" : t === "last_month" ? "Last month" : "Custom"}
                  </button>
                ))}
              </div>
              <button onClick={resetDefaults} className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground">Reset</button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">ASR</h3>
              <label className="block text-xs text-muted-foreground">Provider</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={persisted.asrProviderId}
                onChange={(e) => setPersisted((p) => ({ ...p, asrProviderId: e.target.value }))}
              >
                {persisted.asrProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label className="mt-2 block text-xs text-muted-foreground">Usage (minutes / month)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={persisted.asrMinutes}
                onChange={(e) => setPersisted((p) => ({ ...p, asrMinutes: clamp(parseFloat(e.target.value)) }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <label className="mt-2 block text-xs text-muted-foreground">Rate (USD / min)</label>
              <input
                type="number"
                min={0}
                step={0.0001}
                value={asrSelected?.ratePerMin ?? 0}
                onChange={(e) => updateAsrProviderRate(asrSelected?.id || "", parseFloat(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <p className="text-xs text-muted-foreground">Tip: Keep your negotiated rates updated in <Link className="underline underline-offset-4" href="/integrations">Integrations</Link>.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">LLM</h3>
              <label className="block text-xs text-muted-foreground">Model</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={persisted.llmModelId}
                onChange={(e) => setPersisted((p) => ({ ...p, llmModelId: e.target.value }))}
              >
                {persisted.llmModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Summaries / month</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={persisted.summariesPerMonth}
                    onChange={(e) => setPersisted((p) => ({ ...p, summariesPerMonth: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Avg input tokens</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={persisted.avgInTokens}
                    onChange={(e) => setPersisted((p) => ({ ...p, avgInTokens: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Avg output tokens</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={persisted.avgOutTokens}
                    onChange={(e) => setPersisted((p) => ({ ...p, avgOutTokens: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Input rate (USD / 1K)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.00001}
                    value={llmSelected?.inputPer1k ?? 0}
                    onChange={(e) => updateLlmModelRate(llmSelected?.id || "", "inputPer1k", parseFloat(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Output rate (USD / 1K)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.00001}
                    value={llmSelected?.outputPer1k ?? 0}
                    onChange={(e) => updateLlmModelRate(llmSelected?.id || "", "outputPer1k", parseFloat(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Storage & Egress</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Stored (GB-month)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={persisted.storageGBMonth}
                    onChange={(e) => setPersisted((p) => ({ ...p, storageGBMonth: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Price (USD / GB-month)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={persisted.storagePricePerGBMonth}
                    onChange={(e) => setPersisted((p) => ({ ...p, storagePricePerGBMonth: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Egress (GB)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={persisted.egressGB}
                    onChange={(e) => setPersisted((p) => ({ ...p, egressGB: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Price (USD / GB)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={persisted.egressPricePerGB}
                    onChange={(e) => setPersisted((p) => ({ ...p, egressPricePerGB: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Tune retention policies in <Link className="underline underline-offset-4" href="/org/retention">Org Retention</Link> to manage storage costs.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Budget & Overhead</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Monthly budget (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={persisted.budgetUSD}
                    onChange={(e) => setPersisted((p) => ({ ...p, budgetUSD: clamp(parseFloat(e.target.value)) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Overhead (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={persisted.overheadPct}
                    onChange={(e) => setPersisted((p) => ({ ...p, overheadPct: clamp(parseFloat(e.target.value), 0, 100) }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Advanced assumptions
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <p>Provider rates are estimates. Update negotiated prices in <Link className="underline underline-offset-4" href="/integrations">Integrations</Link>. Correlate projected vs. actual in <Link className="underline underline-offset-4" href="/admin/metrics">Metrics</Link>.</p>
                  <p>LLM token counts reflect prompt + context + system templates. Adjust per your pipeline and summarization style.</p>
                  <p>Storage is billed on GB-month. Egress includes downloads and web previews. Consider caching and retention policies.</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </section>

        <section className="col-span-1 space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground lg:col-span-5">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-medium">Projection</h2>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Timeframe</div>
              <div className="text-sm">{persisted.timeframe === "this_month" ? "This month" : persisted.timeframe === "last_month" ? "Last month" : "Custom"}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Projected total</div>
                <div className="text-2xl font-semibold">{hydrated ? usd(total) : <Skeleton className="h-7 w-32" />}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Budget</div>
                <div className={cn("text-lg font-medium", overBudget ? "text-destructive" : "text-foreground")}>{hydrated ? usd(persisted.budgetUSD) : <Skeleton className="h-5 w-20" />}</div>
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-chart-1"
                style={{ width: `${(breakdown[0].value / totalForBar) * 100}%` }}
                aria-label="ASR"
                title={`ASR ${usd(breakdown[0].value)}`}
              />
              <div
                className="-mt-3 h-3 bg-chart-2"
                style={{ width: `${(breakdown[1].value / totalForBar) * 100}%` }}
                aria-label="LLM"
                title={`LLM ${usd(breakdown[1].value)}`}
              />
              <div
                className="-mt-3 h-3 bg-chart-3"
                style={{ width: `${(breakdown[2].value / totalForBar) * 100}%` }}
                aria-label="Storage"
                title={`Storage ${usd(breakdown[2].value)}`}
              />
              <div
                className="-mt-3 h-3 bg-chart-4"
                style={{ width: `${(breakdown[3].value / totalForBar) * 100}%` }}
                aria-label="Overhead"
                title={`Overhead ${usd(breakdown[3].value)}`}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {breakdown.map((b) => (
                <span key={b.key} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1", b.color, "text-primary-foreground border-transparent")}>● {b.key}: {usd(b.value)}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Line items</h3>
            <div className="mt-2 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Units</th>
                    <th className="px-3 py-2 text-right font-medium">Unit price</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2">ASR</td>
                    <td className="px-3 py-2">{asrSelected?.name || "ASR"}</td>
                    <td className="px-3 py-2 text-right">{persisted.asrMinutes.toLocaleString()} min</td>
                    <td className="px-3 py-2 text-right">{usd(asrSelected?.ratePerMin || 0)}/min</td>
                    <td className="px-3 py-2 text-right">{usd(asrCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">LLM</td>
                    <td className="px-3 py-2">{llmSelected?.name || "LLM"} (input)</td>
                    <td className="px-3 py-2 text-right">{llmInTokens.toLocaleString()} tokens</td>
                    <td className="px-3 py-2 text-right">{usd(llmSelected?.inputPer1k || 0)}/1k</td>
                    <td className="px-3 py-2 text-right">{usd(llmInCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">LLM</td>
                    <td className="px-3 py-2">{llmSelected?.name || "LLM"} (output)</td>
                    <td className="px-3 py-2 text-right">{llmOutTokens.toLocaleString()} tokens</td>
                    <td className="px-3 py-2 text-right">{usd(llmSelected?.outputPer1k || 0)}/1k</td>
                    <td className="px-3 py-2 text-right">{usd(llmOutCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Storage</td>
                    <td className="px-3 py-2">GB-month</td>
                    <td className="px-3 py-2 text-right">{persisted.storageGBMonth.toLocaleString()} GB</td>
                    <td className="px-3 py-2 text-right">{usd(persisted.storagePricePerGBMonth)}/GB</td>
                    <td className="px-3 py-2 text-right">{usd(storageCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Storage</td>
                    <td className="px-3 py-2">Egress</td>
                    <td className="px-3 py-2 text-right">{persisted.egressGB.toLocaleString()} GB</td>
                    <td className="px-3 py-2 text-right">{usd(persisted.egressPricePerGB)}/GB</td>
                    <td className="px-3 py-2 text-right">{usd(egressCost)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Overhead</td>
                    <td className="px-3 py-2">Operational ({persisted.overheadPct}%)</td>
                    <td className="px-3 py-2 text-right">-</td>
                    <td className="px-3 py-2 text-right">-</td>
                    <td className="px-3 py-2 text-right">{usd(overhead)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td className="px-3 py-2" colSpan={4}>
                      <div className="flex items-center gap-3">
                        <button onClick={handleExportCSV} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                          Export CSV
                        </button>
                        <Link href="/admin/metrics" className="text-xs underline underline-offset-4">Correlate in Metrics</Link>
                        <Link href="/integrations" className="text-xs underline underline-offset-4">Update provider rates</Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-base font-semibold">{usd(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Next steps</h3>
            <p className="text-sm text-muted-foreground">Use real usage to validate assumptions, set retention, and manage ingestion flows.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/sessions" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">Sessions</Link>
            <Link href="/ingest" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">Live Ingest</Link>
            <Link href="/imports" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">Imports</Link>
            <Link href="/admin/jobs" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">Background Jobs</Link>
            <Link href="/org/retention" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">Retention</Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
        <h3 className="text-sm font-semibold">Reference & tips</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="mb-1 font-medium">ASR accuracy vs cost</div>
            <p className="text-xs text-muted-foreground">Start with your real-time provider then compare batch accuracy post-session. Consider hybrid routing for long sessions.</p>
            <Link href="/admin/metrics" className="mt-2 inline-block text-xs underline underline-offset-4">View WER & latency metrics</Link>
          </div>
          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="mb-1 font-medium">Summarization tokens</div>
            <p className="text-xs text-muted-foreground">Prompt compression and highlight-guided summarization reduce token usage by 20–50% while preserving key takeaways.</p>
            <Link href="/sessions/[sessionId]/summary" className="mt-2 inline-block text-xs underline underline-offset-4">Tune summary prompts</Link>
          </div>
          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="mb-1 font-medium">Storage controls</div>
            <p className="text-xs text-muted-foreground">Enable auto-deletion and choose formats wisely. WAV→AAC can reduce size by 80% with minimal quality loss.</p>
            <Link href="/org/settings" className="mt-2 inline-block text-xs underline underline-offset-4">Org storage settings</Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>Rates shown are examples. Always confirm your contracted pricing. This page does not call external APIs or your database; it is an estimation tool.</p>
        <p>
          Need help? Visit <Link className="underline underline-offset-4" href="/help">Help Center</Link> or review <Link className="underline underline-offset-4" href="/legal/privacy">Privacy</Link> and <Link className="underline underline-offset-4" href="/legal/terms">Terms</Link>.
        </p>
      </div>
    </div>
  );
}
