import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Existing DB rows store image URLs as /manus-storage/<key>. Keep the path
  // working by mapping it to the Route Handler.
  async rewrites() {
    return [
      {
        source: "/manus-storage/:path*",
        destination: "/api/manus-storage/:path*",
      },
    ];
  },
  // The Vercel build was emitting a 1.4 MB single chunk under Vite; Next.js
  // does code-splitting automatically. No special config needed.
  experimental: {
    // Allow large request bodies for the items.uploadImage mutation (base64).
    // Vercel still caps at 4.5 MB per function call on Hobby/Pro plans.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
