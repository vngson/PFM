---
phase: 04
title: "Soft Delete + 30-Day Grace Period"
status: pending
priority: P2
dependencies: [02, 03]
---

# Phase 04: Soft Delete + 30-Day Grace Period

## Overview
Convert account deletion từ **hard delete** (current `deleteAccount`) sang **soft delete**: set `deleted_at` + `scheduled_purge_at` (= now + 30 days). User có thể login lại trong 30 ngày để khôi phục. Sau grace period, pg_cron xóa hẳn (cascade `auth.users` → 6 tables).

## Requirements
- **Functional**:
  - Settings → "Yêu cầu xóa tài khoản" → confirm modal → soft delete + sign out + redirect `/[locale]/login`
  - Trang `/[locale]/account-deleted` hiển thị countdown + nút "Khôi phục"
  - Login lại → middleware check `deleted_at != null` → redirect `/account-deleted`
  - Click "Khôi phục" → clear `deleted_at` → redirect `/dashboard`
- **Non-functional**:
  - Soft delete hoàn tất < 2s
  - Cron job daily 2AM xóa account quá 30 ngày
  - Storage bucket cleanup qua `before delete` trigger

## Architecture

```
DeleteAccountCard (UI) → requestAccountDeletion()
  ├─ Set deleted_at = now(), scheduled_purge_at = now() + 30 days
  ├─ supabase.auth.signOut()
  └─ redirect('/login')

Middleware (src/lib/supabase/middleware.ts)
  ├─ Nếu user logged in AND profile.deleted_at != null
  │   → redirect('/[locale]/account-deleted')
  └─ Ngược lại → continue

AccountDeletedPage
  ├─ Countdown: scheduled_purge_at - now
  ├─ Button "Khôi phục" → restoreAccount()
  └─ restoreAccount: clear deleted_at, scheduled_purge_at

pg_cron (manual setup in Supabase SQL Editor):
  SELECT cron.schedule('purge-deleted-accounts', '0 2 * * *', $$
    DELETE FROM auth.users
    WHERE id IN (
      SELECT id FROM profiles
      WHERE deleted_at IS NOT NULL
        AND scheduled_purge_at < now()
    )
  $$);

Trigger storage cleanup:
  CREATE FUNCTION purge_user_storage() ...
  CREATE TRIGGER before_delete_user
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION purge_user_storage();
```

## Related Code Files
- Create: `supabase/migrations/0004_soft_delete.sql` (columns + RLS full lockout + trigger)
- Create: `supabase/migrations/0005_rollback_soft_delete.sql` (rollback script cho emergency)
- Create: `src/app/[locale]/account-deleted/page.tsx` (read-only explain page)
- Create: `src/app/[locale]/account-deleted/restore-action.ts` (server action)
- Modify: `src/proxy.ts` (add `deleted_at` check — KHÔNG phải middleware.ts; Next.js 16 dùng proxy.ts)
- Modify: `src/features/auth/actions.ts` (add `requestAccountDeletion`, `restoreAccount`)
- Modify: `src/features/settings/actions.ts` (`deleteAccount` → soft delete alias)
- Modify: `src/features/settings/delete-account-card.tsx` (update UX message)
- Modify: `src/messages/{vi,en}.json` (settings_delete_*, account_deleted_*)

## Implementation Steps

1. **Migration 0004** (`supabase/migrations/0004_soft_delete.sql`):
   ```sql
   -- 1. Add columns
   ALTER TABLE public.profiles
     ADD COLUMN deleted_at timestamptz,
     ADD COLUMN scheduled_purge_at timestamptz;

   CREATE INDEX profiles_deleted_at_idx
     ON public.profiles (deleted_at, scheduled_purge_at)
     WHERE deleted_at IS NOT NULL;

   -- 2. Full RLS lockout — phải update TẤT CẢ policies, không chỉ SELECT
   -- Đọc 0001_init_schema.sql trước để biết exact policy names hiện có
   -- Pattern lặp lại cho cả 6 tables: profiles, accounts, categories, transactions, budgets, recurring_transactions

   -- profiles
   DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
   CREATE POLICY "profiles_select_own" ON public.profiles
     FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

   DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
   CREATE POLICY "profiles_update_own" ON public.profiles
     FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL)
     WITH CHECK (auth.uid() = id AND deleted_at IS NULL);

   -- accounts
   DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
   CREATE POLICY "accounts_select_own" ON public.accounts
     FOR SELECT USING (
       auth.uid() = user_id AND deleted_at IS NULL  -- cần join với profiles
     );

   -- Tương tự cho INSERT/DELETE nếu có:
   -- DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
   -- CREATE POLICY "accounts_insert_own" ON public.accounts
   --   FOR INSERT WITH CHECK (
   --     auth.uid() = user_id AND deleted_at IS NULL
   --   );
   -- Lặp lại pattern cho categories, transactions, budgets, recurring_transactions

   -- 3. Storage cleanup trigger
   CREATE OR REPLACE FUNCTION public.purge_user_storage()
   RETURNS TRIGGER AS $$
   BEGIN
     DELETE FROM storage.objects
     WHERE bucket_id = 'receipts'
       AND (storage.foldername(name))[1] = OLD.id::text;
     RETURN OLD;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER before_delete_user_storage
     BEFORE DELETE ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.purge_user_storage();

   -- 4. Manual cron job (cần pg_cron extension enabled)
   -- SELECT cron.schedule('purge-deleted-accounts', '0 2 * * *', $$
   --   DELETE FROM auth.users
   --   WHERE id IN (
   --     SELECT id FROM public.profiles
   --     WHERE deleted_at IS NOT NULL
   --       AND scheduled_purge_at < now()
   --   )
   -- $$);
   ```

