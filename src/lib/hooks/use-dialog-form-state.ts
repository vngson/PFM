'use client';

// useDialogFormState: wrap useActionState để auto-close dialog khi form submit
// thành công. Success = state === null && !state?.error && !pending.
//
// Usage:
//   const { state, formAction, pending, closeOnSuccess } =
//     useDialogFormState(action, initialState);
//   ...
//   const [open, setOpen] = useState(false);
//   useEffect(() => { if (closeOnSuccess) setOpen(false); }, [closeOnSuccess]);
//
// Lý do cần hook: useActionState không có signal rõ ràng cho "submission vừa
// kết thúc thành công". Server action success trả về state === null (initial)
// — không thể phân biệt với "chưa submit lần nào". Track pending transition
// false→true→false + state không đổi → success.
import { useActionState, useEffect, useRef, useState } from 'react';

export interface UseDialogFormStateResult<S> {
  state: S;
  formAction: (payload: FormData) => void;
  pending: boolean;
  /** Flip true khi submission vừa hoàn tất thành công. Caller close dialog. */
  closeOnSuccess: boolean;
}

export function useDialogFormState<S, P>(
  action: (state: S, payload: P) => Promise<S> | S,
  initialState: S,
): UseDialogFormStateResult<S> {
  const [state, formAction, pending] = useActionState(
    action as (state: Awaited<S>, payload: P) => Promise<Awaited<S>>,
    initialState as Awaited<S>,
  );
  const [closeOnSuccess, setCloseOnSuccess] = useState(false);
  const wasPending = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Track cạnh: false → true → false = 1 submission complete
    if (wasPending.current && !pending) {
      const last = stateRef.current as { error?: unknown; fieldErrors?: unknown } | null;
      const hasError =
        last !== null &&
        (Boolean(last.error) ||
          (last.fieldErrors !== undefined &&
            last.fieldErrors !== null &&
            Object.keys(last.fieldErrors as Record<string, unknown>).length > 0));
      if (!hasError) {
        setCloseOnSuccess(true);
      }
    }
    wasPending.current = pending;
  }, [pending]);

  // Caller resets closeOnSuccess sau khi đã xử lý (vd đã đóng dialog).
  // Helper này tự reset khi dialog đóng.
  useEffect(() => {
    if (closeOnSuccess) {
      // Reset on next tick để tránh re-trigger nếu component re-render.
      const t = setTimeout(() => setCloseOnSuccess(false), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [closeOnSuccess]);

  return { state, formAction: formAction as (payload: FormData) => void, pending, closeOnSuccess };
}