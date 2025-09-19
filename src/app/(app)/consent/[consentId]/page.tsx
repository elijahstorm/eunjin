"use client";

/**
 * CODE INSIGHT
 * This code's use case is a consent template detail and editor page that supports local revision history,
 * live preview with variable substitution, and links to distribute/share the template. It avoids server/database
 * calls (no schema provided) and persists to localStorage for reliability, providing a production-ready UX within
 * the existing app layout.
 */

import React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type PageProps = { params: { consentId: string } };

type TemplateVariable = {
  key: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
};

type ConsentTemplate = {
  id: string;
  title: string;
  language: string;
  body: string;
  variables: TemplateVariable[];
  flags: {
    requireRecording: boolean;
    requireTranscription: boolean;
    requireThirdParty: boolean;
    allowDataRetention: boolean;
  };
  createdAt: number;
  updatedAt: number;
};

type Revision = {
  id: string;
  at: number;
  message?: string;
  snapshot: ConsentTemplate;
};

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function sanitizeVarKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function replaceVariables(text: string, vars: TemplateVariable[]) {
  let result = text;
  for (const v of vars) {
    const re = new RegExp(`\\{\\{\\s*${v.key}\\s*\\}}`, "gi");
    result = result.replace(re, v.defaultValue ?? "");
  }
  return result;
}

function simpleDiffLines(a: string, b: string) {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  const diff: { type: "same" | "+" | "-"; text: string }[] = [];
  const setA = new Set(aLines);
  const setB = new Set(bLines);
  for (let i = 0; i < max; i++) {
    const al = aLines[i];
    const bl = bLines[i];
    if (al === bl) {
      if (al !== undefined) diff.push({ type: "same", text: al });
      continue;
    }
    if (al !== undefined && !setB.has(al)) diff.push({ type: "-", text: al });
    if (bl !== undefined && !setA.has(bl)) diff.push({ type: "+", text: bl });
  }
  return diff;
}

