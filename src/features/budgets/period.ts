// Helpers: chuyển đổi tháng YYYY-MM ↔ period_month YYYY-MM-01.

export function monthToPeriod(month: string): string {
  return `${month}-01`;
}

export function periodToMonth(period: string): string {
  return period.slice(0, 7);
}

/** Tháng hiện tại dạng YYYY-MM. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Tháng trước (YYYY-MM). */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Tháng sau (YYYY-MM). */
export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}