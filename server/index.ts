import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { storage } from "./storage.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// --- ESM PATH RESOLUTION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cnp-sentinel-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      // Must be true on Railway (HTTPS)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

(async () => {
  // 1. Create the HTTP server
  const server = createServer(app);

  // 2. Register API and Auth routes
  registerRoutes(app);

  // 3. Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // 4. Serve Frontend based on environment
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);

    // CRITICAL: Catch-all route for Single Page App (React)
    // This ensures that refreshing 'www.cnpdirect.com/dashboard' doesn't 404
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        const indexPath = path.resolve(__dirname, "..", "dist", "public", "index.html");
        res.sendFile(indexPath);
      }
    });
  }

  const PORT = Number(process.env.PORT) || 5000;
  
  server.listen(PORT, "0.0.0.0", () => {
    log(`Sentinel OS Online: Listening on port ${PORT}`);
  });
})();