import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api/auth": "http://localhost:5001",
      "/api/users": "http://localhost:5001",
      "/api/wallet": "http://localhost:5001",
      "/api/gifts": "http://localhost:5001",
      "/api/agora": "http://localhost:3001",
      "/api/levels": "http://localhost:3001",
      "/api/rooms": "http://localhost:3001",
      "/api/podcasts": "http://localhost:3001",
    },
  },
});
