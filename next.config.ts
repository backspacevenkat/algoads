import type { NextConfig } from "next";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles detected" warning by pinning the workspace
  // root to this project. Our user has package-lock.json at ~/ which Turbopack
  // would otherwise pick up.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

export default nextConfig;

// Gives `next dev` the Cloudflare bindings (D1) from wrangler.jsonc.
initOpenNextCloudflareForDev();
