// Loading state cho account detail — header + summary + table skeleton.

import { SkeletonTable } from '@/components/ui/skeleton-presets';

export default function AccountDetailLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8 lg:mx-auto lg:max-w-6xl">
      <div className="h-5 w-32 bg-muted" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-14 border-2 border-border bg-muted" />
          <div>
            <div className="h-9 w-48 bg-muted" />
            <div className="mt-2 h-4 w-32 bg-muted" />
          </div>
        </div>
        <div className="h-12 w-48 bg-muted" />
      </div>
      <div className="h-24 w-full border-2 border-border bg-muted" />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}