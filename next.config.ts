import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The catalogue caching model (Cache Components vs. tagged data cache) is
  // decided and configured in a later milestone, once 404 status and
  // URL-driven rendering have been checked against a production build.
  async redirects() {
    return [{ source: "/", destination: "/shop", permanent: false }];
  },
  turbopack: {
    // Pin the workspace root so a stray lockfile in a parent folder is never picked up.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
