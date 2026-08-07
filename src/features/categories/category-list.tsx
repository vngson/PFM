'use client';

// CategoryList: grid các category với icon trong ô màu.
// Mỗi card có:
//   - tên + loại (expense/income) + usage badge (số GD / NS / định kỳ)
//   - dropdown menu (⋯) với Sửa + Xoá (có confirm kèm usage warning)
//   - default categories không có menu (read-only).
// Neo-brutalism: bordered cards, icon box sticker style, hover lift.

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Trash2,
  Pencil,
  Tag,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { getIcon } from './icon-catalog';
import type { Category } from '@/types/database';
import { CategoryForm } from './category-form';
import { countCategoryUsage, deleteCategory } from './actions';
import { notify } from '@/lib/toast';
import * as m from '@/paraglide/messages';

interface CategoryListProps {
  categories: Category[];
}

interface CategoryWithUsage extends Category {
  usage?: { txn: number; budget: number; recurring: number };
}

export function CategoryList({ categories }: CategoryListProps) {
  const [pending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<CategoryWithUsage[]>(categories);

  // Sync props -> state khi server trả list mới
  useEffect(() => {
    setItems(categories);
  }, [categories]);

  // Stable id signature — chỉ thay đổi khi id set thực sự khác.
  // Tránh re-fetch usage mỗi render do string identity mới.
  const idsKey = useMemo(() => categories.map((c) => c.id).join(','), [categories]);

  // Lazy-load usage cho tất cả categories (sau khi mount, không block render).
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      categories.map((c) =>
        countCategoryUsage(c.id).then((usage) => ({ id: c.id, usage })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map = new Map(results.map((r) => [r.id, r.usage]));
      setItems((prev) =>
        prev.map((c) => (map.has(c.id) ? { ...c, usage: map.get(c.id) } : c)),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey, categories]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(id);
        notify.success(m.categories_delete_toast());
        setDeleteId(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.categories_err_delete());
        setDeleteId(null);
      }
    });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title={m.categories_empty_title()}
        description={m.categories_empty_short_desc()}
      />
    );
  }

  // Group by type: expense trước, income sau
  const expense = items.filter((c) => c.type === 'expense');
  const income = items.filter((c) => c.type === 'income');
  const editingCategory = editingId
    ? items.find((c) => c.id === editingId) ?? null
    : null;

  const renderGroup = (
    title: string,
    groupItems: CategoryWithUsage[],
    type: 'expense' | 'income',
  ) => {
    if (groupItems.length === 0) return null;
    const Icon = type === 'income' ? TrendingUp : TrendingDown;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex size-7 items-center justify-center border-2 border-border bg-muted">
            <Icon className="size-3.5" />
          </div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider">
            {title}
          </h2>
          <Badge variant={type === 'income' ? 'income' : 'expense'}>
            {groupItems.length}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {groupItems.map((cat) => {
            const CatIcon = getIcon(cat.icon_name);
            const isDefault = cat.is_default;
            const usage = cat.usage;
            const totalUsage =
              (usage?.txn ?? 0) +
              (usage?.budget ?? 0) +
              (usage?.recurring ?? 0);
            return (
              <div
                key={cat.id}
                className="group relative flex items-center gap-3 border-2 border-border bg-card p-3 shadow-brutal-sm transition-all hover:shadow-brutal hover:-translate-x-[1px] hover:-translate-y-[1px]"
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  <CatIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold uppercase tracking-wide">
                    {cat.name}
                  </p>
                  {isDefault ? (
                    <p className="text-xs text-muted-foreground">{m.categories_default_badge()}</p>
                  ) : usage ? (
                    <UsageBadge usage={usage} />
                  ) : (
                    <p className="text-xs text-muted-foreground">{m.categories_usage_loading()}</p>
                  )}
                </div>
                {!isDefault ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={m.categories_actions_aria({ name: cat.name })}
                      className="inline-flex size-7 shrink-0 items-center justify-center border-2 border-border bg-card text-foreground transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal-sm outline-none data-[popup-open]:shadow-brutal-sm data-[popup-open]:-translate-x-[1px] data-[popup-open]:-translate-y-[1px]"
                    >
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-36">
                      <DropdownMenuItem onSelect={() => setEditingId(cat.id)}>
                        <Pencil className="size-4" /> {m.common_edit()}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleteId(cat.id)}
                      >
                        <Trash2 className="size-4" /> {m.common_delete()}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}

                <AlertDialog
                  open={deleteId === cat.id}
                  onOpenChange={(o) => setDeleteId(o ? cat.id : null)}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {m.categories_delete_title({ name: cat.name })}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {totalUsage > 0 ? (
                          <span className="flex items-start gap-2 text-destructive">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <span>
                              {m.categories_delete_blocked({ count: totalUsage })}
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
                        onClick={() => handleDelete(cat.id)}
                        disabled={pending || totalUsage > 0}
                      >
                        {pending ? m.common_deleting() : m.common_delete()}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup(m.categories_group_expense(), expense, 'expense')}
      {renderGroup(m.categories_group_income(), income, 'income')}

      {/* Edit form được mount 1 lần, controlled bởi editingId */}
      {editingCategory ? (
        <CategoryForm
          key={editingCategory.id}
          category={editingCategory}
          open={editingId !== null}
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
          trigger="hidden"
        />
      ) : null}
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
      <p className="text-xs text-muted-foreground">{m.categories_usage_no_txn()}</p>
    );
  }
  const parts: string[] = [];
  if (usage.txn > 0) parts.push(`${usage.txn} ${m.categories_usage_abbrev_txn()}`);
  if (usage.budget > 0) parts.push(`${usage.budget} ${m.categories_usage_abbrev_budget()}`);
  if (usage.recurring > 0) parts.push(`${usage.recurring} ${m.categories_usage_abbrev_recurring()}`);
  return (
    <p className="truncate text-xs text-muted-foreground">
      {parts.join(' · ')}
    </p>
  );
}
