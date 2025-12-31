import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { setupVite, serveStatic, log } from "./vite.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// --- ESM PATH RESOLUTION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CRITICAL: Trust proxy for Railway/Heroku deployments
app.set("trust proxy", 1);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ============================================
// TASK 1: HEALTHCHECK MUST BE FIRST (SYNC)
// ============================================
// This route MUST be defined before any async operations
// Railway healthchecks hit this endpoint immediately
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "cnp-direct-hq" });
});

(async () => {
  try {
    const server = createServer(app);

    // ============================================
    // TASK 2: SESSION MIDDLEWARE (BEFORE AUTH)
    // ============================================
    // Session must be configured BEFORE setupAuth
    // Use lazy initialization to avoid blocking on DB connection
    let sessionStore: session.Store;
    try {
      const { getStorage } = await import("./storage.js");
      sessionStore = getStorage().sessionStore;
    } catch (err) {
      console.warn("Database session store unavailable, using memory store:", err);
      // Fallback to memory store if DB fails
      const memorystore = await import("memorystore");
      const MemoryStoreFactory = memorystore.default || memorystore;
      const MemoryStore = MemoryStoreFactory(session);
      sessionStore = new MemoryStore({
        checkPeriod: 86400000,
      });
    }

    app.use(
      session({
        secret: process.env.SESSION_SECRET || "cnp-sentinel-secret-change-in-production",
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
      })
    );

    // ============================================
    // TASK 3: AUTHENTICATION & API ROUTES
    // ============================================
    setupAuth(app);
    registerRoutes(app);

    // ============================================
    // TASK 4: STATIC FILES (PRODUCTION)
    // ============================================
    if (process.env.NODE_ENV === "production") {
      // Build output is in dist/public (from vite.config.ts)
      const publicPath = path.resolve(process.cwd(), "dist", "public");
      const indexPath = path.resolve(publicPath, "index.html");

      // Verify build directory exists
      const fs = await import("fs");
      if (!fs.existsSync(publicPath)) {
        console.error(`❌ BUILD ERROR: Static assets not found at: ${publicPath}`);
        console.error("   Run 'npm run build' before deploying to production");
        // Don't crash - allow healthcheck to still work
      } else {
        app.use(express.static(publicPath));

        // SPA fallback - serve index.html for all non-API routes
        app.get("*", (req: Request, res: Response) => {
          if (req.path.startsWith("/api")) {
            return res.status(404).json({ message: "API route not found" });
          }
          res.sendFile(indexPath);
        });
      }
    } else {
      // Development: Use Vite dev server
      await setupVite(app, server);
    }

    // ============================================
    // TASK 5: ERROR HANDLING MIDDLEWARE
    // ============================================
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // ============================================
    // TASK 6: START SERVER (BIND TO 0.0.0.0)
    // ============================================
    const PORT = Number(process.env.PORT) || 5000;
    
    server.listen(PORT, "0.0.0.0", () => {
      log(`🚀 Server listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
      log(`📡 Health check available at http://0.0.0.0:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      log("SIGTERM received, shutting down gracefully...");
      server.close(() => {
        log("Server closed");
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("❌ SERVER STARTUP ERROR:", error);
    // Don't exit immediately - allow healthcheck to respond
    // This gives Railway time to see the error in logs
    process.exit(1);
  }
})();
