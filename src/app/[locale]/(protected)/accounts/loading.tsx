// Loading state cho accounts — hiển thị skeleton đồng bộ với layout thật
// (4 stat chips + table) để khi RSC fetch xong thì frame cuối giống frame đầu.

import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton-presets';

export default function AccountsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 h-6 w-24 border-2 border-border bg-muted shadow-brutal-sm" />
          <div className="mt-3 h-10 w-64 bg-muted" />
          <div className="mt-2 h-4 w-96 bg-muted" />
        </div>
      </div>
      <SkeletonCard rows={2} />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
