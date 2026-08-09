// Trang quản lý tài khoản — Server Component fetch data, Client Component render UI.
// Neo-brutalism: bordered shadow card title, total chips bold uppercase.
// Full i18n qua Paraglide messages.
import { listAccounts } from '@/features/accounts/actions';
import { AccountForm } from '@/features/accounts/account-form';
import { AccountList } from '@/features/accounts/account-list';
import { ExportButton } from '@/features/export/export-button';
import { exportAccountsCSV } from '@/features/export/actions';
import { getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

export default async function AccountsPage() {
  const accounts = await listAccounts();

  // Tính tổng số dư theo currency
  const totalByCurrency = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.currency_code] = (acc[a.currency_code] ?? 0) + a.current_balance;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex border-2 border-border bg-secondary px-3 py-1 shadow-brutal-sm">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.accounts_manage()}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-tight tracking-tight">
            {m.accounts_page_title()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {m.accounts_page_subtitle()}
          </p>
        </div>
        <AccountForm />
        <div className="flex items-center gap-2">
          <ExportButton action={exportAccountsCSV} />
        </div>
      </div>

      {accounts.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.entries(totalByCurrency).map(([code, total]) => (
            <div
              key={code}
              className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-2 shadow-brutal-sm"
            >
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {m.chart_balance_total({ code })}
              </span>
              <span className="font-heading text-base font-bold">
                {new Intl.NumberFormat(getNumberLocale(), {
                  style: 'currency',
                  currency: code,
                  maximumFractionDigits: 0,
                }).format(total)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <AccountList accounts={accounts} />
    </div>
  );
}
