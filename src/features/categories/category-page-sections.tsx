'use client';

// CategoryPageSections: client wrapper owns editingCategory state để chỉ render
// DUY NHẤT 1 <CategoryForm> instance. Trước đây page-level + list-level cùng
// mount <Dialog> portal → Base UI v2 trigger context bị collide, click Sửa /
// Xoá không mở dialog được. Lift state lên wrapper này, page-level <CategoryForm />
// ở page.tsx nhận controlled props.
//
// Khi dùng:
// - Page header "Tạo danh mục" button → setEditingCategory cho Category mới
//   (category prop = undefined → mode create).
// - List row "Sửa" button → setEditingCategory(cat).
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoryForm } from './category-form';
import { CategoryList } from './category-list';
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
    <div className="space-y-6">
      {/* Header sticky: server page render title + subtitle + Export button; wrapper
          render nút "Tạo danh mục" cạnh Export. Khi click → mở dialog chung. */}
      <div className="sticky top-0 z-20 -mx-6 border-b-2 border-border bg-background px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1">{header}</div>
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="size-4" /> {m.categories_create_btn()}
          </Button>
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
