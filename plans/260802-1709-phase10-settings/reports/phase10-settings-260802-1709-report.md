# Phase 10 Report — Settings page

**Date**: 2026-08-02 17:09
**Scope**: Profile + change password + sessions
**Outcome**: ✅ Build pass

## Deliverables

### 10.1 Schema + actions

`src/features/settings/schema.ts`:
- `profileSchema`: username (regex `/^[a-z0-9_.]{3,32}$/`), full_name (optional ≤80), currency_code (enum 8 loại: VND/USD/EUR/JPY/GBP/AUD/SGD/THB), locale (vi-VN/en-US).
- `passwordSchema`: current + next + confirm. Refine: confirm === next, next !== current, next ≥ 8 chars.

`src/features/settings/actions.ts`:
- `updateProfile`: parse → update `profiles` row → update `auth.updateUser({ data: { currency_code, locale } })` → revalidate.
- `changePassword`: parse → verify current password qua `signInWithPassword` (re-auth) → `updateUser({ password: next })`.
- `listSessions`: trả 1 row duy nhất (current session) vì Supabase không expose API list all.
- `signOutOtherSessions`: `supabase.auth.signOut({ scope: 'others' })`.

### 10.2 UI

- `profile-form.tsx`: 2-col grid với username + full_name + currency + locale. Alert success/error.
- `password-form.tsx`: 3 password input với toggle show/hide (Eye/EyeOff icon).
- `sessions-card.tsx`: list session hiện tại + nút "Đăng xuất các thiết bị khác".
- `/settings/page.tsx`: parallel fetch profile + sessions → render 3 Card.

### 10.3 Nav

`src/features/dashboard/nav-links.tsx`: thêm `{ href: '/settings', label: 'Cài đặt', icon: SettingsIcon }`.

## Type errors gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `s.issued_at` không tồn tại | Supabase v3 Session type khác | Dùng `user.created_at ?? now` |
| `s.user_agent`, `s.ip` không tồn tại | Session type không có | Trả `null`, fallback "Thiết bị hiện tại" |

## Build verification

```
✓ Compiled successfully in 7.7s
✓ Generating static pages (16/16)
ƒ /settings  server-rendered on demand
```

## Decisions

- **Currency enum cứng** (8 loại): tránh user nhập string lạ. Phase sau nếu cần mở rộng → thêm enum values.
- **Re-auth qua signInWithPassword**: an toàn + đơn giản hơn RPC riêng. Có thể cache session mới để tránh phải login lại.
- **Sessions list chỉ trả 1 row**: trade-off giữa UX (chỉ show hiện tại) và honesty (không fake data). Phase sau nếu user đòi list all → custom table.
- **Show/hide password**: bắt buộc cho mobile UX. Icon Eye/EyeOff chuẩn.

## Open questions

- Nên cache `last_sign_in_at` ở localStorage/cookie để không phải trả `now` mỗi lần? Không cần vì list chỉ hiện 1 session.
- Cho phép user xoá account (GDPR)? Phase sau nếu cần.

## Files modified/created

```
+ src/features/settings/schema.ts
+ src/features/settings/actions.ts
+ src/features/settings/profile-form.tsx
+ src/features/settings/password-form.tsx
+ src/features/settings/sessions-card.tsx
+ src/app/(protected)/settings/page.tsx
~ src/features/dashboard/nav-links.tsx
+ plans/260802-1709-phase10-settings/plan.md
+ plans/260802-1709-phase10-settings/reports/phase10-settings-260802-1709-report.md
```
