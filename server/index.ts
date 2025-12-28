import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

// Mandatory for Railway HTTPS and sessions
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: 'cnp_sentinel_session',
    secret: process.env.SESSION_SECRET || "market-sentinel-vault-secret",
    resave: true, 
    saveUninitialized: false,
    proxy: true,
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true, 
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
