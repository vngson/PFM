import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

// ListCard: shared primitive cho mobile list patterns (<md).
// Neo-brutalism: border-2 đen, hard shadow-sm, padding gọn để thumb reach tốt.
//
// Layout 3 vùng rõ ràng:
//   - header: icon + name (trên cùng, flex-row)
//   - meta:   account, note, ngày (giữa, text-xs muted)
//   - footer: amount + actions dropdown (dưới cùng, justify-between)
//
// Touch target >=44px cho actions — dùng button size "sm" hoặc lớn hơn.
export function ListCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'border-2 border-border bg-card p-3 shadow-brutal-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListCardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('flex items-start gap-3', className)}>{children}</div>;
}

export function ListCardMeta({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mt-2 space-y-1 text-xs text-muted-foreground', className)}>
      {children}
    </div>
  );
}

export function ListCardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'mt-3 flex items-center justify-between gap-2',
        className,
      )}
    >
      {children}
    </div>
  );
}