"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render a polished, responsive skeleton UI for the documents list page
 * while data is being fetched or paginated. It should avoid navigation and focus on content placeholders
 * that match the intended layout: header summary, toolbar (search/filters), and a grid of document cards.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="w-full space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading documents...</span>

      {/* Page header summary skeleton */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 max-sm:w-48" />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <Separator className="bg-border" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2 max-sm:hidden">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2 max-sm:hidden">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-3 sm:max-w-md">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
        </div>
      </div>

      {/* Documents grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-16 rounded-sm" />
                <Skeleton className="hidden h-4 w-12 rounded-sm md:block" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-primary/50" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-10 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination/footer skeleton */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}
