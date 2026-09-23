/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // On Vercel, use standard '.next' output directory. Locally, bypass SMB file locks.
  distDir: process.env.VERCEL ? '.next' : '.next_build',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
