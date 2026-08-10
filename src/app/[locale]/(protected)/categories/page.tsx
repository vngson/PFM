// Trang quản lý danh mục — Server Component fetch data, Client Component render UI.
// Neo-brutalism: bordered title chip + bold uppercase heading.
// Full i18n qua Paraglide messages.
//
// CategoryPageSections: client wrapper owns editingCategory state. Trước đây
// page-level <CategoryForm /> + list-level <CategoryForm /> đều render <Dialog>
// portal → dual-mount race, Base UI Dialog v2 trigger context bị collide nên
// click Sửa / Xoá trong list không mở dialog. Lift state lên wrapper, single
// <CategoryForm> instance controlled.
import { listCategories } from '@/features/categories/actions';
import { CategoryPageSections } from '@/features/categories/category-page-sections';
import { ExportButton } from '@/features/export/export-button';
import { exportCategoriesCSV } from '@/features/export/actions';
import * as m from '@/paraglide/messages';

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <CategoryPageSections
        categories={categories}
        header={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex border-2 border-border bg-accent px-3 py-1 text-accent-foreground shadow-brutal-sm">
                <span className="font-heading text-xs font-bold uppercase tracking-wider">
                  {m.categories_manage()}
                </span>
              </div>
              <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-tight tracking-tight">
                {m.categories_page_title()}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {m.categories_page_subtitle()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton action={exportCategoriesCSV} />
            </div>
          </div>
        }
      />
    </div>
  );
}
