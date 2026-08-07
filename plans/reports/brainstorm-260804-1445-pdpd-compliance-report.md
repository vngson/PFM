# Brainstorm Report — VN PDPD Compliance Roadmap

**Date**: 2026-08-04
**Status**: Agreed, ready for planning handoff
**Scope**: Nghị định 13/2023/NĐ-CP (PDPD) minimum compliance cho Personal Finance Manager

---

## 1. Vấn đề & Bối cảnh Pháp lý

App PFM xử lý **dữ liệu tài chính cá nhân** (DLCN nhạy cảm theo Điều 2 Khoản 5 Nghị định 13/2023). Hiện tại:
- ✅ RLS đầy đủ trên 6 bảng — user không thấy data người khác
- ✅ Auth qua Supabase — chuẩn OAuth
- ❌ Không có Privacy Policy / Terms
- ❌ Không có consent checkbox
- ❌ Không có data export (vi phạm quyền data portability — Điều 14)
- ❌ Không có account deletion flow (vi phạm quyền xóa — Điều 14)

**Rủi ro**: Phạt 5% doanh thu hoặc tối đa 50 triệu VND (Điều 23 PDPD) nếu bị kiểm tra.

---

## 2. Quyết định đã chốt (Discovery Phase)

| Câu hỏi | Quyết định |
|---------|-----------|
| Phạm vi | Tối thiểu hợp pháp VN PDPD (5 phases, không audit log admin) |
| Export format | JSON đầy đủ (GDPR-style data portability) |
| Account deletion | Soft delete + grace period 30 ngày |
| Nội dung Privacy/Terms | Tôi viết draft, user review & finalize |

---

## 3. Solution Design — 5 Phases

### Phase A — Privacy & Terms pages

**Files**:
- Create: `src/app/[locale]/privacy/page.tsx`
- Create: `src/app/[locale]/terms/page.tsx`
- Create: `messages/privacy/vi.md`, `messages/privacy/en.md`
- Create: `messages/terms/vi.md`, `messages/terms/en.md`
- Modify: `src/app/[locale]/(protected)/layout.tsx` (thêm footer link)

**Nội dung markdown**:
- Mục đích thu thập (quản lý tài chính cá nhân)
- Loại data (giao dụch, danh mục, tài khoản — DLTQ)
- Thời gian lưu trữ (đến khi user xóa account)
- Quyền user: xem, sửa, xóa, xuất dữ liệu
- Thông tin admin / người xử lý
- Cơ chế khiếu nại

**Render**: Markdown loader đơn giản (read file + parse md hoặc dùng react-markdown).

---

### Phase B — Consent checkbox ở signup

**Files**:
- Modify: `src/features/auth/schema.ts` — thêm `consent: z.literal(true, { message: ... })`
- Modify: `src/app/[locale]/(auth)/signup/page.tsx` — thêm checkbox + link tới `/privacy` + `/terms`
- Modify: `src/features/auth/actions.ts` (`signupAction`) — reject nếu thiếu consent

**Pattern**:
```tsx
<label className="flex items-start gap-2 text-sm">
  <input type="checkbox" name="consent" required />
  <span>
    {m.auth_consent_prefix()}{' '}
    <Link href="/privacy">{m.auth_consent_privacy()}</Link>
    {' '}{m.auth_consent_and()}{' '}
    <Link href="/terms">{m.auth_consent_terms()}</Link>
  </span>
</label>
```

**Server action validation**:
```ts
const consent = formData.get('consent');
if (consent !== 'on') return { error: m.auth_consent_required() };
```

---

### Phase C — Data export endpoint

**Files**:
- Modify: `src/features/settings/actions.ts` — thêm `exportUserData()`
- Modify: `src/app/[locale]/(protected)/settings/page.tsx` — thêm button "Tải xuất dữ liệu"
- Create: `src/lib/export/json-export.ts` — helper serialize data

**Server action**:
```ts
'use server';
export async function exportUserData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const [profile, accounts, categories, transactions, budgets, recurring] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('budgets').select('*').eq('user_id', user.id),
      supabase.from('recurring_transactions').select('*').eq('user_id', user.id),
    ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    profile: profile.data,
    accounts: accounts.data,
    categories: categories.data,
    transactions: transactions.data,
    budgets: budgets.data,
    recurring_transactions: recurring.data,
  };
}
```

**Client**:
```tsx
async function handleExport() {
  const data = await exportUserData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pfm-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  notify.success(m.settings_export_success());
}
```

---

### Phase D — Soft delete + grace period 30 ngày

**Migrations**:
- `supabase/migrations/0003_soft_delete.sql`:
  ```sql
  ALTER TABLE public.profiles
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN scheduled_purge_at timestamptz;

  -- Update RLS: ẩn data đã xóa
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

  -- Tương tự cho accounts, categories, transactions, budgets, recurring_transactions
  ```

- `supabase/migrations/0004_consent_records.sql`:
  ```sql
  CREATE TABLE public.consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type text NOT NULL,
    policy_version text NOT NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    ip_hash text,
    UNIQUE (user_id, consent_type, policy_version)
  );
  ```

