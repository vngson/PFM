// Trang chi tiết 1 account — Server Component fetch account + txs của account đó.
// URL: /accounts/[id]?before=YYYY-MM-DD (cursor cho load more)
// Không cho edit ở đây — dùng nút Sửa từ /accounts để giữ single source of truth.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getAccountById } from '@/features/accounts/actions';
import { listTransactions } from '@/features/transactions/actions';
import { AccountDetailView } from '@/features/accounts/account-detail-view';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const PAGE_SIZE = 20;

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ before?: string }>;
}

export default async function AccountDetailPage({
  params,
  searchParams,
}: AccountDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const before = sp.before && /^\d{4}-\d{2}-\d{2}$/.test(sp.before) ? sp.before : undefined;

  const account = await getAccountById(id);
  if (!account) notFound();

  const txnResult = await listTransactions({
    account_id: account.id,
    before,
    limit: PAGE_SIZE,
  });

  const lastRow = txnResult.rows.at(-1);
  const nextBefore = lastRow?.occurred_at.slice(0, 10);

  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8 lg:mx-auto lg:max-w-6xl">
      <Link
        href={buildLocalizedHref('/accounts', getLocale())}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {m.account_detail_back()}
      </Link>

      <AccountDetailView
        account={account}
        transactions={txnResult.rows}
        nextBefore={nextBefore}
        hasMore={txnResult.hasMore}
      />
    </div>
  );
}