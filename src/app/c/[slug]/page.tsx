"use client"

/**
 * CODE INSIGHT
 * This code's use case is a public participant consent page resolved by a share slug. It presents meeting info and privacy terms,
 * collects the participant's consent, and on acceptance navigates to /c/[slug]/success. It also provides links to legal pages and help.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

type PageProps = {
  params: { slug: string };
};

function toTitleFromSlug(slug: string) {
  try {
    const s = decodeURIComponent(slug).replace(/[-_]+/g, " ");
    return s
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return slug;
  }
}

function formatWhen(value: string | null) {
  if (!value) return "오늘";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "오늘";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function ConsentPage({ params }: PageProps) {
  const router = useRouter();
  const search = useSearchParams();
  const slug = params.slug;

  const meetingTitle = useMemo(() => search.get("title") || toTitleFromSlug(slug), [search, slug]);
  const hostName = useMemo(() => search.get("host") || "세션 주최자", [search]);
  const when = useMemo(() => formatWhen(search.get("at")), [search]);
  const orgName = useMemo(() => search.get("org") || "조직", [search]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [allowRecord, setAllowRecord] = useState(false);
  const [allowProcess, setAllowProcess] = useState(false);
  const [agreeDocs, setAgreeDocs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = useMemo(() => {
    if (!email) return true; // optional
    return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
  }, [email]);

  const isValid = useMemo(() => {
    return fullName.trim().length > 1 && allowRecord && allowProcess && agreeDocs && emailValid;
  }, [fullName, allowRecord, allowProcess, agreeDocs, emailValid]);

  useEffect(() => {
    // If previously accepted on this device, prefill
    try {
      const raw = localStorage.getItem(`consent:${slug}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { fullName?: string; email?: string };
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
      }
    } catch {}
  }, [slug]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!isValid) return;
      setSubmitting(true);
      try {
        // Persist locally so subsequent pages can reference it (no DB access on this route)
        const payload = {
          slug,
          meetingTitle,
          hostName,
          when,
          orgName,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          allowRecord,
          allowProcess,
          agreeDocs,
          consentedAt: new Date().toISOString(),
          v: 1,
        };
        try {
          localStorage.setItem(`consent:${slug}`, JSON.stringify(payload));
        } catch {}
        router.push(`/c/${encodeURIComponent(slug)}/success?name=${encodeURIComponent(fullName.trim())}`);
      } catch (err: any) {
        setError("제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        setSubmitting(false);
      }
    },
    [agreeDocs, allowProcess, allowRecord, email, fullName, isValid, meetingTitle, hostName, orgName, router, slug, when]
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground p-6">
          <div className="text-xs uppercase tracking-widest opacity-90">참여자 동의서</div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold leading-tight">{meetingTitle}</h1>
          <div className="mt-2 text-sm opacity-90 flex gap-3 flex-wrap">
            <span>주최: {hostName}</span>
            <span className="opacity-60">•</span>
            <span>{when}</span>
            <span className="opacity-60">•</span>
            <span>{orgName}</span>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <Alert className="mb-6">
            <AlertTitle>녹음 및 전사 안내</AlertTitle>
            <AlertDescription>
              이 세션은 품질 향상을 위해 오디오가 녹음되고 자동 전사 및 요약이 생성됩니다. 귀하는 언제든지 동의를 철회할 수 있으며, 자세한 내용은
              <Link href="/legal/privacy" className="ml-1 underline underline-offset-4 text-primary hover:opacity-90">개인정보 처리방침</Link>
              과
              <Link href="/legal/terms" className="ml-1 underline underline-offset-4 text-primary hover:opacity-90">이용약관</Link>
              을 참고하세요.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              본 서비스는 실시간 또는 사후 업로드된 오디오를 기반으로 전사, 화자 분리, 하이라이트 생성 및 요약 문서를 제공합니다.
              참여자의 음성 데이터와 발화 내용은 보안 저장소에 암호화되어 보관되며, 조직 설정에 따른 보존기간이 적용됩니다.
            </p>
            <p>
              동의 시, 귀하의 음성은 자동 전사 시스템으로 전송되어 처리되며, 결과물은 세션 주최자 및 권한이 부여된 사용자와 공유될 수 있습니다.
              세부 항목은 아래에서 확인하실 수 있습니다.
            </p>

            <Collapsible>
              <CollapsibleTrigger className="text-primary hover:opacity-90 underline underline-offset-4">세부 개인정보 처리 내용 보기</CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-3 list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>수집 항목: 오디오(음성), 전사 텍스트, 화자 라벨, 하이라이트 메모</li>
                  <li>이용 목적: 실시간 자막 제공, 전사본/요약문 생성, 서비스 품질 향상</li>
                  <li>보관 기간: 조직 정책 또는 법령에 따른 기간 후 자동 삭제</li>
                  <li>제3자 제공: 필수 처리 위탁(ASR/요약 엔진 등) 범위 내</li>
                  <li>
                    권리: 열람/정정/삭제 및 처리 정지 요구 가능. 문의는
                    <Link href="/help" className="ml-1 text-primary underline underline-offset-4">도움말 센터</Link>
                    를 통해 접수 가능합니다.
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Separator className="my-6" />

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="fullName" className="text-sm font-medium">이름<span className="text-destructive">*</span></label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="홍길동"
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">이메일(선택)</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {!emailValid && (
                  <span className="text-xs text-destructive" aria-live="polite">유효한 이메일 주소를 입력하세요.</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRecord}
                  onChange={(e) => setAllowRecord(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                  required
                />
                <span className="text-sm">본 세션의 녹음 및 전사 처리에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowProcess}
                  onChange={(e) => setAllowProcess(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                  required
                />
                <span className="text-sm">품질 향상 및 요약 생성을 위한 자동 처리(ASR/LLM) 위탁에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeDocs}
                  onChange={(e) => setAgreeDocs(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                  required
                />
                <span className="text-sm">
                  <Link href="/legal/privacy" className="underline underline-offset-4 text-primary hover:opacity-90">개인정보 처리방침</Link>
                  과
                  <Link href="/legal/terms" className="ml-1 underline underline-offset-4 text-primary hover:opacity-90">이용약관</Link>
                  을 확인하였으며 이에 동의합니다.
                </span>
              </label>
            </div>

            {error && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive">
                <AlertTitle>제출 실패</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-primary text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95 transition"
              >
                {submitting ? "동의 처리 중..." : "동의하고 계속"}
              </button>
              <Link
                href="/help"
                className="inline-flex items-center justify-center h-10 px-5 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition"
              >
                동의하지 않음
              </Link>
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <Link href={`/c/${encodeURIComponent(slug)}/success`} className="underline underline-offset-4 hover:text-foreground">이미 동의함</Link>
                <span>•</span>
                <button type="button" onClick={() => window.print()} className="underline underline-offset-4 hover:text-foreground">인쇄</button>
              </div>
            </div>
          </form>

          <Separator className="my-8" />

          <div className="text-xs text-muted-foreground flex flex-col gap-2">
            <div>
              계정이 있으신가요? 더 많은 설정과 기록을 보려면
              <Link href="/auth/sign-in" className="ml-1 underline underline-offset-4 text-primary hover:opacity-90">로그인</Link>
              또는
              <Link href="/auth/sign-up" className="ml-1 underline underline-offset-4 text-primary hover:opacity-90">회원가입</Link>
              하세요.
            </div>
            <div>
              관리자는
              <Link href="/consent" className="ml-1 underline underline-offset-4 text-primary hover:opacity-90">동의서 관리</Link>
              에서 공유 링크를 생성할 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
