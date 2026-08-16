// Loading state cho transactions — filter bar + table skeleton.

import { SkeletonTable } from '@/components/ui/skeleton-presets';

export default function TransactionsLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8 lg:mx-auto lg:max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 h-6 w-24 border-2 border-border bg-muted shadow-brutal-sm" />
          <div className="mt-3 h-10 w-64 bg-muted" />
          <div className="mt-2 h-4 w-96 bg-muted" />
        </div>
      </div>
      <div className="h-12 w-full border-2 border-border bg-muted" />
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
