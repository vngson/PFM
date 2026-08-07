# Phase 8 — Dashboard charts (Recharts)

**Status**: COMPLETED
**Started**: 2026-08-02 09:41
**Plan dir**: `plans/260802-0941-phase8-dashboard-charts/`

## Goal

Thêm 3 chart visualizations vào dashboard để user có cái nhìn tổng quan về tài chính:
1. **Income vs Expense trend** — line chart 12 tháng gần nhất, 2 line thu/chi
2. **Spending by category** — pie chart + legend list tháng hiện tại
3. **Account balances** — horizontal bar số dư các account

## Approach

Dùng **Recharts** (đã có sẵn trong hệ sinh thái React, supports React 19, declarative API). Recharts render SVG nên dễ style neo-brutalism qua border + shadow.

## Phases

| Step | File | Status |
|------|------|--------|
| 8.1 | `pnpm add recharts` (v3.10.1) | DONE |
| 8.2 | `src/features/dashboard/chart-actions.ts` | DONE |
| 8.3 | `chart-card.tsx` + `monthly-trend-line.tsx` + `category-breakdown.tsx` + `account-balances-bar.tsx` | DONE |
| 8.4 | `src/app/(protected)/dashboard/page.tsx` — grid 4 cột với chart + Top 5 list | DONE |
| 8.5 | Verify build + report | DONE |

## Acceptance criteria

- [x] Recharts 3.10.1 install
- [x] getMonthlyTrend(12): group theo currency, fill missing months với 0
- [x] getCategoryBreakdown(month): group expense theo category, sort desc, có pct
- [x] getAccountBalances(): select account + balances
- [x] MonthlyTrendLine: 2 line (income/expense) responsive, custom tooltip format VND
- [x] CategoryBreakdown: pie + legend list, custom palette 15 màu, slice padding
- [x] AccountBalances: total chip per currency + bar list với negative=expense
- [x] Dashboard: grid 4 cells (2 charts + Top 5 + Account bar) dưới stat cards
- [x] Build pass

## Files

```
+ src/features/dashboard/chart-actions.ts        # getMonthlyTrend, getCategoryBreakdown, getAccountBalances
+ src/features/dashboard/chart-card.tsx          # Wrapper với header + neo-brutalism border
+ src/features/dashboard/monthly-trend-line.tsx  # Recharts LineChart income/expense
+ src/features/dashboard/category-breakdown.tsx  # Recharts PieChart + legend list
+ src/features/dashboard/account-balances-bar.tsx # Custom horizontal bar (không dùng recharts)
~ src/app/(protected)/dashboard/page.tsx         # Thêm charts grid
```

## Risks / Notes

- **Recharts v3 Tooltip formatter type**: `value: ValueType | undefined`. Phải `Number(value)` để narrow về number.
- **Account balances**: dùng custom render (không Recharts BarChart) để control typography + negative bar. Recharts BarChart không render được negative value trên trục thẳng đứng đẹp lắm.
- **Currency**: trend group theo currency. User demo chỉ có VND nên 1 chart; multi-currency user sẽ thấy nhiều chart con trong card.
- **Pie chart colors**: 15 màu neo-brutalism-friendly (đỏ, vàng, xanh, tím...). Index wrap với `% PIE_COLORS.length`.
- **Top 5 list**: custom card thay vì Recharts để show ranking rõ ràng hơn.
- **Responsive**: tất cả dùng `<ResponsiveContainer width="100%" height="100%">` với container có height cố định (`h-40`, `h-48`) cho mobile.

## Reports

- `reports/phase8-dashboard-charts-260802-0941-report.md`