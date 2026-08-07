---
phase: 05
title: "Consent Records Audit Table"
status: pending
priority: P2
dependencies: [02]
---

# Phase 05: Consent Records Audit Table

## Overview
Lưu **consent record** cho mỗi lần user đồng ý (signup + future privacy/terms updates). Đáp ứng **Điều 9 + Điều 11 PDPD**: chứng minh được user đã đồng ý với policy version nào, khi nào, với IP hash nào.

## Requirements
- **Functional**:
  - `consent_records` table lưu: `user_id`, `consent_type`, `policy_version`, `granted_at`, `ip_hash`, `user_agent`
  - Auto insert vào `consent_records` ngay sau khi signup thành công
  - Unique constraint `(user_id, consent_type, policy_version)` để không duplicate
  - Khi user update privacy policy version → insert row mới (không update row cũ)
- **Non-functional**:
  - RLS: user chỉ SELECT được row của mình
  - No DELETE policy (immutable audit trail)
  - IP hash bằng SHA-256 (không lưu raw IP — PDPD Điều 6 về tối thiểu hóa)

## Architecture

```
signupAction (src/features/auth/actions.ts)
  ├─ Create user via supabase.auth.signUp
  ├─ hashIp(request.headers.get('x-forwarded-for'))
  ├─ INSERT consent_records (terms_and_privacy, v1)
  └─ Return success

PrivacyPolicy update flow (future):
  User clicks "Tôi đồng ý với policy mới" ở /privacy page
  → consentAction (new) → INSERT consent_records (terms_and_privacy, v2)
```

## Related Code Files
- Create: `supabase/migrations/0005_consent_records.sql` (renumbered từ 0008)
- Modify: `src/features/auth/actions.ts` (`signupAction` — insert consent row)
- Modify: `src/lib/supabase/admin.ts` (Create mới — `import 'server-only'` ở đầu file)
- Modify: `src/lib/env.ts` (Create mới — validate `SUPABASE_SERVICE_ROLE_KEY`)
- Modify: `src/features/auth/signup-form.tsx` (pass user agent + accept hidden field for locale version)
- Modify: `src/lib/auth/hash-ip.ts` (new helper for SHA-256 IP hash)
- Modify: `src/messages/{vi,en}.json` (nếu cần thêm label "Đã đồng ý v1 lúc 04/08/2026")

## Implementation Steps

1. **Migration 0005** (`supabase/migrations/0005_consent_records.sql`):
   ```sql
   create table public.consent_records (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     consent_type text not null check (
       consent_type in ('terms_and_privacy', 'marketing_emails', 'analytics_tracking')
     ),
     policy_version text not null,
     granted_at timestamptz not null default now(),
     ip_hash text,
     user_agent text,
     unique (user_id, consent_type, policy_version)
   );

   create index consent_records_user_idx
     on public.consent_records (user_id, granted_at desc);

   alter table public.consent_records enable row level security;

   create policy "consent_select_own" on public.consent_records
     for select using (auth.uid() = user_id);

   -- No INSERT/UPDATE/DELETE policy: only service_role can write
   -- (chúng ta insert từ server action với service_role client)
   ```

2. **Helper `hashIp`**:
   ```ts
   // src/lib/auth/hash-ip.ts
   import { createHash } from 'node:crypto';

   export function hashIp(ip: string | null): string | null {
     if (!ip) return null;
     // Normalize: first IP from comma-separated list (x-forwarded-for)
     const first = ip.split(',')[0]?.trim();
     if (!first) return null;
     return createHash('sha256').update(first).digest('hex');
   }
   ```

3. **Modify `signupAction`**:
   ```ts
   export async function signupAction(
     prev: FormState | null,
     formData: FormData,
   ): Promise<FormState> {
     'use server';

     // ... existing validation, create user ...

     const { data, error } = await supabase.auth.signUp({...});
     if (error) return { error: m.auth_signup_failed() };
     if (!data.user) return { error: m.auth_signup_failed() };

     // Insert consent record using service_role client
     const adminClient = createAdminClient();
     const ipHash = hashIp(headers().get('x-forwarded-for'));
     const userAgent = headers().get('user-agent');

     const { error: consentError } = await adminClient
       .from('consent_records')
       .insert({
         user_id: data.user.id,
         consent_type: 'terms_and_privacy',
         policy_version: 'v1',
         ip_hash: ipHash,
         user_agent: userAgent?.slice(0, 500) ?? null,
       });

     if (consentError) {
       // PDPD audit — không silent fail. Log error với context.
       // Acceptable: log + Sentry alert. User signup vẫn pass vì consent
       // đã được user click ở client; chỉ audit row bị miss.
       Sentry.captureException(consentError, {
         tags: { feature: 'consent_record_insert' },
         extra: { userId: data.user.id },
       });
     }

     return { success: true };
   }
   ```

