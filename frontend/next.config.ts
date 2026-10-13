import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the LAN address used to open the development server from another device.
  allowedDevOrigins: ["192.168.88.1"],
};

export default nextConfig;
