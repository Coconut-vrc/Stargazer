import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Electron 本番で Next サーバーを同梱するため
};

export default nextConfig;