- `supabase/migrations/0005_purge_cron.sql` (optional):
  ```sql
  -- Yêu cầu pg_cron extension enabled
  SELECT cron.schedule(
    'purge-deleted-accounts',
    '0 2 * * *',  -- 2h sáng hàng ngày
    $$DELETE FROM public.profiles
       WHERE deleted_at IS NOT NULL
         AND scheduled_purge_at < now()$$
  );
  ```

**Files**:
- Create: `src/app/[locale]/account-deleted/page.tsx` — read-only explain + "Khôi phục"
- Create: `src/app/[locale]/account-deleted/restore-action.ts` — clear `deleted_at`
- Modify: `src/lib/supabase/middleware.ts` — check `deleted_at` → redirect `/account-deleted`
- Modify: `src/features/auth/actions.ts` — thêm `requestAccountDeletion()`, `restoreAccount()`
- Modify: `src/app/[locale]/(protected)/settings/page.tsx` — thêm button + modal confirm

**Soft delete flow**:
1. User click "Yêu cầu xóa tài khoản"
2. Modal confirm: "Trong 30 ngày bạn có thể đăng nhập lại để khôi phục"
3. Action: set `deleted_at = now()`, `scheduled_purge_at = now() + 30 days`
4. Sign out → redirect `/login`
5. Middleware check: nếu `deleted_at != null` → redirect `/account-deleted`
6. Trang `/account-deleted`: hiển thị "Tài khoản của bạn sẽ bị xóa sau X ngày. Đăng nhập lại để khôi phục."
7. User login → action `restoreAccount()` clear `deleted_at`, redirect `/dashboard`

**Storage cleanup** (đã có ON DELETE CASCADE trên `auth.users`, nhưng bucket objects không cascade tự động):
- Trigger `before delete on auth.users` xóa `storage.objects WHERE bucket_id='receipts' AND (storage.foldername(name))[1] = OLD.id::text`

---

### Phase E — Consent records cho audit trail

**Files**:
- Modify: `src/features/auth/actions.ts` (`signupAction`) — sau khi tạo user, INSERT vào `consent_records`

**Pattern**:
```ts
await supabase.from('consent_records').insert({
  user_id: data.user.id,
  consent_type: 'terms_and_privacy',
  policy_version: 'v1',
  ip_hash: hashIp(request.headers.get('x-forwarded-for')),
});
```

---

## 4. Touchpoints Summary

| Phase | New files | Modified files |
|-------|-----------|----------------|
| A | 4 markdown files, 2 page files | protected layout |
| B | — | schema, signup page, signupAction |
| C | 1 helper | settings actions, settings page |
| D | 2 migrations, 2 page files | middleware, auth actions, settings page |
| E | 1 migration | signupAction |

**Tổng**: 8 new files, 6 modified files, 3 migrations.

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| pg_cron chưa enable | Dùng GitHub Actions / Supabase Edge Function scheduled chạy daily. Manual SQL script backup. |
| Cascade delete miss storage bucket | Trigger `before delete on auth.users` xóa `storage.objects` |
| RLS update có thể break query cũ | Test với dummy user trước khi apply prod |
| User không tick consent (chỉ click submit) | `required` HTML + server-side validation |
| Consent record thiếu IP hash | Optional — chỉ hash, không lưu raw IP |

---

## 6. Acceptance Criteria

- [ ] `/vi/privacy` + `/vi/terms` + `/en/privacy` + `/en/terms` render markdown
- [ ] Footer của protected pages có link Privacy + Terms
- [ ] Signup KHÔNG submit được nếu không tick consent
- [ ] Settings → "Tải xuất dữ liệu" → tải file JSON hợp lệ chứa 6 sections
- [ ] Settings → "Yêu cầu xóa" → modal confirm → sign out → redirect `/account-deleted`
- [ ] Login lại trong 30 ngày → có nút "Khôi phục" → clear `deleted_at` → redirect `/dashboard`
- [ ] Sau 30 ngày cron job chạy, account + cascade data bị xóa
- [ ] `consent_records` có row cho mỗi signup mới

---

## 7. Scope Boundary (OUT of scope)

- ❌ Audit log cho admin (đã chọn bỏ qua round 1)
- ❌ DPIA document tự sinh
- ❌ Breach notification flow
- ❌ pg_cron enable tự động (manual setup)
- ❌ Multi-language ngoài VI/EN

---

## 8. Build Order (Recommended)

1. **Phase A** trước (legal pages — không cần code DB, user xem được ngay)
2. **Phase B** song song với A (consent — block user mới)
3. **Phase D** migrations (cần chạy SQL trước khi dev UI)
4. **Phase C** (export — UI đơn giản, dùng Phase D schema)
5. **Phase E** (consent records — chỉ thêm insert vào signupAction đã có)

---

## 9. Next Step

Handoff qua `/ck:plan --tdd` (recommended) để generate implementation plan với phases A-E, mỗi phase có files to modify + tests + acceptance criteria.