export default function ConsentTemplatePage({ params }: PageProps) {
  const consentId = params.consentId;
  const tKey = `consent:template:${consentId}`;
  const rKey = `consent:revisions:${consentId}`;

  const [loading, setLoading] = React.useState(true);
  const [template, setTemplate] = React.useState<ConsentTemplate | null>(null);
  const [revisions, setRevisions] = React.useState<Revision[]>([]);
  const [message, setMessage] = React.useState("");
  const [selectedRevisionId, setSelectedRevisionId] = React.useState<string | null>(null);
  const [showFlags, setShowFlags] = React.useState(true);
  const [showVariables, setShowVariables] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(true);
  const [showDiff, setShowDiff] = React.useState(false);

  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    try {
      const rawT = localStorage.getItem(tKey);
      const rawR = localStorage.getItem(rKey);
      if (rawT) {
        setTemplate(JSON.parse(rawT));
      } else {
        const initial: ConsentTemplate = {
          id: consentId,
          title: "기본 동의서 템플릿",
          language: "ko",
          body:
            `다음 항목에 동의해 주십시오.\n\n- 녹음 동의: {{recording_consent}}\n- 전사 및 처리 동의: {{transcription_consent}}\n- 제3자 서비스 이용 동의: {{third_party_consent}}\n- 보존 기간 정책 확인: {{retention_ack}}\n\n이 동의서는 회의/강의 기록 및 요약 생성 목적을 위해 사용됩니다.\n참여자: {{participant_name}}\n일시: {{session_date}}` ,
          variables: [
            { key: "participant_name", label: "참여자 이름", defaultValue: "홍길동", required: true },
            { key: "session_date", label: "일시", defaultValue: new Date().toLocaleString(), required: true },
            { key: "recording_consent", label: "녹음 동의", defaultValue: "동의", required: true },
            { key: "transcription_consent", label: "전사/처리 동의", defaultValue: "동의", required: true },
            { key: "third_party_consent", label: "제3자 서비스 이용 동의", defaultValue: "동의", required: true },
            { key: "retention_ack", label: "보존 정책 확인", defaultValue: "확인", required: true },
          ],
          flags: {
            requireRecording: true,
            requireTranscription: true,
            requireThirdParty: false,
            allowDataRetention: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setTemplate(initial);
        localStorage.setItem(tKey, JSON.stringify(initial));
      }
      if (rawR) {
        setRevisions(JSON.parse(rawR));
      }
    } catch {}
    setLoading(false);
  }, [tKey, rKey, consentId]);

  // Persist on each change for reliability
  React.useEffect(() => {
    if (!template) return;
    try {
      localStorage.setItem(tKey, JSON.stringify(template));
    } catch {}
  }, [template, tKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(rKey, JSON.stringify(revisions));
    } catch {}
  }, [revisions, rKey]);

  const lastRevision = React.useMemo(() => {
    if (!revisions.length) return null;
    return [...revisions].sort((a, b) => b.at - a.at)[0];
  }, [revisions]);

  const hasUnrevisedChanges = React.useMemo(() => {
    if (!template) return false;
    if (!lastRevision) return true; // if no revision, current is unrevised
    return template.updatedAt > lastRevision.at;
  }, [template, lastRevision]);

  React.useEffect(() => {
    const onSaveHotkey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRevision();
      }
    };
    window.addEventListener("keydown", onSaveHotkey);
    return () => window.removeEventListener("keydown", onSaveHotkey);
  });

  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnrevisedChanges) {
        e.preventDefault();
        e.returnValue = "변경사항이 저장되지 않았습니다.";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnrevisedChanges]);

  const updateTemplate = (updater: (prev: ConsentTemplate) => ConsentTemplate) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      return { ...next, updatedAt: Date.now() };
    });
  };

  const addVariable = () => {
    if (!template) return;
    const baseKey = sanitizeVarKey(`var_${template.variables.length + 1}`);
    updateTemplate((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        { key: baseKey, label: `변수 ${prev.variables.length + 1}`, defaultValue: "", required: false },
      ],
    }));
  };

  const removeVariable = (key: string) => {
    updateTemplate((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v.key !== key),
    }));
  };

  const updateVariable = (key: string, patch: Partial<TemplateVariable>) => {
    updateTemplate((prev) => ({
      ...prev,
      variables: prev.variables.map((v) => (v.key === key ? { ...v, ...patch, key: sanitizeVarKey(patch.key ?? v.key) } : v)),
    }));
  };

  const insertVariableAtCursor = (vKey: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const insert = `{{${vKey}}}`;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newVal = el.value.slice(0, start) + insert + el.value.slice(end);
    updateTemplate((prev) => ({ ...prev, body: newVal }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const saveRevision = async () => {
    if (!template) return;
    const rev: Revision = { id: uid("rev"), at: Date.now(), message: message.trim() || undefined, snapshot: template };
    setRevisions((prev) => [rev, ...prev]);
    setMessage("");
  };

  const restoreRevision = (rev: Revision) => {
    setTemplate({ ...rev.snapshot, updatedAt: Date.now() });
  };

  const selectedRevision = React.useMemo(
    () => revisions.find((r) => r.id === selectedRevisionId) || null,
    [revisions, selectedRevisionId]
  );

  const previewText = React.useMemo(() => {
    if (!template) return "";
    let txt = template.body;
    // Respect flags by injecting hints for preview
    const annotations: string[] = [];
    if (template.flags.requireRecording) annotations.push("[녹음 동의 필요]");
    if (template.flags.requireTranscription) annotations.push("[전사/처리 동의 필요]");
    if (template.flags.requireThirdParty) annotations.push("[제3자 처리 동의 필요]");
    if (template.flags.allowDataRetention) annotations.push("[보존 정책 적용]");
    const header = annotations.length ? annotations.join(" ") + "\n\n" : "";
    txt = header + txt;
    return replaceVariables(txt, template.variables);
  }, [template]);

  const exportJSON = () => {
    const payload = { template, revisions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consent_${consentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importRef = React.useRef<HTMLInputElement | null>(null);
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.template && parsed.template.id && parsed.revisions) {
          setTemplate(parsed.template);
          setRevisions(parsed.revisions);
        }
      } catch {}
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        <nav className="text-sm text-muted-foreground flex items-center gap-2">
          <Link href="/dashboard" className="hover:underline">대시보드</Link>
          <span>/</span>
          <Link href="/consent" className="hover:underline">동의서</Link>
          <span>/</span>
          <span className="text-foreground">템플릿 상세</span>
        </nav>

        <div className="rounded-lg border bg-card p-4 sm:p-6">
          {loading || !template ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold tracking-tight">{template.title}</h1>
                  <p className="text-sm text-muted-foreground">템플릿 ID: {template.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/consent/${encodeURIComponent(consentId)}/share`}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
                  >
                    배포/공유
                  </Link>
                  <button
                    onClick={saveRevision}
                    className={cn(
                      "inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow hover:opacity-90",
                      hasUnrevisedChanges ? "ring-2 ring-accent" : ""
                    )}
                    title="현재 변경사항으로 리비전 저장 (Ctrl/Cmd+S)"
                  >
                    리비전 저장
                  </button>
                  <button
                    onClick={exportJSON}
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    내보내기(JSON)
                  </button>
                  <button
                    onClick={() => importRef.current?.click()}
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    가져오기
                  </button>
                  <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-6">
                  <Alert className="bg-muted/40">
                    <AlertTitle>로컬 자동 저장</AlertTitle>
                    <AlertDescription>
                      이 템플릿은 브라우저에 자동 저장됩니다. 리비전 저장을 통해 변경 이력을 관리하세요. 배포는 "배포/공유"에서 링크를 생성하세요.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border bg-card p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium">제목</label>
                        <input
                          value={template.title}
                          onChange={(e) => updateTemplate((prev) => ({ ...prev, title: e.target.value }))}
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                          placeholder="템플릿 제목"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">언어</label>
                        <select
                          value={template.language}
                          onChange={(e) => updateTemplate((prev) => ({ ...prev, language: e.target.value }))}
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="ko">한국어</option>
                          <option value="en">English</option>
                          <option value="ja">日本語</option>
                          <option value="zh">中文</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium">본문</label>
                      <div className="mt-1 rounded-md border bg-background">
                        <div className="flex flex-wrap items-center gap-2 border-b p-2">
                          <div className="text-xs text-muted-foreground">변수 삽입:</div>
                          {template.variables.map((v) => (
                            <button
                              key={v.key}
                              onClick={() => insertVariableAtCursor(v.key)}
                              className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:opacity-90"
                              title={`삽입: {{${v.key}}}`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          ref={bodyRef}
                          value={template.body}
                          onChange={(e) => updateTemplate((prev) => ({ ...prev, body: e.target.value }))}
                          className="h-64 w-full resize-y bg-transparent p-3 font-mono text-sm outline-none"
                          placeholder="템플릿 본문을 입력하고 {{variable_key}} 형식으로 변수를 참조하세요."
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Tip: Ctrl/Cmd+S 로 리비전 저장</p>
                    </div>
                  </div>

                  <Collapsible open={showVariables} onOpenChange={setShowVariables}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium">변수 관리</h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={addVariable}
                          className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:opacity-90"
                        >
                          변수 추가
                        </button>
                        <CollapsibleTrigger asChild>
                          <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">{showVariables ? "접기" : "펼치기"}</button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-3 space-y-3">
                        {template.variables.length === 0 && (
                          <div className="text-sm text-muted-foreground">변수가 없습니다. 변수를 추가하여 맞춤 정보를 삽입하세요.</div>
                        )}
                        {template.variables.map((v) => (
                          <div key={v.key} className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-12">
                            <div className="sm:col-span-3">
                              <label className="block text-xs text-muted-foreground">Key</label>
                              <input
                                value={v.key}
                                onChange={(e) => updateVariable(v.key, { key: e.target.value })}
                                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-xs text-muted-foreground">Label</label>
                              <input
                                value={v.label}
                                onChange={(e) => updateVariable(v.key, { label: e.target.value })}
                                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <label className="block text-xs text-muted-foreground">기본값</label>
                              <input
                                value={v.defaultValue ?? ""}
                                onChange={(e) => updateVariable(v.key, { defaultValue: e.target.value })}
                                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            <div className="sm:col-span-1 flex items-end">
                              <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={!!v.required}
                                  onChange={(e) => updateVariable(v.key, { required: e.target.checked })}
                                  className="h-4 w-4"
                                />
                                필수
                              </label>
                            </div>
                            <div className="sm:col-span-1 flex items-end justify-end gap-2">
                              <button
                                onClick={() => insertVariableAtCursor(v.key)}
                                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                              >
                                본문삽입
                              </button>
                              <button
                                onClick={() => removeVariable(v.key)}
                                className="rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground hover:opacity-90"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={showFlags} onOpenChange={setShowFlags}>
                    <div className="mt-2 flex items-center justify-between">
                      <h2 className="text-sm font-medium">동의 항목 및 정책</h2>
                      <CollapsibleTrigger asChild>
                        <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">{showFlags ? "접기" : "펼치기"}</button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border p-4 sm:grid-cols-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={template.flags.requireRecording}
                            onChange={(e) => updateTemplate((prev) => ({
                              ...prev,
                              flags: { ...prev.flags, requireRecording: e.target.checked },
                            }))}
                            className="h-4 w-4"
                          />
                          녹음 동의 필수
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={template.flags.requireTranscription}
                            onChange={(e) => updateTemplate((prev) => ({
                              ...prev,
                              flags: { ...prev.flags, requireTranscription: e.target.checked },
                            }))}
                            className="h-4 w-4"
                          />
                          전사/처리 동의 필수
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={template.flags.requireThirdParty}
                            onChange={(e) => updateTemplate((prev) => ({
                              ...prev,
                              flags: { ...prev.flags, requireThirdParty: e.target.checked },
                            }))}
                            className="h-4 w-4"
                          />
                          제3자 처리 동의 필수
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={template.flags.allowDataRetention}
                            onChange={(e) => updateTemplate((prev) => ({
                              ...prev,
                              flags: { ...prev.flags, allowDataRetention: e.target.checked },
                            }))}
                            className="h-4 w-4"
                          />
                          보존 정책 적용
                        </label>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                    <div className="mt-2 flex items-center justify-between">
                      <h2 className="text-sm font-medium">리비전 히스토리</h2>
                      <CollapsibleTrigger asChild>
                        <button className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">{showHistory ? "접기" : "펼치기"}</button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-3 rounded-md border">
                        <div className="flex items-center justify-between gap-3 border-b p-3">
                          <div className="text-sm text-muted-foreground">
                            {revisions.length ? `총 ${revisions.length}개 리비전` : "리비전이 없습니다. 변경사항을 저장해 보세요."}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="변경 메시지(선택)"
                              className="w-48 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button
                              onClick={saveRevision}
                              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90"
                            >
                              리비전 저장
                            </button>
                          </div>
                        </div>
                        <div className="max-h-72 overflow-auto p-2">
                          {revisions.map((rev) => (
                            <div key={rev.id} className={cn("rounded-md p-3 transition", selectedRevisionId === rev.id ? "bg-muted" : "hover:bg-muted/60") }>
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="text-sm font-medium">{rev.message || "리비전 저장"}</div>
                                  <div className="text-xs text-muted-foreground">{formatDate(rev.at)}</div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 sm:mt-0">
                                  <button
                                    onClick={() => { setSelectedRevisionId(rev.id); setShowDiff(true); }}
                                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                                  >
                                    비교
                                  </button>
                                  <button
                                    onClick={() => restoreRevision(rev)}
                                    className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
                                  >
                                    이 버전으로 복원
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {showDiff && selectedRevision && template && (
                          <div className="border-t p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-sm font-medium">리비전 비교 보기</div>
                              <button onClick={() => setShowDiff(false)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">닫기</button>
                            </div>
                            <div className="rounded-md border bg-background p-3 font-mono text-xs">
                              {simpleDiffLines(selectedRevision.snapshot.body, template.body).map((line, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    line.type === "+" && "bg-green-500/10 text-green-700 dark:text-green-300",
                                    line.type === "-" && "bg-red-500/10 text-red-700 dark:text-red-300",
                                    line.type === "same" && "text-muted-foreground"
                                  )}
                                >
                                  {line.type === "+" ? "+ " : line.type === "-" ? "- " : "  "}
                                  {line.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-medium">미리보기</h2>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/consent/${encodeURIComponent(consentId)}/share`}
                          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                        >
                          공유 페이지 열기
                        </Link>
                        <button
                          onClick={async () => {
                            const url = `${window.location.origin}/consent/${encodeURIComponent(consentId)}/share`;
                            await navigator.clipboard.writeText(url);
                          }}
                          className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:opacity-90"
                        >
                          링크 복사
                        </button>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="rounded-md border bg-background p-4">
                      <div className="prose max-w-none text-sm leading-6">
                        {previewText.split("\n").map((l, i) => (
                          <p key={i} className="mb-2 whitespace-pre-wrap">{l}</p>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">마커 형식 {{variable_key}} 은 배포 시 실제 값으로 치환됩니다.</div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-medium">워크플로 바로가기</h3>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <Link href="/sessions/new" className="rounded-md border p-3 hover:bg-muted">새 세션 시작</Link>
                      <Link href="/sessions" className="rounded-md border p-3 hover:bg-muted">세션 목록</Link>
                      <Link href="/integrations/zoom" className="rounded-md border p-3 hover:bg-muted">Zoom 연동</Link>
                      <Link href="/integrations/teams" className="rounded-md border p-3 hover:bg-muted">Teams 연동</Link>
                      <Link href="/org/security" className="rounded-md border p-3 hover:bg-muted">보안 설정</Link>
                      <Link href="/org/retention" className="rounded-md border p-3 hover:bg-muted">보존 정책</Link>
                      <Link href="/org/members" className="rounded-md border p-3 hover:bg-muted">조직 멤버</Link>
                      <Link href="/admin/metrics" className="rounded-md border p-3 hover:bg-muted">운영 지표</Link>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      템플릿을 배포한 후에는 공유 링크를 통해 참여자에게 동의를 요청할 수 있습니다.
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-medium">상태</h3>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-muted-foreground">마지막 수정</div>
                      <div>{formatDate(template.updatedAt)}</div>
                      <div className="text-muted-foreground">마지막 리비전</div>
                      <div>{lastRevision ? formatDate(lastRevision.at) : "없음"}</div>
                      <div className="text-muted-foreground">리비전 필요 여부</div>
                      <div>{hasUnrevisedChanges ? "예" : "아니오"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            문제가 있으신가요? <Link href="/help" className="underline">도움말</Link> · 정책: <Link href="/legal/privacy" className="underline">개인정보 처리방침</Link> · <Link href="/legal/terms" className="underline">이용약관</Link>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/me" className="rounded-md border px-2 py-1 hover:bg-muted">내 계정</Link>
            <Link href="/settings/profile" className="rounded-md border px-2 py-1 hover:bg-muted">프로필</Link>
            <Link href="/settings/notifications" className="rounded-md border px-2 py-1 hover:bg-muted">알림</Link>
            <Link href="/settings/devices" className="rounded-md border px-2 py-1 hover:bg-muted">장치</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
