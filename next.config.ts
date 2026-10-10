import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/",
        permanent: false,
      },
      {
        source: "/signup",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
