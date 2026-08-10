// Loading state cho settings — full page skeleton.

import { SkeletonCard } from '@/components/ui/skeleton-presets';

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="mb-2 h-6 w-24 border-2 border-border bg-muted shadow-brutal-sm" />
      <div className="mt-3 h-10 w-48 bg-muted" />
      <SkeletonCard rows={4} />
      <SkeletonCard rows={3} />
      <SkeletonCard rows={2} />
    </div>
  );
}
