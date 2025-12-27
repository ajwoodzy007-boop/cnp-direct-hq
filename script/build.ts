import { build, type BuildOptions } from "esbuild";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { builtinModules } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildOptions: BuildOptions = {
  entryPoints: [join(__dirname, "../server/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: join(__dirname, "../dist/index.js"), // Changed to .js for ESM
  format: "esm", // This fixes the "Top-level await" error
  packages: "external", // This fixes the "Babel/Tailwind/Oxide" errors
  sourcemap: true,
  minify: false,
};

async function startBuild() {
  console.log("[Build] Starting production build (ESM Mode)...");
  try {
    await build(buildOptions);
    console.log("[Build] Successfully compiled to dist/index.js");
  } catch (error) {
    console.error("[Build] Error during compilation:", error);
    process.exit(1);
  }
}

startBuild();
