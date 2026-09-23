/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Disable filesystem pack file caching which can lock or hang on external/mounted volumes
    config.cache = false;
    return config;
  },
};

export default nextConfig;
