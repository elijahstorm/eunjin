"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Terms of Service page for the app. It presents legal terms with a modern, accessible UI, links to related legal pages (privacy policy) and key app areas (home, help, sessions, integrations, consent), and fits within an existing site layout that already provides header, footer, and sidebar. The component is a client component for interactive collapsible sections and smooth navigation.
 */

import React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function TermsSection({ id, title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = React.useState<boolean>(defaultOpen);
  return (
    <section id={id} className="rounded-lg border border-border bg-card text-card-foreground">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base md:text-lg font-semibold">
            <a href={`#${id}`} className="hover:underline">
              {title}
            </a>
          </h2>
          <CollapsibleTrigger asChild>
            <button
              aria-expanded={open}
              aria-controls={`${id}-content`}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span className="hidden sm:inline">{open ? "접기" : "펼치기"}</span>
              <span aria-hidden>{open ? "−" : "+"}</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <Separator className="opacity-50" />
        <CollapsibleContent id={`${id}-content`} className="px-5 py-4 text-sm leading-7">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

export default function TermsPage() {
  const lastUpdated = "2025-09-01"; // ISO format for clarity; display below

  return (
    <main className="w-full">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:underline text-foreground">홈</Link>
            </li>
            <li aria-hidden className="text-muted-foreground">/</li>
            <li>
              <span className="text-muted-foreground">법적 고지</span>
            </li>
            <li aria-hidden className="text-muted-foreground">/</li>
            <li>
              <span className="text-foreground">이용약관</span>
            </li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">이용약관</h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            본 약관은 실시간 회의·강의 요약 및 하이라이트 기반 요약 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.
          </p>
          <div className="mt-3 text-xs text-muted-foreground">시행일: 2025-09-01 · 최종 업데이트: {lastUpdated}</div>
        </header>

        <Alert className="mb-8 bg-muted text-muted-foreground">
          <AlertTitle className="text-foreground">중요 안내</AlertTitle>
          <AlertDescription>
            본 서비스는 오디오 캡처·전사·요약 기능을 제공합니다. 회의/강의 참여자의 녹음 및 처리에 대한 적법한 동의 확보는 사용자(조직 관리자 포함)의 책임입니다. 관련 설정은
            {" "}
            <Link href="/consent" className="underline text-foreground">동의 관리</Link>
            {" "}
            및 {" "}
            <Link href="/legal/privacy" className="underline text-foreground">개인정보 처리방침</Link>
            에서 확인할 수 있습니다.
          </AlertDescription>
        </Alert>

        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">목차</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <li><a className="hover:underline" href="#intro">1. 약관의 동의 및 범위</a></li>
            <li><a className="hover:underline" href="#definitions">2. 정의</a></li>
            <li><a className="hover:underline" href="#accounts">3. 계정 및 접근 제어</a></li>
            <li><a className="hover:underline" href="#service">4. 서비스 이용</a></li>
            <li><a className="hover:underline" href="#fees">5. 요금 및 결제</a></li>
            <li><a className="hover:underline" href="#consent">6. 녹음 동의</a></li>
            <li><a className="hover:underline" href="#privacy">7. 개인정보 보호</a></li>
            <li><a className="hover:underline" href="#content-ip">8. 사용자 콘텐츠와 권리</a></li>
            <li><a className="hover:underline" href="#integrations">9. 제3자 통합(Zoom/Teams)</a></li>
            <li><a className="hover:underline" href="#prohibited">10. 금지행위</a></li>
            <li><a className="hover:underline" href="#warranty">11. 보증의 부인</a></li>
            <li><a className="hover:underline" href="#liability">12. 책임의 제한</a></li>
            <li><a className="hover:underline" href="#indemnity">13. 면책</a></li>
            <li><a className="hover:underline" href="#termination">14. 변경·중단·해지</a></li>
            <li><a className="hover:underline" href="#notices">15. 통지</a></li>
            <li><a className="hover:underline" href="#law-dispute">16. 준거법 및 분쟁 해결</a></li>
            <li><a className="hover:underline" href="#consumer">17. 소비자 권리</a></li>
            <li><a className="hover:underline" href="#contact">18. 문의처</a></li>
          </ul>
        </div>

        <div className="space-y-6">
          <TermsSection id="intro" title="1. 약관의 동의 및 범위" defaultOpen>
            <p>
              이용자는 본 약관에 동의함으로써 서비스에 가입하거나 사용하는 시점부터 본 약관의 적용을 받습니다.
              동의하지 않는 경우 {" "}
              <Link href="/" className="underline">홈</Link>으로 돌아가 사용을 중단해 주십시오. 일부 기능은
              {" "}
              <Link href="/auth/sign-in" className="underline">로그인</Link> 또는 {" "}
              <Link href="/auth/sign-up" className="underline">회원가입</Link>이 필요할 수 있습니다.
            </p>
          </TermsSection>

          <TermsSection id="definitions" title="2. 정의" defaultOpen>
            <ul className="list-disc pl-5 space-y-2">
              <li>서비스: 브라우저 기반 실시간 오디오 캡처, 전사, 화자 분리, 하이라이트 기록 및 요약 문서 생성 기능을 포함한 일련의 기능.</li>
              <li>세션: {" "}
                <Link href="/sessions" className="underline">회의/강의 세션</Link>으로, 실시간 녹음 또는 업로드된 녹음을 처리하는 단위를 의미합니다.
              </li>
              <li>조직: 조직 관리자가 구성원을 {" "}
                <Link href="/org/members" className="underline">멤버로 초대</Link>해 권한을 부여하는 단위.
              </li>
              <li>통합: {" "}
                <Link href="/integrations" className="underline">Zoom/Teams 등 외부 서비스 연동</Link>을 의미합니다.
              </li>
            </ul>
          </TermsSection>

          <TermsSection id="accounts" title="3. 계정 및 접근 제어" defaultOpen>
            <ul className="list-disc pl-5 space-y-2">
              <li>이용자는 정확하고 최신의 정보를 제공해야 하며, {" "}
                <Link href="/settings/profile" className="underline">프로필</Link> 및 {" "}
                <Link href="/settings/notifications" className="underline">알림 설정</Link>을 관리할 책임이 있습니다.
              </li>
              <li>조직 관리자는 역할 기반 접근을 설정하고 보안 정책을 {" "}
                <Link href="/org/security" className="underline">조직 보안</Link>에서 구성해야 합니다.</li>
              <li>비밀번호 재설정은 {" "}
                <Link href="/auth/reset-password" className="underline">비밀번호 재설정</Link>을 통해 수행합니다.</li>
            </ul>
          </TermsSection>

          <TermsSection id="service" title="4. 서비스 이용">
            <ul className="list-disc pl-5 space-y-2">
              <li>이용자는 {" "}
                <Link href="/sessions/new" className="underline">새 세션 시작</Link> 또는 {" "}
                <Link href="/ingest/upload" className="underline">녹음 업로드</Link>로 콘텐츠를 처리할 수 있습니다.</li>
              <li>네트워크 상태 등으로 인해 지연이 발생할 수 있으며, 실시간 전사 품질은 환경에 따라 달라질 수 있습니다.</li>
              <li>공유 링크를 통해 {" "}
                <Link href="/share/transcript/" className="underline">전사 공유</Link> 및 {" "}
                <Link href="/share/summary/" className="underline">요약 공유</Link> 기능을 제공할 수 있습니다. 링크 보안에 유의하시기 바랍니다.</li>
            </ul>
          </TermsSection>

          <TermsSection id="fees" title="5. 요금 및 결제">
            <ul className="list-disc pl-5 space-y-2">
              <li>유료 요금제 또는 사용량 기반 과금이 적용될 수 있습니다. 세부 내용은 대시보드의 청구 섹션(추후 제공)에서 고지합니다.</li>
              <li>관리자는 {" "}
                <Link href="/org/retention" className="underline">보존 정책</Link>을 설정하여 저장 비용을 관리할 수 있습니다.</li>
              <li>관리 도구의 비용 현황은 {" "}
                <Link href="/admin/costs" className="underline">관리자 · 비용</Link>에서 확인할 수 있습니다(관리자 전용).</li>
            </ul>
          </TermsSection>

          <TermsSection id="consent" title="6. 녹음 동의">
            <ul className="list-disc pl-5 space-y-2">
              <li>이용자는 모든 참여자로부터 적법한 녹음·처리 동의를 받아야 합니다. 동의 기록 및 공유는 {" "}
                <Link href="/consent" className="underline">동의 관리</Link>에서 수행할 수 있습니다.</li>
              <li>일부 지역에서는 음성 데이터 처리에 대한 추가 고지가 필요할 수 있으며, 이는 사용자(조직)의 책임입니다.</li>
            </ul>
          </TermsSection>

          <TermsSection id="privacy" title="7. 개인정보 보호">
            <p>
              개인정보 처리에 관한 세부 사항은 {" "}
              <Link href="/legal/privacy" className="underline">개인정보 처리방침</Link>을 따릅니다. 이용자는 {" "}
              <Link href="/settings/devices" className="underline">디바이스 설정</Link>과 {" "}
              <Link href="/settings/notifications" className="underline">알림</Link>을 통해 데이터 수집 및 알림 수신 여부를 관리할 수 있습니다.
            </p>
          </TermsSection>

          <TermsSection id="content-ip" title="8. 사용자 콘텐츠와 권리">
            <ul className="list-disc pl-5 space-y-2">
              <li>이용자는 자신의 콘텐츠(오디오, 전사, 메모, 하이라이트)에 대한 권리를 보유합니다.</li>
              <li>서비스 제공, 유지보수, 품질 개선을 위해 필요한 범위 내에서의 사용·처리에 동의합니다.</li>
              <li>불법 또는 타인의 권리를 침해하는 콘텐츠 업로드는 금지됩니다.</li>
            </ul>
          </TermsSection>

          <TermsSection id="integrations" title="9. 제3자 통합(Zoom/Teams)">
            <p>
              이용자는 {" "}
              <Link href="/integrations/zoom" className="underline">Zoom</Link> 및 {" "}
              <Link href="/integrations/teams" className="underline">Microsoft Teams</Link> 연동을 통해 녹음 파일을 가져올 수 있습니다. 각 통합의 정책 변경으로 인해 서비스가 제한될 수 있으며, 계정 연동 해제는 {" "}
              <Link href="/integrations" className="underline">통합 설정</Link>에서 관리합니다.
            </p>
          </TermsSection>

          <TermsSection id="prohibited" title="10. 금지행위">
            <ul className="list-disc pl-5 space-y-2">
              <li>타인의 동의 없는 녹음 또는 불법 감청 행위</li>
              <li>저작권·초상권·개인정보 등 타인의 권리 침해</li>
              <li>리버스 엔지니어링, 비인가 접근, 서비스 방해 행위</li>
              <li>스팸·악성코드·불법 콘텐츠 업로드</li>
            </ul>
          </TermsSection>

          <TermsSection id="warranty" title="11. 보증의 부인">
            <p>
              서비스는 “있는 그대로” 및 “가용 범위 내” 제공됩니다. 당사는 상업성, 특정 목적 적합성, 비침해에 대한 묵시적 보증을 포함하여 일체의 보증을 명시적으로 부인합니다. 전사 정확도, 실시간 지연, 제3자 통합 가용성 등은 보장되지 않습니다.
            </p>
          </TermsSection>

          <TermsSection id="liability" title="12. 책임의 제한">
            <p>
              관련 법령이 허용하는 최대한의 범위 내에서, 간접적·부수적·특별·결과적 손해에 대해 당사는 책임지지 않습니다. 또한 데이터 손실, 업무 중단, 기회 손실, 명예 훼손, 매출 손실 등에 대해서도 책임을 제한합니다.
            </p>
          </TermsSection>

          <TermsSection id="indemnity" title="13. 면책">
            <p>
              이용자가 본 약관 또는 관련 법령을 위반하여 발생하는 제3자의 청구·분쟁·손해에 대해, 이용자는 회사 및 임직원을 면책하고 방어하는 데 협조할 것에 동의합니다.
            </p>
          </TermsSection>

          <TermsSection id="termination" title="14. 변경·중단·해지">
            <ul className="list-disc pl-5 space-y-2">
              <li>회사는 서비스 또는 약관을 변경할 수 있으며, 중요한 변경 시 합리적 방법으로 공지합니다.</li>
              <li>이용자는 언제든지 계정 해지를 요청할 수 있습니다. 생성된 산출물과 데이터의 보존은 {" "}
                <Link href="/org/retention" className="underline">보존 정책</Link>에 따릅니다.
              </li>
              <li>약관 위반, 불법행위 등 합리적 사유가 있는 경우 이용 제한 또는 해지가 이루어질 수 있습니다.</li>
            </ul>
          </TermsSection>

          <TermsSection id="notices" title="15. 통지">
            <p>
              공지사항, 이메일, 인앱 알림 등으로 통지할 수 있으며, 이용자는 {" "}
              <Link href="/settings/notifications" className="underline">알림 설정</Link>을 최신 상태로 유지해야 합니다. 서비스 관련 도움은 {" "}
              <Link href="/help" className="underline">도움말</Link>을 참고하십시오.
            </p>
          </TermsSection>

          <TermsSection id="law-dispute" title="16. 준거법 및 분쟁 해결">
            <p>
              본 약관은 서비스 제공국의 법률에 따르며, 분쟁은 해당 법령에 따른 절차로 해결합니다. 법이 허용하는 경우, 당사는 협의를 우선하며 불성립 시 관할 법원 또는 중재 절차를 통해 해결합니다.
            </p>
          </TermsSection>

          <TermsSection id="consumer" title="17. 소비자 권리">
            <p>
              사용자에게 적용되는 강행법규 및 소비자 보호 법령이 본 약관과 상충하는 경우 해당 법령이 우선합니다. 법적 권리는 {" "}
              <Link href="/help" className="underline">도움말</Link>에서 추가 안내를 확인할 수 있습니다.
            </p>
          </TermsSection>

          <TermsSection id="contact" title="18. 문의처">
            <p>
              본 약관 또는 서비스 사용에 관한 문의는 {" "}
              <Link href="/help" className="underline">도움말 센터</Link>를 통해 제출해 주십시오. 계정·조직·보안 관련 문의는 각각 {" "}
              <Link href="/me" className="underline">내 정보</Link>, {" "}
              <Link href="/org/settings" className="underline">조직 설정</Link>, {" "}
              <Link href="/org/security" className="underline">조직 보안</Link>에서 우선 확인하시기 바랍니다.
            </p>
          </TermsSection>
        </div>

        <div className="mt-10">
          <Separator />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              이 문서는 서비스 운영을 위해 수시로 업데이트될 수 있습니다. 변경 사항은 본 페이지에 게시됩니다.
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/legal/privacy"
                className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                개인정보 처리방침
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                홈으로 돌아가기
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                약관 인쇄
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
