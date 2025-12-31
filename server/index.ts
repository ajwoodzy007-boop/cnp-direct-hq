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
 * 1. RAILWAY HEALTHCHECK
 * This MUST return 200 OK for Railway to stop showing "Service Unavailable".
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
   * 3. AUTHENTICATION (Includes Password Bypass)
   */
  setupAuth(app);

  /**
   * 4. API ROUTES
   */
  await registerRoutes(app);

  /**
   * 5. PRODUCTION STATIC FILES (Frontend)
   */
  if (process.env.NODE_ENV === "production") {
    // Railway puts build files in dist/public
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    const indexPath = path.resolve(publicPath, "index.html");

    console.log("Serving production files from:", publicPath);
    app.use(express.static(publicPath));

    // Handle SPA routing
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Index file missing at:", indexPath);
          res.status(404).send("Frontend build not found. Please check build logs.");
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