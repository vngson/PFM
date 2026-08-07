// Trang quản lý giao dịch định kỳ — Server Component fetch list + accounts + categories.
// Hiển thị rule, nút "Sinh giao dịch" cho rule đến hạn, form tạo/sửa/xoá.
// Neo-brutalism: header chip + bordered cards với shadow cứng.
// Phase 17: thêm ViewTabs (List/Calendar). Calendar fetch occurrences tháng hiện tại.
// Phase 25: full i18n qua Paraglide messages.
import Link from 'next/link';
import { Repeat, Zap } from 'lucide-react';

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
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex border-2 border-border bg-secondary px-3 py-1 shadow-brutal-sm">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.nav_recurring()}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-tight tracking-tight">
            {m.recurring_page_title()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {m.recurring_page_subtitle()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dueCount > 0 ? (
            <form action={generateAllFormAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 border-2 border-border bg-accent px-4 font-heading text-xs font-bold uppercase tracking-wider shadow-brutal-sm transition-all hover:bg-accent/80 hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
              >
                <Zap className="size-4" /> {m.recurring_list_generate_btn()} ({dueCount})
              </button>
            </form>
          ) : null}
          <RecurringForm
            accounts={accounts}
            categories={categories}
            trigger="create"
          />
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
        />
      )}
    </div>
  );
}