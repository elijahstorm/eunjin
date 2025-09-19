"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Organization Security & Compliance page, allowing admins to configure
 * consent defaults, access policies, and export restrictions for their org. It persists settings locally for a
 * responsive, client-only experience and links to related pages (/consent, /org/settings, /org/retention, etc.).
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type SessionVisibility = "org" | "invited" | "private";
type DefaultRole = "viewer" | "editor" | "owner";
type ExportFormat = "pdf" | "txt" | "docx" | "json";

interface SecuritySettings {
  requireRecordingConsent: boolean;
  requireConsentOnUpload: boolean;
  sessionVisibility: SessionVisibility;
  allowGuestAccess: boolean;
  defaultAccessRole: DefaultRole;
  allowDownloads: boolean;
  allowPublicShareLinks: boolean;
  requireShareExpiry: boolean;
  shareExpiryDays: number;
  watermarkExports: boolean;
  allowedExportFormats: ExportFormat[];
  disableAllExternalExports: boolean;
}

const STORAGE_KEY = "orgSecuritySettings";

const DEFAULT_SETTINGS: SecuritySettings = {
  requireRecordingConsent: true,
  requireConsentOnUpload: true,
  sessionVisibility: "org",
  allowGuestAccess: false,
  defaultAccessRole: "viewer",
  allowDownloads: true,
  allowPublicShareLinks: true,
  requireShareExpiry: true,
  shareExpiryDays: 14,
  watermarkExports: true,
  allowedExportFormats: ["pdf", "txt", "docx"],
  disableAllExternalExports: false,
};

