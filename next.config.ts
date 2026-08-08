import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    "http://localhost:3000",
    "*.space-z.ai",
  ],
  webpack: (config) => {
    // @cedar-policy/cedar-wasm (and other wasm-bindgen deps) import their
    // .wasm modules with named exports — enable real webpack wasm module
    // semantics instead of parsing them as JS.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // Force ONE three.js instance (ESM source build): dual ESM+CJS bundling
    // breaks skinned-mesh bounding-sphere math across build boundaries.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      three: resolve(process.cwd(), "node_modules/three/src/Three.js"),
      "three/examples/jsm": resolve(process.cwd(), "node_modules/three/examples/jsm"),
    };
    return config;
  },
};

export default nextConfig;
