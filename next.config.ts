import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles detected" warning by pinning the workspace
  // root to this project. Our user has package-lock.json at ~/ which Turbopack
  // would otherwise pick up.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
