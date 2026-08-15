'use client';

// CategoryList: bảng category với 2 tabs (Chi tiêu / Thu nhập).
// Click tab → lọc table theo type tương ứng. Header bảng sticky khi scroll
// (TableHead có `sticky top-0 z-10 bg-secondary/40`).
//
// Mỗi row có:
//   - icon box màu + tên (full, không truncate)
//   - usage badge (GD/NS/ĐK) hoặc "…" khi loading
//   - nút Sửa + Xoá trực tiếp trong row (xoá có confirm + usage warning)
//
// CategoryForm / AlertDialog render 1 lần ở root, controlled bởi editingCategory
// / deletingCategory, để lifecycle không bị ảnh hưởng bởi table re-render.

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  MoreVertical,
  Trash2,
  Pencil,
  Tag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ListCard,
  ListCardHeader,
  ListCardMeta,
  ListCardFooter,
} from '@/components/ui/list-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getIcon } from './icon-catalog';
import type { Category } from '@/types/database';
import { countCategoryUsage, deleteCategory } from './actions';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import * as m from '@/paraglide/messages';

interface CategoryListProps {
  categories: Category[];
  /** Bấm Sửa → page handler set editingCategory thay vì list tự quản lý. */
  onEditCategory: (cat: Category) => void;
}

type Usage = { txn: number; budget: number; recurring: number };
type Tab = 'expense' | 'income';

