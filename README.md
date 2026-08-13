# Personal Finance Manager

> Quản lý tài chính cá nhân — multi-currency, multi-locale, neo-brutalism UI.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-SSR-3ecf8e)](https://supabase.com)
[![Paraglide](https://img.shields.io/badge/Paraglide-i18n-2bd0bb)](https://inlang.com)
[![pnpm](https://img.shields.io/badge/pnpm-11-f69220)](https://pnpm.io)

## ✨ Features

- 📊 **Dashboard** — 3 chart streaming (12-month trend, category breakdown, account balances) + stat cards + quick actions
- 💸 **Transactions** — ghi nhanh qua FAB hoặc full form, filter theo tháng / loại / note, pagination + CSV export
- 🏦 **Accounts** — nhiều tài khoản, nhiều currency, archive / restore, current_balance tự cập nhật qua trigger
- 🏷️ **Categories** — icon + color catalog, seed default categories khi signup, soft validation
- 🎯 **Budgets** — monthly limit per category, progress bar + exceeded state
- 🔁 **Recurring** — daily / weekly / monthly / yearly rules, calendar view, auto-generate transactions đến hạn
- 🔍 **Command palette** — search toàn app (Cmd/Ctrl + K)
- 🌍 **i18n song ngữ** — `vi` (base) + `en`, URL strategy `/en/*`, paraglide v2
- 🎨 **Neo-brutalism UI** — bold borders + hard shadows + offset transforms
- 🌓 **Dark mode** — 3-state toggle (light / dark / system) qua `next-themes`
- 🔐 **Auth** — Supabase email/password, email confirmation, session refresh qua SSR
- 🛡️ **PDPD-compliant** — soft delete 30 ngày grace period, data export + audit log, consent records
- 📱 **Responsive** — desktop header + mobile bottom nav + FAB, neo-brutalism giữ trên mọi breakpoint

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, RSC) |
| Language | TypeScript 5 (strict) |
| UI | React 19 + `@base-ui/react` + Tailwind 4 |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| ORM/Client | `@supabase/ssr` cho RSC, server actions, route handlers |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| i18n | Paraglide v2 (`@inlang/paraglide-js`) — URL + globalVariable + cookie + baseLocale strategy |
| Tests | Vitest |
| Lint | ESLint + `eslint-config-next` |

## 📦 Project Structure

```
src/
├── app/                       # Next.js App Router
│   ├── [locale]/              # Locale segment (vi | en)
│   │   ├── (auth)/            # login, signup, check-email, error
│   │   ├── (protected)/       # dashboard, transactions, accounts, categories, budgets, recurring, settings
│   │   ├── (public)/          # privacy, terms
│   │   ├── account-deleted/   # PDPD soft-delete countdown + restore
│   │   └── auth/callback/     # email confirmation route handler
│   └── globals.css            # Tailwind + design tokens (neo-brutalism)
├── components/                # Shared, không gắn feature cụ thể
│   ├── a11y/ branding/ i18n/ legal/ theme/ ui/
├── features/                  # Vertical slices — mỗi feature = tên miền
│   ├── accounts/ auth/ budgets/ categories/ dashboard/
│   ├── export/ onboarding/ recurring/ search/ settings/ transactions/
│   └── (mỗi folder: actions.ts, schema.ts, các *.tsx component)
├── lib/                       # Pure helpers + infra
│   ├── auth/ env/ export/ hooks/ i18n/ markdown/ supabase/
│   ├── account-deleted/ countdown.ts
│   ├── format.ts fx.ts toast.ts utils.ts
├── paraglide/                 # Generated i18n runtime (DO NOT EDIT)
│   ├── messages/              # 1 file JS per message
│   ├── messages.js runtime.js
└── types/                     # Supabase generated types

messages/                      # Source of truth cho paraglide (en.json + vi.json)
scripts/                       # paraglide compile + Turbopack runtime patch
content/                       # Legal markdown (privacy/, terms/) — vi + en
supabase/
├── migrations/                # 0001..0005 SQL migrations
└── seed.sql                   # Demo data (idempotent)
plans/ docs/                   # Project planning + docs
```

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js 20+**
- **pnpm 11+** (`npm i -g pnpm`)
- **Supabase account** — tạo project tại [supabase.com](https://supabase.com)

### 2. Install

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Mở `.env` và điền giá trị thật từ Supabase Dashboard → Project Settings → API:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # chỉ server-side, KHÔNG commit
NEXT_PUBLIC_SITE_URL=http://localhost:3456     # production: https://your-domain.com
```

### 4. Apply Supabase migrations + seed

Vào **Supabase Dashboard → SQL Editor**, chạy theo thứ tự:

1. `supabase/migrations/0001_init_schema.sql` — tables + RLS + triggers
2. `supabase/migrations/0002_seed_default_categories.sql` — helper function
3. `supabase/migrations/0003_data_export_requests.sql`
4. `supabase/migrations/0004_soft_delete.sql`
5. `supabase/migrations/0005_consent_records.sql`
6. (Optional) `supabase/seed.sql` — demo data với user `demo@example.com` / `DemoPassword123!`

Chi tiết xem [supabase/README.md](./supabase/README.md).

### 5. Configure Supabase Dashboard (OTP email template)

> **⚠ Bắt buộc với signup flow mới (OTP 8 ký tự).** Bỏ qua bước này thì email sẽ chứa link "Confirm signup" thay vì mã OTP, user bấm vào sẽ thấy `access_denied / otp_expired` thay vì mã 8 ký tự.

Vào **Supabase Dashboard → Authentication → Sign In/Up → Email** (hoặc **Templates**):

1. **Site URL** đặt về `http://localhost:3456` (dev) hoặc domain production. Không bao gồm path — Supabase append `/{locale}/auth/callback` cho email link.
2. **Redirect URLs** thêm đầy đủ:
   - `http://localhost:3456`
   - `http://localhost:3456/*` (wildcard cho mọi path)
   - Domain production tương ứng.
3. **Email template cho OTP 8 ký tự**: Vào **Email Templates**, tạo 1 custom template mới với subject `Your sign-in code` (hoặc đặt lại "Magic Link" template thành OTP variant). Đặt `{{ .ConfirmationURL }}` thành `{{ .Token }}` để gửi OTP thay vì link.
4. **Bật "Email OTP" provider** trong **Providers → Email** — bật cả "Confirm email" và "Magic Link" để cover cả 2 flow.

**Verify sau khi config:** Đăng ký email test → nhận được mã 8 ký tự alphanumeric (a-z0-9) trong email (không phải link). Nếu vẫn nhận được link → check lại **Site URL** + **Redirect URLs** (phải bao gồm `http://localhost:3456` đúng cổng mà dev server đang chạy).

### 6. Run

```bash
pnpm dev
```

Mở [http://localhost:3456](http://localhost:3456) → tự redirect về `/vi/login` hoặc `/en/login` theo URL strategy.

## 🧪 Scripts

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` | Dev server với hot reload — port `3456` |
| `pnpm build` | Production build (auto chạy `prebuild` để compile paraglide) |
| `pnpm start` | Serve production build — port `3456` |
| `pnpm lint` | ESLint (next/core-web-vitals + typescript) |
| `pnpm test` | Vitest run (36 tests ở `src/**/*.test.ts`) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm paraglide:compile` | Re-generate `src/paraglide/` từ `messages/*.json` |

> **Tip:** Sau khi sửa message trong `messages/en.json` hoặc `messages/vi.json`, luôn chạy `pnpm paraglide:compile` để regenerate runtime trước khi build/test.

## 🌐 Internationalization

- **Source of truth:** `messages/en.json` + `messages/vi.json` (Paraglide v2 message format)
- **URL strategy:** `vi` (base) không cần prefix → `/dashboard`; `en` thêm prefix `/en/dashboard`
- **Strategy:** `['url', 'globalVariable', 'cookie', 'baseLocale']` — defined trong `scripts/paraglide-compile.mjs`
- **Patch:** `scripts/patch-paraglide-runtime.mjs` đảm bảo runtime state share giữa Turbopack chunks

Thêm locale mới:
1. Edit `project.inlang/settings.json` — thêm vào `locales`
2. Tạo `messages/<locale>.json`
3. `pnpm paraglide:compile`

## 🛡️ PDPD Compliance

App tuân thủ **Nghị định 13/2023/NĐ-CP** (Personal Data Protection Decree):

- ✅ **Consent records** — ghi audit row lúc signup (immutable, service role)
- ✅ **Soft delete** — user xóa account giữ data 30 ngày, có thể khôi phục qua `/account-deleted`
- ✅ **Data export** — `/settings` cho phép download toàn bộ data (JSON, schema_versioned, rate limit 1/h)
- ✅ **IP hash logging** — SHA-256 hash IP cho audit, không lưu raw
- ✅ **Locale-aware legal docs** — `content/privacy/{vi,en}.md` + `content/terms/{vi,en}.md`

## 🧩 Conventions

- **Vertical slice:** mỗi feature trong `src/features/<name>/` tự chứa `actions.ts`, `schema.ts`, components
- **Server vs Client:** default là Server Component; thêm `"use client"` chỉ khi cần state / effects / event handlers
- **Forms:** mọi form validate qua Zod schema ở `features/<name>/schema.ts`, factory nhận `t(translator)` để error messages theo locale
- **Server Actions:** đặt trong `actions.ts`, return `{ error?, fieldErrors?, success? }` để `useDialogFormState` xử lý
- **i18n trong code:** chỉ dùng `m.some_key()` từ `@/paraglide/messages` — không hardcode UI text
- **Không magic numbers:** constants + named config trong module-scope
- **Comments:** giải thích invariant / hành vi, không gắn plan id / phase number

## 🤝 Contributing

1. Fork + tạo branch (`git checkout -b feat/your-feature`)
2. Code theo conventions ở trên
3. Chạy `pnpm lint && pnpm test && pnpm build` trước khi commit
4. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
5. Push + mở PR — describe change + test plan + screenshots nếu có UI

## 📄 License

UNLICENSED — private project.
