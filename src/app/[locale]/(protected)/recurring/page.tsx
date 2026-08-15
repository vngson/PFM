// Trang quản lý giao dịch định kỳ — Server Component fetch list + accounts + categories.
// Hiển thị rule, nút "Sinh giao dịch" cho rule đến hạn, form tạo/sửa/xoá.
// Neo-brutalism: header chip + bordered cards với shadow cứng.
// ViewTabs (List/Calendar) — Calendar fetch occurrences tháng hiện tại.
// Full i18n qua Paraglide messages.
//
// Mobile (<md) layout:
// - Title text-2xl (1 dòng trên 390px), padding px-4 py-6.
// - Action row full-width bên dưới title: button Sinh GD nếu có due (primary
//   accent), Tạo quy tắc (secondary). Stack trên mobile vì 2 button 390px
//   không còn horizontal space.
// - Không sticky trên mobile (giống categories).
// Desktop (≥md): giữ nguyên action row cạnh title.
import Link from 'next/link';
import { Repeat } from 'lucide-react';

import {
  listActiveAccounts,
  listCategoriesForSelect,
} from '@/features/transactions/actions';
import {
  generateAllDue,
  listRecurring,
} from '@/features/recurring/actions';
import { getRecurringOccurrences } from '@/features/recurring/calendar';
import { RecurringForm } from '@/features/recurring/recurring-form';
import { GenerateAllButton } from '@/features/recurring/generate-all-button';
import { ViewTabs } from '@/features/recurring/view-tabs';
import { todayIso } from '@/features/recurring/frequency';
import { revalidatePath } from 'next/cache';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

async function generateAllFormAction() {
  'use server';
  await generateAllDue();
  revalidatePath('/recurring');
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function RecurringPage() {
  const month = currentMonth();

  // Parallel fetch: rules + accounts + categories + occurrences tháng hiện tại
  const [rules, accounts, categories, occurrences] = await Promise.all([
    listRecurring(true), // include cả inactive để user thấy rule đã tạm dừng
    listActiveAccounts(),
    listCategoriesForSelect(),
    getRecurringOccurrences(month),
  ]);

  const today = todayIso();
  const dueCount = rules.filter((r) => r.is_active && r.next_run_at <= today).length;

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-4 md:space-y-6 md:px-6 md:py-8">
      {/* Compact header — mobile giảm chip + title size để viewport 390px
          hiện được ít nhất 1 card ở fold trên.
          Bỏ dòng subtitle trên mobile (chỉ desktop ≥md mới có). */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-3">
        <div className="min-w-0">
          <div className="mb-1 inline-flex border-2 border-border bg-secondary px-2.5 py-0.5 shadow-brutal-sm md:mb-2 md:px-3 md:py-1">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.nav_recurring()}
            </span>
          </div>
          <h1 className="font-heading text-xl font-bold uppercase leading-tight tracking-tight md:mt-2 md:text-4xl">
            {m.recurring_page_title()}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:mt-2 md:block">
            {m.recurring_page_subtitle()}
          </p>
        </div>

        {/* Action row — mobile cùng 1 hàng ngang 2 button 50/50 để tiết kiệm
            vertical space (1 dòng thay vì 2 dòng). Desktop: 2 button inline
            cạnh title.
            Sinh GD luôn hiển thị (không ẩn khi dueCount=0) → disable với tooltip
            "không có GD đến hạn" để giữ layout ổn định + cho user thấy feature
            luôn tồn tại (UI-UX ProMax — đừng ẩn control quan trọng). */}
        <div className="flex items-center gap-2">
          <GenerateAllButton
            dueCount={dueCount}
            action={generateAllFormAction}
          />
          <div className="flex-1 md:flex-none">
            <RecurringForm
              accounts={accounts}
              categories={categories}
              trigger="create"
            />
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="border-2 border-dashed border-border p-8 text-center">
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center border-2 border-border bg-secondary">
            <Repeat className="size-5" />
          </div>
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {m.accounts_empty_title()}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {m.accounts_empty_desc()}{' '}
            <Link
              href={buildLocalizedHref("/accounts", getLocale())}
              className="font-bold text-foreground underline decoration-2 underline-offset-2"
            >
              {m.dashboard_create_account_link()}
            </Link>
          </p>
        </div>
      ) : (
        <ViewTabs
          rules={rules}
          accounts={accounts}
          categories={categories}
          monthlyOccurrences={occurrences}
          initialMonth={month}
        />
      )}
    </div>
  );
}