import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  allowedDevOrigins: process.env.ORDINA_DEV_ORIGIN
    ? [process.env.ORDINA_DEV_ORIGIN]
    : undefined,

  turbopack: {
    root: process.cwd(),
  },

  async rewrites() {
    return [
      {
        source: "/orders/new2.0",
        destination: "/orders/new2_0",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },

  webpack(config) {
    // Add SVG import support using SVGR.
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },
};

export default nextConfig;
