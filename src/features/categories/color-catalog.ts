// Preset màu cho category + account. 18 màu phổ biến, độ tương phản tốt với text trắng.
// `label` là function (không string) để Paraglide resolve locale per-render.

import * as m from '@/paraglide/messages';

export interface ColorOption {
  /** Mã hex */
  value: string;
  /** Function trả tên hiển thị theo locale. */
  label: () => string;
}

export const COLOR_CATALOG: ColorOption[] = [
  { value: '#f97316', label: () => m.color_label_orange() },     // orange-500
  { value: '#ef4444', label: () => m.color_label_red() },        // red-500
  { value: '#f59e0b', label: () => m.color_label_amber() },      // amber-500
  { value: '#eab308', label: () => m.color_label_yellow() },     // yellow-500
  { value: '#84cc16', label: () => m.color_label_lime() },       // lime-500
  { value: '#22c55e', label: () => m.color_label_green() },      // green-500
  { value: '#10b981', label: () => m.color_label_emerald() },    // emerald-500
  { value: '#14b8a6', label: () => m.color_label_teal() },       // teal-500
  { value: '#06b6d4', label: () => m.color_label_cyan() },       // cyan-500
  { value: '#0ea5e9', label: () => m.color_label_sky() },        // sky-500
  { value: '#3b82f6', label: () => m.color_label_blue() },       // blue-500
  { value: '#6366f1', label: () => m.color_label_indigo() },     // indigo-500
  { value: '#8b5cf6', label: () => m.color_label_violet() },     // violet-500
  { value: '#a855f7', label: () => m.color_label_purple() },     // purple-500
  { value: '#ec4899', label: () => m.color_label_pink() },       // pink-500
  { value: '#f43f5e', label: () => m.color_label_rose() },       // rose-500
  { value: '#64748b', label: () => m.color_label_slate() },      // slate-500
  { value: '#92400e', label: () => m.color_label_brown() },      // amber-800
];

/** Lấy nhãn tiếng theo locale cho 1 hex (dùng khi render item có sẵn). */
export function getColorLabel(hex: string | null | undefined): string {
  if (!hex) return '';
  const found = COLOR_CATALOG.find((c) => c.value.toLowerCase() === hex.toLowerCase());
  return found ? found.label() : hex;
}