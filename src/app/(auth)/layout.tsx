"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a focused authentication sub-layout for poiima.
 * It centers auth content within a clean, branded shell without app-level headers/sidebars or marketing footers.
 * Minimal navigation is provided via subtle links to home (/) and privacy (/privacy).
 */

import React from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            aria-label="홈으로 이동"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← 홈
          </Link>
          <span className="sr-only">Authentication Area</span>
        </div>

        <main className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center">
            <Link
              href="/"
              aria-label="poiima 홈으로 이동"
              className="inline-flex items-center gap-2"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <span className="text-lg font-semibold">π</span>
              </div>
              <div className="text-left">
                <div className="text-2xl font-semibold tracking-tight">poiima</div>
                <div className="text-xs text-muted-foreground">AI 스마트 튜터</div>
              </div>
            </Link>
          </div>

          <section
            aria-label="인증 컨테이너"
            className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
          >
            {children}
          </section>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/privacy"
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              개인정보 처리방침
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
