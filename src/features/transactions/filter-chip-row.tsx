'use client';

// FilterChipRow: 4 chip pill để filter theo type giao dịch.
// URL-driven: click chip sẽ push ?type=income|expense|transfer để shareable URL.
// "Tất cả" chip → clear param.
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Receipt, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ListFilter } from 'lucide-react';

import type { Transaction } from '@/types/database';
import * as m from '@/paraglide/messages';

const TYPE_VALUES = ['income', 'expense', 'transfer'] as const satisfies readonly Transaction['type'][];

interface ChipDef {
  value: Transaction['type'] | null;
  label: () => string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHIPS: ChipDef[] = [
  { value: null, label: () => m.transactions_filter_all_chip(), icon: ListFilter },
  { value: 'income', label: () => m.transactions_filter_income_chip(), icon: ArrowDownLeft },
  { value: 'expense', label: () => m.transactions_filter_expense_chip(), icon: ArrowUpRight },
  { value: 'transfer', label: () => m.transactions_filter_transfer_chip(), icon: ArrowLeftRight },
];

interface FilterChipRowProps {
  currentType: Transaction['type'] | null;
}

export function FilterChipRow({ currentType }: FilterChipRowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setType = (value: Transaction['type'] | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete('type');
    } else {
      params.set('type', value);
    }
    // Reset cursor + search khi đổi filter
    params.delete('before');
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  // Optional: kiểm tra value thuộc TYPE_VALUES để TS không complain
  void TYPE_VALUES;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={m.transactions_filter_label()}
    >
      {CHIPS.map((chip) => {
        const active = chip.value === currentType;
        const Icon = chip.icon;
        return (
          <button
            key={chip.value ?? 'all'}
            type="button"
            disabled={pending}
            onClick={() => setType(chip.value)}
            aria-pressed={active}
            className={
              active
                ? 'inline-flex items-center gap-1.5 border-2 border-border bg-secondary px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-wider text-secondary-foreground shadow-brutal-sm transition-all'
                : 'inline-flex items-center gap-1.5 border-2 border-border bg-background px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-wider text-foreground shadow-brutal-sm transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal disabled:opacity-50'
            }
          >
            <Icon className="size-3.5" />
            {chip.label()}
          </button>
        );
      })}
    </div>
  );
}
