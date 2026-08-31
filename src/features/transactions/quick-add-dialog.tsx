'use client';

// QuickAddDialog: wrapper quanh TransactionForm (trigger="hidden" + controlled
// open/onOpenChange). Lắng nghe window event 'pfm:open-quick-add' để mở dialog
// từ MobileNav QuickAddFab và Command Palette Quick Add action.
//
// Mục đích: tái sử dụng TransactionForm thay vì maintain một QuickAddForm
// riêng — cùng validation, cùng form shake, cùng auto-close logic.
import { useEffect, useState } from 'react';
import { TransactionForm } from './transaction-form';
import type { Account, Category } from '@/types/database';

interface CategoryOption {
  id: string;
  name: string;
  type: Category['type'];
  icon_name: string;
  color: string;
}

interface QuickAddDialogProps {
  accounts: Pick<Account, 'id' | 'name' | 'currency_code' | 'color' | 'icon_name'>[];
  categories: CategoryOption[];
}

export function QuickAddDialog({ accounts, categories }: QuickAddDialogProps) {
  const [open, setOpen] = useState(false);

  // Subscribe 'pfm:open-quick-add' window event (external system — use case
  // hợp lệ của useEffect). Cleanup remove listener khi unmount.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('pfm:open-quick-add', handler);
    return () => window.removeEventListener('pfm:open-quick-add', handler);
  }, []);

  return (
    <TransactionForm
      // key reset state mỗi lần đóng → mở: form fields về defaults (type=expense,
      // account=first, category=first matching type). Match UX QuickAddForm cũ.
      key={open ? 'open' : 'closed'}
      accounts={accounts}
      categories={categories}
      trigger="hidden"
      open={open}
      onOpenChange={setOpen}
    />
  );
}