4. **Tạo `createAdminClient`** — PHẢI có `import 'server-only'`:
   ```ts
   // src/lib/supabase/admin.ts
   import 'server-only';
   import { createClient } from '@supabase/supabase-js';
   import { env } from '@/lib/env';

   export function createAdminClient() {
     if (!env.SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error(
         'SUPABASE_SERVICE_ROLE_KEY required for admin client. Check .env.local.',
       );
     }
     return createClient(
       env.NEXT_PUBLIC_SUPABASE_URL,
       env.SUPABASE_SERVICE_ROLE_KEY,
       { auth: { persistSession: false, autoRefreshToken: false } },
     );
   }
   ```
   `import 'server-only'` đảm bảo build sẽ fail nếu file bị bundle vào client.

5. **Tạo `src/lib/env.ts`** — centralized env validation:
   ```ts
   import { z } from 'zod';

   const schema = z.object({
     NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
     NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
     SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
   });

   export const env = schema.parse({
     NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
     NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
     SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
   });
   ```

   Add `.env.example`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-dashboard
   ```

6. **Test helper pure**:
   ```ts
   // src/lib/auth/hash-ip.test.ts
   import { describe, it, expect } from 'vitest';
   import { hashIp } from './hash-ip';

   describe('hashIp', () => {
     it('returns null for null input', () => {
       expect(hashIp(null)).toBe(null);
     });

     it('returns SHA-256 hex for single IP', () => {
       const hash = hashIp('192.168.1.1');
       expect(hash).toMatch(/^[a-f0-9]{64}$/);
     });

     it('takes first IP from comma-separated list', () => {
       const hash1 = hashIp('203.0.113.1, 10.0.0.1');
       const hash2 = hashIp('203.0.113.1');
       expect(hash1).toBe(hash2);
     });

     it('returns null for empty string', () => {
       expect(hashIp('')).toBe(null);
     });
   });
   ```

## Tests (TDD)

### Test 1: hashIp pure (4 cases)
- null → null
- single IP → 64-char hex
- comma-separated → first IP only
- empty → null

### Test 2: signup inserts consent row
Manual:
1. Signup user mới qua `/vi/signup` với consent ticked
2. Check Supabase Dashboard → `consent_records` table
3. Expected: 1 row với `user_id` đúng, `consent_type='terms_and_privacy'`, `policy_version='v1'`, `ip_hash` 64 chars, `granted_at` ≈ now

### Test 3: unique constraint
```ts
// src/features/auth/actions.test.ts — vitest với mocked admin client
import { vi } from 'vitest';

it('signup handles duplicate consent (23505) gracefully', async () => {
  vi.mocked(createAdminClient).mockReturnValue({
    from: () => ({
      insert: () => Promise.resolve({
        error: { code: '23505', message: 'duplicate key' },
      }),
    }),
  } as any);

  // Run signupAction
  const result = await signupAction(null, mockFormData);
  expect(result.success).toBe(true); // không crash signup
});
```

### Test 4: RLS isolation
Manual:
1. User A đăng nhập → SELECT consent_records → thấy row của A
2. User B đăng nhập → SELECT consent_records → không thấy row của A

## Success Criteria
- [ ] Migration 0008 chạy thành công
- [ ] `pnpm vitest run` → hashIp tests pass (4 cases)
- [ ] `pnpm build` → build OK
- [ ] `pnpm tsc --noEmit` → clean
- [ ] Signup mới → có row trong `consent_records`
- [ ] Row có `ip_hash` 64 chars (SHA-256 hex)
- [ ] Row có `user_agent` (max 500 chars)
- [ ] User chỉ SELECT được row của mình (RLS)
- [ ] Duplicate insert (cùng version) bị reject bởi unique constraint

## Risk Assessment
- **Risk**: Service role key leak nếu accidentally bundle vào client
  - **Mitigation**: `createAdminClient` chỉ import trong server action files (marked `'use server'`)
- **Risk**: IP hash có thể bị reverse nếu attacker biết user gần đó (small set)
  - **Mitigation**: Acceptable trade-off — GDPR cũng cho phép pseudonymization
- **Risk**: User agent quá dài → DB column overflow
  - **Mitigation**: `.slice(0, 500)` giới hạn
- **Risk**: Consent insert fail không block signup (silent failure)
  - **Mitigation**: Log error, alert qua Sentry; check daily job verify consent_records count = users count
- **Risk**: Migration apply trên production khi có users cũ chưa có consent
  - **Mitigation**: Backfill script optional — Phase 05 chỉ cho user mới

## Out of scope
- ❌ UI hiển thị "Bạn đã đồng ý vào lúc nào" (chỉ cần lưu audit, không cần UX)
- ❌ Backfill consent_records cho users cũ
- ❌ Marketing email consent (chưa có tính năng email)
- ❌ Analytics tracking consent (không dùng analytics tool)