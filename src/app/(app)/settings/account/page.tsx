"use client";

/**
 * CODE INSIGHT
 * This code's use case is the Account & Profile Settings page for authenticated users.
 * It allows viewing/updating profile display name, email (via Supabase Auth), and avatar (via Supabase Storage),
 * and provides sub-navigation to other settings sections and a link back to the dashboard.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/utils";

type Profile = {
  id?: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export default function AccountSettingsPage() {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; title: string; description?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasProfileChanges = useMemo(() => {
    if (!profile || !initialProfile) return false;
    return (
      profile.display_name.trim() !== initialProfile.display_name.trim() || (profile.avatar_url || "") !== (initialProfile.avatar_url || "")
    );
  }, [profile, initialProfile]);

  const hasEmailChange = useMemo(() => email.trim() !== initialEmail.trim(), [email, initialEmail]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabaseBrowser.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        setUserId(null);
        setProfile(null);
        setInitialProfile(null);
        setEmail("");
        setInitialEmail("");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      setInitialEmail(user.email ?? "");

      const { data: prof, error: profErr } = await supabaseBrowser
        .from("profiles")
        .select("id,user_id,display_name,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const fallbackName =
        (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || (user.email ? user.email.split("@")[0] : "사용자");
      const fallbackAvatar = (user.user_metadata && user.user_metadata.avatar_url) || null;

      const finalProfile: Profile = {
        id: prof?.id,
        user_id: user.id,
        display_name: prof?.display_name?.trim() || fallbackName,
        avatar_url: prof?.avatar_url || fallbackAvatar,
      };

      setProfile(finalProfile);
      setInitialProfile({ ...finalProfile });
    } catch (err: any) {
      setMessage({ type: "error", title: "로딩 실패", description: err?.message || "계정 정보를 불러오는 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }, [supabaseBrowser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSaveProfile = useCallback(async () => {
    if (!profile || !userId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        user_id: userId,
        display_name: profile.display_name.trim(),
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseBrowser.from("profiles").upsert(payload, { onConflict: "user_id" }).select().maybeSingle();
      if (error) throw error;
      const updated: Profile = {
        id: data?.id,
        user_id: userId,
        display_name: payload.display_name,
        avatar_url: payload.avatar_url || null,
      };
      setProfile(updated);
      setInitialProfile({ ...updated });
      setMessage({ type: "success", title: "프로필이 저장되었습니다." });
    } catch (err: any) {
      setMessage({ type: "error", title: "저장 실패", description: err?.message || "프로필 저장 중 문제가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }, [profile, supabaseBrowser, userId]);

  const onUpdateEmail = useCallback(async () => {
    if (!hasEmailChange) return;
    setEmailSaving(true);
    setMessage(null);
    try {
      const newEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw new Error("올바른 이메일 형식이 아닙니다.");
      }
      const { error } = await supabaseBrowser.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setInitialEmail(newEmail);
      setMessage({
        type: "success",
        title: "이메일 변경 요청됨",
        description: "이메일 변경 확인을 위한 메일이 전송되었습니다. 받은 편지함을 확인해주세요.",
      });
    } catch (err: any) {
      setMessage({ type: "error", title: "이메일 변경 실패", description: err?.message || "이메일 변경 중 오류가 발생했습니다." });
    } finally {
      setEmailSaving(false);
    }
  }, [email, hasEmailChange, supabaseBrowser.auth]);

  const onAvatarPick = useCallback(async (file: File) => {
    if (!userId) return;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", title: "이미지 파일만 업로드할 수 있습니다." });
      return;
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      setMessage({ type: "error", title: "파일 용량 초과", description: "아바타는 최대 5MB까지 업로드 가능합니다." });
      return;
    }

    setAvatarUploading(true);
    setMessage(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabaseBrowser.storage.from("avatars").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });
      if (uploadErr) throw uploadErr;

      const { data } = supabaseBrowser.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("퍼블릭 URL을 생성할 수 없습니다.");

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      setMessage({ type: "success", title: "아바타 업로드 완료" });
    } catch (err: any) {
      setMessage({
        type: "error",
        title: "아바타 업로드 실패",
        description: err?.message || "스토리지 업로드 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [supabaseBrowser.storage, userId]);

  const onAvatarInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) onAvatarPick(f);
  };

  const onRemoveAvatar = useCallback(() => {
    setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
  }, []);

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition",
          active
            ? "bg-primary text-primary-foreground shadow"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-foreground/70 hover:text-foreground transition"
            aria-label="대시보드로 돌아가기"
          >
            ← 대시보드
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">계정 및 프로필</h1>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <NavLink href="/settings/account" label="계정" />
        <NavLink href="/settings/preferences" label="환경설정" />
        <NavLink href="/settings/privacy" label="프라이버시" />
        <NavLink href="/settings/data" label="데이터" />
        <NavLink href="/settings/usage" label="사용량" />
      </div>

      {message && (
        <Alert
          className={cn(
            "mb-6 border",
            message.type === "success"
              ? "bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800"
              : "bg-destructive/10 text-destructive border-destructive/30"
          )}
        >
          <AlertTitle>{message.title}</AlertTitle>
          {message.description && <AlertDescription>{message.description}</AlertDescription>}
        </Alert>
      )}

      <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {loading ? (
                <Skeleton className="h-16 w-16 rounded-full" />
              ) : (
                <div className="relative w-16 h-16">
                  <img
                    src={profile?.avatar_url || "/avatar-placeholder.png"}
                    alt="아바타"
                    className="w-16 h-16 rounded-full object-cover bg-muted"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className={cn(
                      "absolute bottom-0 right-0 inline-flex items-center justify-center h-8 w-8 rounded-full border border-border",
                      "bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label="아바타 변경"
                  >
                    {avatarUploading ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M12 6v12m6-6H6" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              <div>
                <h2 className="text-base sm:text-lg font-semibold">프로필</h2>
                <p className="text-sm text-muted-foreground">이름, 이메일, 아바타를 관리하세요.</p>
              </div>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarInputChange} />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="display_name" className="text-sm font-medium">표시 이름</label>
              {loading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <input
                  id="display_name"
                  type="text"
                  value={profile?.display_name || ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, display_name: e.target.value } : p))}
                  placeholder="예: 홍길동"
                  className={cn(
                    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              )}
              <p className="text-xs text-muted-foreground">다른 사용자에게 표시되는 이름입니다.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">이메일</label>
              {loading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <div className="flex gap-2">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                  <button
                    type="button"
                    onClick={onUpdateEmail}
                    disabled={!hasEmailChange || emailSaving}
                    className={cn(
                      "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition",
                      hasEmailChange && !emailSaving
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {emailSaving ? "저장 중..." : "변경"}
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">이메일 변경 시 확인 메일이 전송됩니다.</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">아바타</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading || loading}
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition",
                    "hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {avatarUploading ? "업로드 중..." : "이미지 선택"}
                </button>
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={loading || avatarUploading || !profile?.avatar_url}
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition",
                    profile?.avatar_url ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
                  )}
                >
                  제거
                </button>
              </div>
              <p className="text-xs text-muted-foreground">권장: 정사각형 이미지, 최대 5MB.</p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (initialProfile) setProfile({ ...initialProfile });
                setEmail(initialEmail);
                setMessage(null);
              }}
              disabled={(!hasProfileChanges && !hasEmailChange) || saving || emailSaving}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition",
                !hasProfileChanges && !hasEmailChange ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
              )}
            >
              변경 취소
            </button>
            <button
              type="button"
              onClick={onSaveProfile}
              disabled={!hasProfileChanges || saving}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition",
                hasProfileChanges && !saving
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? "저장 중..." : "프로필 저장"}
            </button>
          </div>
        </div>
      </section>

      {!userId && !loading && (
        <div className="mt-6">
          <Alert className="border bg-destructive/10 text-destructive border-destructive/30">
            <AlertTitle>로그인이 필요합니다</AlertTitle>
            <AlertDescription>
              이 페이지는 보호되어 있습니다. 계속하려면
              <Link href="/login" className="ml-1 underline hover:opacity-80">로그인</Link> 해주세요.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
