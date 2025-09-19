"use client";

/**
 * CODE INSIGHT
 * This code's use case is to provide an organization members management page.
 * It offers member listing, role management, and invite workflows with clear UI.
 * It links users to related org and personal settings pages. Due to the absence
 * of a declared database schema in this context, it persists invites locally
 * while still integrating with Supabase Auth to show the current user.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { cn } from "@/utils/utils";


type Role = "owner" | "admin" | "member";

type Member = {
  id: string;
  email: string;
  name?: string;
  role: Role;
  joinedAt: string; // ISO string
};

type Invite = {
  id: string;
  email: string;
  role: Role;
  message?: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  token: string; // used as invite slug
};

type Notice = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
};

const LOCAL_MEMBERS_KEY = "org_members";
const LOCAL_INVITES_KEY = "org_invites";

function emailValid(email: string) {
  // reasonably strict, production-safe
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function makeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function makeToken(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(rnd, (b) => b.toString(16).padStart(2, "0")).join("");
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    owner: "bg-secondary text-secondary-foreground border border-border",
    admin: "bg-accent text-accent-foreground border border-border",
    member: "bg-muted text-muted-foreground border border-border",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[role])}>
      {role.toUpperCase()}
    </span>
  );
}

function AvatarCircle({ email, name }: { email?: string; name?: string }) {
  const letter = (name?.[0] || email?.[0] || "?").toUpperCase();
  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
      {letter}
    </div>
  );
}

export default function OrgMembersPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [form, setForm] = useState<{ email: string; role: Role; message: string; expiryDays: number }>(
    { email: "", role: "member", message: "", expiryDays: 7 }
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setUserLoading(true);
      const { data } = await supabaseBrowser.auth.getUser();
      if (!active) return;
      const email = data.user?.email ?? null;
      setUserEmail(email);
      setUserLoading(false);

      // Initialize local members if empty
      const localMembers = loadLocal<Member[]>(LOCAL_MEMBERS_KEY, []);
      const localInvites = loadLocal<Invite[]>(LOCAL_INVITES_KEY, []);

      if (localMembers.length === 0 && email) {
        const owner: Member = {
          id: makeId("mem"),
          email,
          name: data.user?.user_metadata?.full_name || undefined,
          role: "owner",
          joinedAt: new Date().toISOString(),
        };
        saveLocal(LOCAL_MEMBERS_KEY, [owner]);
        setMembers([owner]);
      } else {
        setMembers(localMembers);
      }
      setInvites(localInvites);
    })();
    return () => { active = false; };
  }, [supabaseBrowser]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => [m.email, m.name, m.role].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [members, query]);

  const filteredInvites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter((i) => [i.email, i.role, i.message].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [invites, query]);

  const pushNotice = useCallback((n: Omit<Notice, "id">) => {
    const id = makeId("notice");
    const item = { id, ...n } as Notice;
    setNotices((p) => [...p, item]);
    setTimeout(() => setNotices((p) => p.filter((x) => x.id !== id)), 4000);
  }, []);

  const handleInvite = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!emailValid(email)) {
      pushNotice({ type: "error", title: "잘못된 이메일", description: "올바른 이메일 주소를 입력하세요." });
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      pushNotice({ type: "error", title: "이미 구성원입니다", description: "해당 이메일은 이미 조직 구성원입니다." });
      return;
    }
    if (invites.some((i) => i.email.toLowerCase() === email)) {
      pushNotice({ type: "info", title: "이미 초대됨", description: "해당 이메일로 이미 초대가 발송되었습니다." });
      return;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + form.expiryDays * 24 * 60 * 60 * 1000);
    const inv: Invite = {
      id: makeId("inv"),
      email,
      role: form.role,
      message: form.message?.trim() || undefined,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      token: makeToken(),
    };

    const next = [inv, ...invites];
    setInvites(next);
    saveLocal(LOCAL_INVITES_KEY, next);
    setForm((f) => ({ ...f, email: "", message: "" }));

    pushNotice({ type: "success", title: "초대 생성됨", description: `${email} 에게 역할 ${inv.role} 초대가 생성되었습니다.` });
  }, [form.email, form.expiryDays, form.message, form.role, invites, members, pushNotice]);

  const handleCopyLink = useCallback(async (inv: Invite) => {
    try {
      const url = `${window.location.origin}/c/${inv.token}`;
      await navigator.clipboard.writeText(url);
      pushNotice({ type: "success", title: "초대 링크 복사됨", description: url });
    } catch {
      pushNotice({ type: "error", title: "복사 실패", description: "클립보드 접근이 거부되었습니다." });
    }
  }, [pushNotice]);

  const revokeInvite = useCallback((id: string) => {
    const next = invites.filter((i) => i.id !== id);
    setInvites(next);
    saveLocal(LOCAL_INVITES_KEY, next);
    pushNotice({ type: "info", title: "초대 취소됨" });
  }, [invites, pushNotice]);

  const changeMemberRole = useCallback((id: string, role: Role) => {
    setMembers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, role } : m));
      saveLocal(LOCAL_MEMBERS_KEY, next);
      return next;
    });
    pushNotice({ type: "success", title: "역할 변경됨" });
  }, [pushNotice]);

  const removeMember = useCallback((id: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;
    if (target.role === "owner") {
      pushNotice({ type: "error", title: "소유자는 제거할 수 없습니다" });
      return;
    }
    const ok = confirm(`정말로 ${target.email} 을(를) 제거하시겠습니까?`);
    if (!ok) return;
    const next = members.filter((m) => m.id !== id);
    setMembers(next);
    saveLocal(LOCAL_MEMBERS_KEY, next);
    pushNotice({ type: "info", title: "구성원 제거됨" });
  }, [members, pushNotice]);

  const acceptInviteLocal = useCallback((invite: Invite) => {
    // Local accept: convert invite to member (for demo/local flow only)
    const newMember: Member = {
      id: makeId("mem"),
      email: invite.email,
      role: invite.role,
      joinedAt: new Date().toISOString(),
    };
    const nextMembers = [newMember, ...members];
    const nextInvites = invites.filter((i) => i.id !== invite.id);
    setMembers(nextMembers);
    setInvites(nextInvites);
    saveLocal(LOCAL_MEMBERS_KEY, nextMembers);
    saveLocal(LOCAL_INVITES_KEY, nextInvites);
    pushNotice({ type: "success", title: "초대 수락됨", description: `${invite.email} 이(가) ${invite.role} 로 추가되었습니다.` });
  }, [invites, members, pushNotice]);

  const isExpired = useCallback((i: Invite) => Date.now() > new Date(i.expiresAt).getTime(), []);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <nav className="text-sm text-muted-foreground">
              <Link href="/org" className="hover:text-foreground transition-colors">조직</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground font-medium">구성원</span>
            </nav>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">조직 구성원 및 권한 관리</h1>
            <p className="text-sm text-muted-foreground mt-1">
              구성원을 초대하고 역할을 관리하세요. 개인 설정은
              {" "}
              <Link href="/settings/profile" className="text-primary underline-offset-2 underline">프로필 설정</Link>
              {" "}
              에서 변경할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/org/settings" className="inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">
              조직 설정
            </Link>
            <Link href="/org/security" className="inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">
              보안 정책
            </Link>
            <Link href="/org/retention" className="inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">
              보존 기간
            </Link>
          </div>
        </div>

        {notices.length > 0 && (
          <div className="space-y-2">
            {notices.map((n) => (
              <Alert key={n.id} variant={n.type === "error" ? "destructive" : n.type === "success" ? "default" : "secondary"} className="border">
                <AlertTitle>{n.title}</AlertTitle>
                {n.description && <AlertDescription>{n.description}</AlertDescription>}
              </Alert>
            ))}
          </div>
        )}

        <section className="rounded-lg border border-border bg-card text-card-foreground">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">초대 보내기</h2>
                <p className="text-sm text-muted-foreground">이메일로 초대장을 보내 역할을 지정하세요. 초대 링크를 복사해 수동 전달도 가능합니다.</p>
              </div>
              <Link href="/integrations" className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm hover:opacity-90">
                통합 관리 (Zoom/Teams)
              </Link>
            </div>

            <form onSubmit={handleInvite} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="block text-sm font-medium mb-1">이메일</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">역할</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">만료(일)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.expiryDays}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDays: Math.max(1, Math.min(30, Number(e.target.value) || 1)) }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-medium mb-1">메시지 (선택)</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={2}
                  placeholder="팀에 합류해 주세요. 보안과 개인정보 보호 정책에 동의해 주세요."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="md:col-span-12 flex items-center gap-2">
                <button type="submit" className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">초대 생성</button>
                <Link href="/consent/new" className="inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">녹음 동의서 준비</Link>
              </div>
            </form>
          </div>

          <Separator />

          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-medium">구성원</h3>
                <p className="text-sm text-muted-foreground">조직에 속한 모든 구성원을 확인하고 역할을 변경하세요.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름, 이메일, 역할 검색"
                  className="w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Link href="/sessions" className="hidden sm:inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">세션</Link>
                <Link href="/dashboard" className="hidden sm:inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">대시보드</Link>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-border">
              <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-6 sm:col-span-5">사용자</div>
                <div className="col-span-3 sm:col-span-3">역할</div>
                <div className="col-span-3 sm:col-span-4 text-right">작업</div>
              </div>
              <ul className="divide-y divide-border">
                {userLoading ? (
                  <li className="p-3">
                    <Skeleton className="h-6 w-1/2" />
                  </li>
                ) : filteredMembers.length === 0 ? (
                  <li className="p-6 text-sm text-muted-foreground">구성원이 없습니다. 초대를 생성해 팀을 시작하세요.</li>
                ) : (
                  filteredMembers.map((m) => (
                    <li key={m.id} className="grid grid-cols-12 items-center px-3 py-3 gap-2">
                      <div className="col-span-6 sm:col-span-5 flex items-center gap-3 overflow-hidden">
                        <AvatarCircle email={m.email} name={m.name} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{m.name || m.email}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.name ? m.email : new Date(m.joinedAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-3 flex items-center gap-2">
                        <RoleBadge role={m.role} />
                        {m.role !== "owner" && (
                          <select
                            aria-label="역할 변경"
                            value={m.role}
                            onChange={(e) => changeMemberRole(m.id, e.target.value as Role)}
                            className="ml-1 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                      <div className="col-span-3 sm:col-span-4 flex items-center justify-end gap-2">
                        <Link href={`/sessions/new`} className="hidden md:inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-2.5 py-1.5 text-xs hover:bg-muted">새 세션</Link>
                        <Link href={`/settings/profile`} className="hidden md:inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-2.5 py-1.5 text-xs hover:bg-muted">내 설정</Link>
                        {m.role !== "owner" && (
                          <button
                            onClick={() => removeMember(m.id)}
                            className="inline-flex items-center rounded-md bg-destructive text-destructive-foreground px-2.5 py-1.5 text-xs hover:opacity-90"
                          >
                            제거
                          </button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <Separator />

          <div className="p-4 sm:p-6">
            <Collapsible open={inviteOpen} onOpenChange={setInviteOpen}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">대기 중 초대</h3>
                  <p className="text-sm text-muted-foreground">발송된 초대와 만료 상태를 확인하세요.</p>
                </div>
                <CollapsibleTrigger asChild>
                  <button className="inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm hover:bg-muted">
                    {inviteOpen ? "접기" : "펼치기"}
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-4 overflow-hidden rounded-md border border-border">
                  <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <div className="col-span-5">이메일</div>
                    <div className="col-span-2">역할</div>
                    <div className="col-span-3">만료</div>
                    <div className="col-span-2 text-right">작업</div>
                  </div>
                  <ul className="divide-y divide-border">
                    {filteredInvites.length === 0 ? (
                      <li className="p-6 text-sm text-muted-foreground">대기 중인 초대가 없습니다.</li>
                    ) : (
                      filteredInvites.map((i) => {
                        const expired = isExpired(i);
                        return (
                          <li key={i.id} className="grid grid-cols-12 items-center px-3 py-3 gap-2">
                            <div className="col-span-5">
                              <div className="text-sm font-medium text-foreground">{i.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{i.message || "메시지 없음"}</div>
                            </div>
                            <div className="col-span-2">
                              <RoleBadge role={i.role} />
                            </div>
                            <div className="col-span-3 text-sm">
                              <span className={cn("inline-flex items-center", expired ? "text-destructive" : "text-muted-foreground")}>{new Date(i.expiresAt).toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <button onClick={() => handleCopyLink(i)} className="inline-flex items-center rounded-md border border-border bg-card text-card-foreground px-2.5 py-1.5 text-xs hover:bg-muted">링크 복사</button>
                              <button onClick={() => revokeInvite(i.id)} className="inline-flex items-center rounded-md bg-destructive text-destructive-foreground px-2.5 py-1.5 text-xs hover:opacity-90">취소</button>
                              {!expired && (
                                <button onClick={() => acceptInviteLocal(i)} className="hidden sm:inline-flex items-center rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 text-xs hover:opacity-90">수락(로컬)</button>
                              )}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card text-card-foreground p-4 sm:p-6">
          <h3 className="text-base font-medium">다음 단계</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/help" className="block rounded-lg border border-border p-4 hover:bg-muted transition-colors">
              <div className="text-sm font-medium">도움말 센터</div>
              <p className="text-xs text-muted-foreground mt-1">실시간 전사, 하이라이트, 요약 워크플로우 가이드를 확인하세요.</p>
            </Link>
            <Link href="/legal/privacy" className="block rounded-lg border border-border p-4 hover:bg-muted transition-colors">
              <div className="text-sm font-medium">개인정보 처리방침</div>
              <p className="text-xs text-muted-foreground mt-1">데이터 보안과 프라이버시 정책을 확인하세요.</p>
            </Link>
            <Link href="/legal/terms" className="block rounded-lg border border-border p-4 hover:bg-muted transition-colors">
              <div className="text-sm font-medium">서비스 약관</div>
              <p className="text-xs text-muted-foreground mt-1">서비스 이용 조건과 책임 범위를 검토하세요.</p>
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>로그인 계정:</span>
          {userLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span className="font-medium text-foreground">{userEmail ?? "로그인되지 않음"}</span>
          )}
          <span className="mx-2">•</span>
          <Link href="/me" className="underline underline-offset-2 hover:text-foreground">내 페이지</Link>
          <span className="mx-2">•</span>
          <Link href="/settings/notifications" className="underline underline-offset-2 hover:text-foreground">알림 설정</Link>
          <span className="mx-2">•</span>
          <Link href="/devices" className="underline underline-offset-2 pointer-events-none opacity-50">장치</Link>
          <span className="mx-2">•</span>
          <Link href="/admin" className="underline underline-offset-2 hover:text-foreground">관리자</Link>
        </div>
      </div>
    </main>
  );
}
