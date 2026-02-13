import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone', // Electron 本番で Next サーバーを同梱するため
  webpack: (config, { isServer }) => {
    // 解決をこのプロジェクト直下に固定（親フォルダで実行したときの tailwindcss 解決エラーを防ぐ）
    config.resolve.modules = [path.join(__dirname, "node_modules"), "node_modules"];
    return config;
  },
};

export default nextConfig;
