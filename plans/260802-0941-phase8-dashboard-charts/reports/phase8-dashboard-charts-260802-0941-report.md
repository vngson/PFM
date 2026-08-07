# Phase 8 Report — Dashboard charts

**Date**: 2026-08-02 09:41
**Scope**: Recharts cho dashboard — income/expense line, category pie, account balances bar
**Outcome**: ✅ Build pass, dashboard có 3 chart + top 5 ranking

## Deliverables

### 8.1 Recharts

- Install `recharts@^3.10.1` (pnpm add). Hỗ trợ React 19 + Next 16.

### 8.2 Chart data actions

- `src/features/dashboard/chart-actions.ts`:
  - `getMonthlyTrend(monthsBack=12)`: lấy transactions 12 tháng gần nhất, group theo `(currency, month)`, fill missing months với 0. Return `CurrencyTrend[]` (1 trend per currency).
  - `getCategoryBreakdown(month)`: sum(expense) theo category trong tháng, sort desc, tính pct.
  - `getAccountBalances()`: select accounts + current_balance (đã trigger update).

### 8.3 Chart components

- `chart-card.tsx`: wrapper với header + subtitle + badge + neo-brutalism border.
- `monthly-trend-line.tsx`: Recharts LineChart
  - 2 line income (xanh) + expense (đỏ), strokeWidth 2.5, dot 3px
  - Custom tooltip với format VND + label Thu/Chi
  - Y-axis compact format (`k`, `tr`, `t`)
  - CartesianGrid dashed để tạo texture neo-brutalism
- `category-breakdown.tsx`: Recharts PieChart
  - 15-màu palette neo-brutalism
  - innerRadius/outerRadius cho donut style
  - Legend list bên cạnh với icon swatch + pct + amount
  - Show top 8, cộng dồn phần còn lại
- `account-balances-bar.tsx`: custom horizontal bar (không Recharts)
  - Total chip per currency
  - Bar với maxAbs scaling, đỏ cho negative
  - Progress bar 2px border-2 bg-muted để match neo-brutalism

### 8.4 Dashboard integration

- `src/app/(protected)/dashboard/page.tsx`: thêm 4-cell grid trước Quick actions:
  - Top-left: MonthlyTrendLine
  - Top-right: CategoryBreakdown
  - Bottom-left: AccountBalances (filtered archived=false)
  - Bottom-right: Top 5 danh mục tháng này (custom ranking list)
- Parallel fetch thêm `getMonthlyTrend`, `getCategoryBreakdown`, `getAccountBalances` cùng với stat queries.

## Type errors gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| Tooltip `formatter(value: number)` → mismatch | Recharts v3 `value: ValueType \| undefined` | Bỏ type annotation, dùng `Number(value)` runtime |
| Tương tự cho MonthlyTrendLine formatter | Same | Same fix |

## Build verification

```
✓ Compiled successfully in 7.3s
✓ Generating static pages (16/16)
ƒ /dashboard  server-rendered on demand
```

## Decisions

- **Recharts v3** chọn vì declarative + theme-friendly + bundle OK (~100kb gzip). CSS-only chart quá tốn công cho line chart.
- **Custom bar cho account balances**: Recharts BarChart xử lý negative value không đẹp bằng custom render. Custom bar cũng dễ style neo-brutalism.
- **15-màu palette**: chọn từ dải neo-brutalism (đỏ, vàng, xanh, tím, cyan, cam, hồng, xanh lá). Index wrap nếu >15 category.
- **Missing months filled với 0**: giúp line chart liên tục, user thấy được những tháng không có data.
- **Per-currency trend**: multi-currency support. Demo user 1 VND → 1 chart; user nhiều currency → nhiều chart con trong cùng card.
- **Top 5 ranking**: thêm 1 card custom (không dùng Recharts) để ranking dễ đọc + có typography đậm nhẹ rõ ràng.

## Open questions

- Nên cache chart data không? Mỗi page load re-query. Nếu user mở dashboard nhiều lần → tốn query. Phase sau có thể thêm React `cache()` hoặc Next.js `unstable_cache`.
- Click vào segment pie → drill down (vd: xem transactions của category đó)? Hiện chưa có. Có thể thêm với `<Link>` wrap hoặc tooltip onClick.
- Date range picker cho trend (3 tháng / 6 tháng / 12 tháng / custom)? Hiện hardcoded 12.

## Files modified/created

```
+ src/features/dashboard/chart-actions.ts
+ src/features/dashboard/chart-card.tsx
+ src/features/dashboard/monthly-trend-line.tsx
+ src/features/dashboard/category-breakdown.tsx
+ src/features/dashboard/account-balances-bar.tsx
~ src/app/(protected)/dashboard/page.tsx
~ package.json (recharts ^3.10.1)
+ plans/260802-0941-phase8-dashboard-charts/plan.md
+ plans/260802-0941-phase8-dashboard-charts/reports/phase8-dashboard-charts-260802-0941-report.md
```