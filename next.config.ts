import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Do NOT ignore TypeScript errors during build — they indicate real defects.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable React Strict Mode in development to catch unsafe lifecycles,
  // deprecated APIs, and unexpected side effects.
  reactStrictMode: true,
  // Allow the preview gateway to access the dev server. The gateway hostname
  // is preview-chat-<session-id>.space-z.ai and it proxies requests to
  // localhost:3000.
  allowedDevOrigins: [
    "http://localhost:3000",
    "*.space-z.ai",
  ],
  // Enable WebAssembly support in webpack for Rapier WASM module.
  // Per webpack 5: "WebAssembly is not enabled by default and flagged as
  // experimental feature."
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
