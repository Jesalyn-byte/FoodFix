import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, ".."),
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, ".."),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api/lamion-nim": {
        target: "https://integrate.api.nvidia.com/v1",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/lamion-nim/, ""),
      },
      "/api/lamion-core": {
        target: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/lamion-core/, ""),
      },
      "/api/lamion-router": {
        target: "https://openrouter.ai/api/v1",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/lamion-router/, ""),
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
});
