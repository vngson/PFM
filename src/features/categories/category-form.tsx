'use client';

// CategoryForm: dialog tạo/sửa danh mục.
// - icon-picker: grid whitelist + search (sticker style)
// - color-picker: square swatches + hex input
// Submit qua Server Action, hiển thị lỗi qua useActionState.
// Neo-brutalism: hard borders, sticker icon rotation khi chọn.
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { COLOR_CATALOG } from './color-catalog';
import { ICON_CATALOG, getIcon } from './icon-catalog';
import { useDialogFormState } from '@/lib/hooks/use-dialog-form-state';
import { notify } from '@/lib/toast';
import type { Category } from '@/types/database';
import { createCategory, updateCategory, type ActionState } from './actions';
import * as m from '@/paraglide/messages';

const CATEGORY_TYPE_ITEMS: { value: Category['type']; label: string }[] = [
  { value: 'expense', label: m.categories_form_type_expense() },
  { value: 'income', label: m.categories_form_type_income() },
];

const initialState: ActionState = null;

interface CategoryFormProps {
  category?: Category;
  /** Trigger element. "hidden" = không hiển thị nút bấm (controlled từ bên ngoài). */
  trigger?: 'create' | 'edit' | 'hidden';
  /** Controlled open state. Nếu không truyền thì form tự quản lý. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CategoryForm({
  category,
  trigger,
  open: openProp,
  onOpenChange,
}: CategoryFormProps) {
  const isEdit = !!category;
  const action = isEdit
    ? updateCategory.bind(null, category!.id)
    : createCategory;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  };

  const [type, setType] = useState<Category['type']>(category?.type ?? 'expense');
  const [iconName, setIconName] = useState<string>(category?.icon_name ?? '');
  const [color, setColor] = useState<string>(category?.color ?? '#f97316');
  const [iconSearch, setIconSearch] = useState('');

  // Reset state khi edit form mở (đặc biệt với key-based remount từ parent)
  useEffect(() => {
    if (open && category) {
      setType(category.type);
      setIconName(category.icon_name);
      setColor(category.color);
      setIconSearch('');
    }
  }, [open, category]);

  // Auto-close dialog + toast khi submit thành công
  useEffect(() => {
    if (closeOnSuccess) {
      queueMicrotask(() => {
        setOpen(false);
        notify.success(isEdit ? m.categories_update_toast() : m.categories_create_toast());
      });
    }
  }, [closeOnSuccess, isEdit]);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  // Filter icons theo search: match tên, label, keywords
  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return ICON_CATALOG;
    return ICON_CATALOG.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.label().toLowerCase().includes(q) ||
        o.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [iconSearch]);

  const SelectedIcon = getIcon(iconName);

  const triggerButton = isEdit ? (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Pencil className="size-3.5" /> {m.common_edit()}
    </Button>
  ) : (
    <Button className="gap-1.5">
      <Plus className="size-4" /> {m.categories_create_btn()}
    </Button>
  );

  const showTrigger = trigger !== 'hidden';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger render={triggerButton as React.ReactElement} />
      ) : null}
      <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.categories_form_edit_title() : m.categories_form_create_title()}
          </DialogTitle>
          <DialogDescription>
            {m.categories_form_name_placeholder()}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <div className="space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="name">{m.categories_form_name_label()}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={category?.name ?? ''}
                placeholder={m.categories_form_name_placeholder()}
                required
              />
              {fieldError('name') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('name')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{m.categories_form_type_label()}</Label>
              <Select
                name="type"
                items={CATEGORY_TYPE_ITEMS}
                value={type}
                onValueChange={(v) => setType(v as Category['type'])}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color picker — neo-brutalism square + hover lift */}
            <div className="space-y-2">
              <Label>{m.categories_form_color_label()}</Label>
              <input type="hidden" name="color" value={color} />
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_CATALOG.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label()}
                    aria-label={m.common_color_label({ label: c.label() })}
                    onClick={() => setColor(c.value)}
                    className={`size-8 border-2 border-border transition-all ${
                      color === c.value
                        ? 'shadow-brutal-sm -translate-x-[2px] -translate-y-[2px]'
                        : 'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal-sm'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
                  }}
                  className="w-28 font-mono text-xs"
                  placeholder="#hex"
                  maxLength={7}
                />
              </div>
              {fieldError('color') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('color')}
                </p>
              ) : null}
            </div>

            {/* Icon picker — sticker style */}
            <div className="space-y-2">
              <Label>{m.categories_form_icon_label()}</Label>
              <input type="hidden" name="icon_name" value={iconName} />
              <div className="flex items-center gap-2">
                <div
                  className="flex size-10 items-center justify-center border-2 border-border text-white"
                  style={{ backgroundColor: color }}
                >
                  <SelectedIcon className="size-5" />
                </div>
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {iconName || m.common_no_color()}
                </span>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder={m.categories_icon_search_placeholder()}
                  className="pl-9"
                />
              </div>
              <div className="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto border-2 border-border p-2 sm:grid-cols-10">
                {filteredIcons.length === 0 ? (
                  <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
                    {m.common_no_icon_found()}
                  </p>
                ) : (
                  filteredIcons.map(({ name, label, Icon }) => (
                    <button
                      key={name}
                      type="button"
                      title={label()}
                      aria-label={label()}
                      onClick={() => setIconName(name)}
                      className={`flex aspect-square items-center justify-center border-2 transition-all ${
                        iconName === name
                          ? 'border-foreground bg-foreground text-background rotate-[-3deg] scale-110 shadow-brutal-sm'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))
                )}
              </div>
              {fieldError('icon_name') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('icon_name')}
                </p>
              ) : null}
            </div>

            <input type="hidden" name="sort_order" value={category?.sort_order ?? 0} />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {m.common_cancel()}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? m.common_saving() : isEdit ? m.common_update() : m.common_create()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
