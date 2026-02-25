import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";
import markdownPlugin from "./plugins/vite-plugin-markdown.js";

export default defineConfig({
  build: {
    sourcemap: "hidden",
  },
  plugins: [markdownPlugin(), react(), cloudflare()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
