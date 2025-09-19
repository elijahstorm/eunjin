"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a minimal, production-ready authentication layout for pages under the (auth) segment.
 * It renders a branded header linking to the marketing home (/), simple navigation to help/legal and auth routes,
 * and a clean, centered content area suitable for forms. It avoids sidebars and ensures consistent theming across
 * auth pages like sign-in, sign-up, reset-password, and verify-email.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAuthed, setIsAuthed] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    let unsub: (() => void) | undefined;

    supabaseBrowser.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user);
    });

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
    });

    unsub = () => sub?.subscription?.unsubscribe();
    return () => {
      try {
        unsub?.();
      } catch {}
    };
  }, []);

  const marketingLinks = [
    { href: "/", label: "홈" },
    { href: "/help", label: "도움말" },
    { href: "/legal/privacy", label: "개인정보 처리방침" },
    { href: "/legal/terms", label: "이용약관" },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 px-3 py-2 rounded-md bg-primary text-primary-foreground"
      >
        본문으로 건너뛰기
      </a>

      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="홈으로 이동" className="group inline-flex items-center gap-2">
                <BrandMark />
                <span className="font-semibold tracking-tight text-base sm:text-lg group-hover:text-primary transition-colors">
                  SnapScribe
                </span>
              </Link>
              <nav className="hidden md:flex md:items-center md:gap-1 ml-4">
                {marketingLinks.map((l) => (
                  <HeaderLink key={l.href} href={l.href} active={pathname === l.href}>
                    {l.label}
                  </HeaderLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {isMounted && isAuthed ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  대시보드로 이동
                </Link>
              ) : (
                <div className="flex items-center gap-1">
                  <Link
                    href="/auth/sign-in"
                    className={cn(
                      "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      pathname === "/auth/sign-in" && "bg-accent text-accent-foreground"
                    )}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        <Separator className="opacity-0" />
      </header>

      <main id="content" className="flex-1">
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-10 md:py-16">
          <div className="mx-auto w-full max-w-md">
            {children}
          </div>

          <div className="mx-auto mt-10 w-full max-w-md text-center text-sm text-muted-foreground">
            <p>
              계속 진행하면{" "}
              <Link href="/legal/terms" className="underline hover:text-primary">
                서비스 약관
              </Link>{" "}
              과{" "}
              <Link href="/legal/privacy" className="underline hover:text-primary">
                개인정보 처리방침
              </Link>
              에 동의하게 됩니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function HeaderLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded bg-primary text-primary-foreground font-bold">
      S
    </div>
  );
}
