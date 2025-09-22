"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide a protected sub-layout for the Settings section.
 * It renders a local tabbed/sub-navigation for Settings pages while inheriting the
 * main app header/sidebar from the parent app layout. It ensures authenticated access
 * on the client and offers a clean, responsive container for nested settings pages.
 */

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import { supabaseBrowser } from "@/utils/supabase/client-browser";

type Props = {
  children: React.ReactNode;
};

const settingsTabs: Array<{ label: string; href: string; match: (p: string) => boolean }> = [
  { label: "일반", href: "/settings", match: (p: string) => p === "/settings" },
  { label: "계정", href: "/settings/account", match: (p: string) => p.startsWith("/settings/account") },
  { label: "환경설정", href: "/settings/preferences", match: (p: string) => p.startsWith("/settings/preferences") },
  { label: "개인정보", href: "/settings/privacy", match: (p: string) => p.startsWith("/settings/privacy") },
  { label: "데이터", href: "/settings/data", match: (p: string) => p.startsWith("/settings/data") },
  { label: "사용량", href: "/settings/usage", match: (p: string) => p.startsWith("/settings/usage") },
];

export default function SettingsLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const verify = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      if (!data?.session) {
        const redirect = encodeURIComponent(pathname || "/settings");
        router.replace(`/login?redirect=${redirect}`);
        return;
      }
      setAuthChecked(true);
    };

    verify();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        const redirect = encodeURIComponent(pathname || "/settings");
        router.replace(`/login?redirect=${redirect}`);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          <span>로딩 중…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-3">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/dashboard" className="hover:text-foreground transition-colors">대시보드</Link>
            </li>
            <li className="select-none">/</li>
            <li className="text-foreground">설정</li>
          </ol>
        </nav>
      </div>

      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2">
            <div className="relative w-full overflow-x-auto">
              <div role="tablist" aria-label="Settings tabs" className="flex items-center gap-1 min-w-max">
                {settingsTabs.map((tab) => {
                  const active = tab.match(pathname);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      role="tab"
                      aria-selected={active}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:flex items-center">
              <Link
                href="/upload"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                업로드로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Separator />
        </div>
        {children}
      </div>
    </div>
  );
}
