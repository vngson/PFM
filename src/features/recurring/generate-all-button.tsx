'use client';

// GenerateAllButton: sinh giao dịch cho TẤT CẢ rule đến hạn trên server.
// - Luôn render (không ẩn khi dueCount === 0) — disable thay vì ẩn để giữ
//   layout ổn định + cho user thấy feature luôn tồn tại (UI-UX ProMax).
// - Khi disabled: title giải thích lý do ("không có GD đến hạn") + cursor
//   not-allowed. Vẫn post được toast lỗi nếu server reject.
import { Zap } from 'lucide-react';
import * as m from '@/paraglide/messages';

interface GenerateAllButtonProps {
  dueCount: number;
  // Server action — Next.js chấp nhận cả `() => Promise<void>` lẫn
  // `(formData: FormData) => Promise<void>`. Rộng type để tương thích cả 2.
  // Cast khi bind để TS không ép buộc FormData shape.
  action: () => unknown | Promise<unknown>;
}

export function GenerateAllButton({ dueCount, action }: GenerateAllButtonProps) {
  const disabled = dueCount === 0;
  return (
    <form
      // Cast để bind server action có signature `() => Promise<void>` —
      // `<form action>` chấp nhận cả no-arg, Next tự bọc FormData khi submit.
      action={action as unknown as (formData: FormData) => void}
      className="flex-1 md:flex-none"
    >
      <button
        type="submit"
        disabled={disabled}
        title={
          disabled
            ? m.recurring_generate_all_disabled_title()
            : m.recurring_list_generate_btn()
        }
        aria-label={m.recurring_list_generate_btn()}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-border bg-accent px-3 font-heading text-[11px] font-bold uppercase tracking-wider shadow-brutal-sm transition-all hover:bg-accent/80 hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px] motion-safe:active:translate-x-[1px] motion-safe:active:translate-y-[1px] motion-safe:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent disabled:hover:shadow-brutal-sm disabled:hover:translate-x-0 disabled:hover:translate-y-0 md:h-10 md:w-auto md:px-4 md:text-xs"
      >
        <Zap className="size-4" />
        <span className="truncate">
          {m.recurring_list_generate_btn()} ({dueCount})
        </span>
      </button>
    </form>
  );
}