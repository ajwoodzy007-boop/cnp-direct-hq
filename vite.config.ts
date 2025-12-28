import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { metaImagesPlugin } from "./vite-plugin-meta-images"; // Ensure this import exists

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // The metaImagesPlugin now handles injecting the CSP into the HTML
  plugins: [react(), metaImagesPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Ensure the build doesn't strip out necessary eval-reliant code
    minify: 'terser',
    terserOptions: {
      compress: {
        defaults: false,
      },
    },
  },
  server: {
    // This only works in local development
    headers: {
      "Content-Security-Policy": "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none';"
    },
    hmr: {
      overlay: false
    }
  }
});
