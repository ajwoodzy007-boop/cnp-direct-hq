// server/index.ts

// ... inside your (async () => { ... block

if (process.env.NODE_ENV === "production") {
  // This is the most reliable way to find the public folder on Railway
  const publicPath = path.resolve(process.cwd(), "dist", "public");
  const indexPath = path.resolve(publicPath, "index.html");

  console.log("Serving static files from:", publicPath);

  app.use(express.static(publicPath));

  app.get("*", (req, res) => {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Critical: index.html not found at", indexPath);
        res.status(404).send("Frontend files missing. Ensure 'npm run build' is in Railway Settings.");
      }
    });
  });
}