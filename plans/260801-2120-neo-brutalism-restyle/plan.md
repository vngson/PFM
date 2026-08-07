# Plan: Neo-brutalism Restyle

**Status:** DONE (Phase 5 transactions deferred — chưa có feature)

## Quyết định thiết kế

1. **Palette** Neo-brutalism: ivory bg + black border + yellow secondary + red destructive + violet accent + green success + orange chart.
2. **Square edges**: `--radius-*` = 0.
3. **Hard shadow tokens**: 3 cấp `shadow-brutal-sm/md/lg` — offset đen tuyệt đối, không blur.
4. **Font**: Archivo Black cho heading (bold cứng), Space Grotesk cho body.
5. **Dotted bg pattern**: 24px radial-gradient subtle trên body.
6. **Shake animation**: form error dùng CSS keyframes (không cần framer-motion).
7. **Sticker effects**: icon-picker cell selected = `rotate-[-3deg] scale-110 shadow-brutal-sm` (theo design system).
8. **Hover = press**: button dùng `translate -2 -2 + shadow upgrade` để giả lập bị nhấn xuống.

## Files đã đụng

```
src/app/globals.css                              (Phase 1)
src/app/layout.tsx                               (Phase 1 — Google Font)
src/components/ui/{button,input,card,badge,       (Phase 2 — 12 primitives)
  label,dialog,dropdown-menu,select,table,
  separator,alert,alert-dialog}.tsx
src/app/(auth)/layout.tsx                        (Phase 3)
src/app/(auth)/{login,signup,check-email,
  error}/page.tsx
src/features/auth/{login,signup}-form.tsx        (Phase 3 — shake)
src/features/dashboard/nav-links.tsx             (Phase 4)
src/app/(protected)/layout.tsx                   (Phase 4)
src/app/(protected)/dashboard/page.tsx           (Phase 4)
src/app/(protected)/accounts/page.tsx            (Phase 6)
src/app/(protected)/categories/page.tsx          (Phase 6)
src/features/accounts/{account-form,             (Phase 6)
  account-list}.tsx
src/features/categories/{category-form,          (Phase 6)
  category-list}.tsx
```

## Files KHÔNG đụng

- `src/proxy.ts`, `src/types/database.ts`, `src/lib/supabase/*`
- `src/features/*/actions.ts` (Server Actions — chỉ là data layer)
- `src/features/*/schema.ts` (Zod schemas)
- `src/features/{auth/categories}/icon-catalog.ts`, `color-catalog.ts` (chỉ là data)
- `supabase/migrations/*`
- `package.json`, `tsconfig.json`, `eslint.config.mjs`

## Verification

- `pnpm build` pass 12 routes.
- Login → `/dashboard` → `/accounts` → `/categories` đều render OK sau khi chạy migrations.
- Form error: nhập sai email/password → shake.
- All primitives inherited từ `globals.css` (chỉ restyle tại source).

## Phase 5 (deferred)

Transactions chưa có feature. Khi bắt đầu xây:
- `src/features/transactions/{schema.ts, actions.ts, transaction-form.tsx, transaction-list.tsx}`
- `src/app/(protected)/transactions/page.tsx` (+ optional `new/page.tsx`, `[id]/edit/page.tsx`)

Sẽ restyle theo cùng token đã thêm:
- Badge variant `income` (green) / `expense` (red) cho số tiền
- Transaction row: sticker card `border-2 shadow-brutal-sm`, icon box `size-12 border-2 border-border` màu category color
- Filter pills: `border-2 shadow-brutal-sm`, active `bg-secondary`
- Receipt upload box: `border-2 border-dashed border-border`
