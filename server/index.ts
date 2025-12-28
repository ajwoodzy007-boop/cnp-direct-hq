import express from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import MemoryStoreFactory from "memorystore";
import path from "path";

const app = express();
const MemoryStore = MemoryStoreFactory(session);

// CRITICAL FOR RAILWAY HTTPS
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  name: 'sentinel_vault_session',
  secret: process.env.SESSION_SECRET || "market-sentinel-vault-2025",
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required for Railway
  cookie: { 
    secure: true, // Required for HTTPS
    httpOnly: true, 
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000 
  },
  store: new MemoryStore({ checkPeriod: 86400000 })
}));

app.use(passport.initialize());
app.use(passport.session());

(async () => {
  const server = await registerRoutes(app);
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0");
})();
