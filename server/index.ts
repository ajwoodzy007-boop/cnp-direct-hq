import express from "express";
import { setupAuth } from "./auth";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. HARDCODED HEALTHCHECK
// Essential for Railway to verify the service is "Live"
app.get("/api/health", (_req, res) => {
  res.status(200).send("OK");
});

(async () => {
  try {
    const server = createServer(app);

    // 2. AUTHENTICATION & API
    setupAuth(app);
    await registerRoutes(app);

    // 3. STATIC FILES (PRODUCTION)
    if (process.env.NODE_ENV === "production") {
      const publicPath = path.resolve(process.cwd(), "dist", "public");
      const indexPath = path.resolve(publicPath, "index.html");

      app.use(express.static(publicPath));

      app.get("*", (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ message: "API route not found" });
        }
        res.sendFile(indexPath);
      });
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    }

    // 4. BIND TO PORT (Fixed TypeScript Port Error)
    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Sentinel OS Online on port ${PORT}`);
    });

  } catch (error) {
    console.error("SERVER CRASH DURING STARTUP:", error);
    process.exit(1);
  }
})();