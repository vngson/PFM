"use client";

// DatePicker — neo-brutal dropdown date picker.
//
// Kết hợp @base-ui/react Popover + custom 7x6 calendar grid (date-fns).
// Lý do không dùng react-day-picker: codebase đã có date-fns + Popover,
// không thêm dep ngoài, style khớp với phần còn lại (hard border, hard shadow).
//
// Design contract:
// - Uncontrolled: giá trị submit qua native form `name` attribute (FormData).
// - Format: YYYY-MM-DD (UTC, giữ parity với schema Postgres DATE và `frequency.ts`).
// - Hiển thị: locale-aware qua `format(date, "PPP", { locale })`.
// - Locale: lấy từ paraglide `getLocale()`; cho nhận diện thứ/ngày qua `date-fns/locale/vi|en`.
// - Tuần bắt đầu Thứ 2 (vi-VN convention) — `startOfWeek(date, { weekStartsOn: 1 })`.
// - Min/Max: optional, propagate từ props vào day button để disable ngoài range.
// - Disabled: optional — render input ở trạng thái disabled.

// MonthPicker — cùng pattern nhưng emit YYYY-MM (server transform sang YYYY-MM-01).
// 12 button tháng + 2 nút prev/next year.

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { vi, enUS } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";
import * as m from "@/paraglide/messages";

const DATE_LOCALE = { vi, en: enUS } as const;

function toIsoDate(d: Date): string {
  // format ISO YYYY-MM-DD theo UTC để match schema Postgres DATE.
  // date-fns format date rất an toàn với local timezone yyyy-MM-dd.
  return format(d, "yyyy-MM-dd");
}

