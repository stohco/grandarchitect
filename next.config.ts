import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview gateway's external IP to access the dev server without
  // Next.js emitting cross-origin warnings that destabilize Turbopack HMR.
  allowedDevOrigins: ["http://21.0.17.237:3000", "http://0.0.0.0:3000"],
};

export default nextConfig;
