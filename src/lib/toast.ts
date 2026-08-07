'use client';

// Toast helpers — wrappers around sonner cho consistent messaging.
// Dùng cho Server Action results: success/error/warning/info.

import { toast } from 'sonner';
import * as m from '@/paraglide/messages';

export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  warning: (msg: string) => toast.warning(msg),
  info: (msg: string) => toast.info(msg),
  loading: (msg: string) => toast.loading(msg),
  dismiss: (id?: string | number) => toast.dismiss(id),
};

/**
 * Hiển thị toast từ ActionState result:
 * - Có success → success toast
 * - Có error → error toast
 * - Cả hai đều không có → im lặng
 */
export function notifyActionResult(
  result: { error?: string; success?: string; fieldErrors?: Record<string, string[]> } | null | undefined,
): boolean {
  if (!result) return false;
  if (result.error) {
    toast.error(result.error);
    return true;
  }
  if (result.success) {
    toast.success(result.success);
    return true;
  }
  return false;
}

/** Promise wrapper — show loading toast, swap to success/error khi resolve/reject. */
export async function withToast<T>(
  msg: string,
  promise: Promise<T>,
): Promise<T> {
  toast.promise(promise, {
    loading: msg,
    success: (data) => {
      const r = data as unknown as { success?: string; error?: string };
      return r?.success ?? m.common_done();
    },
    error: (err) =>
      err instanceof Error ? err.message : m.toast_fallback_error(),
  });
  return promise;
}
