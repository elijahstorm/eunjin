"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Organization-wide settings page. It provides UI to manage
 * org name, allowed email domains, and SSO policy (providers and enforcement). It links
 * to related org pages like retention and security policies, and app-level integrations.
 * No server/database calls are made in this file; it persists to localStorage as a client-side
 * cache pending backend integration.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const STORAGE_KEY = "org.settings";

type OrgSettings = {
  name: string;
  domains: string[]; // allowed email domains
  sso: {
    google: boolean;
    microsoft: boolean;
    enforceSso: boolean; // require SSO for sign-in
    allowEmailPassword: boolean; // allow email/password fallback
    autoJoinByDomain: boolean; // auto-provision users with matching domain
  };
  updatedAt?: string;
};

const DEFAULTS: OrgSettings = {
  name: "",
  domains: [],
  sso: {
    google: true,
    microsoft: false,
    enforceSso: false,
    allowEmailPassword: true,
    autoJoinByDomain: true,
  },
};

const DOMAIN_RE = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

export default function OrgSettingsPage() {
  const [initial, setInitial] = useState<OrgSettings | null>(null);
  const [form, setForm] = useState<OrgSettings>(DEFAULTS);
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: OrgSettings = JSON.parse(raw);
        setForm(parsed);
        setInitial(parsed);
        setSavedAt(parsed.updatedAt ?? null);
      } else {
        setForm(DEFAULTS);
        setInitial(DEFAULTS);
      }
    } catch {
      setForm(DEFAULTS);
      setInitial(DEFAULTS);
    }
  }, []);

  const isDirty = useMemo(() => {
    if (!initial) return false;
    const a = { ...form, updatedAt: undefined } as any;
    const b = { ...initial, updatedAt: undefined } as any;
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [form, initial]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: OrgSettings = { ...form, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setInitial(payload);
      setSavedAt(payload.updatedAt ?? null);
      setShowSaved(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setShowSaved(false), 2500);
    } catch (e) {
      setError("설정 저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const onReset = useCallback(() => {
    if (!initial) return;
    setForm(initial);
    setDomainInput("");
    setError(null);
  }, [initial]);

  const addDomain = useCallback(() => {
    const candidate = domainInput.trim().toLowerCase();
    if (!candidate) return;
    if (!DOMAIN_RE.test(candidate)) {
      setError("유효한 도메인 형식이 아닙니다. 예: company.com");
      return;
    }
    if (form.domains.includes(candidate)) {
      setError("이미 추가된 도메인입니다.");
      return;
    }
    setForm((prev) => ({ ...prev, domains: [...prev.domains, candidate] }));
    setDomainInput("");
    setError(null);
  }, [domainInput, form.domains]);

  const removeDomain = useCallback((d: string) => {
    setForm((prev) => ({ ...prev, domains: prev.domains.filter((x) => x !== d) }));
  }, []);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain();
    }
  };

  if (!initial) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Separator className="my-6" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">조직 설정</h1>
        <p className="text-sm text-muted-foreground">
          조직 이름, 허용된 이메일 도메인, 그리고 SSO 정책을 관리합니다. 데이터 보존 및 보안은 각각의 페이지에서 설정할 수 있습니다.
        </p>
        <div className="flex flex-wrap gap-3 pt-2 text-sm">
          <Link href="/org" className="text-primary hover:underline">조직 개요</Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/org/members" className="text-primary hover:underline">멤버 관리</Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/org/retention" className="text-primary hover:underline">보존 정책</Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/org/security" className="text-primary hover:underline">보안 설정</Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/integrations" className="text-primary hover:underline">통합 관리</Link>
        </div>
      </header>

      {showSaved && (
        <Alert className="border-green-500/40 bg-green-500/10">
          <AlertTitle className="text-green-600">저장되었습니다</AlertTitle>
          <AlertDescription className="text-green-700">
            변경 사항이 안전하게 보관되었습니다{savedAt ? ` (${new Date(savedAt).toLocaleString()})` : ""}.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10">
          <AlertTitle className="text-destructive">오류</AlertTitle>
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <section className="rounded-lg border bg-card">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">일반</h2>
            <p className="text-sm text-muted-foreground">조직 이름을 업데이트하세요. 모든 멤버에게 표시됩니다.</p>
          </div>
          <div className="grid gap-3">
            <label htmlFor="org-name" className="text-sm font-medium">조직 이름</label>
            <input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: Sunwoo Labs"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
        </div>
        <Separator />
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">허용된 이메일 도메인</h3>
            <p className="text-sm text-muted-foreground">
              이 도메인으로 가입한 사용자는 자동으로 조직에 참여할 수 있습니다. 도메인을 추가하면 SSO 정책의 도메인 기반 제어와도 연동됩니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                inputMode="email"
                aria-label="도메인 추가"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: company.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <button
              type="button"
              onClick={addDomain}
              className={cn(
                "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                "bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              도메인 추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.domains.length === 0 && (
              <p className="text-sm text-muted-foreground">아직 추가된 도메인이 없습니다.</p>
            )}
            {form.domains.map((d) => (
              <span key={d} className="group inline-flex items-center gap-2 rounded-full border border-input bg-background px-3 py-1 text-sm">
                <span className="font-medium">{d}</span>
                <button
                  type="button"
                  aria-label={`${d} 제거`}
                  onClick={() => removeDomain(d)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10 8.586 5.707 4.293a1 1 0 1 0-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 1 0 1.414 1.414L10 11.414l4.293 4.293a1 1 0 0 0 1.414-1.414L11.414 10l4.293-4.293a1 1 0 1 0-1.414-1.414L10 8.586Z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <Alert className="border-border bg-muted/30">
            <AlertTitle className="text-foreground">도메인 팁</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              개인 이메일 도메인(gmail.com, outlook.com 등)을 추가하면 보안이 약화될 수 있습니다. 자세한 내용은 <Link href="/help" className="text-primary underline-offset-4 hover:underline">도움말</Link>을 참고하세요.
            </AlertDescription>
          </Alert>
        </div>
        <Separator />
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">SSO 정책</h3>
            <p className="text-sm text-muted-foreground">
              조직의 로그인 방식을 제어합니다. 지원되는 공급자 연결은 <Link href="/integrations" className="text-primary underline-offset-4 hover:underline">통합 관리</Link>에서 구성하세요.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <ToggleCard
              title="Google SSO 허용"
              description="Google 계정을 사용하여 로그인 허용"
              checked={form.sso.google}
              onCheckedChange={(v) => setForm((p) => ({ ...p, sso: { ...p.sso, google: v } }))}
            />
            <ToggleCard
              title="Microsoft SSO 허용"
              description="Microsoft 계정을 사용하여 로그인 허용"
              checked={form.sso.microsoft}
              onCheckedChange={(v) => setForm((p) => ({ ...p, sso: { ...p.sso, microsoft: v } }))}
            />
            <ToggleCard
              title="SSO 강제 적용"
              description="조직 멤버는 반드시 SSO로 로그인해야 합니다"
              checked={form.sso.enforceSso}
              onCheckedChange={(v) => setForm((p) => ({ ...p, sso: { ...p.sso, enforceSso: v } }))}
            />
            <ToggleCard
              title="이메일/비밀번호 허용"
              description="SSO 외 전통적인 로그인 허용 (권장하지 않음)"
              checked={form.sso.allowEmailPassword}
              onCheckedChange={(v) => setForm((p) => ({ ...p, sso: { ...p.sso, allowEmailPassword: v } }))}
            />
            <ToggleCard
              title="도메인 자동 가입"
              description="허용된 도메인의 신규 사용자를 자동으로 조직에 프로비저닝"
              checked={form.sso.autoJoinByDomain}
              onCheckedChange={(v) => setForm((p) => ({ ...p, sso: { ...p.sso, autoJoinByDomain: v } }))}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1">
              <li>SSO 강제를 사용하는 경우, 이메일/비밀번호 로그인이 자동으로 비활성화되는 것을 권장합니다.</li>
              <li>허용된 도메인에만 자동 가입이 적용됩니다. 도메인이 없다면 <span className="font-medium text-foreground">도메인 섹션</span>에서 먼저 추가하세요.</li>
              <li>
                공급자 연결 상태를 확인하고 문제를 해결하려면 <Link href="/integrations" className="text-primary underline-offset-4 hover:underline">통합</Link>,
                <span> </span>
                <Link href="/integrations/zoom" className="text-primary underline-offset-4 hover:underline">Zoom</Link>,
                <span> </span>
                <Link href="/integrations/teams" className="text-primary underline-offset-4 hover:underline">Microsoft Teams</Link> 페이지를 방문하세요.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="text-xs text-muted-foreground">
          {savedAt ? (
            <span>마지막 저장: {new Date(savedAt).toLocaleString()}</span>
          ) : (
            <span>아직 저장되지 않음</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!isDirty || saving}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
              "bg-secondary text-secondary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              (!isDirty || saving) && "opacity-50 cursor-not-allowed"
            )}
          >
            변경 취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || saving}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              (!isDirty || saving) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? "저장 중..." : "변경 사항 저장"}
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">관련 설정 바로가기</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            title="멤버 관리"
            description="역할 및 초대를 관리"
            href="/org/members"
          />
          <QuickLinkCard
            title="보존 정책"
            description="데이터 보관 기간 및 삭제 정책"
            href="/org/retention"
          />
          <QuickLinkCard
            title="보안 설정"
            description="2FA, 세션 제한, 접근 제어"
            href="/org/security"
          />
          <QuickLinkCard
            title="통합 관리"
            description="Zoom · Teams 등 외부 서비스 연동"
            href="/integrations"
          />
        </div>
      </section>
    </main>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium">
          {title}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <div className="h-6 w-11 rounded-full bg-muted ring-1 ring-inset ring-border transition-colors peer-checked:bg-primary" />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

function QuickLinkCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-4",
        "transition-colors hover:border-primary/50"
      )}
    >
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="mt-6 inline-flex items-center gap-1 text-xs text-primary">
        이동하기
        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 10a.75.75 0 0 1 .75-.75h6.638L10.23 7.292a.75.75 0 1 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.158-2.158H5.75A.75.75 0 0 1 5 10Z" />
        </svg>
      </div>
    </Link>
  );
}
