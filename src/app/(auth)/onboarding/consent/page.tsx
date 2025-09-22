"use client";

/**
 * CODE INSIGHT
 * This code's use case is to collect explicit user consent for privacy/data terms during onboarding.
 * It presents a clear summary, links to the full policy at /privacy, and requires an explicit
 * acceptance checkbox before enabling the continue action. On acceptance, the user is redirected
 * to /dashboard. This page focuses solely on main content; headers/footers/sidebars are managed by layout.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function ConsentPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openSections, setOpenSections] = useState<{[k: string]: boolean}>({ summary: true, data: false });

  useEffect(() => {
    // Ensure page focuses on main purpose
    document.title = "개인정보 및 데이터 이용 동의 | poiima";
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accepted || submitting) return;
    setSubmitting(true);
    try {
      // Consent record persistence may be handled server-side; here we strictly gate and proceed.
      // Redirect to dashboard per requirements.
      router.push("/dashboard");
    } finally {
      // No need to unset submitting since navigation occurs, but keep safety.
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
              poiima 개인정보/데이터 안내
            </div>
            <h1 className="mt-3 text-xl font-semibold sm:text-2xl">개인정보 및 데이터 이용 동의</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              서비스 이용을 위해 아래 내용을 확인하시고 동의해 주세요. 동의 후 언제든지 설정 &gt; 개인정보에서 관리할 수 있습니다.
            </p>
          </div>
        </div>

        <Separator />

        <form onSubmit={onSubmit} className="p-5 sm:p-6">
          <div className="space-y-4">
            <ul className="grid gap-3 text-sm text-foreground/90">
              <li className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">✓</span>
                <div>
                  <p className="font-medium">파일 및 텍스트 처리</p>
                  <p className="mt-1 text-muted-foreground">업로드한 문서의 텍스트를 추출·분석하여 요약, 퀴즈 생성, 대화형 QA에 사용합니다.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">✓</span>
                <div>
                  <p className="font-medium">개인 학습 데이터</p>
                  <p className="mt-1 text-muted-foreground">맞춤 퀴즈와 SRS(복습 일정) 계산을 위해 정답률, 학습 이력 등의 사용 데이터를 저장합니다.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">✓</span>
                <div>
                  <p className="font-medium">데이터 보관 및 삭제</p>
                  <p className="mt-1 text-muted-foreground">내 계정에서 업로드 파일과 생성물(요약/퀴즈/채팅)을 관리·삭제할 수 있습니다.</p>
                </div>
              </li>
            </ul>

            <div className="rounded-lg border border-border bg-background/60">
              <Collapsible
                open={openSections.summary}
                onOpenChange={(o) => setOpenSections((s) => ({ ...s, summary: o }))}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  <span>개인정보 처리방침 요약</span>
                  <svg
                    className={`h-4 w-4 transform transition-transform ${openSections.summary ? "rotate-180" : "rotate-0"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 pt-1 text-sm text-muted-foreground">
                  poiima는 서비스 제공 목적에 한해 필요한 최소한의 정보를 수집·처리합니다. 수집 항목에는 계정 정보(이메일), 사용자가 업로드한 파일 메타데이터, 이용 기록(학습/퀴즈/리뷰)이 포함될 수 있습니다. 제3자 제공은 법령 준수 또는 서비스 제공을 위한 하위 처리자(예: 클라우드 저장소/LLM API)에 한정하며, 계약상 안전조치를 준수합니다.
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="rounded-lg border border-border bg-background/60">
              <Collapsible
                open={openSections.data}
                onOpenChange={(o) => setOpenSections((s) => ({ ...s, data: o }))}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  <span>데이터 처리 및 보안</span>
                  <svg
                    className={`h-4 w-4 transform transition-transform ${openSections.data ? "rotate-180" : "rotate-0"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 pt-1 text-sm text-muted-foreground space-y-2">
                  <p>• 파일은 사용자별로 격리된 저장소에 보관되며, 삭제 시 복구되지 않습니다.</p>
                  <p>• LLM/임베딩 호출에는 외부 서비스가 사용될 수 있으며, 전송되는 데이터는 요청 범위로 한정합니다.</p>
                  <p>• 비용 및 한도 관리를 위해 토큰 사용량을 집계할 수 있습니다.</p>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <Link href="/privacy" className="text-sm font-medium text-primary hover:underline">
                전체 개인정보 처리방침 보기
              </Link>
              <span className="text-xs text-muted-foreground">문서 버전: v1.0</span>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <input
                id="consent-checkbox"
                type="checkbox"
                className="mt-1 h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-2 focus:ring-primary"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                aria-describedby="consent-help"
                required
              />
              <label htmlFor="consent-checkbox" className="text-sm leading-6">
                위 내용을 모두 확인했으며, 개인정보 처리 및 데이터 이용에 동의합니다.
                <span id="consent-help" className="mt-1 block text-xs text-muted-foreground">
                  동의는 필수이며, 동의 후에도 설정에서 철회할 수 있습니다.
                </span>
              </label>
            </div>

            <div className="mt-2 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                문제가 있나요? <Link href="/settings/privacy" className="text-primary underline-offset-2 hover:underline">설정 &gt; 개인정보</Link>에서 언제든 확인할 수 있어요.
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/onboarding/welcome"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  뒤로
                </Link>
                <button
                  type="submit"
                  disabled={!accepted || submitting}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      진행 중...
                    </span>
                  ) : (
                    "동의하고 계속하기"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
