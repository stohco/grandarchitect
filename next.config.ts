import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview gateway to access the dev server. The gateway hostname
  // is preview-chat-<session-id>.space-z.ai and it proxies requests to
  // localhost:3000. Without this, Next.js blocks cross-origin /_next/* requests.
  allowedDevOrigins: [
    "http://21.0.17.237:3000",
    "http://0.0.0.0:3000",
    "http://localhost:3000",
    "https://preview-chat-e82d4315-a735-4c03-a702-6b4b85564912.space-z.ai",
    "http://preview-chat-e82d4315-a735-4c03-a702-6b4b85564912.space-z.ai",
    "*.space-z.ai",
  ],
};

export default nextConfig;
