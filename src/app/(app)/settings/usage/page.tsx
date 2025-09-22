"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Usage & Limits settings page. It summarizes LLM usage costs, token consumption,
 * and warns about file size caps (20MB). It provides a sub-navigation to other settings pages and a quick link back
 * to the dashboard. Data is fetched from Supabase (usage_events, documents) for the authenticated user.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type RangeKey = "7d" | "30d" | "month";

type UsageEvent = {
  id: string;
  provider: string | null;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  unit_cost_usd: string | number | null;
  total_cost_usd: string | number | null;
  event_type: string | null;
  occurred_at: string;
};

type DocInfo = {
  id: string;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
};

const BYTES_IN_MB = 1024 * 1024;
const FILE_CAP_MB = 20;

function bytesToMB(bytes: number) {
  return bytes / BYTES_IN_MB;
}

function humanFileSize(bytes: number) {
  const mb = bytesToMB(bytes);
  return `${mb.toFixed(2)} MB`;
}

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getDateRange(key: RangeKey): { from: Date; to: Date; numDays: number; monthDays?: number; monthElapsed?: number } {
  const to = new Date();
  const end = to;
  let start = new Date();
  if (key === "7d") {
    start = new Date(end);
    start.setDate(end.getDate() - 6); // include today => span 7 days
    start.setHours(0, 0, 0, 0);
  } else if (key === "30d") {
    start = new Date(end);
    start.setDate(end.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  }
  const msPerDay = 1000 * 60 * 60 * 24;
  const numDays = Math.max(1, Math.ceil((end.setHours(0, 0, 0, 0) - start.getTime()) / msPerDay) + 1);
  if (key === "month") {
    const monthDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const monthElapsed = Math.min(monthDays, new Date().getDate());
    return { from: start, to: new Date(), numDays, monthDays, monthElapsed };
  }
  return { from: start, to: new Date(), numDays };
}

export default function UsagePage() {
  const [range, setRange] = useState<RangeKey>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAuthed, setNotAuthed] = useState(false);

  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [docs, setDocs] = useState<DocInfo[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = supabaseBrowser;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes?.user;
        if (!user) {
          if (active) setNotAuthed(true);
          return;
        }
        const { from, to } = getDateRange(range);
        const [eventsRes, docsRes] = await Promise.all([
          supabase
            .from("usage_events")
            .select(
              "id, provider, model, tokens_input, tokens_output, unit_cost_usd, total_cost_usd, occurred_at, event_type"
            )
            .eq("user_id", user.id)
            .gte("occurred_at", from.toISOString())
            .lte("occurred_at", to.toISOString())
            .order("occurred_at", { ascending: false }),
          supabase
            .from("documents")
            .select("id, original_filename, file_size_bytes, created_at")
            .eq("user_id", user.id)
            .order("file_size_bytes", { ascending: false })
            .limit(3),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (docsRes.error) throw docsRes.error;

        if (!active) return;
        setEvents((eventsRes.data as UsageEvent[]) || []);
        setDocs((docsRes.data as DocInfo[]) || []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [range]);

  const { totals, breakdown, largestDoc, nearCap } = useMemo(() => {
    let totalCost = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    const byModel = new Map<string, { cost: number; count: number }>();

    for (const ev of events) {
      const unit = ev.unit_cost_usd != null ? Number(ev.unit_cost_usd) : 0;
      const rowCost = ev.total_cost_usd != null ? Number(ev.total_cost_usd) : unit * ((ev.tokens_input || 0) + (ev.tokens_output || 0));
      totalCost += isFinite(rowCost) ? rowCost : 0;
      tokensIn += ev.tokens_input || 0;
      tokensOut += ev.tokens_output || 0;
      const key = `${ev.provider ?? "provider"}/${ev.model ?? "model"}`;
      const existing = byModel.get(key) || { cost: 0, count: 0 };
      existing.cost += isFinite(rowCost) ? rowCost : 0;
      existing.count += 1;
      byModel.set(key, existing);
    }

    const breakdown = Array.from(byModel.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 6);

    const largestDoc = docs[0];
    const nearCap = largestDoc ? bytesToMB(largestDoc.file_size_bytes) >= FILE_CAP_MB * 0.9 : false;

    return {
      totals: {
        totalCost,
        tokensIn,
        tokensOut,
        count: events.length,
      },
      breakdown,
      largestDoc,
      nearCap,
    };
  }, [events, docs]);

  const { numDays, monthDays, monthElapsed } = useMemo(() => getDateRange(range), [range]);

  const dailyAvgCost = totals.totalCost / Math.max(1, numDays);
  const monthlyForecast = range === "month" && monthDays && monthElapsed
    ? (totals.totalCost / Math.max(1, monthElapsed)) * monthDays
    : undefined;

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">사용량 & 한도</h1>
          <p className="text-sm text-muted-foreground">LLM 비용 추정치, API 토큰 사용량, 파일 업로드 한도 안내</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition"
          >
            ← 대시보드로
          </Link>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <nav className="flex items-center gap-2 text-sm">
          {[
            { href: "/settings/account", label: "계정" },
            { href: "/settings/preferences", label: "환경설정" },
            { href: "/settings/privacy", label: "프라이버시" },
            { href: "/settings/data", label: "데이터" },
            { href: "/settings/usage", label: "사용량" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 border transition",
                item.href === "/settings/usage"
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "7d", label: "최근 7일" },
            { key: "30d", label: "최근 30일" },
            { key: "month", label: "이번 달" },
          ] as { key: RangeKey; label: string }[]
        ).map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              "text-sm rounded-md px-3 py-1.5 border transition",
              range === r.key
                ? "bg-secondary text-secondary-foreground border-transparent"
                : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">표시 기간: {numDays}일</span>
      </div>

      {notAuthed && (
        <div className="mt-6">
          <Alert className="border-destructive text-destructive">
            <AlertTitle>로그인이 필요합니다</AlertTitle>
            <AlertDescription>
              이 페이지는 보호되어 있습니다. 계속하려면 <Link href="/login" className="underline underline-offset-4">로그인</Link>하세요.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {error && (
        <div className="mt-6">
          <Alert className="border-destructive text-destructive">
            <AlertTitle>오류가 발생했습니다</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-24 mt-3" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">총 비용 (추정)</div>
              <div className="mt-1 text-2xl font-semibold">{formatUSD(totals.totalCost)}</div>
              {range === "month" && monthlyForecast !== undefined && (
                <div className="mt-2 text-xs text-muted-foreground">이번 달 예측: {formatUSD(monthlyForecast)}</div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">입력 토큰</div>
              <div className="mt-1 text-2xl font-semibold">{formatNumber(totals.tokensIn)}</div>
              <div className="mt-2 text-xs text-muted-foreground">일평균: {formatNumber(Math.round(totals.tokensIn / Math.max(1, numDays)))}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">출력 토큰</div>
              <div className="mt-1 text-2xl font-semibold">{formatNumber(totals.tokensOut)}</div>
              <div className="mt-2 text-xs text-muted-foreground">일평균: {formatNumber(Math.round(totals.tokensOut / Math.max(1, numDays)))}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">총 요청 수</div>
              <div className="mt-1 text-2xl font-semibold">{formatNumber(totals.count)}</div>
              <div className="mt-2 text-xs text-muted-foreground">일평균 비용: {formatUSD(dailyAvgCost)}</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">모델별 비용 분포</h2>
            <span className="text-xs text-muted-foreground">상위 6개 모델</span>
          </div>
          <Separator className="my-3" />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : breakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground">표시할 사용 데이터가 없습니다.</div>
          ) : (
            <ul className="space-y-4">
              {breakdown.map((item) => {
                const pct = totals.totalCost > 0 ? (item.cost / totals.totalCost) * 100 : 0;
                return (
                  <li key={item.key} className="">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-medium">{item.key}</div>
                      <div className="text-muted-foreground">{formatUSD(item.cost)} · {item.count}건</div>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-secondary/40">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${pct.toFixed(2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-medium">플랜 한도</h2>
          <Separator className="my-3" />

          {/* File size cap warning */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="space-y-3">
              <Alert className={cn("border", nearCap ? "border-destructive text-destructive" : "border-amber-500/50 text-amber-600")}> 
                <AlertTitle>파일 업로드 제한: {FILE_CAP_MB}MB/파일</AlertTitle>
                <AlertDescription>
                  {largestDoc ? (
                    <>
                      현재 가장 큰 파일: <span className="font-medium">{largestDoc.original_filename}</span> ({humanFileSize(largestDoc.file_size_bytes)}). {nearCap ? "용량 상한에 매우 가깝습니다. 더 작은 파일로 나누는 것을 권장합니다." : "업로드 시 용량을 확인해 주세요."}
                    </>
                  ) : (
                    <>아직 업로드한 파일이 없습니다. 파일은 최대 {FILE_CAP_MB}MB까지 업로드 가능합니다.</>
                  )}
                </AlertDescription>
              </Alert>

              <div className="text-sm">
                <div className="font-medium mb-2">가이드</div>
                <ul className="space-y-1 text-muted-foreground list-disc pl-5">
                  <li>PDF/DOCX/PPTX/TXT/JPG/PNG 지원</li>
                  <li>대용량 파일은 분할 업로드를 권장</li>
                  <li>스캔 이미지의 경우 OCR 처리로 시간이 더 걸릴 수 있습니다</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <Link href="/upload" className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:opacity-90 transition">파일 업로드</Link>
                <Link href="/settings/data" className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition">데이터 관리</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">상세 사용 내역 요약</h2>
          <span className="text-xs text-muted-foreground">비용은 추정치이며 변동될 수 있습니다</span>
        </div>
        <Separator className="my-3" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md border border-border p-3">
              <div className="text-sm text-muted-foreground">일평균 비용</div>
              <div className="mt-1 text-lg font-semibold">{formatUSD(dailyAvgCost)}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-sm text-muted-foreground">토큰 총합</div>
              <div className="mt-1 text-lg font-semibold">{formatNumber(totals.tokensIn + totals.tokensOut)}</div>
              <div className="text-xs text-muted-foreground">입력 {formatNumber(totals.tokensIn)} · 출력 {formatNumber(totals.tokensOut)}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-sm text-muted-foreground">요청당 평균 비용</div>
              <div className="mt-1 text-lg font-semibold">{formatUSD(totals.count > 0 ? totals.totalCost / totals.count : 0)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        poiima는 공정 사용 정책을 적용합니다. 과도한 호출은 일시 제한될 수 있습니다. 보다 높은 한도나 고정 한도 설정이 필요하시면 계정 설정에서 문의해 주세요.
      </div>
    </div>
  );
}
