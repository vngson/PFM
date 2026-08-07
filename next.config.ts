import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Bật View Transitions API — cho phép PageTransition wrapper kích hoạt
    // CSS ::view-transition-old/new khi navigate giữa các page.
    viewTransition: true,
  },
};

export default nextConfig;
