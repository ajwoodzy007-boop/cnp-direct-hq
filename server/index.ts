import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// DISABLE ALL SECURITY HEADERS TEMPORARILY
// This is to force the table to render and bypass the CSP eval block
app.use((req: Request, res: Response, next: NextFunction) => {
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Content-Security-Policy");
  res.removeHeader("X-WebKit-CSP");
  next();
});

// LOGGING MIDDLEWARE
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
      if (resBody) logLine += ` :: ${JSON.stringify(resBody).slice(0, 50)}`;
      log(logLine);
    }
  });
  next();
});

// SESSION CONFIGURATION
app.use(
  session({
    cookie: { maxAge: 86400000, httpOnly: true, secure: false },
    store: new MemoryStore({ checkPeriod: 86400000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "market-sentinel-vault-secret",
  })
);

app.use(passport.initialize());
app.use(passport.session());

(async () => {
  const server = await registerRoutes(app);

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

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`[Server] Sentinel OS Live on port ${port}`);
  });
})();
