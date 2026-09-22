import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is fully static (no API routes, no server rendering), so export plain files to `out/`.
  // That deploys anywhere (Netlify's CDN, GitHub Pages, S3...) without a server runtime.
  output: "export",
  // The floating "N" dev-tools button (bottom-left by default) is local-dev only — it's never part of the
  // static export, so it can't show up on the deployed site. Off here just so it doesn't clutter local testing,
  // especially on the phone-width camera shots where it sits right over the hero/about text.
  devIndicators: false,
};

export default nextConfig;
