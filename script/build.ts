import { build, type BuildOptions } from "esbuild";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Build Script - Sanitized for Market Sentinel
 * Removed 'yahoo-finance2' to prevent build-time validation crashes.
 */
const forceExternal = [
  "stripe",
  "stripe-replit-sync",
  "express",
  "pg",
  "drizzle-orm"
  // REMOVED: "yahoo-finance2"
];

const buildOptions: BuildOptions = {
  entryPoints: [join(__dirname, "../server/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  // This matches your package.json start script: node dist/index.cjs
  outfile: join(__dirname, "../dist/index.cjs"),
  format: "cjs",
  external: forceExternal,
  sourcemap: true,
  minify: false, // Set to true for smaller production files
};

async function startBuild() {
  console.log("[Build] Starting production build...");
  try {
    await build(buildOptions);
    console.log("[Build] Successfully compiled to dist/index.cjs");
  } catch (error) {
    console.error("[Build] Error during compilation:", error);
    process.exit(1);
  }
}

startBuild();
