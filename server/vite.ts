import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";
import * as vite from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${time} [vite] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const viteServer = await vite.createServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const template = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8",
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use absolute path from current working directory (Railway compatible)
  const rootDistPath = path.resolve(process.cwd(), 'dist', 'public');
  console.log('Serving static files from:', rootDistPath);
  console.log('Current working directory:', process.cwd());

  if (!fs.existsSync(rootDistPath)) {
    console.error(`❌ Static assets not found at: ${rootDistPath}`);
    console.error('Files in dist directory:', fs.existsSync(path.resolve(process.cwd(), 'dist')) ? fs.readdirSync(path.resolve(process.cwd(), 'dist')) : 'dist directory not found');
    throw new Error(`Static assets not found at: ${rootDistPath}. Ensure the build step completed successfully.`);
  }

  console.log('✅ Static directory exists. Contents:', fs.readdirSync(rootDistPath));

  // Configure static file serving with proper MIME types and error handling
  app.use('/assets', express.static(path.resolve(rootDistPath, 'assets'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));

  // Serve index.html for all other routes (SPA fallback)
  app.get("*", (req, res) => {
    console.log(`Serving frontend for route: ${req.path}`);
    const indexPath = path.resolve(rootDistPath, "index.html");

    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send('Frontend not built properly');
    }

    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving index.html:`, err);
        res.status(500).send('Error loading frontend');
      }
    });
  });
}
