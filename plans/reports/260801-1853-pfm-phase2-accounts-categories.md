# Phase 2 Report — Accounts & Categories CRUD

**Date:** 2026-08-01
**Status:** DONE
**Build:** ✓ PASS (12 routes, 0 errors)

## Tóm tắt

Hoàn thành CRUD cho accounts + categories với UI tùy chỉnh (icon-picker whitelist + color-picker hybrid). Dashboard hiển thị tổng số dư, số lượng category, và quick actions. NavLinks ở header.

## Đã làm

### Schemas + Server Actions

- `features/accounts/schema.ts` — `accountSchema` (name 1-60, type enum 7 loại, currency 3 chars, initial_balance non-negative, color hex, icon optional)
- `features/accounts/actions.ts` — `createAccount`, `updateAccount`, `archiveAccount`, `deleteAccount`, `listAccounts`. Mỗi action verify ownership trước khi mutate, re-validate zod, revalidatePath sau.
- `features/categories/schema.ts` — `categorySchema` (name 1-40, type income/expense, icon_name 1-50, color hex, sort_order int)
- `features/categories/actions.ts` — same pattern cho categories.

### Icon & color catalogs

- `icon-catalog.ts` — 41 icon lucide whitelist với `{name, label, keywords, Icon}`. Mỗi icon có search keywords (vd: "salary" → "Lương", "food" → "Ăn uống"). Helper `getIcon(name)` lookup nhanh.
- `color-catalog.ts` — 18 preset màu (đỏ, cam, vàng, xanh lá, xanh dương, tím, hồng, xám, nâu...). Helper `getColorLabel(hex)`.

### Form components

- `AccountForm` — dialog tạo/sửa với Select (type), Input (name/currency/initial_balance), color swatches grid, icon grid tùy chọn. Submit qua Server Action binding `updateAccount.bind(null, id)`.
- `CategoryForm` — dialog tạo/sửa với **icon-picker search** (filter theo name/label/keywords, hiển thị preview icon đã chọn) và **color-picker hybrid** (18 preset + hex input). State riêng cho `iconSearch`.

### List components

- `AccountList` — table với icon trong ô màu, badge type, số dư format VND, dropdown menu có Lưu trữ / Xóa (với AlertDialog confirm). Soft delete qua `is_archived=true`.
- `CategoryList` — grid 2 nhóm (Chi tiêu / Thu nhập) với count badge. Default categories hiển thị badge "Mặc định" và không có nút edit/delete (bảo vệ seed data).

### Pages

- `app/(protected)/accounts/page.tsx` — fetch accounts, hiển thị tổng số dư theo currency ở header (computed inline).
- `app/(protected)/categories/page.tsx` — fetch categories, render grid.

### Dashboard update

- 3 stat cards: Số dư tài khoản (computed theo currency), Danh mục (X chi tiêu · Y thu nhập), Thu chi tháng này (placeholder "Sẽ hiển thị ở Phase 4").
- Quick actions section: 4 buttons (Accounts/Categories active, Transactions/Budgets disabled với "Sắp có").
- Dùng `Promise.all` để parallel fetch profile + accounts + categories.

### Nav

- `features/dashboard/nav-links.tsx` — 5 link với icon lucide, highlight route hiện tại (dùng `usePathname`).
- 2 link tương lai (Giao dịch, Ngân sách) hiển thị badge "Sắp có" + disabled.
- Header ở `app/(protected)/layout.tsx` thêm NavLinks.

## Issues đã giải quyết

| Vấn đề | Fix |
|--------|-----|
| `Module not found '@/components/ui/alert-dialog'` | Cài thêm: `pnpm dlx shadcn@latest add alert-dialog` |
| Unhandled rejection trong auth form ở Phase 1 | Refactor sang form thuần + `useActionState` (đã fix trước Phase 2) |

## Build output

```
Route (app)                    Type
┌ ƒ /                          Dynamic
├ ƒ /accounts                  Dynamic (MỚI)
├ ƒ /auth/callback             Dynamic
├ ƒ /categories                Dynamic (MỚI)
├ ƒ /check-email               Dynamic
├ ƒ /dashboard                 Dynamic
├ ƒ /error                     Dynamic
├ ○ /login                     Static
└ ○ /signup                    Static
```

## Cấu trúc thư mục sau Phase 2

```
src/
├── app/
│   ├── (auth)/{login,signup,check-email,error}/
│   ├── (protected)/
│   │   ├── accounts/page.tsx          (MỚI)
│   │   ├── categories/page.tsx        (MỚI)
│   │   ├── dashboard/page.tsx         (CẬP NHẬT)
│   │   └── layout.tsx                 (CẬP NHẬT — thêm NavLinks)
│   ├── auth/callback/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   ├── auth/                          (Phase 1)
│   ├── accounts/                      (MỚI — 4 files)
│   ├── categories/                    (MỚI — 6 files)
│   └── dashboard/nav-links.tsx        (MỚI)
├── components/ui/                     (thêm: select, dialog, badge, table, separator, dropdown-menu, alert-dialog)
├── lib/{utils.ts, supabase/{client,server,middleware}.ts}
├── types/database.ts
└── proxy.ts
```

## Known trade-offs

1. **Icon whitelist 41** — chỉ cover ~80% use case phổ biến. Có thể mở rộng khi user request.
2. **AccountForm và CategoryForm gần giống nhau** — chưa extract shared component. Khi có 3+ form tương tự sẽ refactor.
3. **Hard delete fail khi có FK** — message thân thiện nhưng UI chưa catch gracefully (dùng `alert()` tạm). Phase 3 sẽ dùng sonner toast.
4. **Sort categories theo `sort_order` + `name`** — server đã order, nhưng UI chưa có kéo-thả để sắp xếp lại (out of scope MVP).
5. **Icon-picker chỉ whitelist lucide** — không cho phép user upload icon riêng. Có thể thêm ở phase sau.

## Bước tiếp theo cần user

1. Test thử `/accounts`:
   - Login → click "Tài khoản" ở nav → "Thêm tài khoản" → điền form → tạo
   - Test edit / archive / delete
2. Test thử `/categories`:
   - Click "Danh mục" ở nav → xem 16 category mặc định
   - Test thêm category mới với icon-picker + color-picker
   - Test edit / delete (default categories không xóa được — đúng)
3. Review code, sau đó ra lệnh tiếp tục **Phase 3: CRUD transactions** (form thêm/sửa, upload receipt, list với filter)
