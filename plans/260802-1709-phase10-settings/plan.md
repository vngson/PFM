# Phase 10 — Settings page

**Status**: COMPLETED
**Started**: 2026-08-02 17:09
**Plan dir**: `plans/260802-1709-phase10-settings/`

## Goal

Trang `/settings` để user quản lý tài khoản:
1. **Profile**: username, full_name, currency_code, locale
2. **Password**: đổi mật khẩu (current → next → confirm)
3. **Sessions**: xem session hiện tại + đăng xuất các thiết bị khác

## Approach

3 Server Actions:
- `updateProfile`: validate zod, update `profiles` row + `auth.updateUser` data để đồng bộ currency/locale.
- `changePassword`: verify current password qua `signInWithPassword` (Supabase không có RPC verify), update password mới.
- `signOutOtherSessions`: `supabase.auth.signOut({ scope: 'others' })`.
- `listSessions`: trả 1 row (current session) vì Supabase không expose API list all sessions.

UI dùng Card + Form riêng cho mỗi section. Toggle show/hide password. Nav link `/settings` thêm vào `nav-links.tsx`.

## Phases

| Step | File | Status |
|------|------|--------|
| 10.1 | `src/features/settings/schema.ts` + `actions.ts` | DONE |
| 10.2 | `profile-form.tsx` + `password-form.tsx` + `sessions-card.tsx` + `/settings/page.tsx` | DONE |
| 10.3 | Nav link + verify build | DONE |

## Acceptance criteria

- [x] `/settings` page load với 3 cards (Profile / Password / Sessions)
- [x] Update profile ghi vào `profiles` table + `auth.user_metadata`
- [x] Change password verify current qua signInWithPassword
- [x] Sign out other sessions dùng scope='others'
- [x] Username unique constraint error (23505) → "Tên đăng nhập đã có người dùng."
- [x] Nav link `/settings` (SettingsIcon) xuất hiện trong header
- [x] Build pass

## Files

```
+ src/features/settings/schema.ts
+ src/features/settings/actions.ts
+ src/features/settings/profile-form.tsx
+ src/features/settings/password-form.tsx
+ src/features/settings/sessions-card.tsx
+ src/app/(protected)/settings/page.tsx
~ src/features/dashboard/nav-links.tsx       # + Settings link
+ plans/260802-1709-phase10-settings/plan.md
+ plans/260802-1709-phase10-settings/reports/phase10-settings-260802-1709-report.md
```

## Risks / Notes

- **listSessions trả 1 row**: Supabase JS SDK không expose API list all sessions. Phase sau nếu cần list tất cả → custom table tracking sessions hoặc dùng service role key ở backend.
- **verify current password**: dùng `signInWithPassword` (re-auth) thay vì RPC vì không tồn tại. Sign in fail sẽ trả error "Mật khẩu hiện tại không đúng.".
- **user_agent/ip**: Supabase Session type không có fields này trong v3 SDK → trả null. UI hiển thị "Thiết bị hiện tại" làm fallback.

## Reports

- `reports/phase10-settings-260802-1709-report.md`
