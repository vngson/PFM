# Neo-brutalism Restyle — Report

**Date:** 2026-08-01
**Status:** DONE
**Build:** ✓ PASS (12 routes, 0 errors)

## Tóm tắt

Restyle toàn bộ app theo Neo-brutalism: hard borders đen, shadow offset cứng (không blur), không radius, font đậm uppercase, accent yellow + violet + red + green. Tokens centralize trong `globals.css`; primitives restyle tại `components/ui/*` — mọi page tự động kế thừa.

## Phases đã xong

| # | Phase | Status |
|---|-------|--------|
| 1 | Tokens + Google Font | DONE |
| 2 | Restyle 12 primitives | DONE |
| 3 | Auth pages (login/signup/check-email/error) | DONE |
| 4 | Dashboard + Nav | DONE |
| 5 | Transactions | DEFER — chưa có feature (chưa xây) |
| 6 | Accounts + Categories + Pickers | DONE |

## Tokens (`src/app/globals.css`)

- **Palette** light: ivory `#f5f1e8` bg, pure black `#000` border/foreground, accent yellow `#f5d547`, accent red `#ff4d4d`, accent violet `#9b7ede`, accent green `#7fb069`, accent orange `#ff8c42`.
- **Radius**: `--radius*` = 0 (square edges).
- **Shadow tokens mới**: `--shadow-brutal-sm` (4px 4px 0 #000), `--shadow-brutal` (6px 6px 0 #000), `--shadow-brutal-lg` (8px 8px 0 #000). Expose qua `@theme inline` → `shadow-brutal-sm` etc.
- **Semantic tokens mới**: `--success`, `--warning`, `--income`, `--expense`.
- **Body bg**: dotted pattern (`radial-gradient`) cho neo-brutalism texture.
- **Heading mặc định**: Archivo Black (Google Font), letter-spacing −0.02em.
- **Body**: Space Grotesk (Google Font).
- **Selection**: yellow highlight.
- **Motion**: `animate-brutal-shake` keyframes cho form error (login/signup dùng).

## Primitives restyled

| File | Đổi |
|---|---|
| `button.tsx` | border-2 đen, `shadow-brutal-sm` mặc định, hover `translate -2 -2 + shadow-brutal` (nhấn xuống). 7 variants: default, outline, secondary, ghost, destructive, link, success. |
| `input.tsx` | border-2 đen, h-10 (touch friendly), focus `translate -2 -2 + shadow-brutal-sm`. |
| `card.tsx` | border-2 đen, `shadow-brutal-sm`, no radius. |
| `badge.tsx` | border-2 đen, no radius, font-heading uppercase. 9 variants: default, secondary, destructive, outline, ghost, link, success, warning, expense, income. |
| `label.tsx` | uppercase, tracking-wide, font-heading. |
| `dialog.tsx` | border-4 đen, `shadow-brutal-lg`, padding rộng. |
| `dropdown-menu.tsx` | border-2 đen, `shadow-brutal`, items focus `bg-secondary`. |
| `select.tsx` | border-2 đen, uppercase trigger, focus `translate + shadow-brutal-sm`. |
| `table.tsx` | bordered container `shadow-brutal-sm`, header `bg-secondary/40 uppercase`. |
| `separator.tsx` | h-0.5 (dày hơn, không phải 1px). |
| `alert.tsx` | border-2 đen, `shadow-brutal-sm`, 4 variants: default, destructive, success, warning. |
| `alert-dialog.tsx` | border-4 đen, `shadow-brutal-lg`. |

## Auth pages (`app/(auth)/*`)

- `layout.tsx`: nền pattern dotted + 4 sticker decorations (yellow/violet/green/orange khối xoay góc). Form card centered.
- `login-form.tsx` + `signup-form.tsx`:
  - Card title font-heading 3xl uppercase ("ĐĂNG NHẬP").
  - Brand chip nhỏ `bg-secondary` ở đầu.
  - Field errors hiển thị `⚠` prefix, font-heading đỏ đậm uppercase.
  - Form dùng `useEffect` + `animate-brutal-shake` khi server trả về error → micro-motion.
  - Submit button full-width size-lg "ĐĂNG NHẬP" / "TẠO TÀI KHOẢN".
- `check-email` + `error`: icon trong bordered box (green/destructive), title uppercase.

## Dashboard + Nav

- `nav-links.tsx`: border-2 + `shadow-brutal-sm` mỗi link, active `bg-secondary`, hover `bg-secondary/40`.
- `(protected)/layout.tsx`: header `border-b-4 bg-card shadow-brutal` với logo 💰 MONEY uppercase + nav.
- `(protected)/dashboard/page.tsx`:
  - Page header có chip `bg-secondary` "Hôm nay" + heading 4xl uppercase.
  - 3 stat cards: border-2 đen + `shadow-brutal` + colored icon box vuông. Số tiền font-heading 3xl/4xl bold.
  - Empty state có sticker icon box.
  - Placeholder card "Thu chi tháng này" border dashed.
  - Quick actions: 4 link, hover lift `-2 -2` + shadow upgrade.

## Accounts page (`/accounts`)

- Page header: bordered chip + heading 4xl.
- Total chip (theo currency) mỗi cái `border-2 shadow-brutal-sm` với label uppercase + số tiền đậm.
- AccountList:
  - Icon box vuông `size-10 border-2` (thay vì rounded-md).
  - Tên tài khoản `font-heading uppercase`.
  - Số dư `font-heading font-bold` (thay vì font-mono).
  - Dropdown border-2 + shadow-brutal.
- AccountForm: color swatches vuông border-2 (không rounded-full), icon grid sticker style (rotate + scale khi chọn).

## Categories page (`/categories`)

- Page header: accent violet chip.
- CategoryList:
  - Group label + icon box vuông sticker.
  - Badge variant `income` (green) / `expense` (red) thay vì secondary.
  - Card mỗi category: border-2 + `shadow-brutal-sm`, hover lift.
  - Icon box vuông `size-10` với `border-2 border-border` (sticker style).
  - Nút xóa lộ ngay (variant `destructive`) thay vì ghost ẩn.
- CategoryForm (icon-picker): 
  - Color swatches vuông (giống account-form).
  - Icon grid cell mỗi cái `border-2`, khi chọn → `border-foreground bg-foreground text-background rotate-[-3deg] scale-110 shadow-brutal-sm` (sticker effect y hệt design system yêu cầu).
  - Search input có icon Search prefix.

## Build output

```
Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /accounts
├ ƒ /auth/callback
├ ƒ /categories
├ ƒ /check-email
├ ƒ /dashboard
├ ƒ /error
├ ○ /login
└ ○ /signup
```

## Issues gặp + fix

| Vấn đề | Fix |
|--------|-----|
| `rounded-none` ở size icon `size-9` không đủ rõ sticker effect | Đổi size swatch thành `size-8` (button variant) và áp rotate/scale ở state selected |
| Badge variant `expense`/`income` dùng tên custom | Thêm vào `badgeVariants` cva để type-safe |
| Sonner toast chưa restyle | DEFER — chưa dùng toast nào; sẽ làm khi cần ở Phase 5 |
| Heading font weight | Archivo Black chỉ có weight 400 — dùng `font-bold` riêng cho Button/Label |

## Known trade-offs

1. **Dark theme**: token `--border` và shadow đổi sang trắng, nhưng chưa test visual dark mode trong browser — chỉ verify CSS hợp lệ.
2. **Recharts color tokens**: đã map chart-1..5 theo palette, nhưng chưa có dashboard chart thật (Phase 5).
3. **Font loading FOUT**: dùng `next/font/google` nên tối đa vài trăm ms; acceptable.
4. **Form errors hiện `⚠` emoji trước text**: dùng emoji cho brutal feel, có thể đổi sang lucide AlertTriangle nếu thấy không hợp.
5. **RHF đã bỏ ở Phase 1** — không regress vì primitives mới không cần.
6. **Storage `receipts` bucket**: khai báo ở Phase 1 — Phase 5 form transactions sẽ dùng lại.

## Bước tiếp theo

1. **Test visual browser**: login lại (sau khi chạy migrations Supabase), chụp 4 màn hình (login, dashboard, accounts, categories).
2. **Phase 5 (Transactions)**: khi bạn xây `features/transactions/{schema,actions,form,list}`, tôi sẽ restyle ngay trong quá trình — primitive đã có sẵn nên chỉ là build transaction-row sticker + income/expense badge theo token `income`/`expense` đã thêm ở report này.
3. **Phase 6 còn lại (Budgets)**: khi xây features mới, áp cùng pattern primitives.