function parseIsoDate(s: string): Date | null {
  if (!s) return null;
  // parseISO chấp nhận "YYYY-MM-DD" và ISO datetime.
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

function toIsoMonth(d: Date): string {
  return format(d, "yyyy-MM");
}

function parseIsoMonth(s: string): Date | null {
  if (!s) return null;
  // Nhận "YYYY-MM" hoặc đầy đủ ISO date.
  const fallback = /^\d{4}-\d{2}$/.test(s) ? parseISO(`${s}-01`) : parseISO(s);
  return isValid(fallback) ? fallback : null;
}

interface DatePickerProps {
  /** Native form name — FormData.get(name) trả về YYYY-MM-DD. */
  name: string;
  /** Giá trị khởi tạo (YYYY-MM-DD). Uncontrolled. */
  defaultValue?: string;
  /** Label hiển thị trong nút trigger khi rỗng. */
  placeholder?: string;
  /** id cho label htmlFor. */
  id?: string;
  /** Required cho form submit. */
  required?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Ngày nhỏ nhất được chọn (YYYY-MM-DD). */
  min?: string;
  /** Ngày lớn nhất được chọn (YYYY-MM-DD). */
  max?: string;
  /** aria-invalid để liên kết với form error. */
  "aria-invalid"?: boolean;
  /** Optional: cho phép clear date (mặc định true khi không required). */
  clearable?: boolean;
  /** className bổ sung cho trigger. */
  className?: string;
}

export function DatePicker({
  name,
  defaultValue,
  placeholder,
  id,
  required,
  disabled,
  min,
  max,
  "aria-invalid": ariaInvalid,
  clearable,
  className,
}: DatePickerProps) {
  const locale = (getLocale() === "en" ? "en" : "vi") as keyof typeof DATE_LOCALE;

  const [value, setValue] = React.useState<string>(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  const minDate = React.useMemo(() => parseIsoDate(min ?? ""), [min]);
  const maxDate = React.useMemo(() => parseIsoDate(max ?? ""), [max]);
  const selected = parseIsoDate(value);

  // Edit form mount lại DatePicker khi record đổi (caller dùng `key={item.id}`),
  // nên defaultValue luôn fresh lúc mount — KHÔNG sync via effect (anti-pattern).

  const handleSelect = (d: Date) => {
    if (minDate && isBefore(d, minDate)) return;
    if (maxDate && isAfter(d, maxDate)) return;
    setValue(toIsoDate(d));
    setOpen(false);
  };

  const showClear = clearable ?? (!required && value !== "");
  // Compact display: dd/MM/yyyy (vi) / MM/dd/yyyy (en). Trigger chỉ ~150px nên
  // format "PPP" dài kiểu "ngày 10 tháng 07 năm 2026" bị truncate. Mono cho align.
  const datePattern = locale === "en" ? "MM/dd/yyyy" : "dd/MM/yyyy";
  const triggerText = selected
    ? format(selected, datePattern, { locale: DATE_LOCALE[locale] })
    : (placeholder ?? m.date_picker_placeholder());

  return (
    <div className={cn("relative", className)}>
      {/* Hidden input cho form submit. */}
      <input
        type="hidden"
        name={name}
        value={value}
        data-required={required ? "" : undefined}
      />
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid || undefined}
          aria-label={triggerText}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 border-2 border-border bg-background px-3 py-2 text-left font-body text-sm transition-all outline-none select-none",
            "hover:shadow-brutal-sm hover:-translate-x-[1px] hover:-translate-y-[1px]",
            "focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-brutal-sm",
            "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
            "aria-invalid:border-destructive",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex flex-1 items-center gap-2 whitespace-nowrap font-mono">
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{triggerText}</span>
          </span>
          {showClear && selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={m.date_picker_clear_aria()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setValue("");
              }}
              className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner sideOffset={6} className="z-50">
            <PopoverPrimitive.Popup
              className={cn(
                "border-2 border-border bg-popover text-popover-foreground shadow-brutal outline-none",
                "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              )}
            >
              <CalendarGrid
                selected={selected}
                onSelect={handleSelect}
                minDate={minDate}
                maxDate={maxDate}
                locale={DATE_LOCALE[locale]}
              />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

interface CalendarGridProps {
  selected: Date | null;
  onSelect: (d: Date) => void;
  minDate: Date | null;
  maxDate: Date | null;
  locale: typeof vi | typeof enUS;
}

function CalendarGrid({
  selected,
  onSelect,
  minDate,
  maxDate,
  locale,
}: CalendarGridProps) {
  const [viewMonth, setViewMonth] = React.useState<Date>(
    startOfMonth(selected ?? new Date()),
  );
  // View toggle: 'days' (default day grid) | 'months' (12-month + year picker).
  // Clicking the month/year label flips to 'months'; picking a month returns to 'days'.
  const [viewMode, setViewMode] = React.useState<"days" | "months">("days");
  // Year user đang chọn trong months mode. Khi chuyển sang days mode, derive từ viewMonth.
  const [pickedYear, setPickedYear] = React.useState<number | null>(null);
  // Year picker sub-view inside 'months' mode (open = show 12-year list).
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  const [yearListAnchor, setYearListAnchor] = React.useState<number>(
    (selected ?? new Date()).getFullYear(),
  );

  // Year hiển thị trong months view: ưu tiên pickedYear (user đã chọn năm khác), fallback về viewMonth.
  const viewYear = pickedYear ?? viewMonth.getFullYear();

  const today = new Date();
  const monthLabel = format(viewMonth, "LLLL yyyy", { locale });

  // 7 columns weekday header + 6 rows × 7 days = 42 cells.
  const firstDay = startOfMonth(viewMonth);
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }

  const weekdayLabels = [
    m.recurring_calendar_weekday_mon(),
    m.recurring_calendar_weekday_tue(),
    m.recurring_calendar_weekday_wed(),
    m.recurring_calendar_weekday_thu(),
    m.recurring_calendar_weekday_fri(),
    m.recurring_calendar_weekday_sat(),
    m.recurring_calendar_weekday_sun(),
  ];

  const monthNames = [
    m.budgets_month_1(),
    m.budgets_month_2(),
    m.budgets_month_3(),
    m.budgets_month_4(),
    m.budgets_month_5(),
    m.budgets_month_6(),
    m.budgets_month_7(),
    m.budgets_month_8(),
    m.budgets_month_9(),
    m.budgets_month_10(),
    m.budgets_month_11(),
    m.budgets_month_12(),
  ];

  const openYearMenu = () => {
    setYearListAnchor(viewYear);
    setYearMenuOpen(true);
  };

  const pickYear = (y: number) => {
    setPickedYear(y);
    setYearMenuOpen(false);
  };

  const pickMonth = (monthIndex: number) => {
    setViewMonth(new Date(viewYear, monthIndex, 1));
    setViewMode("days");
    setYearMenuOpen(false);
    setPickedYear(null); // reset pickedYear: năm giờ đồng bộ với viewMonth
  };

  return (
    <div className="w-[280px] p-3">
      {/* Header: clickable month/year label + view-dependent prev/next arrows. */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={viewMode === "days" ? m.budgets_prev_aria() : m.common_back()}
          onClick={() => {
            if (yearMenuOpen) {
              setYearMenuOpen(false);
              return;
            }
            if (viewMode === "days") {
              setViewMonth((d) => addMonths(d, -1));
              setPickedYear(null);
            } else {
              setPickedYear((y) => (y ?? viewYear) - 1);
            }
          }}
          className="flex size-8 items-center justify-center border-2 border-border bg-background transition-all hover:bg-secondary hover:text-secondary-foreground active:translate-x-[1px] active:translate-y-[1px]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            // Click label: trong 'months' mode → toggle year dropdown. Trong 'days' mode → switch sang 'months' view.
            if (viewMode === "months") {
              if (yearMenuOpen) {
                setYearMenuOpen(false);
              } else {
                openYearMenu();
              }
            } else {
              setViewMode("months");
              setYearMenuOpen(false);
            }
          }}
          aria-expanded={viewMode === "months" ? true : false}
          className="flex flex-1 items-center justify-center gap-1.5 border-2 border-transparent px-2 py-1 font-heading text-xs font-bold uppercase tracking-wide transition-all hover:border-border hover:bg-secondary hover:text-secondary-foreground"
        >
          {viewMode === "months" && yearMenuOpen
            ? m.common_back()
            : viewMode === "months"
              ? viewYear
              : monthLabel}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              viewMode === "months" && !yearMenuOpen && "rotate-180",
              yearMenuOpen && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          aria-label={viewMode === "days" ? m.budgets_next_aria() : m.budgets_next_aria()}
          onClick={() => {
            if (yearMenuOpen) {
              setYearListAnchor((y) => y + 12);
              return;
            }
            if (viewMode === "days") {
              setViewMonth((d) => addMonths(d, 1));
              setPickedYear(null);
            } else {
              setPickedYear((y) => (y ?? viewYear) + 1);
            }
          }}
          className="flex size-8 items-center justify-center border-2 border-border bg-background transition-all hover:bg-secondary hover:text-secondary-foreground active:translate-x-[1px] active:translate-y-[1px]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {viewMode === "months" ? (
        yearMenuOpen ? (
          // Year list: 3 cols × 4 rows = 12 years anchored at yearListAnchor.
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => yearListAnchor + i).map((y) => {
              const isCurrentView = y === viewYear;
              const isTodayYear = y === today.getFullYear();
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  aria-pressed={isCurrentView ? true : false}
                  className={cn(
                    "flex h-10 items-center justify-center border-2 font-heading text-xs font-bold uppercase transition-all",
                    isCurrentView
                      ? "border-foreground bg-foreground text-background"
                      : "border-transparent hover:bg-secondary hover:text-secondary-foreground",
                    isTodayYear && !isCurrentView && "border-foreground",
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>
        ) : (
          // 12-month grid: 3 cols × 4 rows
          <div className="grid grid-cols-3 gap-1">
            {monthNames.map((label, i) => {
              const monthDate = new Date(viewYear, i, 1);
              const isSelected = selected && isSameMonth(selected, monthDate);
              const isMonthToday =
                today.getFullYear() === viewYear && today.getMonth() === i;
              const isDisabled =
                (minDate && isBefore(monthDate, startOfMonth(minDate))) ||
                (maxDate && isAfter(monthDate, startOfMonth(maxDate)));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickMonth(i)}
                  disabled={isDisabled ? true : false}
                  aria-label={format(monthDate, "LLLL yyyy", { locale })}
                  aria-pressed={isSelected ? true : false}
                  className={cn(
                    "flex h-10 items-center justify-center border-2 font-heading text-xs font-bold uppercase transition-all",
                    isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-transparent hover:bg-secondary hover:text-secondary-foreground",
                    isMonthToday && !isSelected && "border-foreground",
                    isDisabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )
      ) : (
        <>
          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="flex h-7 items-center justify-center font-heading text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day) => {
              const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
              const isSelected = selected && isSameDay(day, selected);
              const isDayToday = isSameDay(day, today);
              const isDisabled =
                (minDate && isBefore(day, minDate)) ||
                (maxDate && isAfter(day, maxDate));
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelect(day)}
                  disabled={isDisabled ? true : false}
                  aria-label={format(day, "PPP", { locale })}
                  aria-pressed={isSelected ? true : false}
                  className={cn(
                    "flex h-9 items-center justify-center border-2 border-transparent font-heading text-xs font-bold transition-all",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                    isDayToday && !isSelected && "border-foreground",
                    isSelected && "bg-foreground text-background border-foreground",
                    !isSelected && !isDisabled && "hover:bg-secondary hover:text-secondary-foreground",
                    isDisabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MonthPicker — same neo-brutal trigger, 12-month grid + year step.
// Emit YYYY-MM string qua hidden input (form submit). Server appends "-01".
// ============================================================================

interface MonthPickerProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** Tháng nhỏ nhất (YYYY-MM). */
  min?: string;
  /** Tháng lớn nhất (YYYY-MM). */
  max?: string;
  "aria-invalid"?: boolean;
  clearable?: boolean;
  className?: string;
}

export function MonthPicker({
  name,
  defaultValue,
  placeholder,
  id,
  required,
  disabled,
  min,
  max,
  "aria-invalid": ariaInvalid,
  clearable,
  className,
}: MonthPickerProps) {
  const locale = (getLocale() === "en" ? "en" : "vi") as keyof typeof DATE_LOCALE;

  const [value, setValue] = React.useState<string>(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  const minDate = React.useMemo(() => parseIsoMonth(min ?? ""), [min]);
  const maxDate = React.useMemo(() => parseIsoMonth(max ?? ""), [max]);
  const selected = parseIsoMonth(value);

  const handleSelect = (d: Date) => {
    const monthStart = startOfMonth(d);
    if (minDate && isBefore(monthStart, startOfMonth(minDate))) return;
    if (maxDate && isAfter(monthStart, startOfMonth(maxDate))) return;
    setValue(toIsoMonth(d));
    setOpen(false);
  };

  const showClear = clearable ?? (!required && value !== "");
  // Display MM/yyyy (locale-neutral, short, gọn trong trigger ~150px).
  const triggerText = selected
    ? format(selected, "MM/yyyy")
    : (placeholder ?? m.date_picker_placeholder());

  return (
    <div className={cn("relative", className)}>
      <input
        type="hidden"
        name={name}
        value={value}
        data-required={required ? "" : undefined}
      />
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={id}
          disabled={disabled}
          aria-invalid={ariaInvalid || undefined}
          aria-label={triggerText}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 border-2 border-border bg-background px-3 py-2 text-left font-body text-sm transition-all outline-none select-none",
            "hover:shadow-brutal-sm hover:-translate-x-[1px] hover:-translate-y-[1px]",
            "focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-brutal-sm",
            "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
            "aria-invalid:border-destructive",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex flex-1 items-center gap-2 whitespace-nowrap font-mono">
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{triggerText}</span>
          </span>
          {showClear && selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={m.date_picker_clear_aria()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setValue("");
              }}
              className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner sideOffset={6} className="z-50">
            <PopoverPrimitive.Popup
              className={cn(
                "border-2 border-border bg-popover text-popover-foreground shadow-brutal outline-none",
                "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              )}
            >
              <MonthGrid
                selected={selected}
                onSelect={handleSelect}
                minDate={minDate}
                maxDate={maxDate}
                locale={DATE_LOCALE[locale]}
              />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

interface MonthGridProps {
  selected: Date | null;
  onSelect: (d: Date) => void;
  minDate: Date | null;
  maxDate: Date | null;
  locale: typeof vi | typeof enUS;
}

function MonthGrid({
  selected,
  onSelect,
  minDate,
  maxDate,
  locale,
}: MonthGridProps) {
  const [viewYear, setViewYear] = React.useState<number>(
    selected?.getFullYear() ?? new Date().getFullYear(),
  );
  // Year dropdown state — open = show 12-year list, closed = show month grid.
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  // Anchor for the year list page; user can step ±12 with arrows inside the list.
  const [yearListAnchor, setYearListAnchor] = React.useState<number>(viewYear);

  // 12 month names from i18n keys (already defined for budget chart).
  const monthNames = [
    m.budgets_month_1(),
    m.budgets_month_2(),
    m.budgets_month_3(),
    m.budgets_month_4(),
    m.budgets_month_5(),
    m.budgets_month_6(),
    m.budgets_month_7(),
    m.budgets_month_8(),
    m.budgets_month_9(),
    m.budgets_month_10(),
    m.budgets_month_11(),
    m.budgets_month_12(),
  ];

  const today = new Date();

  const openYearMenu = () => {
    setYearListAnchor(viewYear);
    setYearMenuOpen(true);
  };

  const pickYear = (y: number) => {
    setViewYear(y);
    setYearMenuOpen(false);
  };

  return (
    <div className="w-[256px] p-3">
      {/* Header: clickable year + close button (returns to month grid). */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (yearMenuOpen ? setYearMenuOpen(false) : openYearMenu())}
          aria-expanded={yearMenuOpen ? true : false}
          aria-label={yearMenuOpen ? m.common_back() : `${viewYear}`}
          className="flex flex-1 items-center justify-center gap-1.5 border-2 border-transparent px-2 py-1 font-heading text-xs font-bold uppercase tracking-wide transition-all hover:border-border hover:bg-secondary hover:text-secondary-foreground"
        >
          {yearMenuOpen ? m.common_back() : viewYear}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              yearMenuOpen && "rotate-180",
            )}
          />
        </button>
        {yearMenuOpen ? (
          <>
            <button
              type="button"
              aria-label={m.budgets_prev_aria()}
              onClick={() => setYearListAnchor((y) => y - 12)}
              className="flex size-8 items-center justify-center border-2 border-border bg-background transition-all hover:bg-secondary hover:text-secondary-foreground active:translate-x-[1px] active:translate-y-[1px]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label={m.budgets_next_aria()}
              onClick={() => setYearListAnchor((y) => y + 12)}
              className="flex size-8 items-center justify-center border-2 border-border bg-background transition-all hover:bg-secondary hover:text-secondary-foreground active:translate-x-[1px] active:translate-y-[1px]"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={m.budgets_prev_aria()}
              onClick={() => setViewYear((y) => y - 1)}
              className="flex size-8 items-center justify-center border-2 border-border bg-background transition-all hover:bg-secondary hover:text-secondary-foreground active:translate-x-[1px] active:translate-y-[1px]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label={m.budgets_next_aria()}
              onClick={() => setViewYear((y) => y + 1)}
              className="flex size-8 items-center justify-center border-2 border-border bg-background transition-all hover:bg-secondary hover:text-secondary-foreground active:translate-x-[1px] active:translate-y-[1px]"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {yearMenuOpen ? (
        // Year list: 3 cols × 4 rows = 12 years anchored at yearListAnchor.
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => yearListAnchor + i).map((y) => {
            const isCurrentView = y === viewYear;
            const isTodayYear = y === today.getFullYear();
            return (
              <button
                key={y}
                type="button"
                onClick={() => pickYear(y)}
                aria-pressed={isCurrentView ? true : false}
                className={cn(
                  "flex h-10 items-center justify-center border-2 font-heading text-xs font-bold uppercase transition-all",
                  isCurrentView
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent hover:bg-secondary hover:text-secondary-foreground",
                  isTodayYear && !isCurrentView && "border-foreground",
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      ) : (
        // 12-month grid: 3 cols × 4 rows
        <div className="grid grid-cols-3 gap-1">
          {monthNames.map((label, i) => {
            const monthDate = new Date(viewYear, i, 1);
            const isSelected =
              selected && isSameMonth(selected, monthDate);
            const isMonthToday =
              today.getFullYear() === viewYear && today.getMonth() === i;
            const isDisabled =
              (minDate && isBefore(monthDate, startOfMonth(minDate))) ||
              (maxDate && isAfter(monthDate, startOfMonth(maxDate)));
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(monthDate)}
                disabled={isDisabled ? true : false}
                aria-label={format(monthDate, "LLLL yyyy", { locale })}
                aria-pressed={isSelected ? true : false}
                className={cn(
                  "flex h-10 items-center justify-center border-2 font-heading text-xs font-bold uppercase transition-all",
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent hover:bg-secondary hover:text-secondary-foreground",
                  isMonthToday && !isSelected && "border-foreground",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
