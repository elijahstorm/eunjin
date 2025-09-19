"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an authenticated application shell layout for the (app) section.
 * It enforces an auth gate using Supabase Auth on the client, renders a responsive sidebar and topbar,
 * includes an organization switcher (local persistence), realtime connectivity indicators (online/offline & visibility),
 * and primary navigation linking to key app pages like dashboard, sessions, imports, integrations, consent, org, and settings.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Menu,
  X,
  ChevronDown,
  Wifi,
  WifiOff,
  Radio,
  Home,
  CalendarClock,
  PlusCircle,
  HardDriveUpload,
  PlugZap,
  ShieldCheck,
  Users,
  Building2,
  Settings as SettingsIcon,
  Bell,
  Laptop,
  User,
  LogOut,
  Gauge,
  Activity,
  DollarSign,
  HelpCircle,
  FileText,
} from "lucide-react";

function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useDocumentVisibility() {
  const [visible, setVisible] = useState<boolean>(typeof document !== "undefined" ? document.visibilityState === "visible" : true);
  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  return visible;
}

function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: React.ComponentType<any>; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pt-4 pb-2 text-xs font-medium uppercase text-muted-foreground/70">{children}</div>;
}

function OrgSwitcher({ onChanged }: { onChanged?: (org: string) => void }) {
  const [open, setOpen] = useState(false);
  const [org, setOrg] = useState<string>("Personal");
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));

  useEffect(() => {
    const stored = localStorage.getItem("dc_org_name");
    if (stored) setOrg(stored);
  }, []);

  const select = useCallback(
    (name: string) => {
      setOrg(name);
      localStorage.setItem("dc_org_name", name);
      setOpen(false);
      onChanged?.(name);
    },
    [onChanged]
  );

  const options = [
    { name: "Personal" },
    { name: "Team Alpha" },
    { name: "Lecture Lab" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="truncate max-w-[140px]">{org}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="p-2">
            {options.map((o) => (
              <button
                key={o.name}
                onClick={() => select(o.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted",
                  o.name === org && "bg-primary/10 text-primary"
                )}
              >
                <Users className="h-4 w-4" />
                <span className="truncate">{o.name}</span>
              </button>
            ))}
          </div>
          <Separator />
          <div className="p-2">
            <Link href="/org/settings" className="block rounded-sm px-2 py-2 text-sm hover:bg-muted">
              Organization settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ email, onSignOut }: { email?: string | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm font-medium">Account</span>
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{email ?? ""}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="p-2 text-sm">
            <Link href="/me" className="block rounded-sm px-2 py-2 hover:bg-muted">Profile</Link>
            <Link href="/settings/profile" className="block rounded-sm px-2 py-2 hover:bg-muted">Settings</Link>
            <Link href="/settings/notifications" className="block rounded-sm px-2 py-2 hover:bg-muted">Notifications</Link>
            <Link href="/settings/devices" className="block rounded-sm px-2 py-2 hover:bg-muted">Devices</Link>
            <Separator className="my-2" />
            <Link href="/admin" className="block rounded-sm px-2 py-2 hover:bg-muted">Admin</Link>
            <Separator className="my-2" />
            <button onClick={onSignOut} className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-muted">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RealtimeBadge() {
  const online = useOnlineStatus();
  const visible = useDocumentVisibility();
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className={cn("flex items-center gap-1 rounded-full px-2 py-1", online ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300")}
        title={online ? "Online" : "Offline"}
      >
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        <span>{online ? "Online" : "Offline"}</span>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground" title={visible ? "Active" : "Background tab"}>
        <Radio className={cn("h-3.5 w-3.5", visible ? "text-primary" : "text-muted-foreground")} />
        <span>{visible ? "Live" : "Background"}</span>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    let mounted = true;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (!session) {
        router.replace("/auth/sign-in");
      } else {
        setEmail(session.user.email ?? null);
      }
      setChecking(false);
    });
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/auth/sign-in");
      } else {
        setEmail(session.user.email ?? null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = useCallback(async () => {
    await supabaseBrowser.auth.signOut();
    router.replace("/auth/sign-in");
  }, [router]);

  const nav = useMemo(
    () => [
      {
        label: "Overview",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: Home },
        ],
      },
      {
        label: "Sessions",
        items: [
          { href: "/sessions", label: "All sessions", icon: CalendarClock },
          { href: "/sessions/new", label: "New session", icon: PlusCircle },
          { href: "/ingest", label: "Ingest", icon: HardDriveUpload },
          { href: "/ingest/upload", label: "Upload", icon: HardDriveUpload },
          { href: "/imports", label: "Imports", icon: HardDriveUpload },
        ],
      },
      {
        label: "Integrations",
        items: [
          { href: "/integrations", label: "All integrations", icon: PlugZap },
          { href: "/integrations/zoom", label: "Zoom", icon: PlugZap },
          { href: "/integrations/teams", label: "Microsoft Teams", icon: PlugZap },
        ],
      },
      {
        label: "Consent",
        items: [
          { href: "/consent", label: "Consent", icon: ShieldCheck },
          { href: "/consent/new", label: "New consent", icon: PlusCircle },
        ],
      },
      {
        label: "Organization",
        items: [
          { href: "/org", label: "Overview", icon: Building2 },
          { href: "/org/members", label: "Members", icon: Users },
          { href: "/org/settings", label: "Settings", icon: SettingsIcon },
          { href: "/org/retention", label: "Retention", icon: Gauge },
          { href: "/org/security", label: "Security", icon: ShieldCheck },
        ],
      },
      {
        label: "Settings",
        items: [
          { href: "/settings/profile", label: "Profile", icon: User },
          { href: "/settings/notifications", label: "Notifications", icon: Bell },
          { href: "/settings/devices", label: "Devices", icon: Laptop },
        ],
      },
      {
        label: "Admin",
        items: [
          { href: "/admin", label: "Admin home", icon: SettingsIcon },
          { href: "/admin/metrics", label: "Metrics", icon: Activity },
          { href: "/admin/jobs", label: "Jobs", icon: Gauge },
          { href: "/admin/costs", label: "Costs", icon: DollarSign },
        ],
      },
    ],
    []
  );

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-14 items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
        <div className="flex">
          <div className="hidden md:block w-64 border-r border-border p-4">
            <Skeleton className="h-8 w-40" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-10 w-1/3" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-3 px-3 md:px-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md border border-input p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold sm:inline">Realtime Summaries</span>
          </Link>
          <Separator orientation="vertical" className="mx-2 hidden h-6 md:block" />
          <div className="hidden items-center gap-2 md:flex">
            <OrgSwitcher />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <RealtimeBadge />
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted">
                <HelpCircle className="h-4 w-4" /> Help
              </Link>
              <Link href="/legal/privacy" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted">
                Privacy
              </Link>
              <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted">
                Terms
              </Link>
            </div>
            <ProfileMenu email={email} onSignOut={signOut} />
          </div>
        </div>
        {!online && (
          <div className="border-t border-border bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="mx-auto max-w-screen-2xl px-4">
              <Alert className="border-0 bg-transparent p-2">
                <AlertTitle className="text-xs font-medium">You are offline</AlertTitle>
                <AlertDescription className="text-xs">Changes will sync automatically when you reconnect.</AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-14 z-30 w-72 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <nav className="h-full overflow-y-auto pb-6">
            <div className="p-4">
              {nav.map((section) => (
                <div key={section.label}>
                  <SectionLabel>{section.label}</SectionLabel>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} active={pathname === item.href} />
                    ))}
                  </div>
                </div>
              ))}
              <SectionLabel>More</SectionLabel>
              <div className="space-y-1">
                <NavLink href="/integrations/zoom/linked" icon={PlugZap} label="Zoom linked" active={pathname === "/integrations/zoom/linked"} />
                <NavLink href="/integrations/teams/linked" icon={PlugZap} label="Teams linked" active={pathname === "/integrations/teams/linked"} />
                <NavLink href="/imports/[importId]" icon={HardDriveUpload} label="Recent import" active={pathname === "/imports/[importId]"} />
                <NavLink href="/offline" icon={WifiOff} label="Offline" active={pathname === "/offline"} />
              </div>
            </div>
          </nav>
        </aside>

        <main id="main" className="flex-1 md:ml-0 md:pl-0 ml-0 pl-0">
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6">
            {children}
          </div>
          <footer className="border-t border-border bg-background/50">
            <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row">
              <div className="flex items-center gap-2">
                <span>© {new Date().getFullYear()} Realtime Summaries</span>
                <span className="hidden md:inline">•</span>
                <Link className="hover:text-foreground" href="/help">Help</Link>
                <span className="hidden md:inline">•</span>
                <Link className="hover:text-foreground" href="/legal/privacy">Privacy</Link>
                <span className="hidden md:inline">•</span>
                <Link className="hover:text-foreground" href="/legal/terms">Terms</Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Activity className="h-4 w-4" /> Status</span>
                <Link className="hover:text-foreground" href="/integrations">Integrations</Link>
                <Link className="hover:text-foreground" href="/consent">Consent</Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
