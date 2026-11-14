import type { NextConfig } from "next";

const DAY = 60 * 60 * 24;

const nextConfig: NextConfig = {
  // Catalogue caching: `getCatalog()` uses `'use cache'` + `cacheTag('catalog')`,
  // and a recorded payment expires the tag. See ARCHITECTURE.md.
  cacheComponents: true,
  // Off on purpose. On Next 16.4.6, turning it on made an unknown /shop/<sku>-style
  // route answer 200 instead of 404, and served the first request after a tag
  // expiry stale. Both break hard requirements; see docs/IMPLEMENTATION_PROGRESS.md (M04).
  partialPrefetching: false,
  cacheLife: {
    // The catalogue changes only when a payment is recorded, and that expires the
    // tag on demand, so the time-based refresh is a long backstop, not the mechanism.
    catalog: { stale: 30, revalidate: 30 * DAY, expire: 365 * DAY },
  },
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
