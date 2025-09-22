"use client";

/**
 * CODE INSIGHT
 * This code's use case is an error boundary UI for document-level routes under /documents/[docId].
 * It gracefully handles rendering errors, offers a retry via Next.js reset(), and provides
 * quick navigation back to the documents list and dashboard. It avoids server/database calls,
 * is fully responsive, and uses the project's theme tokens.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { docId } = (useParams() as { docId?: string }) || {};

  useEffect(() => {
    // In production, this would be captured by an error monitoring service.
    // We avoid adding new deps; console.error ensures visibility during incidents.
    // eslint-disable-next-line no-console
    console.error("Document route error:", { message: error?.message, digest: error?.digest, docId });
  }, [error, docId]);

  return (
    <main className="w-full">
      <div className="mx-auto max-w-2xl p-6 md:p-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <span className="text-2xl" aria-hidden>
                  !
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold md:text-xl">
                  문서를 불러오는 중 오류가 발생했어요
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {docId ? (
                    <span>문서 ID: {docId}</span>
                  ) : (
                    <span>잠시 후 다시 시도해 주세요.</span>
                  )}
                </p>
              </div>
            </div>

            <Alert variant="destructive" className="mt-6" role="alert" aria-live="polite">
              <AlertTitle>문제가 발생했어요</AlertTitle>
              <AlertDescription>
                일시적인 문제일 수 있어요. 아래 버튼으로 다시 시도하거나 문서 목록 또는 대시보드로 이동할 수 있어요.
              </AlertDescription>
            </Alert>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                다시 시도
              </button>

              <Link
                href="/documents"
                className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                문서 목록으로
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                대시보드
              </Link>
            </div>

            <Separator className="my-6" />

            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  자세한 오류 정보 보기
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  {error?.message ? (
                    <>
                      <div className="font-medium text-foreground">에러 메시지</div>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">{String(error.message)}</pre>
                    </>
                  ) : (
                    <div>자세한 메시지가 제공되지 않았어요.</div>
                  )}
                  {error?.digest && (
                    <div className="mt-3">
                      <div className="font-medium text-foreground">참고 코드</div>
                      <code className="mt-1 inline-block rounded bg-background px-2 py-1 text-xs text-foreground">
                        {error.digest}
                      </code>
                    </div>
                  )}
                  {docId && (
                    <div className="mt-3">
                      <div className="font-medium text-foreground">문서 ID</div>
                      <code className="mt-1 inline-block rounded bg-background px-2 py-1 text-xs text-foreground">{docId}</code>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </main>
  );
}
