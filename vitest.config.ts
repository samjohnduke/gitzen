import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import path from "path";
import markdownPlugin from "./plugins/vite-plugin-markdown.js";

export default defineWorkersConfig({
  plugins: [markdownPlugin()],
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
      },
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
