// Trang quản lý danh mục — Server Component fetch data, Client Component render UI.
// Neo-brutalism: bordered title chip + bold uppercase heading.
// Full i18n qua Paraglide messages.
//
// CategoryPageSections: client wrapper owns editingCategory state. Trước đây
// page-level <CategoryForm /> + list-level <CategoryForm /> đều render <Dialog>
// portal → dual-mount race, Base UI Dialog v2 trigger context bị collide nên
// click Sửa / Xoá trong list không mở dialog. Lift state lên wrapper, single
// <CategoryForm> instance controlled.
//
// Mobile (<md): header không sticky, title nhỏ hơn (text-2xl vs 4xl), Tạo danh
// mục button full-width primary ở dưới filter bar thay vì cạnh title (tránh
// overlap trên viewport 390px). Desktop (≥md) giữ layout sticky + title lớn.
import { listCategories } from '@/features/categories/actions';
import { CategoryPageSections } from '@/features/categories/category-page-sections';
import { ExportButton } from '@/features/export/export-button';
import { exportCategoriesCSV } from '@/features/export/actions';
import * as m from '@/paraglide/messages';

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="space-y-4 px-4 py-6 md:space-y-6 md:px-6 md:py-8 lg:mx-auto lg:max-w-6xl">
      <CategoryPageSections
        categories={categories}
        header={
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
            <div className="min-w-0">
              <div className="mb-2 inline-flex border-2 border-border bg-accent px-3 py-1 text-accent-foreground shadow-brutal-sm">
                <span className="font-heading text-xs font-bold uppercase tracking-wider">
                  {m.categories_manage()}
                </span>
              </div>
              {/* Mobile: text-2xl để vừa 1 dòng "DANH MỤC" trên 390px.
                  Desktop: text-4xl cho editorial feel. */}
              <h1 className="mt-2 font-heading text-2xl font-bold uppercase leading-tight tracking-tight md:mt-3 md:text-4xl">
                {m.categories_page_title()}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:mt-2">
                {m.categories_page_subtitle()}
              </p>
            </div>
            {/* Desktop: Export button cạnh title. Mobile: ẩn (move vào sticky
                bar dưới filter, xem CategoryPageSections) để giảm noise. */}
            <div className="hidden items-center gap-2 md:flex">
              <ExportButton action={exportCategoriesCSV} />
            </div>
          </div>
        }
      />
    </div>
  );
}