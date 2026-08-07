---
phase: 03
title: "Data Export Endpoint (Audit Metadata)"
status: pending
priority: P2
dependencies: []
---

# Phase 03: Data Export Endpoint (Audit Metadata)

## Overview
Endpoint `/settings` → "Export" đã có sẵn (`export-data-card.tsx` + `exportAllData` trong `settings/actions.ts`). Phase này bổ sung **audit metadata** vào payload + **file size guard** + **schema versioning** để đáp ứng đầy đủ GDPR data portability + audit trail.

## Requirements
- **Functional**:
  - Export payload include `schema_version`, `app_version`, `user_consent` (latest version user agreed)
  - Rate limit: 1 export / hour / user (chống abuse)
  - Log mỗi lần export vào `data_export_requests` table
- **Non-functional**:
  - JSON UTF-8 encoded
  - Filename: `pfm-export-{YYYY-MM-DD}-{user_id_short}.json`
  - Max 5MB (chống leak huge data) — fail nếu > 5MB

## Architecture

```
ExportDataCard (client) → exportAllData()
  ↓
exportAllData (server action)
  ├─ getUser
  ├─ Check rate limit (data_export_requests WHERE created_at > now() - 1 hour)
  ├─ Fetch all 6 tables parallel
  ├─ Build payload { schema_version, app_version, exported_at, user, data }
  ├─ INSERT data_export_requests (user_id, ip_hash, byte_size)
  └─ Return payload
```

## Related Code Files
- Create: `supabase/migrations/0003_data_export_requests.sql` (table + RLS)
- Modify: `src/features/settings/actions.ts` (`exportAllData` rewrite + update `ExportPayload` interface to include `byte_size`)
- Modify: `src/lib/export/payload-builder.ts` (new helper, testable pure function)
- Modify: `src/features/settings/export-data-card.tsx` (filename pattern update)
- Run: `supabase gen types typescript --local` (regenerate types after migration)

## Implementation Steps

1. **Migration 0003** (`supabase/migrations/0003_data_export_requests.sql`):
   ```sql
   create table public.data_export_requests (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     requested_at timestamptz not null default now(),
     byte_size int,
     status text not null default 'success',
     ip_hash text,
     user_agent text
   );
   create index data_export_requests_user_idx
     on public.data_export_requests (user_id, requested_at desc);

   alter table public.data_export_requests enable row level security;
   create policy "data_export_select_own" on public.data_export_requests
     for select using (auth.uid() = user_id);
   create policy "data_export_insert_own" on public.data_export_requests
     for insert with check (auth.uid() = user_id);
   ```

2. **Update `ExportPayload` interface** trong `src/features/settings/actions.ts` — thêm `byte_size`:
   ```ts
   export interface ExportPayload {
     schema_version: string;
     app_version: string;
     exported_at: string;
     byte_size: number; // ADD THIS
     user: { id: string; email: string };
     profile: Profile | null;
     accounts: Account[];
     categories: Category[];
     transactions: Transaction[];
     recurring: Recurring[];
     budgets: Budget[];
   }
   ```

3. **Pure helper** (testable):
   ```ts
   // src/lib/export/payload-builder.ts
   import type { ExportPayload } from '@/features/settings/actions';

   export const EXPORT_SCHEMA_VERSION = '1.0';
   export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
   export const MAX_EXPORT_BYTES = 5 * 1024 * 1024; // 5MB

   export function buildExportPayload(
     userId: string,
     email: string,
     data: Omit<ExportPayload, 'exported_at' | 'schema_version' | 'app_version' | 'byte_size'>,
   ): ExportPayload {
     const partial = {
       schema_version: EXPORT_SCHEMA_VERSION,
       app_version: APP_VERSION,
       exported_at: new Date().toISOString(),
       user: { id: userId, email },
       ...data,
     };
     const bytes = new TextEncoder().encode(JSON.stringify(partial)).length;
     if (bytes > MAX_EXPORT_BYTES) {
       throw new Error(`Export exceeds 5MB limit (${bytes} bytes)`);
     }
     return { ...partial, byte_size: bytes };
   }
   ```

4. **Modify `exportAllData`**:
   ```ts
   export async function exportAllData(): Promise<ExportPayload | null> {
     const { supabase, user } = await requireUser();

     // Rate limit: 1 export / hour
     const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
     const { count: recentCount } = await supabase
       .from('data_export_requests')
       .select('*', { count: 'exact', head: true })
       .eq('user_id', user.id)
       .gte('requested_at', oneHourAgo);

     if ((recentCount ?? 0) >= 1) {
       throw new Error(m.settings_export_rate_limit());
     }

     const [profile, accounts, categories, transactions, recurring, budgets] =
       await Promise.all([...]); // giữ nguyên code hiện tại

     const payload = buildExportPayload(
       user.id,
       user.email ?? '',
       {
         profile: profile.data,
         accounts: accounts.data ?? [],
         categories: categories.data ?? [],
         transactions: transactions.data ?? [],
         recurring: recurring.data ?? [],
         budgets: budgets.data ?? [],
       },
     );

     await supabase.from('data_export_requests').insert({
       user_id: user.id,
       byte_size: (payload as { byte_size: number }).byte_size,
       status: 'success',
     });

     return payload;
   }
   ```

