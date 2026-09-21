import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is fully static (no API routes, no server rendering), so export plain files to `out/`.
  // That deploys anywhere (Netlify's CDN, GitHub Pages, S3...) without a server runtime.
  output: "export",
};

export default nextConfig;
