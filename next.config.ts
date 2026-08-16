import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tắt Next.js dev indicator (icon "N" góc dưới trái).
  // Lý do: chiếm chỗ trên mobile narrow viewport + đã có DevTools
  // Console để xem build/runtime errors trong dev.
  devIndicators: false,
  experimental: {
    // View Transitions API tắt: gây InvalidStateError khi mở Dialog/Menu
    // (DOM mutate đồng bộ trong frame đang transition). Trade-off: mất hiệu
    // ứng page-transition 90ms snap-in/out. Giữ lại sau nếu scope transition
    // về <main> thay vì root.
  },
};

export default nextConfig;