function loadSettings(): SecuritySettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SecuritySettings>;
    // Basic, safe merge to ensure new fields get defaults
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(value: SecuritySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        "bg-secondary text-secondary-foreground border-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}

function SectionCard({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default function OrgSecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setSavedSettings(loaded);
  }, []);

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  const effective = useMemo(() => {
    if (settings.disableAllExternalExports) {
      return {
        ...settings,
        allowDownloads: false,
        allowPublicShareLinks: false,
      };
    }
    return settings;
  }, [settings]);

  function update<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function toggle<K extends keyof SecuritySettings>(key: K) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] as any }));
  }

  function onSave(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSuccess(null);

    if (effective.requireShareExpiry && (!effective.shareExpiryDays || effective.shareExpiryDays < 1)) {
      setError("링크 만료일은 1일 이상이어야 합니다.");
      return;
    }

    setSaving(true);
    try {
      const toPersist: SecuritySettings = {
        ...settings,
        // Persist the explicit disable flag and the current choices as chosen
        // (actual enforcement is derived via `effective` in runtime)
      };
      saveSettings(toPersist);
      setSavedSettings(toPersist);
      setSavedAt(new Date());
      setSuccess("보안 설정이 저장되었습니다.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError("설정을 저장하는 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    const ok = window.confirm("모든 설정을 기본값으로 되돌리시겠어요? 이 작업은 되돌릴 수 없습니다.");
    if (!ok) return;
    setSettings(DEFAULT_SETTINGS);
    setSavedSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSavedAt(new Date());
    setSuccess("기본값으로 초기화되었습니다.");
    setTimeout(() => setSuccess(null), 3000);
  }

  const exportFormats: ExportFormat[] = ["pdf", "txt", "docx", "json"];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <nav className="text-sm text-muted-foreground">
          <Link href="/org" className="hover:underline">조직</Link>
          <span className="mx-2">/</span>
          <Link href="/org/settings" className="hover:underline">설정</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">보안 · 컴플라이언스</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">보안 · 컴플라이언스</h1>
        <p className="text-muted-foreground">녹음 동의, 접근 정책, 내보내기 제한을 구성합니다. 조직 전반에 즉시 적용됩니다.</p>
      </div>

      {error ? (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTitle>저장 실패</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert className="border-green-600/40 bg-green-600/10">
          <AlertTitle>완료</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={onSave} className="space-y-6">
        <SectionCard
          title="동의(Consent) 기본값"
          description="법적 준수와 사용자 프라이버시를 위해 세션 시작 전 동의 수집을 강제할 수 있습니다."
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <label htmlFor="requireRecordingConsent" className="font-medium">세션 시작 전 녹음 동의 필요</label>
                <p className="text-sm text-muted-foreground">모든 회의/강의가 시작되기 전에 참가자 동의 수집 UI를 표시합니다.</p>
              </div>
              <button
                type="button"
                id="requireRecordingConsent"
                onClick={() => toggle("requireRecordingConsent")}
                className={cn(
                  "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                  settings.requireRecordingConsent ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                )}
                aria-pressed={settings.requireRecordingConsent}
              >
                <span
                  className={cn(
                    "inline-block h-7 w-7 transform rounded-full bg-card shadow ring-0 transition",
                    settings.requireRecordingConsent ? "translate-x-8" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <label htmlFor="requireConsentOnUpload" className="font-medium">업로드 녹음도 동의 확인</label>
                <p className="text-sm text-muted-foreground">외부에서 가져온 녹음 파일(Zoom/Teams 포함)에 대해서도 동의 확인을 강제합니다.</p>
              </div>
              <button
                type="button"
                id="requireConsentOnUpload"
                onClick={() => toggle("requireConsentOnUpload")}
                className={cn(
                  "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                  settings.requireConsentOnUpload ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                )}
                aria-pressed={settings.requireConsentOnUpload}
              >
                <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", settings.requireConsentOnUpload ? "translate-x-8" : "translate-x-1")} />
              </button>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">기본 동의서 템플릿</p>
                <p className="text-sm text-muted-foreground">조직의 표준 템플릿을 생성하거나 선택하세요. 세션마다 자동 적용됩니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/consent/new" className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">새 템플릿 만들기</Link>
                <Link href="/consent" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">동의서 관리</Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="접근 정책"
          description="세션과 문서에 대한 접근 범위와 기본 권한을 정의합니다."
        >
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="font-medium">세션 기본 공개 범위</label>
                <div className="grid gap-2">
                  {(
                    [
                      { key: "org", label: "조직 전체", desc: "조직 구성원 누구나 검색 및 열람 가능" },
                      { key: "invited", label: "초대된 사용자", desc: "명시적으로 초대한 사용자만" },
                      { key: "private", label: "개인 전용", desc: "작성자만 열람 가능 (권장: 민감 회의)" },
                    ] as { key: SessionVisibility; label: string; desc: string }[]
                  ).map((opt) => (
                    <label key={opt.key} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", settings.sessionVisibility === opt.key ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-muted/30")}
                    >
                      <input
                        type="radio"
                        name="sessionVisibility"
                        className="mt-1 h-4 w-4"
                        checked={settings.sessionVisibility === opt.key}
                        onChange={() => update("sessionVisibility", opt.key)}
                      />
                      <span>
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-medium">기본 접근 역할</label>
                <select
                  value={settings.defaultAccessRole}
                  onChange={(e) => update("defaultAccessRole", e.target.value as DefaultRole)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="viewer">Viewer (읽기만)</option>
                  <option value="editor">Editor (편집 가능)</option>
                  <option value="owner">Owner (관리 권한)</option>
                </select>
                <p className="text-sm text-muted-foreground">신규 세션/문서에 부여될 기본 권한 레벨입니다.</p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <label htmlFor="allowGuestAccess" className="font-medium">게스트(외부 이메일) 초대 허용</label>
                <p className="text-sm text-muted-foreground">조직 외부 사용자를 특정 세션에 한해 초대할 수 있습니다.</p>
              </div>
              <button
                type="button"
                id="allowGuestAccess"
                onClick={() => toggle("allowGuestAccess")}
                className={cn(
                  "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                  settings.allowGuestAccess ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                )}
                aria-pressed={settings.allowGuestAccess}
              >
                <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", settings.allowGuestAccess ? "translate-x-8" : "translate-x-1")} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/org/members" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">구성원 및 역할 관리</Link>
              <Link href="/sessions" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">세션 목록 보기</Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="내보내기 제한"
          description="조직 외부로의 유출을 통제하기 위해 다운로드 및 공유 링크 정책을 구성합니다."
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <label htmlFor="disableAllExternalExports" className="font-medium">외부 내보내기 전면 금지</label>
                <p className="text-sm text-muted-foreground">다운로드와 공개 링크를 모두 비활성화합니다.</p>
              </div>
              <button
                type="button"
                id="disableAllExternalExports"
                onClick={() => {
                  const next = !settings.disableAllExternalExports;
                  if (next) {
                    const ok = window.confirm("외부 내보내기를 전면 금지하시겠습니까? 모든 공유 링크와 다운로드가 차단됩니다.");
                    if (!ok) return;
                  }
                  update("disableAllExternalExports", next);
                }}
                className={cn(
                  "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                  settings.disableAllExternalExports ? "bg-destructive text-destructive-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                )}
                aria-pressed={settings.disableAllExternalExports}
              >
                <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", settings.disableAllExternalExports ? "translate-x-8" : "translate-x-1")} />
              </button>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              <div className={cn(settings.disableAllExternalExports && "opacity-50 pointer-events-none")}> 
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="allowDownloads" className="font-medium">다운로드 허용</label>
                      <p className="text-sm text-muted-foreground">PDF/TXT/DOCX 등 파일 다운로드를 허용합니다.</p>
                    </div>
                    <button
                      type="button"
                      id="allowDownloads"
                      onClick={() => toggle("allowDownloads")}
                      className={cn(
                        "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                        effective.allowDownloads ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                      )}
                      aria-pressed={effective.allowDownloads}
                    >
                      <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", effective.allowDownloads ? "translate-x-8" : "translate-x-1")} />
                    </button>
                  </div>

                  <div>
                    <p className="mb-2 font-medium">허용 파일 형식</p>
                    <div className="flex flex-wrap gap-2">
                      {exportFormats.map((fmt) => {
                        const active = settings.allowedExportFormats.includes(fmt);
                        return (
                          <button
                            type="button"
                            key={fmt}
                            onClick={() => {
                              setSettings((prev) => {
                                const set = new Set(prev.allowedExportFormats);
                                if (set.has(fmt)) set.delete(fmt); else set.add(fmt);
                                return { ...prev, allowedExportFormats: Array.from(set) as ExportFormat[] };
                              });
                            }}
                            className={cn(
                              "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium",
                              active ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-accent hover:text-accent-foreground"
                            )}
                            aria-pressed={active}
                          >
                            {fmt.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="watermarkExports" className="font-medium">워터마크 적용</label>
                      <p className="text-sm text-muted-foreground">내보낸 문서에 조직명/생성일을 워터마크로 추가합니다.</p>
                    </div>
                    <button
                      type="button"
                      id="watermarkExports"
                      onClick={() => toggle("watermarkExports")}
                      className={cn(
                        "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                        settings.watermarkExports ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                      )}
                      aria-pressed={settings.watermarkExports}
                    >
                      <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", settings.watermarkExports ? "translate-x-8" : "translate-x-1")} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={cn(settings.disableAllExternalExports && "opacity-50 pointer-events-none")}> 
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="allowPublicShareLinks" className="font-medium">공개(또는 비공개) 링크 공유 허용</label>
                      <p className="text-sm text-muted-foreground">링크 기반 공유를 허용합니다. 필요 시 만료 기한을 강제합니다.</p>
                    </div>
                    <button
                      type="button"
                      id="allowPublicShareLinks"
                      onClick={() => toggle("allowPublicShareLinks")}
                      className={cn(
                        "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                        effective.allowPublicShareLinks ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                      )}
                      aria-pressed={effective.allowPublicShareLinks}
                    >
                      <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", effective.allowPublicShareLinks ? "translate-x-8" : "translate-x-1")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="requireShareExpiry" className="font-medium">링크 만료 강제</label>
                      <p className="text-sm text-muted-foreground">공유 링크는 자동으로 만료됩니다.</p>
                    </div>
                    <button
                      type="button"
                      id="requireShareExpiry"
                      onClick={() => toggle("requireShareExpiry")}
                      className={cn(
                        "relative inline-flex h-9 w-16 items-center rounded-full border transition",
                        settings.requireShareExpiry ? "bg-primary text-primary-foreground border-transparent" : "bg-muted text-muted-foreground border-border"
                      )}
                      aria-pressed={settings.requireShareExpiry}
                    >
                      <span className={cn("inline-block h-7 w-7 transform rounded-full bg-card shadow transition", settings.requireShareExpiry ? "translate-x-8" : "translate-x-1")} />
                    </button>
                  </div>
                  <div className={cn("grid items-center gap-2", !settings.requireShareExpiry && "opacity-50")}> 
                    <label htmlFor="shareExpiryDays" className="text-sm text-muted-foreground">만료일(일)</label>
                    <input
                      id="shareExpiryDays"
                      type="number"
                      min={1}
                      value={settings.shareExpiryDays}
                      onChange={(e) => update("shareExpiryDays", Math.max(1, Number(e.target.value || 1)))}
                      className="w-40 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={!settings.requireShareExpiry}
                    />
                  </div>

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="text-sm font-medium text-primary hover:underline">고급 규칙 보기</button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        - 링크 접근 시 로그인 강제는 세션 설정에서 개별 지정 가능합니다.
                        <br />- 대량 공유 감지 시 자동 차단 정책은 관리자 페이지에서 구성하세요. {" "}
                        <Link href="/admin" className="text-primary hover:underline">관리자 콘솔</Link>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">정책 미리보기</p>
              <div className="flex flex-wrap gap-2">
                <Badge>다운로드: {effective.disableAllExternalExports ? "차단" : effective.allowDownloads ? "허용" : "차단"}</Badge>
                <Badge>공유 링크: {effective.disableAllExternalExports ? "차단" : effective.allowPublicShareLinks ? "허용" : "차단"}</Badge>
                <Badge>만료: {effective.requireShareExpiry ? `${effective.shareExpiryDays}일` : "없음"}</Badge>
                <Badge>워터마크: {effective.watermarkExports ? "적용" : "미적용"}</Badge>
                <Badge>형식: {effective.allowedExportFormats.map((f) => f.toUpperCase()).join(", ") || "없음"}</Badge>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="보존 · 삭제 정책"
          description="기록물의 보존기간과 자동 삭제 정책을 설정하여 비용과 규정을 동시에 관리하세요."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">보존 정책은 세션/문서에 일괄 적용됩니다. 민감 데이터의 자동 삭제를 권장합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/org/retention" className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">보존 정책 설정</Link>
              <Link href="/share/summary/preview" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">샘플 출력 미리보기</Link>
            </div>
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {savedAt ? (
              <span>최근 저장: {savedAt.toLocaleString()}</span>
            ) : (
              <span>아직 저장되지 않았습니다.</span>
            )}
            {isDirty ? <span className="ml-2 text-amber-600">수정 사항이 있습니다</span> : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/70"
            >
              기본값으로 재설정
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className={cn(
                "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow",
                isDirty && !saving ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
              )}
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="연동 및 거버넌스">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">회의 서비스 연동</p>
                <p className="text-sm text-muted-foreground">Zoom/Teams 계정과 연동해 녹음을 자동 수집합니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/integrations/zoom" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Zoom</Link>
                <Link href="/integrations/teams" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Teams</Link>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">조직 설정</p>
                <p className="text-sm text-muted-foreground">브랜딩, 도메인 제한, SSO 등 고급 설정을 관리합니다.</p>
              </div>
              <Link href="/org/settings" className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">조직 설정</Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="정책 · 문서">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">개인정보 처리방침</p>
                <p className="text-sm text-muted-foreground">데이터 수집·이용에 대한 약관을 확인하세요.</p>
              </div>
              <Link href="/legal/privacy" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Privacy</Link>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">서비스 이용약관</p>
                <p className="text-sm text-muted-foreground">서비스 사용 시 적용되는 규정을 확인하세요.</p>
              </div>
              <Link href="/legal/terms" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Terms</Link>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">도움말 센터</p>
                <p className="text-sm text-muted-foreground">구성 및 모범 사례 가이드를 확인하세요.</p>
              </div>
              <Link href="/help" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Help</Link>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="빠른 이동">
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">대시보드</Link>
          <Link href="/sessions/new" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">새 세션 시작</Link>
          <Link href="/consent" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">Consent 센터</Link>
          <Link href="/settings/profile" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">내 프로필</Link>
          <Link href="/settings/notifications" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">알림 설정</Link>
          <Link href="/settings/devices" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">장치 관리</Link>
        </div>
      </SectionCard>
    </main>
  );
}
