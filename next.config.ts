import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp loads native binaries at runtime; make sure Vercel packs them with the server actions.
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/admin/posts/[id]": ["./node_modules/@img/sharp-linux-x64/**", "./node_modules/@img/sharp-libvips-linux-x64/**"],
  },
};

export default nextConfig;
