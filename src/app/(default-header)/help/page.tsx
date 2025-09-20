"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a Help/FAQ page that guides users through onboarding, integrations,
 * common workflows, and support contact. It includes a searchable FAQ, prominent quick links to key routes
 * (onboarding, integrations, sessions, uploads, org settings), and legal links to privacy and terms.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

type Faq = {
  id: string;
  q: string;
  a: string | JSX.Element;
  tags: string[];
};

const faqs: Faq[] = [
  {
    id: "getting-started",
    q: "처음 시작하려면 어떻게 하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          서비스는 빠른 온보딩을 통해 바로 사용할 수 있습니다. 먼저 {" "}
          <Link className="text-primary hover:underline" href="/onboarding">
            온보딩 페이지
          </Link>
          에서 기본 설정을 마치세요. 이후 {" "}
          <Link className="text-primary hover:underline" href="/dashboard">
            대시보드
          </Link>
          에서 세션을 만들거나 기존 세션을 탐색할 수 있습니다.
        </p>
        <p>
          실시간 회의를 바로 시작하려면 {" "}
          <Link className="text-primary hover:underline" href="/sessions/new">
            새 세션 시작
          </Link>
          을 눌러 마이크 권한을 허용하세요.
        </p>
      </div>
    ),
    tags: ["onboarding", "dashboard", "start"],
  },
  {
    id: "live-start",
    q: "실시간 녹음/전사는 어떻게 시작하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          {" "}
          <Link className="text-primary hover:underline" href="/sessions/new">
            새 세션 만들기
          </Link>
          에서 마이크 접근을 허용하면 브라우저가 오디오를 캡처하고 전송합니다. 네트워크 불안정 시 자동으로 버퍼링 및 재전송을 시도합니다.
        </p>
        <p>
          회의 전에 참석자 동의가 필요한 경우 {" "}
          <Link className="text-primary hover:underline" href="/consent/new">
            동의 요청 생성
          </Link>
          및 {" "}
          <Link className="text-primary hover:underline" href="/consent">
            동의 내역 관리
          </Link>
          에서 기록을 보관하세요.
        </p>
      </div>
    ),
    tags: ["sessions", "live", "consent"],
  },
  {
    id: "integrations",
    q: "Zoom/Teams 연동은 어떻게 하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          {" "}
          <Link className="text-primary hover:underline" href="/integrations">
            통합 페이지
          </Link>
          에서 계정을 연결하세요. 각각의 상세 설정은 아래에서 진행할 수 있습니다:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link className="text-primary hover:underline" href="/integrations/zoom">
              Zoom 연동
            </Link>{" "}
            (연동 완료 후 {" "}
            <Link className="text-primary hover:underline" href="/integrations/zoom/linked">
              상태 확인
            </Link>
            )
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/integrations/teams">
              Microsoft Teams 연동
            </Link>{" "}
            (연동 완료 후 {" "}
            <Link className="text-primary hover:underline" href="/integrations/teams/linked">
              상태 확인
            </Link>
            )
          </li>
        </ul>
        <p>
          초기에는 녹음 파일을 가져와 후처리하는 방식을 권장합니다.
        </p>
      </div>
    ),
    tags: ["integrations", "zoom", "teams"],
  },
  {
    id: "highlights",
    q: "회의 중 중요 표시(하이라이트)는 어떻게 하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          라이브 화면에서 하이라이트 버튼을 눌러 타임스탬프와 함께 저장됩니다. 종료 후에는 세션 상세에서 하이라이트를 검토/수정할 수 있습니다.
        </p>
        <p>
          관련 링크: {" "}
          <Link className="text-primary hover:underline" href="/sessions">
            세션 목록
          </Link>{" "}
          → 원하는 세션 선택 → 라이브/하이라이트 탭.
        </p>
        <p>
          텍스트 파일로 메모를 업로드하려면 {" "}
          <Link className="text-primary hover:underline" href="/sessions">
            세션 목록
          </Link>{" "}
          에서 해당 세션의 "하이라이트 업로드" 메뉴를 사용하세요.
        </p>
      </div>
    ),
    tags: ["highlights", "sessions", "upload"],
  },
  {
    id: "transcripts-summaries",
    q: "전사본과 요약본은 어디에서 확인/공유하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          각 세션의 상세 페이지에서 전사(화자 라벨/타임스탬프 포함)와 하이라이트 기반 요약을 확인하고 내보낼 수 있습니다.
        </p>
        <p>
          관련 링크: {" "}
          <Link className="text-primary hover:underline" href="/sessions">
            세션 목록
          </Link>{" "}
          → 원하는 세션 선택 → 전사/요약/내보내기 탭.
        </p>
      </div>
    ),
    tags: ["transcript", "summary", "export"],
  },
  {
    id: "imports-ingest",
    q: "기존 녹음 파일을 업로드하거나 가져올 수 있나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          파일 업로드는 {" "}
          <Link className="text-primary hover:underline" href="/ingest/upload">
            업로드 페이지
          </Link>
          에서 지원합니다. 외부 시스템에서 가져오기는 {" "}
          <Link className="text-primary hover:underline" href="/imports">
            가져오기 내역
          </Link>
          에서 상태를 확인할 수 있습니다.
        </p>
      </div>
    ),
    tags: ["ingest", "imports", "upload"],
  },
  {
    id: "org-security",
    q: "조직 관리와 보안 설정은 어디에서 하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link className="text-primary hover:underline" href="/org/members">
              구성원 관리
            </Link>
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/org/settings">
              조직 설정
            </Link>
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/org/retention">
              보존 기간 및 자동 삭제 정책
            </Link>
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/org/security">
              보안 설정
            </Link>
          </li>
        </ul>
      </div>
    ),
    tags: ["organization", "security", "retention", "members"],
  },
  {
    id: "account-auth",
    q: "로그인/회원가입/비밀번호 재설정은 어디에서 하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link className="text-primary hover:underline" href="/auth/sign-in">
              로그인
            </Link>{" "}
            / {" "}
            <Link className="text-primary hover:underline" href="/auth/sign-up">
              회원가입
            </Link>
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/auth/reset-password">
              비밀번호 재설정
            </Link>
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/auth/verify-email">
              이메일 인증
            </Link>
          </li>
          <li>
            <Link className="text-primary hover:underline" href="/me">
              내 계정
            </Link>{" "}
            및 {" "}
            <Link className="text-primary hover:underline" href="/settings/profile">
              프로필 설정
            </Link>
          </li>
        </ul>
      </div>
    ),
    tags: ["auth", "account", "password"],
  },
  {
    id: "pwa-offline",
    q: "오프라인에서는 어떻게 동작하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          연결이 끊어지면 녹음 청크가 임시로 버퍼링되며 재연결 시 자동 전송을 시도합니다. 오프라인 전용 안내는 {" "}
          <Link className="text-primary hover:underline" href="/offline">
            오프라인 페이지
          </Link>
          에서 확인할 수 있습니다.
        </p>
      </div>
    ),
    tags: ["pwa", "offline", "reconnect"],
  },
  {
    id: "legal",
    q: "개인정보처리방침과 이용약관은 어디에서 확인하나요?",
    a: (
      <div className="space-y-2 text-muted-foreground">
        <p>
          {" "}
          <Link className="text-primary hover:underline" href="/legal/privacy">
            개인정보처리방침
          </Link>{" "}
          과 {" "}
          <Link className="text-primary hover:underline" href="/legal/terms">
            이용약관
          </Link>
          을 참고하세요.
        </p>
      </div>
    ),
    tags: ["legal", "privacy", "terms"],
  },
];

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <span>
      {before}
      <mark className="rounded bg-accent px-1 py-0 text-accent-foreground">{match}</mark>
      {highlight(after, query) as any}
    </span>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => {
      const hay = `${f.q} ${typeof f.a === "string" ? f.a : ""} ${f.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">도움말 & FAQ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            빠르게 시작하고 자주 묻는 질문에 대한 답을 찾아보세요. 아래 빠른 링크와 검색을 활용하세요.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="help-search" className="mb-1 block text-xs font-medium text-muted-foreground">
                검색
              </label>
              <div className="relative">
                <input
                  id="help-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="예: Zoom 연동, 하이라이트, 전사 공유..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Help search"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/onboarding" className="group rounded-md border border-border bg-card px-3 py-2 transition hover:bg-accent">
                <div className="font-medium text-foreground group-hover:text-accent-foreground">온보딩</div>
                <div className="text-xs text-muted-foreground">빠른 시작 가이드</div>
              </Link>
              <Link href="/integrations" className="group rounded-md border border-border bg-card px-3 py-2 transition hover:bg-accent">
                <div className="font-medium text-foreground group-hover:text-accent-foreground">통합</div>
                <div className="text-xs text-muted-foreground">Zoom · Teams 연동</div>
              </Link>
              <Link href="/sessions/new" className="group rounded-md border border-border bg-card px-3 py-2 transition hover:bg-accent">
                <div className="font-medium text-foreground group-hover:text-accent-foreground">새 세션</div>
                <div className="text-xs text-muted-foreground">실시간 전사 시작</div>
              </Link>
              <Link href="/ingest/upload" className="group rounded-md border border-border bg-card px-3 py-2 transition hover:bg-accent">
                <div className="font-medium text-foreground group-hover:text-accent-foreground">녹음 업로드</div>
                <div className="text-xs text-muted-foreground">파일 후처리</div>
              </Link>
            </div>
          </div>

          <Separator className="my-2" />

          <div className="grid gap-2 md:grid-cols-4">
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              대시보드
            </Link>
            <Link href="/sessions" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              세션 목록
            </Link>
            <Link href="/org/settings" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              조직 설정
            </Link>
            <Link href="/org/security" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              보안 설정
            </Link>
          </div>
        </div>
      </div>

      <section aria-labelledby="faq-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="faq-heading" className="text-xl font-semibold text-foreground">
            자주 묻는 질문
          </h2>
          <span className="text-xs text-muted-foreground">{filtered.length}개 결과</span>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((item) => (
            <article key={item.id} className="p-4">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between gap-4 text-left">
                    <span className="text-sm font-medium text-foreground">
                      {typeof item.q === "string" ? (highlight(item.q, query) as any) : item.q}
                    </span>
                    <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      자세히 보기
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 text-sm leading-relaxed text-foreground">
                    {typeof item.a === "string" ? (highlight(item.a, query) as any) : item.a}
                  </div>
                  {item.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          )}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <Alert className="border-primary/30 bg-primary/5">
          <AlertTitle className="text-foreground">도움이 더 필요하신가요?</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            사용 중 문제가 발생했거나 문의가 있다면 이메일로 연락주세요. 빠르게 도와드리겠습니다.
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <a
                className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition hover:opacity-90"
                href={`mailto:support@yourdomain.com?subject=${encodeURIComponent("Support request: Help/FAQ")}`}
              >
                이메일 문의
              </a>
              <Link href="/legal/privacy" className="text-foreground hover:underline">
                개인정보처리방침
              </Link>
              <Link href="/legal/terms" className="text-foreground hover:underline">
                이용약관
              </Link>
              <Link href="/settings/notifications" className="text-foreground hover:underline">
                알림 설정
              </Link>
              <Link href="/settings/devices" className="text-foreground hover:underline">
                장치 설정
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </section>

      <section className="mt-10">
        <Separator />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link href="/onboarding" className="group rounded-lg border border-border bg-card p-4 transition hover:bg-accent">
            <div className="text-sm font-medium text-foreground group-hover:text-accent-foreground">빠르게 시작하기</div>
            <p className="mt-1 text-xs text-muted-foreground">설정 완료 후 첫 전사까지 안내</p>
          </Link>
          <Link href="/integrations" className="group rounded-lg border border-border bg-card p-4 transition hover:bg-accent">
            <div className="text-sm font-medium text-foreground group-hover:text-accent-foreground">회의 플랫폼 연동</div>
            <p className="mt-1 text-xs text-muted-foreground">Zoom·Teams 녹음 가져오기</p>
          </Link>
          <Link href="/sessions" className="group rounded-lg border border-border bg-card p-4 transition hover:bg-accent">
            <div className="text-sm font-medium text-foreground group-hover:text-accent-foreground">세션 관리</div>
            <p className="mt-1 text-xs text-muted-foreground">라이브·전사·하이라이트·요약</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
