import { build, type BuildOptions } from "esbuild";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { build as viteBuild } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startBuild() {
  console.log("[Build] Starting full production build...");
  
  try {
    // 1. Build the Server (Backend)
    const serverBuildOptions: BuildOptions = {
      entryPoints: [join(__dirname, "../server/index.ts")],
      bundle: true,
      platform: "node",
      target: "node20",
      outfile: join(__dirname, "../dist/index.js"),
      format: "esm",
      packages: "external",
      sourcemap: true,
    };

    console.log("[Build] Compiling server...");
    await build(serverBuildOptions);
    console.log("[Build] Server compiled successfully.");

    // 2. Build the Client (Frontend Dashboard)
    console.log("[Build] Compiling frontend with Vite...");
    await viteBuild({
      configFile: join(__dirname, "../vite.config.ts"),
      build: {
        outDir: join(__dirname, "../dist/public"),
        emptyOutDir: true,
      },
    });
    console.log("[Build] Frontend compiled successfully.");

    console.log("[Build] Full project build complete.");
  } catch (error) {
    console.error("[Build] Error during compilation:", error);
    process.exit(1);
  }
}

startBuild();
