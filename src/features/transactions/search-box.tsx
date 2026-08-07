'use client';

// SearchBox: input tìm theo note giao dịch.
// Debounced 350ms rồi push ?q= vào URL — URL là source-of-truth nên shareable + back/forward hoạt động.
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import * as m from '@/paraglide/messages';

interface SearchBoxProps {
  defaultValue: string;
  placeholder?: string;
}

export function SearchBox({ defaultValue, placeholder }: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync khi URL thay đổi từ bên ngoài (back/forward, clear chip, ...)
  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const pushQ = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set('q', next.trim());
    else params.delete('q');
    params.delete('before');
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const handleChange = (v: string) => {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pushQ(v), 350);
  };

  const handleClear = () => {
    setValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    pushQ('');
  };

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? m.common_search_placeholder_default()}
        className="pl-9 pr-9"
        maxLength={80}
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={m.transactions_clear_search_aria()}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
