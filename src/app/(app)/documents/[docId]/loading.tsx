"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a polished, responsive skeleton/loading UI for a document detail page
 * while the actual document data is being fetched. It avoids navigation and focuses solely on visual placeholders
 * for the document title, metadata, actions, and key content sections (summary, chat preview, progress, outline).
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="w-full p-4 md:p-6" role="status" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-3/4 max-w-[520px] rounded-md" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex w-full items-center justify-start gap-2 md:w-auto md:justify-end">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="hidden h-9 w-9 rounded-md md:block" />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-[92%] rounded" />
                <Skeleton className="h-4 w-[88%] rounded" />
                <Skeleton className="h-4 w-[94%] rounded" />
                <Skeleton className="h-4 w-[70%] rounded" />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-6 w-36 rounded" />
                <div className="hidden items-center gap-2 sm:flex">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[85%] rounded" />
                    <Skeleton className="h-4 w-[65%] rounded" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[75%] rounded" />
                    <Skeleton className="h-4 w-[60%] rounded" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[90%] rounded" />
                    <Skeleton className="h-4 w-[72%] rounded" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-1">
            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <Skeleton className="h-6 w-24 rounded" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-10 rounded" />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-muted">
                    <Skeleton className="h-2 w-2/3 rounded" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-4 w-10 rounded" />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-muted">
                    <Skeleton className="h-2 w-1/3 rounded" />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <Skeleton className="h-6 w-20 rounded" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-[88%] rounded" />
                <Skeleton className="h-4 w-[76%] rounded" />
                <Skeleton className="h-4 w-[64%] rounded" />
                <Skeleton className="h-4 w-[56%] rounded" />
              </div>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-6 w-28 rounded" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </section>
          </aside>
        </div>

        <span className="sr-only">문서 데이터를 불러오는 중입니다…</span>
      </div>
    </div>
  );
}
