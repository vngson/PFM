// Dashboard: stat cards + 3 chart (income/expense trend, category pie, account balances) + quick actions.
// Charts wrap trong Suspense để streaming từng phần, với skeleton fallback.
// Full i18n qua Paraglide messages + locale-aware format.
import Link from 'next/link';
import { Suspense } from 'react';
import { Wallet, Tag, ArrowRight, Receipt, Target, TrendingUp, TrendingDown } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { SkeletonCard } from '@/components/ui/skeleton-presets';
import { DashboardCharts } from '@/features/dashboard/dashboard-charts';
import { OnboardingWizard } from '@/features/onboarding/wizard';
import { convertToVND } from '@/lib/fx';
import { formatCurrency } from '@/lib/format';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard: layout nên redirect khi user null, nhưng RSC streaming có thể render
  // DashboardPage song song trước khi redirect hoàn tất. Tránh null.id crash bằng
  // early return; layout redirect sẽ replace response.
  if (!user) {
    return null;
  }

  // Tính range tháng hiện tại cho summary transaction
  const month = currentMonth();
  const [y, monthNum] = month.split('-').map(Number);
  const start = `${y}-${String(monthNum).padStart(2, '0')}-01`;
  const lastDay = new Date(y, monthNum, 0).getDate();
  const end = `${y}-${String(monthNum).padStart(2, '0')}-${lastDay}`;

  // Fetch stat cards data (luôn sync để header + stat cards hiển thị ngay).
  const [{ data: profile }, { data: accounts }, { data: categories }, { data: txns }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('username, full_name, currency_code')
        .eq('id', user!.id)
        .single(),
      supabase
        .from('accounts')
        .select('id, current_balance, currency_code, is_archived')
        .eq('user_id', user!.id)
        .eq('is_archived', false),
      supabase.from('categories').select('id, type').eq('user_id', user!.id),
      supabase
        .from('transactions')
        .select('type, amount, account:accounts(currency_code)')
        .eq('user_id', user!.id)
        .gte('occurred_at', start)
        .lte('occurred_at', end),
    ]);

  // Fetch full account + category cho OnboardingWizard.
  // Cần full detail (name + color + icon) để wizard có thể verify sau khi user tạo.
  const [{ data: fullAccounts }, { data: fullCategories }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, currency_code, color, icon_name')
      .eq('user_id', user!.id)
      .eq('is_archived', false)
      .order('name', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, type, icon_name, color')
      .eq('user_id', user!.id)
      .order('type', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  // Tính tổng số dư theo currency
  const totalByCurrency = (accounts ?? []).reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.currency_code] = (acc[a.currency_code] ?? 0) + a.current_balance;
      return acc;
    },
    {},
  );

  // Tổng số dư quy đổi về VND (unified balance)
  const totalVnd = Object.entries(totalByCurrency).reduce((sum, [code, val]) => {
    const v = convertToVND(val, code);
    return sum + (v ?? 0);
  }, 0);

  // Tính thu/chi ròng tháng này theo currency
  const monthByCurrency = (txns ?? []).reduce<
    Record<string, { income: number; expense: number; net: number; count: number }>
  >((acc, t) => {
    const code = (t as never as { account: { currency_code: string } | null }).account?.currency_code ?? 'VND';
    if (!acc[code]) acc[code] = { income: 0, expense: 0, net: 0, count: 0 };
    acc[code]!.count += 1;
    const amount = Number(t.amount);
    if (t.type === 'income') acc[code]!.income += amount;
    else if (t.type === 'expense') acc[code]!.expense += amount;
    acc[code]!.net = acc[code]!.income - acc[code]!.expense;
    return acc;
  }, {});

  // Thu/chi ròng tháng này quy đổi về VND
  const monthNetVnd = Object.entries(monthByCurrency).reduce((sum, [code, s]) => {
    const v = convertToVND(s.net, code);
    return sum + (v ?? 0);
  }, 0);

  const expenseCount = (categories ?? []).filter((c) => c.type === 'expense').length;
  const incomeCount = (categories ?? []).filter((c) => c.type === 'income').length;
  const txnCount = txns?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      {/* Onboarding cho first-time user (0 accounts + 0 categories). */}
      <OnboardingWizard
        accounts={(fullAccounts ?? []) as never}
        categories={(fullCategories ?? []) as never}
      />

      {/* Header */}
      <div>
        <div className="mb-2 inline-flex border-2 border-border bg-secondary px-3 py-1 shadow-brutal-sm">
          <span className="font-heading text-xs font-bold uppercase tracking-wider">
            {m.dashboard_today()}
          </span>
        </div>
        <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-tight tracking-tight">
          {m.greeting_hello({ name: profile?.full_name ?? profile?.username ?? m.greeting_fallback_name() })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Email: <span className="font-medium text-foreground">{user!.email}</span>
          {' · '}
          {m.dashboard_currency_label()}:{' '}
          <span className="font-medium text-foreground">
            {profile?.currency_code ?? 'VND'}
          </span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tổng số dư */}
        <div className="border-2 border-border bg-card p-6 text-card-foreground shadow-brutal">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.dashboard_stat_balance()}
            </h2>
            <div className="inline-flex size-9 items-center justify-center border-2 border-border bg-secondary">
              <Wallet className="size-4" />
            </div>
          </div>
          {Object.keys(totalByCurrency).length === 0 ? (
            <>
              <p className="mt-4 font-heading text-4xl font-bold">—</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {m.dashboard_no_accounts()}{' '}
                <Link href={buildLocalizedHref("/accounts", getLocale())} className="font-bold text-foreground underline decoration-2 underline-offset-2">
                  {m.dashboard_create_account_link()}
                </Link>
              </p>
            </>
          ) : (
            <div className="mt-4 space-y-1">
              {Object.entries(totalByCurrency).map(([code, total]) => (
                <p key={code} className="font-heading text-3xl font-bold">
                  {formatCurrency(total, code)}
                </p>
              ))}
              <p className="pt-1 font-heading text-2xl font-bold text-foreground">
                ≈ {formatCurrency(totalVnd, 'VND')}
              </p>
              <p className="pt-2 text-xs font-medium text-muted-foreground">
                {m.dashboard_active_accounts({ count: accounts?.length ?? 0 })}
              </p>
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="border-2 border-border bg-card p-6 text-card-foreground shadow-brutal">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.dashboard_stat_categories()}
            </h2>
            <div className="inline-flex size-9 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
              <Tag className="size-4" />
            </div>
          </div>
          {(categories?.length ?? 0) === 0 ? (
            <>
              <p className="mt-4 font-heading text-4xl font-bold">—</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {m.categories_empty_title()}{' '}
                <Link href={buildLocalizedHref("/categories", getLocale())} className="font-bold text-foreground underline decoration-2 underline-offset-2">
                  {m.dashboard_create_account_link()}
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 font-heading text-4xl font-bold">{categories?.length}</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                <span className="font-bold text-expense">{m.dashboard_stat_categories_expense({ count: expenseCount })}</span>
                {' · '}
                <span className="font-bold text-income">{m.dashboard_stat_categories_income({ count: incomeCount })}</span>
              </p>
            </>
          )}
        </div>

        {/* Thu chi tháng này */}
        <div className="border-2 border-border bg-card p-6 text-card-foreground shadow-brutal">
          <div className="flex items-center justify-between border-b-2 border-border pb-3">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.dashboard_stat_monthly()}
            </h2>
            <div className="inline-flex size-9 items-center justify-center border-2 border-border bg-secondary">
              <TrendingUp className="size-4" />
            </div>
          </div>
          {Object.keys(monthByCurrency).length === 0 ? (
            <>
              <p className="mt-4 font-heading text-4xl font-bold">—</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {m.dashboard_no_txns()}{' '}
                <Link href={buildLocalizedHref("/transactions", getLocale())} className="font-bold text-foreground underline decoration-2 underline-offset-2">
                  {m.dashboard_record_txn_link()}
                </Link>
              </p>
            </>
          ) : (
            <div className="mt-4 space-y-3">
              {Object.entries(monthByCurrency).map(([code, s]) => (
                <div key={code} className="space-y-1">
                  <p
                    className={`font-heading text-2xl font-bold ${s.net >= 0 ? 'text-income' : 'text-expense'}`}
                  >
                    {s.net >= 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(s.net), code)}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-income">
                      <TrendingUp className="size-3" />
                      {formatCurrency(s.income, code)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-expense">
                      <TrendingDown className="size-3" />
                      {formatCurrency(s.expense, code)}
                    </span>
                  </div>
                </div>
              ))}
              {Object.keys(monthByCurrency).length > 1 && (
                <p
                  className={`pt-1 font-heading text-xl font-bold ${monthNetVnd >= 0 ? 'text-income' : 'text-expense'}`}
                >
                  ≈ {monthNetVnd >= 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(monthNetVnd), 'VND')}
                </p>
              )}
              <p className="pt-2 text-xs font-medium text-muted-foreground">
                {m.dashboard_txn_count_month({ count: txnCount })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Charts grid — stream với skeleton fallback */}
      <Suspense
        fallback={
          <div className="grid gap-5 lg:grid-cols-2">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
          </div>
        }
      >
        <DashboardCharts month={month} y={y} m={monthNum} />
      </Suspense>

      {/* Quick actions */}
      <div className="border-2 border-border bg-card p-6 shadow-brutal">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {m.dashboard_quick_section()}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={buildLocalizedHref("/accounts", getLocale())}
            className="inline-flex h-12 items-center justify-between border-2 border-border bg-background px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-brutal-sm hover:bg-secondary hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          >
            {m.dashboard_quick_accounts()} <ArrowRight className="size-4" />
          </Link>
          <Link
            href={buildLocalizedHref("/categories", getLocale())}
            className="inline-flex h-12 items-center justify-between border-2 border-border bg-background px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-brutal-sm hover:bg-secondary hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          >
            {m.dashboard_quick_categories()} <ArrowRight className="size-4" />
          </Link>
          <Link
            href={buildLocalizedHref("/transactions", getLocale())}
            className="inline-flex h-12 items-center justify-between border-2 border-border bg-background px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-brutal-sm hover:bg-secondary hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          >
            <span className="flex items-center gap-2">
              <Receipt className="size-4" /> {m.dashboard_quick_transactions()}
            </span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={buildLocalizedHref("/budgets", getLocale())}
            className="inline-flex h-12 items-center justify-between border-2 border-border bg-background px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-brutal-sm hover:bg-secondary hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          >
            <span className="flex items-center gap-2">
              <Target className="size-4" /> {m.dashboard_quick_budgets()}
            </span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
