'use client';

// SearchTrigger: nút mở CommandPalette + wrapper command palette quản lý state.
// Render 1 lần trong header.

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { CommandPalette } from './command-palette';
import * as m from '@/paraglide/messages';

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  // Lắng nghe global event từ các nơi khác (vd: header nav, sidebar shortcut)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('palette:open', handler);
    return () => window.removeEventListener('palette:open', handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 border-2 border-border bg-card px-2.5 text-sm text-muted-foreground shadow-brutal-sm transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal hover:text-foreground lg:px-3"
        aria-label={m.search_trigger_aria()}
      >
        <Search className="size-4" />
        <span className="hidden lg:inline">{m.search_trigger_label()}</span>
        <kbd className="ml-1 hidden border-2 border-border bg-muted px-1.5 font-mono text-[10px] uppercase tracking-wide lg:inline-block">
          ⌘K
        </kbd>
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}