"use client";

/**
 * CODE INSIGHT
 * This code's use case is an onboarding sub-layout for the authentication flow.
 * It renders a minimal top stepper (without app header/sidebar) and a focused content area
 * for steps like welcome and consent. It also includes a compact footer with essential links.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/onboarding";

  const steps = [
    { key: "welcome", label: "환영합니다", href: "/onboarding/welcome" },
    { key: "consent", label: "동의", href: "/onboarding/consent" },
  ] as const;

  let currentIndex = steps.findIndex((s) => pathname.startsWith(`/onboarding/${s.key}`));
  if (currentIndex === -1) currentIndex = 0;

  const progress = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 100;

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <header className="w-full px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="poiima 홈으로 이동">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
              π
            </div>
            <span className="font-semibold text-base sm:text-lg">poiima</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              도움말
            </Link>
          </nav>
        </div>
      </header>

      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div aria-label="온보딩 단계" className="flex flex-col gap-3">
            <ol className="flex items-center justify-center gap-3 sm:gap-6">
              {steps.map((step, idx) => {
                const status = idx < currentIndex ? "complete" : idx === currentIndex ? "current" : "upcoming";
                return (
                  <li key={step.key} className="flex items-center gap-2 sm:gap-3">
                    <Link
                      href={step.href}
                      className={cn(
                        "group flex items-center gap-2",
                        status === "complete" && "cursor-pointer",
                        status !== "complete" && "cursor-default"
                      )}
                      aria-current={status === "current" ? "step" : undefined}
                    >
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                          status === "complete" && "bg-primary text-primary-foreground border-primary",
                          status === "current" && "bg-card text-primary border-primary",
                          status === "upcoming" && "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium",
                          status === "current" ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span className="hidden xs:inline">{step.label}</span>
                        <span className="xs:hidden">{status === "complete" ? step.label : ""}</span>
                      </span>
                    </Link>
                    {idx < steps.length - 1 && (
                      <div className="hidden sm:block h-px w-10 bg-border" aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="relative h-1.5 w-full rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div
                className="absolute left-0 top-0 h-1.5 rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Separator className="mt-4" />
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6">
        <section className="mx-auto w-full max-w-2xl py-6 sm:py-8">
          <div className="bg-card border rounded-xl shadow-sm p-5 sm:p-8">
            {children}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} poiima</p>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">소개</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">개인정보</Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">로그인</Link>
            <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors">회원가입</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