export function CategoryList({ categories, onEditCategory }: CategoryListProps) {
  const [pending, startTransition] = useTransition();
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('expense');
  // Usage tách riêng khỏi categories — tránh re-render khi usage update,
  // và tránh effect vô tận do setItems trong effect.
  const [usageMap, setUsageMap] = useState<Record<string, Usage>>({});

  // Stable id signature — chỉ thay đổi khi id set thực sự khác.
  // Trigger usage fetch một lần mỗi khi list id đổi (create/delete category).
  const idsKey = useMemo(() => categories.map((c) => c.id).join(','), [categories]);

  // Lazy-load usage cho tất cả categories (sau khi mount, không block render).
  useEffect(() => {
    let cancelled = false;
    // allSettled: 1 fetch fail (vd HMR abort, network drop) không kéo theo
    // cả batch — mỗi category vẫn nhận được count (0 nếu fail) thay vì stuck.
    void Promise.allSettled(
      categories.map((c) =>
        countCategoryUsage(c.id).then((usage) => ({ id: c.id, usage })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, Usage> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map[r.value.id] = r.value.usage;
        } else {
          // Fail im lặng — giữ slot trống → cell hiển thị '…' cho row đó,
          // các row khác vẫn render bình thường.
          console.warn('countCategoryUsage failed', r.reason);
        }
      }
      setUsageMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(id);
        notify.success(m.categories_delete_toast());
        setDeletingCategory(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.categories_err_delete());
        setDeletingCategory(null);
      }
    });
  };

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title={m.categories_empty_title()}
        description={m.categories_empty_short_desc()}
      />
    );
  }

  // Group by type cho tab counts.
  const expense = categories.filter((c) => c.type === 'expense');
  const income = categories.filter((c) => c.type === 'income');
  const visible = activeTab === 'expense' ? expense : income;
  const visibleCount = visible.length;

  const deletingUsage = deletingCategory ? usageMap[deletingCategory.id] : null;
  const deletingTotalUsage = deletingUsage
    ? deletingUsage.txn + deletingUsage.budget + deletingUsage.recurring
    : 0;

  const TABS: { key: Tab; label: string; icon: typeof TrendingDown; count: number }[] = [
    { key: 'expense', label: m.categories_group_expense(), icon: TrendingDown, count: expense.length },
    { key: 'income', label: m.categories_group_income(), icon: TrendingUp, count: income.length },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar — segmented neo-brutal style. Flow bình thường trong page
          (không sticky) để scroll toàn trang gọn. Sticky chỉ ở page header. */}
      <div
        role="tablist"
        aria-label={m.categories_group_expense() + ' / ' + m.categories_group_income()}
        className="inline-flex border-2 border-border bg-card shadow-brutal-sm"
      >
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="category-table"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex h-10 items-center gap-2 px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all',
                idx > 0 && 'border-l-2 border-border',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-card hover:bg-secondary/40',
              )}
            >
              <Icon className="size-4" />
              {tab.label}
              <Badge variant={tab.key === 'income' ? 'income' : 'expense'}>{tab.count}</Badge>
            </button>
          );
        })}
      </div>

      <div id="category-table" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {visibleCount === 0 ? (
          <div className="border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            {m.categories_no_categories_for_type({
              type:
                activeTab === 'expense'
                  ? m.categories_group_expense()
                  : m.categories_group_income(),
            })}
          </div>
        ) : (
          <>
            {/* Mobile card view (<md) */}
            <div className="space-y-2 md:hidden">
              {visible.map((cat) => {
                const CatIcon = getIcon(cat.icon_name);
                const usage = usageMap[cat.id];
                return (
                  <ListCard key={cat.id}>
                    <ListCardHeader>
                      <div
                        className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CatIcon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-heading font-bold uppercase tracking-wide">
                          {cat.name}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={m.categories_actions_aria({ name: cat.name })}
                            />
                          }
                        >
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditCategory(cat)}>
                            <Pencil className="size-4" /> {m.common_edit()}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingCategory(cat)}
                          >
                            <Trash2 className="size-4" /> {m.common_delete()}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ListCardHeader>
                    <ListCardMeta>
                      {usage ? (
                        <UsageBadge usage={usage} />
                      ) : (
                        <span>{m.categories_usage_loading()}</span>
                      )}
                    </ListCardMeta>
                  </ListCard>
                );
              })}
            </div>

            {/* Desktop table view (≥md) */}
            <div className="hidden md:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[55%]">
                      {m.categories_table_name()}
                    </TableHead>
                    <TableHead className="w-[25%]">
                      {m.categories_table_usage()}
                    </TableHead>
                    <TableHead className="w-[20%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((cat) => {
                    const CatIcon = getIcon(cat.icon_name);
                    const usage = usageMap[cat.id];
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="!whitespace-normal align-top">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center border-2 border-border text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              <CatIcon className="size-4" />
                            </div>
                            <span className="font-heading font-bold uppercase leading-tight tracking-wide">
                              {cat.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {usage ? (
                            <UsageBadge usage={usage} />
                          ) : (
                            <span className="text-muted-foreground">
                              {m.categories_usage_loading()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={m.categories_actions_aria({ name: cat.name })}
                              onClick={() => onEditCategory(cat)}
                            >
                              <Pencil className="size-3.5" /> {m.common_edit()}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={m.categories_actions_aria({ name: cat.name })}
                              onClick={() => setDeletingCategory(cat)}
                              data-destructive="true"
                            >
                              <Trash2 className="size-3.5" /> {m.common_delete()}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Edit form do page-level wrapper (CategoryPageSections) own, mount 1 lần
          ở root. List không render <CategoryForm> nữa để tránh dual-mount
          race với page-level instance. */}

      {/* Delete confirm mount 1 lần ở root (không bên trong dropdown).
          Root-level mount tránh conflict lifecycle với Base UI Menu closing. */}
      <AlertDialog
        open={deletingCategory !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingCategory(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingCategory
                ? m.categories_delete_title({ name: deletingCategory.name })
                : m.categories_delete_title({ name: '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTotalUsage > 0 ? (
                <span className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {m.categories_delete_blocked({ count: deletingTotalUsage })}
                  </span>
                </span>
              ) : (
                m.categories_delete_desc()
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingCategory) handleDelete(deletingCategory.id);
              }}
              disabled={pending || deletingTotalUsage > 0}
            >
              {pending ? m.common_deleting() : m.common_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UsageBadge({
  usage,
}: {
  usage: { txn: number; budget: number; recurring: number };
}) {
  const total = usage.txn + usage.budget + usage.recurring;
  if (total === 0) {
    return (
      <span className="text-muted-foreground">
        {m.categories_usage_no_txn()}
      </span>
    );
  }
  const items: { count: number; label: string }[] = [];
  if (usage.txn > 0) items.push({ count: usage.txn, label: m.categories_usage_abbrev_txn() });
  if (usage.budget > 0) items.push({ count: usage.budget, label: m.categories_usage_abbrev_budget() });
  if (usage.recurring > 0) items.push({ count: usage.recurring, label: m.categories_usage_abbrev_recurring() });
  return (
    <span className="font-medium leading-snug">
      {items.map((it, i) => (
        <span key={it.label} className="block">
          {it.count} {it.label}
          {i < items.length - 1 ? '' : ''}
        </span>
      ))}
    </span>
  );
}
