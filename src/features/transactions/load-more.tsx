'use client';

// LoadMore: client button dùng Link để navigate tới URL với ?before=YYYY-MM-DD của
// giao dịch cuối trang hiện tại. Khi Next rerender, server sẽ tự thêm các txns cũ hơn.
// Dùng Link thay vì form POST vì navigation đơn giản và shareable.
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

interface LoadMoreProps {
  before: string; // YYYY-MM-DD của row cuối cùng trong trang hiện tại
  month: string; // YYYY-MM
}

export function LoadMore({ before, month }: LoadMoreProps) {
  return (
    <div className="flex justify-center pt-4">
      <Button
        render={
          <Link
            href={buildLocalizedHref(`/transactions?month=${month}&before=${before}`, getLocale())}
            scroll={false}
            aria-label={m.transactions_load_more_aria()}
            className="inline-flex items-center gap-1.5"
          />
        }
      >
        <ChevronDown className="size-4" />
        {m.transactions_load_more_label()}
      </Button>
    </div>
  );
}
