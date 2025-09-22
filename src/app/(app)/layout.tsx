"use client";

/**
 * CODE INSIGHT
 * This code's use case is the authenticated app sub-layout for poiima, providing a fixed top app header and a persistent left sidebar.
 * It wraps all authenticated app pages under (app) with responsive, accessible navigation and user actions without adding marketing UI.
 */

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";

type Props = { children: React.ReactNode };

const NAV_ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "업로드",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 16.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/documents",
    label: "문서",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5" />
      </svg>
    ),
  },
  {
    href: "/reviews",
    label: "복습",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
        <path d="M22 4l-4 1 1-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/quizzes",
    label: "퀴즈",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M9 9a3 3 0 1 1 5.2 2.1c-.8.77-1.2 1.26-1.2 2.9M12 18h.01" strokeLinecap="round" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "설정",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.07a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.02 3.4l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.07c0 .66.39 1.26 1 1.51.57.24 1.22.12 1.69-.33l.06-.06A2 2 0 1 1 20.6 7l-.06.06c-.45.47-.57 1.12-.33 1.69.25.61.85 1 1.51 1H22a2 2 0 1 1 0 4h-.07c-.66 0-1.26.39-1.51 1z" />
      </svg>
    ),
  },
];

function AppHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = supabaseBrowser;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const initial = React.useMemo(() => (email ? email.charAt(0).toUpperCase() : "P"), [email]);

  const handleSignOut = async () => {
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      router.push("/login");
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label="사이드바 열기"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/dashboard" className="group flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="currentColor" opacity="0.9" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight group-hover:opacity-90">poiima</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/upload"
            className="hidden h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            새 업로드
          </Link>

          <div className="relative">
            <UserMenu initial={initial} email={email} onSignOut={handleSignOut} />
          </div>
        </div>
      </div>
    </header>
  );
}

function UserMenu({ initial, email, onSignOut }: { initial: string; email: string | null; onSignOut: () => void }) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-medium shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden className="select-none text-[0.9rem]">{initial}</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="사용자 메뉴"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">{email ?? "로그인 계정"}</div>
            <div className="truncate">인증됨</div>
          </div>
          <Separator />
          <div className="py-1 text-sm">
            <MenuItem href="/settings/account" label="계정" />
            <MenuItem href="/settings/preferences" label="환경설정" />
            <MenuItem href="/settings/privacy" label="개인정보" />
            <MenuItem href="/settings/usage" label="사용량" />
          </div>
          <Separator />
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" strokeLinecap="round" />
              <path d="M14 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
            </svg>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center px-3 py-2 hover:bg-accent hover:text-accent-foreground">
      {label}
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        aria-current={active ? "page" : undefined}
      >
        <span className={cn("text-muted-foreground group-hover:text-accent-foreground", active && "text-accent-foreground")}>{icon}</span>
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed top-16 z-40 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-border bg-sidebar px-3 py-4 md:flex">
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="mt-auto">
          <Separator className="my-3" />
          <div className="px-2 text-xs text-muted-foreground">v1.0.0</div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-80 border-r border-border bg-sidebar px-3 py-4 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

export default function AppLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#poiima-app-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        콘텐츠로 건너뛰기
      </a>

      <AppHeader onToggleSidebar={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main id="poiima-app-content" className="pt-16 md:pl-64">
        <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
