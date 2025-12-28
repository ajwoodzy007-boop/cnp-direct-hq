import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

// CRITICAL FOR RAILWAY: This must be set for cookies to persist across refreshes
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CSP SECURITY HEADERS
app.use((req: Request, res: Response, next: NextFunction) => {
  const policy = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.cnpdirect.com; connect-src 'self' https://www.cnpdirect.com wss://www.cnpdirect.com;";
  res.setHeader("Content-Security-Policy", policy);
  next();
});

/**
 * PRODUCTION SESSION HARDENING
 * We use 'resave: true' and 'rolling: true' to ensure the session 
 * is updated in the store on every refresh.
 */
app.use(
  session({
    name: 'cnp_sentinel_session',
    secret: process.env.SESSION_SECRET || "market-sentinel-vault-secret",
    resave: true, 
    saveUninitialized: false,
    rolling: true, // Force cookie to reset expiration on every response
    proxy: true,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: true, // Mandatory for Railway HTTPS
      sameSite: "lax",
      path: "/"
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

(async () => {
  const server = await registerRoutes(app);
  
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`[Server] Sentinel OS Live on port ${port}`);
  });
})();
