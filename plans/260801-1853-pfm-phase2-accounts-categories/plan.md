# Plan: PFM Phase 2 — Accounts & Categories CRUD

**Status:** DONE
**Date:** 2026-08-01
**Build:** ✓ PASS (12 routes, 0 errors)

## Goal

Cho phép user quản lý tài khoản (ví, ngân hàng, thẻ...) và danh mục thu/chi với UI tùy chỉnh icon + màu.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Zod schemas + Server Actions CRUD | DONE |
| 2 | Icon & color catalog | DONE |
| 3 | AccountForm + AccountList | DONE |
| 4 | CategoryForm + CategoryList (với picker) | DONE |
| 5 | Pages /accounts, /categories | DONE |
| 6 | Dashboard widgets + NavLinks | DONE |
| 7 | Build verify | DONE |

## Cấu trúc files mới

```
src/
├── app/(protected)/
│   ├── accounts/page.tsx        # Server Component fetch + render
│   ├── categories/page.tsx      # Server Component fetch + render
│   └── layout.tsx               # CẬP NHẬT: thêm NavLinks
├── features/
│   ├── accounts/
│   │   ├── schema.ts            # accountSchema (zod)
│   │   ├── actions.ts           # CRUD + listAccounts
│   │   ├── account-form.tsx     # Dialog tạo/sửa
│   │   └── account-list.tsx     # Table với dropdown action
│   ├── categories/
│   │   ├── schema.ts            # categorySchema (zod)
│   │   ├── actions.ts           # CRUD + listCategories
│   │   ├── icon-catalog.ts      # 41 lucide icons whitelist + search
│   │   ├── color-catalog.ts     # 18 preset màu
│   │   ├── category-form.tsx    # Dialog với icon-picker + color-picker
│   │   └── category-list.tsx    # Grid nhóm theo income/expense
│   └── dashboard/
│       └── nav-links.tsx        # Nav bar với highlight active route
```

## Tính năng chính

### Accounts (`/accounts`)

- **Tạo/sửa**: dialog với name, type (7 loại), currency, initial_balance, color, icon (tùy chọn)
- **Danh sách**: table với badge type, số dư format VND, dropdown có Lưu trữ / Xóa
- **Soft delete**: dùng `is_archived=true` thay vì xóa thật (giữ lịch sử transaction)
- **Hard delete**: chỉ xóa được nếu không còn transaction FK (Postgres sẽ throw 23503)
- **Tổng số dư**: hiển thị theo từng currency ở header

### Categories (`/categories`)

- **Tạo/sửa**: dialog với name, type (income/expense), **icon-picker (grid 41 icon + search)**, **color-picker (18 preset + input hex)**
- **Danh sách**: grid 2 nhóm (Chi tiêu / Thu nhập), mỗi card có icon trong ô màu
- **Default categories**: hiển thị badge "Mặc định", không cho sửa/xóa (để bảo vệ seed)
- **User-created**: có nút sửa/xóa khi hover

### Icon-picker

- Whitelist 41 icon lucide-react phổ biến cho tài chính cá nhân
- Mỗi icon có: `name` (PascalCase), `label` (tiếng Việt), `keywords` (cho search)
- Search filter theo name/label/keywords (case-insensitive)
- Grid responsive: 8 cols mobile, 10 cols desktop, scroll được

### Color-picker

- 18 preset màu (đỏ, cam, vàng, xanh lá, xanh dương, tím, hồng, xám, nâu...)
- Input hex tự do (validate bằng regex)
- Click preset hoặc gõ hex đều update state

### Dashboard (`/dashboard`)

- Hiển thị tổng số dư theo currency (parallel fetch với profile + categories)
- Hiển thị số lượng category (expense vs income)
- 4 quick action buttons (2 active: Accounts/Categories, 2 disabled: Transactions/Budgets với "Sắp có")

### Nav

- 5 link: Tổng quan, Tài khoản, Danh mục, Giao dịch, Ngân sách
- 2 link cuối hiển thị "Sắp có" + disabled (pointer-events-none)
- Highlight route hiện tại

## Build output

```
Route (app)
┌ ƒ /
├ ƒ /accounts       ← MỚI
├ ƒ /auth/callback
├ ƒ /categories     ← MỚI
├ ƒ /check-email
├ ƒ /dashboard
├ ƒ /error
├ ○ /login
└ ○ /signup
```

## Decisions đã chốt

1. **Icon whitelist 41 + search** (không full lucide) — UX đơn giản, bundle nhỏ
2. **Color 18 preset + hex input** — vừa nhất quán vừa linh hoạt
3. **Soft delete (archive) cho accounts** — giữ lịch sử transaction
4. **Default categories không cho xóa** — bảo vệ data đã seed
5. **Server Action binding**: `updateAccount.bind(null, id)` để truyền id vào action signature
6. **Parallel fetch trong dashboard** — Promise.all thay vì await tuần tự

## Files cần review

- `src/features/categories/icon-catalog.ts` — whitelist icon
- `src/features/categories/color-catalog.ts` — preset màu
- `src/features/accounts/actions.ts` — pattern Server Action CRUD
- `src/features/categories/category-form.tsx` — UI phức tạp nhất (picker)
- `src/app/(protected)/dashboard/page.tsx` — parallel fetch + stats

## Bước tiếp theo (Phase 3)

- Tạo `transactions` table đã có sẵn từ Phase 1
- Form thêm/sửa giao dịch với category dropdown (icon + color), account dropdown, date picker
- Upload ảnh hóa đơn lên Supabase Storage `receipts` bucket
- List có filter theo tháng/category/account + phân trang
- Mỗi dòng hiển thị icon category + số tiền
