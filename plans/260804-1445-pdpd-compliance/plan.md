---
title: "VN PDPD Compliance — Personal Finance Manager"
status: pending
priority: P2
scope: local
created: 2026-08-04
source: /run/media/sonvn/DATA/Source/personal-finance-manager/plans/reports/brainstorm-260804-1445-pdpd-compliance-report.md
---

# VN PDPD Compliance Roadmap

## Goal
Đạt **mức tối thiểu hợp pháp** theo Nghị định 13/2023/NĐ-CP (PDPD) cho Personal Finance Manager — app xử lý **dữ liệu tài chính cá nhân** (DLCN nhạy cảm, Điều 2 Khoản 5).

## Success criteria (top-level)
- [ ] `/vi/privacy` + `/vi/terms` + `/en/privacy` + `/en/terms` render markdown
- [ ] Signup KHÔNG submit được nếu không tick consent
- [ ] Settings → Export → tải JSON hợp lệ (6 sections)
- [ ] Settings → Delete → soft delete + grace period 30 ngày + restore được
- [ ] `consent_records` có row cho mỗi signup mới

## Phases

| ID | Title | Priority | Dependencies | Status |
|----|-------|----------|--------------|--------|
| 01 | Privacy & Terms pages | P1 | — | pending |
| 02 | Consent checkbox ở signup | P1 | 01 | pending |
| 03 | Data export endpoint (audit) | P2 | — | pending |
| 04 | Soft delete + 30-day grace period | P2 | 02, 03 | pending |
| 05 | Consent records audit table | P2 | 02 | pending |

**Migrations**:
- `0003_data_export_requests.sql` — audit table cho export
- `0004_soft_delete.sql` — soft delete columns + RLS full lockout + trigger
- `0005_consent_records.sql` — consent audit table
- `0005_rollback_soft_delete.sql` — emergency rollback script

**Build order recommended**: 01 → 02 → 03 → 05 → 04. Phase 04 phụ thuộc 02 vì soft-delete flow cần biết user đã consent lúc nào.

## Out of scope (round 1)
- Admin audit log (đã chọn bỏ qua)
- DPIA document tự sinh
- Breach notification flow
- pg_cron auto-enable
- Multi-language ngoài VI/EN

## Files scope
- **New**: 4 markdown files (`content/privacy/`, `content/terms/`), 2 page files (`/privacy`, `/terms`), 1 helper (`load-legal-doc.ts`), 1 renderer (`markdown-renderer.tsx`), 1 admin client (`supabase/admin.ts`), 1 env validation (`env.ts`), 1 hash helper (`hash-ip.ts`), 1 page mới (`/account-deleted`), 1 restore action file
- **Modify**: ~12 files
  - `signup-form.tsx`, `auth/schema.ts`, `auth/types.ts`, `auth/actions.ts`
  - `settings/actions.ts`, `settings/delete-account-card.tsx`
  - `proxy.ts` (Next.js 16 — không phải middleware.ts)
  - `protected/layout.tsx`, `tailwind.config.ts`, `package.json`
  - `messages/vi.json`, `messages/en.json`
- **Migrations**: 4 files (`0003_data_export_requests`, `0004_soft_delete`, `0005_consent_records`, `0005_rollback_soft_delete`)

## Risk summary
| Risk | Severity | Mitigation |
|------|----------|-----------|
| pg_cron chưa enable | Medium | Manual SQL script + Supabase Edge Function fallback |
| RLS update break query | Medium | Test với dummy user trước khi apply prod |
| Storage bucket không cascade | High | Trigger `before delete on auth.users` xóa `storage.objects` |
| User tick consent nhưng không đọc | Low | Click-wrap chuẩn ngành tài chính VN; version+timestamp lưu ở consent_records |

## Related
- Brainstorm report: `plans/reports/brainstorm-260804-1445-pdpd-compliance-report.md`
- Existing plans: `/plans/260801-1853-pfm-phase2-accounts-categories` (independent)