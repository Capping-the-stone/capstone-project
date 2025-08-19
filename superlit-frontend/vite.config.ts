import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default ({ mode }: any) => {
  const config = {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: process.env.BACKEND_URL,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""), // Remove the "/api" prefix
        },
      },
    },
  };
  return defineConfig(config);
};
