import type { NextConfig } from "next";
import { SITE_URL } from "./src/content/site";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [{ source: "/:path((?!keep-awake$).*)", has: [{ type: "host", value: "^jonadams\\.vercel\\.app$" }], destination: `${SITE_URL}/:path`, permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
