/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use a fresh build directory to bypass any stale SMB file locks on .next
  distDir: '.next_build',
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
