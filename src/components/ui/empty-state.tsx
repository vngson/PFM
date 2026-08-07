// EmptyState — placeholder thân thiện cho các list/grid rỗng.
// Hỗ trợ icon, title, description, và optional CTA action.

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Href cho CTA button — internal Link */
  actionHref?: string;
  actionLabel?: string;
  /** Hoặc custom action node (vd Button khác) */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-card/50 px-6 py-12 text-center shadow-brutal-sm ${className ?? ''}`}
    >
      <div className="inline-flex size-12 items-center justify-center border-2 border-border bg-secondary">
        <Icon className="size-6" />
      </div>
      <p className="font-heading text-base font-bold uppercase tracking-wider">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {(actionHref && actionLabel) || action ? (
        <div className="mt-2">
          {action ? (
            action
          ) : (
            <Link
              href={actionHref!}
              className="inline-flex h-10 items-center gap-2 border-2 border-border bg-primary px-4 font-heading text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-brutal-sm transition-all hover:bg-secondary hover:text-secondary-foreground hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
            >
              {actionLabel}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
