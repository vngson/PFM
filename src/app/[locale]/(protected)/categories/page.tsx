// Trang quản lý danh mục — Server Component fetch data, Client Component render UI.
// Neo-brutalism: bordered title chip + bold uppercase heading.
// Phase 25: full i18n qua Paraglide messages.
import { listCategories } from '@/features/categories/actions';
import { CategoryForm } from '@/features/categories/category-form';
import { CategoryList } from '@/features/categories/category-list';
import { ExportButton } from '@/features/export/export-button';
import { exportCategoriesCSV } from '@/features/export/actions';
import * as m from '@/paraglide/messages';

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
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
        <CategoryForm />
        <div className="flex items-center gap-2">
          <ExportButton action={exportCategoriesCSV} />
        </div>
      </div>

      <CategoryList categories={categories} />
    </div>
  );
}
