"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a global error boundary UI for root-level runtime/render errors.
 * It provides a friendly recovery path with a reset action and quick links to home and dashboard,
 * along with optional expandable technical details for debugging.
 */

import * as React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [open, setOpen] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Log for monitoring tools if integrated; avoid noisy alerts for users
    // This remains client-only and safe in production
    // eslint-disable-next-line no-console
    console.error("Global error boundary:", { message: error?.message, stack: error?.stack, digest: error?.digest });
  }, [error]);

  const detailsText = React.useMemo(() => {
    const lines = [
      `Message: ${error?.message ?? "Unknown error"}`,
      `Digest: ${error?.digest ?? "N/A"}`,
      "\nStack:\n" + (error?.stack ?? "(no stack trace provided)"),
    ];
    return lines.join("\n");
  }, [error]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(detailsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy error details", e);
    }
  }

  return (
    <main className="w-full p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                {/* Exclamation Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 7h2v8h-2V7zm0 10h2v2h-2v-2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">문제가 발생했어요</h1>
                <p className="mt-1 text-sm text-muted-foreground">요청을 처리하는 중 예기치 않은 오류가 발생했습니다. 아래에서 다시 시도하거나 다른 페이지로 이동할 수 있어요.</p>
              </div>
            </div>

            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTitle className="flex items-center gap-2">
                오류 메시지
                {error?.digest ? (
                  <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">코드 {error.digest}</span>
                ) : null}
              </AlertTitle>
              <AlertDescription className="mt-1 break-words text-sm">
                {error?.message || "알 수 없는 오류가 발생했습니다."}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
              <button
                type="button"
                onClick={reset}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                  "shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                {/* Reset/Retry Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-9.584 2H5.26A7.002 7.002 0 0 0 19 13c0-3.86-3.141-7-7-7z"/>
                </svg>
                다시 시도
              </button>

              <Link
                href="/"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground",
                  "shadow-sm transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                {/* Home Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 3l9 8h-3v10h-5v-6H11v6H6V11H3l9-8z"/>
                </svg>
                홈으로
              </Link>

              <Link
                href="/dashboard"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium",
                  "shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                {/* Dashboard Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 0h11v8H10v-8z"/>
                </svg>
                대시보드
              </Link>
            </div>

            <Separator className="my-1" />

            <Collapsible open={open} onOpenChange={setOpen}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">자세한 정보</div>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium",
                      "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                    aria-expanded={open}
                  >
                    <svg
                      className={cn("transition-transform", open ? "rotate-180" : "rotate-0")}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                    {open ? "닫기" : "보기"}
                  </button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent forceMount>
                <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
{detailsText}
                  </pre>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-medium",
                        "transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      )}
                      aria-live="polite"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                      {copied ? "복사됨" : "세부 정보 복사"}
                    </button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <p className="mx-auto mt-4 text-center text-xs text-muted-foreground">poiima — AI 스마트 튜터</p>
      </div>
    </main>
  );
}
