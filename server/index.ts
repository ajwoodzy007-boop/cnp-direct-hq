import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import "./auth"; // This ensures your passport strategies (LocalStrategy) are loaded

const app = express();

// 1. Basic Parsers (Must be first)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 2. Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let resBody: any;
  const originalResJson = res.json;
  res.json = function (body) {
    resBody = body;
    return originalResJson.apply(res, arguments as any);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) logLine = logLine.substring(0, 79) + "…";
      log(logLine);
    }
  });
  next();
});

(async () => {
  // 3. Session & Passport Initialization (Must be BEFORE routes)
  // This prevents the 'undefined user' crash
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "market-sentinel-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // 4. Register API Routes
  const server = await registerRoutes(app);

  // 5. Global Error Handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // Don't throw the error here in production to prevent process exit
    if (process.env.NODE_ENV !== "production") console.error(err);
  });

  // 6. Setup Frontend (Vite for dev, Static for prod)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`[Server] Market Sentinel OS live on port ${port}`);
  });
})();
