import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { setupAuth } from "./auth.js";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { storage } from "./storage.js";

const app = express();

// Trust the Railway/Proxy headers for secure cookies
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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let resBody: any;
  const resJson = res.json;
  res.json = function (body, ...args) {
    resBody = body;
    return resJson.apply(res, [body, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Setup Authentication logic first
  setupAuth(app);

  // Register API Routes and get the returned HTTP Server
  const server = registerRoutes(app);

  // Global Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // FIXED: Added Number() to ensure TypeScript accepts the port
  const PORT = Number(process.env.PORT) || 5000;
  
  server.listen(PORT, "0.0.0.0", () => {
    log(`Sentinel OS serving on port ${PORT}`);
  });
})();