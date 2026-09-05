'use client';

// MonthPicker: 2 nút ‹ › để chuyển tháng qua lại, hiển thị tháng hiện đang xem.
// URL-driven: bấm prev/next sẽ push ?month=YYYY-MM mới, reset cursor `before`
// + search `q` (vì giao dịch + summary của tháng mới không liên quan tới cursor
// của tháng cũ).
//
// Pattern wrapper: MonthPicker quản lý `useTransition` và toggle giữa `children`
// (content thật) và `loading` (skeleton) dựa trên `pending`. Khi user bấm prev/next:
//   - pending=true ngay lập tức → render `loading` skeleton thay cho children
//   - RSC mới resolve xong → pending=false → render children với data tháng mới
// Đảm bảo user LUÔN thấy skeleton flash khi chuyển tháng (không phụ thuộc
// Next.js cache behavior của Suspense với soft navigation).
// Format label dùng locale-aware formatter (vi → "Tháng 9/2026", en → "Sep 2026").

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatMonthLabel, shiftMonth } from '@/lib/format';
import * as m from '@/paraglide/messages';

interface MonthPickerProps {
  /** Tháng hiện đang xem, YYYY-MM. */
  month: string;
  /** Nội dung sẽ hiển thị khi RSC đã resolve (data tháng). */
  children: ReactNode;
  /** Skeleton hiển thị khi đang chuyển tháng (pending=true). */
  loading: ReactNode;
}

export function MonthPicker({ month, children, loading }: MonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const navigate = (nextMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', nextMonth);
    // Reset cursor + search vì dataset tháng mới hoàn toàn khác.
    params.delete('before');
    params.delete('q');
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'inline-flex items-center gap-1 border-2 border-border bg-card shadow-brutal-sm transition-opacity',
          pending && 'opacity-60',
        )}
        role="group"
        aria-label={m.transactions_month_current_label({ month })}
        aria-busy={pending}
      >
        <button
          type="button"
          onClick={() => navigate(prev)}
          disabled={pending}
          aria-label={m.transactions_month_prev_aria()}
          className={cn(
            'inline-flex size-9 items-center justify-center text-foreground transition-all',
            'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ChevronLeft className="size-4" />}
        </button>
        <span
          className="min-w-[7.5rem] px-2 text-center font-heading text-sm font-bold uppercase tracking-wider tabular-nums"
          aria-live="polite"
        >
          {formatMonthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => navigate(next)}
          disabled={pending}
          aria-label={m.transactions_month_next_aria()}
          className={cn(
            'inline-flex size-9 items-center justify-center text-foreground transition-all',
            'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
        </button>
      </div>
      {/* Toggle giữa skeleton (khi pending) và content thật (RSC đã resolve). */}
      <div aria-busy={pending}>{pending ? loading : children}</div>
    </div>
  );
}