5. **Update filename** trong `export-data-card.tsx`:
   ```ts
   const userIdShort = user?.id.slice(0, 8) ?? 'unknown';
   a.download = `pfm-export-${new Date().toISOString().slice(0, 10)}-${userIdShort}.json`;
   ```

6. **Thêm messages**:
   - `settings_export_rate_limit`: "Bạn đã xuất dữ liệu trong 1 giờ qua. Vui lòng thử lại sau."

7. **Vitest rate limit test** (pure, no Supabase mock):
   ```ts
   // src/lib/export/payload-builder.test.ts — bổ sung
   describe('rate limit logic', () => {
     it('allows when no recent requests', () => {
       const recent: { requested_at: string }[] = [];
       expect(shouldRateLimit(recent, Date.now())).toBe(false);
     });

     it('blocks when 1+ request in last hour', () => {
       const recent = [{ requested_at: new Date().toISOString() }];
       expect(shouldRateLimit(recent, Date.now())).toBe(true);
     });

     it('allows after 1 hour passes', () => {
       const oldTimestamp = new Date(Date.now() - 61 * 60 * 1000).toISOString();
       const recent = [{ requested_at: oldTimestamp }];
       expect(shouldRateLimit(recent, Date.now())).toBe(false);
     });
   });
   ```
   Extract `shouldRateLimit` thành pure function:
   ```ts
   export function shouldRateLimit(
     recentRequests: { requested_at: string }[],
     now: number,
     windowMs = 60 * 60 * 1000,
   ): boolean {
     return recentRequests.some(
       (r) => now - new Date(r.requested_at).getTime() < windowMs,
     );
   }
   ```

## Tests (TDD)

### Test 1: payload builder pure
```ts
// src/lib/export/payload-builder.test.ts
import { describe, it, expect } from 'vitest';
import { buildExportPayload, MAX_EXPORT_BYTES } from './payload-builder';

describe('buildExportPayload', () => {
  it('includes schema_version, app_version, exported_at', () => {
    const p = buildExportPayload('user-1', 'a@b.com', {
      profile: { id: 'user-1' },
      accounts: [],
      categories: [],
      transactions: [],
      recurring: [],
      budgets: [],
    });
    expect(p.schema_version).toBe('1.0');
    expect(p.app_version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(p.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes user info', () => {
    const p = buildExportPayload('user-1', 'a@b.com', {
      profile: null, accounts: [], categories: [], transactions: [], recurring: [], budgets: [],
    });
    expect(p.user).toEqual({ id: 'user-1', email: 'a@b.com' });
  });

  it('throws when exceeds 5MB', () => {
    const huge = 'x'.repeat(MAX_EXPORT_BYTES + 1);
    expect(() => buildExportPayload('u', 'e', {
      profile: null, accounts: [], categories: [],
      transactions: [], recurring: [],
      budgets: [{ id: 'b', note: huge }] as unknown[],
    })).toThrow(/exceeds 5MB/);
  });
});
```

### Test 2: rate limit logic (manual integration test)
- Login user → export → ngay lập tức export lần 2 → bị reject với message rate limit
- Đợi 1 giờ (hoặc mock time) → export OK

### Test 3: audit row exists
Manual:
- Sau khi export, query `data_export_requests` table trong Supabase Dashboard → có 1 row mới với `user_id` đúng

## Success Criteria
- [ ] `pnpm vitest run` → tests pass (3 test cases cho payload builder)
- [ ] `pnpm build` → build OK
- [ ] `pnpm tsc --noEmit` → clean
- [ ] Export payload có đủ `schema_version`, `app_version`, `exported_at`, `user`
- [ ] Export lần 2 trong 1 giờ → bị reject
- [ ] Export thành công → có row trong `data_export_requests`
- [ ] File export > 5MB → throw error (giả lập với data lớn)

## Risk Assessment
- **Risk**: Service role key không có sẵn ở local → SQL chạy manual
  - **Mitigation**: Doc rõ ràng user chạy qua Supabase SQL Editor
- **Risk**: Rate limit dùng `data_export_requests` count — user có thể spam table inserts với status=failed
  - **Mitigation**: Count cả success + failed; cleanup cron optional
- **Risk**: `byte_size` field có trong payload nhưng TypeScript không declare → cast ép
  - **Mitigation**: Update `ExportPayload` interface trong `actions.ts`