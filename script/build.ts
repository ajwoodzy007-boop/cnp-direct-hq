import { build } from "vite";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBuild() {
  try {
    console.log("[Build] Starting full production build...");

    // 1. Clean previous builds
    const distPath = path.resolve(__dirname, "..", "dist");
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }

    // 2. Build Frontend via Vite
    await build({
      configFile: path.resolve(__dirname, "..", "vite.config.ts"),
      build: {
        outDir: path.resolve(__dirname, "..", "dist", "public"),
        emptyOutDir: true,
      }
    });

    console.log("[Build] Frontend compiled successfully to dist/public.");
    console.log("[Build] Build process complete.");
  } catch (error) {
    console.error("[Build] Error during compilation:", error);
    process.exit(1);
  }
}

runBuild();
