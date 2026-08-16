'use client';

// CommandPalette: Cmd+K / Ctrl+K mở dialog search.
// Tìm song song 3 loại: transactions + accounts + categories.
// Debounced 200ms trước khi gọi server.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Receipt,
  Wallet,
  Tag,
  Loader2,
  CornerDownLeft,
  Zap,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { globalSearch, type SearchResult } from './actions';
import * as m from '@/paraglide/messages';

interface CommandPaletteProps {
  /** Controlled open state. Nếu không truyền, palette tự quản lý. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Bật/tắt việc đăng ký phím tắt Cmd/Ctrl+K toàn cục. */
  enableShortcut?: boolean;
}

const DEBOUNCE_MS = 200;

const ICONS: Record<SearchResult['type'], typeof Receipt> = {
  transaction: Receipt,
  account: Wallet,
  category: Tag,
};

const LABELS: Record<SearchResult['type'], () => string> = {
  transaction: () => m.search_kind_txn(),
  account: () => m.search_kind_account(),
  category: () => m.search_kind_category(),
};

export function CommandPalette({
  open: openProp,
  onOpenChange,
  enableShortcut = true,
}: CommandPaletteProps) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    transactions: SearchResult[];
    accounts: SearchResult[];
    categories: SearchResult[];
    total: number;
  }>({ transactions: [], accounts: [], categories: [], total: 0 });
  const [loading, startTransition] = useTransition();
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K
  useEffect(() => {
    if (!enableShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableShortcut]);

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      // Wait 1 tick để dialog render xong
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    setQuery('');
    setResults({ transactions: [], accounts: [], categories: [], total: 0 });
    setActiveIdx(0);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length === 0) {
      setResults({ transactions: [], accounts: [], categories: [], total: 0 });
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await globalSearch(query);
        setResults(r);
        setActiveIdx(0);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, open]);

  const flat: SearchResult[] = [
    ...results.transactions,
    ...results.accounts,
    ...results.categories,
  ];

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    router.push(r.href);
  };

  // Quick Add action item — cùng pattern arrow-key với search results nhưng
  // dispatch event thay vì navigate. Chỉ hiện khi query rỗng (palette mở mà
  // user chưa gõ gì). Mobile FAB vẫn là primary; đây là desktop fallback
  // sau khi bỏ floating FAB ở quick-add-form.
  const showQuickAdd = query.trim().length === 0;
  const totalItems = (showQuickAdd ? 1 : 0) + flat.length;

  const handleOpenQuickAdd = () => {
    setOpen(false);
    // queueMicrotask để palette đóng xong rồi mới dispatch — tránh race
    // với dialog open animation.
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('pfm:open-quick-add'));
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showQuickAdd && activeIdx === 0) {
        handleOpenQuickAdd();
        return;
      }
      const r = flat[activeIdx - (showQuickAdd ? 1 : 0)];
      if (r) handleSelect(r);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const renderGroup = (
    label: string,
    items: SearchResult[],
    startIndex: number,
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="px-2 font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <ul className="space-y-0.5">
          {items.map((item, i) => {
            const Icon = ICONS[item.type];
            const idx = startIndex + i;
            const active = idx === activeIdx;
            return (
              <li key={`${item.type}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    'flex w-full items-center gap-3 border-2 px-2 py-2 text-left transition-colors',
                    active
                      ? 'border-border bg-secondary text-secondary-foreground shadow-brutal-sm'
                      : 'border-transparent bg-transparent hover:bg-muted',
                  )}
                >
                  <div className="inline-flex size-7 shrink-0 items-center justify-center border-2 border-border bg-card">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-bold uppercase tracking-wide">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                  {item.meta ? (
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const tStart = 0;
  const aStart = results.transactions.length;
  const cStart = aStart + results.accounts.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[10vh] flex max-h-[70vh] -translate-y-0 flex-col gap-0 p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">{m.search_dialog_title()}</DialogTitle>
        <DialogDescription className="sr-only">
          {m.search_dialog_subtitle()}
        </DialogDescription>

        <div className="flex items-center gap-2 border-b-2 border-border px-3 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={m.search_placeholder()}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <kbd className="hidden border-2 border-border bg-muted px-1.5 font-mono text-[10px] uppercase tracking-wide sm:inline-block">
              Esc
            </kbd>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <div className="space-y-3">
              {/* Actions — Quick Add (desktop fallback cho floating FAB đã bỏ) */}
              <div className="space-y-1">
                <p className="px-2 font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {m.search_actions_title()}
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={handleOpenQuickAdd}
                      onMouseEnter={() => setActiveIdx(0)}
                      className={cn(
                        'flex w-full items-center gap-3 border-2 px-2 py-2 text-left transition-colors',
                        activeIdx === 0
                          ? 'border-border bg-secondary text-secondary-foreground shadow-brutal-sm'
                          : 'border-transparent bg-transparent hover:bg-muted',
                      )}
                    >
                      <div className="inline-flex size-7 shrink-0 items-center justify-center border-2 border-border bg-card">
                        <Zap className="size-3.5" />
                      </div>
                      <span className="truncate font-heading text-sm font-bold uppercase tracking-wide">
                        {m.quick_add_btn()}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                        {m.search_action_aria()}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
              <EmptyState />
            </div>
          ) : loading && flat.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {m.search_loading()}
            </p>
          ) : flat.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {m.search_empty_for_query({ query })}
            </p>
          ) : (
            <div className="space-y-3">
              {renderGroup(LABELS.transaction(), results.transactions, tStart)}
              {renderGroup(LABELS.account(), results.accounts, aStart)}
              {renderGroup(LABELS.category(), results.categories, cStart)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t-2 border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {results.total > 0
              ? m.search_total_results({ count: results.total })
              : m.search_typing_hint()}
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> {m.search_enter_hint()}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Hint {
  label: string;
  example: string;
}

function EmptyState() {
  // hints compute m.*() per render (function body) — fine for hydration.
  const hints: Hint[] = [
    { label: m.search_suggestion_txn(), example: m.search_suggestion_txn_example() },
    { label: m.search_suggestion_account(), example: m.search_suggestion_account_example() },
    { label: m.search_suggestion_category(), example: m.search_suggestion_category_example() },
  ];
  return (
    <div className="space-y-3 px-2 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {m.search_suggestions_title()}
      </p>
      <ul className="space-y-1.5 text-sm">
        {hints.map((h) => (
          <li key={h.label} className="flex flex-col">
            <span className="font-medium">{h.label}</span>
            <span className="text-xs text-muted-foreground">
              {m.search_hint_example_prefix()} {h.example}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}