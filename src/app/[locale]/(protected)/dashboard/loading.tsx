// Loading state cho dashboard — stat cards + chart grid.

import {
  SkeletonCard,
  SkeletonStat,
} from '@/components/ui/skeleton-presets';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8 lg:mx-auto lg:max-w-6xl">
      <div className="mb-2 h-6 w-24 border-2 border-border bg-muted shadow-brutal-sm" />
      <div className="mt-3 h-10 w-64 bg-muted" />
      <div className="mt-2 h-4 w-96 bg-muted" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={5} />
        <SkeletonCard rows={5} />
        <SkeletonCard rows={5} />
      </div>
    </div>
  );
}
