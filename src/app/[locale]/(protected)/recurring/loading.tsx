// Loading state cho recurring — list skeleton.

import { SkeletonList } from '@/components/ui/skeleton-presets';

export default function RecurringLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 h-6 w-24 border-2 border-border bg-muted shadow-brutal-sm" />
          <div className="mt-3 h-10 w-64 bg-muted" />
          <div className="mt-2 h-4 w-96 bg-muted" />
        </div>
      </div>
      <SkeletonList items={6} />
    </div>
  );
}
