"use client";

import React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

/**
 * CODE INSIGHT
 * This code's use case is to render the public Privacy Policy page for poiima. It presents clear, localized (Korean) data practices,
 * links to signup and home, and references explicit consent collection at /onboarding/consent. The page is responsive and uses the
 * project's UI tokens and components without server/database calls.
 */

export default function PrivacyPage() {
  const lastUpdated = "2025-09-22";

  const sections = [
    { id: "overview", label: "개요" },
    { id: "data-collect", label: "수집하는 정보" },
    { id: "data-use", label: "정보 이용 목적" },
    { id: "retention-deletion", label: "보관 기간 및 삭제" },
    { id: "processors", label: "처리 위탁·국외 이전" },
    { id: "security", label: "보안" },
    { id: "rights", label: "이용자 권리" },
    { id: "cookies", label: "쿠키·로컬 저장소" },
    { id: "children", label: "아동 보호" },
    { id: "changes", label: "정책 변경" },
    { id: "contact", label: "연락처" },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14 lg:py-16">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-primary">Privacy</p>
        <h1 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">poiima 개인정보 처리방침</h1>
        <p className="text-sm text-muted-foreground">최종 업데이트: {lastUpdated}</p>
      </header>

      <div className="mt-6">
        <Alert className="bg-card text-card-foreground">
          <AlertTitle className="font-semibold">요약</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            poiima는 개인 계정 기반의 학습 자료 업로드, 요약, 퀴즈 생성, 대화형 QA 서비스를 제공합니다. 회원가입 시점과 서비스 이용 중 핵심 개인정보 및 콘텐츠 데이터가 처리되며, 모든 기능 사용 전 <Link href="/onboarding/consent" className="underline underline-offset-4 decoration-primary hover:text-primary">/onboarding/consent</Link> 화면에서 명시적으로 다시 동의하게 됩니다. 데이터는 사용자별 격리되며, 삭제와 내보내기를 직접 수행할 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>

      <nav aria-label="바로가기" className="mt-8">
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground",
                "hover:bg-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <Separator className="my-8" />

      <section id="overview" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">1) 개요</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          이 방침은 poiima(이하 “서비스”)가 이용자(“사용자”)의 개인정보와 업로드 자료를 어떻게 수집·이용·보관·공유·보호하는지 설명합니다. 본 방침은 공개 마케팅 페이지에 제공되며, 실제 서비스 이용 시 표시되는 동의 화면의 세부조건이 우선합니다.
        </p>
      </section>

      <Separator className="my-8" />

      <section id="data-collect" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">2) 수집하는 정보</h2>
        <div className="mt-3 space-y-4 text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">필수 계정 정보</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>이메일, 비밀번호(해시 형태), Supabase 인증 관련 토큰 및 세션 정보</li>
              <li>프로필 기본값: 표시 이름, 선호 언어/테마</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">콘텐츠 및 사용 데이터</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>업로드 파일 메타데이터: 파일명, 형식, 크기(최대 20MB), MIME, 저장 경로</li>
              <li>파싱된 텍스트/청크, 페이지·슬라이드 번호, 임베딩 벡터(pgvector)</li>
              <li>생성물: 요약, 퀴즈(문항/정답/해설), 채팅 로그 및 인용(출처 링크)</li>
              <li>학습 진행/SRS 카드 및 리뷰 이력, 퀴즈 시도·정답률</li>
              <li>비용/호출량 등 사용량 이벤트(모델/토큰/비용 지표)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">장치 및 기술 정보</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>브라우저·OS 정보, IP/대략적 지역(보안/오남용 방지, 품질 개선)</li>
              <li>PWA 동작을 위한 설치 상태, 오프라인 캐시 사용 정보</li>
            </ul>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      <section id="data-use" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">3) 정보 이용 목적</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>인증·계정관리 및 사용자별 데이터 격리(RLS) 제공</li>
          <li>파일 파싱·OCR·임베딩 생성·요약 및 퀴즈/QA 제공</li>
          <li>SRS 기반 학습 스케줄링 및 오답 기반 맞춤 퀴즈 제공</li>
          <li>서비스 품질 개선, 오류 진단, 비용/호출량 모니터링</li>
          <li>법적 의무 준수 및 분쟁 대응</li>
        </ul>
      </section>

      <Separator className="my-8" />

      <section id="retention-deletion" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">4) 보관 기간 및 삭제</h2>
        <div className="mt-3 space-y-3 text-muted-foreground">
          <p>
            사용자가 계정을 보유하는 동안 서비스 제공 및 법적 의무 준수를 위해 데이터를 보관합니다. 관련 법령의 별도 보존 기간이 요구되지 않는 한, 사용자는 언제든지 업로드 파일 및 생성물을 삭제할 수 있습니다.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              데이터 관리: 로그인 후 설정에서 내보내기/삭제를 사용할 수 있습니다 → {" "}
              <Link href="/settings/data" className="underline underline-offset-4 decoration-primary hover:text-primary">설정 &gt; 데이터</Link>
            </li>
            <li>
              개인정보 옵션: {" "}
              <Link href="/settings/privacy" className="underline underline-offset-4 decoration-primary hover:text-primary">설정 &gt; 개인정보</Link>
            </li>
            <li>
              계정 삭제(회원 탈퇴): {" "}
              <Link href="/settings/account" className="underline underline-offset-4 decoration-primary hover:text-primary">설정 &gt; 계정</Link>
            </li>
          </ul>
        </div>
      </section>

      <Separator className="my-8" />

      <section id="processors" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">5) 처리 위탁 및 국외 이전</h2>
        <p className="mt-3 text-muted-foreground">
          서비스 제공에 필요한 일부 처리는 신뢰할 수 있는 외부 처리자에게 위탁될 수 있으며, 처리 위치가 국외일 수 있습니다. 각 처리자는 계약에 따라 안전성·기밀성을 보장합니다.
        </p>

        <div className="mt-4 space-y-3">
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2 text-left text-sm font-medium text-foreground hover:bg-muted">
              <span>주요 처리자/인프라 목록</span>
              <span className="text-muted-foreground group-hover:text-foreground">▾</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 rounded-b-md border border-t-0 border-border bg-card p-4">
              <div>
                <h3 className="font-medium text-foreground">Supabase (Auth·Storage·DB)</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>목적: 사용자 인증, 파일 저장, Postgres/pgvector 데이터 저장</li>
                  <li>위치: 지역 선택/가용 리전에 따름(국외 가능)</li>
                  <li>보호조치: RLS, 전송/저장 암호화, 세션 토큰 보호</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">OpenAI 등 LLM/임베딩 제공자</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>목적: 요약·퀴즈 생성·대화형 QA 및 임베딩 생성</li>
                  <li>전송 정보: 필요 최소한의 텍스트 청크/프롬프트</li>
                  <li>위치: 제공자 인프라(국외)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Sentry (선택적 오류 모니터링)</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>목적: 오류 추적 및 안정성 향상</li>
                  <li>전송 정보: 오류 이벤트·스택, 제한된 환경 정보</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <p className="text-sm text-muted-foreground">
            국외 이전이 필요한 경우, 관련 법률이 요구하는 적정성 결정 또는 표준 계약 조항 등 적절한 보호장치를 적용합니다.
          </p>
        </div>
      </section>

      <Separator className="my-8" />

      <section id="security" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">6) 보안</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>전송·저장 암호화, 접근 통제, 최소 권한 원칙 적용</li>
          <li>행(row) 수준 보안(RLS)로 사용자별 데이터 격리</li>
          <li>첨부 파일은 전용 버킷에 분리 저장, 경로·권한 관리</li>
          <li>비정상 활동 탐지 및 재시도/실패 처리 모니터링</li>
        </ul>
      </section>

      <Separator className="my-8" />

      <section id="rights" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">7) 이용자 권리</h2>
        <p className="mt-3 text-muted-foreground">
          사용자는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·처리정지 및 동의 철회를 요청할 수 있습니다. 서비스 내 다음 메뉴에서 직접 수행하거나, 필요 시 문의할 수 있습니다.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            동의 관리: {" "}
            <Link href="/onboarding/consent" className="underline underline-offset-4 decoration-primary hover:text-primary">동의 화면</Link>
          </li>
          <li>
            데이터 내보내기/삭제: {" "}
            <Link href="/settings/data" className="underline underline-offset-4 decoration-primary hover:text-primary">설정 &gt; 데이터</Link>
          </li>
          <li>
            개인정보 옵션: {" "}
            <Link href="/settings/privacy" className="underline underline-offset-4 decoration-primary hover:text-primary">설정 &gt; 개인정보</Link>
          </li>
        </ul>
      </section>

      <Separator className="my-8" />

      <section id="cookies" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">8) 쿠키·로컬 저장소</h2>
        <div className="mt-3 space-y-3 text-muted-foreground">
          <p>
            서비스는 인증 상태 유지를 위해 필수 쿠키/로컬 저장소(세션 토큰, PWA 상태 등)를 사용합니다. 이들은 서비스 제공에 필수적이며, 비활성화 시 로그인이 제한될 수 있습니다.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>목적: 로그인 세션 유지, 보안, 환경설정 저장</li>
            <li>보존: 브라우저 설정 또는 로그아웃/캐시 삭제 시까지</li>
          </ul>
        </div>
      </section>

      <Separator className="my-8" />

      <section id="children" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">9) 아동 보호</h2>
        <p className="mt-3 text-muted-foreground">
          서비스는 법정 최소 연령에 미달하는 아동을 대상으로 하지 않으며, 해당 연령 미만의 사용자는 가입할 수 없습니다. 부정확한 정보로 가입한 사실을 인지하는 즉시 계정 및 데이터를 삭제합니다.
        </p>
      </section>

      <Separator className="my-8" />

      <section id="changes" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">10) 정책 변경</h2>
        <p className="mt-3 text-muted-foreground">
          본 방침이 변경되는 경우, 본 페이지에 개정 내용을 게시하고, 중요한 변경은 서비스 내 공지 또는 이메일 등 합리적인 수단을 통해 통지합니다. 변경 시점 이후 서비스 이용은 변경 사항에 대한 동의를 의미합니다.
        </p>
      </section>

      <Separator className="my-8" />

      <section id="contact" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">11) 연락처</h2>
        <p className="mt-3 text-muted-foreground">
          문의 사항은 서비스 내 도움말 또는 다음 페이지를 통해 확인하실 수 있습니다: {" "}
          <Link href="/about" className="underline underline-offset-4 decoration-primary hover:text-primary">/about</Link>
        </p>
      </section>

      <Separator className="my-10" />

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          poiima를 시작하면 이용 전 {" "}
          <Link href="/onboarding/consent" className="underline underline-offset-4 decoration-primary hover:text-primary">동의 화면</Link>
          에서 다시 한 번 명시적으로 동의하게 됩니다.
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm text-foreground",
              "hover:bg-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            홈으로
          </Link>
          <Link
            href="/signup"
            className={cn(
              "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground",
              "hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            지금 가입하기
          </Link>
        </div>
      </div>
    </main>
  );
}