2. **Migration 0005** (`supabase/migrations/0005_rollback_soft_delete.sql`) — emergency rollback:
   ```sql
   -- Run this if migration 0004 causes data integrity issues
   DROP TRIGGER IF EXISTS before_delete_user_storage ON auth.users;
   DROP FUNCTION IF EXISTS public.purge_user_storage();

   -- Restore original RLS policies (lấy từ git history của 0001_init_schema.sql)
   -- DROP POLICY ... ; CREATE POLICY ... (original without deleted_at filter)

   ALTER TABLE public.profiles
     DROP COLUMN IF EXISTS deleted_at,
     DROP COLUMN IF EXISTS scheduled_purge_at;
   ```

2. **Server actions** trong `src/features/auth/actions.ts`:
   ```ts
   export async function requestAccountDeletion(): Promise<FormState> {
     const { supabase, user } = await requireUser();
     const purgeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

     const { error } = await supabase
       .from('profiles')
       .update({ deleted_at: new Date().toISOString(), scheduled_purge_at: purgeAt })
       .eq('id', user.id);

     if (error) return { error: m.settings_delete_failed() };

     await supabase.auth.signOut();
     redirect(`/${getLocale()}/login`);
   }

   export async function restoreAccount(): Promise<FormState> {
     const { supabase, user } = await requireUser();
     const { error } = await supabase
       .from('profiles')
       .update({ deleted_at: null, scheduled_purge_at: null })
       .eq('id', user.id);

     if (error) return { error: m.account_deleted_restore_failed() };
     redirect(`/${getLocale()}/dashboard`);
   }
   ```

3. **Modify `src/proxy.ts`** (Next.js 16 — KHÔNG phải `middleware.ts`):
   ```ts
   // Inside updateSession() — sau khi get user, check deleted_at
   const { data: profile } = await supabase
     .from('profiles')
     .select('deleted_at')
     .eq('id', user.id)
     .single();

   if (
     profile?.deleted_at &&
     !request.nextUrl.pathname.endsWith('/account-deleted') &&
     !request.nextUrl.pathname.endsWith('/login')
   ) {
     const locale = getLocaleFromPath(request.nextUrl.pathname);
     return NextResponse.redirect(
       new URL(`/${locale}/account-deleted`, request.url),
     );
   }
   ```

   **Lưu ý**: Verify file structure — Next.js 16 dùng `src/proxy.ts` export default function `proxy(request)` thay vì `middleware.ts`. Nếu project chưa migrate, cần tạo `proxy.ts` trước.

4. **Account deleted page**:
   ```tsx
   // src/app/[locale]/account-deleted/page.tsx
   import { requireUser } from '@/lib/supabase/server';
   import { RestoreAccountForm } from './restore-action';

   export default async function AccountDeletedPage() {
     const { supabase, user } = await requireUser();
     const { data: profile } = await supabase
       .from('profiles')
       .select('scheduled_purge_at')
       .eq('id', user.id)
       .single();

     const daysRemaining = Math.ceil(
       (new Date(profile?.scheduled_purge_at ?? '').getTime() - Date.now())
         / (1000 * 60 * 60 * 24),
     );

     return (
       <div className="mx-auto max-w-md space-y-6 p-6">
         <h1>{m.account_deleted_title()}</h1>
         <p>{m.account_deleted_description({ days: daysRemaining })}</p>
         <RestoreAccountForm />
       </div>
     );
   }
   ```

