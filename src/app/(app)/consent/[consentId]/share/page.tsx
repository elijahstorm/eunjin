"use client";

/**
 * CODE INSIGHT
 * This code's use case is a sharing panel for a specific consent resource, allowing the owner to distribute a public link (/c/[slug]) to collect participant consent. It generates and displays a QR code for the link, and provides copy/open/download actions. It intentionally avoids server/database calls and uses the route param as the slug.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import QRCode from "qrcode";

export default function ConsentSharePage() {
  const params = useParams<{ consentId: string }>();
  const consentId = params?.consentId ?? "";

  const [origin, setOrigin] = useState<string>(
    (process.env.NEXT_PUBLIC_APP_URL as string) || (process.env.NEXT_PUBLIC_SITE_URL as string) || ""
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const sharePath = useMemo(() => `/c/${encodeURIComponent(consentId)}`, [consentId]);
  const shareUrl = useMemo(() => {
    if (!origin) return sharePath; // Fallback to path-only until origin is known
    const base = origin.replace(/\/$/, "");
    return `${base}${sharePath}`;
  }, [origin, sharePath]);

  useEffect(() => {
    let active = true;
    async function generateQR() {
      try {
        const dataUrl = await QRCode.toDataURL(shareUrl, {
          errorCorrectionLevel: "M",
          width: 512,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        if (active) setQrDataUrl(dataUrl);
      } catch (e) {
        // Silent fail; UI still usable without QR
      }
    }
    if (shareUrl) generateQR();
    return () => {
      active = false;
    };
  }, [shareUrl]);

  async function handleCopy() {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      // Fallback prompt
      try {
        const ok = window.confirm(`Unable to copy automatically.\n\nShare link:\n${shareUrl}\n\nOpen this link and copy manually?`);
        if (ok) window.open(shareUrl, "_blank", "noopener,noreferrer");
      } catch {}
    } finally {
      setIsCopying(false);
    }
  }

  function handleOpen() {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDownload() {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = qrDataUrl;
      a.download = `consent-${consentId}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  }

  async function handleShareNative() {
    if (!navigator.share) return handleCopy();
    setSharing(true);
    try {
      await navigator.share({ title: "Consent Link", text: "Please open to submit consent.", url: shareUrl });
    } catch {
      // ignore
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto w-full p-6 md:p-10">
      <div className="mb-6">
        <nav className="text-sm text-muted-foreground mb-2 flex gap-2 flex-wrap">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/consent" className="hover:text-foreground transition-colors">Consents</Link>
          <span>/</span>
          <Link href={`/consent/${encodeURIComponent(consentId)}`} className="hover:text-foreground transition-colors">{consentId || "..."}</Link>
          <span>/</span>
          <span className="text-foreground">Share</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Share consent link</h1>
        <p className="text-muted-foreground mt-1">Generate a public link and QR code to collect participant consent before recording.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <label htmlFor="share-link" className="block text-xs font-medium text-muted-foreground mb-1">Public link</label>
                  <div className="flex items-stretch gap-2">
                    <input
                      id="share-link"
                      value={shareUrl}
                      readOnly
                      className="flex-1 rounded-md border border-input bg-muted text-foreground px-3 py-2 text-sm truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      onClick={handleCopy}
                      disabled={isCopying}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-secondary text-secondary-foreground hover:opacity-90 px-3 py-2 text-sm transition disabled:opacity-50 border border-border"
                    >
                      {copied ? "Copied" : isCopying ? "Copying…" : "Copy"}
                    </button>
                    <button
                      onClick={handleOpen}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary text-primary-foreground hover:opacity-90 px-3 py-2 text-sm transition"
                    >
                      Open
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleShareNative}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-accent text-accent-foreground hover:opacity-90 px-3 py-2 text-sm transition"
                  >
                    {sharing ? "Sharing…" : "Share"}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!qrDataUrl || downloading}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-secondary text-secondary-foreground hover:opacity-90 px-3 py-2 text-sm transition disabled:opacity-50 border border-border"
                  >
                    {downloading ? "Downloading…" : "Download QR"}
                  </button>
                </div>
              </div>

              <Separator className="my-5" />

              <Alert className="bg-muted/50">
                <AlertTitle>Anyone with the link can submit consent</AlertTitle>
                <AlertDescription>
                  Share this link with participants to record their consent. After submission, they will be redirected to a success page.
                </AlertDescription>
              </Alert>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-sm font-medium mb-1">Public landing</div>
                  <p className="text-sm text-muted-foreground mb-3">Participants open the link and fill in the consent form.</p>
                  <Link href={sharePath} target="_blank" className="text-primary hover:underline break-all">{shareUrl}</Link>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="text-sm font-medium mb-1">Success page</div>
                  <p className="text-sm text-muted-foreground mb-3">Shown after a successful submission.</p>
                  <Link href={`${sharePath}/success`} target="_blank" className="text-primary hover:underline break-all">{origin ? `${origin}${sharePath}/success` : `${sharePath}/success`}</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm font-medium mb-1">Next steps</div>
              <ul className="text-sm text-muted-foreground list-disc ml-4 space-y-1">
                <li>
                  Start a session when participants are ready: <Link href="/sessions" className="text-primary hover:underline">Sessions</Link>
                </li>
                <li>
                  Connect Zoom or Teams to import recordings: <Link href="/integrations/zoom" className="text-primary hover:underline">Zoom</Link> · <Link href="/integrations/teams" className="text-primary hover:underline">Teams</Link>
                </li>
                <li>
                  Manage organization policies: <Link href="/org/settings" className="text-primary hover:underline">Org Settings</Link>
                </li>
                <li>
                  Read more: <Link href="/help" className="text-primary hover:underline">Help Center</Link> · <Link href="/legal/privacy" className="text-primary hover:underline">Privacy</Link>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-sm font-medium mb-1">Manage this consent</div>
              <ul className="text-sm text-muted-foreground list-disc ml-4 space-y-1">
                <li>
                  View details: <Link href={`/consent/${encodeURIComponent(consentId)}`} className="text-primary hover:underline">Consent page</Link>
                </li>
                <li>
                  All consents: <Link href="/consent" className="text-primary hover:underline">Browse</Link> · <Link href="/consent/new" className="text-primary hover:underline">Create new</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm sticky top-6">
            <div className="p-5 md:p-6">
              <div className="text-sm font-medium">QR code</div>
              <p className="text-sm text-muted-foreground mb-4">Print or display this QR so participants can scan and open the consent form.</p>
              <div className="bg-white rounded-lg p-3 border border-border flex items-center justify-center">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Consent QR code" className="w-full h-auto max-w-[280px]" />
                ) : (
                  <div className="w-full aspect-square max-w-[280px] animate-pulse bg-muted rounded" />
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!qrDataUrl || downloading}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-secondary text-secondary-foreground hover:opacity-90 px-3 py-2 text-sm transition disabled:opacity-50 border border-border"
                >
                  {downloading ? "Downloading…" : "Download"}
                </button>
                <button
                  onClick={handleOpen}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary text-primary-foreground hover:opacity-90 px-3 py-2 text-sm transition"
                >
                  Open link
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 break-all select-all">
                {shareUrl}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
