// Loading state cho accounts — hiển thị skeleton đồng bộ với layout thật
// (4 stat chips + table) để khi RSC fetch xong thì frame cuối giống frame đầu.
// pb-20 chừa chỗ cho MobileNav fixed bottom-0 — không cần content skeleton
// phải fill đủ height, bottom bar vẫn ở vị trí ổn định.

import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton-presets';

export default function AccountsLoading() {
  return (
    <div className="space-y-6 px-4 py-6 pb-20 md:px-6 md:py-8 md:pb-8 lg:mx-auto lg:max-w-6xl">
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
