import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

// 1. ABSOLUTE TOP SECURITY OVERRIDE
// This forces the 'unsafe-eval' permission before ANY other middleware runs
app.use((req: Request, res: Response, next: NextFunction) => {
  const policy = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.cnpdirect.com; connect-src 'self' https://www.cnpdirect.com wss://www.cnpdirect.com;";
  res.setHeader("Content-Security-Policy", policy);
  res.setHeader("X-Content-Security-Policy", policy);
  res.setHeader("X-WebKit-CSP", policy);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

app.use(
  session({
    cookie: { maxAge: 86400000, httpOnly: true, secure: true }, // secure for Railway HTTPS
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
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`[Server] Sentinel OS Live on Railway port ${port}`);
  });
})();