5. **DeleteAccountCard UX update** — đổi message:
   ```ts
   // Old: "Account sẽ bị xóa vĩnh viễn"
   // New: "Trong 30 ngày bạn có thể đăng nhập lại để khôi phục"
   ```

6. **Messages**:
   - `account_deleted_title`: "Tài khoản của bạn đang chờ xóa"
   - `account_deleted_description`: "Còn {days} ngày trước khi dữ liệu bị xóa vĩnh viễn."
   - `account_deleted_restore_button`: "Khôi phục tài khoản"
   - `account_deleted_restore_failed`: "Khôi phục thất bại. Vui lòng thử lại."

## Tests (TDD)

### Test 1: middleware redirects soft-deleted user
```ts
// src/proxy.test.ts — vitest với mocked Supabase client
import { describe, it, expect, vi } from 'vitest';
import { proxy } from './proxy';

describe('proxy.ts deleted_at redirect', () => {
  it('redirects soft-deleted user from /dashboard to /account-deleted', async () => {
    vi.mock('@supabase/ssr', () => ({
      createServerClient: () => ({
        auth: {
          getUser: () => Promise.resolve({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { deleted_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));

    const request = new Request('http://localhost:3000/vi/dashboard');
    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/account-deleted');
  });

  it('allows access to /account-deleted page itself', async () => {
    // Same mock but request URL ends with /account-deleted → no redirect
    const request = new Request('http://localhost:3000/vi/account-deleted');
    const response = await proxy(request);
    expect(response.status).not.toBe(307);
  });
});
```

### Test 2: restore flow
```ts
1. Login user A (with deleted_at set)
2. Navigate to /account-deleted
3. Click "Khôi phục"
4. Expected: redirect to /dashboard, profiles.deleted_at = null
```

### Test 3: countdown calculation
```ts
// src/app/[locale]/account-deleted/countdown.test.ts (pure)
import { describe, it, expect } from 'vitest';
import { computeDaysRemaining } from './countdown';

describe('computeDaysRemaining', () => {
  it('returns positive days when purge date is future', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeDaysRemaining(future)).toBeGreaterThanOrEqual(4);
    expect(computeDaysRemaining(future)).toBeLessThanOrEqual(5);
  });

  it('returns 0 when purge date is past', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(computeDaysRemaining(past)).toBe(0);
  });

  it('returns 0 when scheduled_purge_at is null', () => {
    expect(computeDaysRemaining(null)).toBe(0);
  });
});
```

### Test 4: manual cron simulation
```sql
-- Run in Supabase SQL Editor
-- 1. Update profile: deleted_at = now() - 31 days, scheduled_purge_at = now() - 1 day
-- 2. Run cron query manually
-- 3. Check auth.users — user should be gone, cascade deleted data
```

## Success Criteria
- [ ] Migration 0007 chạy thành công (test trên dummy project trước)
- [ ] Settings → "Yêu cầu xóa" → soft delete + sign out
- [ ] Login lại → redirect `/account-deleted`
- [ ] Click "Khôi phục" → clear `deleted_at` → redirect `/dashboard`
- [ ] Countdown hiển thị đúng số ngày còn lại
- [ ] RLS hide data đã xóa: query `accounts` của user đã soft-delete → return empty
- [ ] Manual SQL test: xóa user quá 30 ngày → cascade tới 6 tables
- [ ] Storage bucket `receipts` cũng bị cleanup khi hard delete

## Risk Assessment
- **Risk**: pg_cron chưa enable → soft delete accumulate, không ai xóa
  - **Mitigation**: Manual cleanup script + Supabase Dashboard guide
- **Risk**: RLS update break existing queries (RLS giờ filter `deleted_at IS NULL`)
  - **Mitigation**: Test migration trên dummy project trước; check tất cả queries có WHERE pattern OK
- **Risk**: `before delete` trigger fail nếu storage.objects không accessible
  - **Mitigation**: SECURITY DEFINER + try/catch in function
- **Risk**: User click "Khôi phục" nhưng data thực sự đã bị xóa (cron chạy trước)
  - **Mitigation**: Cron check `scheduled_purge_at < now()` strictly, không race với user click
- **Risk**: Storage trigger chỉ xóa bucket `receipts` — nếu có bucket khác (avatars) cần extend
  - **Mitigation**: Query `storage.buckets` để biết bucket names hiện có

## Out of scope
- ❌ Email confirm trước khi soft delete (UI confirm modal là đủ)
- ❌ Auto-extend grace period nếu user login thường xuyên
- ❌ Backup trước khi xóa hẳn (user đã có export ở Phase 03)