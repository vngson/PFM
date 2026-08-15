'use client';

// CategoryPageSections: client wrapper owns editingCategory state để chỉ render
// DUY NHẤT 1 <CategoryForm> instance. Trước đây page-level + list-level cùng
// mount <Dialog> portal → Base UI v2 trigger context bị collide, click Sửa /
// Xoá không mở dialog được. Lift state lên wrapper này, page-level <CategoryForm />
// ở page.tsx nhận controlled props.
//
// Mobile layout (<md):
// - Header KHÔNG sticky (sticky chiếm quá nhiều space trên viewport 390px).
// - Tạo danh mục button full-width ngay sau title block (primary CTA rõ ràng).
// - Export button ẩn trên mobile (chỉ desktop ≥md).
// Desktop (≥md):
// - Header sticky top, Tạo danh mục + Export cạnh title.
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoryForm } from './category-form';
import { CategoryList } from './category-list';
import { ExportButton } from '@/features/export/export-button';
import { exportCategoriesCSV } from '@/features/export/actions';
import type { Category } from '@/types/database';
import * as m from '@/paraglide/messages';

interface CategoryPageSectionsProps {
  categories: Category[];
  /** Header JSX từ server page (chip + title + subtitle + Export button). */
  header: ReactNode;
}

export function CategoryPageSections({ categories, header }: CategoryPageSectionsProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Sentinel phân biệt "create" vs "edit" cùng state `editingCategory !== null`.
  // Khi user bấm "Tạo danh mục" → setEditingCategory({} as Category) → id rỗng,
  // wrapper truyền category={undefined} xuống CategoryForm → mode create.
  // Khi user bấm "Sửa" ở row → setEditingCategory(cat) → có id → mode edit.
  const openCreate = () => setEditingCategory({} as Category);
  const openEdit = (cat: Category) => setEditingCategory(cat);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header: server page render title + subtitle. Mobile: full-width bình
          thường (không sticky). Desktop: sticky top-0 để scroll trong table
          vẫn thấy title + actions. */}
      <div className="md:sticky md:top-0 md:z-20 md:-mx-6 md:border-b-2 md:border-border md:bg-background md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
          <div className="min-w-0 flex-1">{header}</div>
          {/* Mobile: full-width primary CTA ngay sau header (44pt+ touch target).
              Desktop: inline button cạnh title. */}
          <Button
            className="h-11 w-full gap-1.5 md:h-10 md:w-auto"
            onClick={openCreate}
            aria-label={m.categories_create_btn()}
          >
            <Plus className="size-4" /> {m.categories_create_btn()}
          </Button>
          {/* Desktop-only Export — desktop có nhiều screen space, mobile hide. */}
          <div className="hidden md:block">
            <ExportButton action={exportCategoriesCSV} />
          </div>
        </div>
      </div>

      {/* Single controlled <CategoryForm> — dialog content cùng 1 Root. Không có
          trigger button ở đây vì header button đã onClick → open dialog.
          `trigger="hidden"` để form không render trigger button thừa. */}
      <CategoryForm
        key={editingCategory?.id ?? 'closed'}
        category={editingCategory?.id ? editingCategory : undefined}
        open={editingCategory !== null}
        onOpenChange={(o) => {
          if (!o) setEditingCategory(null);
        }}
        trigger="hidden"
      />

      <CategoryList categories={categories} onEditCategory={openEdit} />
    </div>
  );
}