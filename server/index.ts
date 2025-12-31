import express, { type Request, Response, NextFunction } from "express";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * 1. RAILWAY HEALTHCHECK ENDPOINT
 * This is critical to prevent the "Service Unavailable" loop.
 */
app.get("/api/health", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * 2. LOGGING MIDDLEWARE
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Create the HTTP server
  const server = createServer(app);

  /**
   * 3. AUTHENTICATION & BYPASS
   * This calls our modified setupAuth which includes the password bypass.
   */
  setupAuth(app);

  /**
   * 4. API ROUTES
   */
  await registerRoutes(app);

  /**
   * 5. FRONTEND STATIC FILES & SPA ROUTING
   * Specifically configured for Railway's 'dist/public' structure.
   */
  if (process.env.NODE_ENV === "production") {
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    const indexPath = path.resolve(publicPath, "index.html");

    console.log("Production Mode: Serving static files from", publicPath);

    app.use(express.static(publicPath));

    // Catch-all for React/Vite routing
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Critical Error: index.html not found at", indexPath);
          res.status(404).send("Build files missing. Ensure build command is successful.");
        }
      });
    });
  } else {
    // Local Development
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  }

  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Sentinel OS Online: Listening on port ${PORT}`);
  });
})();