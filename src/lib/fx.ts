// FX (Foreign Exchange) helpers.
// - Cung cấp tỷ giá cố định giữa VND ↔ supported currencies.
// - convertToVND(amount, code) → số VND tương đương.
// - getSupportedCurrencies() → list mã currency.
//
// Lưu ý: Tỷ giá hard-code và KHÔNG realtime. Phase sau có thể swap sang API
// (exchangerate.host, openexchangerates.org) nếu cần. Hiện tại chỉ để unified
// total dashboard không bị lệch giữa các currency.

/** Tỷ giá 1 đơn vị currency = X VND. Ví dụ: 1 USD = 25,000 VND. */
export const FX_RATES_VND: Record<string, number> = {
  VND: 1,
  USD: 25_000,
  EUR: 27_000,
  GBP: 31_500,
  JPY: 165,
  KRW: 18,
  CNY: 3_450,
  THB: 700,
  SGD: 18_500,
  AUD: 16_500,
};

/** Tất cả currency code hỗ trợ trong app. */
export const SUPPORTED_CURRENCIES = Object.keys(FX_RATES_VND) as (keyof typeof FX_RATES_VND)[];

/** Convert amount từ currency code → VND. Trả null nếu code không hỗ trợ. */
export function convertToVND(amount: number, code: string): number | null {
  const rate = FX_RATES_VND[code];
  if (!rate) return null;
  return amount * rate;
}

/** Convert amount từ VND → currency code khác. Trả null nếu code không hỗ trợ. */
export function convertFromVND(amountVnd: number, code: string): number | null {
  const rate = FX_RATES_VND[code];
  if (!rate || rate === 0) return null;
  return amountVnd / rate;
}

/** Convert giữa 2 currencies (đi qua VND). Trả null nếu code nào không hỗ trợ. */
export function convertCurrency(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  const inVnd = convertToVND(amount, from);
  if (inVnd === null) return null;
  return convertFromVND(inVnd, to);
}
