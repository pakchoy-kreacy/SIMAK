// ============================================================
// components/ui/Skeleton.tsx
// Skeleton loading placeholder
// ============================================================

import { cn } from '@/lib/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-skeleton bg-neutral-200 dark:bg-neutral-700 rounded', className)} role="presentation" aria-hidden="true" />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3" role="status" aria-label="Memuat...">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="px-4 py-4 space-y-4" role="status" aria-label="Memuat dashboard...">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="card space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2 w-full rounded-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
      <div className="card">
        <Skeleton className="h-4 w-1/3 mb-3" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  )
}
