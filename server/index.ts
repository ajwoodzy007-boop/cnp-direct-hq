import express from "express";
import session from "express-session";
import { setupAuth } from "./auth";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- THIS IS STEP #2 ---
// This tells Express to trust Railway's proxy so it allows the login cookie
app.set("trust proxy", 1); 
// -----------------------

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. Mandatory Railway Healthcheck (responds immediately)
app.get("/api/health", (_req, res) => res.status(200).send("OK"));

(async () => {
  try {
    const server = createServer(app);

    // 2. Auth & Routes
    // setupAuth handles the session logic using the 'session' table we just fixed
    setupAuth(app);
    await registerRoutes(app);

    // 3. Production Static File Handling
    if (process.env.NODE_ENV === "production") {
      const publicPath = path.resolve(process.cwd(), "dist", "public");
      app.use(express.static(publicPath));
      
      // Serve index.html for any non-API routes (SPA routing)
      app.get("*", (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ message: "API Not Found" });
        res.sendFile(path.resolve(publicPath, "index.html"));
      });
    } else {
      // Local development with Vite
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Sentinel OS Online: Port ${PORT}`);
    });

  } catch (error) {
    console.error("STARTUP ERROR:", error);
    process.exit(1);
  }
})();