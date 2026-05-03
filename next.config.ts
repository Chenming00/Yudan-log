import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yudan-1251832332.cos.ap-singapore.myqcloud.com",
      },
    ],
  },
};

export default nextConfig;
