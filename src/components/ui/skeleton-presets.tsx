// Skeleton presets — các layout skeleton thường dùng để Suspense fallback.
// Match neo-brutalism: border-2 + bg-muted.

import { Skeleton } from './skeleton';

interface SkeletonCardProps {
  rows?: number;
  className?: string;
}

/** Card skeleton với header + body rows. */
export function SkeletonCard({ rows = 3, className }: SkeletonCardProps) {
  return (
    <div className={`border-2 border-border bg-card p-4 shadow-brutal-sm ${className ?? ''}`}>
      <Skeleton className="mb-3 h-5 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${100 - i * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/** Table skeleton (rows + cols).
 * Mobile (<md): chuyển sang card-stack — mỗi row là 1 card với icon + 2 dòng text
 * (giống AccountList / TransactionList mobile view) để tránh bị nén 4 cột trên 390px.
 * Desktop (≥md): grid ngang với cols cố định (table view). */
export function SkeletonTable({
  rows = 5,
  cols = 3,
  className,
}: SkeletonTableProps) {
  return (
    <>
      {/* Mobile card-stack (<md) — match với list cards thật */}
      <div className={`space-y-2 md:hidden ${className ?? ''}`}>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-3 border-2 border-border bg-card p-3 shadow-brutal-sm"
          >
            <Skeleton className="size-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>

      {/* Desktop grid table (≥md) */}
      <div
        className={`hidden overflow-hidden border-2 border-border bg-card shadow-brutal-sm md:block ${className ?? ''}`}
      >
        <div
          className="grid gap-2 border-b-2 border-border bg-muted/40 p-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
        <div className="divide-y-2 divide-border">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              className="grid gap-2 p-3"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className="h-4"
                  style={{
                    width: c === 0 ? '70%' : c === cols - 1 ? '40%' : '85%',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface SkeletonStatProps {
  className?: string;
}

/** Stat card skeleton (số to + label). */
export function SkeletonStat({ className }: SkeletonStatProps) {
  return (
    <div
      className={`flex flex-col gap-2 border-2 border-border bg-card p-4 shadow-brutal-sm ${className ?? ''}`}
    >
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
}

/** List skeleton (item có icon + 2 dòng text + amount bên phải).
 * Match với AccountList mobile card layout: icon 48px + flex-1 + amount right. */
export function SkeletonList({ items = 4, className }: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-2 border-border bg-card p-3 shadow-brutal-sm"
        >
          <Skeleton className="size-12 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
