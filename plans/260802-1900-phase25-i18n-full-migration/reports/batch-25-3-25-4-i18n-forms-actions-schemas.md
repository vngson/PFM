# Batch 25.3 + 25.4 — Forms, Lists, Server Actions + Factory Schemas

Status: DONE

## Scope

- **25.3** Forms + lists (CRUD UI): migrate all hardcoded VI to `m.*()` calls in 12 files
- **25.4** Server actions + factory schemas: 6 action files + refactor 6 zod schemas to factory

## What changed

### 25.3 — Forms/lists migrated

- `features/accounts/account-form.tsx` + `account-list.tsx` (ACCOUNT_TYPE_LABELS → function Record pattern; table headers; toast messages)
- `features/categories/category-form.tsx` + `category-list.tsx` (expense/income groups; usage badge)
- `features/budgets/budget-form.tsx` + `budget-list.tsx` (status labels; summary chips; remaining/exceeded card text)
- `features/recurring/recurring-form.tsx` + `recurring-list.tsx` + `frequency.ts` (FREQUENCY_LABELS → function Record; date labels; toast)
- `features/transactions/transaction-form.tsx` + `transaction-list.tsx` + `filter-chip-row.tsx` + `load-more.tsx` + `quick-add-form.tsx` + `search-box.tsx` (TYPE_LABELS, dialog text, empty states, error toasts)
- Replaced local `formatCurrency` and `'vi-VN'` Intl with `formatCurrency` + `getNumberLocale` from `@/lib/format`

### 25.4 — Schemas converted to factory + actions localized

- All zod schemas now: `export const schema = (t: Messages) => z.object({...})`
- Each caller passes a thin `xxxT()` helper that maps `m.zod_*()` to the `t` interface
- Server-side `m.zod_*()` works via AsyncLocalStorage (paraglideMiddleware)
- Server action error strings (`'Unauthorized'`, `'Không tìm thấy...'`, `'Đã có ngân sách...'`, etc.) → `m.action_*_err_*()` / `m.auth_err_*()` / `m.common_unauthorized()` / `m.settings_*()`

### Files touched (25.4)

- `features/accounts/schema.ts` + `actions.ts`
- `features/categories/schema.ts` + `actions.ts`
- `features/budgets/schema.ts` + `actions.ts`
- `features/recurring/schema.ts` + `actions.ts`
- `features/transactions/schema.ts` + `actions.ts`
- `features/auth/schema.ts` + `actions.ts`
- `features/settings/schema.ts` + `actions.ts`

### New message keys (~80)

Categories: `zod_category_*`, `zod_icon_*`, `zod_sort_order_*`, `categories_group_*`, `categories_default_badge`, `categories_no_categories_for_type`, `categories_icon_search_placeholder`, `categories_actions_aria`, `categories_delete_*`, `categories_usage_*`.

Accounts: `zod_account_*`, `zod_currency_*`, `zod_initial_balance_*`, `zod_color_hex`, `accounts_table_*`, `accounts_form_no_accounts`, `accounts_actions_aria`, `accounts_archive/delete_*`, `accounts_err_archive/delete`.

Budgets: `zod_budget_*`, `budgets_*` form/empty/delete/summary/status/card/grouping.

Transactions: `transactions_type_*`, `transactions_filter_*`, `transactions_count_in_group`, `transactions_clear/load_more_aria`, `transactions_load_more_label`, `transactions_create_btn_short`, `transactions_delete_*`, `transactions_err_delete`, `transactions_empty_*`, `transactions_filter_clear_link`, `transactions_form_*`, `transactions_no_category`.

Recurring: `recurring_type_*`, `recurring_next/until_label`, `recurring_waiting`, `recurring_paused_label`, `recurring_activate/pause`, `recurring_generate_*`, `recurring_delete_*`, `recurring_toggle_success_*`, `recurring_no_category/accounts`, `recurring_end_placeholder`, `recurring_err_*`.

Quick-add: `quick_add_dialog_title/desc`, `quick_add_amount/account/category_label`, `quick_add_account/category_placeholder`, `quick_add_no_accounts`, `quick_add_no_categories_income/expense`, `quick_add_cancel`, `quick_add_submit`.

Common: `common_saving`, `common_deleting`, `common_pending`, `common_no_color`, `common_no_icon_found`, `common_color_label`, `common_search_placeholder_default`, `common_unauthorized`.

Auth/settings: `zod_username_charset`, `zod_email_invalid`, `zod_password_*`, `auth_err_*`, `settings_profile_saved/password_changed/signout_other_success/account_deleted/delete_service_key_required`.

## Verification

- `pnpm paraglide:compile` clean
- `pnpm build` passes TS check, all 17 routes generated successfully

## Notes / risk

- `accountSchema` now returns `z.infer<ReturnType<typeof accountSchema>>` instead of plain `z.infer<typeof accountSchema>` — type flows fine because `AccountInput` is consumed via `parsed.data` which carries the inferred type.
- Zod schemas are now slightly more verbose at call sites (the `xxxT()` helper). Acceptable trade-off for fully localized validation.
- Auth/profile/change-password still use `useActionState` on the client and pass raw `state.fieldErrors` through unchanged — no client-side change needed since error strings now come localized from server.
- `delete-account-card.tsx` and other settings UI still display VI strings directly (not action errors) — covered in Batch 25.5.

## Open questions

- None; next batch proceeds.
