# Phase 20–23 Report: FX, Mobile nav, Onboarding, Settings extras

Status: DONE

## Phase 20 — Multi-currency FX
- `src/lib/fx.ts` — FX_RATES_VND map (10 currencies), `convertToVND`, `convertFromVND`, `convertCurrency`
- Dashboard `totalByCurrency` + `monthByCurrency` → thêm `totalVnd` + `monthNetVnd`
- Hiển thị `≈ {formatCurrency(totalVnd, 'VND')}` dưới balances card; unified monthly net (chỉ khi có >1 currency)

## Phase 21 — Mobile bottom nav
- `src/features/dashboard/mobile-nav.tsx` — 4 nav + center FAB
- `src/features/transactions/quick-add-form.tsx` — lắng nghe event `pfm:open-quick-add`; FAB desktop ẩn trên mobile
- `src/app/(protected)/layout.tsx` — mount `<MobileNav />`; `main` thêm `pb-20 md:pb-0`

## Phase 22 — Onboarding wizard
- `src/features/onboarding/wizard.tsx` — 3-step modal (welcome / account / category)
- Auto-show khi `accounts.length === 0 && categories.length === 0` + `localStorage.pfm:onboarded !== '1'`
- Step 2/3 deep-link sang `/accounts` / `/categories` rồi `router.refresh()`

## Phase 23 — Settings extras
- `actions.ts`: `exportAllData()` (parallel fetch 6 tables) + `deleteAccount()` (service-role admin API)
- `export-data-card.tsx` — client blob download JSON
- `delete-account-card.tsx` — confirm-by-email form, redirect to `/login` on success
- Settings page: thêm 2 Card (Export + Danger zone)

## Build
`pnpm build` ✓ — all 17 routes compiled, 0 TS errors.

## Files touched
- src/lib/fx.ts (new)
- src/features/dashboard/mobile-nav.tsx (new)
- src/features/onboarding/wizard.tsx (new)
- src/features/settings/export-data-card.tsx (new)
- src/features/settings/delete-account-card.tsx (new)
- src/features/settings/actions.ts (+2 actions)
- src/features/transactions/quick-add-form.tsx (event listener + FAB visibility)
- src/app/(protected)/layout.tsx (MobileNav + padding)
- src/app/(protected)/dashboard/page.tsx (FX total + Onboarding mount)
- src/app/(protected)/settings/page.tsx (2 new cards)

## Notes
- FX rates hard-code (Phase 20). Có thể swap sang API sau.
- `deleteAccount` cần `SUPABASE_SERVICE_ROLE_KEY` ở server env.
- Onboarding dùng `localStorage` (không phải DB column) để tránh migration.