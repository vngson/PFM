'use client';

// Bọc children của mỗi page segment để kích hoạt CSS View Transition API khi
// navigate giữa các trang (Tổng quan ↔ Tài khoản ↔ Danh mục...).
// Animation định nghĩa trong globals.css (`::view-transition-old` / `::view-transition-new`).
import { ViewTransition } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>;
}
