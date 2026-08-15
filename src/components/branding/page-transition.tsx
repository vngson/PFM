'use client';

// Wrapper hiện tại là passthrough — Next.js 16 / React 19 <ViewTransition>
// gọi document.startViewTransition() mỗi lần route đổi. Khi page mới mount
// và trigger synchronous DOM mutate (Dialog/Menu/QuickAdd mở ngay trong frame
// transition) trình duyệt reject với InvalidStateError:
// "Transition was aborted because of invalid state".
// next.config.ts đã tắt experimental.viewTransition; component này phản ánh
// quyết định đó. Khi muốn bật lại, scope <ViewTransition> quanh <main>
// (không phải root) và chắc chắn không mở Dialog/Dropdown trong cùng frame.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
