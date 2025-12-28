import express from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { serveStatic } from "./vite";
import MemoryStoreFactory from "memorystore";

const app = express();
const MemoryStore = MemoryStoreFactory(session);
app.set("trust proxy", 1);
app.use(express.json());

// ULTRA-PERMISSIVE HEADER TO BYPASS CSP BLOCKS
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * 'unsafe-inline'; img-src * data: blob:; style-src * 'unsafe-inline';");
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || "vault-secret",
  resave: true,
  saveUninitialized: false,
  proxy: true,
  cookie: { secure: true, httpOnly: true, sameSite: "lax" },
  store: new MemoryStore({ checkPeriod: 86400000 })
}));

app.use(passport.initialize());
app.use(passport.session());

(async () => {
  const server = await registerRoutes(app);
  serveStatic(app);
  server.listen(Number(process.env.PORT) || 5000, "0.0.0.0");
})();
